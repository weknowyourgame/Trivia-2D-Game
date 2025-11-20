import Phaser from "phaser";
import Player, { CharacterType } from "./Player";

export default class GameScene extends Phaser.Scene {
  private player: Player | null = null;
  private map: Phaser.Tilemaps.Tilemap | null = null;
  private layer: Phaser.Tilemaps.TilemapLayer | null = null;
  private dashTrailGraphics: Phaser.GameObjects.Graphics | null = null;
  private selectedCharacter: CharacterType = "ninja";

  constructor() {
    super({ key: "GameScene" });
  }
  
  init(data: { character?: CharacterType }) {
    this.selectedCharacter = data.character || "ninja";
  }

  preload(): void {
    // Load tilemap and tilesets
    this.load.tilemapTiledJSON("tilemap", "/assets/tilemap.json");
    this.load.image("Tileset_Dungeon", "/assets/Tileset_Dungeon.png");
    this.load.image("Door", "/assets/Door.png");

    // Load tiles spritesheet from bounce-back (128x80, 8x5 tiles of 16x16 each)
    this.load.spritesheet("tiles", "/assets/tiles.png", {
      frameWidth: 16,
      frameHeight: 16,
    });
    
    // Load monkey spritesheet (64x128: 4 frames x 8 directions)
    this.load.spritesheet("player", "/assets/player.png", {
      frameWidth: 16,
      frameHeight: 16,
    });

    // Remove green screen from monkey sprite after loading
    this.load.on("filecomplete-spritesheet-player", () => {
      const texture = this.textures.get("player");
      const source = texture.getSourceImage();

      const canvas = document.createElement("canvas");
      canvas.width = (source as HTMLImageElement).width;
      canvas.height = (source as HTMLImageElement).height;
      const ctx = canvas.getContext("2d");

      if (!ctx) return;

      ctx.drawImage(source as HTMLImageElement, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Remove green pixels - make them transparent
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        if (g > 100 && g > r * 1.5 && g > b * 1.5) {
          data[i + 3] = 0;
        }
      }

      ctx.putImageData(imageData, 0, 0);

      // Update texture with processed canvas
      this.textures.remove("player");
      this.textures.addSpriteSheet("player", canvas as any, {
        frameWidth: 16,
        frameHeight: 16,
      });
    });
  }
  create(): void {
    // Set black background
    this.cameras.main.setBackgroundColor("#000000");

    // Create tilemap
    this.map = this.make.tilemap({ key: "tilemap" });

    // Add tilesets
    const dungeonTileset = this.map.addTilesetImage(
      "Tileset_Dungeon",
      "Tileset_Dungeon"
    );
    const doorTileset = this.map.addTilesetImage("Door", "Door");

    // Create layer with both tilesets
    if (dungeonTileset && doorTileset) {
      this.layer = this.map.createLayer(
        "Tile Layer 1",
        [dungeonTileset, doorTileset],
        0,
        0
      );

      if (this.layer) {
        this.layer.setScale(4); // Scale up for pixel art

        // Set collision for tiles with col property
        this.layer.setCollisionByProperty({ col: true });
      }
    }

    // Set world bounds based on tilemap size (30x30 tiles at 16px each, scaled 4x)
    const worldWidth = 30 * 16 * 4;
    const worldHeight = 30 * 16 * 4;
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);

    // Create graphics for dash trail
    this.dashTrailGraphics = this.add.graphics();
    this.dashTrailGraphics.setDepth(-1);

    // Create player with selected character
    this.player = new Player(this, worldWidth / 2, worldHeight / 2, this.selectedCharacter);

    // Camera follows player and is constrained to world bounds
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.startFollow(this.player.getSprite(), true, 0.1, 0.1);

    // Enable collision between player and tilemap layer
    if (this.layer) {
      this.physics.add.collider(this.player.getSprite(), this.layer);
    }
  }

  update(time: number, delta: number): void {
    if (!this.player) return;

    // Update player with new character system
    this.player.update(time, delta);

    // Render dash trail
    if (this.dashTrailGraphics) {
      this.player.render(this.dashTrailGraphics);
    }
  }
}
