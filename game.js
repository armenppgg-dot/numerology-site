(() => {
  'use strict';

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  const scoreEl = document.getElementById('score');
  const livesEl = document.getElementById('lives');
  const timerEl = document.getElementById('timer');
  const finalScoreEl = document.getElementById('finalScore');
  const difficultyEl = document.getElementById('difficulty');
  const soundToggleEl = document.getElementById('soundToggle');

  const startOverlay = document.getElementById('startOverlay');
  const gameOverOverlay = document.getElementById('gameOverOverlay');
  const startBtn = document.getElementById('startBtn');
  const restartBtn = document.getElementById('restartBtn');

  const DIFFICULTIES = {
    easy: { fishCount: 6, spawnRate: 1.2, speed: 0.8, time: 180, missPenalty: 0 },
    normal: { fishCount: 8, spawnRate: 1.8, speed: 1, time: 250, missPenalty: 2 },
    hard: { fishCount: 11, spawnRate: 2.6, speed: 1.25, time: 150,missPenalty: 4 }
  };

  const FISH_TYPES = {
    pike: { score: 14, size: 50, speed: [90, 145], behavior: 'dash' },
    piranha: { score: 8, size: 34, speed: [150, 220], behavior: 'zigzag' },
    shark: { score: 30, size: 88, speed: [70, 110], behavior: 'smooth' }
  };

  const state = {
    running: false,
    score: 0,
    lives: 3,
    timer: 60,
    rodX: canvas.width * 0.5,
    hookY: 120,
    hookMinY: 90,
    hookMaxY: canvas.height - 50,
    fish: [],
    keys: {},
    controls: { left: false, right: false, up: false, down: false },
    spawnTimer: 0,
    bubbleTimer: 0,
    bubbles: [],
    difficulty: 'normal',
  };

  const sound = {
    enabled: true,
    ctx: null,
    unlocked: false,
    bgOsc: null,
    bgGain: null
  };

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function setupAudio() {
    if (sound.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) {
      sound.enabled = false;
      soundToggleEl.textContent = '🔇 Звук недоступен';
      soundToggleEl.disabled = true;
      return;
    }
    sound.ctx = new AC();
  }

  function unlockAudio() {
    setupAudio();
    if (!sound.ctx || sound.unlocked === true) return;
    sound.ctx.resume().then(() => {
      sound.unlocked = true;
      startBackgroundAudio();
    }).catch(() => {
      sound.unlocked = false;
    });
  }

  function beep(freq, duration, type = 'sine', volume = 0.04) {
    if (!sound.enabled || !sound.ctx || !sound.unlocked) return;
    const osc = sound.ctx.createOscillator();
    const gain = sound.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = volume;
    osc.connect(gain);
    gain.connect(sound.ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, sound.ctx.currentTime + duration);
    osc.stop(sound.ctx.currentTime + duration);
  }

  function startBackgroundAudio() {
    if (!sound.enabled || !sound.ctx || !sound.unlocked || sound.bgOsc) return;
    const osc = sound.ctx.createOscillator();
    const gain = sound.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = 110;
    gain.gain.value = 0.008;
    osc.connect(gain);
    gain.connect(sound.ctx.destination);
    osc.start();
    sound.bgOsc = osc;
    sound.bgGain = gain;
  }

  function stopBackgroundAudio() {
    if (!sound.bgOsc) return;
    sound.bgOsc.stop();
    sound.bgOsc.disconnect();
    sound.bgGain.disconnect();
    sound.bgOsc = null;
    sound.bgGain = null;
  }

  function toggleSound() {
    sound.enabled = !sound.enabled;
    soundToggleEl.textContent = sound.enabled ? '🔊 Звук: Вкл' : '🔇 Звук: Выкл';
    if (!sound.enabled) stopBackgroundAudio();
    else {
      unlockAudio();
      startBackgroundAudio();
    }
  }

  function spawnFish(typeKey) {
    const cfg = FISH_TYPES[typeKey];
    const dir = Math.random() > 0.5 ? 1 : -1;
    const baseSpeed = rand(cfg.speed[0], cfg.speed[1]) * DIFFICULTIES[state.difficulty].speed;
    state.fish.push({
      type: typeKey,
      x: dir > 0 ? -120 : canvas.width + 120,
      y: rand(190, canvas.height - 70),
      dir,
      speed: baseSpeed,
      size: cfg.size,
      time: rand(0, 100),
      caught: false
    });
  }

  function randomFishType() {
    const roll = Math.random();
    if (roll < 0.14) return 'shark';
    if (roll < 0.52) return 'pike';
    return 'piranha';
  }

  function resetGame() {
    const d = DIFFICULTIES[state.difficulty];
    state.score = 0;
    state.lives = 3;
    state.timer = d.time;
    state.rodX = canvas.width * 0.5;
    state.hookY = 120;
    state.fish = [];
    state.bubbles = [];
    state.spawnTimer = 0;
    for (let i = 0; i < d.fishCount; i += 1) {
      spawnFish(randomFishType());
    }
    renderHud();
  }

  function renderHud() {
    scoreEl.textContent = String(state.score);
    livesEl.textContent = String(state.lives);
    timerEl.textContent = String(Math.max(0, Math.ceil(state.timer)));
  }

  function applyInput(dt) {
    const speedX = 270;
    const speedY = 270;

    if (state.keys.ArrowLeft || state.keys.KeyA || state.controls.left) state.rodX -= speedX * dt;
    if (state.keys.ArrowRight || state.keys.KeyD || state.controls.right) state.rodX += speedX * dt;
    if (state.keys.ArrowUp || state.keys.KeyW || state.controls.up) state.hookY -= speedY * dt;
    if (state.keys.ArrowDown || state.keys.KeyS || state.controls.down) state.hookY += speedY * dt;

    state.rodX = Math.max(40, Math.min(canvas.width - 40, state.rodX));
    state.hookY = Math.max(state.hookMinY, Math.min(state.hookMaxY, state.hookY));
  }

  function updateFish(dt) {
    state.spawnTimer += dt;
    const d = DIFFICULTIES[state.difficulty];
    const spawnInterval = 1 / d.spawnRate;

    if (state.spawnTimer >= spawnInterval && state.fish.length < d.fishCount + 2) {
      state.spawnTimer = 0;
      spawnFish(randomFishType());
    }

    const hookX = state.rodX;
    const hookY = state.hookY;

    state.fish.forEach((fish) => {
      fish.time += dt;
      fish.x += fish.dir * fish.speed * dt;

      if (fish.behavior === 'dash' || FISH_TYPES[fish.type].behavior === 'dash') {
        fish.y += Math.sin(fish.time * 7) * 28 * dt * 5;
      } else if (fish.behavior === 'zigzag' || FISH_TYPES[fish.type].behavior === 'zigzag') {
        fish.y += Math.sin(fish.time * 12) * 20 * dt * 5;
      } else {
        fish.y += Math.sin(fish.time * 2.6) * 8 * dt * 5;
      }

      fish.y = Math.max(170, Math.min(canvas.height - 40, fish.y));

      const dx = hookX - fish.x;
      const dy = hookY - fish.y;
      const hitRadius = fish.size * 0.42;
      if (!fish.caught && (dx * dx + dy * dy) < hitRadius * hitRadius) {
        fish.caught = true;
        state.score += FISH_TYPES[fish.type].score;
        beep(fish.type === 'shark' ? 720 : 620, 0.15, 'triangle', 0.06);
        beep(980, 0.08, 'sine', 0.05);
      }

      if (fish.x < -200 || fish.x > canvas.width + 200 || fish.caught) {
        fish.dead = true;
      }
    });

    const missed = state.fish.filter((f) => f.dead && !f.caught).length;
    if (missed > 0) {
      state.lives = Math.max(0, state.lives - missed);
      const penalty = DIFFICULTIES[state.difficulty].missPenalty * missed;
      if (penalty > 0) {
        state.timer = Math.max(0, state.timer - penalty);
      }
      beep(180, 0.2, 'sawtooth', 0.045);
    }

    state.fish = state.fish.filter((f) => !f.dead);
  }

  function updateBubbles(dt) {
    state.bubbleTimer += dt;
    if (state.bubbleTimer > 0.16) {
      state.bubbleTimer = 0;
      state.bubbles.push({ x: rand(20, canvas.width - 20), y: canvas.height + 8, r: rand(2, 6), v: rand(16, 42) });
    }
    state.bubbles.forEach((b) => { b.y -= b.v * dt; b.r *= 0.998; });
    state.bubbles = state.bubbles.filter((b) => b.y > 150 && b.r > 0.8);
  }

  function drawWater() {
    ctx.fillStyle = '#6fcfff';
    ctx.fillRect(0, 0, canvas.width, 145);
    const grad = ctx.createLinearGradient(0, 145, 0, canvas.height);
    grad.addColorStop(0, '#2f9de0');
    grad.addColorStop(0.5, '#0f65ba');
    grad.addColorStop(1, '#0a387f');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 145, canvas.width, canvas.height - 145);

    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= canvas.width; x += 16) {
      const y = 145 + Math.sin((performance.now() * 0.0025) + x * 0.02) * 4;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    state.bubbles.forEach((b) => {
      ctx.beginPath();
      ctx.fillStyle = 'rgba(200,238,255,0.55)';
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawRodAndHook() {
    ctx.strokeStyle = '#5a3d20';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(state.rodX - 26, 20);
    ctx.lineTo(state.rodX + 28, 44);
    ctx.stroke();

    ctx.strokeStyle = '#dfe6ee';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(state.rodX, 43);
    ctx.lineTo(state.rodX, state.hookY);
    ctx.stroke();

    ctx.strokeStyle = '#f5f5f5';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(state.rodX + 4, state.hookY, 10, Math.PI * 0.2, Math.PI * 1.8);
    ctx.stroke();
  }

  function drawShark(x, y, size, dir) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir, 1);
    ctx.fillStyle = '#7f98a8';
    ctx.beginPath();
    ctx.moveTo(-size * 0.7, 0);
    ctx.quadraticCurveTo(-size * 0.25, -size * 0.45, size * 0.5, -size * 0.2);
    ctx.quadraticCurveTo(size * 0.7, 0, size * 0.5, size * 0.2);
    ctx.quadraticCurveTo(-size * 0.25, size * 0.45, -size * 0.7, 0);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-size * 0.1, -size * 0.15);
    ctx.lineTo(size * 0.15, -size * 0.75);
    ctx.lineTo(size * 0.32, -size * 0.08);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-size * 0.72, -size * 0.15);
    ctx.lineTo(-size * 1.05, -size * 0.45);
    ctx.lineTo(-size * 1.0, 0);
    ctx.lineTo(-size * 1.05, size * 0.45);
    ctx.lineTo(-size * 0.72, size * 0.15);
    ctx.fill();

    ctx.fillStyle = '#e5eef5';
    ctx.beginPath();
    ctx.moveTo(-size * 0.32, size * 0.03);
    ctx.quadraticCurveTo(size * 0.42, size * 0.14, size * 0.35, size * 0.25);
    ctx.lineTo(-size * 0.42, size * 0.18);
    ctx.fill();

    ctx.fillStyle = '#1d2730';
    ctx.beginPath();
    ctx.arc(size * 0.3, -size * 0.06, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawPiranha(x, y, size, dir) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir, 1);
    ctx.fillStyle = '#d84d4d';
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.58, size * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ab2f2f';
    ctx.beginPath();
    ctx.moveTo(-size * 0.55, 0);
    ctx.lineTo(-size * 1.0, -size * 0.38);
    ctx.lineTo(-size * 1.0, size * 0.38);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 4; i += 1) {
      ctx.beginPath();
      ctx.moveTo(size * 0.05 + i * 5, size * 0.1);
      ctx.lineTo(size * 0.1 + i * 5, size * 0.24);
      ctx.lineTo(size * 0.15 + i * 5, size * 0.1);
      ctx.fill();
    }

    ctx.fillStyle = '#f7b77f';
    ctx.beginPath();
    ctx.ellipse(size * 0.1, size * 0.1, size * 0.35, size * 0.18, 0, 0, Math.PI);
    ctx.fill();

    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(size * 0.27, -size * 0.08, 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawPike(x, y, size, dir) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir, 1);
    ctx.fillStyle = '#6cae52';
    ctx.beginPath();
    ctx.moveTo(-size * 0.95, 0);
    ctx.quadraticCurveTo(-size * 0.35, -size * 0.28, size * 0.9, 0);
    ctx.quadraticCurveTo(-size * 0.35, size * 0.28, -size * 0.95, 0);
    ctx.fill();

    ctx.fillStyle = '#4e863a';
    ctx.beginPath();
    ctx.moveTo(-size * 0.92, 0);
    ctx.lineTo(-size * 1.2, -size * 0.26);
    ctx.lineTo(-size * 1.2, size * 0.26);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#d9ebba';
    ctx.beginPath();
    ctx.ellipse(size * 0.1, size * 0.08, size * 0.5, size * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#273321';
    ctx.beginPath();
    ctx.arc(size * 0.62, -size * 0.05, 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawFish() {
    state.fish.forEach((fish) => {
      if (fish.type === 'shark') drawShark(fish.x, fish.y, fish.size, fish.dir);
      else if (fish.type === 'piranha') drawPiranha(fish.x, fish.y, fish.size, fish.dir);
      else drawPike(fish.x, fish.y, fish.size, fish.dir);
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawWater();
    drawFish();
    drawRodAndHook();
  }

  function endGame() {
    state.running = false;
    finalScoreEl.textContent = String(state.score);
    gameOverOverlay.hidden = false;
    stopBackgroundAudio();
  }

  let lastTime = 0;
  function frame(t) {
    const dt = Math.min(0.033, (t - lastTime) / 1000 || 0.016);
    lastTime = t;

    if (state.running) {
      state.timer -= dt;
      applyInput(dt);
      updateFish(dt);
      updateBubbles(dt);
      renderHud();

      if (state.timer <= 0 || state.lives <= 0) {
        endGame();
      }
    }

    draw();
    requestAnimationFrame(frame);
  }

  function startGame() {
    state.difficulty = difficultyEl.value;
    resetGame();
    state.running = true;
    startOverlay.hidden = true;
    gameOverOverlay.hidden = true;
    unlockAudio();
    startBackgroundAudio();
  }

  function bindControls() {
    document.addEventListener('keydown', (e) => {
      unlockAudio();
      state.keys[e.code] = true;
    });
    document.addEventListener('keyup', (e) => {
      state.keys[e.code] = false;
    });

    const mobileButtons = document.querySelectorAll('[data-action]');
    mobileButtons.forEach((btn) => {
      const action = btn.getAttribute('data-action');
      const set = (v) => { state.controls[action] = v; if (v) unlockAudio(); };
      btn.addEventListener('touchstart', (e) => { e.preventDefault(); set(true); }, { passive: false });
      btn.addEventListener('touchend', () => set(false));
      btn.addEventListener('touchcancel', () => set(false));
      btn.addEventListener('mousedown', () => set(true));
      btn.addEventListener('mouseup', () => set(false));
      btn.addEventListener('mouseleave', () => set(false));
    });

    canvas.addEventListener('pointerdown', unlockAudio);

    startBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', startGame);
    soundToggleEl.addEventListener('click', () => {
      unlockAudio();
      toggleSound();
    });

    difficultyEl.addEventListener('change', () => {
      if (!state.running) {
        state.difficulty = difficultyEl.value;
        resetGame();
      }
    });
  }

  setupAudio();
  bindControls();
  resetGame();
  requestAnimationFrame(frame);
})();
