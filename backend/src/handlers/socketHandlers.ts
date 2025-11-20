import { Server, Socket } from 'socket.io';
import { PlayerManager } from '../services/PlayerManager';
import { RoomManager } from '../services/RoomManager';
import { GameManager } from '../services/GameManager';
import { ScoringService } from '../services/ScoringService';
import {
  PlayerMovementPayload,
  QuestionPayload,
  AnswerRevealPayload,
  GameOverPayload,
  RoomStatePayload,
  GamePhase,
  DoorOption
} from '../types';

const GAME_START_COUNTDOWN_SECONDS = 10; // Countdown before game starts

export class SocketHandlers {
  private roomCountdowns: Map<string, NodeJS.Timeout> = new Map();
  private roomCountdownSeconds: Map<string, number> = new Map();

  constructor(
    private io: Server,
    private playerManager: PlayerManager,
    private roomManager: RoomManager,
    private gameManager: GameManager,
    private scoringService: ScoringService
  ) {}

  /**
   * Handle new player connection
   */
  handleConnection(socket: Socket): void {
    console.log(`New connection: ${socket.id}`);

    // Auto-assign player to a room
    const room = this.roomManager.findOrCreateAvailableRoom();
    const player = this.playerManager.createPlayer(socket.id, room.roomId);
    this.roomManager.addPlayerToRoom(room.roomId, player.playerId);

    // Join the socket room
    socket.join(room.roomId);

    console.log(`Player ${player.username} (${player.playerId}) joined room ${room.roomId}`);

    // Send player their info
    socket.emit('playerInfo', {
      playerId: player.playerId,
      username: player.username,
      character: player.character,
      roomId: room.roomId
    });

    // Get existing players in the room (excluding the newly connected player)
    const existingPlayers = this.playerManager.getConnectedPlayersInRoom(room.roomId)
      .filter(p => p.playerId !== player.playerId);

    // Send existing players to the newly connected player
    socket.emit('existingPlayers', {
      players: existingPlayers.map(p => ({
        playerId: p.playerId,
        username: p.username,
        character: p.character,
        position: p.position,
        currentDoor: p.currentDoor
      }))
    });

    // Broadcast new player joined to all other players in the room
    socket.to(room.roomId).emit('playerJoined', {
      playerId: player.playerId,
      username: player.username,
      character: player.character,
      position: player.position,
      currentDoor: player.currentDoor
    });

    // Broadcast room state to all players in the room
    this.broadcastRoomState(room.roomId);

    // Auto-start game if enough players
    this.checkAndStartGame(room.roomId);

    // Setup event listeners
    this.setupEventListeners(socket);
  }

  /**
   * Setup all event listeners for a socket
   */
  private setupEventListeners(socket: Socket): void {
    socket.on('playerMovement', (data: PlayerMovementPayload) => {
      this.handlePlayerMovement(socket, data);
    });

    socket.on('requestStartGame', () => {
      this.handleStartGameRequest(socket);
    });

    socket.on('doorCrossed', () => {
      this.handleDoorCrossed(socket);
    });

    socket.on('disconnect', () => {
      this.handleDisconnect(socket);
    });
  }

  /**
   * Handle player movement updates
   */
  private handlePlayerMovement(socket: Socket, data: PlayerMovementPayload): void {
    const player = this.playerManager.getPlayerBySocket(socket.id);
    if (!player) return;

    // Update player position and door
    this.playerManager.updatePlayerPosition(player.playerId, data.position, data.door);

    // Get the game state
    const game = this.gameManager.getGameByRoom(player.roomId);
    if (!game) return;

    // If in question phase and player is at a door, record it
    if (game.phase === GamePhase.QUESTION_ACTIVE && data.door) {
      this.playerManager.recordAnswerTime(player.playerId, Date.now());
      this.gameManager.recordPlayerDoor(game.gameId, player.playerId);
    }

    // Broadcast position to other players in room
    socket.to(player.roomId).emit('playerMoved', {
      playerId: player.playerId,
      username: player.username,
      character: player.character,
      position: data.position,
      door: data.door,
      timestamp: Date.now()
    });
  }

