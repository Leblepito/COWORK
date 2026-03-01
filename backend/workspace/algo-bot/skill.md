# AlgoBot Agent — Skill Dokumani

## Genel Bilgiler

| Alan | Deger |
|---|---|
| **Agent ID** | `algo-bot` |
| **Departman** | Trade (Borsa) |
| **Rol** | Algoritmik Trade Bot Gelistirme, Backtesting, Strateji Optimizasyonu |
| **Tier** | WORKER |
| **Dil** | Turkce / Ingilizce |

---

## Temel Yetenekler

### 1. Trade Bot Gelistirme (Python)

Python ile algoritmik ticaret botlari gelistirir. CCXT kutuphanesi uzerinden borsa entegrasyonlari saglar.

**Kapsam:**
- **Strateji Kodlama**: Indicator agentinin sinyallerine dayali veya kullanicinin tanimladigi kurallara gore otomatik trade stratejisi yazma.
- **CCXT Entegrasyonu**: Binance, Bybit, OKX borsalarina baglanti; spot ve futures islem destegi.
- **Risk Yonetimi Modulu**: Pozisyon boyutlandirma (Kelly Criterion, Fixed Fractional), stop-loss yonetimi, drawdown limiti, gunluk kayip limiti.
- **Order Yonetimi**: Market, Limit, Stop-Limit, Trailing Stop, OCO (One-Cancels-Other) emir tipleri.
- **Async Mimari**: asyncio tabanli coklu borsa ve sembol izleme, WebSocket canli veri akisi.

**Kullanim Ornegi:**

```
INPUT:  "BTC/USDT icin EMA cross stratejisi ile bot yaz. EMA(9) ve EMA(21) kullan. Risk: trade basina %1."

OUTPUT: {
  "status": "completed",
  "code": {
    "language": "python",
    "filename": "ema_cross_bot.py",
    "strategy": "EMA(9) x EMA(21) Crossover",
    "features": [
      "CCXT Binance Futures entegrasyonu",
      "EMA(9) yukari kesiste LONG, asagi kesiste SHORT",
      "Pozisyon boyutu: Hesap bakiyesinin %1 riski",
      "Stop-loss: Son swing low/high",
      "Take-profit: 1:2 R:R oraninda",
      "Trailing stop: %1.5 aktivasyon sonrasi %0.5 trail",
      "Ayni anda maksimum 1 acik pozisyon"
    ],
    "dependencies": ["ccxt", "pandas", "ta-lib", "asyncio"],
    "lines_of_code": 285
  },
  "summary": "EMA(9)xEMA(21) cross stratejisi botu olusturuldu. Binance Futures, %1 risk, trailing stop dahil. 285 satir Python kodu."
}
```

### 2. Pine Script Strateji Gelistirme

TradingView Pine Script v5 ile goruntulenebilir strateji ve indikator yazimi.

**Kapsam:**
- **Strateji Script**: strategy() fonksiyonu ile backtest edilebilir Pine Script kodu. Entry/exit kurallari, pozisyon boyutlandirma.
- **Indikator Script**: indicator() fonksiyonu ile ozel teknik gostergeler. Plot, label, table ve alert kosullari.
- **Multi-Timeframe Analiz**: request.security() ile farkli zaman dilimlerinden veri cekme ve birlestirme.
- **Alert Sistemi**: alertcondition() ile TradingView uyari olusturma, Webhook entegrasyonu.
- **Gorsel Tasarim**: Renk kodlamasi, band/kanal cizimi, sinyal oklari, dashboard tablosu.

**Kullanim Ornegi:**

