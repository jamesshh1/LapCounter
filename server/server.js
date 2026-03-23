const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const PORT = process.env.PORT || 4000;
const STATE_FILE = path.join(__dirname, 'state.json');

// ── State ──────────────────────────────────────────────────────────────────

const FIXED_TEAMS = [
  { id: 'team_1', name: 'Team 1' },
  { id: 'team_2', name: 'Team 2' },
  { id: 'team_3', name: 'Team 3' },
  { id: 'team_4', name: 'Team 4' },
];

function loadState() {
  let saved = { teams: {} };
  try {
    if (fs.existsSync(STATE_FILE)) {
      saved = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('Failed to load state, starting fresh:', err.message);
  }

  // Ensure all fixed teams exist, preserving saved lap counts
  const teams = {};
  FIXED_TEAMS.forEach(({ id, name }) => {
    teams[id] = { id, name, laps: saved.teams?.[id]?.laps ?? 0 };
  });
  return { teams };
}

function saveState() {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (err) {
    console.error('Failed to save state:', err.message);
  }
}

let state = loadState();

// ── Static files ───────────────────────────────────────────────────────────

app.use(express.static(path.join(__dirname, 'public')));

// ── Socket.io ──────────────────────────────────────────────────────────────

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Send current state to the newly connected client
  socket.emit('state', state);

  // Increment lap count
  socket.on('add_lap', (teamId) => {
    if (!state.teams[teamId]) return;
    state.teams[teamId].laps += 1;
    saveState();
    io.emit('state', state);
  });

  // Decrement lap count (undo)
  socket.on('remove_lap', (teamId) => {
    if (!state.teams[teamId]) return;
    if (state.teams[teamId].laps > 0) {
      state.teams[teamId].laps -= 1;
    }
    saveState();
    io.emit('state', state);
  });

  // Reset all laps
  socket.on('reset_laps', () => {
    Object.values(state.teams).forEach(t => { t.laps = 0; });
    saveState();
    io.emit('state', state);
    console.log('All laps reset');
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// ── Start ──────────────────────────────────────────────────────────────────

server.listen(PORT, () => {
  console.log(`Lap Tracker running at http://localhost:${PORT}`);
});
