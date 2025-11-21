import Phaser from "phaser";

export interface LeaderboardData {
  playerId: string;
  username: string;
  character: string;
  score: number;
  correctAnswers: number;
  rank: number;
}

export class LeaderboardUI {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private background: Phaser.GameObjects.Graphics;
  private titleText: Phaser.GameObjects.Text;
  private entryContainers: Phaser.GameObjects.Container[] = [];
  private maxEntries: number = 5;
  private currentPlayerId: string | null = null;
  private width: number = 280;
  private entryHeight: number = 45;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0);
    this.container.setScrollFactor(0);
    this.container.setDepth(900); // Below question UI (1000) but above game elements
    this.container.setVisible(false);

    // Background
    this.background = scene.add.graphics();
    this.container.add(this.background);

    // Title
    this.titleText = scene.add.text(0, 0, "👑 LEADERBOARD", {
      fontSize: "18px",
      color: "#d4a574",
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      fontStyle: "700",
    });
    this.titleText.setOrigin(0.5, 0);
    this.container.add(this.titleText);

    // Create entry containers (reusable)
    for (let i = 0; i < this.maxEntries; i++) {
      const entryContainer = scene.add.container(0, 0);
      this.entryContainers.push(entryContainer);
      this.container.add(entryContainer);
    }

    this.updatePosition();
  }

  setCurrentPlayer(playerId: string): void {
    this.currentPlayerId = playerId;
  }

  show(): void {
    this.container.setVisible(true);
    this.container.setAlpha(0);

    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      duration: 300,
      ease: "Power2",
    });
  }

  hide(): void {
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      duration: 200,
      ease: "Power2",
      onComplete: () => {
        this.container.setVisible(false);
      },
    });
  }

  updateLeaderboard(leaderboard: LeaderboardData[]): void {
    // Take top N entries
    const topEntries = leaderboard.slice(0, this.maxEntries);

    // Draw background
    this.drawBackground(topEntries.length);

    // Update entries
    topEntries.forEach((entry, index) => {
      this.drawEntry(entry, index);
    });

    // Hide unused entry containers
    for (let i = topEntries.length; i < this.maxEntries; i++) {
      this.entryContainers[i].removeAll(true);
    }
  }

  private drawBackground(entryCount: number): void {
    const padding = 15;
    const headerHeight = 40;
    const totalHeight = headerHeight + entryCount * this.entryHeight + padding;

    this.background.clear();

    // Shadow
    this.background.fillStyle(0x000000, 0.4);
    this.background.fillRoundedRect(5, 5, this.width, totalHeight, 12);

    // Main background - rich dark purple/burgundy (Arabian night theme)
    this.background.fillStyle(0x1a0a1f, 0.95);
    this.background.fillRoundedRect(0, 0, this.width, totalHeight, 12);

    // Golden border
    this.background.lineStyle(2, 0xd4a574, 0.8);
    this.background.strokeRoundedRect(0, 0, this.width, totalHeight, 12);

    // Header separator
    this.background.lineStyle(1, 0xd4a574, 0.4);
    this.background.lineBetween(padding, headerHeight - 5, this.width - padding, headerHeight - 5);

    // Update title position
    this.titleText.setPosition(this.width / 2, 12);
  }

  private drawEntry(entry: LeaderboardData, index: number): void {
    const container = this.entryContainers[index];
    container.removeAll(true);

    const padding = 15;
    const headerHeight = 40;
    const yPos = headerHeight + index * this.entryHeight;
    const isCurrentPlayer = entry.playerId === this.currentPlayerId;

    // Entry background (highlight current player)
    const entryBg = this.scene.add.graphics();
    if (isCurrentPlayer) {
      // Highlight current player with golden glow
      entryBg.fillStyle(0xd4a574, 0.2);
      entryBg.fillRoundedRect(padding - 5, 0, this.width - 2 * padding + 10, this.entryHeight - 5, 6);
      
      // Golden border
      entryBg.lineStyle(2, 0xd4a574, 0.6);
      entryBg.strokeRoundedRect(padding - 5, 0, this.width - 2 * padding + 10, this.entryHeight - 5, 6);
    } else {
      // Subtle separator
      entryBg.lineStyle(1, 0x4a1942, 0.3);
      entryBg.lineBetween(padding, this.entryHeight - 2, this.width - padding, this.entryHeight - 2);
    }
    container.add(entryBg);

    // Rank badge
    const rankBadge = this.scene.add.graphics();
    const rankSize = 28;
    const rankX = padding + 5;
    const rankY = this.entryHeight / 2;

    // Different colors for top 3
    let rankColor = 0x4a1942;
    let rankBorder = 0xd4a574;
    if (entry.rank === 1) {
      rankColor = 0xFFD700; // Gold
      rankBorder = 0xFFF8DC;
    } else if (entry.rank === 2) {
      rankColor = 0xC0C0C0; // Silver
      rankBorder = 0xE8E8E8;
    } else if (entry.rank === 3) {
      rankColor = 0xCD7F32; // Bronze
      rankBorder = 0xE8B887;
    }

    rankBadge.fillStyle(rankColor, 1);
    rankBadge.fillCircle(rankX, rankY, rankSize / 2);
    rankBadge.lineStyle(2, rankBorder, 1);
    rankBadge.strokeCircle(rankX, rankY, rankSize / 2);
    container.add(rankBadge);

    // Rank number
    const rankText = this.scene.add.text(rankX, rankY, `${entry.rank}`, {
      fontSize: entry.rank <= 3 ? "16px" : "14px",
      color: entry.rank <= 3 ? "#ffffff" : "#d4a574",
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      fontStyle: "900",
    });
    rankText.setOrigin(0.5, 0.5);
    container.add(rankText);

    // Username
    const usernameText = this.scene.add.text(rankX + rankSize, rankY - 6, entry.username, {
      fontSize: "15px",
      color: isCurrentPlayer ? "#f0d9a8" : "#f5e6d3",
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      fontStyle: isCurrentPlayer ? "700" : "500",
    });
    usernameText.setOrigin(0, 0.5);
    
    // Truncate long usernames
    const maxWidth = this.width - rankX - rankSize - padding - 80;
    if (usernameText.width > maxWidth) {
      let text = entry.username;
      while (usernameText.width > maxWidth && text.length > 0) {
        text = text.slice(0, -1);
        usernameText.setText(text + "...");
      }
    }
    container.add(usernameText);

    // Score
    const scoreText = this.scene.add.text(this.width - padding - 5, rankY - 6, `${entry.score}`, {
      fontSize: "16px",
      color: "#d4a574",
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      fontStyle: "700",
    });
    scoreText.setOrigin(1, 0.5);
    container.add(scoreText);

    // Correct answers indicator (small)
    const correctText = this.scene.add.text(this.width - padding - 5, rankY + 8, `✓${entry.correctAnswers}`, {
      fontSize: "11px",
      color: "#80c080",
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      fontStyle: "500",
    });
    correctText.setOrigin(1, 0.5);
    container.add(correctText);

    container.setPosition(0, yPos);
  }

  private updatePosition(): void {
    const camera = this.scene.cameras.main;
    const margin = 20;
    
    // Position in top-right corner
    this.container.setPosition(camera.width - this.width - margin, margin);
  }

  update(): void {
    // Update position in case camera or window size changes
    this.updatePosition();
  }

  destroy(): void {
    this.container.destroy();
  }
}

