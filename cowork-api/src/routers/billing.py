"""Billing endpoints — Stripe Checkout & Customer Portal.

Provides:
  POST /billing/checkout   — Create a Stripe Checkout Session for subscription
  POST /billing/portal     — Create a Stripe Customer Portal session
  GET  /billing/status     — Current subscription status for the user
"""

import logging

import stripe
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from src.config import settings
from src.database.connection import get_db
from src.database.models import Member, Subscription, SubscriptionStatus, User
from src.routers.auth import get_current_user

logger = logging.getLogger("cowork-api.billing")
router = APIRouter(prefix="/billing", tags=["billing"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class CheckoutRequest(BaseModel):
    plan: str  # hot_desk | dedicated_desk | private_office


class CheckoutResponse(BaseModel):
    checkout_url: str
    session_id: str


class PortalResponse(BaseModel):
    portal_url: str


class SubscriptionStatusResponse(BaseModel):
    has_subscription: bool
    plan: str | None = None
    status: str | None = None
    current_period_end: str | None = None
    stripe_customer_id: str | None = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_PLAN_TO_PRICE = {
    "hot_desk": lambda: settings.stripe_hot_desk_price_id,
    "dedicated_desk": lambda: settings.stripe_dedicated_price_id,
    "private_office": lambda: settings.stripe_private_office_price_id,
}


async def _get_or_create_stripe_customer(member: Member, user: User) -> str:
    """Ensure the member has a Stripe customer ID."""
    if member.stripe_customer_id:
        return member.stripe_customer_id

    stripe.api_key = settings.stripe_secret_key
    customer = stripe.Customer.create(
        email=user.email,
        name=user.full_name,
        metadata={"user_id": str(user.id), "member_id": str(member.id)},
    )
    member.stripe_customer_id = customer["id"]
    return customer["id"]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout_session(
    body: CheckoutRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a Stripe Checkout Session for a subscription plan."""
    if not settings.stripe_secret_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")

    price_fn = _PLAN_TO_PRICE.get(body.plan)
    if not price_fn:
        raise HTTPException(status_code=400, detail=f"Invalid plan: {body.plan}")

    price_id = price_fn()
    if not price_id:
        raise HTTPException(status_code=500, detail=f"Price ID not configured for {body.plan}")

    # Get member
    result = await db.execute(
        select(Member).where(Member.user_id == user.id)
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Member profile not found")

    customer_id = await _get_or_create_stripe_customer(member, user)
    await db.commit()

    stripe.api_key = settings.stripe_secret_key
    try:
        session = stripe.checkout.Session.create(
            customer=customer_id,
            client_reference_id=str(user.id),
            mode="subscription",
            line_items=[{"price": price_id, "quantity": 1}],
            success_url=f"{settings.frontend_url}/billing?status=success&session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{settings.frontend_url}/billing?status=cancelled",
            metadata={"user_id": str(user.id), "plan": body.plan},
        )
    except stripe.error.StripeError as exc:
        logger.error("Stripe Checkout error: %s", exc)
        raise HTTPException(status_code=502, detail="Stripe error creating checkout")

    return CheckoutResponse(checkout_url=session["url"], session_id=session["id"])


@router.post("/portal", response_model=PortalResponse)
async def create_portal_session(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a Stripe Customer Portal session for managing subscriptions."""
    if not settings.stripe_secret_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")

    result = await db.execute(
        select(Member).where(Member.user_id == user.id)
    )
    member = result.scalar_one_or_none()

    if not member or not member.stripe_customer_id:
        raise HTTPException(status_code=404, detail="No billing account found")

    stripe.api_key = settings.stripe_secret_key
    try:
        portal = stripe.billing_portal.Session.create(
            customer=member.stripe_customer_id,
            return_url=f"{settings.frontend_url}/billing",
        )
    except stripe.error.StripeError as exc:
        logger.error("Stripe Portal error: %s", exc)
        raise HTTPException(status_code=502, detail="Stripe error creating portal")

    return PortalResponse(portal_url=portal["url"])


@router.get("/status", response_model=SubscriptionStatusResponse)
async def get_subscription_status(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the user's current subscription status."""
    result = await db.execute(
        select(Member).where(Member.user_id == user.id)
    )
    member = result.scalar_one_or_none()

    if not member:
        return SubscriptionStatusResponse(has_subscription=False)

    # Get active subscription
    sub_result = await db.execute(
        select(Subscription)
        .where(
            Subscription.member_id == member.id,
            Subscription.status.in_([
                SubscriptionStatus.ACTIVE,
                SubscriptionStatus.TRIALING,
                SubscriptionStatus.PAST_DUE,
            ]),
        )
        .order_by(Subscription.created_at.desc())
        .limit(1)
    )
    sub = sub_result.scalar_one_or_none()

    if not sub:
        return SubscriptionStatusResponse(
            has_subscription=False,
            stripe_customer_id=member.stripe_customer_id,
        )

    return SubscriptionStatusResponse(
        has_subscription=True,
        plan=sub.plan_type.value if sub.plan_type else None,
        status=sub.status.value,
        current_period_end=sub.current_period_end.isoformat() if sub.current_period_end else None,
        stripe_customer_id=member.stripe_customer_id,
    )
