const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const levelEl = document.getElementById("level");
const highscoreEl = document.getElementById("highscore");
const startOverlay = document.getElementById("startOverlay");
const gameOverOverlay = document.getElementById("gameOverOverlay");
const finalScoreEl = document.getElementById("finalScore");
const finalHighscoreEl = document.getElementById("finalHighscore");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");
const restartBtnAlt = document.getElementById("restartBtnAlt");
const leftBtn = document.getElementById("leftBtn");
const upBtn = document.getElementById("upBtn");
const rightBtn = document.getElementById("rightBtn");
const pauseBtn = document.getElementById("pauseBtn");

const CONFIG = {
  maxLives: 5,
  baseSpeed: 90,
  baseSpawnInterval: 1.25,
  minSpawnInterval: 0.55,
  levelScoreStep: 10,
  speedPerLevel: 18,
  spawnIntervalStep: 0.07,
  itemChances: {
    gold: 0.1,
    bomb: 0.15,
    heart: 0.05,
  },
  bombIncreasePerLevel: 0.01,
};

const state = {
  running: false,
  paused: false,
  score: 0,
  lives: CONFIG.maxLives,
  level: 1,
  speed: CONFIG.baseSpeed,
  items: [],
  spawnTimer: 0,
  spawnInterval: CONFIG.baseSpawnInterval,
  moveDir: 0,
  pointerActive: false,
  stickActive: false,
  floatingText: [],
  sparkles: [],
  levelUpTimer: 0,
  shakeTimer: 0,
  flashTimer: 0,
  highscore: 0,
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

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    audioCtx = new AudioContextClass();
  }
  return audioCtx;
}

function beep(frequency, duration, type = "square") {
  const context = getAudioContext();
  if (!context) return;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.value = 0.08;
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
  oscillator.stop(context.currentTime + duration);
}

function resetGame() {
  state.score = 0;
  state.lives = CONFIG.maxLives;
  state.level = 1;
  state.speed = CONFIG.baseSpeed;
  state.items = [];
  state.spawnTimer = 0;
  state.spawnInterval = CONFIG.baseSpawnInterval;
  state.stickActive = false;
  state.floatingText = [];
  state.sparkles = [];
  state.levelUpTimer = 0;
  state.shakeTimer = 0;
  state.flashTimer = 0;
  state.paused = false;
  player.x = world.width / 2 - player.width / 2;
  pauseBtn.textContent = "Pause";
  updateHud();
}

function updateHud() {
  scoreEl.textContent = state.score;
  livesEl.textContent = state.lives;
  levelEl.textContent = state.level;
  highscoreEl.textContent = state.highscore;
}

function startGame() {
  resetGame();
  state.running = true;
  startOverlay.classList.remove("active");
  gameOverOverlay.classList.remove("active");
  const context = getAudioContext();
  if (context && context.state === "suspended") {
    context.resume();
  }
}

function gameOver() {
  state.running = false;
  state.paused = false;
  finalScoreEl.textContent = state.score;
  finalHighscoreEl.textContent = state.highscore;
  gameOverOverlay.classList.add("active");
  playGameOverSound();
}

function togglePause() {
  if (!state.running) return;
  state.paused = !state.paused;
  pauseBtn.textContent = state.paused ? "Resume" : "Pause";
}

function saveHighscore() {
  try {
    if (state.score > state.highscore) {
      state.highscore = state.score;
      localStorage.setItem("appleHighscore", String(state.highscore));
    }
  } catch (error) {
    state.highscore = Math.max(state.highscore, state.score);
  }
}

function loadHighscore() {
  try {
    const stored = Number(localStorage.getItem("appleHighscore") || 0);
    state.highscore = Number.isNaN(stored) ? 0 : stored;
  } catch (error) {
    state.highscore = 0;
  }
  updateHud();
}

function playGameOverSound() {
  const context = getAudioContext();
  if (!context) return;
  const now = context.currentTime;
  const notes = [220, 185, 155];
  notes.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.value = 0.08;
    oscillator.connect(gain);
    gain.connect(context.destination);
    const startTime = now + index * 0.18;
    const endTime = startTime + 0.18;
    oscillator.start(startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, endTime);
    oscillator.stop(endTime);
  });
}

function getItemType() {
  const baseBomb = CONFIG.itemChances.bomb;
  const bombChance = Math.min(0.35, baseBomb + (state.level - 1) * CONFIG.bombIncreasePerLevel);
  const roll = Math.random();
  if (roll < CONFIG.itemChances.heart) return "heart";
  if (roll < CONFIG.itemChances.heart + CONFIG.itemChances.gold) return "gold";
  if (roll < CONFIG.itemChances.heart + CONFIG.itemChances.gold + bombChance) return "bomb";
  return "apple";
}