  /**
   * Handle manual game start request (optional - auto-start is primary)
   */
  private handleStartGameRequest(socket: Socket): void {
    const player = this.playerManager.getPlayerBySocket(socket.id);
    if (!player) return;

    this.startGame(player.roomId);
  }

  /**
   * Handle player crossing a door
   */
  private handleDoorCrossed(socket: Socket): void {
    const player = this.playerManager.getPlayerBySocket(socket.id);
    if (!player) return;

    // Record the door crossing in player manager
    this.playerManager.recordDoorCrossing(player.playerId);

    // Get the game state
    const game = this.gameManager.getGameByRoom(player.roomId);
    if (!game) return;

    // Record crossing in game manager
    this.gameManager.recordPlayerCrossing(game.gameId, player.playerId);

    // Get round statistics
    const stats = this.playerManager.getRoundStats(player.roomId);
    
    // Broadcast to room
    this.io.to(player.roomId).emit('playerCrossedDoor', {
      playerId: player.playerId,
      username: player.username,
      doorsCrossed: player.doorsCrossed,
      currentRound: player.currentRound,
      roundStats: {
        playersPerRound: Array.from(stats.playersInCurrentRound.entries()).map(([round, count]) => ({
          round,
          playerCount: count
        })),
        totalPlayers: stats.totalPlayers
      },
      playersCrossed: game.playersCrossedThisRound.size,
      requiredPlayers: game.requiredPlayersForNextRound
    });

    // Check if enough players have crossed to proceed
    if (this.gameManager.canProceedToNextRound(game.gameId)) {
      console.log(`✅ Enough players crossed! Proceeding to next round...`);
      
      // Clear any existing timer
      this.gameManager.clearGameTimer(game.gameId);
      
      // Prepare for next round
      this.gameManager.prepareNextRound(game.gameId);
      
      // Move to answer review phase
      this.gameManager.startAnswerReview(game.gameId);
      this.startGameLoop(game.gameId);
    }
  }

  /**
   * Handle player disconnect
   */
  private handleDisconnect(socket: Socket): void {
    console.log(`Disconnect: ${socket.id}`);

    const player = this.playerManager.disconnectPlayer(socket.id);
    if (!player) return;

    // Broadcast to room that player left
    this.io.to(player.roomId).emit('playerLeft', {
      playerId: player.playerId,
      username: player.username
    });

    // Update room state
    this.broadcastRoomState(player.roomId);

    // Optional: Remove player from room after disconnect
    // this.roomManager.removePlayerFromRoom(player.roomId, player.playerId);
  }

  /**
   * Check if game should start and start it
   */
  private checkAndStartGame(roomId: string): void {
    if (!this.roomManager.canStartGame(roomId)) {
      return;
    }

    const room = this.roomManager.getRoom(roomId);
    if (!room) return;

    // If countdown already running, don't start another one
    if (this.roomCountdowns.has(roomId)) {
      return;
    }

    // Start countdown
    this.startCountdown(roomId, GAME_START_COUNTDOWN_SECONDS);
  }

  /**
   * Start countdown for game start
   */
  private startCountdown(roomId: string, seconds: number): void {
    this.roomCountdownSeconds.set(roomId, seconds);

    // Broadcast initial countdown
    this.io.to(roomId).emit('gameCountdown', {
      secondsRemaining: seconds,
      message: `Game starting in ${seconds} seconds...`
    });

    console.log(`[Room ${roomId}] Starting ${seconds}-second countdown`);

    // Set up interval to update countdown every second
    const countdownInterval = setInterval(() => {
      const remaining = this.roomCountdownSeconds.get(roomId);
      if (remaining === undefined) {
        clearInterval(countdownInterval);
        return;
      }

      const newRemaining = remaining - 1;
      this.roomCountdownSeconds.set(roomId, newRemaining);

      if (newRemaining > 0) {
        // Broadcast countdown update
        this.io.to(roomId).emit('gameCountdown', {
          secondsRemaining: newRemaining,
          message: `Game starting in ${newRemaining} seconds...`
        });
        console.log(`[Room ${roomId}] Countdown: ${newRemaining} seconds`);
      } else {
        // Countdown finished - start game
        clearInterval(countdownInterval);
        this.roomCountdowns.delete(roomId);
        this.roomCountdownSeconds.delete(roomId);

        // Start the game if conditions still allow
        if (this.roomManager.canStartGame(roomId)) {
          this.startGame(roomId);
        }
      }
    }, 1000);

    // Store the interval reference
    this.roomCountdowns.set(roomId, countdownInterval as any);
  }

