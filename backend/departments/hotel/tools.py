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

# ── Tool Implementations ──────────────────────────────────────────────────────
import uuid as _uuid
import random as _random
from datetime import datetime as _datetime


def _calc_nights(check_in: str, check_out: str) -> int:
    try:
        ci = _datetime.strptime(check_in, "%Y-%m-%d")
        co = _datetime.strptime(check_out, "%Y-%m-%d")
        return max(1, (co - ci).days)
    except Exception:
        return 1


def _manage_booking(action: str, booking_id: str = "", guest_name: str = "",
                    room_type: str = "standard", check_in: str = "", check_out: str = "",
                    guests: int = 1, **kwargs) -> dict:
    if action == "create":
        new_id = booking_id or f"BK{_uuid.uuid4().hex[:8].upper()}"
        return {"status": "created", "booking_id": new_id, "guest_name": guest_name,
                "room_type": room_type, "check_in": check_in, "check_out": check_out,
                "guests": guests, "total_nights": _calc_nights(check_in, check_out)}
    elif action == "update":
        return {"status": "updated", "booking_id": booking_id, "room_type": room_type}
    elif action == "cancel":
        return {"status": "cancelled", "booking_id": booking_id}
    elif action in ("checkin", "checkout"):
        return {"status": action + "ed", "booking_id": booking_id, "time": _datetime.now().isoformat()}
    return {"error": f"Bilinmeyen işlem: {action}"}


def _dynamic_pricing(room_type: str, date: str, occupancy_rate: float = 70,
                     competitor_prices: list = None, **kwargs) -> dict:
    base = {"standard": 80, "deluxe": 150, "suite": 300, "presidential": 600}.get(room_type, 100)
    factor = 1.3 if occupancy_rate > 85 else (1.1 if occupancy_rate > 70 else (0.85 if occupancy_rate < 40 else 1.0))
    price = round(base * factor, 2)
    comp_avg = round(sum(competitor_prices) / len(competitor_prices), 2) if competitor_prices else None
    return {"room_type": room_type, "date": date, "recommended_price": price,
            "base_price": base, "occupancy_rate": occupancy_rate, "competitor_avg": comp_avg,
            "strategy": "premium" if factor > 1.1 else ("discount" if factor < 1.0 else "standard")}


def _search_flights(origin: str, destination: str, departure_date: str,
                    return_date: str = "", passengers: int = 1,
                    cabin_class: str = "economy", **kwargs) -> dict:
    airlines = ["Thai Airways", "AirAsia", "Bangkok Airways"]
    flights = [{"airline": a, "flight_no": f"{a[:2].upper()}{_random.randint(100,999)}",
                "departure": f"{departure_date}T{8+i*3:02d}:00",
                "price_usd": _random.randint(200, 800) * passengers,
                "cabin_class": cabin_class} for i, a in enumerate(airlines)]
    return {"origin": origin, "destination": destination, "departure_date": departure_date,
            "passengers": passengers, "results": sorted(flights, key=lambda x: x["price_usd"])}


def _manage_fleet(action: str, vehicle_type: str, vehicle_id: str = "",
                  rental_start: str = "", rental_end: str = "",
                  insurance_type: str = "basic", **kwargs) -> dict:
    if action == "check_available":
        return {"vehicle_type": vehicle_type, "available_count": _random.randint(2, 15),
                "daily_rate_usd": {"car": 45, "suv": 75, "motorcycle": 20, "scooter": 12}.get(vehicle_type, 40)}
    elif action == "reserve":
        return {"status": "reserved", "vehicle_id": vehicle_id or f"V{_random.randint(100,999)}",
                "vehicle_type": vehicle_type, "rental_start": rental_start, "rental_end": rental_end}
    elif action == "return":
        return {"status": "returned", "vehicle_id": vehicle_id, "condition": "good"}
    return {"status": "maintenance_scheduled", "vehicle_id": vehicle_id}


def _create_itinerary(destination: str, duration_days: int, budget: float = 1000,
                      interests: list = None, travelers: int = 1, **kwargs) -> dict:
    interests = interests or ["culture", "food", "nature"]
    daily = round(budget / duration_days, 2)
    days = [{"day": d, "activities": [f"{destination} - {interests[d % len(interests)]}"],
             "estimated_cost_usd": round(daily * 0.8, 2)} for d in range(1, duration_days + 1)]
    return {"destination": destination, "duration_days": duration_days, "travelers": travelers,
            "total_budget_usd": budget, "daily_budget_usd": daily, "itinerary": days}


HOTEL_TOOLS_IMPL = {
    "manage_booking": _manage_booking,
    "dynamic_pricing": _dynamic_pricing,
    "search_flights": _search_flights,
    "manage_fleet": _manage_fleet,
    "create_itinerary": _create_itinerary,
}

HOTEL_TOOL_DEFINITIONS = HOTEL_TOOLS
