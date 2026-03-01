# AlgoBot Agent — Skill Dokumani

## Genel Bilgiler

| Alan | Deger |
|---|---|
| **Agent ID** | `algo-bot` |
| **Departman** | Trade (Borsa) |
| **Rol** | Algoritmik Trade Bot Gelistirme, Backtesting, Performans Analizi |
| **Tier** | WORKER |
| **Dil** | Turkce / Ingilizce |

---

## Temel Yetenekler

### 1. Strateji Tasarimi

Cesitli trading stratejilerini sistematik olarak tasarlar ve parametrize eder.

**Kapsam:**
- Momentum stratejileri: EMA/SMA crossover, RSI breakout, MACD divergence, ADX trend strength
- Mean reversion stratejileri: Bollinger Band bounce, RSI oversold/overbought, z-score mean reversion
- Breakout stratejileri: Donchian channel, range breakout, volatility contraction/expansion
- Grid stratejileri: Sabit aralikli grid, dinamik ATR-bazli grid, hedged grid
- Coklu timeframe analizi: HTF trend + LTF entry, multi-timeframe confirmation
- Gosterge kombinasyonu optimizasyonu: Korelasyon analizi, redundancy elimination
- Risk yonetimi parametreleri: Position sizing (Kelly criterion, fixed fractional), trailing stop, break-even logic

**Kullanim Ornegi:**

```
INPUT:  "BTC/USDT icin momentum bazli bir strateji tasarla, 4h grafik"
OUTPUT: {
  "status": "completed",
  "bot": {
    "name": "BTC_Momentum_4H",
    "strategy": "EMA 21/55 Crossover + RSI 14 filtre + ATR trailing stop",
    "description": "4 saatlik grafikte EMA 21 ve 55 kesisimlerini kullanir. RSI 30-70 arasi filtre ile false signal azaltilir. ATR(14) x 2 mesafesinde trailing stop uygulanir.",
    "parameters": {
      "ema_fast": 21,
      "ema_slow": 55,
      "rsi_period": 14,
      "rsi_oversold": 30,
      "rsi_overbought": 70,
      "atr_period": 14,
      "atr_multiplier": 2.0,
      "position_size": "2% risk per trade"
    },
    "entry_rules": {
      "long": "EMA 21 > EMA 55 crossover + RSI > 30 ve < 70",
      "short": "EMA 21 < EMA 55 crossover + RSI > 30 ve < 70"
    },
    "exit_rules": {
      "stop_loss": "ATR(14) x 2 mesafe",
      "take_profit": "ATR(14) x 4 mesafe (R:R 1:2)",
      "trailing_stop": "ATR(14) x 1.5 mesafe, aktif TP1 sonrasi"
    }
  },
  "summary": "BTC 4H momentum stratejisi tasarlandi. EMA crossover + RSI filtre + ATR trailing stop."
}
```

### 2. Bot Kodlama

Python ve Pine Script ile tam calisir trading botlari kodlar.

**Kapsam:**
- Python kutuphaneleri: ccxt (borsa API), pandas (veri isleme), numpy (numerik hesap), ta-lib (teknik gostergeler), scipy (istatistik)
- Pine Script: TradingView icin strateji ve gosterge kodu
- Backtesting frameworkleri: backtrader, vectorbt, zipline
- Borsa API entegrasyonu: Binance, Bybit, OKX — spot ve futures
- Canli veri akisi: WebSocket baglantisi, orderbook verisi
- Emir yonetimi: Market, limit, stop-limit, OCO (one-cancels-other)
- Loglama ve monitoring: Trade log, error handling, notification

**Kullanim Ornegi:**

