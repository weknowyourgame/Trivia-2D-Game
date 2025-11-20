import { v4 as uuidv4 } from 'uuid';
import { Player, Position, DoorOption } from '../types';

// Available character avatars for auto-assignment
const CHARACTERS = [
  'Aladdin',
  'Sinbad',
  'Scheherazade',
  'Ali Baba',
  'Morgiana',
  'Genie',
  'Sultan',
  'Princess',
  'Merchant',
  'Sailor'
];

export class PlayerManager {
  private players: Map<string, Player> = new Map();
  private socketToPlayer: Map<string, string> = new Map();
  private usedCharacters: Set<string> = new Set();

  /**
   * Create a new player with auto-assigned username and character
   */
  createPlayer(socketId: string, roomId: string): Player {
    const playerId = uuidv4();
    const username = this.generateUsername();
    const character = this.assignCharacter();

    const player: Player = {
      playerId,
      socketId,
      username,
      character,
      roomId,
      currentScore: 0,
      totalCorrectAnswers: 0,
      position: { x: 0, y: 0 },
      currentDoor: null,
      lastAnswerTime: null,
      isConnected: true
    };

    this.players.set(playerId, player);
    this.socketToPlayer.set(socketId, playerId);

    return player;
  }

  /**
   * Generate a random username
   */
  private generateUsername(): string {
    const randomNum = Math.floor(Math.random() * 10000);
    return `Player_${randomNum}`;
  }

  /**
   * Assign a character, cycling through available ones
   */
  private assignCharacter(): string {
    // If all characters are used, reset
    if (this.usedCharacters.size >= CHARACTERS.length) {
      this.usedCharacters.clear();
    }

    // Find an unused character
    const availableCharacters = CHARACTERS.filter(c => !this.usedCharacters.has(c));
    const character = availableCharacters[Math.floor(Math.random() * availableCharacters.length)];
    
    this.usedCharacters.add(character);
    return character;
  }

  /**
   * Get player by ID
   */
  getPlayer(playerId: string): Player | undefined {
    return this.players.get(playerId);
  }

  /**
   * Get player by socket ID
   */
  getPlayerBySocket(socketId: string): Player | undefined {
    const playerId = this.socketToPlayer.get(socketId);
    return playerId ? this.players.get(playerId) : undefined;
  }

  /**
   * Update player position
   */
  updatePlayerPosition(playerId: string, position: Position, door: DoorOption | null): void {
    const player = this.players.get(playerId);
    if (player) {
      player.position = position;
      player.currentDoor = door;
    }
  }

  /**
   * Update player score
   */
  updatePlayerScore(playerId: string, scoreToAdd: number, isCorrect: boolean): void {
    const player = this.players.get(playerId);
    if (player) {
      player.currentScore += scoreToAdd;
      if (isCorrect) {
        player.totalCorrectAnswers++;
      }
    }
  }

  /**
   * Record when player answered
   */
  recordAnswerTime(playerId: string, timestamp: number): void {
    const player = this.players.get(playerId);
    if (player) {
      player.lastAnswerTime = timestamp;
    }
  }

  /**
   * Mark player as disconnected
   */
  disconnectPlayer(socketId: string): Player | undefined {
    const player = this.getPlayerBySocket(socketId);
    if (player) {
      player.isConnected = false;
      // Note: We keep the player in memory for reconnection purposes
      // Could add a cleanup mechanism later
    }
    return player;
  }

  /**
   * Remove player completely
   */
  removePlayer(playerId: string): void {
    const player = this.players.get(playerId);
    if (player) {
      this.socketToPlayer.delete(player.socketId);
      this.usedCharacters.delete(player.character);
      this.players.delete(playerId);
    }
  }

  /**
   * Get all players in a specific room
   */
  getPlayersInRoom(roomId: string): Player[] {
    return Array.from(this.players.values()).filter(p => p.roomId === roomId);
  }

  /**
   * Get connected players in a room
   */
  getConnectedPlayersInRoom(roomId: string): Player[] {
    return this.getPlayersInRoom(roomId).filter(p => p.isConnected);
  }

  /**
   * Reset player stats for new game
   */
  resetPlayerStats(playerId: string): void {
    const player = this.players.get(playerId);
    if (player) {
      player.currentScore = 0;
      player.totalCorrectAnswers = 0;
      player.lastAnswerTime = null;
      player.currentDoor = null;
    }
  }

  /**
   * Get total player count
   */
  getPlayerCount(): number {
    return this.players.size;
  }
}

