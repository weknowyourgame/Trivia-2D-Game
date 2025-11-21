import { v4 as uuidv4 } from 'uuid';
import { GameState, GamePhase, Question, Player, DoorOption } from '../types';
import { getRandomQuestions } from '../data/questions';

const TOTAL_ROUNDS = 20;
const MOVEMENT_PHASE_DURATION = 3000; // 3 seconds
const QUESTION_PHASE_DURATION = 8000; // 15 seconds
const ANSWER_REVIEW_DURATION = 5000; // 5 seconds
const ROUND_END_DURATION = 2000; // 2 seconds

export class GameManager {
  private games: Map<string, GameState> = new Map();
  private gameTimers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Create a new game for a room
   */
  createGame(roomId: string, playerIds: string[]): GameState {
    const gameId = uuidv4();
    const initialCount = playerIds.length;
    const gameState: GameState = {
      gameId,
      roomId,
      currentRound: 0,
      totalRounds: TOTAL_ROUNDS,
      currentQuestionId: null,
      currentQuestion: null,
      phase: GamePhase.WAITING,
      roundTimer: 0,
      roundStartTime: null,
      playersAnswered: new Set(),
      playerIds: [...playerIds],
      isGameOver: false,
      createdAt: Date.now(),
      initialPlayerCount: initialCount,
      requiredPlayersForNextRound: initialCount,
      playersCrossedThisRound: new Set(),
      waitingForPlayers: false
    };

    this.games.set(gameId, gameState);
    console.log(`🎮 Game created with ${initialCount} players, requiring ${initialCount} to advance`);
    return gameState;
  }

  /**
   * Get game by ID
   */
  getGame(gameId: string): GameState | undefined {
    return this.games.get(gameId);
  }

  /**
   * Get game by room ID
   */
  getGameByRoom(roomId: string): GameState | undefined {
    for (const game of this.games.values()) {
      if (game.roomId === roomId) {
        return game;
      }
    }
    return undefined;
  }

  /**
   * Start the game
   */
  startGame(gameId: string): void {
    const game = this.games.get(gameId);
    if (!game) return;

    game.phase = GamePhase.MOVEMENT;
    game.currentRound = 1;
  }

  /**
   * Start a new round
   */
  startRound(gameId: string): Question | null {
    const game = this.games.get(gameId);
    if (!game) return null;

    // Get a random question
    const questions = getRandomQuestions(1);
    if (questions.length === 0) return null;

    const question = questions[0];
    game.currentQuestion = question;
    game.currentQuestionId = question.questionId;
    game.phase = GamePhase.QUESTION_ACTIVE;
    game.roundStartTime = Date.now();
    game.roundTimer = QUESTION_PHASE_DURATION;
    game.playersAnswered.clear();

    return question;
  }

  /**
   * Record a player's door choice
   */
  recordPlayerDoor(gameId: string, playerId: string): void {
    const game = this.games.get(gameId);
    if (!game) return;

    game.playersAnswered.add(playerId);
  }

  /**
   * Check if all players have answered
   */
  haveAllPlayersAnswered(gameId: string): boolean {
    const game = this.games.get(gameId);
    if (!game) return false;

    return game.playersAnswered.size >= game.playerIds.length;
  }

  /**
   * Move to answer review phase
   */
  startAnswerReview(gameId: string): void {
    const game = this.games.get(gameId);
    if (!game) return;

    game.phase = GamePhase.ANSWER_REVIEW;
    game.roundTimer = ANSWER_REVIEW_DURATION;
  }

  /**
   * Move to round end phase
   */
  startRoundEnd(gameId: string): void {
    const game = this.games.get(gameId);
    if (!game) return;

    game.phase = GamePhase.ROUND_END;
    game.roundTimer = ROUND_END_DURATION;
  }

  /**
   * Move to next round or end game
   */
  nextRound(gameId: string): boolean {
    const game = this.games.get(gameId);
    if (!game) return false;

    if (game.currentRound >= game.totalRounds) {
      this.endGame(gameId);
      return false;
    }

    game.currentRound++;
    game.currentQuestion = null;
    game.currentQuestionId = null;
    game.phase = GamePhase.MOVEMENT;
    game.roundTimer = MOVEMENT_PHASE_DURATION;

    return true;
  }

