const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const levelEl = document.getElementById("level");
const startOverlay = document.getElementById("startOverlay");
const gameOverOverlay = document.getElementById("gameOverOverlay");
const finalScoreEl = document.getElementById("finalScore");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");
const leftBtn = document.getElementById("leftBtn");
const upBtn = document.getElementById("upBtn");
const rightBtn = document.getElementById("rightBtn");

const state = {
  running: false,
  score: 0,
  lives: 10,
  level: 1,
  speed: 80,
  apples: [],
  spawnTimer: 0,
  spawnInterval: 1.4,
  moveDir: 0,
  pointerActive: false,
  stickActive: false,
};

const player = {
  x: 220,
  y: 560,
  width: 60,
  height: 44,
  speed: 220,
};

const world = {
  width: canvas.width,
  height: canvas.height,
  ground: 600,
};

const tree = {
  x: 60,
  y: 40,
  sway: 0,
};

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function beep(frequency, duration, type = "square") {
  const oscillator = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.value = 0.08;
  oscillator.connect(gain);
  gain.connect(audioCtx.destination);
  oscillator.start();
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
  oscillator.stop(audioCtx.currentTime + duration);
}

function resetGame() {
  state.score = 0;
  state.lives = 10;
  state.level = 1;
  state.speed = 80;
  state.apples = [];
  state.spawnTimer = 0;
  state.spawnInterval = 1.4;
  state.stickActive = false;
  player.x = world.width / 2 - player.width / 2;
  updateHud();
}

function updateHud() {
  scoreEl.textContent = state.score;
  livesEl.textContent = state.lives;
  levelEl.textContent = state.level;
}

function startGame() {
  resetGame();
  state.running = true;
  startOverlay.classList.remove("active");
  gameOverOverlay.classList.remove("active");
  audioCtx.resume();
}

function gameOver() {
  state.running = false;
  finalScoreEl.textContent = state.score;
  gameOverOverlay.classList.add("active");
}

function spawnApple() {
  const size = 18;
  const x = Math.random() * (world.width - size - 30) + 15;
  state.apples.push({
    x,
    y: 120,
    size,
    vy: state.speed + Math.random() * 40,
  });
}

function updateDifficulty(delta) {
  if (!state.running) return;
  const levelUp = Math.floor(state.score / 8) + 1;
  if (levelUp > state.level) {
    state.level = levelUp;
    state.speed += 20;
    state.spawnInterval = Math.max(0.6, state.spawnInterval - 0.08);
  }
  updateHud();
}

function updatePlayer(delta) {
  if (!state.running) return;
  player.x += state.moveDir * player.speed * delta;
  player.x = Math.max(12, Math.min(world.width - player.width - 12, player.x));
}

function updateApples(delta) {
  state.spawnTimer += delta;
  if (state.spawnTimer >= state.spawnInterval) {
    state.spawnTimer = 0;
    spawnApple();
  }

  state.apples.forEach((apple) => {
    apple.y += apple.vy * delta;
  });

  state.apples = state.apples.filter((apple) => {
    const caught = getCatchRects().some((rect) => checkCollision(apple, rect));
    if (caught) {
      state.score += 1;
      beep(660, 0.12, "triangle");
      updateHud();
      return false;
    }
    const missed = apple.y + apple.size >= world.ground;
    if (missed) {
      state.lives -= 1;
      beep(180, 0.2, "sawtooth");
      updateHud();
      if (state.lives <= 0) {
        gameOver();
      }
      return false;
    }
    return true;
  });
}

function checkCollision(apple, basket) {
  return (
    apple.x < basket.x + basket.width &&
    apple.x + apple.size > basket.x &&
    apple.y < basket.y + basket.height &&
    apple.y + apple.size > basket.y
  );
}

function getCatchRects() {
  const rects = [{ ...player }];
  if (!state.stickActive) {
    return rects;
  }
  const stickHeight = 80;
  rects.push({
    x: player.x + player.width / 2 - 6,
    y: player.y - stickHeight,
    width: 12,
    height: stickHeight + player.height,
  });
  return rects;
}

