import { Player, ScoreUpdate, LeaderboardEntry } from '../types';

const BASE_SCORE = 100;
const SPEED_BONUS_MAX = 50;
const ROUND_DURATION = 8000; // 15 seconds in milliseconds

export class ScoringService {
  /**
   * Calculate score for a player based on correctness and speed
   */
  calculateScore(
    isCorrect: boolean,
    answerTime: number,
    roundStartTime: number
  ): number {
    if (!isCorrect) {
      return 0;
    }

    const timeTaken = answerTime - roundStartTime;
    const speedBonus = this.calculateSpeedBonus(timeTaken);

    return BASE_SCORE + speedBonus;
  }

  /**
   * Calculate speed bonus (faster = more points)
   */
  private calculateSpeedBonus(timeTaken: number): number {
    // If answered instantly (within 1 second), give max bonus
    if (timeTaken <= 1000) {
      return SPEED_BONUS_MAX;
    }

    // Linear decrease: max bonus at 0ms, 0 bonus at ROUND_DURATION
    const bonusPercentage = 1 - timeTaken / ROUND_DURATION;
    const speedBonus = Math.max(0, Math.floor(SPEED_BONUS_MAX * bonusPercentage));

    return speedBonus;
  }

  /**
   * Generate score updates for all players in a round
   */
  generateScoreUpdates(
    players: Player[],
    correctDoor: string,
    roundStartTime: number
  ): ScoreUpdate[] {
    const scoreUpdates: ScoreUpdate[] = [];

    for (const player of players) {
      const isCorrect = player.currentDoor === correctDoor;
      const answerTime = player.lastAnswerTime || Date.now();
      const scoreGained = this.calculateScore(isCorrect, answerTime, roundStartTime);

      scoreUpdates.push({
        playerId: player.playerId,
        username: player.username,
        scoreGained,
        totalScore: player.currentScore + scoreGained,
        isCorrect
      });
    }

    return scoreUpdates;
  }

  /**
   * Generate leaderboard from players
   */
  generateLeaderboard(players: Player[]): LeaderboardEntry[] {
    const leaderboard = players
      .map((player, index) => ({
        playerId: player.playerId,
        username: player.username,
        character: player.character,
        score: player.currentScore,
        correctAnswers: player.totalCorrectAnswers,
        rank: 0 // Will be set below
      }))
      .sort((a, b) => {
        // Sort by score descending
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        // Tie-breaker: more correct answers
        if (b.correctAnswers !== a.correctAnswers) {
          return b.correctAnswers - a.correctAnswers;
        }
        // If still tied, maintain original order
        return 0;
      });

    // Assign ranks
    leaderboard.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    return leaderboard;
  }

  /**
   * Get winner from leaderboard
   */
  getWinner(leaderboard: LeaderboardEntry[]): LeaderboardEntry | null {
    return leaderboard.length > 0 ? leaderboard[0] : null;
  }

  /**
   * Get top N players
   */
  getTopPlayers(leaderboard: LeaderboardEntry[], count: number): LeaderboardEntry[] {
    return leaderboard.slice(0, count);
  }
}

