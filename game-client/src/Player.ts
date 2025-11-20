import Phaser from "phaser";

export type CharacterType = "ninja" | "monkey";

export default class Player {
  private scene: Phaser.Scene;
  private sprite: Phaser.Physics.Arcade.Sprite;
  private cursors: any;
  private characterType: CharacterType;
  
  // Movement properties
  private speed: number = 180;
  private dashSpeed: number = 380;
  private walkCycle: number = 0; // Smooth walk cycle 0-1
  private facing: "up" | "down" | "left" | "right" = "down";
  
  // Dash system
  private dashTimer: number = 0;
  private dashDuration: number = 0.4; // seconds
  private dashCooldown: number = 2.5; // seconds
  private isDashReady: boolean = true;
  private positionBuffer: Array<{ x: number; y: number }> = [];
  
  // Input tracking
  private isMoving: boolean = false;
  private lastMoveTime: number = 0;
  private spaceKey: Phaser.Input.Keyboard.Key;
  private shiftKey: Phaser.Input.Keyboard.Key;
  
  constructor(scene: Phaser.Scene, x: number, y: number, characterType: CharacterType = "ninja") {
    this.scene = scene;
    this.characterType = characterType;
    
    // Create sprite with physics
    const spriteKey = characterType === "ninja" ? "tiles" : "player";
    this.sprite = scene.physics.add.sprite(x, y, spriteKey);
    this.sprite.setScale(5);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setSize(8, 8); // Collision box smaller than sprite
    this.sprite.setOffset(4, 4);
    
    // Set up input
    this.cursors = scene.input.keyboard?.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });
    
    this.spaceKey = scene.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    );
    this.shiftKey = scene.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.SHIFT
    );
    
    // Create animations for walking
    this.createAnimations();
  }
  
  private createAnimations(): void {
    // Animations are handled manually in updateSprite for precise control
    // tiles.png row 4 layout: 0,1=updown, 2,3=downwalk, 4=dash, 5,6=dashside, 7=idle
  }
  
  public isDashing(): boolean {
    return this.dashTimer > 0;
  }
  
  public update(time: number, delta: number): void {
    const deltaSeconds = delta / 1000;
    
    // Update timers
    if (this.dashTimer > 0) {
      this.dashTimer -= deltaSeconds;
      if (this.dashTimer < 0) this.dashTimer = 0;
    }
    
    // Check for dash input
    if (
      (Phaser.Input.Keyboard.JustDown(this.spaceKey) ||
        Phaser.Input.Keyboard.JustDown(this.shiftKey)) &&
      this.isDashReady &&
      !this.isDashing()
    ) {
      this.startDash();
    }
    
    // Handle movement input
    let moveX = 0;
    let moveY = 0;
    
    if (this.cursors.left.isDown) moveX -= 1;
    if (this.cursors.right.isDown) moveX += 1;
    if (this.cursors.up.isDown) moveY -= 1;
    if (this.cursors.down.isDown) moveY += 1;
    
    // Update facing direction (prioritize last pressed for better control)
    if (moveX !== 0 || moveY !== 0) {
      if (Math.abs(moveX) > Math.abs(moveY)) {
        this.facing = moveX > 0 ? "right" : "left";
      } else {
        this.facing = moveY > 0 ? "down" : "up";
      }
      this.isMoving = true;
      this.lastMoveTime = time;
    } else {
      this.isMoving = false;
    }
    
    // Normalize diagonal movement
    if (moveX !== 0 && moveY !== 0) {
      moveX *= 0.707;
      moveY *= 0.707;
    }
    
    // Calculate speed with smooth dash transition
    const currentSpeed = this.isDashing() ? this.dashSpeed : this.speed;
    
    // During dash, maintain direction
    if (this.isDashing()) {
      // Track position for trail
      if (time % 40 < delta) {
        this.positionBuffer.push({ x: this.sprite.x, y: this.sprite.y });
        if (this.positionBuffer.length > 15) this.positionBuffer.shift();
      }
      
      // If no input during dash, continue forward
      if (moveX === 0 && moveY === 0) {
        switch (this.facing) {
          case "left": moveX = -1; break;
          case "right": moveX = 1; break;
          case "up": moveY = -1; break;
          case "down": moveY = 1; break;
        }
      }
    } else {
      this.positionBuffer = [];
      
      // Dash cooldown check
      if (!this.isDashReady && this.dashTimer === 0) {
        this.isDashReady = true;
      }
    }
    
    // Apply velocity
    this.sprite.setVelocity(moveX * currentSpeed, moveY * currentSpeed);
    
    // Update walk cycle smoothly
    if (this.isMoving) {
      const cycleSpeed = this.isDashing() ? 0.12 : 0.05;
      this.walkCycle += deltaSeconds * cycleSpeed * 60;
      if (this.walkCycle >= 1) this.walkCycle -= 1;
    } else {
      // Smoothly reset to idle
      this.walkCycle = 0;
    }
    
    // Update sprite appearance
    this.updateSprite(time);
  }
  
  private updateSprite(time: number): void {
    if (this.characterType === "ninja") {
      this.updateNinjaSprite(time);
    } else {
      this.updateMonkeySprite(time);
    }
  }
  
  private updateNinjaSprite(time: number): void {
    const tileY = 4; // Character is on row 4
    let tileX = 0;
    let flipX = false;
    
    const dashing = this.isDashing();
    const idle = !this.isMoving && time - this.lastMoveTime > 100;
    const walkFrame = Math.floor(this.walkCycle * 2); // 0 or 1
    
    // Choose frame based on state and direction
    if (idle) {
      tileX = 7;
      flipX = false;
    } else if (dashing) {
      if (this.facing === "up" || this.facing === "down") {
        tileX = this.facing === "down" ? 5 : 4;
        flipX = false;
      } else {
        tileX = 4;
        flipX = this.facing === "left";
      }
    } else {
      switch (this.facing) {
        case "down":
          tileX = 2;
          flipX = walkFrame === 1;
          break;
        case "up":
          tileX = 3;
          flipX = walkFrame === 1;
          break;
        case "left":
          tileX = walkFrame;
          flipX = true;
          break;
        case "right":
          tileX = walkFrame;
          flipX = false;
          break;
      }
    }
    
    const frameIndex = tileX + tileY * 8;
    this.sprite.setFrame(frameIndex);
    this.sprite.setFlipX(flipX);
  }
  
  private updateMonkeySprite(_time: number): void {
    const walkFrame = Math.floor(this.walkCycle * 4); // 0-3 for 4 frames
    let frame = 0;
    
    // Monkey has 8 directions with 4 frames each (32 total frames)
    // Layout: down, down-left, left, up-left, up, up-right, right, down-right
    switch (this.facing) {
      case "down":
        frame = 0 + walkFrame;
        break;
      case "up":
        frame = 16 + walkFrame;
        break;
      case "left":
        frame = 8 + walkFrame;
        break;
      case "right":
        frame = 24 + walkFrame;
        break;
    }
    
    this.sprite.setFrame(frame);
    this.sprite.setFlipX(false);
  }
  
  private startDash(): void {
    this.dashTimer = this.dashDuration;
    this.isDashReady = false;
    
    // Play dash sound if available
    // this.scene.sound.play('dash');
  }
  
  public render(graphics: Phaser.GameObjects.Graphics): void {
    graphics.clear();
    
    // Render dash trail effect
    if (this.isDashing() && this.positionBuffer.length > 1) {
      for (let i = 0; i < this.positionBuffer.length; i++) {
        const pos = this.positionBuffer[i];
        const progress = i / this.positionBuffer.length;
        const alpha = progress * 0.6;
        const size = 10 + progress * 15;
        
        // Nice gradient trail
        graphics.fillStyle(0xaaddff, alpha);
        graphics.fillCircle(pos.x, pos.y, size);
      }
    }
  }
  
  public getSprite(): Phaser.Physics.Arcade.Sprite {
    return this.sprite;
  }
  
  public getPosition(): { x: number; y: number } {
    return { x: this.sprite.x, y: this.sprite.y };
  }
}

