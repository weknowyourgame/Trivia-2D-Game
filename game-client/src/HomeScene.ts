import Phaser from "phaser";

export default class HomeScene extends Phaser.Scene {
  private music?: Phaser.Sound.BaseSound;

  constructor() {
    super({ key: "HomeScene" });
  }

  preload(): void {
    this.load.image("homeBackground", "/assets/Dark_Background.png");
    this.load.image("arabianNightsLogo", "/assets/Arabian_Nights.png");
    this.load.audio("ost", "/assets/ost.mp3");
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // Start background music if not already playing
    const existingMusic = this.sound.get("ost");
    if (!existingMusic) {
      this.music = this.sound.add("ost", {
        volume: 0.3,
        loop: true,
      });
      this.music.play();
    } else {
      this.music = existingMusic;
    }

    // Add background
    const bg = this.add.image(width / 2, height / 2, "homeBackground");
    bg.setDisplaySize(width, height);

    // Add dark overlay for better contrast
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.5);

    // Calculate center with padding
    const centerX = width / 2;
    const centerY = height / 2;

    // Add stylized logo - centered with padding from top
    const logo = this.add.image(centerX, centerY - 150, "arabianNightsLogo");
    logo.setOrigin(0.5, 0.5);
    logo.setScale(0.5);

    // Menu items - centered below logo
    const menuStartY = centerY + 150;
    const spacing = 45;

    this.createMenuItem(centerX, menuStartY, "START GAME", () =>
      this.startGame("start")
    );
    this.createMenuItem(centerX, menuStartY + spacing, "OPTIONS", () =>
      this.showSettings()
    );
    this.createMenuItem(centerX, menuStartY + spacing * 2, "ACHIEVEMENTS", () =>
      this.showLeaderboards()
    );
    this.createMenuItem(centerX, menuStartY + spacing * 3, "EXTRAS", () =>
      this.quitGame()
    );
  }

  private createMenuItem(
    x: number,
    y: number,
    text: string,
    callback: () => void
  ): void {
    const menuText = this.add
      .text(x, y, text, {
        fontSize: "32px",
        color: "#C4B5A0",
        fontFamily: "Cinzel, Georgia, serif",
        align: "center",
        shadow: {
          offsetX: 2,
          offsetY: 2,
          color: "#000000",
          blur: 3,
          fill: true,
        },
      })
      .setOrigin(0.5);

    menuText.setInteractive({ useHandCursor: true });

    menuText.on("pointerover", () => {
      menuText.setColor("#FFFFFF");
      menuText.setScale(1.05);
    });

    menuText.on("pointerout", () => {
      menuText.setColor("#D4C5A0");
      menuText.setScale(1);
    });

    menuText.on("pointerdown", () => {
      menuText.setScale(0.98);
    });

    menuText.on("pointerup", () => {
      menuText.setScale(1.05);
      callback();
    });
  }

  private startGame(mode: string): void {
    console.log(`Starting ${mode} mode`);

    // Store mode in localStorage
    localStorage.setItem("gameMode", mode);
    localStorage.setItem("playerUsername", "Adventurer");

    // Fade out camera
    this.cameras.main.fadeOut(1000, 0, 0, 0);

    // Start the game scene after fade
    this.cameras.main.once("camerafadeoutcomplete", () => {
      this.scene.start("GameScene");
    });
  }

  private showLeaderboards(): void {
    console.log("Show leaderboards");
    // TODO: Implement leaderboards scene
  }

  private showSettings(): void {
    console.log("Show settings");
    // TODO: Implement settings menu
  }

  private quitGame(): void {
    console.log("Quit game");
    // In a real app, this would close the window or return to main menu
    window.close();
  }
}
