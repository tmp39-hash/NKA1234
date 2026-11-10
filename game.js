// Main Game Engine
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const scoreEl = document.getElementById('score');
const hiScoreEl = document.getElementById('hiScore');
const startOverlay = document.getElementById('startOverlay');
const gameOverOverlay = document.getElementById('gameOverOverlay');
const finalScoreText = document.getElementById('finalScoreText');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const soundToggle = document.getElementById('soundToggle');
const jumpTouchBtn = document.getElementById('jumpTouchBtn');
const duckTouchBtn = document.getElementById('duckTouchBtn');

// Game Constants & Configuration
const GROUND_Y = 200;
const GRAVITY = 0.65;
const JUMP_FORCE = -12;
const INITIAL_SPEED = 6;
const MAX_SPEED = 14;
const ACCELERATION = 0.001;

let isPlaying = false;
let isGameOver = false;
let score = 0;
let hiScore = parseInt(localStorage.getItem('dino_hi_score') || '0', 10);
let currentSpeed = INITIAL_SPEED;
let lastMilestone = 0;
let animationFrameId = null;

// Update High Score Display
hiScoreEl.textContent = `HI ${String(hiScore).padStart(5, '0')}`;

// Sound toggle handler
soundToggle.addEventListener('click', () => {
  const isEnabled = window.soundController.toggle();
  soundToggle.textContent = isEnabled ? '🔊 Sound: ON' : '🔇 Sound: OFF';
});

// Dino Character Definition
const dino = {
  x: 50,
  y: GROUND_Y - 44,
  width: 44,
  height: 48,
  vy: 0,
  isJumping: false,
  isDucking: false,
  runFrame: 0,
  tickCount: 0,

  reset() {
    this.x = 50;
    this.y = GROUND_Y - 48;
    this.width = 44;
    this.height = 48;
    this.vy = 0;
    this.isJumping = false;
    this.isDucking = false;
    this.runFrame = 0;
    this.tickCount = 0;
  },

  jump() {
    if (!this.isJumping) {
      this.vy = JUMP_FORCE;
      this.isJumping = true;
      window.soundController.playJump();
    }
  },

  duck(state) {
    if (this.isJumping) return;
    this.isDucking = state;
    if (state) {
      this.height = 28;
      this.width = 56;
      this.y = GROUND_Y - this.height;
    } else {
      this.height = 48;
      this.width = 44;
      this.y = GROUND_Y - this.height;
    }
  },

  update() {
    // Jump physics
    if (this.isJumping) {
      this.vy += GRAVITY;
      this.y += this.vy;

      const groundLimit = GROUND_Y - this.height;
      if (this.y >= groundLimit) {
        this.y = groundLimit;
        this.vy = 0;
        this.isJumping = false;
      }
    }

    // Running animation legs toggle
    this.tickCount++;
    if (this.tickCount % 6 === 0) {
      this.runFrame = this.runFrame === 0 ? 1 : 0;
    }
  },

  draw() {
    ctx.fillStyle = '#535353';

    if (this.isDucking) {
      // Low crouching Dino
      // Body
      ctx.fillRect(this.x + 10, this.y + 8, 38, 14);
      // Head
      ctx.fillRect(this.x + 36, this.y + 4, 20, 14);
      // Snout
      ctx.fillRect(this.x + 48, this.y + 8, 8, 8);
      // Eye
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(this.x + 44, this.y + 6, 3, 3);
      ctx.fillStyle = '#535353';
      // Tail
      ctx.fillRect(this.x, this.y + 10, 10, 6);
      // Ducking Legs
      if (this.runFrame === 0) {
        ctx.fillRect(this.x + 18, this.y + 22, 6, 6);
        ctx.fillRect(this.x + 32, this.y + 22, 6, 4);
      } else {
        ctx.fillRect(this.x + 18, this.y + 22, 6, 4);
        ctx.fillRect(this.x + 32, this.y + 22, 6, 6);
      }
      return;
    }

    // Normal standing/jumping Dino
    // Head
    ctx.fillRect(this.x + 20, this.y, 22, 16);
    ctx.fillRect(this.x + 24, this.y + 16, 18, 6);

    // Eye
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(this.x + 34, this.y + 4, 3, 3);
    ctx.fillStyle = '#535353';

    // Body
    ctx.fillRect(this.x + 12, this.y + 16, 20, 20);
    ctx.fillRect(this.x + 8, this.y + 22, 8, 14);

    // Tail
    ctx.fillRect(this.x, this.y + 24, 8, 8);
    ctx.fillRect(this.x - 4, this.y + 22, 4, 6);

    // Tiny arms
    ctx.fillRect(this.x + 32, this.y + 24, 6, 3);
    ctx.fillRect(this.x + 35, this.y + 27, 3, 4);

    // Legs
    if (this.isJumping) {
      // Both legs tucked slightly
      ctx.fillRect(this.x + 16, this.y + 36, 4, 8);
      ctx.fillRect(this.x + 24, this.y + 36, 4, 8);
    } else {
      if (this.runFrame === 0) {
        // Leg 1 down, Leg 2 bent
        ctx.fillRect(this.x + 14, this.y + 36, 4, 12);
        ctx.fillRect(this.x + 18, this.y + 44, 4, 4);
        ctx.fillRect(this.x + 24, this.y + 36, 4, 7);
      } else {
        // Leg 1 bent, Leg 2 down
        ctx.fillRect(this.x + 14, this.y + 36, 4, 7);
        ctx.fillRect(this.x + 24, this.y + 36, 4, 12);
        ctx.fillRect(this.x + 28, this.y + 44, 4, 4);
      }
    }
  }
};

