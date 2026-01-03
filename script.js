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
const leftBtn = document.getElementById("leftBtn");
const upBtn = document.getElementById("upBtn");
const rightBtn = document.getElementById("rightBtn");
const pauseBtn = document.getElementById("pauseBtn");
const muteBtn = document.getElementById("muteBtn");

const CONFIG = {
  maxLives: 5,
  baseSpeed: 90,
  baseSpawnInterval: 1.2,
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
  levelUpDuration: 0.8,
  shakeDuration: 0.25,
  basketShakeDuration: 0.2,
  particleMax: 40,
  scoreAnimSpeed: 12,
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
  if (GameState.muted) return;
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

const GameState = {
  running: false,
  paused: false,
  score: 0,
  scoreDisplay: 0,
  lives: CONFIG.maxLives,
  level: 1,
  speed: CONFIG.baseSpeed,
  spawnTimer: 0,
  spawnInterval: CONFIG.baseSpawnInterval,
  highscore: 0,
  levelUpTimer: 0,
  shakeTimer: 0,
  flashTimer: 0,
  muted: false,
  stickActive: false,

  reset() {
    this.score = 0;
    this.scoreDisplay = 0;
    this.lives = CONFIG.maxLives;
    this.level = 1;
    this.speed = CONFIG.baseSpeed;
    this.spawnTimer = 0;
    this.spawnInterval = CONFIG.baseSpawnInterval;
    this.levelUpTimer = 0;
    this.shakeTimer = 0;
    this.flashTimer = 0;
    this.paused = false;
    this.stickActive = false;
  },
};

const Player = {
  x: 220,
  y: 560,
  width: 60,
  height: 44,
  speed: 220,
  moveDir: 0,
  blinkTimer: 0,
  blinkDuration: 0.12,
  expression: "idle",
  expressionTimer: 0,
  basketShake: 0,

  reset() {
    this.x = world.width / 2 - this.width / 2;
    this.moveDir = 0;
    this.blinkTimer = 0;
    this.expression = "idle";
    this.expressionTimer = 0;
    this.basketShake = 0;
  },

  setExpression(type, duration = 0.4) {
    this.expression = type;
    this.expressionTimer = duration;
  },

  update(delta) {
    this.x += this.moveDir * this.speed * delta;
    this.x = Math.max(12, Math.min(world.width - this.width - 12, this.x));

    this.blinkTimer += delta;
    if (this.blinkTimer > 3 + Math.random() * 2) {
      this.blinkTimer = -this.blinkDuration;
    }

    if (this.expressionTimer > 0) {
      this.expressionTimer -= delta;
      if (this.expressionTimer <= 0) {
        this.expression = "idle";
      }
    }

    if (this.basketShake > 0) {
      this.basketShake -= delta;
    }
  },

  draw() {
    const { x, y, width, height } = this;
    const shakeOffset = this.basketShake > 0 ? Math.sin(this.basketShake * 40) * 2 : 0;
    const basketX = x + shakeOffset;

    ctx.fillStyle = "#c98c3e";
    ctx.fillRect(basketX + 6, y + 20, width - 12, height - 20);
    ctx.fillStyle = "#8b4d2e";
    ctx.fillRect(basketX + 10, y + 24, width - 20, height - 28);

    ctx.fillStyle = "#f0b65b";
    ctx.fillRect(basketX + 18, y - 6, 24, 24);
    ctx.fillRect(basketX + 14, y + 10, 8, 8);
    ctx.fillRect(basketX + 38, y + 10, 8, 8);

    const blink = this.blinkTimer < 0;
    if (blink) {
      ctx.fillStyle = "#2a1f1c";
      ctx.fillRect(basketX + 23, y + 7, 6, 2);
      ctx.fillRect(basketX + 35, y + 7, 6, 2);
    } else {
      ctx.fillStyle = "#f8d39a";
      ctx.fillRect(basketX + 20, y + 2, 6, 6);
      ctx.fillRect(basketX + 34, y + 2, 6, 6);
      ctx.fillStyle = "#2a1f1c";
      ctx.fillRect(basketX + 24, y + 6, 3, 3);
      ctx.fillRect(basketX + 36, y + 6, 3, 3);
    }

    ctx.fillStyle = this.expression === "sad" ? "#6b3c2f" : "#2a1f1c";
    if (this.expression === "happy") {
      ctx.fillRect(basketX + 29, y + 12, 6, 2);
      ctx.fillRect(basketX + 28, y + 10, 8, 2);
    } else if (this.expression === "shock") {
      ctx.fillRect(basketX + 30, y + 11, 4, 4);
    } else if (this.expression === "sad") {
      ctx.fillRect(basketX + 29, y + 14, 6, 2);
      ctx.fillRect(basketX + 30, y + 12, 4, 2);
    } else {
      ctx.fillRect(basketX + 30, y + 12, 3, 3);
    }

    ctx.fillStyle = "#b57b2e";
    ctx.fillRect(basketX + 12, y - 6, 8, 8);
    ctx.fillRect(basketX + 40, y - 6, 8, 8);

    if (GameState.stickActive) {
      this.drawStick(basketX);
    }
  },

  drawStick(basketX) {
    const stickX = basketX + this.width / 2 - 2;
    const stickY = this.y - 80;
    ctx.fillStyle = "#d8c27b";
    ctx.fillRect(stickX, stickY, 4, 80);
    ctx.fillStyle = "#8b6a3e";
    ctx.fillRect(stickX + 1, stickY + 10, 2, 60);
    ctx.fillStyle = "#f2e2a6";
    ctx.fillRect(stickX - 2, stickY - 6, 8, 8);
  },
};

const AudioManager = {
  initialized: false,
  enabled: false,
  sounds: {},
  loaded: {},

  init() {
    if (this.initialized) return;
    this.initialized = true;
    if (!window.Howl || !window.Howler) {
      this.enabled = false;
      return;
    }
    try {
      this.enabled = true;
      this.sounds = {
        bgm: new Howl({
          src: ["assets/bgm/bgm.mp3"],
          loop: true,
          volume: 0.3,
          onload: () => {
            this.loaded.bgm = true;
          },
          onloaderror: () => {
            this.loaded.bgm = false;
          },
        }),
        catch: new Howl({
          src: ["assets/sfx/catch.mp3"],
          volume: 0.6,
          onload: () => {
            this.loaded.catch = true;
          },
          onloaderror: () => {
            this.loaded.catch = false;
          },
        }),
        miss: new Howl({
          src: ["assets/sfx/miss.mp3"],
          volume: 0.6,
          onload: () => {
            this.loaded.miss = true;
          },
          onloaderror: () => {
            this.loaded.miss = false;
          },
        }),
        hit: new Howl({
          src: ["assets/sfx/hit.mp3"],
          volume: 0.6,
          onload: () => {
            this.loaded.hit = true;
          },
          onloaderror: () => {
            this.loaded.hit = false;
          },
        }),
        levelup: new Howl({
          src: ["assets/sfx/levelup.mp3"],
          volume: 0.6,
          onload: () => {
            this.loaded.levelup = true;
          },
          onloaderror: () => {
            this.loaded.levelup = false;
          },
        }),
        gameover: new Howl({
          src: ["assets/sfx/gameover.mp3"],
          volume: 0.7,
          onload: () => {
            this.loaded.gameover = true;
          },
          onloaderror: () => {
            this.loaded.gameover = false;
          },
        }),
      };
    } catch (error) {
      this.enabled = false;
    }
  },

  play(name, fallback) {
    if (GameState.muted) return;
    if (this.enabled && this.sounds[name] && this.loaded[name] !== false) {
      try {
        this.sounds[name].play();
        return;
      } catch (error) {
        this.loaded[name] = false;
      }
    }
    if (fallback) fallback();
  },

  playBgm() {
    if (GameState.muted) return;
    if (this.enabled && this.sounds.bgm && this.loaded.bgm !== false) {
      try {
        this.sounds.bgm.play();
      } catch (error) {
        this.loaded.bgm = false;
      }
    }
  },

  stopBgm() {
    if (this.enabled && this.sounds.bgm) {
      try {
        this.sounds.bgm.stop();
      } catch (error) {
        this.loaded.bgm = false;
      }
    }
  },
};

const UIManager = {
  updateHUD() {
    scoreEl.textContent = Math.floor(GameState.scoreDisplay);
    livesEl.textContent = GameState.lives;
    levelEl.textContent = GameState.level;
    highscoreEl.textContent = GameState.highscore;
  },

  updateScoreDisplay(delta) {
    const diff = GameState.score - GameState.scoreDisplay;
    GameState.scoreDisplay += diff * Math.min(1, delta * CONFIG.scoreAnimSpeed);
  },

  showGameOver() {
    finalScoreEl.textContent = GameState.score;
    finalHighscoreEl.textContent = GameState.highscore;
    gameOverOverlay.classList.add("active");
  },

  hideOverlays() {
    startOverlay.classList.remove("active");
    gameOverOverlay.classList.remove("active");
  },

  updateMuteButton() {
    muteBtn.textContent = GameState.muted ? "🔇" : "🔈";
  },
};

const FXManager = {
  particles: [],
  floatingText: [],

  spawnCatchFX(x, y, text, color) {
    this.floatingText.push({ text, x, y, color, time: 0 });
    for (let i = 0; i < 8; i += 1) {
      if (this.particles.length >= CONFIG.particleMax) break;
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 60,
        vy: (Math.random() - 0.8) * 60,
        life: 0.6,
      });
    }
  },

  spawnMissFX(x, y) {
    this.floatingText.push({ text: "-1", x, y, color: "#ff8b8b", time: 0 });
  },

  update(delta) {
    this.particles = this.particles.filter((particle) => {
      particle.life -= delta;
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      return particle.life > 0;
    });

    this.floatingText = this.floatingText.filter((text) => {
      text.time += delta;
      text.y -= 18 * delta;
      return text.time < 1;
    });
  },

  draw() {
    this.particles.forEach((particle) => {
      ctx.fillStyle = "rgba(255, 244, 185, 0.9)";
      ctx.fillRect(particle.x, particle.y, 3, 3);
      ctx.fillRect(particle.x - 2, particle.y + 1, 2, 1);
      ctx.fillRect(particle.x + 3, particle.y + 1, 2, 1);
    });

    this.floatingText.forEach((text) => {
      ctx.fillStyle = text.color;
      ctx.font = "16px Trebuchet MS";
      ctx.fillText(text.text, text.x, text.y);
    });
  },
};

