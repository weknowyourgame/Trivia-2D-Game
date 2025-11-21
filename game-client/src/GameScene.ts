import Phaser from "phaser";
import { SocketManager, PlayerData } from "./SocketManager";
import { RemotePlayer } from "./RemotePlayer";
import { QuestionUI, QuestionData } from "./QuestionUI";

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

  // Multiplayer properties
  private socketManager!: SocketManager;
  private remotePlayers: Map<string, RemotePlayer> = new Map();
  private localPlayerId: string | null = null;
  private localPlayerUsername: string = "Adventurer";
  private lastPositionSent: { x: number; y: number } = { x: 0, y: 0 };
  private lastPositionUpdate: number = 0;
  private positionUpdateThrottle: number = 16; // ~60 updates/sec

  // Quiz game properties
  private questionUI!: QuestionUI;
  private correctDoor: string | null = null;
  private isQuestionActive: boolean = false;
  private wallsGroup: Phaser.Physics.Arcade.StaticGroup | null = null;
  // Simplified gate system - map door ID (A/B/C/D) to all gates with that ID across all rooms
  private gatesByDoorId: Map<string, { sprite: Phaser.Physics.Arcade.Sprite, collider: Phaser.Physics.Arcade.Collider, graphics: Phaser.GameObjects.Rectangle, label: Phaser.GameObjects.Text }[]> = new Map();
  private layer2: Phaser.Tilemaps.TilemapLayer | null = null;
  private doorSprites: Phaser.Physics.Arcade.Sprite[] = [];
  private lives: number = 3;
  private heartSprites: Phaser.GameObjects.Image[] = [];
  private slimes: Phaser.Physics.Arcade.Sprite[] = [];
  private bats: Phaser.Physics.Arcade.Sprite[] = [];
  private lastDamageTime: number = 0;
  private damageImmunityDuration: number = 1000; // 1 second immunity after taking damage
  private currentRoomIndex: number = 0;
  private doorLights: Map<number, Phaser.GameObjects.Light[]> = new Map(); // Map room index to lights
  private roomHeight: number = 0;
  private doorsCrossed: number = 0;
  
  // Round-based colliders to prevent skipping ahead or going back
  private roundColliders: Map<number, { 
    sprite: Phaser.Physics.Arcade.Sprite, 
    collider: Phaser.Physics.Arcade.Collider, 
    graphics: Phaser.GameObjects.Rectangle,
    label: Phaser.GameObjects.Text,
    doorPositions: { x: number, y: number }[]
  }> = new Map();
  private currentGameRound: number = 0; // Track current game round (0 = not started)

  constructor() {
    super({ key: "GameScene" });
  }

  preload(): void {
    // Add error handling for asset loading
    this.load.on("loaderror", (file: any) => {
      console.error("Error loading file:", file.key, file.url);
    });

    // Load music if not already loaded
    if (!this.sound.get("ost")) {
      this.load.audio("ost", "/assets/ost.mp3");
    }

    // Load tileset images FIRST before tilemap
    this.load.image("Tileset_Dungeon", "/assets/Tileset_Dungeon.png");
    this.load.image("Door", "/assets/Door.png");
    this.load.image("desert_demo_objects", "/assets/desert_demo_objects.png");

    // Load heart spritesheet to show only first row
    this.load.spritesheet("heart", "/assets/hearts.png", {
      frameWidth: 16,
      frameHeight: 16,
    });

    // Load slime spritesheet (16x16, 12 frames)
    this.load.spritesheet("slime", "/assets/Slime Move.png", {
      frameWidth: 16,
      frameHeight: 16,
    });

    console.log(
      "Attempting to load slime spritesheet from: /assets/Slime Move.png"
    );

    // Load bat spritesheet (64x64, 4 frames)
    this.load.spritesheet("bat", "/assets/Bat.png", {
      frameWidth: 64,
      frameHeight: 64,
    });

    // Load tilemap after images
    this.load.tilemapTiledJSON("tilemap", "/assets/theNewMap.json");

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

    // Fade in camera
    this.cameras.main.fadeIn(1000, 0, 0, 0);

    // Ensure music is playing (should continue from HomeScene)
    if (!this.sound.get("ost")) {
      const music = this.sound.add("ost", {
        volume: 0.3,
        loop: true,
      });
      music.play();
    }

    // Enable lighting system
    this.lights.enable();
    this.lights.setAmbientColor(0x404040); // Dim gray ambient light

    // Create tilemap normally
    this.map = this.make.tilemap({ key: "tilemap" });

    // Add tilesets
    const dungeonTileset = this.map.addTilesetImage(
      "Tileset_Dungeon",
      "Tileset_Dungeon"
    );
    const doorTileset = this.map.addTilesetImage("Door", "Door");
    const desertTileset = this.map.addTilesetImage(
      "desert_demo_objects",
      "desert_demo_objects"
    );

    const scale = 4;
    let worldWidth = 0;
    let worldHeight = 0;

    // Create layers
    if (dungeonTileset && doorTileset && desertTileset) {
      // Layer 1 - background
      this.layer = this.map.createLayer(
        "Tile Layer 1",
        [dungeonTileset, doorTileset, desertTileset],
        0,
        0
      );

      if (this.layer) {
        this.layer.setScale(scale);
        this.layer.setPipeline("Light2D"); // Enable lighting on tilemap layer

        const collisionTileIndexes = [
          106, 107, 108, 109, 132, 133, 134, 135, 158, 161, 184, 187, 210, 211,
          212, 213, 236, 237, 238, 239,
        ];
        // Desert objects with collision: firstgid=325, so tile IDs are 325+4, 325+5, etc.
        const desertCollisionTiles = [
          329, 330, 333, 334, 335, 345, 346, 365, 366, 367, 368, 378, 379,
        ]; // tiles 4,5,8,9,10,20,21,40,41,42,43,53,54 offset by firstgid 325
        this.layer.setCollision([
          ...collisionTileIndexes,
          ...desertCollisionTiles,
        ]);

        worldWidth = this.map.width * 16 * scale;
        worldHeight = this.map.height * 16 * scale;

        this.physics.world.setBounds(0, 0, worldWidth, worldHeight);

        const gameWidth = this.cameras.main.width;
        this.layer.x = (gameWidth - worldWidth) / 2;
      }

      // Layer 2 - foreground objects
      this.layer2 = this.map.createLayer(
        "Tile Layer 2",
        [dungeonTileset, doorTileset, desertTileset],
        0,
        0
      );

      if (this.layer2 && this.layer) {
        this.layer2.setScale(scale);
        this.layer2.setPipeline("Light2D"); // Enable lighting on layer 2
        this.layer2.x = this.layer.x; // Align with layer 1

        // Set collision on desert object tiles in layer 2
        const desertCollisionTiles = [
          329, 330, 333, 334, 335, 345, 346, 365, 366, 367, 368, 378, 379,
        ];
        this.layer2.setCollision(desertCollisionTiles);
        console.log(
          "Set collision on desert tiles in Layer 2:",
          desertCollisionTiles
        );
      }
    }

    // Create static physics group for collision tiles
    this.wallsGroup = this.physics.add.staticGroup();

    console.log("Setting up collisions...");

    // Check Layer 1 for collisions
    if (this.layer) {
      console.log(
        `Checking Layer 1: ${this.map.width}x${this.map.height} tiles`
      );
      let layer1Collisions = 0;
      let desertObjectsFound = 0;

      for (let y = 0; y < this.map.height; y++) {
        for (let x = 0; x < this.map.width; x++) {
          const tile: Phaser.Tilemaps.Tile | null = this.layer.getTileAt(x, y);
          if (tile && tile.collides) {
            layer1Collisions++;
            const tileWorldX = this.layer.x + x * 16 * scale;
            const tileWorldY = y * 16 * scale;

            // Check if this is a desert object tile with custom collision
            const tileId = tile.index;
            const desertCollisionShapes: {
              [key: number]: {
                x: number;
                y: number;
                width: number;
                height: number;
              }[];
            } = {
              329: [
                { x: 1.79817, y: 2.90826, width: 12.2202, height: 11.1468 },
              ], // tile 4
              330: [{ x: 3.00917, y: 4, width: 12, height: 8.97248 }], // tile 5
              333: [{ x: 1.69725, y: -0.0366972, width: 13.5321, height: 16 }], // tile 8
              334: [
                { x: 13.1927, y: 7.08257, width: 2.80734, height: 8.91743 },
                { x: 6.12844, y: 14.0917, width: 7.22936, height: 1.65138 },
              ], // tile 9
              335: [{ x: 0, y: 2, width: 10, height: 14 }], // tile 10
              345: [{ x: 4.00917, y: 0, width: 11.9908, height: 12.578 }], // tile 20
              346: [{ x: 0, y: 0, width: 12.5688, height: 14.422 }], // tile 21
              365: [{ x: 1, y: 0, width: 14, height: 16 }], // tile 40
              366: [
                { x: 1.68807, y: 4.00917, width: 11.8807, height: 11.9908 },
              ], // tile 41
              367: [
                { x: 2.20183, y: 1.98165, width: 13.7982, height: 14.0183 },
              ], // tile 42
              368: [{ x: 0, y: 2.42202, width: 13.3211, height: 13.578 }], // tile 43 (using second object)
              378: [{ x: 5.3945, y: 0, width: 10.6055, height: 16 }], // tile 53
              379: [{ x: 0, y: 0, width: 8.53211, height: 15.7798 }], // tile 54
            };

            if (desertCollisionShapes[tileId] && this.wallsGroup) {
              desertObjectsFound++;
              console.log(`Found desert object tile ${tileId} at (${x}, ${y})`);
              // Create custom collision bodies for desert objects
              desertCollisionShapes[tileId].forEach((shape) => {
                if (this.wallsGroup) {
                  const wall = this.wallsGroup.create(
                    tileWorldX + (shape.x + shape.width / 2) * scale,
                    tileWorldY + (shape.y + shape.height / 2) * scale,
                    ""
                  );
                  wall.setSize(shape.width * scale, shape.height * scale);
                  wall.setVisible(false);
                  wall.refreshBody();
                }
              });
            } else if (this.wallsGroup) {
              // Regular tile collision (full 16x16)
              const wall = this.wallsGroup.create(
                tileWorldX + (16 * scale) / 2,
                tileWorldY + (16 * scale) / 2,
                ""
              );
              wall.setSize(16 * scale, 16 * scale);
              wall.setVisible(false);
              wall.refreshBody();
            }
          }
        }
      }
      console.log(
        `Layer 1: Found ${layer1Collisions} collision tiles, ${desertObjectsFound} desert objects`
      );
    }

    // Check Layer 2 for desert object collisions
    if (this.layer2) {
      console.log(
        `Checking Layer 2: ${this.map.width}x${this.map.height} tiles`
      );
      let layer2Collisions = 0;
      let desertObjectsFound = 0;

      for (let y = 0; y < this.map.height; y++) {
        for (let x = 0; x < this.map.width; x++) {
          const tile: Phaser.Tilemaps.Tile | null = this.layer2.getTileAt(x, y);
          if (tile && tile.collides) {
            layer2Collisions++;
            const tileWorldX = this.layer2.x + x * 16 * scale;
            const tileWorldY = y * 16 * scale;

            // Check if this is a desert object tile with custom collision
            const tileId = tile.index;
            const desertCollisionShapes: {
              [key: number]: {
                x: number;
                y: number;
                width: number;
                height: number;
              }[];
            } = {
              329: [
                { x: 1.79817, y: 2.90826, width: 12.2202, height: 11.1468 },
              ], // tile 4
              330: [{ x: 3.00917, y: 4, width: 12, height: 8.97248 }], // tile 5
              333: [{ x: 1.69725, y: -0.0366972, width: 13.5321, height: 16 }], // tile 8
              334: [
                { x: 13.1927, y: 7.08257, width: 2.80734, height: 8.91743 },
                { x: 6.12844, y: 14.0917, width: 7.22936, height: 1.65138 },
              ], // tile 9
              335: [{ x: 0, y: 2, width: 10, height: 14 }], // tile 10
              345: [{ x: 4.00917, y: 0, width: 11.9908, height: 12.578 }], // tile 20
              346: [{ x: 0, y: 0, width: 12.5688, height: 14.422 }], // tile 21
              365: [{ x: 1, y: 0, width: 14, height: 16 }], // tile 40
              366: [
                { x: 1.68807, y: 4.00917, width: 11.8807, height: 11.9908 },
              ], // tile 41
              367: [
                { x: 2.20183, y: 1.98165, width: 13.7982, height: 14.0183 },
              ], // tile 42
              368: [{ x: 0, y: 2.42202, width: 13.3211, height: 13.578 }], // tile 43 (using second object)
              378: [{ x: 5.3945, y: 0, width: 10.6055, height: 16 }], // tile 53
              379: [{ x: 0, y: 0, width: 8.53211, height: 15.7798 }], // tile 54
            };

            if (desertCollisionShapes[tileId] && this.wallsGroup) {
              desertObjectsFound++;
              console.log(
                `Found desert object tile ${tileId} at (${x}, ${y}) in Layer 2`
              );
              // Create custom collision bodies for desert objects
              desertCollisionShapes[tileId].forEach((shape) => {
                if (this.wallsGroup) {
                  const wall = this.wallsGroup.create(
                    tileWorldX + (shape.x + shape.width / 2) * scale,
                    tileWorldY + (shape.y + shape.height / 2) * scale,
                    ""
                  );
                  wall.setSize(shape.width * scale, shape.height * scale);
                  wall.setVisible(false);
                  wall.refreshBody();
                  console.log(
                    `  Created collision body at (${wall.x}, ${wall.y}) size ${wall.displayWidth}x${wall.displayHeight}`
                  );
                }
              });
            }
          }
        }
      }
      console.log(
        `Layer 2: Found ${layer2Collisions} collision tiles, ${desertObjectsFound} desert objects`
      );
    }

    // Create player sprite (spawn at bottom of the map)
    // Reuse worldWidth and worldHeight from above
    this.player = this.physics.add.sprite(
      this.cameras.main.width / 2,
      worldHeight - 700, // Spawn near bottom of map, a bit higher
      "player"
    );
    this.player.setScale(5);
    this.player.setPipeline("Light2D"); // Enable lighting on player

    // Adjust collision box to be smaller near the feet
    // Original sprite is 16x16, scaled 5x = 80x80
    // Set body size smaller and offset it down to focus on feet area
    this.player.body?.setSize(12, 8); // Smaller collision box (12x8 pixels of the original 16x16)
    (this.player.body as Phaser.Physics.Arcade.Body).setOffset(2, 8); // Offset down to feet area

    // Camera follows player
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // Create heart icons in top right corner
    const heartScale = 3;
    const heartSize = 16 * heartScale;
    const heartSpacing = 10;
    const startX = this.cameras.main.width - heartSize - 20;
    const startY = 60; // Moved down from 20 to 60

    for (let i = 0; i < 3; i++) {
      const heart = this.add.image(
        startX - i * (heartSize + heartSpacing),
        startY,
        "heart",
        0 // Use first frame only
      );
      heart.setScale(heartScale);
      heart.setScrollFactor(0); // Fixed to camera
      heart.setDepth(10000); // Always on top
      this.heartSprites.push(heart);
    }

    // Enable fullscreen on click
    this.input.once("pointerdown", () => {
      if (this.scale.isFullscreen) {
        this.scale.stopFullscreen();
      } else {
        this.scale.startFullscreen();
      }
    });

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

    // Create slime animation
    this.anims.create({
      key: "slimeMove",
      frames: this.anims.generateFrameNumbers("slime", {
        start: 0,
        end: 11,
      }),
      frameRate: 8,
      repeat: -1,
    });

    // Create bat animation
    this.anims.create({
      key: "batFly",
      frames: this.anims.generateFrameNumbers("bat", {
        start: 0,
        end: 3,
      }),
      frameRate: 8,
      repeat: -1,
    });

    // Find all door tiles (287, 288, 299, 300) and replace with animated sprites
    // Doors are 2x2 tiles (287=top-left, 288=top-right, 299=bottom-left, 300=bottom-right)
    // Only create one sprite per door by detecting the top-left tile (287)
    const processedDoors = new Set<string>();
    if (this.layer) {
      for (let y = 0; y < this.map.height; y++) {
        for (let x = 0; x < this.map.width; x++) {
          const tile = this.layer.getTileAt(x, y);
          // Only process top-left door tile (287)
          if (tile && tile.index === 287) {
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
            doorSprite.setPipeline("Light2D"); // Enable lighting on door sprites

            // Calculate which room this door belongs to based on world Y position
            const doorWorldY = (y + 1) * 16 * scale; // Center Y of door in world coords
            const doorRoomIndex = Math.floor(doorWorldY / (13 * 16 * scale));

            console.log(
              `Door at tile (${x},${y}) -> world Y: ${doorWorldY}, room index: ${doorRoomIndex}, room height: ${
                13 * 16 * scale
              }`
            );

            // Add warm yellow light above the door
            const doorLight = this.lights.addLight(
              this.layer.x + (x + 1) * 16 * scale, // X position (center of door)
              (y + 1) * 16 * scale - 20 * scale, // Y position (above door)
              150 * scale, // Radius
              0xffdd88, // Warm yellow color
              0.6 // Intensity
            );

            // Store light reference by room index AND log it
            if (!this.doorLights.has(doorRoomIndex)) {
              this.doorLights.set(doorRoomIndex, []);
              console.log(`Created new light array for room ${doorRoomIndex}`);
            }
            this.doorLights.get(doorRoomIndex)?.push(doorLight);
            console.log(
              `Added light to room ${doorRoomIndex}, now has ${
                this.doorLights.get(doorRoomIndex)?.length
              } lights`
            );

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

            // Create crossing detection zone on the other side of the door
            const crossingZone = this.add.rectangle(
              this.layer.x + (x + 1) * 16 * scale,
              (y + 1) * 16 * scale - 10 * scale, // Behind the door (further back)
              40 * scale, // Wider
              1 * scale, // Taller
              0xff0000,
              0.3 // Make it visible for debugging
            );
            this.physics.add.existing(crossingZone);
            (crossingZone.body as Phaser.Physics.Arcade.Body).setAllowGravity(
              false
            );

            (doorSprite as any).crossingZone = crossingZone;

            // Detect when player crosses through the door
            this.physics.add.overlap(
              this.player,
              crossingZone,
              () => {
                const username =
                  localStorage.getItem("playerUsername") || "Adventurer";
                console.log(
                  `🚪 Player ${username} is in crossing zone at (${x}, ${y}), doorOpened: ${
                    (doorSprite as any).doorOpened
                  }, playerCrossed: ${(doorSprite as any).playerCrossed}`
                );

                // Only trigger once per door opening
                if (
                  (doorSprite as any).doorOpened &&
                  !(doorSprite as any).playerCrossed
                ) {
                  (doorSprite as any).playerCrossed = true;
                  console.log(
                    `✅ Player ${username} CROSSED through door at (${x}, ${y})`
                  );

                  // TODO :  add more logic here, like:
                  // - Emit socket event
                  // - Trigger next round
                  // - Update score
                  // - Load next level
                }
              },
              undefined,
              this
            );
          }
        }
      }
    }

    // Log final door light mapping
    console.log("=== Final Door Light Mapping ===");
    this.doorLights.forEach((lights, roomIndex) => {
      console.log(`Room ${roomIndex}: ${lights.length} lights`);
    });

    // Spawn slimes randomly in rooms (approximately every 3 rooms)
    // Exclude the bottom room where player spawns
    const slimeScale = 4;
    const mapWorldWidth = this.map.width * 16 * scale;
    const mapWorldHeight = this.map.height * 16 * scale;
    this.roomHeight = 13 * 16 * scale; // Each room is 13 tiles tall
    const playerRoomIndex = Math.floor(this.player.y / this.roomHeight);
    this.currentRoomIndex = playerRoomIndex;
    const numSlimes = Math.floor(this.map.height / 13 / 3); // One slime every 3 rooms (13 rows per room)

    console.log(
      `Spawning ${numSlimes} slimes in map (excluding player spawn room ${playerRoomIndex})`
    );
    console.log(`Map dimensions: ${mapWorldWidth}x${mapWorldHeight}`);
    console.log(`Player position: (${this.player.x}, ${this.player.y})`);
    console.log(
      `Player room index: ${playerRoomIndex}, Room height: ${this.roomHeight}`
    );

    // Check if slime texture loaded
    if (!this.textures.exists("slime")) {
      console.error("Slime texture not loaded!");
    } else {
      console.log("Slime texture loaded successfully");
      const slimeTexture = this.textures.get("slime");
      console.log("Slime texture info:", slimeTexture);
    }

    for (let i = 0; i < numSlimes; i++) {
      // Random position within the map bounds, excluding player spawn room
      let x, y, slimeRoomIndex;

      do {
        x = Phaser.Math.Between(mapWorldWidth * 0.2, mapWorldWidth * 0.8);
        y = Phaser.Math.Between(100, mapWorldHeight - 100);
        slimeRoomIndex = Math.floor(y / this.roomHeight);
      } while (slimeRoomIndex === playerRoomIndex); // Keep trying until not in player's room

      const slime = this.physics.add.sprite(x, y, "slime", 0);
      slime.setScale(slimeScale);
      slime.play("slimeMove");
      slime.setDepth(y);

      console.log(
        `Slime ${i} spawned at (${x}, ${y}), depth: ${y}, visible: ${slime.visible}`
      );

      // Disable gravity for slime
      if (slime.body) {
        (slime.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
      }

      // Enable physics and set bounce
      slime.setBounce(1, 1);
      slime.setCollideWorldBounds(true);

      // Set initial random velocity
      const initialVelocityX = Phaser.Math.Between(-50, 50);
      const initialVelocityY = Phaser.Math.Between(-80, -40);
      slime.setVelocity(initialVelocityX, initialVelocityY);

      // Give slime random velocity (jumping movement)
      const jumpInterval = Phaser.Math.Between(1500, 2500);
      this.time.addEvent({
        delay: jumpInterval,
        callback: () => {
          if (slime.body && slime.active) {
            const velocityX = Phaser.Math.Between(-50, 50);
            const velocityY = Phaser.Math.Between(-80, -40); // Jump upward
            slime.setVelocity(velocityX, velocityY);
          }
        },
        loop: true,
      });

      // Add collisions with walls
      if (this.wallsGroup) {
        this.physics.add.collider(slime, this.wallsGroup);
      }

      // Add collision with all doors to prevent room escape
      this.doorSprites.forEach((doorSprite) => {
        this.physics.add.collider(slime, doorSprite);
      });

      // Add overlap with player for damage
      if (this.player) {
        this.physics.add.overlap(this.player, slime, () => {
          this.handleSlimeDamage();
        });
      }

      this.slimes.push(slime);
    }

    console.log(`Total slimes spawned: ${this.slimes.length}`);

    // Spawn bats randomly in rooms (approximately every 3 rooms)
    // Exclude the bottom room where player spawns
    const batScale = 2;
    const numBats = Math.floor(this.map.height / 13 / 3); // One bat every 3 rooms

    console.log(
      `Spawning ${numBats} bats in map (excluding player spawn room ${playerRoomIndex})`
    );

    // Check if bat texture loaded
    if (!this.textures.exists("bat")) {
      console.error("Bat texture not loaded!");
    } else {
      console.log("Bat texture loaded successfully");
    }

    for (let i = 0; i < numBats; i++) {
      // Random position within the map bounds, excluding player spawn room
      let x, y, batRoomIndex;

      do {
        x = Phaser.Math.Between(mapWorldWidth * 0.2, mapWorldWidth * 0.8);
        y = Phaser.Math.Between(100, mapWorldHeight - 100);
        batRoomIndex = Math.floor(y / this.roomHeight);
      } while (batRoomIndex === playerRoomIndex); // Keep trying until not in player's room

      const bat = this.physics.add.sprite(x, y, "bat", 0);
      bat.setScale(batScale);
      bat.play("batFly");
      bat.setDepth(y);

      console.log(
        `Bat ${i} spawned at (${x}, ${y}), depth: ${y}, visible: ${bat.visible}`
      );

      // Disable gravity for bat
      if (bat.body) {
        (bat.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
      }

      // Set smaller collision box for the bat
      // Original sprite is 64x64, scaled 2x = 128x128
      // Set body size smaller to make collision more forgiving
      bat.body?.setSize(40, 40);
      (bat.body as Phaser.Physics.Arcade.Body).setOffset(12, 12);

      // Enable physics and set bounce
      bat.setBounce(1, 1);
      bat.setCollideWorldBounds(true);

      // Set initial random velocity
      const initialVelocityX = Phaser.Math.Between(-50, 50);
      const initialVelocityY = Phaser.Math.Between(-80, -40);
      bat.setVelocity(initialVelocityX, initialVelocityY);

      // Give bat random velocity (flying movement)
      const flyInterval = Phaser.Math.Between(1500, 2500);
      this.time.addEvent({
        delay: flyInterval,
        callback: () => {
          if (bat.body && bat.active) {
            const velocityX = Phaser.Math.Between(-50, 50);
            const velocityY = Phaser.Math.Between(-80, -40);
            bat.setVelocity(velocityX, velocityY);
          }
        },
        loop: true,
      });

      // Add collisions with walls
      if (this.wallsGroup) {
        this.physics.add.collider(bat, this.wallsGroup);
      }

      // Add collision with all doors to prevent room escape
      this.doorSprites.forEach((doorSprite) => {
        this.physics.add.collider(bat, doorSprite);
      });

      // Add overlap with player for damage
      if (this.player) {
        this.physics.add.overlap(this.player, bat, () => {
          this.handleSlimeDamage();
        });
      }

      this.bats.push(bat);
    }

    console.log(`Total bats spawned: ${this.bats.length}`);

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

    // Initialize multiplayer socket connection
    this.socketManager = new SocketManager("http://localhost:3000");
    this.setupSocketHandlers();
    this.socketManager.connect();

    // Initialize question UI
    this.questionUI = new QuestionUI(this);

    // Create invisible door colliders
    this.createDoorColliders();
    
    // Create round-based colliders to prevent progression
    this.createRoundColliders();

    // Show "Waiting for players" message with countdown
    const waitingText = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 - 50,
      "Waiting for players to join the journey...",
      {
        fontSize: "36px",
        color: "#FFD700",
        fontFamily: "Cinzel, Georgia, serif",
        stroke: "#000000",
        strokeThickness: 6,
        align: "center",
      }
    );
    waitingText.setOrigin(0.5);
    waitingText.setScrollFactor(0);
    waitingText.setDepth(10000);

    const countdownText = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 + 30,
      "10",
      {
        fontSize: "72px",
        color: "#FFFFFF",
        fontFamily: "Cinzel, Georgia, serif",
        stroke: "#000000",
        strokeThickness: 8,
      }
    );
    countdownText.setOrigin(0.5);
    countdownText.setScrollFactor(0);
    countdownText.setDepth(10000);

    // Countdown from 10 seconds
    let timeRemaining = 10;
    const countdownTimer = this.time.addEvent({
      delay: 1000,
      callback: () => {
        timeRemaining--;
        countdownText.setText(timeRemaining.toString());

        if (timeRemaining <= 0) {
          countdownTimer.remove();
          
          console.log("⏰ COUNTDOWN FINISHED - Opening all doors for gameplay");
          // Open all doors when countdown finishes (safety check)
          // this.openAllDoors();
          
          // Fade out the waiting message
          this.tweens.add({
            targets: [waitingText, countdownText],
            alpha: 0,
            duration: 1000,
            onComplete: () => {
              waitingText.destroy();
              countdownText.destroy();
            },
          });
        }
      },
      repeat: 9, // Repeat 9 times (10 total including initial)
    });
  }

  private setupSocketHandlers(): void {
    this.socketManager.onPlayerInfo = (data) => {
      this.localPlayerId = data.playerId;
      this.localPlayerUsername = data.username || "Adventurer";
    };

    this.socketManager.onExistingPlayers = (data) => {
      data.players.forEach((playerData: PlayerData) => {
        this.addRemotePlayer(playerData);
      });
    };

    this.socketManager.onPlayerJoined = (data) => {
      this.addRemotePlayer(data);
    };

    this.socketManager.onPlayerMoved = (data) => {
      const remotePlayer = this.remotePlayers.get(data.playerId);
      if (remotePlayer) {
        remotePlayer.updatePosition(data.position, data.timestamp);
      }
    };

    this.socketManager.onPlayerLeft = (data) => {
      this.removeRemotePlayer(data.playerId);
    };

    // Game event handlers
    this.socketManager.onGameCountdown = (data) => {
      console.log("⏱️ Countdown:", data.message);
    };

    this.socketManager.onGameStart = (data) => {
      console.log("🎮 Game started!", data);
    };

    this.socketManager.onQuestion = (data: QuestionData) => {
      this.handleQuestion(data);
    };

    this.socketManager.onAnswerReveal = (data) => {
      this.handleAnswerReveal(data);
    };

    this.socketManager.onGameOver = (data) => {
      console.log("Game over!", data);
      this.questionUI.hide();
      this.isQuestionActive = false;
      this.correctDoor = null;
      this.openAllDoors();
      
      // Remove all round colliders on game over
      this.removeAllRoundColliders();
    };

    this.socketManager.onMovementPhase = (data) => {
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("🏃 MOVEMENT PHASE STARTED", data);
      console.log(`🏃 Round: ${data.round}`);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      // Barrier is already down from handleAnswerReveal
      // Players can move forward now!
    };

    this.socketManager.onGameStart = (data) => {
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("🎮 GAME STARTED!", data);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      
      // All barriers should already be up from initialization (rounds 2-19)
      // Just log for confirmation
      console.log(`🚧 ${this.roundColliders.size} barriers ready and blocking (rounds 2-19)`);
    };

    this.socketManager.onRoundEnded = (data) => {
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("🏁 ROUND ENDED - Required players crossed", data);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      // Lock all doors again after round ends (before next question)
      this.lockAllDoors();
      
      // Hide the current round's barrier (completed)
      if (this.currentGameRound > 0) {
        const currentCollider = this.roundColliders.get(this.currentGameRound);
        if (currentCollider) {
          currentCollider.collider.active = false;
          currentCollider.graphics.setVisible(false);
          currentCollider.label.setVisible(false);
          console.log(`✓ Round ${this.currentGameRound} barrier HIDDEN (completed)`);
        }
        
        // Next round's barrier should already be up from initialization
        // Just ensure it's visible and blocking
        const nextRound = this.currentGameRound + 1;
        const nextCollider = this.roundColliders.get(nextRound);
        if (nextCollider) {
          nextCollider.collider.active = true;
          nextCollider.graphics.setFillStyle(0xff0000, 0.6);
          nextCollider.graphics.setVisible(true);
          nextCollider.label.setVisible(true);
          console.log(`🚧 Round ${nextRound} barrier UP (ready for next round)`);
        }
      }
    };
  }

  private addRemotePlayer(data: PlayerData): void {
    // Prevent duplicate remote players
    if (this.remotePlayers.has(data.playerId)) {
      return;
    }

    const remotePlayer = new RemotePlayer(
      this,
      data.playerId,
      data.username,
      data.character,
      data.position
    );

    this.remotePlayers.set(data.playerId, remotePlayer);
  }

  private removeRemotePlayer(playerId: string): void {
    const remotePlayer = this.remotePlayers.get(playerId);
    if (remotePlayer) {
      remotePlayer.destroy();
      this.remotePlayers.delete(playerId);
    }
  }

  private createDoorColliders(): void {
    if (!this.player || !this.layer || !this.map) return;

    const scale = 4;
    const doorLabels = ["A", "B", "C", "D"];
    
    // Initialize gate maps for each door ID
    doorLabels.forEach(doorId => {
      this.gatesByDoorId.set(doorId, []);
    });

    // Collect all door positions first
    const allDoors: { x: number; y: number }[] = [];
    
    // Scan the entire map for door tiles (287 = top-left of 2x2 door)
    for (let y = 0; y < this.map.height; y++) {
      for (let x = 0; x < this.map.width; x++) {
        const tile = this.layer.getTileAt(x, y);
        
        if (tile && tile.index === 287) {
          // Found a door! Calculate its world position
          const doorWorldX = this.layer.x + (x + 1) * 16 * scale; // Center of door
          const doorWorldY = (y + 1) * 16 * scale; // Center of door
          
          allDoors.push({ x: doorWorldX, y: doorWorldY });
        }
      }
    }

    console.log(`🚪 Found ${allDoors.length} doors total in the map`);

    // Assign door IDs using total count % 4 (A, B, C, D repeating pattern)
    allDoors.forEach((door, totalIndex) => {
      const doorId = doorLabels[totalIndex % 4]; // A, B, C, D, A, B, C, D, ...
      const doorWidth = 2 * 16 * scale;
      const doorHeight = 2 * 16 * scale;
      
      // Create a RECTANGLE graphics object for the gate visual
      const gateGraphics = this.add.rectangle(door.x, door.y, doorWidth, doorHeight, 0xff0000, 0.5);
      gateGraphics.setDepth(10000);
      gateGraphics.setScrollFactor(1);
      
      // Create a PHYSICS sprite for collision (separate from visual)
      const gateSprite = this.physics.add.sprite(door.x, door.y, "");
      gateSprite.setVisible(false); // The rectangle above is the visual
      gateSprite.setImmovable(true);
      
      // CRITICAL: Set the physics body size and enable it
      if (gateSprite.body) {
        const body = gateSprite.body as Phaser.Physics.Arcade.Body;
        body.setSize(doorWidth, doorHeight);
        body.setAllowGravity(false);
        body.setImmovable(true);
        body.enable = true;
      }
      
      // Add a text label on the gate
      const gateLabel = this.add.text(door.x, door.y, `${doorId}\nGATE`, {
        fontSize: "24px",
        color: "#ffffff",
        fontFamily: "Arial",
        stroke: "#000000",
        strokeThickness: 4,
        align: "center"
      });
      gateLabel.setOrigin(0.5);
      gateLabel.setDepth(10001);
      gateLabel.setScrollFactor(1);
      
      // Create collider with player (START BLOCKED)
      const collider = this.physics.add.collider(this.player!, gateSprite);
      collider.active = true; // START BLOCKED
      
      // Store gate reference by door ID
      this.gatesByDoorId.get(doorId)!.push({
        sprite: gateSprite,
        collider: collider,
        graphics: gateGraphics,
        label: gateLabel
      });
      
      console.log(`  🚪 Door #${totalIndex} (${doorId}) at (${door.x}, ${door.y})`);
    });

    // Log summary
    console.log(`\n🚪 ========== GATE SUMMARY ==========`);
    doorLabels.forEach(doorId => {
      const gatesCount = this.gatesByDoorId.get(doorId)?.length || 0;
      console.log(`  Door ${doorId}: ${gatesCount} gates`);
    });
    console.log(`🚪 ====================================\n`);
    console.log(`⚠️  All gates START BLOCKED - Will open on game start`);
  }

  /**
   * Create round-specific colliders to prevent players from accessing future rounds
   * These colliders are placed ahead of each round's doors
   */
  private createRoundColliders(): void {
    if (!this.player || !this.layer || !this.map) return;

    const scale = 4;
    const allDoors: { x: number; y: number }[] = [];
    
    // Collect all door positions
    for (let y = 0; y < this.map.height; y++) {
      for (let x = 0; x < this.map.width; x++) {
        const tile = this.layer.getTileAt(x, y);
        
        if (tile && tile.index === 287) {
          const doorWorldX = this.layer.x + (x + 1) * 16 * scale;
          const doorWorldY = (y + 1) * 16 * scale;
          allDoors.push({ x: doorWorldX, y: doorWorldY });
        }
      }
    }

    // Sort doors by Y position (descending - highest Y first = bottom of map = round 1)
    // Players start at bottom (high Y) and move up (low Y)
    allDoors.sort((a, b) => b.y - a.y);

    // Group doors by rounds (every 4 doors = 1 round)
    // Create colliders for rounds 2-19 (skip round 1 where players start)
    const totalRounds = Math.floor(allDoors.length / 4);
    console.log(`\n🚧 ========== CREATING ROUND COLLIDERS ==========`);
    console.log(`Total doors found: ${allDoors.length}`);
    console.log(`Total rounds: ${totalRounds}`);
    console.log(`Creating colliders for rounds 2-${totalRounds}`);

    // Log first few door positions for debugging
    console.log(`First 8 doors (bottom to top):`);
    for (let i = 0; i < Math.min(8, allDoors.length); i++) {
      const roundNum = Math.floor(i / 4) + 1;
      console.log(`  Door ${i}: Y=${Math.round(allDoors[i].y)} (Round ${roundNum})`);
    }

    for (let round = 2; round <= totalRounds; round++) {
      // Get the 4 doors for this round
      const startIndex = (round - 1) * 4; // Round 2 starts at index 4, Round 3 at index 8, etc.
      const roundDoors = allDoors.slice(startIndex, startIndex + 4);
      
      if (roundDoors.length === 0) continue;

      // Calculate the average Y position of doors in this round
      const avgY = roundDoors.reduce((sum, door) => sum + door.y, 0) / roundDoors.length;
      
      // Calculate the average X position (center of the map)
      const avgX = roundDoors.reduce((sum, door) => sum + door.x, 0) / roundDoors.length;
      
      // Position collider to prevent players from accessing these doors
      // Players move UP (decreasing Y = going higher on map)
      // So we place the barrier BELOW the doors (higher Y = lower on map)
      // This blocks players from reaching the doors from below
      const colliderY = avgY + (3 * 16 * scale); // 3 tiles BELOW the doors
      const colliderWidth = this.map.width * 16 * scale; // Full map width
      const colliderHeight = 2 * 16 * scale; // 2 tiles tall
      
      // Create visual representation (semi-transparent barrier)
      const barrierGraphics = this.add.rectangle(
        avgX,
        colliderY,
        colliderWidth,
        colliderHeight,
        0xff0000, // Red for barriers
        0.5
      );
      barrierGraphics.setDepth(10000);
      barrierGraphics.setScrollFactor(1);
      barrierGraphics.setVisible(true); // Start visible
      
      // Create physics sprite for collision
      const barrierSprite = this.physics.add.sprite(avgX, colliderY, "");
      barrierSprite.setVisible(false);
      barrierSprite.setImmovable(true);
      
      if (barrierSprite.body) {
        const body = barrierSprite.body as Phaser.Physics.Arcade.Body;
        body.setSize(colliderWidth, colliderHeight);
        body.setAllowGravity(false);
        body.setImmovable(true);
        body.enable = true;
      }
      
      // Add label
      const barrierLabel = this.add.text(avgX, colliderY, `ROUND ${round}\nBARRIER`, {
        fontSize: "32px",
        color: "#ffffff",
        fontFamily: "Arial",
        stroke: "#000000",
        strokeThickness: 6,
        align: "center"
      });
      barrierLabel.setOrigin(0.5);
      barrierLabel.setDepth(10001);
      barrierLabel.setScrollFactor(1);
      barrierLabel.setVisible(true); // Start visible
      
      // Create collider with player (START ACTIVE - blocking by default)
      const collider = this.physics.add.collider(this.player!, barrierSprite);
      collider.active = true; // Start active/blocking
      
      // Store round collider
      this.roundColliders.set(round, {
        sprite: barrierSprite,
        collider: collider,
        graphics: barrierGraphics,
        label: barrierLabel,
        doorPositions: roundDoors
      });
      
      console.log(`  🚧 Round ${round} barrier:`);
      console.log(`     - Barrier Y: ${Math.round(colliderY)}`);
      console.log(`     - Doors Y: ${Math.round(avgY)}`);
      console.log(`     - Door indices: ${startIndex}-${startIndex + 3}`);
    }

    console.log(`🚧 Total round colliders created: ${this.roundColliders.size} (rounds 2-${totalRounds})`);
    console.log(`🚧 All round barriers START UP and BLOCKING\n`);
  }

  private handleQuestion(data: QuestionData): void {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📝 QUESTION RECEIVED:", data.text);
    console.log(`📝 Round: ${data.roundNumber}/${data.totalRounds}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    this.isQuestionActive = true;
    this.correctDoor = null;
    
    // Update current game round
    this.currentGameRound = data.roundNumber;

    // Show question UI
    this.questionUI.show(data);

    // Lock ALL doors when question appears
    this.lockAllDoors();
    
    // Ensure barrier is UP for current round (should already be up, but make sure)
    const collider = this.roundColliders.get(this.currentGameRound);
    if (collider) {
      collider.collider.active = true;
      collider.graphics.setFillStyle(0xff0000, 0.6); // Red = blocking
      collider.graphics.setVisible(true);
      collider.label.setVisible(true);
      console.log(`🚧 Round ${this.currentGameRound} barrier UP - question active`);
    }
    
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  }

  private handleAnswerReveal(data: any): void {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ ANSWER REVEALED:", data.correctAnswer);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    this.correctDoor = data.correctAnswer;
    this.isQuestionActive = false;

    // Hide question UI
    this.questionUI.hide();

    // Open only the correct door
    if (this.correctDoor) {
      this.openDoor(this.correctDoor);
      console.log(`✅ Door ${this.correctDoor} is now open - players can pass!`);
    }
    
    // DISABLE barrier for current round - timer finished, let players through!
    this.disableRoundCollider(this.currentGameRound);
    console.log(`✅ Round ${this.currentGameRound} barrier DOWN - players can move forward!`);
    
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  }

  /**
   * Lock ALL doors at once - called when question appears or after players cross
   */
  private lockAllDoors(): void {
    console.log("🔒 ========== LOCKING ALL DOORS ==========");
    let totalLocked = 0;
    
    this.gatesByDoorId.forEach((gates, doorId) => {
      gates.forEach(gate => {
        gate.collider.active = true; // Block
        gate.graphics.setFillStyle(0xff0000, 0.7); // Red = locked
        totalLocked++;
      });
      console.log(`  🔒 Door ${doorId}: ${gates.length} gates LOCKED`);
    });
    
    console.log(`🔒 Total: ${totalLocked} gates locked\n`);
  }

  /**
   * Enable round collider - blocks access to this round's doors
   */
  private enableRoundCollider(round: number): void {
    const collider = this.roundColliders.get(round);
    if (!collider) {
      console.warn(`⚠️ Round ${round} collider not found`);
      return;
    }

    collider.collider.active = true;
    collider.graphics.setFillStyle(0xff0000, 0.6); // Red = blocked
    collider.graphics.setVisible(true);
    collider.label.setVisible(true);
    
    console.log(`🚧 Round ${round} collider ENABLED (blocking)`);
  }

  /**
   * Disable round collider - allows access to this round's doors
   */
  private disableRoundCollider(round: number): void {
    const collider = this.roundColliders.get(round);
    if (!collider) {
      console.warn(`⚠️ Round ${round} collider not found`);
      return;
    }

    collider.collider.active = false;
    collider.graphics.setFillStyle(0x00ff00, 0.3); // Green = open
    collider.graphics.setVisible(true);
    collider.label.setVisible(true);
    
    console.log(`✅ Round ${round} collider DISABLED (open)`);
  }

  /**
   * Update round colliders based on current game round
   * - Disable collider for current round (allow access)
   * - Enable all colliders for future rounds (block access)
   * - Hide colliders for past rounds (already completed)
   */
  private updateRoundColliders(currentRound: number): void {
    console.log(`\n🔄 ========== UPDATING ROUND COLLIDERS ==========`);
    console.log(`Current game round: ${currentRound}`);
    
    this.roundColliders.forEach((collider, round) => {
      if (round < currentRound) {
        // Past rounds - hide completely (already completed)
        collider.collider.active = false;
        collider.graphics.setVisible(false);
        collider.label.setVisible(false);
        console.log(`  ✓ Round ${round}: HIDDEN (past)`);
      } else if (round === currentRound) {
        // Current round - disable to allow access
        this.disableRoundCollider(round);
        console.log(`  ➤ Round ${round}: OPEN (current)`);
      } else {
        // Future rounds - enable to block access
        this.enableRoundCollider(round);
        console.log(`  ✗ Round ${round}: BLOCKED (future)`);
      }
    });
    
    console.log(`🔄 =========================================\n`);
  }

  /**
   * Remove all round colliders (hide visuals and disable collision)
   */
  private removeAllRoundColliders(): void {
    console.log(`\n🗑️ ========== REMOVING ROUND COLLIDERS ==========`);
    
    this.roundColliders.forEach((collider, round) => {
      // Disable collision
      collider.collider.active = false;
      
      // Hide visuals
      collider.graphics.setVisible(false);
      collider.label.setVisible(false);
      
      console.log(`  🗑️ Round ${round} collider removed`);
    });
    
    console.log(`🗑️ Total: ${this.roundColliders.size} colliders removed\n`);
  }

  /**
   * Destroy all round colliders completely (remove from scene)
   */
  private destroyAllRoundColliders(): void {
    console.log(`\n💥 ========== DESTROYING ROUND COLLIDERS ==========`);
    
    this.roundColliders.forEach((collider, round) => {
      // Destroy collision
      collider.collider.destroy();
      
      // Destroy visuals
      collider.graphics.destroy();
      collider.label.destroy();
      collider.sprite.destroy();
      
      console.log(`  💥 Round ${round} collider destroyed`);
    });
    
    // Clear the map
    this.roundColliders.clear();
    
    console.log(`💥 All round colliders destroyed and cleared\n`);
  }

  /**
   * Open specific door (A/B/C/D) - unlock all gates with that ID
   */
  private openDoor(doorId: string): void {
    console.log(`🔓 ========== OPENING DOOR ${doorId} ==========`);
    
    const gates = this.gatesByDoorId.get(doorId);
    if (!gates) {
      console.error(`❌ Door ${doorId} not found!`);
      return;
    }
    
    gates.forEach(gate => {
      gate.collider.active = false; // Unlock
      gate.graphics.setFillStyle(0x00ff00, 0.5); // Green = open
    });
    
    console.log(`  ✅ Opened ${gates.length} gates for Door ${doorId}\n`);
  }

  /**
   * Open all doors - used for movement phase or game over
   */
  private openAllDoors(): void {
    console.log("🔓 ========== OPENING ALL DOORS ==========");
    let totalOpened = 0;
    
    this.gatesByDoorId.forEach((gates) => {
      gates.forEach(gate => {
        gate.collider.active = false; // Unlock
        gate.graphics.setFillStyle(0x00ff00, 0.3); // Green = open, transparent
        totalOpened++;
      });
    });
    
    console.log(`🔓 Total: ${totalOpened} gates opened\n`);
  }


  update(time: number, _delta: number): void {
    if (!this.player || !this.cursors) return;

    // Update player depth based on Y position for depth sorting
    this.player.setDepth(this.player.y);

    // Update door sprite depths and check for animation pause
    this.doorSprites.forEach((doorSprite) => {
      doorSprite.setDepth(doorSprite.y);

      const detectionZone = (doorSprite as any).detectionZone;
      const playerInZone =
        detectionZone &&
        this.player &&
        this.physics.overlap(this.player, detectionZone);

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
        // Check if player crossed through the door
        const crossingZone = (doorSprite as any).crossingZone;
        const inCrossingZone =
          crossingZone &&
          this.player &&
          this.physics.overlap(this.player, crossingZone);
        const wasInCrossingZone = (doorSprite as any).wasInCrossingZone;

        // If player just entered crossing zone (wasn't there before), they crossed!
        if (inCrossingZone && !wasInCrossingZone) {
          this.doorsCrossed++;
          console.log(
            `🚪 Player ${this.localPlayerUsername} crossed door #${this.doorsCrossed}`
          );

          // Notify backend
          this.socketManager.sendDoorCrossed();
        }

        (doorSprite as any).wasInCrossingZone = inCrossingZone;

        // If player left zone and door was open, close it
        if (currentFrame === 5 && !playerInZone && wasInZone) {
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

    // Update slime depths for proper sorting
    this.slimes.forEach((slime) => {
      if (slime.active) {
        slime.setDepth(slime.y);
      }
    });

    // Update bat depths for proper sorting
    this.bats.forEach((bat) => {
      if (bat.active) {
        bat.setDepth(bat.y);
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

    // Send position updates (throttled to ~60/sec)
    if (time - this.lastPositionUpdate > this.positionUpdateThrottle) {
      const currentPos = { x: this.player.x, y: this.player.y };
      const distance = Phaser.Math.Distance.Between(
        currentPos.x,
        currentPos.y,
        this.lastPositionSent.x,
        this.lastPositionSent.y
      );

      // Only send if moved significantly (> 5 pixels) or enough time passed (> 100ms)
      if (distance > 5 || time - this.lastPositionUpdate > 100) {
        this.socketManager.sendMovement(currentPos, null);
        this.lastPositionSent = currentPos;
        this.lastPositionUpdate = time;
      }
    }

    // Update all remote players (interpolation and animation)
    this.remotePlayers.forEach((remotePlayer) => {
      remotePlayer.update();
    });

    // Check if player changed rooms and turn off lights in rooms behind
    const newRoomIndex = Math.floor(this.player.y / this.roomHeight);
    if (newRoomIndex !== this.currentRoomIndex) {
      console.log(
        `Player changed rooms: ${this.currentRoomIndex} -> ${newRoomIndex}`
      );
      // Player moved to a different room
      // Since Y=0 is top and player moves UP (decreasing Y), lower room index = ahead
      // Turn off lights in all rooms behind the player (higher room index = lower on map = behind)
      this.doorLights.forEach((lights, roomIndex) => {
        if (roomIndex > newRoomIndex) {
          // This room is behind the player (higher Y, lower on map), turn off its lights
          console.log(
            `Turning OFF lights in room ${roomIndex} (behind player)`
          );
          lights.forEach((light) => light.setIntensity(0));
        } else if (
          roomIndex === newRoomIndex ||
          roomIndex === newRoomIndex - 1 ||
          roomIndex === newRoomIndex + 1
        ) {
          // Current room and adjacent rooms - keep lights on
          console.log(`Keeping lights ON in room ${roomIndex}`);
          lights.forEach((light) => light.setIntensity(0.6));
        } else {
          // Rooms far ahead - turn off
          console.log(`Turning OFF lights in room ${roomIndex} (far ahead)`);
          lights.forEach((light) => light.setIntensity(0));
        }
      });
      this.currentRoomIndex = newRoomIndex;
    }

    // Update question UI timer (delta is in milliseconds)
    if (this.isQuestionActive) {
      this.questionUI.update(_delta);
    }
  }

  private handleSlimeDamage(): void {
    const currentTime = this.time.now;

    // Check if player is immune (recently took damage)
    if (currentTime - this.lastDamageTime < this.damageImmunityDuration) {
      return;
    }

    // Reduce lives
    this.lives--;
    this.lastDamageTime = currentTime;

    // Hide a heart
    if (this.lives >= 0 && this.lives < this.heartSprites.length) {
      this.heartSprites[this.lives].setVisible(false);
    }

    // Flash player to indicate damage
    if (this.player) {
      this.tweens.add({
        targets: this.player,
        alpha: 0.3,
        duration: 100,
        yoyo: true,
        repeat: 5,
      });
    }

    // Check for game over
    if (this.lives <= 0) {
      this.gameOver();
    }
  }

  private gameOver(): void {
    // Display game over text
    const gameOverText = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      "GAME OVER",
      {
        fontSize: "64px",
        color: "#FF0000",
        fontFamily: "Arial",
        stroke: "#000000",
        strokeThickness: 6,
      }
    );
    gameOverText.setOrigin(0.5);
    gameOverText.setScrollFactor(0);
    gameOverText.setDepth(2000);

    // Stop player movement
    if (this.player) {
      this.player.setVelocity(0, 0);
      this.player.anims.pause();
    }

    // Restart after 3 seconds
    this.time.delayedCall(3000, () => {
      this.scene.restart();
    });
  }
}