// Ground with scrolling bumps and pebbles
const ground = {
  x: 0,
  bumps: [
    { x: 50, w: 20 }, { x: 120, w: 10 }, { x: 230, w: 30 },
    { x: 340, w: 15 }, { x: 480, w: 25 }, { x: 620, w: 18 },
    { x: 740, w: 35 }
  ],
  update(speed) {
    this.x = (this.x - speed) % 40;
    for (let bump of this.bumps) {
      bump.x -= speed;
      if (bump.x + bump.w < 0) {
        bump.x = canvas.width + Math.random() * 80;
      }
    }
  },
  draw() {
    ctx.strokeStyle = '#535353';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(canvas.width, GROUND_Y);
    ctx.stroke();

    // Small dashed gravel
    ctx.fillStyle = '#7a7a7a';
    for (let b of this.bumps) {
      ctx.fillRect(b.x, GROUND_Y + 4, b.w, 1.5);
      ctx.fillRect(b.x + 10, GROUND_Y + 9, 3, 2);
    }
  }
};

// Background Clouds
let clouds = [
  { x: 150, y: 40, w: 46, h: 14, speed: 0.8 },
  { x: 420, y: 65, w: 52, h: 16, speed: 1.1 },
  { x: 680, y: 30, w: 40, h: 12, speed: 0.9 }
];

function updateAndDrawClouds() {
  ctx.fillStyle = '#dcdcdc';
  for (let c of clouds) {
    if (isPlaying) c.x -= c.speed;
    if (c.x + c.w < 0) {
      c.x = canvas.width + Math.random() * 100;
      c.y = 20 + Math.random() * 60;
    }
    // Draw cloud shape
    ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.fillRect(c.x + 8, c.y - 6, c.w - 18, 6);
  }
}

// Obstacles: Cacti and Pterodactyls
let obstacles = [];
let obstacleTimer = 0;
let minSpawnInterval = 65;

function spawnObstacle() {
  const r = Math.random();
  // Spawn pterodactyl only after score reaches 200
  if (score > 200 && r < 0.28) {
    // Flying bird at high or mid height
    const heights = [GROUND_Y - 55, GROUND_Y - 30];
    const birdY = heights[Math.floor(Math.random() * heights.length)];
    obstacles.push({
      type: 'bird',
      x: canvas.width,
      y: birdY,
      width: 36,
      height: 24,
      wingState: 0,
      tick: 0
    });
  } else {
    // Cactus (single, double, or large)
    const isBig = Math.random() > 0.6;
    const isDouble = Math.random() > 0.65;
    const w = isDouble ? 34 : (isBig ? 24 : 16);
    const h = isBig ? 46 : 35;
    obstacles.push({
      type: 'cactus',
      x: canvas.width,
      y: GROUND_Y - h,
      width: w,
      height: h,
      isBig: isBig,
      isDouble: isDouble
    });
  }
}

