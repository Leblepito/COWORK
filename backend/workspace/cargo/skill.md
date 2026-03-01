# Cargo Agent — Skill Dokumani

## Genel Bilgiler

| Alan | Deger |
|---|---|
| **Agent ID** | `cargo` |
| **Departman** | Yok (Tum departmanlar arasi) |
| **Rol** | Dosya Analiz, Departman Routing, Orkestrasyon |
| **Tier** | DIRECTOR |
| **Dil** | Turkce / Ingilizce |

---

## Temel Yetenekler

### 1. Dosya & Veri Icerik Analizi

Kullanicinin yukledigi dosya, klasor veya veri icerigini analiz ederek domain, konu ve hedef departmani belirler.

**Kapsam:**
- **Dosya Tipi Tespiti**: PDF, DOCX, XLSX, CSV, JSON, PNG/JPG, MP4, kod dosyalari (.py, .ts, .js, .pine) ve diger formatlarin otomatik taninmasi.
- **Anahtar Kelime Cikarimi**: Dosya iceriginden domain-spesifik anahtar kelimeleri tespit etme (ornegin: "Elliott Wave" -> Trade, "ISO 13485" -> Medical, "rezervasyon" -> Hotel, "React" -> Software).
- **Domain Siniflandirma**: Anahtar kelimeler, dosya adi ve icerik baglamina gore 4 departmandan (trade, medical, hotel, software) hangisine ait oldugunu belirleme.
- **Confidence Hesaplama**: Departman eslestirme guven skoru (0-100). %70 altinda birden fazla departman onerisi sunulur.
- **Coklu Dosya Isleme**: Klasor veya arsiv (zip) yuklemelerinde her dosyayi ayri analiz edip toplu routing sonucu sunma.

**Kullanim Ornegi:**

```
INPUT:  Dosya yukleme: "btc_elliott_wave_analiz.pdf" (2.3 MB)

OUTPUT: {
  "status": "completed",
  "analysis": {
    "filename": "btc_elliott_wave_analiz.pdf",
    "file_type": "PDF",
    "file_size": "2.3 MB",
    "keywords": ["Elliott Wave", "BTC", "Wave 3", "Fibonacci", "USDT", "resistance"],
    "domain": "trade",
    "confidence": 95,
    "target_department": "trade",
    "target_agent": "indicator",
    "reasoning": "Dosya adi ve icerik Elliott Wave analizi iceriyor. BTC/USDT islem cifti ve Fibonacci seviyeleri tespit edildi. Trade departmani indicator agentine yonlendiriliyor."
  },
  "routing": {
    "from": "cargo",
    "to": "indicator",
    "department": "trade",
    "prompt_generated": "BTC/USDT Elliott Wave analiz raporu incelendi. Ekteki PDF'deki dalga sayimini dogrula ve guncel piyasa durumuna gore sinyal uret.",
    "delivery_status": "delivered"
  },
  "summary": "btc_elliott_wave_analiz.pdf -> Trade/indicator agentine teslim edildi. Guven: %95."
}
```

### 2. Akilli Departman Routing

Analiz sonucuna gore icerigi dogru departmana ve agente yonlendirir.

**Kapsam:**
- **Departman Eslestirme**: 4 departman (Trade, Medical, Hotel, Software) arasindan hedef belirleme.
- **Agent Eslestirme**: Hedef departman icindeki 3 agentten en uygununu secme (ornegin: trade icinde indicator vs algo-bot vs school-game).
- **Coklu Departman Routing**: Icerik birden fazla departmani ilgilendiriyorsa, ilgili parcalari ayirarak farkli agentlere yonlendirme.
- **Prompt Olusturma**: Hedef agentin anlayacagi formatta gorev promptu otomatik olusturma; dosya ozeti, beklenen cikti ve oncelik bilgisi ekleme.
- **Teslim Dogrulama**: Gonderilen icerigin hedef agentin inbox'ina basariyla ulastigini dogrulama.

**Kullanim Ornegi:**

