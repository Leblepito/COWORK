# Cargo Agent -- Skill Dosyasi

## Genel Bilgi

| Alan | Deger |
|---|---|
| Agent ID | `cargo` |
| Departman | Yok (tum departmanlar arasi) |
| Rol | Dosya Analiz + Departman Routing Orkestrator |
| Tier | DIRECTOR |
| Platform | COWORK.ARMY v7.0 |

---

## Temel Yetenekler

### 1. Icerik Analizi

Yuklenen dosya, klasor veya veri icerigini analiz ederek ait oldugu alan (domain) belirlenir.

- **Dosya Tipi Tespiti**: Dosya uzantisina gore on kategorizasyon. `.py`, `.ts`, `.tsx`, `.js` -> Software; `.csv`, `.xlsx` -> Trade; `.pdf`, `.docx` -> Medical; `.json`, `.sql` -> Software.
- **Anahtar Kelime Eslestirme**: Icerik icindeki anahtar kelimeleri 4 departman ve 12 agent'in keyword haritasiyla karsilastirarak en uygun eslemeyi bulur. Cok kelimeli ifadeler (multi-word) ve normalize edilmis formlar desteklenir.
- **Guven Skoru Hesaplama (0-100)**: Eslestirme kalitesini gosteren skor. Her bulunan anahtar kelime 8-10 puan, dosya tipi bonusu +5 puan. Skor 100 ile sinirlandirilir. 20'nin altindaki skor "belirsiz" kabul edilir.
- **Fallback Mekanizmasi**: Hicbir departmanla yeterli esleme bulunamazsa (guven skoru < 20), varsayilan olarak Software/FullStack agent'ine yonlendirilir. Guven skoru 15 olarak raporlanir.
- **Icerik Onizleme**: Analiz icin icerigin ilk 5000 karakteri kullanilir. Buyuk dosyalarda tam icerik yerine orneklem uzerinden calisilir.

### 2. Departman Routing

Analiz sonucuna gore hedef departman ve agent belirlenerek dosya/gorev yonlendirilir.

- **4 Departman Hedefleme**: Trade, Medical, Hotel, Software departmanlarindan en uygununu secer.
- **12 Agent Hedefleme**: Departman icindeki 3 agent arasinda en spesifik eslemeyi bulur. Ornegin, "mobil uygulama" icerigi Software/AppBuilder'a, "api endpoint" icerigi Software/FullStack'e yonlendirilir.
- **Coklu Anahtar Kelime Destegi**: Ayni icerik birden fazla departman keyword'u iceriyorsa, en yuksek toplam skora sahip departman/agent cifti secilir.
- **Reasoning Raporu**: Her yonlendirme karariyla birlikte, kararın neden verildigini aciklayan metin uretilir. Hangi anahtar kelimelerin bulundugu ve hangi departman/agent'in secildigi belirtilir.

### 3. Gorev Olusturma ve Teslim

Analiz ve routing sonrasinda hedef agent'a gorev olarak teslim edilir.

- **Inbox Teslimi**: Hedef agent'in `workspace/<agent-id>/inbox/` dizinine `TASK-cargo-<timestamp>.json` dosyasi olusturarak gorevi teslim eder.
- **Prompt Uretimi**: Dosya adi, aciklama, icerik (ilk 3000 karakter) ve analiz sonucunu birlestirerek agent'in anlayacagi formatta prompt olusturur.
- **Veritabani Kaydı**: Her cargo islemi `cargo_logs` tablosuna kaydedilir: dosya bilgisi, analiz sonucu, hedef department/agent, durum (analyzing/routing/delivered/failed).
- **Event Loglama**: Her routing islemi `events` tablosuna "cargo_route" tipiyle kaydedilir. Basarisiz teslimatlar "error" tipiyle loglanir.

### 4. Manuel Gorev Delegasyonu

Otomatik routing disinda, belirli bir agent'a dogrudan gorev atama yapilabilir.

- **Hedefli Atama**: Belirli bir `target_agent_id` ile gorev dogrudan ilgili agent'a atanir. Agent varligı veritabaninda dogrulanir.
- **Otomatik Routing Fallback**: Hedef agent belirtilmezse, icerik analizi ile otomatik routing uygulanir.
- **Task Kaydi**: Her delegasyon `tasks` tablosuna kaydedilir ve durum takibi yapilabilir (pending, in_progress, done, failed).

### 5. 3D Animasyon Entegrasyonu

Tum cargo islemleri frontend'de 3D animasyonla gorsellesirilir.

- **Kurye Karakter**: Departmanlar arasi dolasan 3D kurye karakter animasyonu.
- **Konusma Baloncugu**: Cargo agent dosyayi tasirken analiz ve yonlendirme bilgisini gosteren balon. Tiklandiginda detay paneli acilir.
- **Transfer Beam**: Cargo agent'tan hedef agent'a dosya aktarimini gosteren isik huzme animasyonu.

---

## Kullanim Ornekleri

### Ornek 1: Python Kod Dosyasi Routing

