"""Tests for the Trade Department real-data tools."""
import os
import sys
from unittest.mock import patch, MagicMock
import pytest


def _make_ohlcv(n=100, base_price=84000.0):
    """Generate synthetic OHLCV data for testing."""
    import random
    random.seed(42)
    data = []
    price = base_price
    ts = 1672531200000
    for i in range(n):
        open_ = price
        change = random.uniform(-0.02, 0.02)
        close = price * (1 + change)
        high = max(open_, close) * random.uniform(1.001, 1.01)
        low = min(open_, close) * random.uniform(0.99, 0.999)
        volume = random.uniform(100, 1000)
        data.append([ts, open_, high, low, close, volume])
        price = close
        ts += 3600000
    return data


def test_calc_rsi_normal():
    """RSI should return a value between 0 and 100."""
    from backend.departments.trade.tools_impl import _calc_rsi
    closes = [float(i) for i in range(50, 100)]
    rsi = _calc_rsi(closes)
    assert 0 <= rsi <= 100


def test_calc_rsi_insufficient_data():
    """RSI should return 50.0 when insufficient data."""
    from backend.departments.trade.tools_impl import _calc_rsi
    rsi = _calc_rsi([100.0, 101.0, 102.0])
    assert rsi == 50.0


def test_calc_ema_returns_correct_length():
    """EMA should return a list shorter than input by (period - 1)."""
    from backend.departments.trade.tools_impl import _calc_ema
    closes = [float(i) for i in range(1, 51)]
    ema = _calc_ema(closes, 20)
    assert len(ema) == len(closes) - 20 + 1


def test_calc_macd_structure():
    """MACD should return dict with macd, signal, histogram, trend."""
    from backend.departments.trade.tools_impl import _calc_macd
    closes = [float(i + 100) for i in range(60)]
    result = _calc_macd(closes)
    assert "macd" in result
    assert "signal" in result
    assert "histogram" in result
    assert result["trend"] in ("bullish", "bearish")


def test_calc_bollinger_structure():
    """Bollinger Bands should return upper > middle > lower."""
    from backend.departments.trade.tools_impl import _calc_bollinger
    closes = [float(i + 100 + (i % 5)) for i in range(30)]
    result = _calc_bollinger(closes)
    assert result["upper"] > result["middle"] > result["lower"]


def test_find_order_blocks():
    """Order block detection should return a list."""
    from backend.departments.trade.tools_impl import _find_order_blocks
    ohlcv = _make_ohlcv(50)
    opens = [o[1] for o in ohlcv]
    highs = [o[2] for o in ohlcv]
    lows = [o[3] for o in ohlcv]
    closes = [o[4] for o in ohlcv]
    obs = _find_order_blocks(opens, highs, lows, closes)
    assert isinstance(obs, list)
    assert len(obs) <= 3


def test_analyze_chart_with_mock_exchange():
    """analyze_chart should return structured data when exchange returns OHLCV."""
    from backend.departments.trade.tools_impl import analyze_chart

    mock_ohlcv = _make_ohlcv(100)

    with patch("backend.departments.trade.tools_impl._get_exchange") as mock_get_ex:
        mock_exchange = MagicMock()
        mock_exchange.fetch_ohlcv.return_value = mock_ohlcv
        mock_get_ex.return_value = mock_exchange

        result = analyze_chart("BTC/USDT", "4h")

    assert result["status"] == "success"
    assert result["symbol"] == "BTC/USDT"
    assert result["timeframe"] == "4h"
    assert "price" in result
    assert "indicators" in result
    assert "smc" in result
    assert "elliott_wave" in result
    assert result["price"]["current"] > 0
    assert 0 <= result["indicators"]["rsi"] <= 100


def test_analyze_chart_error_handling():
    """analyze_chart should return error dict on exchange failure."""
    from backend.departments.trade.tools_impl import analyze_chart

    with patch("backend.departments.trade.tools_impl._get_exchange") as mock_get_ex:
        mock_exchange = MagicMock()
        mock_exchange.fetch_ohlcv.side_effect = Exception("Network error")
        mock_get_ex.return_value = mock_exchange

        result = analyze_chart("BTC/USDT", "1h")

    assert result["status"] == "error"
    assert "message" in result


def test_get_funding_rate_with_mock():
    """get_funding_rate should return structured funding data."""
    from backend.departments.trade.tools_impl import get_funding_rate

    with patch("backend.departments.trade.tools_impl._get_exchange") as mock_get_ex:
        mock_exchange = MagicMock()
        mock_exchange.fetch_funding_rate.return_value = {
            "fundingRate": 0.0001,
            "fundingDatetime": "2026-03-13T08:00:00Z",
        }
        mock_get_ex.return_value = mock_exchange

        result = get_funding_rate("BTC/USDT")

    assert result["status"] == "success"
    assert "funding_rate" in result
    assert "sentiment" in result


def test_generate_signal_with_mock():
    """generate_signal should return a valid signal."""
    from backend.departments.trade.tools_impl import generate_signal

    mock_ohlcv = _make_ohlcv(100)

    with patch("backend.departments.trade.tools_impl._get_exchange") as mock_get_ex:
        mock_exchange = MagicMock()
        mock_exchange.fetch_ohlcv.return_value = mock_ohlcv
        mock_get_ex.return_value = mock_exchange

        result = generate_signal("BTC/USDT", "combined", "medium")

    assert result["status"] == "success"
    assert result["signal"] in ("STRONG_BUY", "BUY", "HOLD", "SELL", "STRONG_SELL")
    assert "score" in result
    assert "reasons" in result
    assert "targets" in result
    assert "elliott_wave" in result


def test_elliott_wave_analysis():
    """Elliott wave analysis should return trend and wave context."""
    from backend.departments.trade.tools_impl import _analyze_elliott_wave

    ohlcv = _make_ohlcv(80)
    closes = [o[4] for o in ohlcv]
    highs = [o[2] for o in ohlcv]
    lows = [o[3] for o in ohlcv]

    result = _analyze_elliott_wave(closes, highs, lows)

    assert "trend" in result
    assert "likely_wave" in result
    assert "fibonacci_levels" in result
    assert result["trend"] in ("uptrend", "downtrend", "sideways", "unknown")