  /**
   * End the game
   */
  endGame(gameId: string): void {
    const game = this.games.get(gameId);
    if (!game) return;

    game.phase = GamePhase.GAME_OVER;
    game.isGameOver = true;

    // Clean up any timers
    const timer = this.gameTimers.get(gameId);
    if (timer) {
      clearTimeout(timer);
      this.gameTimers.delete(gameId);
    }
  }

  /**
   * Get current question
   */
  getCurrentQuestion(gameId: string): Question | null {
    const game = this.games.get(gameId);
    return game?.currentQuestion || null;
  }

  /**
   * Get correct answer for current question
   */
  getCorrectAnswer(gameId: string): DoorOption | null {
    const game = this.games.get(gameId);
    return game?.currentQuestion?.correctAnswer || null;
  }

  /**
   * Get phase durations
   */
  getPhaseDuration(phase: GamePhase): number {
    switch (phase) {
      case GamePhase.MOVEMENT:
        return MOVEMENT_PHASE_DURATION;
      case GamePhase.QUESTION_ACTIVE:
        return QUESTION_PHASE_DURATION;
      case GamePhase.ANSWER_REVIEW:
        return ANSWER_REVIEW_DURATION;
      case GamePhase.ROUND_END:
        return ROUND_END_DURATION;
      default:
        return 0;
    }
  }

  /**
   * Set a game timer
   */
  setGameTimer(gameId: string, timer: NodeJS.Timeout): void {
    // Clear existing timer
    const existingTimer = this.gameTimers.get(gameId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    this.gameTimers.set(gameId, timer);
  }

  /**
   * Clear game timer
   */
  clearGameTimer(gameId: string): void {
    const timer = this.gameTimers.get(gameId);
    if (timer) {
      clearTimeout(timer);
      this.gameTimers.delete(gameId);
    }
  }

  /**
   * Remove game
   */
  removeGame(gameId: string): void {
    this.clearGameTimer(gameId);
    this.games.delete(gameId);
  }

  /**
   * Get all active games
   */
  getAllGames(): GameState[] {
    return Array.from(this.games.values());
  }

  /**
   * Record a player crossing a door
   */
  recordPlayerCrossing(gameId: string, playerId: string): void {
    const game = this.games.get(gameId);
    if (!game) return;

    game.playersCrossedThisRound.add(playerId);
    console.log(`📊 ${game.playersCrossedThisRound.size}/${game.requiredPlayersForNextRound} players crossed`);
  }

  /**
   * Check if enough players have crossed to proceed
   */
  canProceedToNextRound(gameId: string): boolean {
    const game = this.games.get(gameId);
    if (!game) return false;

    return game.playersCrossedThisRound.size >= game.requiredPlayersForNextRound;
  }

  /**
   * Prepare for next round - decrease required players and reset tracking
   */
  prepareNextRound(gameId: string): void {
    const game = this.games.get(gameId);
    if (!game) return;

    // Decrease required players by 1 each round (elimination)
    game.requiredPlayersForNextRound = Math.max(1, game.requiredPlayersForNextRound - 1);
    
    // Reset crossing tracking
    game.playersCrossedThisRound.clear();
    game.waitingForPlayers = false;

    console.log(`🔄 Next round will require ${game.requiredPlayersForNextRound} players to advance`);
  }

  /**
   * Handle players who didn't cross in time - eliminate them
   */
  eliminateSlowPlayers(gameId: string): string[] {
    const game = this.games.get(gameId);
    if (!game) return [];

    const eliminatedPlayers: string[] = [];
    
    // Find players who didn't cross
    game.playerIds.forEach(playerId => {
      if (!game.playersCrossedThisRound.has(playerId)) {
        eliminatedPlayers.push(playerId);
      }
    });

    // Reduce required players by number of eliminated players
    game.requiredPlayersForNextRound = Math.max(1, game.requiredPlayersForNextRound - eliminatedPlayers.length);

    console.log(`❌ ${eliminatedPlayers.length} players eliminated, now requiring ${game.requiredPlayersForNextRound} to advance`);

    return eliminatedPlayers;
  }

  /**
   * Set waiting for players state
   */
  setWaitingForPlayers(gameId: string, waiting: boolean): void {
    const game = this.games.get(gameId);
    if (game) {
      game.waitingForPlayers = waiting;
    }
  }
}

