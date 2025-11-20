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
  private layers: Phaser.Tilemaps.TilemapLayer[] = [];
  private doorSprites: Phaser.Physics.Arcade.Sprite[] = [];

  constructor() {
    super({ key: "GameScene" });
  }

  preload(): void {
    // Load tileset images FIRST before tilemap
    this.load.image("Tileset_Dungeon", "/assets/Tileset_Dungeon.png");
    this.load.image("Door", "/assets/Door.png");

    // Load tilemap after images
    this.load.tilemapTiledJSON("tilemap", "/assets/theMap.json");

    // Load door spritesheet (32x32, 6 frames)
    this.load.spritesheet("doorAnim", "/assets/Door.png", {
      frameWidth: 32,
      frameHeight: 32,
    });

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

    // Create tilemap normally
    this.map = this.make.tilemap({ key: "tilemap" });

    // Add tilesets
    const dungeonTileset = this.map.addTilesetImage(
      "Tileset_Dungeon",
      "Tileset_Dungeon"
    );
    const doorTileset = this.map.addTilesetImage("Door", "Door");

    const scale = 4;

    // Just create ONE layer to verify it works
    if (dungeonTileset && doorTileset) {
      this.layer = this.map.createLayer(
        "Tile Layer 1",
        [dungeonTileset, doorTileset],
        0,
        0
      );

      if (this.layer) {
        this.layer.setScale(scale);

        const collisionTileIndexes = [
          106, 107, 108, 109, 132, 133, 134, 135, 158, 161, 184, 187, 210, 211,
          212, 213, 236, 237, 238, 239,
        ];
        this.layer.setCollision(collisionTileIndexes);

        const worldWidth = this.map.width * 16 * scale;
        const worldHeight = this.map.height * 16 * scale;

        this.physics.world.setBounds(0, 0, worldWidth, worldHeight);

        const gameWidth = this.cameras.main.width;
        this.layer.x = (gameWidth - worldWidth) / 2;
      }
    }

    // Create static physics group for collision tiles
    this.wallsGroup = this.physics.add.staticGroup();

    if (this.layer) {
      for (let y = 0; y < this.map.height; y++) {
        for (let x = 0; x < this.map.width; x++) {
          const tile = this.layer.getTileAt(x, y);
          if (tile && tile.collides) {
            const wall = this.wallsGroup.create(
              this.layer.x + x * 16 * scale + (16 * scale) / 2,
              y * 16 * scale + (16 * scale) / 2,
              null
            );
            wall.setSize(16 * scale, 16 * scale);
            wall.setVisible(false);
            wall.refreshBody();
          }
        }
      }
    }

    // Create player sprite (spawn a bit below center)
    this.player = this.physics.add.sprite(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 + 100,
      "player"
    );
    this.player.setScale(5);

    // Adjust collision box to be smaller near the feet
    // Original sprite is 16x16, scaled 5x = 80x80
    // Set body size smaller and offset it down to focus on feet area
    this.player.body?.setSize(12, 8); // Smaller collision box (12x8 pixels of the original 16x16)
    (this.player.body as Phaser.Physics.Arcade.Body).setOffset(2, 8); // Offset down to feet area

    // Camera follows player
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // Add collider between player and walls
    if (this.wallsGroup) {
      this.physics.add.collider(this.player, this.wallsGroup);
    }

    // Create door animation
    this.anims.create({
      key: "doorOpen",
      frames: this.anims.generateFrameNumbers("doorAnim", {
        start: 0,
        end: 5,
      }),
      frameRate: 10,
      repeat: 0,
    });

    // Find all door tiles (311, 312, 323, 324) and replace with animated sprites
    // Doors are 2x2 tiles (311=top-left, 312=top-right, 323=bottom-left, 324=bottom-right)
    // Only create one sprite per door by detecting the top-left tile (311)
    const processedDoors = new Set<string>();
    if (this.layer) {
      for (let y = 0; y < this.map.height; y++) {
        for (let x = 0; x < this.map.width; x++) {
          const tile = this.layer.getTileAt(x, y);
          // Only process top-left door tile (311)
          if (tile && tile.index === 311) {
            const doorKey = `${x},${y}`;
            if (processedDoors.has(doorKey)) continue;
            processedDoors.add(doorKey);

            // Hide all 4 tiles of this door (2x2 grid)
            for (let dy = 0; dy < 2; dy++) {
              for (let dx = 0; dx < 2; dx++) {
                const doorTile = this.layer.getTileAt(x + dx, y + dy);
                if (doorTile) doorTile.setAlpha(0);
              }
            }

            // Create one 32x32 animated sprite centered on the 2x2 door area
            const doorSprite = this.physics.add.sprite(
              this.layer.x + (x + 1) * 16 * scale, // Center of 2x2 grid
              (y + 1) * 16 * scale, // Center of 2x2 grid
              "doorAnim",
              0
            );
            doorSprite.setScale(scale); // Scale to fill the 2x2 tile area (32x32 * 4 = 128px)
            doorSprite.setDepth(doorSprite.y); // Use Y position for depth sorting

            // Enable physics body for collision
            doorSprite.body?.setSize(32, 32);
            (doorSprite.body as Phaser.Physics.Arcade.Body).setImmovable(true);

            this.doorSprites.push(doorSprite);

            // Add collision with player (blocks movement until door opens)
            this.physics.add.collider(this.player, doorSprite);

            // Create invisible detection zone very close to the door
            const detectionZone = this.add.rectangle(
              this.layer.x + (x + 1) * 16 * scale,
              (y + 1) * 16 * scale + 24 * scale, // Very close to door
              40 * scale, // Width: slightly wider than door
              32 * scale, // Height: small area in front
              0x00ff00,
              0
            );
            this.physics.add.existing(detectionZone);
            (detectionZone.body as Phaser.Physics.Arcade.Body).setAllowGravity(
              false
            );

            // Store reference to detection zone and state
            (doorSprite as any).detectionZone = detectionZone;
            (doorSprite as any).playerInZone = false;
            (doorSprite as any).doorOpened = false;

            // Add overlap detection with detection zone to trigger door animation
            this.physics.add.overlap(
              this.player,
              detectionZone,
              () => {
                // Only play once when entering
                if (
                  !doorSprite.anims.isPlaying &&
                  !(doorSprite as any).doorOpened
                ) {
                  doorSprite.play("doorOpen");
                  (doorSprite as any).doorOpened = true;
                }
              },
              undefined,
              this
            );
          }
        }
      }
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

    // Update player depth based on Y position for depth sorting
    this.player.setDepth(this.player.y);

    // Update door sprite depths and check for animation pause
    this.doorSprites.forEach((doorSprite) => {
      doorSprite.setDepth(doorSprite.y);

      const detectionZone = (doorSprite as any).detectionZone;
      const playerInZone =
        detectionZone && this.physics.overlap(this.player, detectionZone);

      // Update player in zone state
      const wasInZone = (doorSprite as any).playerInZone;
      (doorSprite as any).playerInZone = playerInZone;

      // If door animation is playing or complete
      if (doorSprite.anims.currentFrame) {
        const currentFrame = doorSprite.anims.currentFrame.index;

        // If on last frame (5) and player in zone, keep it paused
        if (currentFrame === 5 && playerInZone) {
          if (doorSprite.anims.isPlaying) {
            doorSprite.anims.pause();
          }
          // Disable collision when fully open
          if (doorSprite.body) {
            (doorSprite.body as Phaser.Physics.Arcade.Body).enable = false;
          }
        }
        // If player left zone and door was open, close it
        else if (currentFrame === 5 && !playerInZone && wasInZone) {
          (doorSprite as any).doorOpened = false; // Reset flag
          doorSprite.anims.playReverse("doorOpen");
          // Re-enable collision
          if (doorSprite.body) {
            (doorSprite.body as Phaser.Physics.Arcade.Body).enable = true;
          }
        }
        // If closing animation reaches first frame, stop it
        else if (currentFrame === 0 && doorSprite.anims.isPlaying) {
          doorSprite.anims.stop();
          doorSprite.setFrame(0);
        }
      }
    });

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