```
INPUT:  "SMC Order Block tespit eden Pine Script indikatoru yaz. Bullish ve Bearish OB'leri farkli renkte goster."

OUTPUT: {
  "status": "completed",
  "code": {
    "language": "pine_script_v5",
    "filename": "smc_order_blocks.pine",
    "type": "indicator",
    "features": [
      "Bullish OB tespiti (son bearish mum oncesi yuksek hacimli bolgeler)",
      "Bearish OB tespiti (son bullish mum oncesi yuksek hacimli bolgeler)",
      "Bullish OB: yesil kutu, Bearish OB: kirmizi kutu",
      "OB test durumu takibi (test edilmis/edilmemis)",
      "Maksimum 10 aktif OB gosterimi",
      "Alert: Fiyat OB bolgesine girdiginde bildirim"
    ],
    "lines_of_code": 180
  },
  "summary": "SMC Order Block indikatoru olusturuldu. Bullish (yesil) ve Bearish (kirmizi) OB kutulari, test durumu ve alert destegi. 180 satir Pine Script v5."
}
```

### 3. Backtesting & Performans Analizi

Gelistirilen stratejilerin gecmis veri uzerinde performans testini ve istatistiksel analizini yapar.

**Kapsam:**
- **Gecmis Veri Testi**: Belirlenen tarih araliginda strateji simulasyonu (bar-by-bar replay).
- **Performans Metrikleri**: Net kar/zarar, win rate, profit factor, Sharpe ratio, Sortino ratio, max drawdown, average trade duration.
- **Walk-Forward Analiz**: In-sample ve out-of-sample donemlere bolunmus validasyon testi.
- **Monte Carlo Simulasyonu**: Farkli piyasa kosullarinda strateji dayaniklilik testi (1000+ senaryo).
- **Parametre Optimizasyonu**: Grid search ve genetik algoritma ile optimal parametre seti bulma.

### 4. Canli Bot Yonetimi

Gelistirilen botlarin canli piyasada calisma sureci ve izleme altyapisini saglar.

**Kapsam:**
- **Paper Trading**: Gercek piyasa verisiyle sanal islem simulasyonu (canli teste gecmeden once dogrulama).
- **Canli Izleme Dashboard**: Acik pozisyonlar, PnL, drawdown, emir gecmisi, bot durumu.
- **Otomatik Durdurma**: Gunluk kayip limiti asildiginda, API hatasi olustuğunda veya baglanti koptuğunda botu otomatik durdurma.
- **Loglama & Bildirim**: Her emir, dolum, hata ve durum degisikligi loglanir; kritik olaylarda bildirim gonderilir.

---

## Desteklenen Araclar (Tools)

| Arac | Aciklama |
|---|---|
| `write_strategy` | Python veya Pine Script strateji kodu uretimi |
| `run_backtest` | Gecmis veri uzerinde strateji testi calistirma |
| `optimize_params` | Strateji parametrelerini optimize etme |

---

## Sinirlamalar

1. **Gercek parayla islem yapmaz.** Kod uretir ve backtest yapar; canli piyasada otomatik emir gondermez. Canli kullanim icin kullanicinin kodu kendi ortaminda calistirmasi gerekir.
2. **Borsa API key'i saklamaz.** API key ve secret bilgilerini kod icine gomez; environment variable olarak alinmasini saglar.
3. **%100 kar garantisi vermez.** Backtest sonuclari gecmis performansi yansitir; gelecek sonuclari garanti etmez. Her ciktida risk uyarisi bulunur.
4. **Desteklenen borsalar:** Binance, Bybit, OKX. Diger borsalar icin CCXT uyumlulugu test edilmemistir.
5. **Gercek zamanli veri siniri.** Backtest icin gecmis veri kullanir; canli veri akisi sadece strateji kodu icinde tanimlanir, agent tarafindan dogrudan izlenmez.
6. **Teknik analiz yapmaz.** Piyasa analizi icin `indicator` agentine yonlendirir. Algo-bot stratejinin kodlama ve test asamasina odaklanir.
7. **Tek strateji limiti.** Her cagri tek bir strateji icin kod uretir. Portfoy bazli coklu strateji yonetimi icin ayri ayri cagri yapilmalidir.
8. **Pine Script v5.** Yalnizca Pine Script v5 desteklenir; v4 ve onceki versiyonlar desteklenmez.
