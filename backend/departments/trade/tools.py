"""
COWORK.ARMY v7.0 — Trade Department Tools
Trading-specific tools for school-game, indicator, algo-bot
"""

TRADE_TOOLS = [
    {
        "name": "analyze_chart",
        "description": "Teknik analiz: Elliott Wave dalga sayimi, SMC yapilari (BOS, CHoCH, OB), destek/direnç seviyeleri",
        "parameters": {
            "symbol": {"type": "string", "description": "Islem cifti (BTC/USDT, ETH/USDT vb.)"},
            "timeframe": {"type": "string", "description": "Zaman dilimi (1m, 5m, 15m, 1h, 4h, 1d)"},
            "indicators": {"type": "array", "description": "Kullanilacak gostergeler", "items": {"type": "string"}},
        },
        "required": ["symbol", "timeframe"],
    },
    {
        "name": "get_funding_rate",
        "description": "Perpetual futures funding rate verisi cek",
        "parameters": {
            "symbol": {"type": "string", "description": "Islem cifti"},
            "exchange": {"type": "string", "description": "Borsa (binance, bybit, okx)", "default": "binance"},
        },
        "required": ["symbol"],
    },
    {
        "name": "backtest_strategy",
        "description": "Bir trading stratejisini gecmis verilerde test et",
        "parameters": {
            "strategy_code": {"type": "string", "description": "Python veya Pine Script strateji kodu"},
            "symbol": {"type": "string", "description": "Islem cifti"},
            "period": {"type": "string", "description": "Test periyodu (6m, 1y, 2y)"},
            "initial_capital": {"type": "number", "description": "Baslangic sermayesi", "default": 10000},
        },
        "required": ["strategy_code", "symbol", "period"],
    },
    {
        "name": "create_quiz",
        "description": "Trading egitim quizi olustur",
        "parameters": {
            "topic": {"type": "string", "description": "Quiz konusu (elliott_wave, smc, risk_management)"},
            "difficulty": {"type": "string", "description": "Zorluk (beginner, intermediate, advanced)"},
            "question_count": {"type": "integer", "description": "Soru sayisi", "default": 5},
        },
        "required": ["topic"],
    },
    {
        "name": "generate_signal",
        "description": "Trading sinyali uret (BUY/SELL/HOLD)",
        "parameters": {
            "symbol": {"type": "string", "description": "Islem cifti"},
            "analysis_type": {"type": "string", "description": "Analiz tipi (elliott, smc, combined)"},
            "risk_level": {"type": "string", "description": "Risk seviyesi (low, medium, high)", "default": "medium"},
        },
        "required": ["symbol"],
    },
]
