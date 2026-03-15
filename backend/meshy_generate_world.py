#!/usr/bin/env python3
"""
COWORK.ARMY — Meshy.ai Batch GLB Generator for /world page
Generates UNIQUE 3D models for all 17 agents + 5 department offices + CEO tower.

Output: ../frontend/public/models/{id}.glb

Usage:
    MESHY_API_KEY=xxx python meshy_generate_world.py
    # or specific category:
    MESHY_API_KEY=xxx python meshy_generate_world.py agents
    MESHY_API_KEY=xxx python meshy_generate_world.py offices
"""
import os, sys, time, json, requests
from pathlib import Path

MESHY_API = "https://api.meshy.ai/v2"
OUT_DIR = Path(__file__).parent.parent / "frontend" / "public" / "models"

# ═══════════════════════════════════════════════════════════════════════════════
# AGENT MASCOTS — Her agent'a ozel, benzersiz 3D karakter
# ═══════════════════════════════════════════════════════════════════════════════

AGENT_PROMPTS = {
    # ── CEO ──
    "ceo": (
        "A powerful golden robot commander standing tall on a throne pedestal, "
        "glowing gold crown on head, holographic screens floating around, "
        "wearing a regal futuristic suit with gold trim, commanding pose, "
        "cyberpunk style, low-poly game character"
    ),

    # ── TRADE DEPARTMENT ──
    "school-game": (
        "A young teacher robot character holding a glowing book and graduation cap, "
        "green accent lights, chalkboard hologram floating behind, "
        "friendly educational pose, low-poly game style character"
    ),
    "indicator": (
        "A sleek analyst robot with multiple eye-lenses scanning holographic candlestick charts, "
        "green neon glow, data streams flowing around body, "
        "futuristic trader visor on head, low-poly game character"
    ),
    "algo-bot": (
        "A mechanical robot engineer with visible gears and circuits, "
        "writing code on a floating holographic terminal, green LED eyes, "
        "robotic arms with tools, industrial low-poly game character"
    ),

    # ── MEDICAL DEPARTMENT ──
    "clinic": (
        "A friendly medical robot doctor wearing white lab coat with cyan glow, "
        "stethoscope around neck, holding a glowing medical tablet, "
        "medical cross emblem on chest, clean futuristic low-poly character"
    ),
    "health-tourism": (
        "A travel-medical hybrid robot with airplane wings and medical briefcase, "
        "cyan and white color scheme, globe hologram floating nearby, "
        "wearing a travel vest with medical patches, low-poly game character"
    ),
    "manufacturing": (
        "A factory inspector robot with industrial goggles and clipboard, "
        "mechanical arms with precision tools, cyan safety vest, "
        "factory gear symbols on shoulders, sturdy low-poly game character"
    ),

    # ── HOTEL DEPARTMENT ──
    "hotel": (
        "An elegant hotel manager robot with golden bellhop hat and key card, "
        "wearing a formal orange-gold suit, holding a room service tray, "
        "warm amber glow, hospitality pose, low-poly game character"
    ),
    "flight": (
        "A pilot robot with aviator sunglasses and pilot cap with wings badge, "
        "orange flight jacket, holding a boarding pass hologram, "
        "jet engine boosters on back, dynamic low-poly game character"
    ),
    "rental": (
        "A car rental agent robot holding car keys with a small hover-car beside it, "
        "orange-gold uniform with name badge, friendly welcoming pose, "
        "digital car catalog floating nearby, low-poly game character"
    ),

    # ── SOFTWARE DEPARTMENT ──
    "fullstack": (
        "A hacker-style programmer robot with multiple floating code screens, "
        "purple neon hoodie with circuit patterns, mechanical keyboard hands, "
        "matrix-style data rain around, cyberpunk low-poly game character"
    ),
    "app-builder": (
        "A creative developer robot holding a glowing smartphone and paintbrush, "
        "purple beret hat, pixel art pattern on chest, "
        "app icons floating around like bubbles, artistic low-poly game character"
    ),
    "prompt-engineer": (
        "A brainy AI scientist robot with oversized glowing brain dome head, "
        "purple lab coat, neural network patterns visible on skin, "
        "floating thought bubbles with AI symbols, low-poly game character"
    ),

    # ── BOTS & AUTOMATION DEPARTMENT ──
    "social-media-manager": (
        "A trendy social media robot with phone-shaped head screen, "
        "red-pink neon outfit, hashtag and like symbols floating around, "
        "megaphone in one hand, selfie stick in other, low-poly game character"
    ),
    "u2algo-manager": (
        "A commanding platform director robot with radar antenna on head, "
        "red power suit with data dashboard on chest, larger than other bots, "
        "multiple drone arms controlling screens, low-poly game character"
    ),
    "data-pipeline": (
        "A data processing robot with pipe-shaped arms and tube body channels, "
        "red-orange glow, data packets flowing through transparent tubes, "
        "ETL symbols and database icons on body, low-poly game character"
    ),

    # ── CARGO ──
    "cargo": (
        "A delivery drone-robot hybrid with propeller blades and cargo bay, "
        "pink-magenta glow, carrying a glowing package, "
        "fast and aerodynamic design with speed lines, low-poly game character"
    ),
}

