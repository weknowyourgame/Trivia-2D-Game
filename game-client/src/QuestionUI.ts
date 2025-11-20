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
  private optionTexts: Map<string, Phaser.GameObjects.Text> = new Map();
  private timerText: Phaser.GameObjects.Text;
  private timerBar: Phaser.GameObjects.Graphics;
  private background: Phaser.GameObjects.Graphics;
  private timeRemaining: number = 0;
  private timeLimit: number = 0;
  private isVisible: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0);
    this.container.setScrollFactor(0);
    this.container.setDepth(1000);
    this.container.setVisible(false);

    // Create background
    this.background = scene.add.graphics();
    this.container.add(this.background);

    // Create question text
    this.questionText = scene.add.text(0, 0, "", {
      fontSize: "24px",
      color: "#ffffff",
      fontFamily: "Arial",
      align: "center",
      wordWrap: { width: 700 },
    });
    this.questionText.setOrigin(0.5, 0);
    this.container.add(this.questionText);

    // Create option texts
    const doorLabels = ["A", "B", "C", "D"];
    doorLabels.forEach((door) => {
      const optionText = scene.add.text(0, 0, "", {
        fontSize: "18px",
        color: "#ffffff",
        fontFamily: "Arial",
        backgroundColor: "#333333",
        padding: { x: 15, y: 10 },
      });
      optionText.setOrigin(0, 0);
      this.optionTexts.set(door, optionText);
      this.container.add(optionText);
    });

    // Create timer bar
    this.timerBar = scene.add.graphics();
    this.container.add(this.timerBar);

    // Create timer text
    this.timerText = scene.add.text(0, 0, "", {
      fontSize: "20px",
      color: "#ffff00",
      fontFamily: "Arial",
      fontStyle: "bold",
    });
    this.timerText.setOrigin(0.5, 0);
    this.container.add(this.timerText);
  }

  show(questionData: QuestionData): void {
    this.isVisible = true;
    this.timeLimit = questionData.timeLimit;
    this.timeRemaining = questionData.timeLimit;

    const camera = this.scene.cameras.main;
    const centerX = camera.width / 2;
    const centerY = camera.height / 2;

    // Draw background
    this.background.clear();
    this.background.fillStyle(0x000000, 0.85);
    this.background.fillRoundedRect(
      centerX - 400,
      centerY - 250,
      800,
      500,
      10
    );
    this.background.lineStyle(3, 0xffd700);
    this.background.strokeRoundedRect(
      centerX - 400,
      centerY - 250,
      800,
      500,
      10
    );

    // Position question text
    this.questionText.setText(questionData.text);
    this.questionText.setPosition(centerX, centerY - 220);

    // Position option texts
    const doorLabels = ["A", "B", "C", "D"];
    doorLabels.forEach((door, index) => {
      const optionText = this.optionTexts.get(door)!;
      const yPos = centerY - 120 + index * 70;
      optionText.setText(`Door ${door}: ${questionData.options[door as keyof typeof questionData.options]}`);
      optionText.setPosition(centerX - 350, yPos);
    });

    // Position timer
    this.timerText.setPosition(centerX, centerY + 200);

    this.container.setVisible(true);
  }

  hide(): void {
    this.isVisible = false;
    this.container.setVisible(false);
  }

  update(deltaMs: number): void {
    if (!this.isVisible) return;

    // deltaMs is in milliseconds from Phaser
    this.timeRemaining -= deltaMs;
    if (this.timeRemaining < 0) this.timeRemaining = 0;

    const secondsLeft = Math.ceil(this.timeRemaining / 1000);
    this.timerText.setText(`Time: ${secondsLeft}s`);

    // Update timer bar
    const camera = this.scene.cameras.main;
    const centerX = camera.width / 2;
    const centerY = camera.height / 2;
    const barWidth = 700;
    const barHeight = 20;
    const progress = this.timeRemaining / this.timeLimit;

    this.timerBar.clear();
    
    // Background bar
    this.timerBar.fillStyle(0x333333);
    this.timerBar.fillRect(centerX - barWidth / 2, centerY + 160, barWidth, barHeight);
    
    // Progress bar (color changes based on time)
    let barColor = 0x00ff00; // Green
    if (progress < 0.5) barColor = 0xffaa00; // Orange
    if (progress < 0.25) barColor = 0xff0000; // Red
    
    this.timerBar.fillStyle(barColor);
    this.timerBar.fillRect(
      centerX - barWidth / 2,
      centerY + 160,
      barWidth * progress,
      barHeight
    );
  }

  destroy(): void {
    this.container.destroy();
  }
}
