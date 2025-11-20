import Phaser from 'phaser';

export class RemotePlayer {
  public sprite: Phaser.GameObjects.Sprite;
  public nameText: Phaser.GameObjects.Text;
  private playerId: string;
  private character: string;
  private targetPosition: { x: number; y: number };
  private lastUpdateTime: number;

  constructor(
    scene: Phaser.Scene,
    playerId: string,
    username: string,
    character: string,
    position: { x: number; y: number }
  ) {
    this.playerId = playerId;
    this.character = character;
    this.targetPosition = { ...position };
    this.lastUpdateTime = Date.now();

    // Create sprite at position
    this.sprite = scene.add.sprite(position.x, position.y, 'player');
    this.sprite.setScale(5);
    this.sprite.setData('playerId', playerId);
    this.sprite.setData('character', character);

    // Create name text above sprite
    this.nameText = scene.add.text(position.x, position.y - 50, username, {
      fontSize: '12px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 4, y: 2 }
    });
    this.nameText.setOrigin(0.5, 0.5);

    // Set initial animation state to 'down' and pause
    this.sprite.play('down');
    this.sprite.anims.pause();
  }

  updatePosition(newPosition: { x: number; y: number }, timestamp: number): void {
    // Discard out-of-order updates
    if (timestamp < this.lastUpdateTime) {
      return;
    }

    this.targetPosition = { ...newPosition };
    this.lastUpdateTime = timestamp;
  }

  update(): void {
    // Smooth interpolation to target position using lerp factor of 0.2
    const lerpFactor = 0.2;
    const dx = this.targetPosition.x - this.sprite.x;
    const dy = this.targetPosition.y - this.sprite.y;

    // Only interpolate if distance is greater than 1 pixel
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
      this.sprite.x += dx * lerpFactor;
      this.sprite.y += dy * lerpFactor;

      // Update animation based on movement direction
      this.updateAnimation(dx, dy);
    } else {
      // Pause animation when sprite is close to target position (within 1 pixel)
      this.sprite.anims.pause();
    }

    // Update nameText position to follow sprite
    this.nameText.setPosition(this.sprite.x, this.sprite.y - 50);
  }

  private updateAnimation(dx: number, dy: number): void {
    let direction = 'down';

    // Calculate angle from movement delta
    const angle = Math.atan2(dy, dx);
    const degrees = angle * (180 / Math.PI);

    // Determine direction based on angle
    if (degrees >= -22.5 && degrees < 22.5) direction = 'right';
    else if (degrees >= 22.5 && degrees < 67.5) direction = 'down-right';
    else if (degrees >= 67.5 && degrees < 112.5) direction = 'down';
    else if (degrees >= 112.5 && degrees < 157.5) direction = 'down-left';
    else if (degrees >= 157.5 || degrees < -157.5) direction = 'left';
    else if (degrees >= -157.5 && degrees < -112.5) direction = 'up-left';
    else if (degrees >= -112.5 && degrees < -67.5) direction = 'up';
    else if (degrees >= -67.5 && degrees < -22.5) direction = 'up-right';

    // Play appropriate directional animation
    if (this.sprite.anims.currentAnim?.key !== direction) {
      this.sprite.play(direction);
    }
    this.sprite.anims.resume();
  }

  destroy(): void {
    // Remove sprite and nameText from scene to prevent memory leaks
    this.sprite.destroy();
    this.nameText.destroy();
  }
}