**INPUT:**
```
Dosya: trading_bot.py
Icerik: "import ccxt\nclass TradingBot:\n    def __init__(self):\n        self.exchange = ccxt.binance()\n    def backtest(self, strategy):\n        ..."
Aciklama: "Binance icin otomatik trading bot"
```

**EXPECTED OUTPUT:**
```json
{
  "success": true,
  "cargo_log_id": 42,
  "target_department_id": "trade",
  "target_agent_id": "algo-bot",
  "confidence": 85,
  "reasoning": "Icerik analizi sonucu Trade departmanina, algo-bot agentine yonlendirildi. Bulunan anahtar kelimeler: bot, backtest, strateji, otomatik, algorithm",
  "keywords_found": ["bot", "backtest", "strateji", "otomatik", "algorithm"]
}
```

### Ornek 2: Hasta Kayit Formu Routing

**INPUT:**
```
Dosya: hasta_kayit_formu.pdf
Icerik: "Hasta Adi: ...\nTC Kimlik: ...\nRandevu Tarihi: ...\nDoktor: ...\nBolum: Kardiyoloji"
Aciklama: "Yeni hasta kayit formu sablonu"
```

**EXPECTED OUTPUT:**
```json
{
  "success": true,
  "cargo_log_id": 43,
  "target_department_id": "medical",
  "target_agent_id": "clinic",
  "confidence": 90,
  "reasoning": "Icerik analizi sonucu Medical departmanina, clinic agentine yonlendirildi. Bulunan anahtar kelimeler: hasta, randevu, doktor, hastane",
  "keywords_found": ["hasta", "randevu", "doktor", "hastane"]
}
```

### Ornek 3: Belirsiz Icerik (Fallback)

**INPUT:**
```
Dosya: notlar.txt
Icerik: "Toplanti notlari: 1. Yeni logo tasarimi tartisıldı 2. Ofis dekorasyonu 3. Kantin menusu"
Aciklama: "Genel toplanti notlari"
```

**EXPECTED OUTPUT:**
```json
{
  "success": true,
  "cargo_log_id": 44,
  "target_department_id": "software",
  "target_agent_id": "fullstack",
  "confidence": 15,
  "reasoning": "Belirgin bir departman eslesmesi bulunamadi, varsayilan olarak Software/FullStack'e yonlendiriliyor.",
  "keywords_found": []
}
```

### Ornek 4: Manuel Delegasyon

**INPUT:**
```
Gorev: "Otel web sitesi icin rezervasyon formu olustur"
Hedef: target_department_id="software", target_agent_id="fullstack"
```

**EXPECTED OUTPUT:**
```json
{
  "success": true,
  "task": {
    "id": "task-20260301143022",
    "title": "Otel web sitesi icin rezervasyon formu olustur",
    "status": "pending",
    "assigned_to": "fullstack"
  },
  "target_department_id": "software",
  "target_agent_id": "fullstack"
}
```

### Ornek 5: Coklu Keyword Cakismasi

**INPUT:**
```
Dosya: health_tourism_app.tsx
Icerik: "React Native saglik turizmi uygulamasi. Hasta transferi Phuket -> Turkiye. Mobil uygulama ile randevu ve ucus takibi."
Aciklama: "Saglik turizmi mobil uygulamasi kaynak kodu"
```

**EXPECTED OUTPUT:**
```json
{
  "success": true,
  "cargo_log_id": 45,
  "target_department_id": "medical",
  "target_agent_id": "health-tourism",
  "confidence": 80,
  "reasoning": "Icerik analizi sonucu Medical departmanina, health-tourism agentine yonlendirildi. Bulunan anahtar kelimeler: saglik_turizm, health_tourism, phuket, turkiye, transfer, medikal_seyahat",
  "keywords_found": ["saglik_turizm", "health_tourism", "phuket", "turkiye", "transfer"]
}
```

---

## Sinirlamalar

1. **Keyword-tabanli analiz**: Icerik analizi derin semantik anlama degil, anahtar kelime eslestirmesine dayanir. Icerik karinisik veya soyut ise yanlis departmana yonlendirebilir.
2. **Ilk 5000 karakter limiti**: Analiz icin dosyanin yalnizca ilk 5000 karakteri incelenir. Onemli bilgi dosyanin sonlarinda ise gozden kacabilir.
3. **Prompt uzunluk limiti**: Hedef agent'a iletilen prompt icin icerik 3000 karaktere kesilir. Buyuk dosyalarda tam icerik aktarilamaz.
4. **Tek departman secimi**: Bir dosya yalnizca bir departman/agent ciftine yonlendirilir. Birden fazla departmani ilgilendiren icerikler icin sadece en yuksek skorlu hedef secilir.
5. **Dosya calistirma yapamaz**: Dosyayi analiz eder ve yonlendirir, ancak dosyayi compile etme, calistirma veya donusturme yapamaz.
6. **Gercek zamanli icerik guncellemesi yok**: Keyword haritasi kod icinde statik olarak tanimlidir. Yeni terimler eklemek icin kod guncellemesi gerekir.
7. **Dosya boyutu siniri**: Cok buyuk dosyalar (>10MB) icin performans dusmesi yasanabilir. Buyuk dosyalarin parcalanarak yuklenmesi onerilir.
