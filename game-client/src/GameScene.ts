import Phaser from "phaser";

interface CursorKeys {
  up: Phaser.Input.Keyboard.Key;
  down: Phaser.Input.Keyboard.Key;
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
}

export default class GameScene extends Phaser.Scene {
  private player: Phaser.Physics.Arcade.Sprite | null = null;
  private cursors: CursorKeys | null = null;
  private speed: number = 200;
  private map: Phaser.Tilemaps.Tilemap | null = null;
  private layer: Phaser.Tilemaps.TilemapLayer | null = null;

  constructor() {
    super({ key: "GameScene" });
  }

  preload(): void {
    // Load tilemap and tilesets
    this.load.tilemapTiledJSON("tilemap", "/assets/tilemap.json");
    this.load.image("Tileset_Dungeon", "/assets/Tileset_Dungeon.png");
    this.load.image("Door", "/assets/Door.png");

    // Load player spritesheet (64x128: 4 frames x 8 directions, each 16x16)
    this.load.spritesheet("player", "/assets/player.png", {
      frameWidth: 16,
      frameHeight: 16,
    });

    // Process image to remove green after loading
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

      // Remove green pixels
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

    // Create player sprite with physics at center of the map
    this.player = this.physics.add.sprite(
      worldWidth / 2,
      worldHeight / 2,
      "player"
    );
    this.player.setScale(5);
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
    this.player.setCollideWorldBounds(true);

    // Camera follows player and is constrained to world bounds
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // Enable collision between player and tilemap layer
    if (this.layer) {
      this.physics.add.collider(this.player, this.layer);
    }

    // Create animations for 8 directions
    const directions = [
      { key: "down", frames: [0, 1, 2, 3] },
      { key: "down-left", frames: [4, 5, 6, 7] },
      { key: "left", frames: [8, 9, 10, 11] },
      { key: "up-left", frames: [12, 13, 14, 15] },
      { key: "up", frames: [16, 17, 18, 19] },
      { key: "up-right", frames: [20, 21, 22, 23] },
      { key: "right", frames: [24, 25, 26, 27] },
      { key: "down-right", frames: [28, 29, 30, 31] },
    ];

    directions.forEach((dir) => {
      this.anims.create({
        key: dir.key,
        frames: this.anims.generateFrameNumbers("player", {
          frames: dir.frames,
        }),
        frameRate: 8,
        repeat: -1,
      });
    });

    // Set initial animation
    this.player.play("down");
    this.player.anims.pause();

    // Input keys
    this.cursors = this.input.keyboard?.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    }) as CursorKeys;
  }

  update(_time: number, _delta: number): void {
    if (!this.player || !this.cursors) return;

    let velocityX = 0;
    let velocityY = 0;

    // Get input
    if (this.cursors.left.isDown) velocityX = -1;
    if (this.cursors.right.isDown) velocityX = 1;
    if (this.cursors.up.isDown) velocityY = -1;
    if (this.cursors.down.isDown) velocityY = 1;

    // Normalize diagonal movement
    if (velocityX !== 0 && velocityY !== 0) {
      velocityX *= 0.707;
      velocityY *= 0.707;
    }

    // Set physics velocity
    this.player.setVelocity(velocityX * this.speed, velocityY * this.speed);

    // Determine animation direction
    if (velocityX !== 0 || velocityY !== 0) {
      let direction = "down";

      if (velocityY > 0 && velocityX === 0) direction = "down";
      else if (velocityY > 0 && velocityX < 0) direction = "down-left";
      else if (velocityY === 0 && velocityX < 0) direction = "left";
      else if (velocityY < 0 && velocityX < 0) direction = "up-left";
      else if (velocityY < 0 && velocityX === 0) direction = "up";
      else if (velocityY < 0 && velocityX > 0) direction = "up-right";
      else if (velocityY === 0 && velocityX > 0) direction = "right";
      else if (velocityY > 0 && velocityX > 0) direction = "down-right";

      if (this.player.anims.currentAnim?.key !== direction) {
        this.player.play(direction);
      }
      this.player.anims.resume();
    } else {
      this.player.anims.pause();
    }
  }
}
