# Skill Card: MedManufacturing

## Agent Bilgileri

| Alan | Deger |
|------|-------|
| Agent ID | `manufacturing` |
| Departman | Medical |
| Rol | Medikal Uretim Tesvik & Yatirim Koordinasyon Agenti |
| Tier | WORKER |
| Domain | Kaucuk Eldiven & Maske Uretimi, BOI Tesvik, Fabrika Planlama |

---

## Core Skills

### 1. BOI Tesvik Analizi

Tayland Board of Investment (BOI) tesvik programlarini analiz ederek yatirimcilara en uygun tesvik paketini belirler.

- **Tesvik Programi Eslestirme**: Yatirim tipine gore uygun BOI kategori ve alt kategorisini belirleme (Medikal cihaz uretimi: Kategori 4.6).
- **Vergi Muafiyeti Hesaplama**: Yatirim buyuklugu ve konumuna gore kurumlar vergisi muafiyet suresi hesaplama (3-8 yil).
- **Ithalat Vergisi Muafiyeti**: Hammadde, makine ve ekipman ithalati icin gumruk vergisi muafiyet kapsamini belirleme.
- **Yabanci Isci Kotasi**: BOI projelerine taninan yabanci uzman calisan kotasi ve calisma izni avantajlarini raporlama.
- **Ek Tesvikler**: EEC (Dogu Ekonomik Koridoru) bolgesine ozel ek vergi indirimleri ve arazi tesvikleri.

### 2. Fabrika Planlama

Medikal uretim tesisi icin konum secimi, altyapi analizi ve kapasite planlamasi yapar.

- **EEC Bolge Secimi**: Rayong, Chonburi, Chachoengsao illerindeki endustriyel bolge karsilastirmasi.
- **Arazi & Altyapi Analizi**: Endustriyel park musaitligi, elektrik/su/dogalgaz altyapisi, lojistik baglanti (liman, havaalani mesafesi).
- **Uretim Kapasitesi Hesaplama**: Tesis buyuklugune gore yillik uretim kapasitesi, vardiya plani ve isgucu ihtiyaci hesaplama.
- **Isci Maliyeti Karsilastirmasi**: Tayland, Malezya, Vietnam ve Cin arasinda iscilik maliyeti benchmark analizi.
- **Layout Planlama**: Uretim hatti, hammadde deposu, kalite kontrol lab, temiz oda ve paketleme alani yerlesimi.

### 3. Urun Kategorileri & Uretim

Desteklenen medikal urun kategorilerinde uretim sureci ve teknik spesifikasyon rehberligi saglar.

- **Kaucuk Eldiven**: Nitril eldiven, lateks eldiven, vinil eldiven. Uretim hatti: daldirma hatti (dipping line), vulkanizasyon, yikama, kurutma, paketleme.
- **Medikal Maske**: Cerrahi maske (Tip I/II/IIR), N95 respirator, KN95 maske. Uretim hatti: eritmis uflemeli kumas (meltblown), ultrasonik kaynak, kulak askisi, burun teli.
- **Medikal Cihaz Aksesuar**: IV set, kateter, enjektör parçalari gibi plastik medikal aksesuarlar.

### 4. Sertifikasyon & Uyumluluk

Uluslararasi medikal uretim standartlarina uygunluk sureci ve basvuru rehberligi saglar.

- **ISO 13485**: Medikal cihaz kalite yonetim sistemi kurulum sureci, dokumantasyon gereksinimleri, ic ve dis denetim hazirligi.
- **FDA 510(k)**: ABD pazari icin 510(k) on bildirim basvuru sureci, predicate device eslestirme, test gereksinimleri.
- **CE Isareti**: Avrupa pazari icin CE uygunluk degerlendirmesi, teknik dosya hazirligi, Notified Body secimi.
- **Thai FDA Onay**: Tayland Gida ve Ilac Idaresi uretim lisansi ve urun tescil sureci.
- **GMP Uyumluluk**: Iyi Uretim Uygulamalari (cGMP) standartlarina uygun tesis ve surec tasarimi.

### 5. Pazar Analizi

Kuresel medikal sarf malzeme pazarini analiz ederek yatirimciya stratejik bilgi saglar.

- **Kuresel Talep Tahmini**: Eldiven/maske pazar buyuklugu, yillik buyume orani (CAGR), bolgesel dagılım.
- **Rekabet Analizi**: Tayland, Malezya (Top Glove, Hartalega), Vietnam, Cin ureticileri ile karsilastirmali analiz.
- **Fiyatlandirma Stratejisi**: FOB, CIF fiyat hesaplama, marj analizi, hacim bazli indirim yapilanmasi.
- **Ihracat Lojistik Planlama**: Laem Chabang limani uzerinden ihracat, konteyner optimizasyonu, transit sureler.

---

## Kullanim Ornekleri

### Ornek 1: BOI Tesvik Analizi

**INPUT:**
```json
{
  "product_type": "gloves",
  "analysis_type": "feasibility",
  "location": "Rayong EEC",
  "investment_amount": 5000000
}
```

