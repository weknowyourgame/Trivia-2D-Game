// Type definitions for the Arabian Nights Trivia Game

export enum GamePhase {
  WAITING = 'WAITING',
  MOVEMENT = 'MOVEMENT',
  QUESTION_ACTIVE = 'QUESTION_ACTIVE',
  ANSWER_REVIEW = 'ANSWER_REVIEW',
  ROUND_END = 'ROUND_END',
  GAME_OVER = 'GAME_OVER'
}

export enum DoorOption {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D'
}

export enum DifficultyLevel {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD'
}

export interface Position {
  x: number;
  y: number;
}

export interface Player {
  playerId: string;
  socketId: string;
  username: string;
  character: string;
  roomId: string;
  currentScore: number;
  totalCorrectAnswers: number;
  position: Position;
  currentDoor: DoorOption | null;
  lastAnswerTime: number | null;
  isConnected: boolean;
}

export interface Question {
  questionId: string;
  text: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: DoorOption;
  explanation: string;
  difficultyLevel: DifficultyLevel;
  theme: string;
}

export interface GameState {
  gameId: string;
  roomId: string;
  currentRound: number;
  totalRounds: number;
  currentQuestionId: string | null;
  currentQuestion: Question | null;
  phase: GamePhase;
  roundTimer: number;
  roundStartTime: number | null;
  playersAnswered: Set<string>;
  playerIds: string[];
  isGameOver: boolean;
  createdAt: number;
}

export interface Room {
  roomId: string;
  playerIds: string[];
  maxPlayers: number;
  minPlayers: number;
  isGameStarted: boolean;
  gameState: GameState | null;
  createdAt: number;
}

export interface ScoreUpdate {
  playerId: string;
  username: string;
  scoreGained: number;
  totalScore: number;
  isCorrect: boolean;
}

export interface LeaderboardEntry {
  playerId: string;
  username: string;
  character: string;
  score: number;
  correctAnswers: number;
  rank: number;
}

// Socket.IO Event Payloads
export interface PlayerMovementPayload {
  position: Position;
  door: DoorOption | null;
}

export interface GameStartPayload {
  roomId: string;
  totalRounds: number;
}

export interface QuestionPayload {
  questionId: string;
  text: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  roundNumber: number;
  totalRounds: number;
  timeLimit: number;
}

export interface AnswerRevealPayload {
  correctAnswer: DoorOption;
  explanation: string;
  scoreUpdates: ScoreUpdate[];
  leaderboard: LeaderboardEntry[];
}

export interface GameOverPayload {
  finalLeaderboard: LeaderboardEntry[];
  winner: LeaderboardEntry;
}

export interface RoomStatePayload {
  roomId: string;
  players: Array<{
    playerId: string;
    username: string;
    character: string;
    score: number;
  }>;
  isGameStarted: boolean;
  minPlayers: number;
  maxPlayers: number;
}

