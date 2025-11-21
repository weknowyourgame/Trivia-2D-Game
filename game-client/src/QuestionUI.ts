import Phaser from "phaser";

export interface QuestionData {
  questionId: string;
  text: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  roundNumber: number;
  totalRounds: number;
  timeLimit: number;
}

export class QuestionUI {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private questionText: Phaser.GameObjects.Text;
  private optionContainers: Map<string, Phaser.GameObjects.Container> = new Map();
  private optionBackgrounds: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private optionTexts: Map<string, Phaser.GameObjects.Text> = new Map();
  private timerText: Phaser.GameObjects.Text;
  private timerBar: Phaser.GameObjects.Graphics;
  private background: Phaser.GameObjects.Graphics;
  private roundBadge: Phaser.GameObjects.Graphics;
  private roundText: Phaser.GameObjects.Text;
  private timeRemaining: number = 0;
  private timeLimit: number = 0;
  private isVisible: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0);
    this.container.setScrollFactor(0);
    this.container.setDepth(100000); // Very high depth to appear on top of everything
    this.container.setVisible(false);

    // Main background
    this.background = scene.add.graphics();
    this.container.add(this.background);

    // Round badge
    this.roundBadge = scene.add.graphics();
    this.container.add(this.roundBadge);

    // Round text
    this.roundText = scene.add.text(0, 0, "", {
      fontSize: "14px",
      color: "#ffffff",
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      fontStyle: "600",
    });
    this.roundText.setOrigin(0.5, 0.5);
    this.container.add(this.roundText);

    // Question text
    this.questionText = scene.add.text(0, 0, "", {
      fontSize: "32px",
      color: "#ffffff",
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      fontStyle: "700",
      align: "center",
      wordWrap: { width: 900 },
      lineSpacing: 10,
    });
    this.questionText.setOrigin(0.5, 0);
    this.container.add(this.questionText);

    // Create clean option cards
    const doorLabels = ["A", "B", "C", "D"];

    doorLabels.forEach((door) => {
      const optionContainer = scene.add.container(0, 0);
      const optionBg = scene.add.graphics();
      
      const optionText = scene.add.text(0, 0, "", {
        fontSize: "22px",
        color: "#ffffff",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        fontStyle: "500",
        wordWrap: { width: 800 },
        lineSpacing: 6,
      });
      optionText.setOrigin(0, 0.5);
      
      optionContainer.add([optionBg, optionText]);
      
      this.optionContainers.set(door, optionContainer);
      this.optionBackgrounds.set(door, optionBg);
      this.optionTexts.set(door, optionText);
      this.container.add(optionContainer);
    });

    // Timer bar
    this.timerBar = scene.add.graphics();
    this.container.add(this.timerBar);

    // Timer text
    this.timerText = scene.add.text(0, 0, "", {
      fontSize: "20px",
      color: "#ffffff",
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      fontStyle: "600",
    });
    this.timerText.setOrigin(0.5, 0.5);
    this.container.add(this.timerText);
  }

  show(questionData: QuestionData): void {
    this.isVisible = true;
    // Convert timeLimit from seconds to milliseconds
    this.timeLimit = questionData.timeLimit * 1000;
    this.timeRemaining = questionData.timeLimit * 1000;

    const camera = this.scene.cameras.main;
    const centerX = camera.width / 2;

    // Dark Arabian night sky background
    this.background.clear();
    this.background.fillStyle(0x0a0612, 0.92);
    this.background.fillRect(0, 0, camera.width, camera.height);

    // Draw ornate round badge with golden Arabian style
    const badgeWidth = 140;
    const badgeHeight = 40;
    const badgeX = centerX - badgeWidth / 2;
    const badgeY = 40;

    this.roundBadge.clear();
    
    // Gold outer glow
    this.roundBadge.fillStyle(0xd4a574, 0.4);
    this.roundBadge.fillRoundedRect(badgeX - 3, badgeY - 3, badgeWidth + 6, badgeHeight + 6, 20);
    
    // Rich purple/burgundy background
    this.roundBadge.fillStyle(0x4a1942, 1);
    this.roundBadge.fillRoundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 18);
    
    // Golden border
    this.roundBadge.lineStyle(3, 0xd4a574, 1);
    this.roundBadge.strokeRoundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 18);
    
    this.roundText.setText(`ROUND ${questionData.roundNumber}/${questionData.totalRounds}`);
    this.roundText.setPosition(centerX, badgeY + badgeHeight / 2);
    this.roundText.setColor("#d4a574");

    // Position question text (larger, more prominent)
    this.questionText.setText(questionData.text);
    this.questionText.setPosition(centerX, 120);
    this.questionText.setColor("#f5e6d3");

    // Position option cards with Arabian style
    const doorLabels = ["A", "B", "C", "D"];
    const optionStartY = 220;
    const optionSpacing = 90;

    doorLabels.forEach((door, index) => {
      const container = this.optionContainers.get(door)!;
      const bg = this.optionBackgrounds.get(door)!;
      const text = this.optionTexts.get(door)!;
      
      const yPos = optionStartY + index * optionSpacing;
      const optionWidth = 900;
      const optionHeight = 75;
      const optionX = centerX - optionWidth / 2;
      
      container.setPosition(optionX, yPos);
      
      bg.clear();
      
      // Shadow
      bg.fillStyle(0x000000, 0.5);
      bg.fillRoundedRect(3, 5, optionWidth, optionHeight, 10);
      
      // Main card background - rich brown like wooden door
      bg.fillStyle(0x2d1810, 0.95);
      bg.fillRoundedRect(0, 0, optionWidth, optionHeight, 10);
      
      // Ornate golden left border (Arabian style)
      bg.fillStyle(0xd4a574, 1);
      bg.fillRoundedRect(0, 0, 8, optionHeight, { tl: 10, tr: 0, bl: 10, br: 0 });
      
      // Add decorative pattern on left border
      bg.fillStyle(0xb8935c, 1);
      bg.fillRoundedRect(0, 0, 4, optionHeight, { tl: 10, tr: 0, bl: 10, br: 0 });
      
      // Door label background - golden brass circle
      bg.fillStyle(0xd4a574, 1);
      bg.fillCircle(45, optionHeight / 2, 24);
      
      // Inner circle detail
      bg.fillStyle(0xb8935c, 1);
      bg.fillCircle(45, optionHeight / 2, 20);
      
      bg.lineStyle(2, 0xf0d9a8, 0.8);
      bg.strokeCircle(45, optionHeight / 2, 24);
      
      // Door letter
      const doorLabel = this.scene.add.text(45, optionHeight / 2, door, {
        fontSize: "28px",
        color: "#2d1810",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        fontStyle: "900",
      });
      doorLabel.setOrigin(0.5, 0.5);
      container.add(doorLabel);
      
      // Option text - sandy tan color
      text.setText(questionData.options[door as keyof typeof questionData.options]);
      text.setPosition(85, optionHeight / 2);
      text.setColor("#f5e6d3");
      
      // Ornate border with golden highlights
      bg.lineStyle(2, 0xd4a574, 0.5);
      bg.strokeRoundedRect(0, 0, optionWidth, optionHeight, 10);
      
      // Inner highlight
      bg.lineStyle(1, 0xf0d9a8, 0.3);
      bg.strokeRoundedRect(2, 2, optionWidth - 4, optionHeight - 4, 9);
    });

    // Timer at bottom
    const timerY = optionStartY + doorLabels.length * optionSpacing + 40;
    this.timerText.setPosition(centerX, timerY);

    // Smooth fade in animation
    this.container.setVisible(true);
    this.container.setAlpha(0);
    
    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      duration: 300,
      ease: 'Power2'
    });
  }

  hide(): void {
    this.isVisible = false;
    
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      duration: 200,
      ease: 'Power2',
      onComplete: () => {
        this.container.setVisible(false);
      }
    });
  }

  update(deltaMs: number): void {
    if (!this.isVisible) return;

    this.timeRemaining -= deltaMs;
    if (this.timeRemaining < 0) this.timeRemaining = 0;

    const secondsLeft = Math.ceil(this.timeRemaining / 1000);
    const progress = this.timeRemaining / this.timeLimit;

    // Update timer text with Arabian themed colors
    this.timerText.setText(`${secondsLeft}s`);
    
    // Color and pulse based on urgency
    if (progress <= 0.25) {
      this.timerText.setColor("#ff6b4a"); // Warm red
      const scale = 1 + Math.sin(Date.now() / 200) * 0.15;
      this.timerText.setScale(scale);
    } else if (progress <= 0.5) {
      this.timerText.setColor("#f0a830"); // Warm orange/gold
      this.timerText.setScale(1);
    } else {
      this.timerText.setColor("#d4a574"); // Golden tan
      this.timerText.setScale(1);
    }

    // Update timer bar with Arabian theme
    const camera = this.scene.cameras.main;
    const centerX = camera.width / 2;
    const doorLabels = ["A", "B", "C", "D"];
    const optionStartY = 220;
    const optionSpacing = 90;
    const barY = optionStartY + doorLabels.length * optionSpacing + 60;
    const barWidth = 500;
    const barHeight = 10;

    this.timerBar.clear();
    
    // Dark background with shadow
    this.timerBar.fillStyle(0x000000, 0.3);
    this.timerBar.fillRoundedRect(centerX - barWidth / 2 + 2, barY + 2, barWidth, barHeight, 5);
    
    this.timerBar.fillStyle(0x2d1810, 1);
    this.timerBar.fillRoundedRect(centerX - barWidth / 2, barY, barWidth, barHeight, 5);
    
    // Golden border
    this.timerBar.lineStyle(2, 0xb8935c, 0.6);
    this.timerBar.strokeRoundedRect(centerX - barWidth / 2, barY, barWidth, barHeight, 5);
    
    // Progress bar with Arabian colors
    let barColor = 0xd4a574; // Golden
    let glowColor = 0xf0d9a8;
    if (progress <= 0.5) {
      barColor = 0xf0a830; // Orange/amber
      glowColor = 0xffd580;
    }
    if (progress <= 0.25) {
      barColor = 0xff6b4a; // Warm red
      glowColor = 0xff9980;
    }
    
    // Glow effect
    this.timerBar.fillStyle(glowColor, 0.3);
    this.timerBar.fillRoundedRect(
      centerX - barWidth / 2,
      barY - 1,
      barWidth * progress,
      barHeight + 2,
      5
    );
    
    // Main progress bar
    this.timerBar.fillStyle(barColor, 1);
    this.timerBar.fillRoundedRect(
      centerX - barWidth / 2,
      barY,
      barWidth * progress,
      barHeight,
      5
    );
  }

  destroy(): void {
    this.container.destroy();
  }
}