# ═══════════════════════════════════════════════════════════════════════════════
# OFFICE BUILDINGS — Her departman icin ozel ofis binasi
# ═══════════════════════════════════════════════════════════════════════════════

OFFICE_PROMPTS = {
    "office_trade": (
        "A futuristic stock trading floor building with glass walls, "
        "green neon accent lights, multiple holographic chart screens on walls, "
        "open floor plan with 4 trading desks, candlestick chart decorations, "
        "cyberpunk financial building, low-poly game asset, isometric view"
    ),
    "office_medical": (
        "A modern medical clinic building with clean white and cyan design, "
        "glass walls with medical cross logos, examination rooms visible inside, "
        "3 workstations with medical equipment, DNA helix decoration on top, "
        "futuristic hospital, low-poly game asset, isometric view"
    ),
    "office_hotel": (
        "A luxury boutique hotel lobby building with warm amber-gold lighting, "
        "reception desk with bell, luggage area, concierge station, "
        "elegant interior with 3 service desks, palm tree decoration, "
        "hospitality building, low-poly game asset, isometric view"
    ),
    "office_software": (
        "A tech startup office building with purple neon accents, "
        "open workspace with 3 programmer desks and floating monitors, "
        "server rack in corner, whiteboard with code diagrams, "
        "silicon valley startup, low-poly game asset, isometric view"
    ),
    "office_bots": (
        "An automation command center building with red-pink neon lights, "
        "drone launch pads on roof, monitoring screens on walls, "
        "3 control stations with robotic arms, antenna array on top, "
        "AI research lab, low-poly game asset, isometric view"
    ),
    "office_ceo": (
        "A tall golden command tower with crown-shaped top, "
        "holographic displays floating around the spire, "
        "luxurious penthouse office visible through glass at top floor, "
        "gold and dark blue color scheme, throne room inside, "
        "futuristic CEO headquarters, low-poly game asset, isometric view"
    ),
}

# ═══════════════════════════════════════════════════════════════════════════════

def generate(api_key: str, item_id: str, prompt: str) -> str | None:
    """Submit text-to-3D task and return task ID."""
    resp = requests.post(
        f"{MESHY_API}/text-to-3d",
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json={
            "mode": "preview",
            "prompt": prompt,
            "art_style": "realistic",
            "negative_prompt": "ugly, blurry, low quality, deformed, text, watermark",
        },
    )
    if resp.status_code not in (200, 202):
        print(f"  ERROR submitting {item_id}: {resp.status_code} {resp.text[:200]}")
        return None
    data = resp.json()
    task_id = data.get("result") or data.get("id")
    print(f"  Submitted {item_id} -> task {task_id}")
    return task_id


