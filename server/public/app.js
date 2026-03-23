// ── Config ─────────────────────────────────────────────────────────────────
// When deploying, set SERVER_URL to your public host (e.g. https://your-app.railway.app).
// Leave empty to auto-connect to the same host (works for both local and production).
const SERVER_URL = '';

// ── Socket connection ──────────────────────────────────────────────────────
const socket = SERVER_URL ? io(SERVER_URL) : io();

// ── Countdown timer ────────────────────────────────────────────────────────
const EVENT_START = new Date('2026-04-04T08:00:00Z'); // 9 AM BST (UTC+1)
const EVENT_END   = new Date('2026-04-05T08:00:00Z'); // 9 AM BST next day
const countdownEl = document.getElementById('countdown-display');

function updateCountdown() {
  const now = Date.now();
  let remaining;

  if (now < EVENT_START.getTime()) {
    remaining = EVENT_END.getTime() - EVENT_START.getTime(); // show 24:00:00
  } else if (now >= EVENT_END.getTime()) {
    countdownEl.textContent = '00:00:00';
    return;
  } else {
    remaining = EVENT_END.getTime() - now;
  }

  const h = Math.floor(remaining / 3_600_000);
  const m = Math.floor((remaining % 3_600_000) / 60_000);
  const s = Math.floor((remaining % 60_000) / 1000);
  countdownEl.textContent =
    String(h).padStart(2, '0') + ':' +
    String(m).padStart(2, '0') + ':' +
    String(s).padStart(2, '0');
}

updateCountdown();
setInterval(updateCountdown, 1000);

// ── DOM refs ───────────────────────────────────────────────────────────────
const statusEl        = document.getElementById('connection-status');
const teamsGrid       = document.getElementById('teams-grid');
const leaderboardEl   = document.getElementById('leaderboard');

// ── Local state ────────────────────────────────────────────────────────────
let state = { teams: {} };
const COOLDOWN_MS = 40_000;
const cooldowns = {}; // teamId -> { endsAt, intervalId }
const marathonCelebrated = new Set();
const stonehengeCelebrated = new Set();
const readingCelebrated = new Set();
const windsorCelebrated = new Set();
const ascotCelebrated = new Set();
const edgbastonCelebrated = new Set();
const oldTraffordCelebrated = new Set();
const trentBridgeCelebrated = new Set();
const wokingCelebrated = new Set();

// ── Socket events ──────────────────────────────────────────────────────────
socket.on('connect', () => {
  statusEl.textContent = 'Live';
  statusEl.className = 'status connected';
});

socket.on('disconnect', () => {
  statusEl.textContent = 'Offline';
  statusEl.className = 'status disconnected';
});

socket.on('state', (newState) => {
  state = newState;
  render();
  checkMarathon();
});

// ── Render ─────────────────────────────────────────────────────────────────
function render() {
  renderTeamCards();
  renderLeaderboard();
}

function renderTeamCards() {
  const teams = Object.values(state.teams);

  // Sync cards: add missing, update existing
  const existingIds = new Set([...teamsGrid.querySelectorAll('.team-card')].map(el => el.dataset.id));
  const currentIds = new Set(teams.map(t => t.id));

  // Remove cards for deleted teams
  existingIds.forEach(id => {
    if (!currentIds.has(id)) {
      const el = teamsGrid.querySelector(`[data-id="${id}"]`);
      if (el) el.remove();
    }
  });

  teams.forEach(team => {
    let card = teamsGrid.querySelector(`[data-id="${team.id}"]`);

    if (!card) {
      card = createTeamCard(team);
      teamsGrid.appendChild(card);
    } else {
      updateTeamCard(card, team);
    }
  });
}

function createTeamCard(team) {
  const card = document.createElement('div');
  card.className = 'team-card';
  card.dataset.id = team.id;

  card.innerHTML = `
    <div class="team-card-header">
      <div class="team-name"></div>
    </div>
    <div class="lap-display">0</div>
    <div class="lap-label">total laps</div>
    <div class="distance-display">
      <span class="distance-km">0.00 km</span>
      <span class="distance-sep">·</span>
      <span class="distance-mi">0.00 mi</span>
    </div>
    <div class="card-actions">
      <button class="lap-btn add" aria-label="Add lap">+</button>
    </div>
  `;

  card.querySelector('.team-name').textContent = team.name;
  card.querySelector('.lap-display').textContent = team.laps;
  updateDistance(card, team.laps);

  card.querySelector('.lap-btn.add').addEventListener('click', () => {
    if (cooldowns[team.id]) return;
    socket.emit('add_lap', team.id);
    animateLapDisplay(card);
    startCooldown(team.id, card);
  });

  return card;
}

function updateTeamCard(card, team) {
  const lapEl = card.querySelector('.lap-display');
  const prev = parseInt(lapEl.textContent, 10);

  card.querySelector('.team-name').textContent = team.name;

  if (prev !== team.laps) {
    lapEl.textContent = team.laps;
    updateDistance(card, team.laps);
    if (team.laps > prev) animateLapDisplay(card);
  }
}

function updateDistance(card, laps) {
  const km = (laps * 0.4).toFixed(2);
  const mi = (laps * 0.4 * 0.621371).toFixed(2);
  card.querySelector('.distance-km').textContent = `${km} km`;
  card.querySelector('.distance-mi').textContent = `${mi} mi`;
}

