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
    this.createMenuItem(centerX, menuStartY + spacing * 2, "HOW TO PLAY", () =>
      this.showHowToPlay()
    );
    this.createMenuItem(centerX, menuStartY + spacing * 3, "EXIT", () =>
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

  private showHowToPlay(): void {
    console.log("Show how to play");
    
    const { width, height } = this.cameras.main;
    
    // Create dark overlay
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.9);
    overlay.setDepth(100);
    
    // Title
    const title = this.add.text(width / 2, 80, "HOW TO PLAY", {
      fontSize: "48px",
      color: "#FFD700",
      fontFamily: "Cinzel, Georgia, serif",
      align: "center",
      shadow: {
        offsetX: 3,
        offsetY: 3,
        color: "#000000",
        blur: 5,
        fill: true,
      },
    }).setOrigin(0.5).setDepth(101);
    
    // Instructions
    const instructions = [
      "OBJECTIVE",
      "Answer questions correctly to progress through the dungeon!",
      "",
      "GAMEPLAY",
      "• You will encounter 4 doors labeled A, B, C, and D",
      "• A question will appear with 4 possible answers",
      "• Choose the correct door to advance",
      "• Last player to pick the right answer gets eliminated",
      "",
      "SURVIVAL",
      "• You have 3 lives (hearts shown at top)",
      "• Avoid enemies like slimes and bats",
      "• Take too much damage and it's game over!",
      "",
      "Press ESC or click below to return to menu"
    ];
    
    const instructionText = this.add.text(width / 2, height / 2 - 20, instructions.join("\n"), {
      fontSize: "24px",
      color: "#D4C5A0",
      fontFamily: "Cinzel, Georgia, serif",
      align: "center",
      lineSpacing: 10,
      shadow: {
        offsetX: 2,
        offsetY: 2,
        color: "#000000",
        blur: 3,
        fill: true,
      },
    }).setOrigin(0.5).setDepth(101);
    
    // Close button
    const closeButton = this.add.text(width / 2, height - 100, "BACK TO MENU", {
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
    }).setOrigin(0.5).setDepth(101);
    
    closeButton.setInteractive({ useHandCursor: true });
    
    closeButton.on("pointerover", () => {
      closeButton.setColor("#FFFFFF");
      closeButton.setScale(1.05);
    });
    
    closeButton.on("pointerout", () => {
      closeButton.setColor("#C4B5A0");
      closeButton.setScale(1);
    });
    
    closeButton.on("pointerdown", () => {
      overlay.destroy();
      title.destroy();
      instructionText.destroy();
      closeButton.destroy();
    });
    
    // ESC key to close
    this.input.keyboard?.once("keydown-ESC", () => {
      overlay.destroy();
      title.destroy();
      instructionText.destroy();
      closeButton.destroy();
    });
  }

  private showSettings(): void {
    console.log("Show settings");
    
    const { width, height } = this.cameras.main;
    
    // Create dark overlay
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.9);
    overlay.setDepth(100);
    
    // Title
    const title = this.add.text(width / 2, 100, "SOUND SETTINGS", {
      fontSize: "48px",
      color: "#FFD700",
      fontFamily: "Cinzel, Georgia, serif",
      align: "center",
      shadow: {
        offsetX: 3,
        offsetY: 3,
        color: "#000000",
        blur: 5,
        fill: true,
      },
    }).setOrigin(0.5).setDepth(101);
    
    // Get current volume - cast to HTML5AudioSound which has volume property
    const music = this.music as Phaser.Sound.HTML5AudioSound | Phaser.Sound.WebAudioSound;
    const currentVolume = music?.volume || 0.3;
    
    // Volume label
    const volumeLabel = this.add.text(width / 2, height / 2 - 50, "Music Volume", {
      fontSize: "32px",
      color: "#D4C5A0",
      fontFamily: "Cinzel, Georgia, serif",
      align: "center",
    }).setOrigin(0.5).setDepth(101);
    
    // Volume percentage
    const volumePercent = this.add.text(width / 2, height / 2, `${Math.round(currentVolume * 100)}%`, {
      fontSize: "48px",
      color: "#FFFFFF",
      fontFamily: "Cinzel, Georgia, serif",
      align: "center",
    }).setOrigin(0.5).setDepth(101);
    
    // Volume buttons
    const buttonY = height / 2 + 80;
    const buttonSpacing = 150;
    
    // Decrease button
    const decreaseButton = this.add.text(width / 2 - buttonSpacing, buttonY, "-", {
      fontSize: "64px",
      color: "#C4B5A0",
      fontFamily: "Cinzel, Georgia, serif",
    }).setOrigin(0.5).setDepth(101);
    
    decreaseButton.setInteractive({ useHandCursor: true });
    decreaseButton.on("pointerover", () => {
      decreaseButton.setColor("#FFFFFF");
      decreaseButton.setScale(1.1);
    });
    decreaseButton.on("pointerout", () => {
      decreaseButton.setColor("#C4B5A0");
      decreaseButton.setScale(1);
    });
    decreaseButton.on("pointerdown", () => {
      const music = this.music as Phaser.Sound.HTML5AudioSound | Phaser.Sound.WebAudioSound;
      if (music) {
        const newVolume = Math.max(0, music.volume - 0.1);
        music.setVolume(newVolume);
        volumePercent.setText(`${Math.round(newVolume * 100)}%`);
      }
    });
    
    // Increase button
    const increaseButton = this.add.text(width / 2 + buttonSpacing, buttonY, "+", {
      fontSize: "64px",
      color: "#C4B5A0",
      fontFamily: "Cinzel, Georgia, serif",
    }).setOrigin(0.5).setDepth(101);
    
    increaseButton.setInteractive({ useHandCursor: true });
    increaseButton.on("pointerover", () => {
      increaseButton.setColor("#FFFFFF");
      increaseButton.setScale(1.1);
    });
    increaseButton.on("pointerout", () => {
      increaseButton.setColor("#C4B5A0");
      increaseButton.setScale(1);
    });
    increaseButton.on("pointerdown", () => {
      const music = this.music as Phaser.Sound.HTML5AudioSound | Phaser.Sound.WebAudioSound;
      if (music) {
        const newVolume = Math.min(1, music.volume + 0.1);
        music.setVolume(newVolume);
        volumePercent.setText(`${Math.round(newVolume * 100)}%`);
      }
    });
    
    // Mute/Unmute button
    let isMuted = false;
    let previousVolume = currentVolume;
    
    const muteButton = this.add.text(width / 2, buttonY + 100, "MUTE", {
      fontSize: "32px",
      color: "#C4B5A0",
      fontFamily: "Cinzel, Georgia, serif",
      align: "center",
    }).setOrigin(0.5).setDepth(101);
    
    muteButton.setInteractive({ useHandCursor: true });
    muteButton.on("pointerover", () => {
      muteButton.setColor("#FFFFFF");
      muteButton.setScale(1.05);
    });
    muteButton.on("pointerout", () => {
      muteButton.setColor("#C4B5A0");
      muteButton.setScale(1);
    });
    muteButton.on("pointerdown", () => {
      const music = this.music as Phaser.Sound.HTML5AudioSound | Phaser.Sound.WebAudioSound;
      if (music) {
        if (isMuted) {
          music.setVolume(previousVolume);
          volumePercent.setText(`${Math.round(previousVolume * 100)}%`);
          muteButton.setText("MUTE");
          isMuted = false;
        } else {
          previousVolume = music.volume;
          music.setVolume(0);
          volumePercent.setText("0%");
          muteButton.setText("UNMUTE");
          isMuted = true;
        }
      }
    });
    
    // Close button
    const closeButton = this.add.text(width / 2, height - 80, "BACK TO MENU", {
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
    }).setOrigin(0.5).setDepth(101);
    
    closeButton.setInteractive({ useHandCursor: true });
    closeButton.on("pointerover", () => {
      closeButton.setColor("#FFFFFF");
      closeButton.setScale(1.05);
    });
    closeButton.on("pointerout", () => {
      closeButton.setColor("#C4B5A0");
      closeButton.setScale(1);
    });
    
    const destroyAll = () => {
      overlay.destroy();
      title.destroy();
      volumeLabel.destroy();
      volumePercent.destroy();
      decreaseButton.destroy();
      increaseButton.destroy();
      muteButton.destroy();
      closeButton.destroy();
    };
    
    closeButton.on("pointerdown", destroyAll);
    
    // ESC key to close
    this.input.keyboard?.once("keydown-ESC", destroyAll);
  }

  private quitGame(): void {
    console.log("Quit game");
    // In a real app, this would close the window or return to main menu
    window.close();
  }
}
