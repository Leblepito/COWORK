"""Stripe webhook handler — subscription lifecycle management.

Handles the following Stripe events:
  checkout.session.completed   — New subscription created via Checkout
  invoice.paid                 — Recurring payment succeeded
  invoice.payment_failed       — Payment failed (card declined, etc.)
  customer.subscription.updated — Plan change, trial end, status change
  customer.subscription.deleted — Subscription cancelled / expired
"""

import logging
from datetime import datetime, timezone

import stripe
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import settings
from src.database.connection import get_db
from src.database.models import (
    Invoice,
    InvoiceStatus,
    Member,
    Subscription,
    SubscriptionStatus,
)

logger = logging.getLogger("cowork-api.stripe")
router = APIRouter(prefix="/webhooks", tags=["webhooks"])

# Map Stripe subscription statuses → our enum
_STATUS_MAP: dict[str, SubscriptionStatus] = {
    "active": SubscriptionStatus.ACTIVE,
    "past_due": SubscriptionStatus.PAST_DUE,
    "canceled": SubscriptionStatus.CANCELLED,
    "cancelled": SubscriptionStatus.CANCELLED,
    "trialing": SubscriptionStatus.TRIALING,
    "unpaid": SubscriptionStatus.PAST_DUE,
    "incomplete": SubscriptionStatus.PAST_DUE,
    "incomplete_expired": SubscriptionStatus.CANCELLED,
}


def _ts_to_dt(ts: int | None) -> datetime | None:
    """Convert a Unix timestamp to a timezone-aware datetime."""
    if ts is None:
        return None
    return datetime.fromtimestamp(ts, tz=timezone.utc)


def _verify_stripe_event(payload: bytes, sig_header: str) -> stripe.Event:
    """Verify webhook signature and construct the Stripe event."""
    if not settings.stripe_webhook_secret:
        raise HTTPException(
            status_code=500,
            detail="Stripe webhook secret not configured",
        )
    try:
        return stripe.Webhook.construct_event(
            payload, sig_header, settings.stripe_webhook_secret
        )
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid Stripe signature")
    except Exception as exc:
        logger.error("Stripe event construction failed: %s", exc)
        raise HTTPException(status_code=400, detail="Invalid payload")


# ---------------------------------------------------------------------------
# Event handlers
# ---------------------------------------------------------------------------


async def _handle_checkout_completed(
    session_obj: dict, db: AsyncSession
) -> None:
    """A customer completed Stripe Checkout — create/update subscription."""
    customer_id = session_obj.get("customer")
    subscription_id = session_obj.get("subscription")

    if not customer_id or not subscription_id:
        logger.warning("checkout.session.completed missing customer/subscription")
        return

    # Find member by stripe_customer_id
    result = await db.execute(
        select(Member).where(Member.stripe_customer_id == customer_id)
    )
    member = result.scalar_one_or_none()

    if not member:
        # Try to associate via client_reference_id (user_id passed at checkout)
        ref_id = session_obj.get("client_reference_id")
        if ref_id:
            result = await db.execute(
                select(Member).where(Member.user_id == int(ref_id))
            )
            member = result.scalar_one_or_none()
            if member:
                member.stripe_customer_id = customer_id
        if not member:
            logger.error(
                "No member found for customer=%s ref=%s",
                customer_id,
                session_obj.get("client_reference_id"),
            )
            return

    # Retrieve full subscription details from Stripe
    stripe.api_key = settings.stripe_secret_key
    try:
        sub = stripe.Subscription.retrieve(subscription_id)
    except Exception as exc:
        logger.error("Failed to retrieve subscription %s: %s", subscription_id, exc)
        return

    # Determine plan type from price ID
    plan_type = _price_id_to_plan(sub["items"]["data"][0]["price"]["id"])
    if plan_type:
        member.plan_type = plan_type

    # Check for existing subscription row
    existing = await db.execute(
        select(Subscription).where(
            Subscription.stripe_subscription_id == subscription_id
        )
    )
    sub_row = existing.scalar_one_or_none()

    if sub_row:
        sub_row.status = _STATUS_MAP.get(sub["status"], SubscriptionStatus.ACTIVE)
        sub_row.current_period_start = _ts_to_dt(sub["current_period_start"])
        sub_row.current_period_end = _ts_to_dt(sub["current_period_end"])
    else:
        sub_row = Subscription(
            member_id=member.id,
            plan_type=plan_type or member.plan_type,
            stripe_subscription_id=subscription_id,
            status=_STATUS_MAP.get(sub["status"], SubscriptionStatus.ACTIVE),
            current_period_start=_ts_to_dt(sub["current_period_start"]),
            current_period_end=_ts_to_dt(sub["current_period_end"]),
        )
        db.add(sub_row)

    await db.commit()
    logger.info(
        "Checkout completed: member=%d subscription=%s plan=%s",
        member.id,
        subscription_id,
        plan_type,
    )