function animateLapDisplay(card) {
  const lapEl = card.querySelector('.lap-display');
  lapEl.classList.remove('lap-pop');
  // Force reflow to restart animation
  void lapEl.offsetWidth;
  lapEl.classList.add('lap-pop');
}

function renderLeaderboard() {
  const teams = Object.values(state.teams)
    .sort((a, b) => b.laps - a.laps);

  leaderboardEl.innerHTML = '';

  if (teams.length === 0) {
    const li = document.createElement('li');
    li.className = 'empty-hint';
    li.textContent = 'No teams yet.';
    leaderboardEl.appendChild(li);
    return;
  }

  const medals = ['🥇', '🥈', '🥉'];

  teams.forEach((team, i) => {
    const li = document.createElement('li');
    const rank = i + 1;
    if (rank <= 3) li.classList.add(`rank-${rank}`);

    li.innerHTML = `
      <span class="rank-badge">${medals[i] ?? rank}</span>
      <span class="lb-name"></span>
      <span class="lb-laps">${team.laps}</span>
      <span class="lb-laps-label">laps</span>
    `;
    li.querySelector('.lb-name').textContent = team.name;
    leaderboardEl.appendChild(li);
  });
}

// ── Marathon popup ─────────────────────────────────────────────────────────
const marathonOverlay = document.getElementById('marathon-overlay');
const marathonMessage = document.getElementById('marathon-message');
document.getElementById('marathon-close').addEventListener('click', () => {
  marathonOverlay.classList.add('hidden');
});

function checkMarathon() {
  Object.values(state.teams).forEach(team => {
    if (team.laps >= 8 && !ascotCelebrated.has(team.id)) {
      ascotCelebrated.add(team.id);
      marathonMessage.textContent = `${team.name} just ran to Ascot race course!`;
      marathonOverlay.classList.remove('hidden');
    }
    if (team.laps < 8) ascotCelebrated.delete(team.id);

    if (team.laps >= 32 && !windsorCelebrated.has(team.id)) {
      windsorCelebrated.add(team.id);
      marathonMessage.textContent = `${team.name} just ran to Windsor!`;
      marathonOverlay.classList.remove('hidden');
    }
    if (team.laps < 32) windsorCelebrated.delete(team.id);

    if (team.laps >= 36 && !wokingCelebrated.has(team.id)) {
      wokingCelebrated.add(team.id);
      marathonMessage.textContent = `${team.name} just ran to Woking Pizza Express!`;
      marathonOverlay.classList.remove('hidden');
    }
    if (team.laps < 36) wokingCelebrated.delete(team.id);

    if (team.laps >= 66 && !readingCelebrated.has(team.id)) {
      readingCelebrated.add(team.id);
      marathonMessage.textContent = `${team.name} just ran to Reading!`;
      marathonOverlay.classList.remove('hidden');
    }
    if (team.laps < 66) readingCelebrated.delete(team.id);

    if (team.laps >= 242 && !stonehengeCelebrated.has(team.id)) {
      stonehengeCelebrated.add(team.id);
      marathonMessage.textContent = `${team.name} just ran to Stonehenge!`;
      marathonOverlay.classList.remove('hidden');
    }
    if (team.laps < 242) stonehengeCelebrated.delete(team.id);

    if (team.laps >= 411 && !edgbastonCelebrated.has(team.id)) {
      edgbastonCelebrated.add(team.id);
      marathonMessage.textContent = `${team.name} just ran to Edgbaston!`;
      marathonOverlay.classList.remove('hidden');
    }
    if (team.laps < 411) edgbastonCelebrated.delete(team.id);

    if (team.laps >= 495 && !trentBridgeCelebrated.has(team.id)) {
      trentBridgeCelebrated.add(team.id);
      marathonMessage.textContent = `${team.name} just ran to Trent Bridge!`;
      marathonOverlay.classList.remove('hidden');
    }
    if (team.laps < 495) trentBridgeCelebrated.delete(team.id);

    if (team.laps >= 721 && !oldTraffordCelebrated.has(team.id)) {
      oldTraffordCelebrated.add(team.id);
      marathonMessage.textContent = `${team.name} just ran to Old Trafford!`;
      marathonOverlay.classList.remove('hidden');
    }
    if (team.laps < 721) oldTraffordCelebrated.delete(team.id);

    if (team.laps >= 106 && !marathonCelebrated.has(team.id)) {
      marathonCelebrated.add(team.id);
      marathonMessage.textContent = `${team.name} just ran to Lord's Cricket Ground!`;
      marathonOverlay.classList.remove('hidden');
    }
    if (team.laps < 106) marathonCelebrated.delete(team.id);
  });
}

// ── Cooldown ───────────────────────────────────────────────────────────────
function startCooldown(teamId, card) {
  const addBtn = card.querySelector('.lap-btn.add');
  const endsAt = Date.now() + COOLDOWN_MS;

  addBtn.disabled = true;

  const intervalId = setInterval(() => {
    const remaining = Math.ceil((endsAt - Date.now()) / 1000);
    if (remaining <= 0) {
      clearInterval(intervalId);
      delete cooldowns[teamId];
      addBtn.disabled = false;
      addBtn.textContent = '+';
    } else {
      addBtn.textContent = remaining + 's';
    }
  }, 500);

  cooldowns[teamId] = { endsAt, intervalId };
  addBtn.textContent = Math.ceil(COOLDOWN_MS / 1000) + 's';
}

