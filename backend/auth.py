"""
COWORK.ARMY — Authentication Module (JWT + bcrypt)
Supports: email/password, Google, Telegram, Facebook
"""
import os
import uuid
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from fastapi import Request, HTTPException

from .database import get_db

# JWT config
JWT_SECRET = os.environ.get("JWT_SECRET", "cowork-army-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 72


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))


def create_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token suresi dolmus")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Gecersiz token")


async def get_current_user(request: Request) -> dict | None:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    token = auth[7:]
    payload = decode_token(token)
    db = get_db()
    user = await db.get_user(payload["sub"])
    if not user:
        raise HTTPException(status_code=401, detail="Kullanici bulunamadi")
    return user


async def require_user(request: Request) -> dict:
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Giris yapmaniz gerekiyor")
    return user


async def register_user(email: str, password: str, name: str, company: str = "") -> dict:
    db = get_db()

    existing = await db.get_user_by_email(email)
    if existing:
        raise HTTPException(status_code=400, detail="Bu email zaten kayitli")

    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Sifre en az 6 karakter olmali")

    user_id = f"user-{uuid.uuid4().hex[:12]}"
    pw_hash = hash_password(password)

    user = await db.create_user(user_id, email, pw_hash, name, company)
    token = create_token(user_id, email)

    safe_user = {k: v for k, v in user.items() if k != "password_hash"}
    return {"user": safe_user, "token": token}


async def login_user(email: str, password: str) -> dict:
    db = get_db()

    pw_hash = await db.get_user_password_hash(email)
    if not pw_hash or not verify_password(password, pw_hash):
        raise HTTPException(status_code=401, detail="Email veya sifre hatali")

    user = await db.get_user_by_email(email)
    if not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="Hesap devre disi")

    token = create_token(user["id"], email)
    safe_user = {k: v for k, v in user.items() if k != "password_hash"}
    return {"user": safe_user, "token": token}


async def social_login(provider: str, provider_id: str, email: str, name: str) -> dict:
    """Login or register via social provider (google, telegram, facebook)."""
    db = get_db()

    # Check if user exists with this provider
    user = await db.get_user_by_provider(provider, provider_id)
    if user:
        token = create_token(user["id"], user.get("email", email))
        safe_user = {k: v for k, v in user.items() if k != "password_hash"}
        return {"user": safe_user, "token": token}

    # Check if email already registered
    user = await db.get_user_by_email(email) if email else None
    if user:
        # Link social provider to existing account
        await db.update_user(user["id"], auth_provider=provider, auth_provider_id=provider_id)
        token = create_token(user["id"], email)
        safe_user = {k: v for k, v in user.items() if k != "password_hash"}
        return {"user": safe_user, "token": token}

    # Create new user
    user_id = f"user-{uuid.uuid4().hex[:12]}"
    avatars = {"google": "🟢", "telegram": "🔵", "facebook": "🟦"}
    user = await db.create_user(
        user_id, email or f"{provider}_{provider_id}@social",
        "", name, "",
        auth_provider=provider, auth_provider_id=provider_id,
    )
    await db.update_user(user_id, avatar=avatars.get(provider, "👤"))
    user = await db.get_user(user_id)

    token = create_token(user_id, user.get("email", ""))
    safe_user = {k: v for k, v in user.items() if k != "password_hash"}
    return {"user": safe_user, "token": token}