async def _handle_invoice_paid(invoice: dict, db: AsyncSession) -> None:
    """Recurring invoice paid — update subscription period & create invoice."""
    customer_id = invoice.get("customer")
    subscription_id = invoice.get("subscription")
    amount_paid = (invoice.get("amount_paid") or 0) / 100.0  # cents → dollars

    # Update subscription period
    if subscription_id:
        result = await db.execute(
            select(Subscription).where(
                Subscription.stripe_subscription_id == subscription_id
            )
        )
        sub = result.scalar_one_or_none()
        if sub:
            sub.status = SubscriptionStatus.ACTIVE
            # Period dates from the subscription lines
            lines = invoice.get("lines", {}).get("data", [])
            if lines:
                period = lines[0].get("period", {})
                sub.current_period_start = _ts_to_dt(period.get("start"))
                sub.current_period_end = _ts_to_dt(period.get("end"))

    # Create invoice record
    member = await _get_member_by_customer(customer_id, db)
    if member:
        inv = Invoice(
            user_id=member.user_id,
            amount_usd=amount_paid,
            status=InvoiceStatus.PAID,
            stripe_invoice_id=invoice.get("id"),
            description=f"Subscription payment — {invoice.get('number', 'N/A')}",
            paid_at=_ts_to_dt(invoice.get("status_transitions", {}).get("paid_at")),
        )
        db.add(inv)

    await db.commit()
    logger.info(
        "Invoice paid: customer=%s amount=$%.2f subscription=%s",
        customer_id,
        amount_paid,
        subscription_id,
    )


async def _handle_invoice_payment_failed(
    invoice: dict, db: AsyncSession
) -> None:
    """Payment failed — mark subscription as past_due, create invoice record."""
    subscription_id = invoice.get("subscription")
    customer_id = invoice.get("customer")
    amount = (invoice.get("amount_due") or 0) / 100.0

    if subscription_id:
        await db.execute(
            update(Subscription)
            .where(Subscription.stripe_subscription_id == subscription_id)
            .values(status=SubscriptionStatus.PAST_DUE)
        )

    member = await _get_member_by_customer(customer_id, db)
    if member:
        inv = Invoice(
            user_id=member.user_id,
            amount_usd=amount,
            status=InvoiceStatus.UNCOLLECTIBLE,
            stripe_invoice_id=invoice.get("id"),
            description=f"Payment failed — {invoice.get('number', 'N/A')}",
        )
        db.add(inv)

    await db.commit()
    logger.warning(
        "Invoice payment failed: customer=%s amount=$%.2f subscription=%s",
        customer_id,
        amount,
        subscription_id,
    )


