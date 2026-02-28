# cowork-api

**Coworking Alan Yonetim API'si** — Rezervasyon, odeme ve analitik backend servisi.

## Tech Stack

- **Framework:** FastAPI 0.115+
- **Database:** PostgreSQL 15+ (async SQLAlchemy + asyncpg)
- **ORM:** SQLAlchemy 2.0 (asyncio)
- **Migrations:** Alembic 1.13+
- **Auth:** JWT (python-jose, HS256) + bcrypt (passlib)
- **Odeme:** Stripe 9.0+ (Checkout, Portal, Webhooks)
- **Validation:** Pydantic 2.7+
- **Python:** 3.11+

## Kurulum

```bash
pip install -e .

# Development
uvicorn src.main:app --reload --port 8080

# Migrations
alembic upgrade head
```

## Ortam Degiskenleri

| Degisken | Aciklama |
|----------|----------|
| `DATABASE_URL` | PostgreSQL baglanti string'i (`postgresql+asyncpg://...`) |
| `SECRET_KEY` | JWT imzalama anahtari |
| `STRIPE_SECRET_KEY` | Stripe API anahtari |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook dogrulama |
| `STRIPE_HOT_DESK_PRICE_ID` | Stripe hot desk fiyat ID |
| `STRIPE_DEDICATED_PRICE_ID` | Stripe dedicated desk fiyat ID |
| `STRIPE_PRIVATE_OFFICE_PRICE_ID` | Stripe private office fiyat ID |
| `SMTP_HOST` | E-posta sunucusu |
| `SMTP_USER` | E-posta kullanici adi |
| `SMTP_PASSWORD` | E-posta sifresi |
| `FRONTEND_URL` | Frontend URL (CORS) |
| `ADMIN_URL` | Admin panel URL (CORS) |

## Dosya Yapisi

```
cowork-api/
├── pyproject.toml                → Proje config, bagimliliklar
├── alembic/
│   └── env.py                    → Alembic migration config (async)
└── src/
    ├── main.py                   → FastAPI app, lifespan, CORS, router kaydi
    ├── config.py                 → Settings sinifi (env vars)
    ├── auth.py                   → JWT + bcrypt yardimci fonksiyonlari
    ├── database/
    │   ├── connection.py         → AsyncSession factory, engine, get_db
    │   └── models.py             → SQLAlchemy ORM modelleri (8 tablo)
    ├── routers/
    │   ├── auth.py               → Signup, login, refresh, me
    │   ├── spaces.py             → Alan CRUD + musaitlik kontrolu
    │   ├── bookings.py           → Rezervasyon CRUD + check-in/out
    │   ├── billing.py            → Stripe checkout + portal
    │   ├── analytics.py          → Doluluk, gelir, uye istatistikleri
    │   └── stripe_webhook.py     → Stripe event isleyici
    └── schemas/
        ├── auth.py               → Login/Signup/Token/User schemalar
        ├── booking.py            → Booking CRUD schemalar
        └── space.py              → Space CRUD + availability schemalar
```

## Database Modelleri (8 Tablo)

| Tablo | Aciklama | Onemli Alanlar |
|-------|----------|----------------|
| `users` | Kullanici hesaplari | email (unique), hashed_password, role, is_active |
| `members` | Uye profilleri | user_id (FK), phone, company, stripe_customer_id |
| `spaces` | Fiziksel alanlar | name, space_type, capacity, hourly/daily/monthly rate |
| `bookings` | Rezervasyonlar | user_id, space_id, start/end_time, status, amount_usd |
| `subscriptions` | Stripe abonelikler | member_id, plan_type, stripe_subscription_id, status |
| `occupancy_logs` | Doluluk kaydi | space_id, occupied_at, vacated_at |
| `invoices` | Faturalar | user_id, booking_id, amount_usd, stripe_invoice_id |

### Enum Tipleri

- **UserRole:** MEMBER, ADMIN, SUPER_ADMIN
- **SpaceType:** HOT_DESK, DEDICATED_DESK, PRIVATE_OFFICE, MEETING_ROOM
- **BookingStatus:** PENDING, CONFIRMED, CHECKED_IN, COMPLETED, CANCELLED, NO_SHOW
- **SubscriptionStatus:** ACTIVE, PAST_DUE, CANCELLED, TRIALING
- **InvoiceStatus:** DRAFT, OPEN, PAID, VOID, UNCOLLECTIBLE

## API Endpoints

### Auth (`/auth`)
| Method | Endpoint | Aciklama |
|--------|----------|----------|
| POST | `/auth/signup` | Yeni kullanici kaydi |
| POST | `/auth/login` | Giris, JWT token al |
| POST | `/auth/refresh` | Access token yenile |
| GET | `/auth/me` | Mevcut kullanici bilgisi |

### Spaces (`/api/spaces`)
| Method | Endpoint | Aciklama |
|--------|----------|----------|
| GET | `/api/spaces` | Alan listesi (tur, durum filtresi) |
| GET | `/api/spaces/types` | Alan turleri |
| GET | `/api/spaces/:id` | Alan detayi |
| GET | `/api/spaces/:id/availability` | Musaitlik kontrolu |
| POST | `/api/spaces` | Alan olustur (admin) |
| PUT | `/api/spaces/:id` | Alan guncelle (admin) |
| DELETE | `/api/spaces/:id` | Alan sil — soft delete (admin) |

### Bookings (`/api/bookings`)
| Method | Endpoint | Aciklama |
|--------|----------|----------|
| POST | `/api/bookings` | Rezervasyon olustur (cakisma kontrolu) |
| GET | `/api/bookings` | Rezervasyon listesi (durum filtresi) |
| GET | `/api/bookings/:id` | Rezervasyon detayi |
| PUT | `/api/bookings/:id` | Rezervasyon guncelle |
| POST | `/api/bookings/:id/cancel` | Iptal et |
| POST | `/api/bookings/:id/check-in` | Check-in |
| POST | `/api/bookings/:id/check-out` | Check-out + occupancy log |

### Billing (`/api/billing`)
| Method | Endpoint | Aciklama |
|--------|----------|----------|
| POST | `/api/billing/checkout` | Stripe Checkout oturumu olustur |
| POST | `/api/billing/portal` | Stripe Customer Portal |
| GET | `/api/billing/status` | Abonelik durumu |

### Analytics (`/api/analytics`) — Admin only
| Method | Endpoint | Aciklama |
|--------|----------|----------|
| GET | `/api/analytics/occupancy` | Gunluk doluluk oranlari |
| GET | `/api/analytics/revenue` | Gelir raporlari |
| GET | `/api/analytics/members` | Uye istatistikleri |

### Webhooks
| Method | Endpoint | Aciklama |
|--------|----------|----------|
| POST | `/api/webhooks/stripe` | Stripe event isleyici |

### Health
| Method | Endpoint | Aciklama |
|--------|----------|----------|
| GET | `/health` | Servis durum kontrolu |

## Stripe Entegrasyonu

Desteklenen webhook event'leri:
- `checkout.session.completed` — Yeni abonelik olusturuldu
- `invoice.paid` — Odeme basarili
- `invoice.payment_failed` — Odeme basarisiz
- `customer.subscription.updated` — Plan degisikligi
- `customer.subscription.deleted` — Abonelik iptal

## Auth Sistemi

- JWT Bearer token (access + refresh)
- HS256 algoritmasi
- bcrypt password hashing
- Role-based access control (MEMBER / ADMIN / SUPER_ADMIN)
- Admin-only endpoint korumalari

## Test

```bash
pip install -e ".[dev]"
pytest
```
