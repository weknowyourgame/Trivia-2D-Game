# Quiz Game Feature

## Overview
The game now includes a multiplayer quiz feature where players answer Arabian Nights trivia questions by choosing the correct door.

## How It Works

### Game Flow
1. **Question Phase**: A question appears with 4 answer options (A, B, C, D)
2. **Timer**: Players have 10-15 seconds to choose a door
3. **Door Selection**: Each answer option corresponds to a door in the game
4. **Answer Reveal**: After time expires, only the correct door becomes passable
5. **Movement**: Players must go through the correct door to proceed

### Features
- **Visual Question UI**: Floating question display with 4 options
- **Timer Bar**: Color-coded progress bar (green → orange → red)
- **Door Collision**: Only the correct door is passable after answer reveal
- **Multiplayer Sync**: All players see the same question simultaneously

### Technical Implementation

#### Client-Side Components
- **QuestionUI.ts**: Manages the visual display of questions and timer
- **GameScene.ts**: Handles door collision and game state
- **SocketManager.ts**: Listens for game events from server

#### Socket Events
- `question`: Triggered when a new question is sent
- `answerReveal`: Shows correct answer and opens the correct door
- `gameStart`: Begins the game session
- `gameOver`: Ends the game and resets doors

#### Door Management
- During question phase: All doors are impassable
- After answer reveal: Only the correct door is passable
- Game over: All doors become passable again

## Customization

### Timer Duration
The backend uses 15 seconds by default. To change this, modify:
- Backend: `QUESTION_PHASE_DURATION` in `backend/src/services/GameManager.ts`
- Client: The timer automatically syncs with the backend's `timeLimit` value

### Door Properties
Doors in the tilemap should have these properties:
- `door: true` - Identifies the tile as a door
- `doorId: "A"|"B"|"C"|"D"` - Links the door to an answer option

## Future Enhancements
- Visual indicators showing which door is which option
- Player choice feedback before answer reveal
- Score display and leaderboard UI
- Sound effects for timer and correct/incorrect answers