  /**
   * Cancel countdown for a room
   */
  private cancelCountdown(roomId: string): void {
    const countdown = this.roomCountdowns.get(roomId);
    if (countdown) {
      clearInterval(countdown);
      this.roomCountdowns.delete(roomId);
      this.roomCountdownSeconds.delete(roomId);
      console.log(`[Room ${roomId}] Countdown cancelled`);
    }
  }

  /**
   * Start the game for a room
   */
  private startGame(roomId: string): void {
    const room = this.roomManager.getRoom(roomId);
    if (!room || room.isGameStarted) return;

    console.log(`Starting game for room ${roomId}`);

    // Mark room as started
    this.roomManager.startGame(roomId);

    // Create game state
    const gameState = this.gameManager.createGame(roomId, room.playerIds);
    this.roomManager.setGameState(roomId, gameState);

    // Notify players
    this.io.to(roomId).emit('gameStarted', {
      gameId: gameState.gameId,
      totalRounds: gameState.totalRounds
    });

    // Start the game loop
    this.gameManager.startGame(gameState.gameId);
    this.startGameLoop(gameState.gameId);
  }

  /**
   * Main game loop
   */
  private startGameLoop(gameId: string): void {
    const game = this.gameManager.getGame(gameId);
    if (!game) return;

    console.log(`Game ${gameId}: Phase ${game.phase}, Round ${game.currentRound}`);

    switch (game.phase) {
      case GamePhase.MOVEMENT:
        this.handleMovementPhase(gameId);
        break;
      case GamePhase.QUESTION_ACTIVE:
        this.handleQuestionPhase(gameId);
        break;
      case GamePhase.ANSWER_REVIEW:
        this.handleAnswerReviewPhase(gameId);
        break;
      case GamePhase.ROUND_END:
        this.handleRoundEndPhase(gameId);
        break;
      case GamePhase.GAME_OVER:
        this.handleGameOver(gameId);
        break;
    }
  }

  /**
   * Handle movement phase
   */
  private handleMovementPhase(gameId: string): void {
    const game = this.gameManager.getGame(gameId);
    if (!game) return;

    // Notify players to get ready
    this.io.to(game.roomId).emit('movementPhase', {
      round: game.currentRound,
      totalRounds: game.totalRounds,
      duration: this.gameManager.getPhaseDuration(GamePhase.MOVEMENT)
    });

    // After movement phase, show question
    const timer = setTimeout(() => {
      const question = this.gameManager.startRound(gameId);
      if (question) {
        this.startGameLoop(gameId);
      }
    }, this.gameManager.getPhaseDuration(GamePhase.MOVEMENT));

    this.gameManager.setGameTimer(gameId, timer);
  }

  /**
   * Handle question phase
   */
  private handleQuestionPhase(gameId: string): void {
    const game = this.gameManager.getGame(gameId);
    if (!game || !game.currentQuestion) return;

    // Send question to all players (without correct answer)
    const questionPayload: QuestionPayload = {
      questionId: game.currentQuestion.questionId,
      text: game.currentQuestion.text,
      options: game.currentQuestion.options,
      roundNumber: game.currentRound,
      totalRounds: game.totalRounds,
      timeLimit: this.gameManager.getPhaseDuration(GamePhase.QUESTION_ACTIVE) / 1000
    };

    this.io.to(game.roomId).emit('newQuestion', questionPayload);

    // After time limit, eliminate slow players and reveal answer
    const timer = setTimeout(() => {
      // Eliminate players who didn't cross in time
      const eliminated = this.gameManager.eliminateSlowPlayers(gameId);
      
      if (eliminated.length > 0) {
        this.io.to(game.roomId).emit('playersEliminated', {
          eliminatedPlayers: eliminated,
          remainingRequired: game.requiredPlayersForNextRound
        });
      }
      
      // Proceed to answer review
      this.gameManager.startAnswerReview(gameId);
      this.startGameLoop(gameId);
    }, this.gameManager.getPhaseDuration(GamePhase.QUESTION_ACTIVE));

    this.gameManager.setGameTimer(gameId, timer);
  }

