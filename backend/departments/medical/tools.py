"""
COWORK.ARMY v7.0 — Medical Department Tools
Medical-specific tools for clinic, health-tourism, manufacturing
"""

MEDICAL_TOOLS = [
    {
        "name": "manage_patient",
        "description": "Hasta kaydi olustur/guncelle, tedavi sureci takibi",
        "parameters": {
            "action": {"type": "string", "description": "Islem tipi (register, update, discharge, transfer)"},
            "patient_id": {"type": "string", "description": "Hasta ID (olusturmada bos)"},
            "data": {"type": "object", "description": "Hasta verileri (isim, yas, teshis, tedavi vb.)"},
        },
        "required": ["action"],
    },
    {
        "name": "schedule_room",
        "description": "Oda atama ve cizelge yonetimi (60 oda)",
        "parameters": {
            "action": {"type": "string", "description": "Islem (assign, release, check_availability)"},
            "room_id": {"type": "string", "description": "Oda numarasi (R-101 ~ R-160)"},
            "patient_id": {"type": "string", "description": "Hasta ID"},
            "duration_days": {"type": "integer", "description": "Yatis suresi (gun)"},
        },
        "required": ["action"],
    },
    {
        "name": "coordinate_transfer",
        "description": "Uluslararasi hasta transferi koordinasyonu (Phuket-Turkiye)",
        "parameters": {
            "patient_id": {"type": "string", "description": "Hasta ID"},
            "origin": {"type": "string", "description": "Kaynak ulke/sehir"},
            "destination": {"type": "string", "description": "Hedef ulke/sehir"},
            "procedure": {"type": "string", "description": "Planlanan islem/ameliyat"},
            "urgency": {"type": "string", "description": "Aciliyet (elective, semi-urgent, urgent)"},
        },
        "required": ["patient_id", "destination", "procedure"],
    },
    {
        "name": "analyze_investment",
        "description": "Medikal uretim yatirim analizi (BOI tesvik, maliyet, pazar)",
        "parameters": {
            "product_type": {"type": "string", "description": "Urun tipi (gloves, masks, medical_devices)"},
            "location": {"type": "string", "description": "Fabrika konumu (EEC bolgeleri)"},
            "investment_amount": {"type": "number", "description": "Yatirim tutari (USD)"},
            "analysis_type": {"type": "string", "description": "Analiz tipi (feasibility, roi, market)"},
        },
        "required": ["product_type", "analysis_type"],
    },
    {
        "name": "check_compliance",
        "description": "Medikal uyumluluk kontrolu (ISO, FDA, CE)",
        "parameters": {
            "standard": {"type": "string", "description": "Standart (ISO_13485, FDA_510k, CE_mark, GMP)"},
            "product": {"type": "string", "description": "Urun adi"},
            "checklist": {"type": "array", "description": "Kontrol listesi maddeleri", "items": {"type": "string"}},
        },
        "required": ["standard", "product"],
    },
]

# ── Tool Implementations ──────────────────────────────────────────────────────
import uuid as _uuid
import random as _random
from datetime import datetime as _datetime


def _manage_patient(action: str, patient_id: str = "", data: dict = None, **kwargs) -> dict:
    data = data or {}
    if action == "register":
        pid = patient_id or f"P{_uuid.uuid4().hex[:8].upper()}"
        return {"status": "registered", "patient_id": pid, "data": data,
                "registered_at": _datetime.now().isoformat()}
    elif action == "update":
        return {"status": "updated", "patient_id": patient_id, "data": data}
    elif action == "discharge":
        return {"status": "discharged", "patient_id": patient_id,
                "discharged_at": _datetime.now().isoformat()}
    elif action == "transfer":
        return {"status": "transfer_initiated", "patient_id": patient_id,
                "destination": data.get("destination", "unknown")}
    return {"error": f"Bilinmeyen işlem: {action}"}


def _schedule_room(action: str, room_id: str = "", patient_id: str = "",
                   room_type: str = "standard", duration_hours: int = 24, **kwargs) -> dict:
    if action == "assign":
        return {"status": "assigned", "room_id": room_id, "patient_id": patient_id,
                "assigned_at": _datetime.now().isoformat(), "duration_hours": duration_hours}
    elif action == "release":
        return {"status": "released", "room_id": room_id,
                "released_at": _datetime.now().isoformat()}
    elif action == "check_availability":
        return {"room_type": room_type, "available_rooms": _random.randint(1, 10),
                "total_rooms": 60}
    return {"error": f"Bilinmeyen işlem: {action}"}


def _coordinate_transfer(patient_id: str, destination: str, procedure: str,
                          origin: str = "", urgency: str = "elective", **kwargs) -> dict:
    return {"status": "transfer_coordinated", "patient_id": patient_id,
            "origin": origin, "destination": destination, "procedure": procedure,
            "urgency": urgency, "estimated_arrival": "48-72 saat",
            "coordinator": "Medical Transfer Team"}


def _analyze_investment(product_type: str, analysis_type: str, location: str = "",
                        investment_amount: float = 0, **kwargs) -> dict:
    roi_map = {"gloves": 0.22, "masks": 0.18, "medical_devices": 0.31}
    roi = roi_map.get(product_type, 0.20)
    return {"product_type": product_type, "location": location,
            "investment_amount": investment_amount, "analysis_type": analysis_type,
            "estimated_roi": f"{roi*100:.0f}%",
            "payback_years": round(1 / roi, 1) if roi > 0 else None,
            "recommendation": "Feasible" if roi > 0.20 else "Review required"}


def _check_compliance(standard: str, product: str, checklist: list = None, **kwargs) -> dict:
    checklist = checklist or []
    passed = [item for item in checklist if "fail" not in item.lower()]
    return {"standard": standard, "product": product,
            "compliance_status": "compliant" if len(passed) == len(checklist) else "partial",
            "passed_items": len(passed), "total_items": len(checklist),
            "next_audit": "2026-06-01"}


MEDICAL_TOOLS_IMPL = {
    "manage_patient": _manage_patient,
    "schedule_room": _schedule_room,
    "coordinate_transfer": _coordinate_transfer,
    "analyze_investment": _analyze_investment,
    "check_compliance": _check_compliance,
}

MEDICAL_TOOL_DEFINITIONS = MEDICAL_TOOLS
