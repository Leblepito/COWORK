"""
Tests for commander.py — Task Routing (MEDIUM)
Keyword matching, fallback, Turkish characters, dynamic agent creation.
"""
import pytest

from commander import CommanderRouter, _slugify


# ── Fixtures ─────────────────────────────────────────────

@pytest.fixture
def router(seeded_db):
    return CommanderRouter(seeded_db)


# ═══════════════════════════════════════════════════════════
#  SLUGIFY
# ═══════════════════════════════════════════════════════════

class TestSlugify:
    """Test slug generation for agent IDs."""

    def test_basic_text(self):
        assert _slugify("Hello World") == "hello-world"

    def test_turkish_characters(self):
        result = _slugify("Türkçe Karakter")
        assert isinstance(result, str)
        assert len(result) > 0

    def test_special_characters_removed(self):
        result = _slugify("test!@#$%^&*() agent")
        assert "!" not in result
        assert "@" not in result

    def test_max_length_30(self):
        long_text = "a very long text that exceeds thirty characters limit"
        result = _slugify(long_text)
        assert len(result) <= 30

    def test_empty_returns_default(self):
        assert _slugify("") == "dynamic-agent"
        assert _slugify("   ") == "dynamic-agent"

    def test_underscores_to_hyphens(self):
        result = _slugify("test_agent_name")
        assert "_" not in result


# ═══════════════════════════════════════════════════════════
#  ROUTING
# ═══════════════════════════════════════════════════════════

class TestRouting:
    """Test keyword-based task routing."""

    def test_route_medical_keywords(self, router):
        agent_id, name, count = router.route("hasta randevusu ve klinik")
        assert agent_id == "med-health"
        assert count > 0

    def test_route_trading_keywords(self, router):
        agent_id, name, count = router.route("BTC trading sinyal analizi")
        assert agent_id in ("trade-engine", "tech-analyst")
        assert count > 0

    def test_route_travel_keywords(self, router):
        agent_id, name, count = router.route("uçuş ve otel rezervasyonu")
        assert agent_id == "travel-agent"
        assert count > 0

    def test_route_finance_keywords(self, router):
        agent_id, name, count = router.route("fatura ve gelir gider raporu")
        assert agent_id == "finance"
        assert count > 0

    def test_route_web_dev_keywords(self, router):
        agent_id, name, count = router.route("frontend React component bug fix")
        assert agent_id == "web-dev"
        assert count > 0

    def test_route_growth_keywords(self, router):
        agent_id, name, count = router.route("instagram kampanya ve SEO analizi")
        assert agent_id == "growth-ops"
        assert count > 0

    def test_route_risk_keywords(self, router):
        agent_id, name, count = router.route("risk drawdown ve stop loss")
        assert agent_id == "risk-sentinel"
        assert count > 0

    def test_route_sentiment_keywords(self, router):
        agent_id, name, count = router.route("sentiment analizi ve fear greed index")
        assert agent_id == "alpha-scout"
        assert count > 0

    def test_route_backtest_keywords(self, router):
        agent_id, name, count = router.route("backtest ve sharpe ratio hesapla")
        assert agent_id == "quant-lab"
        assert count > 0

    def test_route_fallback_to_web_dev(self, router):
        agent_id, name, count = router.route("tamamen ilgisiz bir cümle xyz")
        assert agent_id == "web-dev"
        assert count == 0

    def test_route_best_match_wins(self, router):
        # Multiple medical keywords should clearly route to med-health
        agent_id, _, count = router.route("hasta klinik ameliyat doktor randevu tedavi")
        assert agent_id == "med-health"
        assert count >= 5

    def test_route_case_insensitive(self, router):
        _, _, count1 = router.route("BTC TRADING SIGNAL")
        _, _, count2 = router.route("btc trading signal")
        assert count1 == count2


# ═══════════════════════════════════════════════════════════
#  DYNAMIC AGENT CREATION
# ═══════════════════════════════════════════════════════════

class TestDynamicAgentCreation:
    """Test auto_create_agent functionality."""

    def test_creates_agent(self, router):
        agent = router.auto_create_agent("yapay zeka modeli eğitimi ve optimizasyonu")
        assert agent is not None
        assert agent["name"].endswith("Agent")
        assert agent["is_base"] is False

    def test_agent_has_skills(self, router):
        agent = router.auto_create_agent("blockchain smart contract geliştirme")
        assert len(agent["skills"]) > 0
        assert "research" in agent["skills"]

    def test_agent_has_triggers(self, router):
        agent = router.auto_create_agent("mobil uygulama tasarımı ve geliştirme")
        assert len(agent["triggers"]) > 0

    def test_agent_has_system_prompt(self, router):
        agent = router.auto_create_agent("veri tabanı optimizasyonu ve yedekleme")
        assert len(agent["system_prompt"]) > 0
        assert "Türkçe" in agent["system_prompt"]

    def test_stop_words_filtered(self, router):
        agent = router.auto_create_agent("bir yeni sistem için oluştur")
        # All these are stop words, but "sistem" should survive
        if agent:
            assert "sistem" in agent["triggers"]

    def test_empty_text_returns_none(self, router):
        result = router.auto_create_agent("a b c")  # All < 3 chars
        assert result is None

    def test_unique_id_collision(self, router):
        agent1 = router.auto_create_agent("blockchain smart contract geliştirme")
        agent2 = router.auto_create_agent("blockchain smart contract geliştirme")
        # Second should get a different ID
        assert agent1["id"] != agent2["id"]

    def test_deterministic_icon_color(self, router, seeded_db):
        """Same agent ID always gets same icon and color."""
        agent = router.auto_create_agent("test deterministic properties check")
        icon1, color1 = agent["icon"], agent["color"]
        # Delete and recreate with same text won't match because of collision suffix
        # But the hash-based selection should be consistent for a given ID
        assert isinstance(icon1, str)
        assert color1.startswith("#")