  /**
   * Handle answer review phase
   */
  private handleAnswerReviewPhase(gameId: string): void {
    const game = this.gameManager.getGame(gameId);
    if (!game || !game.currentQuestion) return;

    // Get correct answer
    const correctAnswer = game.currentQuestion.correctAnswer;
    const explanation = game.currentQuestion.explanation;

    // Calculate scores
    const players = this.playerManager.getPlayersInRoom(game.roomId);
    const scoreUpdates = this.scoringService.generateScoreUpdates(
      players,
      correctAnswer,
      game.roundStartTime || Date.now()
    );

    // Update player scores
    for (const update of scoreUpdates) {
      this.playerManager.updatePlayerScore(update.playerId, update.scoreGained, update.isCorrect);
    }

    // Generate leaderboard
    const updatedPlayers = this.playerManager.getPlayersInRoom(game.roomId);
    const leaderboard = this.scoringService.generateLeaderboard(updatedPlayers);

    // Send answer reveal
    const revealPayload: AnswerRevealPayload = {
      correctAnswer,
      explanation,
      scoreUpdates,
      leaderboard
    };

    this.io.to(game.roomId).emit('answerRevealed', revealPayload);

    // Move to round end
    const timer = setTimeout(() => {
      this.gameManager.startRoundEnd(gameId);
      this.startGameLoop(gameId);
    }, this.gameManager.getPhaseDuration(GamePhase.ANSWER_REVIEW));

    this.gameManager.setGameTimer(gameId, timer);
  }

  /**
   * Handle round end phase
   */
  private handleRoundEndPhase(gameId: string): void {
    const game = this.gameManager.getGame(gameId);
    if (!game) return;

    this.io.to(game.roomId).emit('roundEnded', {
      round: game.currentRound,
      totalRounds: game.totalRounds
    });

    // Move to next round or end game
    const timer = setTimeout(() => {
      const hasNextRound = this.gameManager.nextRound(gameId);
      if (hasNextRound) {
        this.startGameLoop(gameId);
      } else {
        this.gameManager.endGame(gameId);
        this.startGameLoop(gameId);
      }
    }, this.gameManager.getPhaseDuration(GamePhase.ROUND_END));

    this.gameManager.setGameTimer(gameId, timer);
  }

  /**
   * Handle game over
   */
  private handleGameOver(gameId: string): void {
    const game = this.gameManager.getGame(gameId);
    if (!game) return;

    // Generate final leaderboard
    const players = this.playerManager.getPlayersInRoom(game.roomId);
    const finalLeaderboard = this.scoringService.generateLeaderboard(players);
    const winner = this.scoringService.getWinner(finalLeaderboard);

    // Send game over payload
    const gameOverPayload: GameOverPayload = {
      finalLeaderboard,
      winner: winner!
    };

    this.io.to(game.roomId).emit('gameOver', gameOverPayload);

    console.log(`Game ${gameId} ended. Winner: ${winner?.username}`);

    // Clean up
    setTimeout(() => {
      this.gameManager.removeGame(gameId);
    }, 30000); // Remove after 30 seconds
  }

  /**
   * Broadcast current room state to all players
   */
  private broadcastRoomState(roomId: string): void {
    const room = this.roomManager.getRoom(roomId);
    if (!room) return;

    const players = this.playerManager.getPlayersInRoom(roomId);

    const roomState: RoomStatePayload = {
      roomId,
      players: players.map(p => ({
        playerId: p.playerId,
        username: p.username,
        character: p.character,
        score: p.currentScore
      })),
      isGameStarted: room.isGameStarted,
      minPlayers: room.minPlayers,
      maxPlayers: room.maxPlayers
    };

    this.io.to(roomId).emit('roomState', roomState);
  }
}

