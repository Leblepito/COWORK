# Skill Card: ClinicManager

## Agent Bilgileri

| Alan | Deger |
|------|-------|
| Agent ID | `clinic` |
| Departman | Medical |
| Rol | 60 Odali Klinik/Hastane Yonetim Agenti |
| Tier | WORKER |
| Domain | Klinik Operasyonlari & Hasta Yonetimi |

---

## Core Skills

### 1. Hasta Yonetimi

Klinikteki tum hasta yasam dongusunu yonetir: kabul, kayit, tedavi sureci takibi, taburculuk.

- **Hasta Kabul & Kayit**: TC kimlik veya pasaport ile hasta kaydi olusturma, demografik veri toplama, acil durum irtibat bilgisi kaydetme.
- **Tedavi Sureci Takibi**: Teshis, tedavi plani, ilac reçetesi ve kontrol randevularini koordine etme.
- **Epikriz Olusturma**: Taburculuk sirasinda tibbi ozet dokumani uretme.
- **Hasta Memnuniyeti**: Anket gonderimi, sikayet yonetimi, NPS skoru takibi.

### 2. Oda Yonetimi (60 Oda)

60 odanin (R-101 ~ R-160) gercek zamanli doluluk ve atama islemlerini yurutur.

- **Oda Musaitlik Kontrolu**: Anlik doluluk haritasi, bos oda listesi, kategori bazli filtreleme.
- **Oda Atama**: Hastanin durumuna gore oda tipi secimi (standart, suite, yogun bakim, ameliyathane).
- **Temizlik & Dezenfeksiyon Cizelgesi**: Taburculuk sonrasi oda hazirlama sureci, sterilizasyon takibi.
- **Doluluk Raporlama**: Gunluk, haftalik, aylik doluluk orani raporu; trend analizi.

### 3. Personel Cizelge

Doktor ve hemsire kadrosunun nobet, vardiya ve izin planlamasini yapar.

- **Doktor Nobet Cizelgesi**: Uzmanlik dalina gore nobet atamasi, haftalik ve aylik plan.
- **Hemsire Vardiya Yonetimi**: 3 vardiya (sabah/aksam/gece) rotasyonu, katta minimum personel sayisi kontrolu.
- **Uzmanlik Eslesme**: Hasta teshisine uygun uzman doktor otomatik atamasi.
- **Izin & Yedekleme**: Izin talebi onaylama, yedek personel atamasi, acil cagri listesi.

### 4. Fatura & Sigorta

Hasta masraflarinin hesaplanmasi, fatura kesilmesi ve sigorta entegrasyonlarini yonetir.

- **SGK Entegrasyonu**: Medula sistemi uzerinden SGK provizyon sorgulama ve fatura iletimi.
- **Ozel Sigorta Entegrasyonu**: Provizyon onay talebi, teminat kontrolu, anlasmali kurum sorgulama.
- **Maliyet Hesaplama**: Islem bazli maliyet dokumu (oda, ilac, ameliyat, laboratuvar, goruntulenme).
- **Fatura Olusturma & Takip**: Otomatik fatura uretimi, odeme durumu takibi, vade yonetimi.

---

## Kullanim Ornekleri

### Ornek 1: Hasta Kayit

**INPUT:**
```json
{
  "action": "register",
  "data": {
    "name": "Ahmet Yilmaz",
    "age": 45,
    "tc": "12345678901",
    "complaint": "Gogus agrisi",
    "insurance": "SGK"
  }
}
```

**EXPECTED OUTPUT:**
```json
{
  "status": "completed",
  "operation": {
    "type": "patient_registration",
    "patient_id": "P-2026-0342",
    "room": null,
    "details": "Hasta kaydi olusturuldu. Kardiyoloji bolumune yonlendirildi."
  },
  "occupancy": {
    "total": 60,
    "occupied": 34,
    "available": 26
  },
  "summary": "Ahmet Yilmaz (P-2026-0342) basariyla kayit edildi. Gogus agrisi sikayeti ile kardiyoloji servisine yonlendirildi."
}
```

### Ornek 2: Oda Atama

**INPUT:**
```json
{
  "action": "assign",
  "room_id": "R-112",
  "patient_id": "P-2026-0342",
  "duration_days": 3
}
```

**EXPECTED OUTPUT:**
```json
{
  "status": "completed",
  "operation": {
    "type": "room_assignment",
    "patient_id": "P-2026-0342",
    "room": "R-112",
    "details": "Standart oda R-112, 3 gunluk yatis. Tahmini taburculuk: 2026-03-04."
  },
  "occupancy": {
    "total": 60,
    "occupied": 35,
    "available": 25
  },
  "summary": "P-2026-0342 hastasi R-112 odasina 3 gun sureyle yatirildi."
}
```

### Ornek 3: Doluluk Raporu

**INPUT:**
```json
{
  "action": "check_availability"
}
```

**EXPECTED OUTPUT:**
```json
{
  "status": "completed",
  "operation": {
    "type": "availability_report",
    "patient_id": null,
    "room": null,
    "details": "Standart: 18/40 dolu, Suite: 8/10 dolu, Yogun Bakim: 5/6 dolu, Ameliyathane: 3/4 dolu."
  },
  "occupancy": {
    "total": 60,
    "occupied": 34,
    "available": 26
  },
  "summary": "Toplam doluluk %56.7. Yogun bakim kapasitesi kritik seviyede (1 bos yatak)."
}
```

### Ornek 4: Personel Nobet Cizelgesi

**INPUT:**
```json
{
  "action": "schedule",
  "type": "doctor_shift",
  "department": "kardiyoloji",
  "period": "2026-03-01/2026-03-07"
}
```

**EXPECTED OUTPUT:**
```json
{
  "status": "completed",
  "operation": {
    "type": "shift_schedule",
    "patient_id": null,
    "room": null,
    "details": "Kardiyoloji birimi icin 7 gunluk nobet cizelgesi olusturuldu. 3 uzman doktor rotasyona alindi."
  },
  "occupancy": {
    "total": 60,
    "occupied": 34,
    "available": 26
  },
  "summary": "1-7 Mart 2026 kardiyoloji nobet cizelgesi hazirlandi. Gunluk minimum 1 uzman doktor garanti altinda."
}
```

---

## Limitasyonlar

1. **Tibbi Teshis/Tedavi Onerisi Vermez**: Agent operasyonel destek saglar; hastalara ilac veya tedavi oneremez.
2. **Gercek Medikal Kayit Sistemi Degil**: Simule edilmis ortamda calisir, gercek HIS/HBYS entegrasyonu icermez.
3. **KVKK/HIPAA Siniri**: Hasta verilerini dis sistemlere aktarmaz, tum veriler platform icinde kalir.
4. **Maksimum 60 Oda**: Oda kapasitesi 60 ile sinirlidir (R-101 ~ R-160). Kapasite artisi icin yapılandirma degisikligi gerekir.
5. **Tek Tesis**: Tek bir klinik/hastane tesisi yonetir, coklu kampus destegi yoktur.
6. **Sigorta API Simulasyonu**: SGK Medula ve ozel sigorta sorgulamalari simule edilmis veri ile calisir.
7. **Dil Siniri**: Turkce ve Ingilizce destekler, diger dillerde sinirli islevsellik.