function drawBackground(time) {
  ctx.fillStyle = "#76c96f";
  ctx.fillRect(0, 0, world.width, world.height);

  ctx.fillStyle = "#4fa34c";
  ctx.fillRect(0, world.ground, world.width, world.height - world.ground);

  drawTree(time);
}

function drawTree(time) {
  const trunkX = tree.x;
  const trunkY = tree.y;
  const sway = Math.sin(time * 0.0012) * 4;
  tree.sway = sway;

  const trunkGradient = ctx.createLinearGradient(
    trunkX + 40,
    trunkY + 60,
    trunkX + 80,
    trunkY + 200
  );
  trunkGradient.addColorStop(0, "#7a4a30");
  trunkGradient.addColorStop(0.5, "#5c331f");
  trunkGradient.addColorStop(1, "#8b5b3a");

  ctx.save();
  ctx.translate(sway * 0.4, 0);
  ctx.fillStyle = trunkGradient;
  ctx.fillRect(trunkX + 44, trunkY + 90, 28, 120);
  ctx.fillStyle = "#4a2a1a";
  ctx.fillRect(trunkX + 50, trunkY + 110, 16, 100);
  ctx.restore();

  drawLeafCluster(trunkX + 10, trunkY + 10, 150, 90, time, 0.6);
  drawLeafCluster(trunkX - 6, trunkY + 50, 170, 80, time + 400, 0.4);
  drawLeafCluster(trunkX + 20, trunkY - 20, 130, 70, time + 800, 0.5);

  drawPixelApple(trunkX + 28 + sway, trunkY + 36, 14, true);
  drawPixelApple(trunkX + 90 + sway, trunkY + 20, 14, true);
}

function drawLeafCluster(x, y, width, height, time, density) {
  const sway = Math.sin(time * 0.0018) * 3;
  const leafGradient = ctx.createLinearGradient(x, y, x + width, y + height);
  leafGradient.addColorStop(0, "#2f8d3b");
  leafGradient.addColorStop(0.5, "#2a7b34");
  leafGradient.addColorStop(1, "#1f5f2a");
  ctx.fillStyle = leafGradient;
  ctx.fillRect(x + sway, y, width, height);

  ctx.fillStyle = "rgba(60, 140, 70, 0.75)";
  for (let i = 0; i < 12; i += 1) {
    const offsetX = x + 10 + i * 10 + sway * density;
    const offsetY = y + 8 + (i % 3) * 12;
    ctx.fillRect(offsetX, offsetY, 8, 8);
  }
}

function drawPixelApple(x, y, size, onTree = false) {
  const radius = size / 2;
  const centerX = x + radius;
  const centerY = y + radius;
  const appleGradient = ctx.createRadialGradient(
    centerX - radius * 0.4,
    centerY - radius * 0.4,
    radius * 0.3,
    centerX,
    centerY,
    radius
  );
  appleGradient.addColorStop(0, "#ff9a8d");
  appleGradient.addColorStop(0.4, "#e2362f");
  appleGradient.addColorStop(1, "#991d16");
  ctx.fillStyle = appleGradient;
  drawRoundedRect(x, y, size, size, 4);

  ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
  ctx.fillRect(x + 2, y + 2, size * 0.3, size * 0.25);

  ctx.fillStyle = "#5c2c1c";
  ctx.fillRect(x + size / 2 - 1, y - 4, 3, 5);

  if (onTree) {
    ctx.fillStyle = "#3f7f2d";
    ctx.fillRect(x + size / 2 + 2, y - 2, 6, 4);
  }
}

function drawRoundedRect(x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}