def poll_and_download(api_key: str, task_id: str, item_id: str) -> bool:
    """Poll until done, then download GLB."""
    for attempt in range(180):  # Max 15 min
        try:
            resp = requests.get(
                f"{MESHY_API}/text-to-3d/{task_id}",
                headers={"Authorization": f"Bearer {api_key}"},
            )
            data = resp.json()
        except Exception as e:
            print(f"  Poll error {item_id}: {e}")
            time.sleep(5)
            continue

        status = data.get("status", "UNKNOWN")
        progress = data.get("progress", 0)

        if status == "SUCCEEDED":
            glb_url = data.get("model_urls", {}).get("glb")
            if not glb_url:
                print(f"  WARNING: No GLB URL for {item_id}")
                return False
            glb_resp = requests.get(glb_url)
            out_path = OUT_DIR / f"{item_id}.glb"
            out_path.write_bytes(glb_resp.content)
            size_mb = len(glb_resp.content) / (1024 * 1024)
            print(f"  OK {item_id}.glb ({size_mb:.1f} MB)")
            return True
        elif status in ("FAILED", "EXPIRED"):
            print(f"  FAILED: {item_id} — {status}: {data.get('message', '')}")
            return False

        if attempt % 6 == 0:  # Print every 30 seconds
            print(f"  Polling {item_id}: {status} ({progress}%)")
        time.sleep(5)

    print(f"  TIMEOUT: {item_id}")
    return False


def run_batch(api_key: str, prompts: dict[str, str], label: str):
    """Submit and poll a batch of prompts."""
    print(f"\n{'='*60}")
    print(f"  {label} — {len(prompts)} models")
    print(f"{'='*60}")

    # Skip already generated
    to_generate = {}
    for item_id, prompt in prompts.items():
        out_file = OUT_DIR / f"{item_id}.glb"
        if out_file.exists():
            size_mb = out_file.stat().st_size / (1024 * 1024)
            print(f"  SKIP {item_id} (already exists, {size_mb:.1f} MB)")
        else:
            to_generate[item_id] = prompt

    if not to_generate:
        print("  All models already exist!")
        return {}

    # Submit all
    tasks: list[tuple[str, str]] = []
    for item_id, prompt in to_generate.items():
        task_id = generate(api_key, item_id, prompt)
        if task_id:
            tasks.append((item_id, task_id))
        time.sleep(1.5)  # Rate limit

    # Poll all
    print(f"\n  Polling {len(tasks)} tasks...")
    results = {}
    for item_id, task_id in tasks:
        ok = poll_and_download(api_key, task_id, item_id)
        results[item_id] = ok

    return results


def main():
    api_key = os.environ.get("MESHY_API_KEY", "")
    if not api_key:
        print("ERROR: Set MESHY_API_KEY environment variable")
        print("Usage: MESHY_API_KEY=xxx python meshy_generate_world.py [agents|offices|all]")
        sys.exit(1)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Output directory: {OUT_DIR}")

    category = sys.argv[1] if len(sys.argv) > 1 else "all"

    all_results = {}

    if category in ("agents", "all"):
        r = run_batch(api_key, AGENT_PROMPTS, "AGENT MASCOTS")
        all_results.update(r)

    if category in ("offices", "all"):
        r = run_batch(api_key, OFFICE_PROMPTS, "OFFICE BUILDINGS")
        all_results.update(r)

    # Summary
    if all_results:
        print(f"\n{'='*60}")
        print(f"  SUMMARY")
        print(f"{'='*60}")
        ok_count = sum(1 for v in all_results.values() if v)
        fail_count = sum(1 for v in all_results.values() if not v)
        for item_id, ok in all_results.items():
            print(f"  {'OK' if ok else 'FAIL'} {item_id}")
        print(f"\n  Total: {ok_count} OK, {fail_count} FAILED")
    else:
        print("\nNothing to generate.")


if __name__ == "__main__":
    main()
