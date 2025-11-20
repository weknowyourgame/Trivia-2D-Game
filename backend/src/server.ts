import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { PlayerManager } from './services/PlayerManager';
import { RoomManager } from './services/RoomManager';
import { GameManager } from './services/GameManager';
import { ScoringService } from './services/ScoringService';
import { SocketHandlers } from './handlers/socketHandlers';

const PORT = process.env.PORT || 3000;

// Initialize Express app
const app = express();
const httpServer = createServer(app);

// Setup CORS
app.use(cors({
  origin: '*', // In production, specify your frontend URL
  credentials: true
}));

app.use(express.json());

// Setup Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: '*', // In production, specify your frontend URL
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Initialize services
const playerManager = new PlayerManager();
const roomManager = new RoomManager();
const gameManager = new GameManager();
const scoringService = new ScoringService();

// Initialize socket handlers
const socketHandlers = new SocketHandlers(
  io,
  playerManager,
  roomManager,
  gameManager,
  scoringService
);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    stats: {
      totalPlayers: playerManager.getPlayerCount(),
      activeRooms: roomManager.getActiveRooms().length,
      activeGames: gameManager.getAllGames().length
    }
  });
});

// Get server stats endpoint
app.get('/api/stats', (req, res) => {
  const rooms = roomManager.getActiveRooms();
  const games = gameManager.getAllGames();

  res.json({
    totalPlayers: playerManager.getPlayerCount(),
    totalRooms: rooms.length,
    activeGames: games.length,
    rooms: rooms.map(room => ({
      roomId: room.roomId,
      playerCount: room.playerIds.length,
      isGameStarted: room.isGameStarted
    })),
    games: games.map(game => ({
      gameId: game.gameId,
      roomId: game.roomId,
      currentRound: game.currentRound,
      phase: game.phase,
      playerCount: game.playerIds.length
    }))
  });
});

// Socket.IO connection handler
io.on('connection', (socket) => {
  socketHandlers.handleConnection(socket);
});

// Periodic cleanup of empty rooms
setInterval(() => {
  roomManager.cleanupEmptyRooms();
}, 60000); // Every minute

// Start server
httpServer.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log('🎮 Arabian Nights Trivia Server');
  console.log('='.repeat(50));
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`📊 Stats: http://localhost:${PORT}/api/stats`);
  console.log('='.repeat(50));
  console.log('✅ Ready for connections!');
  console.log('='.repeat(50));
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, shutting down gracefully...');
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export { app, httpServer, io };

