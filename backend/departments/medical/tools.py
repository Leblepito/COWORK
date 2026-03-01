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