function spawnItem() {
  const type = getItemType();
  const size = type === "bomb" ? 20 : 18;
  const x = Math.random() * (world.width - size - 30) + 15;
  const points = type === "gold" ? 5 : type === "apple" ? 1 : 0;
  state.items.push({
    type,
    x,
    y: 120,
    size,
    vy: state.speed + Math.random() * 40,
    points,
  });
}

function updateDifficulty() {
  if (!state.running) return;
  const levelUp = Math.floor(state.score / CONFIG.levelScoreStep) + 1;
  if (levelUp > state.level) {
    state.level = levelUp;
    state.speed += CONFIG.speedPerLevel;
    state.spawnInterval = Math.max(
      CONFIG.minSpawnInterval,
      state.spawnInterval - CONFIG.spawnIntervalStep
    );
    state.levelUpTimer = 1;
    playLevelUpSound();
  }
  updateHud();
}

function updatePlayer(delta) {
  if (!state.running) return;
  player.x += state.moveDir * player.speed * delta;
  player.x = Math.max(12, Math.min(world.width - player.width - 12, player.x));
}

function updateItems(delta) {
  state.spawnTimer += delta;
  if (state.spawnTimer >= state.spawnInterval) {
    state.spawnTimer = 0;
    spawnItem();
  }

  state.items.forEach((item) => {
    item.y += item.vy * delta;
  });

  state.items = state.items.filter((item) => {
    const caught = getCatchRects().some((rect) => checkCollision(item, rect));
    if (caught) {
      handleCatch(item);
      return false;
    }
    const missed = item.y + item.size >= world.ground;
    if (missed) {
      handleMiss(item);
      return false;
    }
    return true;
  });
}

function checkCollision(item, basket) {
  return (
    item.x < basket.x + basket.width &&
    item.x + item.size > basket.x &&
    item.y < basket.y + basket.height &&
    item.y + item.size > basket.y
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

function handleCatch(item) {
  if (item.type === "bomb") {
    state.lives -= 1;
    addFloatingText("-1", item.x, item.y, "#ff6262");
    beep(120, 0.25, "sawtooth");
    triggerShake();
    triggerFlash();
  } else if (item.type === "heart") {
    state.lives = Math.min(CONFIG.maxLives, state.lives + 1);
    addFloatingText("+1 ❤️", item.x, item.y, "#ffb3d1");
    beep(520, 0.18, "triangle");
  } else {
    state.score += item.points;
    addFloatingText(`+${item.points}`, item.x, item.y, "#fff5a5");
    if (item.type === "gold") {
      spawnSparkle(item.x + item.size / 2, item.y + item.size / 2);
      beep(880, 0.18, "triangle");
    } else {
      beep(660, 0.12, "triangle");
    }
    saveHighscore();
  }
  updateHud();
  updateDifficulty();
  if (state.lives <= 0) {
    saveHighscore();
    gameOver();
  }
}

function handleMiss(item) {
  if (item.type === "bomb" || item.type === "heart") {
    return;
  }
  state.lives -= 1;
  beep(180, 0.2, "sawtooth");
  addFloatingText("-1", item.x, world.ground - 12, "#ff8b8b");
  triggerShake();
  updateHud();
  if (state.lives <= 0) {
    saveHighscore();
    gameOver();
  }
}

function addFloatingText(text, x, y, color) {
  state.floatingText.push({
    text,
    x,
    y,
    color,
    time: 0,
  });
}

function spawnSparkle(x, y) {
  for (let i = 0; i < 6; i += 1) {
    state.sparkles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 40,
      vy: (Math.random() - 0.8) * 50,
      life: 0.6,
    });
  }
}

function triggerShake() {
  state.shakeTimer = 0.3;
}