```
INPUT:  "EMA crossover stratejisi icin Python botu yaz, Binance API, BTC/USDT"
OUTPUT: {
  "status": "completed",
  "bot": {
    "name": "EMA_Cross_BTC",
    "strategy": "EMA 12/26 crossover with RSI filter",
    "language": "python",
    "code": "import ccxt\nimport pandas as pd\nimport ta\nfrom typing import Optional\n\nclass EMACrossBot:\n    \"\"\"EMA Crossover Trading Bot for Binance.\"\"\"\n    \n    def __init__(self, api_key: str, secret: str, symbol: str = 'BTC/USDT'):\n        self.exchange = ccxt.binance({\n            'apiKey': api_key,\n            'secret': secret,\n            'sandbox': True\n        })\n        self.symbol = symbol\n        self.ema_fast = 12\n        self.ema_slow = 26\n        self.rsi_period = 14\n        self.position: Optional[str] = None\n    \n    def fetch_data(self, timeframe: str = '1h', limit: int = 100) -> pd.DataFrame:\n        ohlcv = self.exchange.fetch_ohlcv(self.symbol, timeframe, limit=limit)\n        df = pd.DataFrame(ohlcv, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])\n        df['ema_fast'] = ta.trend.ema_indicator(df['close'], window=self.ema_fast)\n        df['ema_slow'] = ta.trend.ema_indicator(df['close'], window=self.ema_slow)\n        df['rsi'] = ta.momentum.rsi(df['close'], window=self.rsi_period)\n        return df\n    \n    def check_signal(self, df: pd.DataFrame) -> str:\n        last = df.iloc[-1]\n        prev = df.iloc[-2]\n        if prev['ema_fast'] <= prev['ema_slow'] and last['ema_fast'] > last['ema_slow']:\n            if 30 < last['rsi'] < 70:\n                return 'BUY'\n        elif prev['ema_fast'] >= prev['ema_slow'] and last['ema_fast'] < last['ema_slow']:\n            if 30 < last['rsi'] < 70:\n                return 'SELL'\n        return 'HOLD'\n    \n    def execute(self, signal: str, amount: float) -> dict:\n        if signal == 'BUY' and self.position != 'long':\n            order = self.exchange.create_market_buy_order(self.symbol, amount)\n            self.position = 'long'\n            return {'action': 'BUY', 'order': order}\n        elif signal == 'SELL' and self.position == 'long':\n            order = self.exchange.create_market_sell_order(self.symbol, amount)\n            self.position = None\n            return {'action': 'SELL', 'order': order}\n        return {'action': 'HOLD'}\n    \n    def run(self):\n        df = self.fetch_data()\n        signal = self.check_signal(df)\n        return self.execute(signal, amount=0.001)\n",
    "dependencies": ["ccxt>=4.0", "pandas>=2.0", "ta>=0.11"],
    "setup_instructions": "1. pip install ccxt pandas ta\n2. API key/secret'i .env dosyasina ekle\n3. sandbox=True ile test et\n4. Canliya gecmeden once backtest yap"
  },
  "summary": "EMA 12/26 crossover botu yazildi. Python + ccxt + Binance. RSI filtre dahil."
}
```

### 3. Backtesting

Stratejileri gecmis veri uzerinde sistematik olarak test eder ve performansini olcer.

**Kapsam:**
- Minimum 6 ay gecmis veri testi (zorunlu)
- Walk-forward analiz: In-sample optimizasyon + out-of-sample dogrulama
- Monte Carlo simulasyonu: Farkli piyasa kosullarinda 1000+ senaryo testi
- Slippage modelleme: Gercekci emirleme maliyeti simulasyonu (%0.01-%0.1 arasi)
- Komisyon modelleme: Borsa bazli komisyon oranlari (Binance maker/taker)
- Drawdown analizi: Surekli max drawdown, recovery suresi, underwater equity curve
- Equity curve analizi: Kar/zarar dagilimi, aylik getiri tablosu

**Kullanim Ornegi:**

