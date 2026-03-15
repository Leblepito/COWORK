"""
COWORK.ARMY — Authentication endpoints (login / register / me)
"""
import os
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from passlib.context import CryptContext

from ..database import get_db

router = APIRouter(prefix="/api/auth", tags=["auth"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)

JWT_SECRET = os.environ.get(
    "COWORK_JWT_SECRET", os.environ.get("SECRET_KEY", "change-me-in-production")
)
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 24


def _create_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        return None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    if not credentials:
        raise HTTPException(status_code=401, detail="Missing token")
    payload = _decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    db = get_db()
    user = await db.get_user_by_id(int(payload["sub"]))
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


@router.post("/register")
async def register(request: Request):
    form = await request.form()
    email = str(form.get("email", "")).strip()
    password = str(form.get("password", "")).strip()
    name = str(form.get("name", "")).strip()
    company = str(form.get("company", "")).strip()

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email ve sifre gerekli")
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Sifre en az 6 karakter olmali")

    db = get_db()
    existing = await db.get_user_by_email(email)
    if existing:
        raise HTTPException(status_code=409, detail="Bu email zaten kayitli")

    hashed = pwd_context.hash(password)
    user = await db.create_user(email, hashed, name, company)
    token = _create_token(user["id"])

    return {"user": user, "token": token}


@router.post("/login")
async def login(request: Request):
    form = await request.form()
    email = str(form.get("email", "")).strip()
    password = str(form.get("password", "")).strip()

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email ve sifre gerekli")

    db = get_db()
    user = await db.get_user_by_email(email)
    if not user:
        raise HTTPException(status_code=401, detail="Gecersiz email veya sifre")

    if not pwd_context.verify(password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Gecersiz email veya sifre")

    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Hesap devre disi")

    # Remove hashed_password from response
    user_response = {k: v for k, v in user.items() if k != "hashed_password"}
    token = _create_token(user_response["id"])

    return {"user": user_response, "token": token}


@router.get("/me")
async def me(user=Depends(get_current_user)):
    return user
