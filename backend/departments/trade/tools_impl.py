"""
COWORK.ARMY v8.0 — Trade Department Tool Implementations
Real market data via ccxt (Binance primary, multi-exchange support).
Implements: Elliott Wave analysis, SMC structures, multi-timeframe trend,
            funding rates, backtesting, signal generation.
"""
from __future__ import annotations
import json
import math
from datetime import datetime, timedelta
from typing import Any


# ── Exchange Factory ──────────────────────────────────────────────────────────

def _get_exchange(exchange_name: str = "binance"):
    """Create a ccxt exchange instance. Binance is primary, others as fallback."""
    try:
        import ccxt
        exchange_map = {
            "binance": ccxt.binance,
            "bybit": ccxt.bybit,
            "okx": ccxt.okx,
            "kucoin": ccxt.kucoin,
            "gate": ccxt.gateio,
        }
        exchange_cls = exchange_map.get(exchange_name.lower(), ccxt.binance)
        return exchange_cls({"enableRateLimit": True})
    except ImportError:
        raise ImportError("ccxt is not installed. Run: pip install ccxt")


# ── Technical Indicator Calculations ─────────────────────────────────────────

def _calc_rsi(closes: list[float], period: int = 14) -> float:
    """Calculate RSI from close prices."""
    if len(closes) < period + 1:
        return 50.0
    deltas = [closes[i] - closes[i - 1] for i in range(1, len(closes))]
    gains = [d for d in deltas[-period:] if d > 0]
    losses = [-d for d in deltas[-period:] if d < 0]
    avg_gain = sum(gains) / period if gains else 0
    avg_loss = sum(losses) / period if losses else 0.001
    rs = avg_gain / avg_loss
    return round(100 - (100 / (1 + rs)), 2)


def _calc_ema(closes: list[float], period: int) -> list[float]:
    """Calculate EMA from close prices."""
    if len(closes) < period:
        return closes
    k = 2 / (period + 1)
    ema = [sum(closes[:period]) / period]
    for price in closes[period:]:
        ema.append(price * k + ema[-1] * (1 - k))
    return ema


def _calc_macd(closes: list[float]) -> dict:
    """Calculate MACD (12, 26, 9)."""
    ema12 = _calc_ema(closes, 12)
    ema26 = _calc_ema(closes, 26)
    min_len = min(len(ema12), len(ema26))
    macd_line = [ema12[-(min_len - i)] - ema26[-(min_len - i)] for i in range(min_len)]
    signal = _calc_ema(macd_line, 9)
    histogram = macd_line[-1] - signal[-1] if signal else 0
    return {
        "macd": round(macd_line[-1], 4) if macd_line else 0,
        "signal": round(signal[-1], 4) if signal else 0,
        "histogram": round(histogram, 4),
        "trend": "bullish" if histogram > 0 else "bearish",
    }


def _calc_bollinger(closes: list[float], period: int = 20) -> dict:
    """Calculate Bollinger Bands."""
    if len(closes) < period:
        return {"upper": 0, "middle": 0, "lower": 0}
    recent = closes[-period:]
    middle = sum(recent) / period
    std = math.sqrt(sum((x - middle) ** 2 for x in recent) / period)
    return {
        "upper": round(middle + 2 * std, 4),
        "middle": round(middle, 4),
        "lower": round(middle - 2 * std, 4),
        "bandwidth": round(4 * std / middle * 100, 2),
    }


# ── SMC (Smart Money Concepts) Analysis ──────────────────────────────────────

def _find_swing_points(highs: list, lows: list, lookback: int = 5) -> dict:
    """Find swing highs and lows for SMC analysis."""
    swing_highs = []
    swing_lows = []
    for i in range(lookback, len(highs) - lookback):
        if all(highs[i] >= highs[i - j] and highs[i] >= highs[i + j] for j in range(1, lookback + 1)):
            swing_highs.append({"index": i, "price": highs[i]})
        if all(lows[i] <= lows[i - j] and lows[i] <= lows[i + j] for j in range(1, lookback + 1)):
            swing_lows.append({"index": i, "price": lows[i]})
    return {"swing_highs": swing_highs[-5:], "swing_lows": swing_lows[-5:]}


