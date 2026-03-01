#!/usr/bin/env python3
"""
COWORK.ARMY — Meshy.ai Batch GLB Generator (offline script)
Generates 3D models for all 14 base agents using Meshy.ai text-to-3D API.
Output: frontend/public/models/{agent_id}.glb

Usage:
    MESHY_API_KEY=xxx python meshy_generate.py
"""
import os, sys, time, json, requests
from pathlib import Path

MESHY_API = "https://api.meshy.ai/v2"
OUT_DIR = Path(__file__).parent / "frontend" / "public" / "models"

AGENT_PROMPTS = {
    "cargo": "A small cute robot delivery character carrying a cardboard package, low-poly game style",
    "trade-master": "A business executive robot with golden suit and holographic trading screens, low-poly",
    "chart-eye": "A robot with a large eye-visor displaying candlestick charts, amber glow, low-poly",
    "risk-guard": "An armored sentinel robot with a glowing red shield, defensive stance, low-poly",
    "quant-brain": "A brainy robot with exposed circuit brain and purple glow, scientist style, low-poly",
    "clinic-director": "A medical director robot with white coat and stethoscope, cyan accent, low-poly",
    "patient-care": "A nurse robot with medical cross symbol and caring posture, cyan glow, low-poly",
    "hotel-manager": "A hotel manager robot with bellhop hat and key card, pink accent, low-poly",
    "travel-planner": "A travel agent robot with airplane wings and globe, pink glow, low-poly",
    "concierge": "A concierge robot with bell and luggage trolley, pink accent, low-poly",
    "tech-lead": "A programmer robot with multiple floating code screens, purple glow, low-poly",
    "full-stack": "A developer robot with lightning bolt symbol and laptop, purple accent, low-poly",
    "data-ops": "A data analyst robot with holographic charts and graphs floating around, purple glow, low-poly",
}


def generate(api_key: str, agent_id: str, prompt: str) -> str | None:
    """Submit text-to-3D task and return task ID."""
    resp = requests.post(
        f"{MESHY_API}/text-to-3d",
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json={"mode": "preview", "prompt": prompt, "art_style": "realistic"},
    )
    if resp.status_code != 200:
        print(f"  ERROR submitting {agent_id}: {resp.status_code} {resp.text}")
        return None
    task_id = resp.json().get("result")
    print(f"  Submitted {agent_id} → task {task_id}")
    return task_id


def poll_and_download(api_key: str, task_id: str, agent_id: str) -> bool:
    """Poll until done, then download GLB."""
    for _ in range(120):
        resp = requests.get(
            f"{MESHY_API}/text-to-3d/{task_id}",
            headers={"Authorization": f"Bearer {api_key}"},
        )
        data = resp.json()
        status = data.get("status", "UNKNOWN")
        progress = data.get("progress", 0)

        if status == "SUCCEEDED":
            glb_url = data.get("model_urls", {}).get("glb")
            if not glb_url:
                print(f"  WARNING: No GLB URL for {agent_id}")
                return False
            glb_resp = requests.get(glb_url)
            out_path = OUT_DIR / f"{agent_id}.glb"
            out_path.write_bytes(glb_resp.content)
            print(f"  Downloaded {agent_id}.glb ({len(glb_resp.content)} bytes)")
            return True
        elif status in ("FAILED", "EXPIRED"):
            print(f"  FAILED: {agent_id} — {status}")
            return False

        print(f"  Polling {agent_id}: {status} ({progress}%)")
        time.sleep(5)

    print(f"  TIMEOUT: {agent_id}")
    return False


def main():
    api_key = os.environ.get("MESHY_API_KEY", "")
    if not api_key:
        print("ERROR: Set MESHY_API_KEY environment variable")
        sys.exit(1)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Output: {OUT_DIR}\n")

    tasks: list[tuple[str, str]] = []

    # Submit all
    for agent_id, prompt in AGENT_PROMPTS.items():
        out_file = OUT_DIR / f"{agent_id}.glb"
        if out_file.exists():
            print(f"  SKIP {agent_id} (already exists)")
            continue
        task_id = generate(api_key, agent_id, prompt)
        if task_id:
            tasks.append((agent_id, task_id))
        time.sleep(1)  # Rate limit

    # Poll all
    print(f"\nPolling {len(tasks)} tasks...")
    results = {}
    for agent_id, task_id in tasks:
        ok = poll_and_download(api_key, task_id, agent_id)
        results[agent_id] = ok

    # Summary
    print("\n=== SUMMARY ===")
    for agent_id, ok in results.items():
        print(f"  {agent_id}: {'OK' if ok else 'FAILED'}")


if __name__ == "__main__":
    main()