class FallingLeaf {
  constructor() {
    this.reset(true);
  }

  reset(fromTop = false) {
    this.x = Math.random() * world.width;
    this.y = fromTop ? -20 - Math.random() * 40 : Math.random() * world.height;
    this.size = 6 + Math.random() * 8;
    this.speed = 12 + Math.random() * 18;
    this.swing = 0.6 + Math.random() * 1.2;
    this.swingOffset = Math.random() * Math.PI * 2;
    this.opacity = 0.6 + Math.random() * 0.3;
    this.color = Math.random() > 0.5 ? "#6ecf5b" : "#3f9b4c";
  }

  update(delta, time) {
    this.y += this.speed * delta;
    this.x += Math.sin(time * 0.002 + this.swingOffset) * this.swing;
  }

  draw() {
    ctx.globalAlpha = this.opacity;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, this.size * 0.6, this.size, 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

const leaves = [];
const MAX_LEAVES = 20;

function spawnLeaf() {
  if (leaves.length >= MAX_LEAVES) return;
  leaves.push(new FallingLeaf());
}

function updateLeaves(delta, time) {
  if (leaves.length < MAX_LEAVES && Math.random() < 0.05) {
    spawnLeaf();
  }
  for (let i = leaves.length - 1; i >= 0; i -= 1) {
    const leaf = leaves[i];
    leaf.update(delta, time);
    if (leaf.y - leaf.size > world.height) {
      leaves.splice(i, 1);
    }
  }
}

function drawLeaves() {
  leaves.forEach((leaf) => leaf.draw());
}

const AppleManager = {
  items: [],

  reset() {
    this.items = [];
  },

  getItemType() {
    const baseBomb = CONFIG.itemChances.bomb;
    const bombChance = Math.min(0.35, baseBomb + (GameState.level - 1) * CONFIG.bombIncreasePerLevel);
    const roll = Math.random();
    if (roll < CONFIG.itemChances.heart) return "heart";
    if (roll < CONFIG.itemChances.heart + CONFIG.itemChances.gold) return "gold";
    if (roll < CONFIG.itemChances.heart + CONFIG.itemChances.gold + bombChance) return "bomb";
    return "apple";
  },

  spawn() {
    const type = this.getItemType();
    const size = type === "bomb" ? 20 : 18;
    const x = Math.random() * (world.width - size - 30) + 15;
    const points = type === "gold" ? 5 : type === "apple" ? 1 : 0;
    this.items.push({
      type,
      x,
      y: 120,
      size,
      vy: GameState.speed + Math.random() * 40,
      points,
    });
  },

  update(delta) {
    GameState.spawnTimer += delta;
    if (GameState.spawnTimer >= GameState.spawnInterval) {
      GameState.spawnTimer = 0;
      this.spawn();
    }

    this.items.forEach((item) => {
      item.y += item.vy * delta;
    });

    this.items = this.items.filter((item) => {
      const caught = InputManager.getCatchRects().some((rect) => this.checkCollision(item, rect));
      if (caught) {
        this.handleCatch(item);
        return false;
      }
      const missed = item.y + item.size >= world.ground;
      if (missed) {
        this.handleMiss(item);
        return false;
      }
      return true;
    });
  },

  handleCatch(item) {
    if (item.type === "bomb") {
      GameState.lives -= 1;
      Player.setExpression("shock", 0.5);
      AudioManager.play("hit", () => beep(120, 0.25, "sawtooth"));
      FXManager.spawnCatchFX(item.x, item.y, "-1", "#ff6262");
      GameState.shakeTimer = CONFIG.shakeDuration;
      GameState.flashTimer = 0.25;
    } else if (item.type === "heart") {
      GameState.lives = Math.min(CONFIG.maxLives, GameState.lives + 1);
      Player.setExpression("happy", 0.5);
      AudioManager.play("catch", () => beep(520, 0.18, "triangle"));
      FXManager.spawnCatchFX(item.x, item.y, "+1 ❤️", "#ffb3d1");
    } else {
      GameState.score += item.points;
      Player.setExpression("happy", 0.4);
      Player.basketShake = CONFIG.basketShakeDuration;
      AudioManager.play("catch", () => beep(660, 0.12, "triangle"));
      FXManager.spawnCatchFX(item.x, item.y, `+${item.points}`, "#fff5a5");
      if (item.type === "gold") {
        AudioManager.play("catch", () => beep(880, 0.18, "triangle"));
      }
      GameState.highscore = Math.max(GameState.highscore, GameState.score);
      saveHighscore();
    }

    UIManager.updateHUD();
    this.updateDifficulty();

    if (GameState.lives <= 0) {
      this.gameOver();
    }
  },

  handleMiss(item) {
    if (item.type === "bomb" || item.type === "heart") {
      return;
    }
    GameState.lives -= 1;
    Player.setExpression("sad", 0.6);
    AudioManager.play("miss", () => beep(180, 0.2, "sawtooth"));
    FXManager.spawnMissFX(item.x, world.ground - 12);
    GameState.shakeTimer = CONFIG.shakeDuration;
    UIManager.updateHUD();

    if (GameState.lives <= 0) {
      this.gameOver();
    }
  },

  gameOver() {
    GameState.running = false;
    GameState.paused = false;
    UIManager.showGameOver();
    AudioManager.stopBgm();
    AudioManager.play("gameover", playGameOverSound);
    saveHighscore();
  },

  updateDifficulty() {
    const levelUp = Math.floor(GameState.score / CONFIG.levelScoreStep) + 1;
    if (levelUp > GameState.level) {
      GameState.level = levelUp;
      GameState.speed += CONFIG.speedPerLevel;
      GameState.spawnInterval = Math.max(
        CONFIG.minSpawnInterval,
        GameState.spawnInterval - CONFIG.spawnIntervalStep
      );
      GameState.levelUpTimer = CONFIG.levelUpDuration;
      AudioManager.play("levelup", playLevelUpSound);
    }
  },

  checkCollision(item, rect) {
    return (
      item.x < rect.x + rect.width &&
      item.x + item.size > rect.x &&
      item.y < rect.y + rect.height &&
      item.y + item.size > rect.y
    );
  },

  draw() {
    this.items.forEach((item) => {
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
  },
};

const InputManager = {
  pointerActive: false,
  pointerStartX: 0,

  init() {
    window.addEventListener("keydown", (event) => this.handleKey(event, true));
    window.addEventListener("keyup", (event) => this.handleKey(event, false));

    leftBtn.addEventListener("pointerdown", () => {
      Player.moveDir = -1;
    });
    leftBtn.addEventListener("pointerup", () => {
      Player.moveDir = 0;
    });
    leftBtn.addEventListener("pointerleave", () => {
      Player.moveDir = 0;
    });

    rightBtn.addEventListener("pointerdown", () => {
      Player.moveDir = 1;
    });
    rightBtn.addEventListener("pointerup", () => {
      Player.moveDir = 0;
    });
    rightBtn.addEventListener("pointerleave", () => {
      Player.moveDir = 0;
    });

    upBtn.addEventListener("pointerdown", () => {
      GameState.stickActive = true;
    });
    upBtn.addEventListener("pointerup", () => {
      GameState.stickActive = false;
    });
    upBtn.addEventListener("pointerleave", () => {
      GameState.stickActive = false;
    });

    this.addPointerControls();
  },

  handleKey(event, isDown) {
    if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") {
      Player.moveDir = isDown ? -1 : Player.moveDir === -1 ? 0 : Player.moveDir;
    }
    if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") {
      Player.moveDir = isDown ? 1 : Player.moveDir === 1 ? 0 : Player.moveDir;
    }
    if (event.key === "ArrowUp" || event.key === "w" || event.key === "W") {
      GameState.stickActive = isDown;
    }
    if (event.key === "Escape" && isDown) {
      togglePause();
    }
  },

  addPointerControls() {
    const updateFromPointer = (clientX) => {
      if (!GameState.running || GameState.paused) return;
      const rect = canvas.getBoundingClientRect();
      const pos = ((clientX - rect.left) / rect.width) * world.width;
      Player.x = Math.max(12, Math.min(world.width - Player.width - 12, pos - Player.width / 2));
    };

    canvas.addEventListener("pointerdown", (event) => {
      this.pointerActive = true;
      this.pointerStartX = event.clientX;
      updateFromPointer(event.clientX);
    });

    canvas.addEventListener("pointermove", (event) => {
      if (!this.pointerActive) return;
      updateFromPointer(event.clientX);
    });

    window.addEventListener("pointerup", () => {
      this.pointerActive = false;
    });
  },

  getCatchRects() {
    const rects = [{ ...Player }];
    if (!GameState.stickActive) return rects;
    const stickHeight = 80;
    rects.push({
      x: Player.x + Player.width / 2 - 6,
      y: Player.y - stickHeight,
      width: 12,
      height: stickHeight + Player.height,
    });
    return rects;
  },
};

function resetGame() {
  GameState.reset();
  AppleManager.reset();
  leaves.length = 0;
  Player.reset();
  UIManager.updateHUD();
}

function startGame() {
  AudioManager.init();
  resetGame();
  GameState.running = true;
  UIManager.hideOverlays();
  const context = getAudioContext();
  if (context && context.state === "suspended") {
    context.resume();
  }
  AudioManager.play("catch", () => beep(520, 0.12, "triangle"));
  AudioManager.playBgm();
}

function restartGame() {
  startGame();
}

function togglePause() {
  if (!GameState.running) return;
  GameState.paused = !GameState.paused;
  pauseBtn.textContent = GameState.paused ? "Resume" : "Pause";
  if (GameState.paused) {
    AudioManager.stopBgm();
  } else {
    AudioManager.playBgm();
  }
}

function toggleMute() {
  GameState.muted = !GameState.muted;
  if (window.Howler && window.Howler.mute) {
    window.Howler.mute(GameState.muted);
  }
  UIManager.updateMuteButton();
}

function loadHighscore() {
  try {
    const stored = Number(localStorage.getItem("appleHighscore") || 0);
    GameState.highscore = Number.isNaN(stored) ? 0 : stored;
  } catch (error) {
    GameState.highscore = 0;
  }
  UIManager.updateHUD();
}

function saveHighscore() {
  try {
    localStorage.setItem("appleHighscore", String(GameState.highscore));
  } catch (error) {
    // ignore storage errors
  }
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

function drawLevelUp(delta) {
  if (GameState.levelUpTimer <= 0) return;
  GameState.levelUpTimer -= delta;
  ctx.fillStyle = "rgba(255, 244, 160, 0.9)";
  ctx.font = "20px Trebuchet MS";
  ctx.fillText("Level Up!", world.width / 2 - 45, 200);
}

function playGameOverSound() {
  if (GameState.muted) return;
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

function playLevelUpSound() {
  if (GameState.muted) return;
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

let lastTime = 0;
function loop(timestamp) {
  const delta = Math.min(0.033, (timestamp - lastTime) / 1000 || 0);
  lastTime = timestamp;

  const effectsDelta = GameState.running && !GameState.paused ? delta : 0;
  if (GameState.running && !GameState.paused) {
    Player.update(delta);
    AppleManager.update(delta);
    UIManager.updateScoreDisplay(delta);
    FXManager.update(delta);
  }
  updateLeaves(effectsDelta, timestamp);

  if (GameState.shakeTimer > 0) {
    GameState.shakeTimer -= effectsDelta;
  }
  if (GameState.flashTimer > 0) {
    GameState.flashTimer -= effectsDelta;
  }

  ctx.clearRect(0, 0, world.width, world.height);
  ctx.save();
  if (GameState.shakeTimer > 0) {
    const intensity = GameState.shakeTimer * 6;
    ctx.translate((Math.random() - 0.5) * intensity, (Math.random() - 0.5) * intensity);
  }
  drawBackground(timestamp);
  drawGroundLine();
  drawLeaves();
  AppleManager.draw();
  Player.draw();
  FXManager.draw();
  drawLevelUp(effectsDelta);
  if (GameState.flashTimer > 0) {
    const alpha = GameState.flashTimer / 0.25;
    ctx.fillStyle = `rgba(255, 80, 80, ${0.35 * alpha})`;
    ctx.fillRect(0, 0, world.width, world.height);
  }
  ctx.restore();

  UIManager.updateHUD();
  requestAnimationFrame(loop);
}

function init() {
  loadHighscore();
  UIManager.updateMuteButton();
  InputManager.init();
  requestAnimationFrame(loop);
}

startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", restartGame);
pauseBtn.addEventListener("click", togglePause);
muteBtn.addEventListener("click", toggleMute);

init();