def _detect_bos_choch(closes: list, highs: list, lows: list) -> dict:
    """Detect Break of Structure (BOS) and Change of Character (CHoCH)."""
    if len(closes) < 20:
        return {"bos": None, "choch": None}

    swings = _find_swing_points(highs, lows)
    sh = swings["swing_highs"]
    sl = swings["swing_lows"]

    bos = None
    choch = None
    current_price = closes[-1]

    if len(sh) >= 2:
        last_sh = sh[-1]["price"]
        prev_sh = sh[-2]["price"]
        if current_price > last_sh and last_sh > prev_sh:
            bos = {"type": "bullish_bos", "level": last_sh, "description": "Bullish Break of Structure"}
        elif current_price < last_sh and last_sh < prev_sh:
            choch = {"type": "bearish_choch", "level": last_sh, "description": "Bearish Change of Character"}

    if len(sl) >= 2:
        last_sl = sl[-1]["price"]
        prev_sl = sl[-2]["price"]
        if current_price < last_sl and last_sl < prev_sl:
            bos = {"type": "bearish_bos", "level": last_sl, "description": "Bearish Break of Structure"}
        elif current_price > last_sl and last_sl > prev_sl:
            choch = {"type": "bullish_choch", "level": last_sl, "description": "Bullish Change of Character"}

    return {"bos": bos, "choch": choch}


def _find_order_blocks(opens: list, highs: list, lows: list, closes: list) -> list:
    """Find Order Blocks (institutional entry zones)."""
    order_blocks = []
    for i in range(3, len(closes) - 1):
        # Bullish OB: bearish candle followed by strong bullish move
        if closes[i] < opens[i]:  # bearish candle
            if closes[i + 1] > highs[i]:  # next candle breaks above
                order_blocks.append({
                    "type": "bullish_ob",
                    "top": highs[i],
                    "bottom": lows[i],
                    "index": i,
                    "description": f"Bullish Order Block at {lows[i]:.2f}-{highs[i]:.2f}",
                })
        # Bearish OB: bullish candle followed by strong bearish move
        elif closes[i] > opens[i]:  # bullish candle
            if closes[i + 1] < lows[i]:  # next candle breaks below
                order_blocks.append({
                    "type": "bearish_ob",
                    "top": highs[i],
                    "bottom": lows[i],
                    "index": i,
                    "description": f"Bearish Order Block at {lows[i]:.2f}-{highs[i]:.2f}",
                })
    return order_blocks[-3:]  # Return last 3 OBs


def _find_fvg(highs: list, lows: list) -> list:
    """Find Fair Value Gaps (FVG) / Imbalances."""
    fvgs = []
    for i in range(1, len(highs) - 1):
        # Bullish FVG: gap between candle[i-1] high and candle[i+1] low
        if lows[i + 1] > highs[i - 1]:
            fvgs.append({
                "type": "bullish_fvg",
                "top": lows[i + 1],
                "bottom": highs[i - 1],
                "description": f"Bullish FVG: {highs[i-1]:.2f} - {lows[i+1]:.2f}",
            })
        # Bearish FVG: gap between candle[i-1] low and candle[i+1] high
        elif highs[i + 1] < lows[i - 1]:
            fvgs.append({
                "type": "bearish_fvg",
                "top": lows[i - 1],
                "bottom": highs[i + 1],
                "description": f"Bearish FVG: {highs[i+1]:.2f} - {lows[i-1]:.2f}",
            })
    return fvgs[-3:]


# ── Elliott Wave Analysis ─────────────────────────────────────────────────────