```
INPUT:  Manuel gorev: "Phuket'te 5 gunluk SUV kiralama fiyati ve ayni tarihler icin otel rezervasyonu lazim"

OUTPUT: {
  "status": "completed",
  "analysis": {
    "filename": null,
    "file_type": "text_query",
    "file_size": null,
    "keywords": ["Phuket", "SUV", "kiralama", "otel", "rezervasyon"],
    "domain": "hotel",
    "confidence": 92,
    "target_department": "hotel",
    "target_agent": ["rental", "hotel"],
    "reasoning": "Talep iki alt gorevi iceriyor: (1) SUV kiralama -> rental agent, (2) otel rezervasyonu -> hotel agent. Her ikisi de hotel departmaninda."
  },
  "routing": {
    "tasks": [
      {
        "from": "cargo",
        "to": "rental",
        "department": "hotel",
        "prompt_generated": "Phuket'te 5 gunluk SUV kiralama talebi. Musait arac, fiyat ve sigorta seceneklerini sun.",
        "delivery_status": "delivered"
      },
      {
        "from": "cargo",
        "to": "hotel",
        "department": "hotel",
        "prompt_generated": "Phuket'te 5 gunluk konaklama talebi. Musait odalar, fiyatlar ve rezervasyon seceneklerini sun.",
        "delivery_status": "delivered"
      }
    ]
  },
  "summary": "Coklu gorev: rental (SUV kiralama) ve hotel (rezervasyon) agentlerine ayri ayri teslim edildi."
}
```

### 3. Gorev Izleme & Orkestrasyon

Tum departmanlar ve agentlar arasinda gorev akisini izler, koordine eder ve raporlar.

**Kapsam:**
- **Gorev Durumu Takibi**: Tum aktif gorevlerin durumunu (pending, in_progress, done, failed) izleme.
- **Darboğaz Tespiti**: Uzun suredir tamamlanmayan gorevleri tespit etme ve uyari olusturma.
- **Yuk Dengeleme**: Yogun calisan agentlerin is yukunu dengelemek icin gorev yeniden yonlendirme onerisi sunma.
- **Event Loglama**: Tum routing, teslim, tamamlanma ve hata olaylarini events tablosuna kaydetme.
- **Periyodik Rapor**: Platform geneli agent durumu, gorev istatistigi ve performans ozeti raporu olusturma.

### 4. Cargo Log Yonetimi

Tum dosya transfer ve routing gecmisini kaydeder ve raporlar.

**Kapsam:**
- **Transfer Gecmisi**: Her dosya transferinin kaynak, hedef, zaman damgasi ve durum bilgisini cargo_logs tablosuna yazma.
- **Analiz Arsivi**: Dosya analiz sonuclarini (anahtar kelimeler, domain, confidence) JSON olarak saklama.
- **Istatistik Raporu**: Departman bazli transfer sayisi, basari orani ve ortalama islem suresi raporu.

---

## Desteklenen Araclar (Tools)

| Arac | Aciklama |
|---|---|
| `analyze_content` | Dosya/veri icerik analizi ve domain siniflandirma |
| `route_task` | Hedef departman ve agente gorev yonlendirme |
| `check_status` | Tum agent ve gorev durumlarini sorgulama |

---

## Sinirlamalar

1. **Gorev calistirmaz.** Analiz eder ve yonlendirir; gorevi kendisi calistirmaz. Icerik isleme her zaman hedef agent tarafindan yapilir.
2. **Dosya boyutu limiti.** Tek dosya maksimum 50 MB. Buyuk dosyalar parcalanarak gonderilmelidir.
3. **Sifrelenmis dosya acilamaz.** Parola korumali veya sifrelenmis dosyalarin icerigi analiz edilemez; kullanicidan acik versiyon istenir.
4. **Garantili tespit yok.** Belirsiz icerikler (birden fazla domaine ait karisik veriler) icin confidence skoru dusuk olabilir. %50 altinda kullanicidan dogrulama istenir.
5. **Canli veri isleyemez.** Streaming veri veya canli API akislari analiz edemez; sadece yuklenenmis statik dosya ve metin islenir.
6. **Departman siniri.** Yalnizca 4 tanimli departmana (trade, medical, hotel, software) yonlendirme yapar. Platform disindaki hedefler desteklenmez.
7. **Agent durumu degistirmez.** Agentlarin spawn/kill islemlerini yapmaz; sadece gorev yonlendirme ve durum izleme yapar.
