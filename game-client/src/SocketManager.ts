import { io, Socket } from 'socket.io-client';

export interface PlayerData {
  playerId: string;
  username: string;
  character: string;
  position: { x: number; y: number };
  currentDoor: string | null;
}

export interface PlayerMovedData extends PlayerData {
  timestamp: number;
  door: string | null;
}

export class SocketManager {
  private socket: Socket | null = null;
  private serverUrl: string;
  private lastMovementSent: number = 0;
  private movementThrottle: number = 16; // ~60 updates per second
  private lastPosition: { x: number; y: number } = { x: 0, y: 0 };
  
  // Event callbacks
  public onPlayerInfo?: (data: any) => void;
  public onExistingPlayers?: (data: { players: PlayerData[] }) => void;
  public onPlayerJoined?: (data: PlayerData) => void;
  public onPlayerMoved?: (data: PlayerMovedData) => void;
  public onPlayerLeft?: (data: { playerId: string; username: string }) => void;
  
  constructor(serverUrl: string) {
    this.serverUrl = serverUrl;
  }
  
  connect(): void {
    this.socket = io(this.serverUrl);
    this.setupEventListeners();
  }
  
  private setupEventListeners(): void {
    if (!this.socket) return;
    
    this.socket.on('playerInfo', (data) => {
      this.onPlayerInfo?.(data);
    });
    
    this.socket.on('existingPlayers', (data) => {
      this.onExistingPlayers?.(data);
    });
    
    this.socket.on('playerJoined', (data) => {
      this.onPlayerJoined?.(data);
    });
    
    this.socket.on('playerMoved', (data) => {
      this.onPlayerMoved?.(data);
    });
    
    this.socket.on('playerLeft', (data) => {
      this.onPlayerLeft?.(data);
    });
  }
  
  sendMovement(position: { x: number; y: number }, door: string | null): void {
    if (!this.socket) return;
    
    const now = Date.now();
    const timeSinceLastSend = now - this.lastMovementSent;
    
    // Throttle to max 60 updates per second
    if (timeSinceLastSend < this.movementThrottle) {
      return;
    }
    
    // Stationary detection - skip if player hasn't moved significantly
    const distance = Math.sqrt(
      Math.pow(position.x - this.lastPosition.x, 2) + 
      Math.pow(position.y - this.lastPosition.y, 2)
    );
    
    // Only send if moved > 5 pixels or more than 100ms has passed
    if (distance < 5 && timeSinceLastSend < 100) {
      return;
    }
    
    this.socket.emit('playerMovement', { position, door });
    this.lastMovementSent = now;
    this.lastPosition = { ...position };
  }
  
  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }
}
