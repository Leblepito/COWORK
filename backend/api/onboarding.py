"""
COWORK.ARMY — Onboarding & Templates API
"""
from fastapi import APIRouter, Request, Depends, HTTPException
from ..database import get_db
from .auth import get_current_user

router = APIRouter(prefix="/api", tags=["onboarding"])

TEMPLATES = [
    {"id": "ecommerce", "name": "E-Ticaret", "icon": "🛒", "desc": "Online magaza, stok, siparis ve musteri yonetimi", "agent_count": 4},
    {"id": "marketing", "name": "Pazarlama", "icon": "📣", "desc": "SEO, sosyal medya, icerik ve kampanya yonetimi", "agent_count": 4},
    {"id": "software", "name": "Yazilim", "icon": "💻", "desc": "Full-stack gelistirme, test ve DevOps", "agent_count": 3},
    {"id": "trading", "name": "Trading", "icon": "📈", "desc": "Algoritmik trading, teknik analiz ve risk yonetimi", "agent_count": 4},
    {"id": "healthcare", "name": "Saglik", "icon": "🏥", "desc": "Klinik yonetimi, hasta takibi ve saglik turizmi", "agent_count": 3},
    {"id": "restaurant", "name": "Restoran", "icon": "🍽️", "desc": "Menu, siparis, mutfak ve teslimat yonetimi", "agent_count": 3},
    {"id": "realestate", "name": "Emlak", "icon": "🏠", "desc": "Ilan, musteri eslestirme ve portfoy yonetimi", "agent_count": 3},
    {"id": "education", "name": "Egitim", "icon": "📚", "desc": "Kurs, ogrenci takibi ve icerik uretimi", "agent_count": 3},
]


@router.get("/templates")
async def get_templates():
    return TEMPLATES


@router.post("/onboarding/setup")
async def setup_onboarding(request: Request, user=Depends(get_current_user)):
    """Complete onboarding — update user plan from 'free' to 'starter'."""
    form = await request.form()
    template_id = str(form.get("template_id", "")).strip()
    company_name = str(form.get("company_name", "")).strip()

    if not template_id:
        raise HTTPException(status_code=400, detail="Template secimi gerekli")

    # Update user plan to 'starter' so they pass the onboarding gate
    db = get_db()
    await db.update_user_plan(int(user["id"]), "starter", company_name or None)

    return {"status": "ok", "message": "Kurulum tamamlandi", "plan": "starter"}