**EXPECTED OUTPUT:**
```json
{
  "status": "completed",
  "analysis": {
    "product": "Nitril Eldiven Uretim Tesisi",
    "location": "Rayong, EEC Bolgesi (WHA Eastern Industrial Estate)",
    "investment": "$5,000,000 USD",
    "boi_incentives": {
      "category": "4.6 - Medical Device Manufacturing",
      "tax_holiday": "8 yil kurumlar vergisi muafiyeti (EEC bonusu dahil)",
      "import_duty": "Makine ve hammadde ithalati %100 gumruk muafiyeti",
      "foreign_workers": "Proje bazli yabanci uzman kotasi (20 kisi)",
      "additional": "Arazi mulkiyeti hakki, doviz transfer serbestisi"
    },
    "capacity": {
      "annual_production": "500 milyon adet/yil (2 dipping line)",
      "workforce": "150 isci (3 vardiya)",
      "facility_size": "5,000 m2 uretim + 1,500 m2 depo"
    },
    "roi_estimate": "Yatirim geri donus: 3.2 yil (vergi muafiyeti dahil)",
    "timeline": "Tesis kurulum: 12-18 ay, Ilk uretim: 18. ay, Tam kapasite: 24. ay"
  },
  "summary": "Rayong EEC'de $5M nitril eldiven tesisi fizibilitesi olumlu. BOI 8 yil vergi muafiyeti, 3.2 yil ROI. Yillik 500M adet kapasite."
}
```

### Ornek 2: Sertifikasyon Kontrol

**INPUT:**
```json
{
  "standard": "ISO_13485",
  "product": "nitril_eldiven",
  "checklist": ["kalite_politikasi", "risk_yonetimi", "tasarim_kontrol", "uretim_kontrol", "izlenebilirlik"]
}
```

**EXPECTED OUTPUT:**
```json
{
  "status": "completed",
  "analysis": {
    "product": "Nitril Eldiven",
    "location": null,
    "investment": null,
    "boi_incentives": {
      "tax_holiday": "N/A",
      "import_duty": "N/A"
    },
    "certification": {
      "standard": "ISO 13485:2016",
      "checklist_results": {
        "kalite_politikasi": {"status": "template_ready", "description": "Kalite politikasi ve hedefleri sablonu mevcut"},
        "risk_yonetimi": {"status": "requires_iso14971", "description": "ISO 14971 risk yonetimi sureci entegre edilmeli"},
        "tasarim_kontrol": {"status": "applicable", "description": "Tasarim ve gelistirme proseduru olusturulmali"},
        "uretim_kontrol": {"status": "critical", "description": "Proses validasyonu, temiz oda kontrolu, cevresel izleme gerekli"},
        "izlenebilirlik": {"status": "applicable", "description": "Lot bazli izlenebilirlik sistemi kurulmali"}
      },
      "estimated_timeline": "Sertifikasyon sureci: 8-12 ay",
      "estimated_cost": "Danismanlik + denetim: $25,000-40,000"
    },
    "roi_estimate": "N/A",
    "timeline": "Sertifikasyon tamamlanma: 8-12 ay"
  },
  "summary": "Nitril eldiven icin ISO 13485 kontrol listesi degerlendirmesi tamamlandi. 5 maddeden 2'si hazir, 3'u aksiyon gerektiriyor. Tahmini sure: 8-12 ay."
}
```

### Ornek 3: Pazar Analizi

**INPUT:**
```json
{
  "product_type": "masks",
  "analysis_type": "market",
  "location": "Chonburi EEC"
}
```

**EXPECTED OUTPUT:**
```json
{
  "status": "completed",
  "analysis": {
    "product": "Medikal Maske (Cerrahi + N95)",
    "location": "Chonburi, EEC Bolgesi",
    "investment": null,
    "boi_incentives": {
      "tax_holiday": "N/A (pazar analizi)",
      "import_duty": "N/A"
    },
    "market": {
      "global_size": "$8.2 milyar (2026)",
      "cagr": "%6.8 (2026-2031)",
      "regional_demand": {
        "north_america": "%28",
        "europe": "%25",
        "asia_pacific": "%32",
        "rest_of_world": "%15"
      },
      "competitors": {
        "malaysia": "Medikal eldiven hakimi, maske pazarinda buyuyor",
        "china": "En buyuk uretici, fiyat lideri",
        "vietnam": "Dusuk maliyet, hizli buyume",
        "thailand": "Kaucuk hammadde avantaji, EEC tesvikleri"
      },
      "thailand_advantage": "Dogal kaucuk hammaddesi, EEC tesvikleri, Laem Chabang limani erisimi, gelismis altyapi"
    },
    "roi_estimate": "Pazar giris stratejisine bagli",
    "timeline": "Pazar giris: 18-24 ay (tesis + sertifikasyon)"
  },
  "summary": "Kuresel medikal maske pazari $8.2B, %6.8 CAGR. Tayland'in kaucuk hammadde ve EEC tesvik avantaji mevcut. Asya-Pasifik %32 pay ile en buyuk pazar."
}
```

---

## Limitasyonlar

1. **Gercek BOI Basvuru Yapamaz**: Tesvik analizini simule eder; gercek BOI basvuru portalina erisimi yoktur.
2. **Gercek Zamanli Pazar Verisi Yok**: Pazar buyuklugu, fiyat ve talep verileri tahmini modellerdir; canli borsadan cekilmez.
3. **Fiziksel Tesis Denetimi Yapamaz**: Arazi ve tesis degerlenirmesi masa basi analize dayanir; yerinde inceleme yapamaz.
4. **Uretim Sureci Simulasyonu**: Uretim hatti hesaplamalari teorik kapasite degerleridir; gercek uretim verimliligi farklilik gosterebilir.
5. **Hukuki Tavsiye Vermez**: BOI yasalari, is hukuku ve cevre mevzuati hakkinda bilgi verir ancak hukuki danismanlik saglamaz.
6. **Sertifikasyon Basvurusu Yapamaz**: ISO, FDA, CE basvuru surecini yonlendirir ancak gercek basvuru islemlerini yurutmez.
7. **Ulke Siniri**: Yalnizca Tayland (ozellikle EEC bolgesi) icin fabrika planlama yapar. Diger ulkeler sadece karsilastirma amacli kullanilir.
8. **Finansal Danismanlik Degil**: ROI ve fizibilite hesaplamalari rehberlik amaclidir; profesyonel mali musavir yerine gecmez.