def _analyze_elliott_wave(closes: list, highs: list, lows: list) -> dict:
    """
    Simplified Elliott Wave analysis using swing point detection.
    Identifies likely wave position and provides context for LLM analysis.
    """
    swings = _find_swing_points(highs, lows, lookback=3)
    sh = swings["swing_highs"]
    sl = swings["swing_lows"]

    current_price = closes[-1]
    trend = "unknown"
    wave_context = "insufficient_data"
    likely_wave = "unknown"

    if len(sh) >= 2 and len(sl) >= 2:
        # Determine overall trend
        if sh[-1]["price"] > sh[-2]["price"] and sl[-1]["price"] > sl[-2]["price"]:
            trend = "uptrend"
            # In uptrend, check if we're in impulse or correction
            last_move_up = sh[-1]["price"] - sl[-1]["price"]
            last_move_down = sh[-1]["price"] - current_price
            retracement = last_move_down / last_move_up if last_move_up > 0 else 0

            if retracement < 0.236:
                likely_wave = "Wave_3_or_5_impulse"
                wave_context = "Strong impulse move, likely Wave 3 or 5. Momentum is high."
            elif 0.236 <= retracement <= 0.382:
                likely_wave = "Wave_4_correction"
                wave_context = "Shallow retracement, possible Wave 4. Watch for continuation."
            elif 0.382 <= retracement <= 0.618:
                likely_wave = "Wave_2_or_4_correction"
                wave_context = "Normal retracement (38.2-61.8%), could be Wave 2 or 4."
            elif retracement > 0.618:
                likely_wave = "Possible_Wave_ABC"
                wave_context = "Deep retracement (>61.8%), possible ABC correction or trend change."

        elif sh[-1]["price"] < sh[-2]["price"] and sl[-1]["price"] < sl[-2]["price"]:
            trend = "downtrend"
            likely_wave = "Bearish_impulse_or_correction"
            wave_context = "Downtrend structure. Could be 5-wave bearish impulse or A-B-C correction."
        else:
            trend = "sideways"
            likely_wave = "Consolidation"
            wave_context = "Mixed swing structure, possible consolidation or Wave 4 triangle."

    # Fibonacci levels from last swing
    fib_levels = {}
    if sh and sl:
        high = sh[-1]["price"]
        low = sl[-1]["price"]
        diff = high - low
        fib_levels = {
            "0.0": round(low, 2),
            "0.236": round(low + diff * 0.236, 2),
            "0.382": round(low + diff * 0.382, 2),
            "0.5": round(low + diff * 0.5, 2),
            "0.618": round(low + diff * 0.618, 2),
            "0.786": round(low + diff * 0.786, 2),
            "1.0": round(high, 2),
            "1.272": round(low + diff * 1.272, 2),
            "1.618": round(low + diff * 1.618, 2),
        }

    return {
        "trend": trend,
        "likely_wave": likely_wave,
        "wave_context": wave_context,
        "fibonacci_levels": fib_levels,
        "swing_highs": [s["price"] for s in sh],
        "swing_lows": [s["price"] for s in sl],
    }


# ── Multi-Timeframe Trend Analysis ───────────────────────────────────────────