```
INPUT:  "EMA crossover stratejisini BTC/USDT uzerinde son 1 yil backtest et"
OUTPUT: {
  "status": "completed",
  "bot": {
    "name": "EMA_Cross_BTC",
    "strategy": "EMA 12/26 crossover with RSI filter",
    "backtest": {
      "period": "2025-03-01 ~ 2026-03-01",
      "initial_capital": 10000,
      "final_capital": 14730,
      "total_trades": 87,
      "winning_trades": 51,
      "losing_trades": 36,
      "sharpe_ratio": 1.82,
      "sortino_ratio": 2.14,
      "max_drawdown": "9.8%",
      "max_drawdown_duration": "18 gun",
      "win_rate": "58.6%",
      "profit_factor": 1.73,
      "total_return": "47.3%",
      "annualized_return": "47.3%",
      "avg_trade_pnl": "+0.54%",
      "avg_winning_trade": "+2.1%",
      "avg_losing_trade": "-1.2%",
      "largest_win": "+8.7%",
      "largest_loss": "-3.4%",
      "monthly_returns": {
        "2025-03": "+3.2%", "2025-04": "+5.1%", "2025-05": "-1.8%",
        "2025-06": "+7.4%", "2025-07": "+2.9%", "2025-08": "+4.6%",
        "2025-09": "-2.1%", "2025-10": "+6.3%", "2025-11": "+8.9%",
        "2025-12": "+3.7%", "2026-01": "+5.2%", "2026-02": "+3.9%"
      },
      "slippage_model": "0.05% per trade",
      "commission_model": "Binance maker 0.02%, taker 0.04%"
    },
    "walk_forward": {
      "in_sample": "2025-03 ~ 2025-09 (6 ay)",
      "out_of_sample": "2025-09 ~ 2026-03 (6 ay)",
      "in_sample_sharpe": 1.95,
      "out_of_sample_sharpe": 1.68,
      "degradation": "13.8% — kabul edilebilir (<%30)"
    },
    "monte_carlo": {
      "simulations": 1000,
      "median_return": "+42.1%",
      "5th_percentile": "+12.4%",
      "95th_percentile": "+78.3%",
      "probability_of_loss": "3.2%"
    }
  },
  "summary": "1 yillik backtest tamamlandi. Sharpe 1.82, Max DD %9.8, Win Rate %58.6, Toplam getiri %47.3. Walk-forward dogrulamasi basarili."
}
```

### 4. Performans Metrikleri ve Raporlama

Strateji performansini kapsamli metriklerle olcer ve raporlar.

**Kapsam:**
- Sharpe Ratio: Risk-adjusted getiri (hedef: >1.5, minimum kabul: >1.0)
- Sortino Ratio: Downside-risk-adjusted getiri (hedef: >2.0)
- Max Drawdown: Maksimum tepe-dip kaybi (limit: <%15, kritik: >%20)
- Win Rate: Kazanan islem yuzdesi
- Profit Factor: Brut kar / brut zarar (hedef: >1.5)
- Calmar Ratio: Yillik getiri / max drawdown
- Aylik getiri dagilimi ve istatistikleri
- Risk of Ruin hesaplama

**Kullanim Ornegi:**

```
INPUT:  "Su stratejinin performans raporu: Sharpe 1.2, MaxDD %18, WR %52, PF 1.3"
OUTPUT: {
  "status": "completed",
  "performance_review": {
    "metrics": {
      "sharpe_ratio": {"value": 1.2, "target": 1.5, "status": "BELOW_TARGET", "note": "1.0 ustunde kabul edilebilir ancak hedefin altinda"},
      "max_drawdown": {"value": "18%", "limit": "15%", "status": "EXCEEDS_LIMIT", "note": "KRITIK: Max drawdown limitini asiyor. Pozisyon boyutu kucultur veya ek filtre ekle"},
      "win_rate": {"value": "52%", "target": "55%+", "status": "MARGINAL", "note": "Kabul edilebilir ancak profit factor ile birlikte degerlendirmeli"},
      "profit_factor": {"value": 1.3, "target": 1.5, "status": "BELOW_TARGET", "note": "Kazanan islemlerin ortalama kari arttirilmali"}
    },
    "overall_grade": "C+ (Iyilestirme gerekli)",
    "recommendations": [
      "Max drawdown icin: Pozisyon boyutunu %2'den %1.5'e dusur",
      "Profit factor icin: Trailing stop ekleyerek kazanan islemleri daha uzun tut",
      "Sharpe icin: Dusuk volatilite donemlerde islem sayisini azalt",
      "Ek filtre olarak ADX > 25 trend strength kontrolu ekle"
    ]
  },
  "summary": "Strateji C+ notu aldi. Max DD limit asiyor (%18 > %15). 4 iyilestirme onerisi sunuldu."
}
```

### 5. Strateji Optimizasyonu

Mevcut stratejilerin parametrelerini optimize eder ve iyilestirme onerileri sunar.

**Kapsam:**
- Parametre grid search: Tum kombinasyonlari test etme
- Bayesian optimizasyon: Akilli parametre arama
- Overfitting kontrolu: Walk-forward ve cross-validation ile dogrulama
- Sensitivity analizi: Her parametrenin sonuca etkisini olcme
- A/B karsilastirma: Eski vs. yeni parametrelerin yan yana performansi

