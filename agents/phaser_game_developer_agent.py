"""
Phaser.js Oyun Geliştirici Agent'ı
Web tabanlı oyunlar geliştirmeye odaklanmış uzman agent
"""

class PhaserGameDeveloperAgent:
    def __init__(self):
        self.name = "Phaser Oyun Geliştirici"
        self.description = "Phaser.js ile web tabanlı oyunlar geliştirir"
        self.capabilities = [
            "Phaser.js 2D oyun geliştirme",
            "HTML5 Canvas oyunları",
            "Physics motorları (Arcade, Matter.js)",
            "Sprite animasyonları",
            "Ses ve müzik entegrasyonu",
            "Oyun mekanikleri tasarımı",
            "Mobile-responsive oyunlar",
            "WebGL ve Canvas renderer",
            "Tween animasyonları",
            "Particle sistemleri"
        ]
        
    def create_basic_game_template(self):
        """Temel Phaser.js oyun şablonu oluşturur"""
        return {
            "html": self._get_html_template(),
            "js": self._get_js_template(),
            "css": self._get_css_template()
        }
    
    def _get_html_template(self):
        return """<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Phaser Oyunu</title>
    <script src="https://cdn.jsdelivr.net/npm/phaser@3.70.0/dist/phaser.min.js"></script>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div id="game-container">
        <div id="ui-overlay">
            <div id="score">Skor: 0</div>
            <div id="level">Seviye: 1</div>
        </div>
    </div>
    <script src="game.js"></script>
</body>
</html>"""
    
    def _get_css_template(self):
        return """/* Phaser Oyun Stilleri */
body {
    margin: 0;
    padding: 0;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    font-family: 'Arial', sans-serif;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
}

#game-container {
    position: relative;
    border: 3px solid #2c3e50;
    border-radius: 10px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
}

#ui-overlay {
    position: absolute;
    top: 10px;
    left: 10px;
    z-index: 1000;
    color: white;
    font-weight: bold;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
}

#score, #level {
    background: rgba(0,0,0,0.5);
    padding: 5px 15px;
    border-radius: 20px;
    margin-bottom: 5px;
    font-size: 16px;
}

canvas {
    display: block;
    border-radius: 7px;
}

/* Mobile responsive */
@media (max-width: 768px) {
    #game-container {
        width: 95vw !important;
        height: auto !important;
    }
    
    #ui-overlay {
        font-size: 14px;
    }
}"""
    
    def _get_js_template(self):
        return """// Phaser.js Oyun Konfigürasyonu
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.score = 0;
        this.level = 1;
    }
    
    preload() {
        // Görseller için basit renkli kareler oluştur
        this.load.image('background', 'data:image/svg+xml,' + encodeURIComponent(this.createColorRect('#4a90e2', 800, 600)));
        this.load.image('player', 'data:image/svg+xml,' + encodeURIComponent(this.createColorRect('#e74c3c', 50, 50)));
        this.load.image('enemy', 'data:image/svg+xml,' + encodeURIComponent(this.createColorRect('#f39c12', 40, 40)));
        this.load.image('collectible', 'data:image/svg+xml,' + encodeURIComponent(this.createColorRect('#2ecc71', 30, 30)));
    }
    
    create() {
        // Arka plan
        this.add.image(400, 300, 'background');
        
        // Oyuncu
        this.player = this.physics.add.sprite(400, 500, 'player');
        this.player.setCollideWorldBounds(true);
        this.player.setBounce(0.2);
        
        // Düşmanlar grubu
        this.enemies = this.physics.add.group();
        
        // Toplanabilir öğeler
        this.collectibles = this.physics.add.group();
        
        // Kontroller
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys('W,S,A,D');
        
        // Çarpışma kontrolü
        this.physics.add.overlap(this.player, this.collectibles, this.collectItem, null, this);
        this.physics.add.overlap(this.player, this.enemies, this.hitEnemy, null, this);
        
        // Zamanlayıcılar
        this.time.addEvent({
            delay: 2000,
            callback: this.spawnEnemy,
            callbackScope: this,
            loop: true
        });
        
        this.time.addEvent({
            delay: 3000,
            callback: this.spawnCollectible,
            callbackScope: this,
            loop: true
        });
        
        // Puan metni
        this.scoreText = this.add.text(16, 16, 'Skor: 0', {
            fontSize: '32px',
            fill: '#000',
            fontWeight: 'bold'
        });
    }
    
    update() {
        // Oyuncu hareketi
        if (this.cursors.left.isDown || this.wasd.A.isDown) {
            this.player.setVelocityX(-300);
        }
        else if (this.cursors.right.isDown || this.wasd.D.isDown) {
            this.player.setVelocityX(300);
        }
        else {
            this.player.setVelocityX(0);
        }
        
        if ((this.cursors.up.isDown || this.wasd.W.isDown) && this.player.body.touching.down) {
            this.player.setVelocityY(-500);
        }
    }
    
    spawnEnemy() {
        const x = Phaser.Math.Between(50, 750);
        const enemy = this.enemies.create(x, 0, 'enemy');
        enemy.setVelocity(Phaser.Math.Between(-200, 200), Phaser.Math.Between(100, 300));
        enemy.setBounce(1);
        enemy.setCollideWorldBounds(true);
    }
    
    spawnCollectible() {
        const x = Phaser.Math.Between(50, 750);
        const collectible = this.collectibles.create(x, 0, 'collectible');
        collectible.setVelocity(0, 150);
    }
    
    collectItem(player, collectible) {
        collectible.destroy();
        this.score += 10;
        this.updateScore();
        
        // Seviye artırma
        if (this.score % 100 === 0) {
            this.level++;
            this.updateLevel();
        }
    }
    
    hitEnemy(player, enemy) {
        // Oyun sonu efekti
        this.physics.pause();
        player.setTint(0xff0000);
        
        // Oyunu yeniden başlat
        this.time.delayedCall(1000, () => {
            this.scene.restart();
        });
    }
    
    updateScore() {
        this.scoreText.setText('Skor: ' + this.score);
        document.getElementById('score').textContent = 'Skor: ' + this.score;
    }
    
    updateLevel() {
        document.getElementById('level').textContent = 'Seviye: ' + this.level;
    }
    
    createColorRect(color, width, height) {
        return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
                  <rect width="100%" height="100%" fill="${color}" rx="5"/>
                </svg>`;
    }
}

// Oyun konfigürasyonu
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 500 },
            debug: false
        }
    },
    scene: GameScene,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        max: {
            width: 800,
            height: 600
        }
    }
};

// Oyunu başlat
const game = new Phaser.Game(config);"""

    def create_platformer_game(self, game_name="Platform Oyunu"):
        """Platform oyunu oluşturur"""
        return {
            "name": game_name,
            "type": "platformer",
            "features": [
                "Zıplama mekanikleri",
                "Platform çarpışmaları", 
                "Düşman AI'ı",
                "Toplanabilir öğeler",
                "Seviye sistemi"
            ]
        }
    
    def create_puzzle_game(self, game_name="Puzzle Oyunu"):
        """Puzzle oyunu oluşturur"""
        return {
            "name": game_name,
            "type": "puzzle",
            "features": [
                "Drag & Drop mekanikleri",
                "Mantık bulmacaları",
                "Skor sistemi",
                "Zaman sınırı",
                "Seviye ilerlemesi"
            ]
        }
    
    def create_arcade_game(self, game_name="Arcade Oyunu"):
        """Arcade tarzı oyun oluşturur"""
        return {
            "name": game_name,
            "type": "arcade",
            "features": [
                "Hızlı tempolu oynanış",
                "High-score sistemi",
                "Power-up'lar",
                "Particle efektleri",
                "Ses efektleri"
            ]
        }
    
    def get_phaser_best_practices(self):
        """Phaser.js en iyi uygulamalar"""
        return [
            "Scene-based architecture kullan",
            "Sprite atlasları ve texture packing",
            "Object pooling ile performans optimizasyonu",
            "Mobile-first responsive tasarım",
            "Preloader scene'i ekle",
            "Physics body'leri optimize et",
            "Tween animasyonları tercih et",
            "Group'ları collision detection için kullan",
            "Audio sprite'ları ses yönetimi için",
            "Game state management pattern'i"
        ]
    
    def generate_game_assets_guide(self):
        """Oyun varlıkları rehberi"""
        return {
            "sprites": {
                "boyut": "32x32, 64x64 piksel standartları",
                "format": "PNG (şeffaflık için)",
                "atlas": "Texture atlas kullanımı önerilir"
            },
            "audio": {
                "format": "OGG, MP3, WAV",
                "boyut": "Küçük dosya boyutları (mobil için)",
                "loop": "Müzikler için seamless loop"
            },
            "fonts": {
                "web_fonts": "Google Fonts entegrasyonu",
                "bitmap_fonts": "Pixel-perfect oyunlar için"
            }
        }

# Agent instance oluştur
phaser_agent = PhaserGameDeveloperAgent()

if __name__ == "__main__":
    print(f"✨ {phaser_agent.name} hazır!")
    print("Yetenekler:")
    for capability in phaser_agent.capabilities:
        print(f"  • {capability}")