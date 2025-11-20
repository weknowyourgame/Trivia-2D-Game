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
  private wallsGroup: Phaser.Physics.Arcade.StaticGroup | null = null;

  constructor() {
    super({ key: "GameScene" });
  }

  preload(): void {
    // Load tilemap and tilesets
    this.load.tilemapTiledJSON("tilemap", "/assets/newtilemap.json");
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
        // Programmatically duplicate the room vertically
        // The original room is at rows 10-19 (10 rows total, height of room)
        const roomStartRow = 10;
        const roomHeight = 10;
        const roomWidth = this.map.width;

        // Copy the room to fill all rows above and below
        for (
          let targetRow = 0;
          targetRow < this.map.height;
          targetRow += roomHeight
        ) {
          if (targetRow === roomStartRow) continue; // Skip the original room

          for (
            let y = 0;
            y < roomHeight && targetRow + y < this.map.height;
            y++
          ) {
            for (let x = 0; x < roomWidth; x++) {
              const sourceTile = this.layer.getTileAt(x, roomStartRow + y);
              if (sourceTile) {
                this.layer.putTileAt(sourceTile.index, x, targetRow + y);
              }
            }
          }
        }

        this.layer.setScale(4); // Scale up for pixel art

        // Set collision ONLY for tiles with collision shapes in Tiled editor
        // From TSX <objectgroup>: 105, 106, 107, 108, 131, 132, 133, 134, 157, 160, 183, 186, 209, 210, 211, 212, 235, 236, 237, 238
        // Adjusted for GID (TSX ID + 1)
        const collisionTileIds = [
          106,
          107,
          108,
          109, // Top row with collision
          132,
          133,
          134,
          135, // Second row with collision
          158,
          161, // Side edges (partial width)
          184,
          187, // Side edges (partial width)
          210,
          211,
          212,
          213, // Bottom first row with collision
          236,
          237,
          238,
          239, // Bottom second row with collision
        ];
        this.layer.setCollision(collisionTileIds);
      }
    }

    // Set world bounds based on tilemap size (tiles at 16px each, scaled 4x)
    const worldWidth = this.map.width * 16 * 4;
    const worldHeight = this.map.height * 16 * 4;

    // Create static physics group for collision tiles
    this.wallsGroup = this.physics.add.staticGroup();

    if (this.layer) {
      const tileSize = 16 * 4; // Scaled tile size
      for (let y = 0; y < this.map.height; y++) {
        for (let x = 0; x < this.map.width; x++) {
          const tile = this.layer.getTileAt(x, y);
          if (tile && tile.collides) {
            const wall = this.wallsGroup.create(
              x * tileSize + tileSize / 2,
              y * tileSize + tileSize / 2,
              null
            );
            wall.setSize(tileSize, tileSize);
            wall.setVisible(false);
            wall.refreshBody();
          }
        }
      }
    }

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

    // Add collider between player and walls
    if (this.wallsGroup) {
      this.physics.add.collider(this.player, this.wallsGroup);
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