**Kullanim Ornegi:**

```
INPUT:  "Grid bot stratejisini optimize et, son 3 aylik performans dusuk"
OUTPUT: {
  "status": "completed",
  "bot": {
    "name": "Grid_Optimized_V2",
    "strategy": "Adaptive grid with ATR-based spacing and volatility filter",
    "optimizations": [
      {
        "parameter": "grid_spacing",
        "before": "Sabit %1 aralik",
        "after": "ATR(14) x 0.5 dinamik aralik",
        "impact": "Dusuk volatilitede gereksiz islem %35 azaldi"
      },
      {
        "parameter": "position_size",
        "before": "Sabit 0.01 BTC",
        "after": "ATR bazli dinamik (volatilite artinca boyut kuculur)",
        "impact": "Max drawdown %22'den %13'e dustu"
      },
      {
        "parameter": "volatility_filter",
        "before": "Yok",
        "after": "Bollinger Band width < 0.02 ise islem yapma",
        "impact": "Dusuk vol donemlerde kayip islem %40 azaldi"
      }
    ],
    "backtest": {
      "before": {"sharpe": 0.8, "max_dd": "22%", "win_rate": "45%", "return": "+8%"},
      "after": {"sharpe": 1.6, "max_dd": "13%", "win_rate": "54%", "return": "+31%"},
      "improvement": "Sharpe 2x, Max DD -%9 puan, Getiri +23 puan"
    }
  },
  "summary": "Grid bot optimize edildi. Sharpe 0.8 -> 1.6, MaxDD %22 -> %13, Getiri %8 -> %31."
}
```

---

## Desteklenen Araclar (Tools)

| Arac | Aciklama |
|---|---|
| `backtest_strategy` | Bir trading stratejisini gecmis verilerde test et |
| `analyze_chart` | Teknik analiz icin chart verisi al (strateji gelistirmede referans) |
| `generate_signal` | Strateji bazli sinyal uretimi (backtest baglaminda) |

---

## Desteklenen Teknolojiler

| Kategori | Teknolojiler |
|---|---|
| **Diller** | Python 3.10+, Pine Script v5 |
| **Borsa API** | Binance, Bybit, OKX (ccxt uzerinden) |
| **Veri isleme** | pandas, numpy, scipy |
| **Teknik gostergeler** | ta-lib, ta (Technical Analysis Library) |
| **Backtesting** | backtrader, vectorbt, zipline |
| **Gorsellestime** | matplotlib, plotly (chart cikti icin) |

---

## Sinirlamalar

1. **Gercek para ile islem yapmaz.** Sadece strateji tasarimi, kodlama ve backtesting yapar. Canli trading icin kullanici kendi deploy eder.
2. **Canli API baglantisi yoktur.** Tum testler simulasyon verisi uzerindedir. Canli borsa hesabina baglanmaz.
3. **Garanti getiri vaat etmez.** Gecmis performans gelecek sonuclari garanti etmez. Her ciktida bu uyari bulunur.
4. **Pine Script deploy etmez.** TradingView'a yukleme kullanicinin sorumluluğundadir. Sadece kodu uretir.
5. **Minimum backtest suresi: 6 ay.** Daha kisa sureli backtest talepleri reddedilir ve 6 ay zorunlulugu aciklanir.
6. **Maksimum optimizasyon parametre sayisi: 5.** Grid search icin ayni anda en fazla 5 parametre optimize edilebilir (combinatorial explosion onlemi).
7. **Sinyal uretmez.** Trading sinyali ihtiyaci icin `indicator` agentina yonlendirir. AlgoBot strateji bazli sinyalleri sadece backtest baglaminda uretir.
8. **Egitim vermez.** Detayli ogretim talebi icin `school-game` agentina yonlendirir.
9. **Desteklenmeyen stratejiler:** HFT (high-frequency trading), MEV (miner extractable value), front-running. Bu stratejiler etik ve teknik nedenlerle kapsam disindadir.
10. **Tek sembol limiti.** Her backtest tek bir islem cifti icindir. Portfoy bazli multi-asset backtesting sinirli sekilde desteklenir.
