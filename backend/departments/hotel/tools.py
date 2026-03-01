"""
COWORK.ARMY v7.0 — Hotel & Travel Department Tools
Hotel/travel-specific tools for hotel, flight, rental
"""

HOTEL_TOOLS = [
    {
        "name": "manage_booking",
        "description": "Otel rezervasyon yonetimi (olustur, guncelle, iptal, check-in/out)",
        "parameters": {
            "action": {"type": "string", "description": "Islem (create, update, cancel, checkin, checkout)"},
            "booking_id": {"type": "string", "description": "Rezervasyon ID"},
            "guest_name": {"type": "string", "description": "Misafir adi"},
            "room_type": {"type": "string", "description": "Oda tipi (standard, deluxe, suite, presidential)"},
            "check_in": {"type": "string", "description": "Giris tarihi (YYYY-MM-DD)"},
            "check_out": {"type": "string", "description": "Cikis tarihi (YYYY-MM-DD)"},
            "guests": {"type": "integer", "description": "Misafir sayisi", "default": 1},
        },
        "required": ["action"],
    },
    {
        "name": "dynamic_pricing",
        "description": "Dinamik fiyatlandirma hesapla (sezon, doluluk, talep bazli)",
        "parameters": {
            "room_type": {"type": "string", "description": "Oda tipi"},
            "date": {"type": "string", "description": "Tarih (YYYY-MM-DD)"},
            "occupancy_rate": {"type": "number", "description": "Mevcut doluluk orani (0-100)"},
            "competitor_prices": {"type": "array", "description": "Rakip fiyatlari", "items": {"type": "number"}},
        },
        "required": ["room_type", "date"],
    },
    {
        "name": "search_flights",
        "description": "Ucus arama ve fiyat karsilastirma",
        "parameters": {
            "origin": {"type": "string", "description": "Kalkis havaalani kodu (BKK, IST, SAW)"},
            "destination": {"type": "string", "description": "Varis havaalani kodu"},
            "departure_date": {"type": "string", "description": "Gidis tarihi (YYYY-MM-DD)"},
            "return_date": {"type": "string", "description": "Donus tarihi (opsiyonel)"},
            "passengers": {"type": "integer", "description": "Yolcu sayisi", "default": 1},
            "cabin_class": {"type": "string", "description": "Kabin sinifi (economy, business, first)", "default": "economy"},
        },
        "required": ["origin", "destination", "departure_date"],
    },
    {
        "name": "manage_fleet",
        "description": "Kiralama filosu yonetimi (arac durumu, bakim, musaitlik)",
        "parameters": {
            "action": {"type": "string", "description": "Islem (check_available, reserve, return, maintenance)"},
            "vehicle_type": {"type": "string", "description": "Arac tipi (car, suv, motorcycle, scooter)"},
            "vehicle_id": {"type": "string", "description": "Arac plakasi/ID"},
            "rental_start": {"type": "string", "description": "Baslangic tarihi"},
            "rental_end": {"type": "string", "description": "Bitis tarihi"},
            "insurance_type": {"type": "string", "description": "Sigorta tipi (basic, full, premium)", "default": "basic"},
        },
        "required": ["action", "vehicle_type"],
    },
    {
        "name": "create_itinerary",
        "description": "Seyahat plani olustur (ucus + otel + transfer + aktivite)",
        "parameters": {
            "destination": {"type": "string", "description": "Hedef sehir"},
            "duration_days": {"type": "integer", "description": "Sure (gun)"},
            "budget": {"type": "number", "description": "Butce (USD)"},
            "interests": {"type": "array", "description": "Ilgi alanlari", "items": {"type": "string"}},
            "travelers": {"type": "integer", "description": "Kisi sayisi", "default": 1},
        },
        "required": ["destination", "duration_days"],
    },
]
