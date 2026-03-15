"""
COWORK.ARMY v7.0 — Authentication API Routes
Supports: email/password, Google, Telegram, Facebook
"""
from fastapi import APIRouter, Form, Request

from ..auth import register_user, login_user, social_login, get_current_user, require_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register")
async def api_register(
    email: str = Form(...),
    password: str = Form(...),
    name: str = Form(...),
    company: str = Form(""),
):
    return await register_user(email, password, name, company)


@router.post("/login")
async def api_login(
    email: str = Form(...),
    password: str = Form(...),
):
    return await login_user(email, password)


@router.get("/me")
async def api_me(request: Request):
    user = await require_user(request)
    safe = {k: v for k, v in user.items() if k != "password_hash"}
    return safe


@router.post("/social-login")
async def api_social_login(
    provider: str = Form(...),
    provider_id: str = Form(...),
    email: str = Form(""),
    name: str = Form(""),
):
    return await social_login(provider, provider_id, email, name)