function drawPlayer() {
  const { x, y, width, height } = player;
  ctx.fillStyle = "#c98c3e";
  ctx.fillRect(x + 6, y + 20, width - 12, height - 20);
  ctx.fillStyle = "#8b4d2e";
  ctx.fillRect(x + 10, y + 24, width - 20, height - 28);

  ctx.fillStyle = "#f0b65b";
  ctx.fillRect(x + 18, y - 6, 24, 24);
  ctx.fillRect(x + 14, y + 10, 8, 8);
  ctx.fillRect(x + 38, y + 10, 8, 8);

  ctx.fillStyle = "#f8d39a";
  ctx.fillRect(x + 20, y + 2, 6, 6);
  ctx.fillRect(x + 34, y + 2, 6, 6);

  ctx.fillStyle = "#2a1f1c";
  ctx.fillRect(x + 24, y + 6, 3, 3);
  ctx.fillRect(x + 36, y + 6, 3, 3);
  ctx.fillRect(x + 30, y + 12, 3, 3);

  ctx.fillStyle = "#b57b2e";
  ctx.fillRect(x + 12, y - 6, 8, 8);
  ctx.fillRect(x + 40, y - 6, 8, 8);

  if (state.stickActive) {
    drawStick();
  }
}

function drawStick() {
  const stickX = player.x + player.width / 2 - 2;
  const stickY = player.y - 80;
  ctx.fillStyle = "#d8c27b";
  ctx.fillRect(stickX, stickY, 4, 80);
  ctx.fillStyle = "#8b6a3e";
  ctx.fillRect(stickX + 1, stickY + 10, 2, 60);
  ctx.fillStyle = "#f2e2a6";
  ctx.fillRect(stickX - 2, stickY - 6, 8, 8);
}

function drawApples() {
  state.apples.forEach((apple) => {
    drawPixelApple(apple.x, apple.y, apple.size);
  });
}

function drawGroundLine() {
  ctx.fillStyle = "#3b7b38";
  ctx.fillRect(0, world.ground - 4, world.width, 4);
}

let lastTime = 0;
function loop(timestamp) {
  const delta = Math.min(0.033, (timestamp - lastTime) / 1000 || 0);
  lastTime = timestamp;

  if (state.running) {
    updateDifficulty(delta);
    updatePlayer(delta);
    updateApples(delta);
  }

  ctx.clearRect(0, 0, world.width, world.height);
  drawBackground(timestamp);
  drawGroundLine();
  drawApples();
  drawPlayer();

  requestAnimationFrame(loop);
}

function handleKey(event, isDown) {
  if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") {
    state.moveDir = isDown ? -1 : state.moveDir === -1 ? 0 : state.moveDir;
  }
  if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") {
    state.moveDir = isDown ? 1 : state.moveDir === 1 ? 0 : state.moveDir;
  }
  if (event.key === "ArrowUp" || event.key === "w" || event.key === "W") {
    state.stickActive = isDown;
  }
}

function addPointerControls() {
  const updateFromPointer = (clientX) => {
    const rect = canvas.getBoundingClientRect();
    const pos = ((clientX - rect.left) / rect.width) * world.width;
    player.x = Math.max(12, Math.min(world.width - player.width - 12, pos - player.width / 2));
  };

  canvas.addEventListener("pointerdown", (event) => {
    state.pointerActive = true;
    updateFromPointer(event.clientX);
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!state.pointerActive) return;
    updateFromPointer(event.clientX);
  });

  window.addEventListener("pointerup", () => {
    state.pointerActive = false;
  });
}

startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", startGame);

window.addEventListener("keydown", (event) => handleKey(event, true));
window.addEventListener("keyup", (event) => handleKey(event, false));

leftBtn.addEventListener("pointerdown", () => {
  state.moveDir = -1;
});
leftBtn.addEventListener("pointerup", () => {
  state.moveDir = 0;
});
leftBtn.addEventListener("pointerleave", () => {
  state.moveDir = 0;
});

rightBtn.addEventListener("pointerdown", () => {
  state.moveDir = 1;
});
rightBtn.addEventListener("pointerup", () => {
  state.moveDir = 0;
});
rightBtn.addEventListener("pointerleave", () => {
  state.moveDir = 0;
});

upBtn.addEventListener("pointerdown", () => {
  state.stickActive = true;
});
upBtn.addEventListener("pointerup", () => {
  state.stickActive = false;
});
upBtn.addEventListener("pointerleave", () => {
  state.stickActive = false;
});

addPointerControls();
requestAnimationFrame(loop);
