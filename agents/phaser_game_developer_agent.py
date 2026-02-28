"""
Game BuDev — Phaser.js Oyun Gelistirici Agent
COWORK.ARMY base agent olarak registry.py'de tanimli (id: game-dev).
Bu dosya agent'in oyun sablonlarini ve uretim yeteneklerini icerir.

Desteklenen oyun turleri:
  - Platformer (side-scrolling, gravity-based)
  - Arcade (fast-paced, score-attack)
  - Puzzle (drag & drop, logic)
  - Endless Runner (auto-run, obstacle dodge)
  - Shooter (space invaders, bullet-hell)
  - RPG (inventory, quests, dialogue)
"""

from __future__ import annotations

PHASER_CDN = "https://cdn.jsdelivr.net/npm/phaser@3.70.0/dist/phaser.min.js"

# ── Oyun turleri ve mekanik tanimlari ─────────────────────

GAME_TYPES: dict[str, dict] = {
    "platformer": {
        "name": "Platform Oyunu",
        "physics": "arcade",
        "gravity": 600,
        "features": [
            "Ziplama mekanikleri (double jump destegi)",
            "Platform carpismalari (one-way platform)",
            "Dusman AI (patrol, chase, ranged)",
            "Toplanabilir ogeler (coin, gem, star)",
            "Seviye sistemi (map-based veya procedural)",
            "Checkpoint sistemi",
            "Duvar kayma / wall-jump",
        ],
        "controls": {"move": "WASD/Arrow", "jump": "W/Up/Space", "action": "E/Enter"},
    },
    "arcade": {
        "name": "Arcade Oyunu",
        "physics": "arcade",
        "gravity": 0,
        "features": [
            "Hizli tempolu oynanis",
            "High-score sistemi (localStorage)",
            "Power-up'lar (shield, magnet, 2x score)",
            "Particle efektleri (explosion, trail)",
            "Combo sistemi",
            "Difficulty scaling (time-based)",
        ],
        "controls": {"move": "WASD/Arrow/Mouse", "action": "Space/Click"},
    },
    "puzzle": {
        "name": "Puzzle / Bulmaca Oyunu",
        "physics": None,
        "gravity": 0,
        "features": [
            "Drag & Drop mekanikleri",
            "Mantik bulmacalari",
            "Skor sistemi (move count, time bonus)",
            "Zaman siniri (opsiyonel)",
            "Seviye ilerlemesi (50+ level destegi)",
            "Hint sistemi",
            "Undo/Redo",
        ],
        "controls": {"move": "Mouse/Touch", "action": "Click/Drag"},
    },
    "endless_runner": {
        "name": "Endless Runner",
        "physics": "arcade",
        "gravity": 800,
        "features": [
            "Otomatik kosu (saga dogru)",
            "Engel atlama / kayma",
            "Mesafe bazli skor",
            "Hiz artisi (time-based)",
            "Procedural engel uretimi",
            "Coin toplama",
        ],
        "controls": {"jump": "Space/Up/Tap", "slide": "Down/Swipe"},
    },
    "shooter": {
        "name": "Uzay / Shooter Oyunu",
        "physics": "arcade",
        "gravity": 0,
        "features": [
            "Mermi sistemi (bullet pool)",
            "Dusman dalgalari (wave-based)",
            "Boss savaslar (phase patterns)",
            "Power-up'lar (weapon upgrade, shield)",
            "Patlama efektleri",
            "Score multiplier",
        ],
        "controls": {"move": "WASD/Arrow", "shoot": "Space/Click", "special": "Shift"},
    },
    "rpg": {
        "name": "Mini RPG",
        "physics": "arcade",
        "gravity": 0,
        "features": [
            "Tile-based harita",
            "Karakter istatistikleri (HP, ATK, DEF)",
            "Envanter sistemi",
            "NPC diyalog (text-based)",
            "Quest sistemi",
            "Turn-based veya real-time savas",
        ],
        "controls": {"move": "WASD/Arrow", "interact": "E/Enter", "menu": "Esc/Tab"},
    },
}

# ── Scene mimarisi sablonu ────────────────────────────────

SCENE_ARCHITECTURE = {
    "BootScene": "Font ve config yukle, sonraki scene'e gec",
    "PreloadScene": "Tum asset'leri yukle, progress bar goster",
    "MenuScene": "Ana menu, Play/Settings/Credits butonlari",
    "GameScene": "Ana oyun dongusu, fizik, input, UI",
    "PauseScene": "Pause overlay (resume, restart, quit)",
    "GameOverScene": "Skor gosterimi, restart/menu butonlari",
}


