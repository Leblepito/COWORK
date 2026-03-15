"""
COWORK.ARMY — ExternalDataWatcher
5 katman dış veri izleme: piyasa, haber, sosyal, operasyonel, sistem.
Her katman bağımsız asyncio task olarak çalışır.
Hata yönetimi: exponential backoff retry, stream degradation bildirimi.
"""
import asyncio
import logging
import os
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional

logger = logging.getLogger("cowork.external_watcher")


class Severity(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


@dataclass
class ExternalEvent:
    source: str
    category: str
    raw_data: dict
    severity: Severity
    summary: str
    target_departments: list
    timestamp: datetime = field(default_factory=datetime.utcnow)


async def broadcast_external_trigger(event: dict) -> None:
    """Broadcast an external trigger event to all WebSocket clients."""
    try:
        from ..api.websocket import broadcast
        await broadcast(event)
    except Exception as e:
        logger.error(f"[WATCHER] Broadcast failed: {e}")


class DataStream(ABC):
    name: str
    interval_seconds: int
    max_retries: int = 3
    retry_backoff_seconds: int = 30
    _retry_count: int = 0
    _degraded: bool = False

    @abstractmethod
    async def fetch(self) -> list[ExternalEvent]: ...

    @abstractmethod
    def evaluate_trigger(self, event: ExternalEvent) -> bool: ...

    async def run_once(self) -> list[ExternalEvent]:
        try:
            events = await self.fetch()
            self._retry_count = 0
            self._degraded = False
            return events
        except Exception as e:
            self._retry_count += 1
            backoff = self.retry_backoff_seconds * (2 ** min(self._retry_count - 1, 3))
            logger.warning(
                f"[{self.name}] Fetch failed (attempt {self._retry_count}): {e}. "
                f"Retry in {backoff}s"
            )
            if self._retry_count >= self.max_retries:
                self._degraded = True
                logger.error(f"[{self.name}] Stream degraded after {self.max_retries} failures")
                await broadcast_external_trigger({
                    "type": "external_trigger",
                    "source": self.name,
                    "category": "system",
                    "severity": "HIGH",
                    "summary": f"DataStream '{self.name}' degraded: {e}",
                    "target_departments": ["software"],
                    "timestamp": str(datetime.utcnow()),
                })
            await asyncio.sleep(backoff)
            return []


class MarketDataStream(DataStream):
    name = "market"
    interval_seconds = 30
    _last_prices: dict = {}

    def _change_to_severity(self, abs_change: float) -> Optional[Severity]:
        """Convert absolute price change percentage to severity level."""
        if abs_change >= 5.0:
            return Severity.CRITICAL
        elif abs_change >= 2.0:
            return Severity.HIGH
        elif abs_change >= 1.0:
            return Severity.MEDIUM
        return None  # Küçük değişimler tetiklemez

    async def fetch(self) -> list[ExternalEvent]:
        """Fetch BTC, ETH, SOL prices from CoinGecko (free, no key needed)."""
        import aiohttp
        events = []
        url = "https://api.coingecko.com/api/v3/simple/price"
        params = {
            "ids": "bitcoin,ethereum,solana",
            "vs_currencies": "usd",
            "include_24hr_change": "true"
        }
        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                data = await resp.json()

        symbol_map = {"bitcoin": "BTC", "ethereum": "ETH", "solana": "SOL"}
        for coin_id, symbol in symbol_map.items():
            if coin_id not in data:
                continue
            change_pct = data[coin_id].get("usd_24h_change", 0) or 0
            price = data[coin_id].get("usd", 0)
            severity = self._change_to_severity(abs(change_pct))
            if severity:
                events.append(ExternalEvent(
                    source="coingecko",
                    category="market",
                    raw_data={"symbol": symbol, "price": price, "change_pct": change_pct},
                    severity=severity,
                    summary=f"{symbol} {'📈' if change_pct > 0 else '📉'} {change_pct:+.1f}% (${price:,.0f})",
                    target_departments=["trade"],
                ))
        return events

    def evaluate_trigger(self, event: ExternalEvent) -> bool:
        return event.severity in (Severity.MEDIUM, Severity.HIGH, Severity.CRITICAL)


class NewsDataStream(DataStream):
    name = "news"
    interval_seconds = 600  # 10 dakika

    async def fetch(self) -> list[ExternalEvent]:
        """Fetch financial news via RSS (no API key needed)."""
        import aiohttp
        from xml.etree import ElementTree as ET
        events = []
        feeds = [
            ("https://feeds.bbci.co.uk/news/business/rss.xml", "trade", "finance"),
            ("https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml", "engineering", "tech"),
        ]
        async with aiohttp.ClientSession() as session:
            for url, dept, category in feeds:
                try:
                    headers = {"User-Agent": "Mozilla/5.0 (compatible; COWORK-Bot/1.0)"}
                    async with session.get(url, timeout=aiohttp.ClientTimeout(total=15), headers=headers) as resp:
                        text = await resp.text()
                    root = ET.fromstring(text)
                    items = root.findall(".//item")[:3]  # Son 3 haber
                    for item in items:
                        title = item.findtext("title", "")
                        if title:
                            events.append(ExternalEvent(
                                source=url,
                                category=category,
                                raw_data={"title": title},
                                severity=Severity.LOW,
                                summary=f"📰 {title[:100]}",
                                target_departments=[dept],
                            ))
                except Exception as e:
                    logger.warning(f"[news] Feed {url} failed: {e}")
        return events

    def evaluate_trigger(self, event: ExternalEvent) -> bool:
        return True  # Tüm haberler tetikler


class SocialDataStream(DataStream):
    name = "social"
    interval_seconds = 900  # 15 dakika

    async def fetch(self) -> list[ExternalEvent]:
        """Placeholder: Twitter/X API entegrasyonu için. Şimdilik mock data."""
        return [ExternalEvent(
            source="social_mock",
            category="social",
            raw_data={"trend": "AI agents"},
            severity=Severity.LOW,
            summary="📱 Trend: AI agents, crypto, automation",
            target_departments=["bots"],
        )]

    def evaluate_trigger(self, event: ExternalEvent) -> bool:
        return True


class OperationalDataStream(DataStream):
    name = "operational"
    interval_seconds = 1800  # 30 dakika

    async def fetch(self) -> list[ExternalEvent]:
        """Weather data for hotel/travel operations."""
        import aiohttp
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    "https://wttr.in/Istanbul?format=j1",
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as resp:
                    data = await resp.json()
            temp = data["current_condition"][0]["temp_C"]
            desc = data["current_condition"][0]["weatherDesc"][0]["value"]
            return [ExternalEvent(
                source="wttr.in",
                category="operational",
                raw_data={"temp": temp, "desc": desc, "city": "Istanbul"},
                severity=Severity.LOW,
                summary=f"🌤️ İstanbul: {temp}°C, {desc}",
                target_departments=["hotel"],
            )]
        except Exception as e:
            logger.warning(f"[operational] Weather fetch failed: {e}")
            return []

    def evaluate_trigger(self, event: ExternalEvent) -> bool:
        return True


class SystemDataStream(DataStream):
    name = "system"
    interval_seconds = 60

    async def fetch(self) -> list[ExternalEvent]:
        """Monitor backend API health."""
        import aiohttp
        port = os.environ.get("PORT", "8888")
        backend_url = os.environ.get(
            "BACKEND_HEALTH_URL",
            f"http://localhost:{port}/api/info"
        )
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(backend_url, timeout=aiohttp.ClientTimeout(total=5)) as resp:
                    if resp.status != 200:
                        return [ExternalEvent(
                            source="system_health",
                            category="system",
                            raw_data={"status": resp.status},
                            severity=Severity.HIGH,
                            summary=f"⚠️ Backend API sağlık kontrolü başarısız: HTTP {resp.status}",
                            target_departments=["software"],
                        )]
            return []
        except Exception as e:
            return [ExternalEvent(
                source="system_health",
                category="system",
                raw_data={"error": str(e)},
                severity=Severity.CRITICAL,
                summary=f"🚨 Backend API erişilemiyor: {e}",
                target_departments=["software"],
            )]

    def evaluate_trigger(self, event: ExternalEvent) -> bool:
        return event.severity in (Severity.HIGH, Severity.CRITICAL)


class ExternalDataWatcher:
    """
    5 katman dış veri izleme.
    Her katman bağımsız asyncio task olarak çalışır.
    """

    def __init__(self):
        self.streams: list[DataStream] = [
            MarketDataStream(),
            NewsDataStream(),
            SocialDataStream(),
            OperationalDataStream(),
            SystemDataStream(),
        ]
        self._running = False
        self._tasks: list[asyncio.Task] = []

    async def start(self) -> None:
        """Start all data streams as background tasks."""
        self._running = True
        for stream in self.streams:
            task = asyncio.create_task(self._stream_loop(stream))
            self._tasks.append(task)
        logger.info(f"[WATCHER] Started {len(self.streams)} data streams")

    async def stop(self) -> None:
        """Stop all data streams."""
        self._running = False
        for task in self._tasks:
            task.cancel()
        # Wait for all tasks to be cancelled
        if self._tasks:
            await asyncio.gather(*self._tasks, return_exceptions=True)
        self._tasks.clear()
        logger.info("[WATCHER] Stopped")

    async def _stream_loop(self, stream: DataStream) -> None:
        """Main loop for a single data stream."""
        while self._running:
            events = await stream.run_once()
            for event in events:
                if stream.evaluate_trigger(event):
                    await self._handle_event(event)
            await asyncio.sleep(stream.interval_seconds)

    async def _handle_event(self, event: ExternalEvent) -> None:
        """Handle a triggered external event — broadcast to WebSocket."""
        await broadcast_external_trigger({
            "type": "external_trigger",
            "source": event.source,
            "category": event.category,
            "severity": event.severity,
            "summary": event.summary,
            "target_departments": event.target_departments,
            "timestamp": str(event.timestamp),
        })
        logger.info(f"[WATCHER] Triggered: [{event.severity}] {event.summary[:60]}")


# Global singleton
_watcher: Optional[ExternalDataWatcher] = None


def get_external_watcher() -> ExternalDataWatcher:
    global _watcher
    if _watcher is None:
        _watcher = ExternalDataWatcher()
    return _watcher