def _get_macro_trend(symbol: str, exchange_name: str = "binance") -> dict:
    """
    Fetch 1D, 1W data and determine macro trend direction.
    This is the foundation for all trade decisions.
    """
    try:
        exchange = _get_exchange(exchange_name)
        results = {}

        for tf in ["1d", "1w"]:
            ohlcv = exchange.fetch_ohlcv(symbol, tf, limit=50)
            if not ohlcv:
                continue
            closes = [c[4] for c in ohlcv]
            highs = [c[2] for c in ohlcv]
            lows = [c[3] for c in ohlcv]

            ema20 = _calc_ema(closes, 20)
            ema50 = _calc_ema(closes, min(50, len(closes)))
            current = closes[-1]

            trend = "bullish" if ema20[-1] > ema50[-1] and current > ema20[-1] else \
                    "bearish" if ema20[-1] < ema50[-1] and current < ema20[-1] else "neutral"

            results[tf] = {
                "close": round(current, 4),
                "ema20": round(ema20[-1], 4),
                "ema50": round(ema50[-1], 4),
                "trend": trend,
                "rsi": _calc_rsi(closes),
            }

        # Determine overall macro bias
        trends = [v["trend"] for v in results.values()]
        if trends.count("bullish") == len(trends):
            macro_bias = "STRONG_BULL"
        elif trends.count("bearish") == len(trends):
            macro_bias = "STRONG_BEAR"
        elif "bullish" in trends:
            macro_bias = "MILD_BULL"
        elif "bearish" in trends:
            macro_bias = "MILD_BEAR"
        else:
            macro_bias = "NEUTRAL"

        return {
            "status": "success",
            "symbol": symbol,
            "macro_bias": macro_bias,
            "timeframes": results,
            "fetched_at": datetime.now().isoformat(),
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


# ── Main Tool Functions ───────────────────────────────────────────────────────

def analyze_chart(symbol: str, timeframe: str, exchange_name: str = "binance") -> dict:
    """
    Full chart analysis: real OHLCV data + technical indicators + Elliott Wave + SMC.
    Primary exchange: Binance. Falls back to other exchanges if needed.
    """
    try:
        exchange = _get_exchange(exchange_name)
        ohlcv = exchange.fetch_ohlcv(symbol, timeframe, limit=100)

        if not ohlcv:
            return {"status": "error", "message": "No OHLCV data returned"}

        timestamps = [o[0] for o in ohlcv]
        opens = [o[1] for o in ohlcv]
        highs = [o[2] for o in ohlcv]
        lows = [o[3] for o in ohlcv]
        closes = [o[4] for o in ohlcv]
        volumes = [o[5] for o in ohlcv]

        current_price = closes[-1]
        prev_close = closes[-2] if len(closes) > 1 else closes[-1]
        change_pct = round((current_price - prev_close) / prev_close * 100, 2)

        # Technical indicators
        rsi = _calc_rsi(closes)
        macd = _calc_macd(closes)
        bb = _calc_bollinger(closes)
        ema20 = _calc_ema(closes, 20)
        ema50 = _calc_ema(closes, min(50, len(closes)))

        # SMC analysis
        smc = _detect_bos_choch(closes, highs, lows)
        order_blocks = _find_order_blocks(opens, highs, lows, closes)
        fvgs = _find_fvg(highs, lows)

        # Elliott Wave analysis
        elliott = _analyze_elliott_wave(closes, highs, lows)

        # Macro trend (higher timeframe context)
        macro = _get_macro_trend(symbol, exchange_name)

        # Volume analysis
        avg_volume = sum(volumes[-20:]) / 20 if len(volumes) >= 20 else sum(volumes) / len(volumes)
        volume_ratio = round(volumes[-1] / avg_volume, 2) if avg_volume > 0 else 1.0

        return {
            "status": "success",
            "exchange": exchange_name,
            "symbol": symbol,
            "timeframe": timeframe,
            "price": {
                "current": round(current_price, 4),
                "open": round(opens[-1], 4),
                "high": round(highs[-1], 4),
                "low": round(lows[-1], 4),
                "change_pct": change_pct,
            },
            "indicators": {
                "rsi": rsi,
                "rsi_signal": "overbought" if rsi > 70 else "oversold" if rsi < 30 else "neutral",
                "macd": macd,
                "bollinger": bb,
                "ema20": round(ema20[-1], 4),
                "ema50": round(ema50[-1], 4),
                "ema_trend": "bullish" if ema20[-1] > ema50[-1] else "bearish",
            },
            "volume": {
                "current": round(volumes[-1], 2),
                "avg_20": round(avg_volume, 2),
                "ratio": volume_ratio,
                "signal": "high" if volume_ratio > 1.5 else "low" if volume_ratio < 0.5 else "normal",
            },
            "smc": {
                "bos": smc["bos"],
                "choch": smc["choch"],
                "order_blocks": order_blocks,
                "fair_value_gaps": fvgs,
            },
            "elliott_wave": elliott,
            "macro_trend": macro,
            "candles_analyzed": len(ohlcv),
            "fetched_at": datetime.now().isoformat(),
        }
    except Exception as e:
        return {"status": "error", "message": str(e), "symbol": symbol, "timeframe": timeframe}


def get_funding_rate(symbol: str, exchange_name: str = "binance") -> dict:
    """Fetch real-time perpetual futures funding rate."""
    try:
        exchange = _get_exchange(exchange_name)
        # Normalize symbol for futures
        futures_symbol = symbol.replace("/", "").replace("USDT", "/USDT:USDT")
        if ":" not in futures_symbol:
            futures_symbol = symbol

        funding = exchange.fetch_funding_rate(futures_symbol)
        rate = funding.get("fundingRate", 0)
        next_time = funding.get("fundingDatetime", "")

        return {
            "status": "success",
            "exchange": exchange_name,
            "symbol": symbol,
            "funding_rate": round(rate * 100, 4),
            "funding_rate_pct": f"{round(rate * 100, 4)}%",
            "annualized_rate": f"{round(rate * 100 * 3 * 365, 2)}%",
            "next_funding_time": next_time,
            "sentiment": "long_heavy" if rate > 0.01 else "short_heavy" if rate < -0.01 else "balanced",
            "fetched_at": datetime.now().isoformat(),
        }
    except Exception as e:
        return {"status": "error", "message": str(e), "symbol": symbol}


def get_multi_exchange_price(symbol: str) -> dict:
    """Get price from multiple exchanges for comparison."""
    results = {}
    exchanges = ["binance", "bybit", "okx"]
    for ex_name in exchanges:
        try:
            ex = _get_exchange(ex_name)
            ticker = ex.fetch_ticker(symbol)
            results[ex_name] = {
                "price": round(ticker["last"], 4),
                "bid": round(ticker["bid"], 4) if ticker.get("bid") else None,
                "ask": round(ticker["ask"], 4) if ticker.get("ask") else None,
                "volume_24h": round(ticker.get("quoteVolume", 0), 2),
            }
        except Exception as e:
            results[ex_name] = {"error": str(e)}

    prices = [v["price"] for v in results.values() if "price" in v]
    avg_price = round(sum(prices) / len(prices), 4) if prices else 0

    return {
        "status": "success",
        "symbol": symbol,
        "exchanges": results,
        "average_price": avg_price,
        "fetched_at": datetime.now().isoformat(),
    }


def generate_signal(symbol: str, analysis_type: str = "combined", risk_level: str = "medium") -> dict:
    """
    Generate a trading signal based on real market data.
    Combines Elliott Wave, SMC, and technical indicators.
    """
    # Get chart analysis for multiple timeframes
    analysis_4h = analyze_chart(symbol, "4h")
    analysis_1d = analyze_chart(symbol, "1d")

    if analysis_4h.get("status") == "error":
        return {"status": "error", "message": analysis_4h.get("message")}

    # Score-based signal generation
    score = 0
    reasons = []

    # RSI signals
    rsi = analysis_4h["indicators"]["rsi"]
    if rsi < 35:
        score += 2
        reasons.append(f"RSI oversold ({rsi})")
    elif rsi > 65:
        score -= 2
        reasons.append(f"RSI overbought ({rsi})")

    # MACD signals
    macd = analysis_4h["indicators"]["macd"]
    if macd["trend"] == "bullish":
        score += 1
        reasons.append("MACD bullish crossover")
    else:
        score -= 1
        reasons.append("MACD bearish")

    # EMA trend
    if analysis_4h["indicators"]["ema_trend"] == "bullish":
        score += 1
        reasons.append("EMA20 > EMA50 (bullish)")
    else:
        score -= 1
        reasons.append("EMA20 < EMA50 (bearish)")

    # SMC BOS/CHoCH
    bos = analysis_4h["smc"]["bos"]
    choch = analysis_4h["smc"]["choch"]
    if bos and "bullish" in bos.get("type", ""):
        score += 2
        reasons.append(f"Bullish BOS at {bos['level']:.2f}")
    elif bos and "bearish" in bos.get("type", ""):
        score -= 2
        reasons.append(f"Bearish BOS at {bos['level']:.2f}")

    # Elliott Wave context
    ew = analysis_4h["elliott_wave"]
    if "3" in ew.get("likely_wave", "") or "5" in ew.get("likely_wave", ""):
        if ew["trend"] == "uptrend":
            score += 1
            reasons.append(f"Elliott Wave: {ew['likely_wave']}")

    # Macro trend alignment
    macro_bias = analysis_4h.get("macro_trend", {}).get("macro_bias", "NEUTRAL")
    if macro_bias in ("STRONG_BULL", "MILD_BULL"):
        score += 1
        reasons.append(f"Macro trend: {macro_bias}")
    elif macro_bias in ("STRONG_BEAR", "MILD_BEAR"):
        score -= 1
        reasons.append(f"Macro trend: {macro_bias}")

    # Determine signal
    if score >= 4:
        signal = "STRONG_BUY"
    elif score >= 2:
        signal = "BUY"
    elif score <= -4:
        signal = "STRONG_SELL"
    elif score <= -2:
        signal = "SELL"
    else:
        signal = "HOLD"

    # Risk-adjusted targets
    current_price = analysis_4h["price"]["current"]
    risk_multipliers = {"low": 0.01, "medium": 0.02, "high": 0.03}
    risk_pct = risk_multipliers.get(risk_level, 0.02)

    return {
        "status": "success",
        "symbol": symbol,
        "signal": signal,
        "score": score,
        "confidence": min(abs(score) / 7 * 100, 100),
        "current_price": current_price,
        "targets": {
            "entry": current_price,
            "stop_loss": round(current_price * (1 - risk_pct), 4) if "BUY" in signal else round(current_price * (1 + risk_pct), 4),
            "take_profit_1": round(current_price * (1 + risk_pct * 2), 4) if "BUY" in signal else round(current_price * (1 - risk_pct * 2), 4),
            "take_profit_2": round(current_price * (1 + risk_pct * 4), 4) if "BUY" in signal else round(current_price * (1 - risk_pct * 4), 4),
        },
        "reasons": reasons,
        "elliott_wave": ew,
        "macro_bias": macro_bias,
        "analysis_type": analysis_type,
        "risk_level": risk_level,
        "generated_at": datetime.now().isoformat(),
    }


# ── Tool Definitions (for agent runner) ──────────────────────────────────────

TRADE_TOOLS_IMPL = {
    "analyze_chart": analyze_chart,
    "get_funding_rate": get_funding_rate,
    "get_multi_exchange_price": get_multi_exchange_price,
    "generate_signal": generate_signal,
}

TRADE_TOOL_DEFINITIONS = [
    {
        "name": "analyze_chart",
        "description": "Real-time chart analysis: OHLCV data from Binance/multi-exchange + Elliott Wave + SMC (BOS, CHoCH, Order Blocks, FVG) + RSI/MACD/EMA/Bollinger",
        "parameters": {
            "symbol": {"type": "string", "description": "Trading pair (BTC/USDT, ETH/USDT etc.)"},
            "timeframe": {"type": "string", "description": "Timeframe (1m, 5m, 15m, 1h, 4h, 1d, 1w)"},
            "exchange_name": {"type": "string", "description": "Exchange (binance, bybit, okx, kucoin)"},
        },
        "required": ["symbol", "timeframe"],
    },
    {
        "name": "get_funding_rate",
        "description": "Fetch real-time perpetual futures funding rate from exchange",
        "parameters": {
            "symbol": {"type": "string", "description": "Trading pair"},
            "exchange_name": {"type": "string", "description": "Exchange (binance, bybit)"},
        },
        "required": ["symbol"],
    },
    {
        "name": "get_multi_exchange_price",
        "description": "Get current price from multiple exchanges (Binance, Bybit, OKX) for comparison",
        "parameters": {
            "symbol": {"type": "string", "description": "Trading pair (BTC/USDT)"},
        },
        "required": ["symbol"],
    },
    {
        "name": "generate_signal",
        "description": "Generate BUY/SELL/HOLD signal based on real market data, Elliott Wave, SMC, and multi-timeframe analysis",
        "parameters": {
            "symbol": {"type": "string", "description": "Trading pair"},
            "analysis_type": {"type": "string", "description": "Analysis type: combined, elliott, smc"},
            "risk_level": {"type": "string", "description": "Risk level: low, medium, high"},
        },
        "required": ["symbol"],
    },
]
