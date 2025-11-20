const io = require('socket.io-client');

// Connect to server
const SERVER_URL = 'http://localhost:3000';
const socket = io(SERVER_URL);

let myPlayerId = null;
let myUsername = null;
let currentDoor = null; // Track current door choice

console.log('Connecting to server...\n');

// === CONNECTION EVENTS ===

socket.on('connect', () => {
  console.log('[CONNECTED] Socket ID:', socket.id, '\n');
});

socket.on('disconnect', (reason) => {
  console.log(`[DISCONNECTED] ${reason}\n`);
});

socket.on('connect_error', (error) => {
  console.error('[ERROR] Connection Error:', error.message);
});

// === GAME EVENTS ===

socket.on('playerInfo', (data) => {
  myPlayerId = data.playerId;
  myUsername = data.username;
  
  console.log('[PLAYER INFO]');
  console.log('  Username:', data.username);
  console.log('  Character:', data.character);
  console.log('  Room ID:', data.roomId);
  console.log('  Player ID:', data.playerId, '\n');
});

socket.on('roomState', (data) => {
  console.log('[ROOM STATE]');
  console.log('  Room:', data.roomId);
  console.log('  Players:', data.players.length + '/' + data.maxPlayers, '(min:', data.minPlayers + ')');
  console.log('  Game Started:', data.isGameStarted);
  
  console.log('  Current Players:');
  data.players.forEach(p => {
    const isMe = p.playerId === myPlayerId ? ' (YOU)' : '';
    console.log('    -', p.username, '(' + p.character + ') - Score:', p.score + isMe);
  });
  console.log('');
});

socket.on('gameCountdown', (data) => {
  console.log('[COUNTDOWN]', data.secondsRemaining, 'seconds -', data.message);
});

socket.on('gameStarted', (data) => {
  console.log('\n========================================');
  console.log('[GAME STARTED]');
  console.log('  Game ID:', data.gameId);
  console.log('  Total Rounds:', data.totalRounds);
  console.log('========================================\n');
});

socket.on('movementPhase', (data) => {
  currentDoor = null; // Reset door for new round
  console.log('[MOVEMENT PHASE] Round', data.round + '/' + data.totalRounds);
  console.log('  Get ready!', data.duration + 'ms\n');
});

socket.on('newQuestion', (data) => {
  console.log('[QUESTION ' + data.roundNumber + '/' + data.totalRounds + ']');
  console.log('  ' + data.text);
  console.log('');
  console.log('  Options:');
  console.log('  [A]', data.options.A);
  console.log('  [B]', data.options.B);
  console.log('  [C]', data.options.C);
  console.log('  [D]', data.options.D);
  console.log('  Time limit:', data.timeLimit, 'seconds\n');
  
  // Simulate random door choice
  const doors = ['A', 'B', 'C', 'D'];
  const randomDoor = doors[Math.floor(Math.random() * doors.length)];
  currentDoor = randomDoor; // Store the door choice
  
  console.log('  >> Auto-choosing door:', randomDoor);
  
  // Send movement after a random delay (1-3 seconds)
  setTimeout(() => {
    socket.emit('playerMovement', {
      position: { x: Math.random() * 800, y: Math.random() * 600 },
      door: randomDoor
    });
    console.log('  >> Moved to door', randomDoor, '\n');
  }, 1000 + Math.random() * 2000);
});

socket.on('answerRevealed', (data) => {
  console.log('[ANSWER REVEALED]');
  console.log('  Correct Answer:', data.correctAnswer);
  console.log('  Explanation:', data.explanation, '\n');
  
  console.log('  Score Updates:');
  data.scoreUpdates.forEach(update => {
    const status = update.isCorrect ? '[CORRECT]' : '[WRONG]';
    const points = update.isCorrect ? '+' + update.scoreGained : '0';
    const isMe = update.playerId === myPlayerId ? ' (YOU)' : '';
    console.log('    ' + status, update.username + ':', points, 'pts (Total:', update.totalScore + ')' + isMe);
  });
  console.log('');
  
  console.log('  Leaderboard:');
  data.leaderboard.forEach((entry) => {
    const isMe = entry.playerId === myPlayerId ? ' (YOU)' : '';
    console.log('    #' + entry.rank, entry.username, '-', entry.score, 'pts (' + entry.correctAnswers, 'correct)' + isMe);
  });
  console.log('');
});

socket.on('roundEnded', (data) => {
  console.log('[ROUND ' + data.round + ' ENDED]');
  console.log('----------------------------------------\n');
});

socket.on('gameOver', (data) => {
  console.log('\n========================================');
  console.log('[GAME OVER - FINAL RESULTS]');
  console.log('========================================\n');
  
  console.log('[WINNER]');
  const winner = data.winner;
  const isWinnerMe = winner.playerId === myPlayerId ? ' (YOU WIN!)' : '';
  console.log('  ' + winner.username, '(' + winner.character + ')' + isWinnerMe);
  console.log('  Score:', winner.score, '| Correct:', winner.correctAnswers + '\n');
  
  console.log('[FINAL LEADERBOARD]');
  data.finalLeaderboard.forEach((entry) => {
    const isMe = entry.playerId === myPlayerId ? ' (YOU)' : '';
    console.log('  #' + entry.rank, entry.username, '-', entry.score, 'pts (' + entry.correctAnswers + '/20 correct)' + isMe);
  });
  
  console.log('\n========================================\n');
  
  // Disconnect after game over
  setTimeout(() => {
    console.log('[DISCONNECTING]\n');
    socket.disconnect();
    process.exit(0);
  }, 2000);
});

socket.on('playerMoved', (data) => {
  if (data.playerId !== myPlayerId) {
    // Uncomment to see other players' movements (can be spammy)
    // console.log(`   👤 ${data.username} moved to (${data.position.x}, ${data.position.y}) - Door: ${data.door || 'none'}`);
  }
});

socket.on('playerLeft', (data) => {
  console.log('[PLAYER LEFT]', data.username, '\n');
});

// === SIMULATE ACTIVE PLAYER ===
// Periodically send movement to appear "active"
// BUT preserve the current door choice so it doesn't get reset!
setInterval(() => {
  if (socket.connected) {
    socket.emit('playerMovement', {
      position: { 
        x: Math.random() * 800, 
        y: Math.random() * 600 
      },
      door: currentDoor // Keep the current door choice instead of null
    });
  }
}, 2000);

// === GRACEFUL SHUTDOWN ===
process.on('SIGINT', () => {
  console.log('\n\n[SHUTTING DOWN]');
  socket.disconnect();
  process.exit(0);
});

console.log('TIP: Open multiple terminals and run this script to test multiplayer!\n');

