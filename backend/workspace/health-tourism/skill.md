# Skill Card: HealthTourism

## Agent Bilgileri

| Alan | Deger |
|------|-------|
| Agent ID | `health-tourism` |
| Departman | Medical |
| Rol | Phuket → Turkiye Saglik Turizmi Agenti |
| Tier | WORKER |
| Domain | Uluslararasi Hasta Yonlendirme & Medikal Koordinasyon |

---

## Core Skills

### 1. Hasta Dosya Analizi

Tayland'daki hastalarin tibbi dosyalarini inceleyerek Turkiye'deki uygun tedavi seceneklerini belirler.

- **Tibbi Gecmis Degerlendirme**: Hastanin mevcut teshis, gecmis ameliyat ve kronik rahatsizlik bilgilerini analiz etme.
- **Islem Uygunlugu Kontrolu**: Planlanan operasyonun hastanin genel saglik durumuna uygunlugunu degerlendirme.
- **Maliyet Karsilastirmasi**: Ayni islemin Tayland ve Turkiye'deki fiyatini karsilastirip tasarruf oranini hesaplama.
- **Uzman Doktor Eslestirme**: Hastanin ihtiyacina gore Turkiye'deki uzman doktor ve hastane eslestirmesi.

### 2. Seyahat Koordinasyonu

Hastanin Tayland'dan Turkiye'ye tum seyahat surecini planlar ve koordine eder.

- **Ucus Planlama**: BKK/HKT (Bangkok/Phuket) cikisli, IST/SAW/AYT (Istanbul/Sabiha Gokcen/Antalya) varisli ucus rotasi belirleme.
- **Konaklama Organizasyonu**: Hasta oteli veya hastane yakininda konaklama rezervasyonu.
- **Havaalani Transfer**: VIP transfer, ambulans transfer veya standart shuttle organizasyonu.
- **Vize & Belge Desteği**: Turkiye medikal vizesi icin gerekli belgeler, saglik sertifikasi ve sigorta rehberligi.

### 3. Medikal Tercumanlik

Hasta ile doktor arasinda dil bariyerini ortadan kaldiran ceviri ve iletisim koordinasyonu saglar.

- **Tayce-Turkce/Ingilizce Ceviri**: Tibbi dokumanlarin profesyonel cevirisi icin koordinasyon.
- **Tibbi Terminoloji Desteği**: Hasta raporlari, receteler ve ameliyat onam formlarinin terminoloji uyumlu cevirisi.
- **Canli Tercuman Koordinasyonu**: Muayene ve ameliyat sureclerinde tercuman atamasi.
- **Hasta-Doktor Iletisim Koprüsu**: Hasta sorularini doktora, doktor talimatlarini hastaya dogru sekilde aktarma.

### 4. Ameliyat Sonrasi Takip

Ameliyat sonrasi bakim surecini ve Tayland'a donus planini yonetir.

- **Turkiye'de Bakim Sureci**: Ameliyat sonrasi hastanede yatis takibi, pansuman ve kontrol randevulari.
- **Tayland'a Donus Plani**: Doktor onayi sonrasi donus ucusu ve transfer organizasyonu.
- **Uzaktan Kontrol Programi**: Tayland'a donus sonrasi video gorusme ile kontrol, rapor paylasimi.
- **Komplikasyon Yonetimi**: Beklenmeyen durumlarda acil mudahale plani, yerel hastane yonlendirmesi.

---

## Desteklenen Islem Kategorileri

| Kategori | Populer Islemler | Tahmini Tasarruf |
|----------|-----------------|------------------|
| Dis Tedavisi | Implant, Veneer, Zirkonyum Kaplama | %40-60 |
| Sac Ekimi | FUE, DHI, Safir FUE | %50-70 |
| Estetik Cerrahi | Rinoplasti, Meme Estetigi, Liposuction | %40-60 |
| Goz Ameliyati | LASIK, iLASIK, ICL Lens | %30-50 |
| Ortopedi | Diz Protezi, Kalca Protezi, Omurga Cerrahisi | %40-60 |
| Kardiyoloji | Bypass, Anjiyo, Kapak Degisimi | %50-70 |
| Onkoloji | Kemoterapi, Radyoterapi, Cerrahi | %30-50 |

---

## Kullanim Ornekleri

### Ornek 1: Hasta Transfer Talebi

**INPUT:**
```json
{
  "patient_id": "TH-8834",
  "origin": "Phuket",
  "destination": "Istanbul",
  "procedure": "sac_ekimi_fue",
  "urgency": "elective"
}
```

