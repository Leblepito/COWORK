# cowork-admin

**Coworking Alan Yonetim Paneli** — Admin dashboard ile alan, rezervasyon ve uye yonetimi.

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **UI:** React 18, Lucide Icons
- **Styling:** Tailwind CSS
- **State:** React Context API (AuthProvider)
- **Bildirimler:** react-hot-toast
- **Language:** TypeScript (strict mode)

## Ozellikler

| Ozellik | Durum | Aciklama |
|---------|-------|----------|
| Dashboard | Tamamlandi | KPI kartlari, son rezervasyonlar |
| Alan Yonetimi | Tamamlandi | CRUD (olustur, duzenle, sil) |
| Rezervasyon Yonetimi | Tamamlandi | Filtreleme, sayfalama, iptal |
| Uye Yonetimi | Kismi | Mevcut kullanici gosterimi |
| Analitik | Planlanmis | API fonksiyonlari hazir, gorsellesme bekleniyor |
| Auth | Tamamlandi | JWT login, role-based erisim |
| Responsive | Tamamlandi | Mobil sidebar toggle |

## Dosya Yapisi

```
cowork-admin/
├── app/
│   ├── providers.tsx            → AuthProvider + AdminShell wrapper
│   ├── dashboard/
│   │   └── page.tsx             → KPI kartlari, son rezervasyonlar tablosu
│   ├── spaces/
│   │   └── page.tsx             → Alan CRUD (modal form, tablo)
│   ├── bookings/
│   │   └── page.tsx             → Rezervasyon listesi, filtre, sayfalama
│   └── members/
│       └── page.tsx             → Uye listesi (placeholder)
│
├── components/
│   └── AdminShell.tsx           → Sidebar navigasyon + header layout
│
└── lib/
    ├── api.ts                   → API client, TypeScript tipleri, CRUD fonksiyonlari
    └── auth.ts                  → JWT auth context, login/logout, rol kontrolu
```

## Sayfa Detaylari

### Dashboard (`/dashboard`)
- Aktif Alan sayisi
- Bugunun Rezervasyonlari
- Toplam Gelir (tamamlanan rezervasyonlar)
- Onaylanmis Rezervasyonlar
- Son 10 rezervasyon tablosu

### Alan Yonetimi (`/spaces`)
- Alan turleri: hot_desk, dedicated_desk, private_office, meeting_room, event_space
- Tablo gorunumu: tur, kapasite, saat ucreti, kat, durum
- Modal form ile olusturma/duzenleme
- Onay dialogu ile silme

### Rezervasyon Yonetimi (`/bookings`)
- Durum filtresi: pending, confirmed, checked_in, completed, cancelled
- Sayfalama (50 kayit/sayfa)
- Iptal islemi
- Renk kodlu durum badge'leri

### Uye Yonetimi (`/members`)
- Mevcut admin kullanici gosterimi
- Backend `/admin/users` endpoint'i bekleniyor

## API Entegrasyonu

Backend: `NEXT_PUBLIC_API_URL` (varsayilan: `http://localhost:8080`)

| Endpoint | Aciklama |
|----------|----------|
| `POST /auth/login` | Kullanici girisi |
| `GET /auth/me` | Mevcut kullanici |
| `GET /api/spaces` | Alan listesi |
| `POST /api/spaces` | Alan olustur |
| `PATCH /api/spaces/:id` | Alan guncelle |
| `DELETE /api/spaces/:id` | Alan sil |
| `GET /api/bookings` | Rezervasyon listesi |
| `POST /api/bookings/:id/cancel` | Rezervasyon iptal |
| `GET /api/analytics/occupancy` | Doluluk oranlari |
| `GET /api/analytics/revenue` | Gelir istatistikleri |
| `GET /api/analytics/members` | Uye istatistikleri |

## Auth Sistemi

- JWT Bearer token (localStorage)
- Sadece `admin` ve `super_admin` rolleri kabul edilir
- Otomatik token dogrulama (sayfa yuklendiginde)
- Yetkisiz kullanicilari `/auth/login`'e yonlendirir

## Kurulum

```bash
npm install
npm run dev       # → http://localhost:3001
```

## Ortam Degiskenleri

| Degisken | Aciklama | Varsayilan |
|----------|----------|------------|
| `NEXT_PUBLIC_API_URL` | cowork-api adresi | `http://localhost:8080` |
