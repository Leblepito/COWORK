# agents

**Agent Modulleri ve Sablonlari** — COWORK.ARMY agentlarinin ozellestirilmis uygulama dosyalari.

## Dosya Yapisi

```
agents/
├── phaser_game_developer_agent.py    → Game BuDev agent motoru
└── phaser_templates/
    └── basic_game.html               → Hazir platformer oyun sablonu
```

## phaser_game_developer_agent.py

`GameBuDevAgent` sinifi — Phaser.js 3.70 tabanli HTML5 oyun uretim motoru.

### Desteklenen Oyun Turleri

| Tur | Aciklama | Ozellikler |
|-----|----------|-----------|
| `platformer` | Yan kaydirmali platform | Yercekimi, ziplama, dusmanlar, collectible, checkpoint |
| `arcade` | Hizli tempolu aksiyon | Yuksek skor, power-up, particle efekt, combo |
| `puzzle` | Bulmaca / mantik | Drag & drop, 50+ seviye, ipucu, undo/redo |
| `endless_runner` | Sonsuz kosma | Otomatik kosma, engeller, prosedural uretim |
| `shooter` | Uzay / mermi yagmuru | Dalga sistemi, boss'lar, power-up'lar |
| `rpg` | Rol yapma | Tile-map, karakter stat'lari, envanter, NPC, gorevler |

### Temel Metodlar

| Metod | Aciklama |
|-------|----------|
| `generate_game_html(game_type, title, options)` | Tek dosya HTML oyun uret |
| `get_best_practices()` | 13 Phaser gelistirme kurali |
| `get_asset_guide()` | Sprite, audio, font, particle spesifikasyonlari |
| `list_game_types()` | Tum oyun turleri ve ozellik listesi |
| `get_scene_architecture()` | Sahne akisi: Boot → Preload → Menu → Game → Pause → GameOver |

### SVG Sprite Uretimi

Oyunlar prosedural SVG sprite'lar kullanir (harici asset gerektirmez):

- `svg_rect()` — Dikdortgen sprite
- `svg_circle()` — Daire sprite
- `svg_character()` — Karakter sprite
- `svg_star()` — Yildiz sprite

### Kullanim

```python
from phaser_game_developer_agent import game_budev

# Platformer oyun HTML'i uret
html = game_budev.generate_game_html(
    game_type="platformer",
    title="Uzay Macerasi"
)

# Oyun turlerini listele
types = game_budev.list_game_types()
```

### Cikti

Tek dosya, self-contained HTML:
- Phaser 3.70 CDN'den yuklenir
- Tum asset'ler inline SVG
- Mobil uyumlu (responsive)
- Dogrudan tarayicida calisir

## phaser_templates/

### basic_game.html

Hazir, calisir durumda platformer oyun sablonu.

**Ozellikler:**
- Platform tabanli seviye tasarimi
- Oyuncu fiziği (bounce, carpisma)
- Dusman spawn sistemi (5 saniyede bir)
- Coin toplama ve puan sistemi
- UI paneli: Skor, Seviye, Can, Zamanlayici
- Kontroller: WASD / Ok tuslari + mouse
- Game Over ekrani (R ile yeniden basla)
- Particle efektleri
- Seviye atlama (her 100 puan)
- Mobil responsive tasarim

**Teknik:**
- Phaser 3.70.0 (CDN)
- Arcade Physics
- Prosedural sprite uretimi
- FIT olcekleme modu