function triggerFlash() {
  state.flashTimer = 0.25;
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

function drawPixelApple(x, y, size, onTree = false, isGold = false) {
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
  if (isGold) {
    appleGradient.addColorStop(0, "#fff6b8");
    appleGradient.addColorStop(0.4, "#ffcc4d");
    appleGradient.addColorStop(1, "#c9871f");
  } else {
    appleGradient.addColorStop(0, "#ff9a8d");
    appleGradient.addColorStop(0.4, "#e2362f");
    appleGradient.addColorStop(1, "#991d16");
  }
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
  state.items.forEach((item) => {
    if (item.type === "bomb") {
      drawBomb(item.x, item.y, item.size);
      return;
    }
    if (item.type === "heart") {
      drawHeart(item.x, item.y, item.size);
      return;
    }
    drawPixelApple(item.x, item.y, item.size, false, item.type === "gold");
  });
}

function drawBomb(x, y, size) {
  ctx.fillStyle = "#3a3a3a";
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = "#555";
  ctx.fillRect(x + 3, y + 3, size - 6, size - 6);
  ctx.fillStyle = "#9a2c2c";
  ctx.fillRect(x + size / 2 - 2, y - 6, 4, 6);
  ctx.fillStyle = "#f6d05b";
  ctx.fillRect(x + size / 2 - 1, y - 10, 2, 4);
}

function drawHeart(x, y, size) {
  ctx.fillStyle = "#ff7bb0";
  ctx.fillRect(x + 2, y + 4, size - 4, size - 6);
  ctx.fillRect(x + 4, y + 2, size - 8, size - 2);
  ctx.fillStyle = "#ffb3d1";
  ctx.fillRect(x + 6, y + 6, size - 12, size - 12);
}

function drawGroundLine() {
  ctx.fillStyle = "#3b7b38";
  ctx.fillRect(0, world.ground - 4, world.width, 4);
}

function drawFloatingText(delta) {
  state.floatingText = state.floatingText.filter((text) => {
    text.time += delta;
    text.y -= 18 * delta;
    ctx.fillStyle = text.color;
    ctx.font = "16px Trebuchet MS";
    ctx.fillText(text.text, text.x, text.y);
    return text.time < 1;
  });
}

function drawSparkles(delta) {
  state.sparkles = state.sparkles.filter((sparkle) => {
    sparkle.life -= delta;
    sparkle.x += sparkle.vx * delta;
    sparkle.y += sparkle.vy * delta;
    ctx.fillStyle = "rgba(255, 244, 185, 0.9)";
    ctx.fillRect(sparkle.x, sparkle.y, 3, 3);
    return sparkle.life > 0;
  });
}

function drawLevelUp(delta) {
  if (state.levelUpTimer <= 0) return;
  state.levelUpTimer -= delta;
  ctx.fillStyle = "rgba(255, 244, 160, 0.9)";
  ctx.font = "20px Trebuchet MS";
  ctx.fillText("Level Up!", world.width / 2 - 45, 200);
}

let lastTime = 0;
function loop(timestamp) {
  const delta = Math.min(0.033, (timestamp - lastTime) / 1000 || 0);
  lastTime = timestamp;

  const effectsDelta = state.running && !state.paused ? delta : 0;
  if (state.running && !state.paused) {
    updatePlayer(delta);
    updateItems(delta);
  }

  if (state.shakeTimer > 0) {
    state.shakeTimer -= effectsDelta;
  }
  if (state.flashTimer > 0) {
    state.flashTimer -= effectsDelta;
  }

  ctx.clearRect(0, 0, world.width, world.height);
  ctx.save();
  if (state.shakeTimer > 0) {
    const intensity = state.shakeTimer * 6;
    ctx.translate((Math.random() - 0.5) * intensity, (Math.random() - 0.5) * intensity);
  }
  drawBackground(timestamp);
  drawGroundLine();
  drawApples();
  drawPlayer();
  drawSparkles(effectsDelta);
  drawLevelUp(effectsDelta);
  drawFloatingText(effectsDelta);
  if (state.flashTimer > 0) {
    const alpha = state.flashTimer / 0.25;
    ctx.fillStyle = `rgba(255, 80, 80, ${0.35 * alpha})`;
    ctx.fillRect(0, 0, world.width, world.height);
  }
  ctx.restore();

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
  if (event.key === "Escape" && isDown) {
    togglePause();
  }
}

function addPointerControls() {
  const updateFromPointer = (clientX) => {
    if (!state.running || state.paused) return;
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
restartBtnAlt.addEventListener("click", startGame);
pauseBtn.addEventListener("click", togglePause);

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
loadHighscore();
requestAnimationFrame(loop);

function playLevelUpSound() {
  const context = getAudioContext();
  if (!context) return;
  const now = context.currentTime;
  const notes = [440, 554, 659];
  notes.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.value = frequency;
    gain.gain.value = 0.06;
    oscillator.connect(gain);
    gain.connect(context.destination);
    const startTime = now + index * 0.08;
    const endTime = startTime + 0.12;
    oscillator.start(startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, endTime);
    oscillator.stop(endTime);
  });
}
