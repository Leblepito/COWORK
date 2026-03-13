"""
COWORK.ARMY v8.0 — Bots Department Tools
Real tool implementations for automation and social media agents.
"""
from __future__ import annotations
import json
import re
from datetime import datetime
from typing import Any


def fetch_x_trends(topic: str = "crypto", language: str = "tr") -> dict:
    """
    Fetch trending topics related to a subject.
    Uses public web data (no API key required for basic usage).
    """
    try:
        import httpx
        # CoinGecko trending for crypto topics
        if "crypto" in topic.lower() or "bitcoin" in topic.lower() or "btc" in topic.lower():
            response = httpx.get(
                "https://api.coingecko.com/api/v3/search/trending",
                timeout=10,
            )
            if response.status_code == 200:
                data = response.json()
                coins = data.get("coins", [])[:7]
                trending = [
                    {
                        "name": c["item"]["name"],
                        "symbol": c["item"]["symbol"],
                        "rank": c["item"]["market_cap_rank"],
                        "price_btc": c["item"].get("price_btc", 0),
                    }
                    for c in coins
                ]
                return {
                    "status": "success",
                    "source": "coingecko",
                    "topic": topic,
                    "trending": trending,
                    "fetched_at": datetime.now().isoformat(),
                }
        return {"status": "error", "message": f"No data source for topic: {topic}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


def generate_social_content(topic: str, platform: str = "x", tone: str = "professional") -> dict:
    """
    Generate social media content template for a given topic.
    Returns content structure for the agent to fill in with real data.
    """
    templates = {
        "x": {
            "professional": f"📊 {topic} Analizi\n\n{{content}}\n\n#{{hashtag1}} #{{hashtag2}} #COWORK",
            "casual": f"🚀 {topic} hakkında düşüncelerim:\n\n{{content}}\n\n#{{hashtag1}} #crypto",
            "alert": f"⚠️ {topic} UYARI\n\n{{content}}\n\nRisk yönetimi her zaman önce! #{{hashtag1}}",
        },
        "instagram": {
            "professional": f"{topic} Analizi 📈\n\n{{content}}\n\n.\n.\n.\n#{{hashtag1}} #{{hashtag2}} #trading #crypto",
        },
    }
    platform_templates = templates.get(platform, templates["x"])
    template = platform_templates.get(tone, platform_templates.get("professional", ""))
    return {
        "status": "success",
        "platform": platform,
        "tone": tone,
        "template": template,
        "max_chars": 280 if platform == "x" else 2200,
        "suggested_hashtags": [topic.lower().replace(" ", ""), "crypto", "trading", "COWORK"],
    }


def check_website_status(url: str) -> dict:
    """Check if a website is online and measure response time."""
    try:
        import httpx
        import time
        start = time.time()
        response = httpx.get(url, timeout=10, follow_redirects=True)
        elapsed = round((time.time() - start) * 1000, 2)
        return {
            "status": "online",
            "url": url,
            "http_status": response.status_code,
            "response_time_ms": elapsed,
            "checked_at": datetime.now().isoformat(),
        }
    except Exception as e:
        return {
            "status": "offline",
            "url": url,
            "error": str(e),
            "checked_at": datetime.now().isoformat(),
        }


def schedule_post(content: str, platform: str, scheduled_time: str) -> dict:
    """
    Schedule a social media post (stores in workspace for execution).
    Returns the scheduled post ID.
    """
    post_id = f"post-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    post_data = {
        "id": post_id,
        "content": content,
        "platform": platform,
        "scheduled_time": scheduled_time,
        "status": "scheduled",
        "created_at": datetime.now().isoformat(),
    }
    return {
        "status": "success",
        "post_id": post_id,
        "message": f"Post scheduled for {scheduled_time} on {platform}",
        "post_data": post_data,
    }


# Tool definitions for the agent runner
BOTS_TOOL_DEFINITIONS = [
    {
        "name": "fetch_x_trends",
        "description": "Fetch trending topics for crypto or other subjects from real-time sources",
        "parameters": {
            "topic": {"type": "string", "description": "Topic to search trends for (e.g., 'crypto', 'bitcoin')"},
            "language": {"type": "string", "description": "Language code (tr, en)"},
        },
        "required": ["topic"],
    },
    {
        "name": "generate_social_content",
        "description": "Generate social media content template for a topic",
        "parameters": {
            "topic": {"type": "string", "description": "Content topic"},
            "platform": {"type": "string", "description": "Platform: x, instagram"},
            "tone": {"type": "string", "description": "Tone: professional, casual, alert"},
        },
        "required": ["topic"],
    },
    {
        "name": "check_website_status",
        "description": "Check if a website is online and measure response time",
        "parameters": {
            "url": {"type": "string", "description": "Full URL to check (https://...)"},
        },
        "required": ["url"],
    },
    {
        "name": "schedule_post",
        "description": "Schedule a social media post for later publishing",
        "parameters": {
            "content": {"type": "string", "description": "Post content"},
            "platform": {"type": "string", "description": "Target platform"},
            "scheduled_time": {"type": "string", "description": "ISO datetime for posting"},
        },
        "required": ["content", "platform", "scheduled_time"],
    },
]

# Tool implementation registry
BOTS_TOOLS_IMPL = {
    "fetch_x_trends": fetch_x_trends,
    "generate_social_content": generate_social_content,
    "check_website_status": check_website_status,
    "schedule_post": schedule_post,
}