async def _handle_subscription_updated(
    sub_data: dict, db: AsyncSession
) -> None:
    """Subscription updated — plan change, trial end, status change."""
    subscription_id = sub_data.get("id")

    result = await db.execute(
        select(Subscription).where(
            Subscription.stripe_subscription_id == subscription_id
        )
    )
    sub = result.scalar_one_or_none()
    if not sub:
        logger.warning("Subscription %s not found in DB", subscription_id)
        return

    # Update status
    new_status = _STATUS_MAP.get(sub_data.get("status", ""), sub.status)
    sub.status = new_status

    # Update period
    sub.current_period_start = _ts_to_dt(sub_data.get("current_period_start"))
    sub.current_period_end = _ts_to_dt(sub_data.get("current_period_end"))

    # Check for plan change
    items = sub_data.get("items", {}).get("data", [])
    if items:
        new_plan = _price_id_to_plan(items[0]["price"]["id"])
        if new_plan and new_plan != sub.plan_type:
            sub.plan_type = new_plan
            # Also update member's plan_type
            member = await db.get(Member, sub.member_id)
            if member:
                member.plan_type = new_plan

    await db.commit()
    logger.info(
        "Subscription updated: %s -> status=%s", subscription_id, new_status
    )


async def _handle_subscription_deleted(
    sub_data: dict, db: AsyncSession
) -> None:
    """Subscription cancelled/expired — mark as cancelled."""
    subscription_id = sub_data.get("id")

    result = await db.execute(
        select(Subscription).where(
            Subscription.stripe_subscription_id == subscription_id
        )
    )
    sub = result.scalar_one_or_none()
    if not sub:
        logger.warning("Subscription %s not found for deletion", subscription_id)
        return

    sub.status = SubscriptionStatus.CANCELLED

    # Clear member's plan_type (access revoked)
    member = await db.get(Member, sub.member_id)
    if member:
        member.plan_type = None

    await db.commit()
    logger.info("Subscription deleted: %s member=%d", subscription_id, sub.member_id)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _price_id_to_plan(price_id: str):
    """Map a Stripe price ID to our SpaceType plan."""
    from src.database.models import SpaceType

    mapping = {
        settings.stripe_hot_desk_price_id: SpaceType.HOT_DESK,
        settings.stripe_dedicated_price_id: SpaceType.DEDICATED_DESK,
        settings.stripe_private_office_price_id: SpaceType.PRIVATE_OFFICE,
    }
    return mapping.get(price_id)


async def _get_member_by_customer(
    customer_id: str | None, db: AsyncSession
) -> Member | None:
    """Lookup Member by Stripe customer ID."""
    if not customer_id:
        return None
    result = await db.execute(
        select(Member).where(Member.stripe_customer_id == customer_id)
    )
    return result.scalar_one_or_none()


# ---------------------------------------------------------------------------
# Main webhook endpoint
# ---------------------------------------------------------------------------

_EVENT_HANDLERS = {
    "checkout.session.completed": lambda data, db: _handle_checkout_completed(data, db),
    "invoice.paid": lambda data, db: _handle_invoice_paid(data, db),
    "invoice.payment_failed": lambda data, db: _handle_invoice_payment_failed(data, db),
    "customer.subscription.updated": lambda data, db: _handle_subscription_updated(data, db),
    "customer.subscription.deleted": lambda data, db: _handle_subscription_deleted(data, db),
}


@router.post("/stripe")
async def stripe_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
    stripe_signature: str = Header(alias="stripe-signature"),
):
    """Receive and process Stripe webhook events.

    Stripe sends events as POST with a signature header for verification.
    We dispatch to the appropriate handler based on event type.
    """
    payload = await request.body()
    event = _verify_stripe_event(payload, stripe_signature)

    event_type = event["type"]
    event_data = event["data"]["object"]

    handler = _EVENT_HANDLERS.get(event_type)
    if handler:
        try:
            await handler(event_data, db)
        except Exception as exc:
            logger.error("Error handling %s: %s", event_type, exc, exc_info=True)
            # Still return 200 to avoid Stripe retries on app errors
            return {"status": "error", "event": event_type, "detail": str(exc)}
    else:
        logger.debug("Unhandled Stripe event: %s", event_type)

    return {"status": "ok", "event": event_type}