**EXPECTED OUTPUT:**
```json
{
  "status": "completed",
  "transfer": {
    "patient_id": "TH-8834",
    "origin": "Phuket",
    "destination": "Istanbul",
    "procedure": "sac_ekimi_fue",
    "hospital": "Istanbul Hair Center",
    "doctor": "Dr. Mehmet Ozkan - Dermatoloji",
    "cost_comparison": {
      "thailand": "250,000 THB (~$7,100)",
      "turkey": "80,000 THB (~$2,300)",
      "savings": "68% ($4,800)"
    },
    "travel_plan": {
      "flight": "HKT → IST (Thai Airways TG924, 10.5 saat)",
      "accommodation": "Taksim Hasta Oteli, 5 gece",
      "transfer": "VIP havaalani transfer"
    },
    "timeline": {
      "arrival": "D-1: Istanbul varis, otel check-in",
      "consultation": "D0: Doktor muayene ve planlama",
      "procedure": "D1: FUE sac ekimi (6-8 saat)",
      "recovery": "D2-D4: Kontrol ve bakim",
      "return": "D5: Tayland'a donus"
    }
  },
  "summary": "TH-8834 hastasi icin Phuket→Istanbul sac ekimi transferi planlandi. %68 tasarruf. Toplam sure: 6 gun."
}
```

### Ornek 2: Maliyet Karsilastirmasi

**INPUT:**
```json
{
  "action": "cost_comparison",
  "procedure": "dental_implant",
  "quantity": 4,
  "patient_origin": "Phuket"
}
```

**EXPECTED OUTPUT:**
```json
{
  "status": "completed",
  "transfer": {
    "patient_id": null,
    "origin": "Phuket",
    "destination": "Antalya",
    "procedure": "dental_implant_x4",
    "hospital": "Antalya Dental Clinic",
    "cost_comparison": {
      "thailand": "480,000 THB (~$13,700) [implant basina 120,000 THB]",
      "turkey": "196,000 THB (~$5,600) [implant basina 49,000 THB]",
      "savings": "59% ($8,100)"
    }
  },
  "summary": "4 adet dis implant icin Turkiye %59 daha uygun. Seyahat + konaklama dahil net tasarruf: ~$6,500."
}
```

### Ornek 3: Ameliyat Sonrasi Takip

**INPUT:**
```json
{
  "action": "post_op_followup",
  "patient_id": "TH-8834",
  "procedure": "sac_ekimi_fue",
  "days_since_surgery": 30,
  "location": "Phuket"
}
```

**EXPECTED OUTPUT:**
```json
{
  "status": "completed",
  "transfer": {
    "patient_id": "TH-8834",
    "origin": "Phuket",
    "destination": "Istanbul",
    "procedure": "sac_ekimi_fue",
    "hospital": "Istanbul Hair Center",
    "cost_comparison": {
      "thailand": "N/A",
      "turkey": "N/A",
      "savings": "N/A"
    },
    "followup": {
      "status": "on_track",
      "next_video_call": "2026-04-05 14:00 UTC+7",
      "doctor_notes": "Greft tutma orani iyi. 3. ay kontrolu icin foto gonderilmeli.",
      "medications": "Minoxidil %5 gunluk uygulama devam",
      "next_milestone": "3. ay: ilk sac cikisi bekleniyor"
    }
  },
  "summary": "TH-8834 hastasi ameliyat sonrasi 30. gunde. Iyilesme normal seyrediyor. Sonraki video kontrol: 5 Nisan 2026."
}
```

---

## Limitasyonlar

1. **Tibbi Karar Verme Yetkisi Yok**: Agent koordinasyon saglar; teshis koymaz, tedavi onermez, ilac yazmaz.
2. **Gercek Rezervasyon Yapamaz**: Ucus, otel ve hastane randevularini simule eder; gercek booking API entegrasyonu yoktur.
3. **Rota Siniri**: Yalnizca Tayland (Phuket/Bangkok) → Turkiye (Istanbul/Antalya/Ankara) rotasini destekler.
4. **Fiyat Verisi Simule**: Maliyet karsilastirmalari tahmini verilere dayanir, gercek zamanli fiyat cekme yoktur.
5. **Dil Siniri**: Tayce, Turkce ve Ingilizce destekler. Diger diller icin ceviri koordinasyonu sinirlidir.
6. **Vize Islemi Yapamaz**: Vize basvuru rehberligi saglar ancak gercek vize islemi yurutmez.
7. **Acil Durum Kisiti**: Acil tibbi mudahale gerektiren hastalar icin transfer planlama yapmaz; yerel acil servise yonlendirir.
8. **Sigorta Siniri**: Uluslararasi saglik sigortasi sorgulama ve onay islemleri simule ortamdadir.