function updateAndDrawObstacles() {
  obstacleTimer++;
  // Calculate dynamic interval according to speed
  const currentInterval = Math.max(45, Math.floor(minSpawnInterval - (currentSpeed - INITIAL_SPEED) * 2));

  if (obstacleTimer > currentInterval && Math.random() < 0.35) {
    spawnObstacle();
    obstacleTimer = 0;
  }

  for (let i = obstacles.length - 1; i >= 0; i--) {
    const obs = obstacles[i];
    obs.x -= currentSpeed;

    // Draw obstacle
    ctx.fillStyle = '#535353';
    if (obs.type === 'cactus') {
      // Main trunk
      ctx.fillRect(obs.x + 4, obs.y, obs.width - 8, obs.height);
      // Arms
      ctx.fillRect(obs.x, obs.y + 10, 4, obs.height * 0.4);
      ctx.fillRect(obs.x + obs.width - 4, obs.y + 6, 4, obs.height * 0.4);
    } else if (obs.type === 'bird') {
      // Pterodactyl wing flap
      obs.tick++;
      if (obs.tick % 8 === 0) {
        obs.wingState = obs.wingState === 0 ? 1 : 0;
      }
      // Body & beak
      ctx.fillRect(obs.x + 8, obs.y + 6, 20, 10);
      ctx.fillRect(obs.x, obs.y + 8, 8, 4);
      // Wings
      if (obs.wingState === 0) {
        // Wings pointing UP
        ctx.fillRect(obs.x + 12, obs.y - 8, 8, 14);
      } else {
        // Wings pointing DOWN
        ctx.fillRect(obs.x + 12, obs.y + 12, 8, 12);
      }
    }

    // Check Collision with Dino (with slight inward padding for fair hitboxes)
    const pad = 6;
    if (
      dino.x + pad < obs.x + obs.width - pad &&
      dino.x + dino.width - pad > obs.x + pad &&
      dino.y + pad < obs.y + obs.height - pad &&
      dino.y + dino.height - pad > obs.y + pad
    ) {
      triggerGameOver();
      return;
    }

    // Remove offscreen
    if (obs.x + obs.width < 0) {
      obstacles.splice(i, 1);
    }
  }
}

// Game Flow Management
function startGame() {
  startOverlay.classList.add('hidden');
  gameOverOverlay.classList.add('hidden');
  obstacles = [];
  obstacleTimer = 0;
  score = 0;
  lastMilestone = 0;
  currentSpeed = INITIAL_SPEED;
  isGameOver = false;
  isPlaying = true;
  dino.reset();

  window.soundController.init();

  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  gameLoop();
}

function triggerGameOver() {
  isPlaying = false;
  isGameOver = true;
  window.soundController.playHit();

  if (score > hiScore) {
    hiScore = score;
    localStorage.setItem('dino_hi_score', hiScore);
    hiScoreEl.textContent = `HI ${String(hiScore).padStart(5, '0')}`;
  }

  finalScoreText.textContent = `SCORE: ${score}`;
  gameOverOverlay.classList.remove('hidden');
}

function updateScore() {
  score++;
  scoreEl.textContent = String(score).padStart(5, '0');

  // Milestone beep every 100 points
  if (score > 0 && score % 100 === 0 && score !== lastMilestone) {
    lastMilestone = score;
    window.soundController.playScoreMilestone();
  }

  // Gradually increase speed
  if (currentSpeed < MAX_SPEED) {
    currentSpeed += ACCELERATION;
  }
}

// Main Render & Update Loop
function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  updateAndDrawClouds();
  ground.update(isPlaying ? currentSpeed : 0);
  ground.draw();

  if (isPlaying) {
    dino.update();
    updateScore();
  }

  dino.draw();

  if (isPlaying) {
    updateAndDrawObstacles();
  } else if (isGameOver) {
    // Redraw static obstacles at crash
    for (let obs of obstacles) {
      ctx.fillStyle = '#777';
      ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
    }
  }

  if (isPlaying) {
    animationFrameId = requestAnimationFrame(gameLoop);
  }
}

// Keyboard Controls
const activeKeys = {};
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'ArrowUp') {
    e.preventDefault();
    if (!isPlaying && !isGameOver) {
      startGame();
    } else if (isGameOver) {
      startGame();
    } else {
      dino.jump();
    }
  } else if (e.code === 'ArrowDown') {
    e.preventDefault();
    if (isPlaying) {
      dino.duck(true);
    }
  }
});

window.addEventListener('keyup', (e) => {
  if (e.code === 'ArrowDown') {
    dino.duck(false);
  }
});

// UI & Mobile Touch Controls
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

jumpTouchBtn.addEventListener('touchstart', (e) => {
  e.preventDefault();
  if (!isPlaying) startGame();
  else dino.jump();
});
jumpTouchBtn.addEventListener('click', () => {
  if (!isPlaying) startGame();
  else dino.jump();
});

duckTouchBtn.addEventListener('touchstart', (e) => {
  e.preventDefault();
  if (isPlaying) dino.duck(true);
});
duckTouchBtn.addEventListener('touchend', (e) => {
  e.preventDefault();
  if (isPlaying) dino.duck(false);
});
duckTouchBtn.addEventListener('mousedown', () => {
  if (isPlaying) dino.duck(true);
});
duckTouchBtn.addEventListener('mouseup', () => {
  if (isPlaying) dino.duck(false);
});

// Initial canvas draw to show scene before game start
ground.draw();
updateAndDrawClouds();
dino.draw();

