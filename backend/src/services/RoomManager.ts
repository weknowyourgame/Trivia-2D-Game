import { v4 as uuidv4 } from 'uuid';
import { Room, GameState, GamePhase } from '../types';

const MAX_PLAYERS_PER_ROOM = 10;
const MIN_PLAYERS_TO_START = 1; // No minimum - game starts after countdown

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private currentAutoAssignRoom: string | null = null;

  /**
   * Create a new room
   */
  createRoom(): Room {
    const roomId = uuidv4();
    const room: Room = {
      roomId,
      playerIds: [],
      maxPlayers: MAX_PLAYERS_PER_ROOM,
      minPlayers: MIN_PLAYERS_TO_START,
      isGameStarted: false,
      gameState: null,
      createdAt: Date.now()
    };

    this.rooms.set(roomId, room);
    return room;
  }

  /**
   * Get room by ID
   */
  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  /**
   * Find an available room or create a new one for auto-assignment
   */
  findOrCreateAvailableRoom(): Room {
    // Check if current auto-assign room is still available
    if (this.currentAutoAssignRoom) {
      const room = this.rooms.get(this.currentAutoAssignRoom);
      if (room && room.playerIds.length < room.maxPlayers && !room.isGameStarted) {
        return room;
      }
    }

    // Find any available room
    for (const room of this.rooms.values()) {
      if (room.playerIds.length < room.maxPlayers && !room.isGameStarted) {
        this.currentAutoAssignRoom = room.roomId;
        return room;
      }
    }

    // Create new room if none available
    const newRoom = this.createRoom();
    this.currentAutoAssignRoom = newRoom.roomId;
    return newRoom;
  }

  /**
   * Add player to room
   */
  addPlayerToRoom(roomId: string, playerId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) {
      return false;
    }

    if (room.playerIds.length >= room.maxPlayers) {
      return false;
    }

    if (room.playerIds.includes(playerId)) {
      return true; // Already in room
    }

    room.playerIds.push(playerId);
    return true;
  }

  /**
   * Remove player from room
   */
  removePlayerFromRoom(roomId: string, playerId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.playerIds = room.playerIds.filter(id => id !== playerId);

      // Clean up empty rooms that haven't started
      if (room.playerIds.length === 0 && !room.isGameStarted) {
        this.rooms.delete(roomId);
        if (this.currentAutoAssignRoom === roomId) {
          this.currentAutoAssignRoom = null;
        }
      }
    }
  }

  /**
   * Check if room can start a game
   */
  canStartGame(roomId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) {
      return false;
    }

    return room.playerIds.length >= room.minPlayers && !room.isGameStarted;
  }

  /**
   * Mark room as game started
   */
  startGame(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.isGameStarted = true;
      
      // If this was the auto-assign room, clear it so new players get a new room
      if (this.currentAutoAssignRoom === roomId) {
        this.currentAutoAssignRoom = null;
      }
    }
  }

  /**
   * Set game state for room
   */
  setGameState(roomId: string, gameState: GameState): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.gameState = gameState;
    }
  }

  /**
   * Get all rooms
   */
  getAllRooms(): Room[] {
    return Array.from(this.rooms.values());
  }

  /**
   * Get active rooms (with players)
   */
  getActiveRooms(): Room[] {
    return Array.from(this.rooms.values()).filter(room => room.playerIds.length > 0);
  }

  /**
   * Clean up old empty rooms
   */
  cleanupEmptyRooms(): void {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    for (const [roomId, room] of this.rooms.entries()) {
      if (room.playerIds.length === 0 && now - room.createdAt > oneHour) {
        this.rooms.delete(roomId);
        if (this.currentAutoAssignRoom === roomId) {
          this.currentAutoAssignRoom = null;
        }
      }
    }
  }
}