class GameBuDevAgent:
    """Game BuDev — Phaser.js oyun uretim agent'i."""

    def __init__(self):
        self.name = "Game BuDev"
        self.agent_id = "game-dev"
        self.description = "Phaser.js ile web tabanli HTML5 oyunlar uretir"
        self.phaser_version = "3.70.0"
        self.base_resolution = (800, 600)
        self.game_types = GAME_TYPES
        self.scene_architecture = SCENE_ARCHITECTURE

    # ── Template uretimi ─────────────────────────────────

    def generate_game_html(
        self,
        game_type: str = "platformer",
        title: str = "Phaser Oyunu",
        lang: str = "tr",
    ) -> str:
        """Tek dosyalik self-contained Phaser.js oyun HTML'i uret."""
        game_def = self.game_types.get(game_type, self.game_types["platformer"])
        w, h = self.base_resolution

        return f"""<!DOCTYPE html>
<html lang="{lang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <script src="{PHASER_CDN}"></script>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
            font-family: 'Segoe UI', system-ui, sans-serif;
            display: flex; flex-direction: column;
            align-items: center; justify-content: center;
            min-height: 100vh; overflow: hidden;
        }}
        h1 {{
            color: #fff; text-shadow: 0 0 20px rgba(99,102,241,0.8);
            margin-bottom: 16px; font-size: 28px;
        }}
        #game-container {{
            position: relative;
            border: 2px solid rgba(255,255,255,0.15);
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(99,102,241,0.2);
            overflow: hidden;
        }}
        #ui-panel {{
            position: absolute; top: 12px; left: 12px; z-index: 100;
            background: rgba(0,0,0,0.7); backdrop-filter: blur(8px);
            padding: 12px 18px; border-radius: 12px;
            color: #fff; font-size: 14px; font-weight: 600;
            border: 1px solid rgba(255,255,255,0.1);
        }}
        .ui-row {{ margin-bottom: 6px; }}
        .ui-row:last-child {{ margin-bottom: 0; }}
        #controls-info {{
            position: absolute; bottom: 12px; right: 12px; z-index: 100;
            background: rgba(0,0,0,0.6); backdrop-filter: blur(6px);
            padding: 8px 14px; border-radius: 10px;
            color: rgba(255,255,255,0.7); font-size: 11px;
            border: 1px solid rgba(255,255,255,0.08);
        }}
        canvas {{ display: block; border-radius: 14px; }}
        @media (max-width: 768px) {{
            h1 {{ font-size: 20px; }}
            #ui-panel {{ font-size: 12px; padding: 8px 12px; }}
            #controls-info {{ font-size: 9px; }}
        }}
    </style>
</head>
<body>
    <h1>{title}</h1>
    <div id="game-container">
        <div id="ui-panel">
            <div class="ui-row">Skor: <span id="score">0</span></div>
            <div class="ui-row">Seviye: <span id="level">1</span></div>
            <div class="ui-row">Can: <span id="lives">3</span></div>
        </div>
        <div id="controls-info">
            {self._controls_text(game_def["controls"])}
        </div>
    </div>
    <script>
    /* === {game_def["name"]} === */
    /* Phaser {self.phaser_version} | {w}x{h} | {game_def.get("physics","none")} physics */
    // TODO: Agent bu blogu oyun turine gore doldurur
    const config = {{
        type: Phaser.AUTO,
        width: {w}, height: {h},
        parent: 'game-container',
        backgroundColor: '#1a1a2e',
        physics: {{
            default: '{game_def["physics"] or "arcade"}',
            arcade: {{ gravity: {{ y: {game_def["gravity"]} }}, debug: false }}
        }},
        scene: [], // Agent scene class'larini ekler
        scale: {{
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH,
            max: {{ width: {w}, height: {h} }}
        }}
    }};
    const game = new Phaser.Game(config);
    </script>
</body>
</html>"""

    def _controls_text(self, controls: dict) -> str:
        lines = []
        icons = {"move": "MOVE", "jump": "JUMP", "action": "ACT", "shoot": "FIRE",
                 "slide": "SLIDE", "interact": "TALK", "menu": "MENU", "special": "SPEC"}
        for key, value in controls.items():
            label = icons.get(key, key.upper())
            lines.append(f"{label}: {value}")
        return "<br>".join(lines)

    # ── Procedural sprite uretimi ─────────────────────────

    @staticmethod
    def svg_rect(color: str, w: int, h: int, rx: int = 4) -> str:
        return (
            f'<svg width="{w}" height="{h}" xmlns="http://www.w3.org/2000/svg">'
            f'<rect width="100%" height="100%" fill="{color}" rx="{rx}"/>'
            f'</svg>'
        )

    @staticmethod
    def svg_circle(color: str, r: int) -> str:
        d = r * 2
        return (
            f'<svg width="{d}" height="{d}" xmlns="http://www.w3.org/2000/svg">'
            f'<circle cx="{r}" cy="{r}" r="{r}" fill="{color}"/>'
            f'</svg>'
        )

    @staticmethod
    def svg_character(body_color: str, eye_color: str = "#fff", w: int = 48, h: int = 48) -> str:
        return (
            f'<svg width="{w}" height="{h}" xmlns="http://www.w3.org/2000/svg">'
            f'<rect x="4" y="8" width="{w-8}" height="{h-12}" rx="8" fill="{body_color}"/>'
            f'<circle cx="{w//2-6}" cy="20" r="4" fill="{eye_color}"/>'
            f'<circle cx="{w//2+6}" cy="20" r="4" fill="{eye_color}"/>'
            f'<rect x="{w//2-4}" y="28" width="8" height="3" rx="1" fill="{eye_color}" opacity="0.8"/>'
            f'</svg>'
        )

    @staticmethod
    def svg_star(color: str = "#ffd700", size: int = 24) -> str:
        cx, cy = size // 2, size // 2
        return (
            f'<svg width="{size}" height="{size}" xmlns="http://www.w3.org/2000/svg">'
            f'<polygon points="{cx},{cy-10} {cx+3},{cy-3} {cx+10},{cy-3} '
            f'{cx+5},{cy+2} {cx+7},{cy+10} {cx},{cy+5} '
            f'{cx-7},{cy+10} {cx-5},{cy+2} {cx-10},{cy-3} {cx-3},{cy-3}" '
            f'fill="{color}"/></svg>'
        )

    # ── Best practices ────────────────────────────────────

    @staticmethod
    def get_best_practices() -> list[str]:
        return [
            "Scene-based architecture (Boot → Preload → Menu → Game → GameOver)",
            "Sprite atlas / texture packing ile drawcall azalt",
            "Object pooling (mermi, dusman, particle) — create/destroy yapma",
            "Mobile-first responsive: Phaser.Scale.FIT + touch input",
            "Preloader scene ile asset yuklerken progress bar goster",
            "Physics body boyutlarini sprite'tan kucuk tut (hitbox tuning)",
            "Tween animasyonlari tercih et (performans + esneklik)",
            "Group collision ile toplu carpismalar yonet",
            "Audio: Web Audio API, autoplay policy icin user interaction bekle",
            "Game state: Registry veya global data objesi ile scene arasi veri paylas",
            "LocalStorage ile high-score persist et",
            "RequestAnimationFrame otomatik — Phaser bunu yonetir, manuel cagrima",
            "Destroy: scene kapanirken listener ve timer'lari temizle",
            "Mobile touch: virtual joystick plugin veya on-screen buton ekle",
        ]

    # ── Asset rehberi ─────────────────────────────────────

    @staticmethod
    def get_asset_guide() -> dict:
        return {
            "sprites": {
                "boyut": "16x16, 32x32, 48x48, 64x64 piksel (power of 2 onerilir)",
                "format": "PNG (seffaflik), SVG data-URI (prosedural)",
                "atlas": "Texture atlas JSON hash kullan, tek drawcall",
                "olusturma": "Canvas generateTexture() veya SVG inline",
            },
            "audio": {
                "format": "OGG (birincil) + MP3 (fallback)",
                "boyut": "SFX < 100KB, muzik < 500KB",
                "loop": "Muzik icin seamless loop, crossfade destegi",
                "policy": "User interaction sonrasi AudioContext.resume()",
            },
            "fonts": {
                "bitmap": "BitmapFont — pixel-perfect, performansli",
                "web": "Google Fonts ile WebFont yukle (preload'da)",
                "fallback": "System font stack: system-ui, sans-serif",
            },
            "particles": {
                "format": "Phaser.GameObjects.Particles — config-based",
                "performans": "Max 50-100 particle per emitter",
                "kullanim": "Patlama, trail, ambient (rain, snow, sparkle)",
            },
        }

    # ── Oyun katalog bilgisi ──────────────────────────────

    def list_game_types(self) -> dict[str, dict]:
        return {k: {"name": v["name"], "features": v["features"]} for k, v in self.game_types.items()}

    def get_scene_architecture(self) -> dict[str, str]:
        return dict(self.scene_architecture)


# Singleton instance
game_budev = GameBuDevAgent()

if __name__ == "__main__":
    print(f"=== {game_budev.name} (id: {game_budev.agent_id}) ===")
    print(f"Phaser {game_budev.phaser_version} | {game_budev.base_resolution}")
    print(f"\nDesteklenen oyun turleri:")
    for key, info in game_budev.list_game_types().items():
        print(f"  [{key}] {info['name']}")
        for feat in info["features"][:3]:
            print(f"    - {feat}")
    print(f"\nScene mimarisi:")
    for scene, desc in game_budev.get_scene_architecture().items():
        print(f"  {scene}: {desc}")
