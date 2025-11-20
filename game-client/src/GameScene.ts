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
  private lastPositionSent: { x: number; y: number } = { x: 0, y: 0 };
  private lastPositionUpdate: number = 0;
  private positionUpdateThrottle: number = 16; // ~60 updates/sec
  
  // Quiz game properties
  private questionUI!: QuestionUI;
  private correctDoor: string | null = null;
  private isQuestionActive: boolean = false;
  private doorColliders: Map<string, Phaser.Physics.Arcade.Sprite> = new Map();
  private doorColliderObjects: Phaser.Physics.Arcade.Collider[] = [];

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

    // Initialize multiplayer socket connection
    this.socketManager = new SocketManager("http://localhost:3000");
    this.setupSocketHandlers();
    this.socketManager.connect();
    
    // Initialize question UI
    this.questionUI = new QuestionUI(this);
    
    // Create invisible door colliders
    this.createDoorColliders();
    
    // Show welcome message with username
    const username = localStorage.getItem("playerUsername") || "Adventurer";
    const welcomeText = this.add.text(
      this.cameras.main.width / 2,
      50,
      `Welcome, ${username}!`,
      {
        fontSize: "32px",
        color: "#FFD700",
        fontFamily: "Arial",
        stroke: "#000000",
        strokeThickness: 4,
      }
    );
    welcomeText.setOrigin(0.5);
    welcomeText.setScrollFactor(0);
    welcomeText.setDepth(1000);
    
    // Fade out after 3 seconds
    this.time.delayedCall(3000, () => {
      this.tweens.add({
        targets: welcomeText,
        alpha: 0,
        duration: 1000,
        onComplete: () => welcomeText.destroy(),
      });
    });
  }

  private setupSocketHandlers(): void {
    this.socketManager.onPlayerInfo = (data) => {
      this.localPlayerId = data.playerId;
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
      this.setAllDoorsPassable();
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
    if (!this.player) return;

    // Door positions in the tilemap (scaled by 4)
    // Looking at the tilemap, doors are at tiles 311, 312, 323, 324 (from Door tileset)
    // They appear at row 12-13, columns 16-17, 20-21, 24-25, 26-27
    const doorPositions = [
      { id: "A", x: 16 * 16 * 4, y: 12.5 * 16 * 4, width: 2 * 16 * 4, height: 2 * 16 * 4 }, // First door
      { id: "B", x: 20 * 16 * 4, y: 12.5 * 16 * 4, width: 2 * 16 * 4, height: 2 * 16 * 4 }, // Second door
      { id: "C", x: 24 * 16 * 4, y: 12.5 * 16 * 4, width: 2 * 16 * 4, height: 2 * 16 * 4 }, // Third door
      { id: "D", x: 26 * 16 * 4, y: 12.5 * 16 * 4, width: 2 * 16 * 4, height: 2 * 16 * 4 }, // Fourth door
    ];

    const player = this.player;

    doorPositions.forEach((doorPos) => {
      // Create invisible sprite for collision
      const doorCollider = this.physics.add.sprite(
        doorPos.x,
        doorPos.y,
        ""
      );
      doorCollider.setDisplaySize(doorPos.width, doorPos.height);
      doorCollider.setVisible(false); // Set to true to debug door positions
      doorCollider.setImmovable(true);
      doorCollider.body?.setSize(doorPos.width, doorPos.height);
      
      // Debug: Add a text label above each door
      const label = this.add.text(doorPos.x, doorPos.y - 40, `Door ${doorPos.id}`, {
        fontSize: "32px",
        color: "#ffff00",
        fontFamily: "Arial",
        stroke: "#000000",
        strokeThickness: 4,
      });
      label.setOrigin(0.5);

      this.doorColliders.set(doorPos.id, doorCollider);

      // Create collider with player (initially disabled)
      const collider = this.physics.add.collider(player, doorCollider);
      collider.active = false; // Start with doors passable
      this.doorColliderObjects.push(collider);
    });

    console.log("🚪 Door colliders created:", this.doorColliders.size);
  }
  
  private handleQuestion(data: QuestionData): void {
    console.log("Question received:", data);
    this.isQuestionActive = true;
    this.correctDoor = null;
    
    // Show question UI
    this.questionUI.show(data);
    
    // Make all doors impassable during question phase
    this.setAllDoorsImpassable();
  }
  
  private handleAnswerReveal(data: any): void {
    this.correctDoor = data.correctAnswer;
    this.isQuestionActive = false;
    
    // Hide question UI
    this.questionUI.hide();
    
    // Make only the correct door passable
    if (this.correctDoor) {
      this.setDoorPassability(this.correctDoor, true);
      console.log(`✅ Correct answer: Door ${this.correctDoor} is now passable`);
    }
  }
  
  private setAllDoorsImpassable(): void {
    console.log("🚪 Blocking all doors");
    this.doorColliderObjects.forEach((collider) => {
      collider.active = true;
    });
  }
  
  private setAllDoorsPassable(): void {
    console.log("🚪 Opening all doors");
    this.doorColliderObjects.forEach((collider) => {
      collider.active = false;
    });
  }
  
  private setDoorPassability(doorLetter: string, passable: boolean): void {
    console.log(`🚪 Setting door ${doorLetter} to ${passable ? "passable" : "blocked"}`);
    
    this.doorColliders.forEach((_sprite, id) => {
      const colliderIndex = Array.from(this.doorColliders.keys()).indexOf(id);
      const collider = this.doorColliderObjects[colliderIndex];
      
      if (id === doorLetter) {
        // This is the correct door - make it passable or not
        collider.active = !passable;
      } else {
        // Wrong doors - keep blocked
        collider.active = true;
      }
    });
  }

  update(time: number, _delta: number): void {
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
    
    // Update question UI timer (delta is in milliseconds)
    if (this.isQuestionActive) {
      this.questionUI.update(_delta);
    }
  }
}
