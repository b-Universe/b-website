(() => {
  'use strict';

  // to be inserted later: https://scores.behr.dev/api/404
  const LEADERBOARD_API_BASE = '';
  const API_TIMEOUT_MS = 5000;
  const POLL_INTERVAL_MS = 30000;
  const IS_MOCK_MODE = new URLSearchParams(location.search).has('mock404');

  const DIFFICULTIES = Object.freeze({
    easy: Object.freeze({ startingSpeedStage: 1, scoreMultiplier: 1, label: 'Easy' }),
    hard: Object.freeze({ startingSpeedStage: 3, scoreMultiplier: 1.75, label: 'Hard' })
  });
  const PROGRESSION = Object.freeze([0, 24, 31, 39, 48, 58, 69, 81, 94, 108]);
  const SCORES = Object.freeze({ scout: 100, guard: 150, commander: 200, ufo: 750, kamikazeMultiplier: 2 });
  const UFO = Object.freeze({ minDelay: 13000, maxDelay: 23000, speed: 92, deployChance: .38, deployCount: 3, maxExtraEnemies: 8 });
  const BARRIERS = Object.freeze({ easy: 4, hard: 2, blockSize: 7 });
  const GAME_SIZE = Object.freeze({ width: 800, height: 550, playerY: 500 });

  const $ = (selector) => document.querySelector(selector);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const scoreText = (score) => String(Math.round(score)).padStart(6, '0');
  const now = () => performance.now();

  class SeededRandom {
    constructor(seed) { this.seed = (Number(seed) >>> 0) || 0x9e3779b9; }
    next() { this.seed = (this.seed * 1664525 + 1013904223) >>> 0; return this.seed / 4294967296; }
    range(min, max) { return min + (max - min) * this.next(); }
    integer(min, max) { return Math.floor(this.range(min, max + 1)); }
  }

  class AudioEffects {
    constructor(button) {
      this.enabled = true; this.context = null; this.button = button;
      button.addEventListener('click', () => { this.enabled = !this.enabled; button.textContent = this.enabled ? 'Audio On' : 'Audio Off'; button.setAttribute('aria-pressed', String(this.enabled)); if (this.enabled) this.play('toggle'); });
    }
    play(kind) {
      if (!this.enabled || !window.AudioContext) return;
      const prioritySound = kind === 'hit' || kind === 'level' || kind === 'life' || kind === 'gameOver';
      if (kind === 'fire' && performance.now() < (this.suppressFireUntil || 0)) return;
      if (prioritySound) this.suppressFireUntil = performance.now() + 140;
      this.context ||= new AudioContext(); if (this.context.state === 'suspended') this.context.resume();
      const notes = { start: [440, .09, 'square', .045], fire: [680, .045, 'square', .012], hit: [210, .14, 'sawtooth', .09], ufo: [520, .16, 'triangle', .08], barrier: [155, .04, 'square', .02], enemyFire: [250, .05, 'square', .018], life: [105, .25, 'sawtooth', .1], level: [620, .24, 'triangle', .11], gameOver: [85, .3, 'sawtooth', .1], toggle: [780, .05, 'sine', .035] };
      const [frequency, duration, type, volume] = notes[kind] || notes.toggle; const oscillator = this.context.createOscillator(); const gain = this.context.createGain(); const time = this.context.currentTime;
      oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, time); gain.gain.setValueAtTime(volume, time); gain.gain.exponentialRampToValueAtTime(.0001, time + duration); oscillator.connect(gain).connect(this.context.destination); oscillator.start(time); oscillator.stop(time + duration);
    }
  }

  class LeaderboardAPI {
    constructor(baseUrl) { this.baseUrl = baseUrl.replace(/\/$/, ''); this.mockScores = []; }
    get enabled() { return Boolean(this.baseUrl) || IS_MOCK_MODE; }
    async request(path, options = {}) {
      if (IS_MOCK_MODE) return this.mock(path, options);
      if (!this.baseUrl) throw new Error('Leaderboard API is not configured');
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
      try {
        const response = await fetch(`${this.baseUrl}${path}`, { ...options, signal: controller.signal, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
        if (!response.ok) throw new Error(`Leaderboard request failed (${response.status})`);
        const payload = await response.json();
        if (!payload || typeof payload !== 'object') throw new Error('Leaderboard returned an invalid response');
        return payload;
      } finally { clearTimeout(timer); }
    }
    getLeaderboard() { return this.request('/leaderboard?limit=10'); }
    startRun(difficulty) { return this.request('/run', { method: 'POST', body: JSON.stringify({ difficulty }) }); }
    submitRun(payload) { return this.request('/submit', { method: 'POST', body: JSON.stringify(payload) }); }
    async mock(path, options) {
      await new Promise((resolve) => setTimeout(resolve, 180));
      if (path.startsWith('/leaderboard')) return { leaderboard: this.mockScores.slice(0, 10) };
      if (path === '/run') return { runId: `mock-${crypto.randomUUID()}`, seed: Math.floor(Math.random() * 0x7fffffff), expiresAt: Math.floor(Date.now() / 1000) + 1800 };
      if (path === '/submit') {
        const body = JSON.parse(options.body);
        const kills = body.events.filter((event) => event.type === 'kill');
        const score = kills.reduce((total, event) => total + event.points, 0);
        this.mockScores.push({ name: body.name, score, difficulty: body.difficulty, level: body.level });
        this.mockScores.sort((a, b) => b.score - a.score);
        this.mockScores = this.mockScores.slice(0, 10).map((entry, index) => ({ ...entry, rank: index + 1 }));
        return { accepted: true, score, rank: this.mockScores.findIndex((entry) => entry.name === body.name && entry.score === score) + 1, leaderboard: this.mockScores };
      }
      throw new Error('Unknown mock endpoint');
    }
  }

  class LeaderboardView {
    constructor(api) {
      this.api = api; this.content = null; this.status = null; this.entries = null; this.isDown = false; this.pollTimer = null;
      document.addEventListener('visibilitychange', () => document.hidden ? this.stopPolling() : this.startPolling());
    }
    attach(content, status) { this.content = content; this.status = status; if (this.isDown) this.showDown(); else if (this.entries) this.render(this.entries); }
    detach() { this.content = null; this.status = null; }
    setStatus(text, kind) { if (!this.status) return; this.status.textContent = text; this.status.className = `server-status${kind ? ` is-${kind}` : ''}`; }
    render(entries) {
      const list = Array.isArray(entries) ? entries.slice(0, 10) : null;
      if (!list) throw new Error('Leaderboard entries are invalid');
      this.entries = list; this.isDown = false;
      if (!this.content) return;
      if (!list.length) { this.content.innerHTML = '<p class="leaderboard-loading">No verified scores yet. Be first on the board.</p>'; return; }
      const table = document.createElement('table'); table.className = 'score-table';
      table.innerHTML = '<thead><tr><th>Rank</th><th>Name</th><th>Score</th><th>Mode</th></tr></thead>';
      const body = document.createElement('tbody');
      list.forEach((entry, index) => {
        const row = document.createElement('tr');
        const values = [entry.rank || index + 1, String(entry.name || '---').slice(0, 3), Number(entry.score || 0).toLocaleString(), String(entry.difficulty || 'easy')];
        values.forEach((value) => { const cell = document.createElement('td'); cell.textContent = value; row.append(cell); }); body.append(row);
      });
      table.append(body); this.content.replaceChildren(table);
    }
    showDown() { this.isDown = true; this.setStatus('Unavailable', 'down'); if (this.content) this.content.replaceChildren(); }
    async refresh() {
      try { const result = await this.api.getLeaderboard(); this.render(result.leaderboard); this.setStatus(IS_MOCK_MODE ? 'Mock mode' : 'Online', 'online'); return true; }
      catch (error) { console.info('Leaderboard unavailable:', error.message); this.showDown(); return false; }
    }
    startPolling() { if (document.hidden || this.pollTimer) return; this.pollTimer = setInterval(() => this.refresh(), POLL_INTERVAL_MS); }
    stopPolling() { if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = null; } }
  }

  class Space404Game {
    constructor(api, leaderboard) {
      this.api = api; this.leaderboard = leaderboard; this.canvas = $('#space-404-canvas'); this.ctx = this.canvas.getContext('2d');
      this.overlay = $('#game-overlay'); this.message = $('#game-message'); this.nameDialog = $('#name-dialog'); this.nameInputs = [...document.querySelectorAll('.initials-inputs input')];
      this.state = 'menu'; this.animationFrame = null; this.loopId = 0; this.lastFrame = 0; this.input = { left: false, right: false, fire: false }; this.runToken = 0; this.audio = new AudioEffects($('#audio-toggle'));
      this.resize(); this.bindInput(); this.bindMenu(); this.bindNameForm(); this.resetPreview();
      window.addEventListener('resize', () => { this.resize(); this.draw(); });
      if ('ResizeObserver' in window) {
        this.resizeObserver = new ResizeObserver(() => { this.resize(); this.draw(); });
        this.resizeObserver.observe(this.canvas.parentElement);
      }
    }
    resize() {
      const rect = this.canvas.getBoundingClientRect(); const ratio = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = Math.max(1, Math.round(rect.width * ratio)); this.canvas.height = Math.max(1, Math.round(rect.height * ratio));
      this.ctx.setTransform(this.canvas.width / GAME_SIZE.width, 0, 0, this.canvas.height / GAME_SIZE.height, 0, 0); this.ctx.imageSmoothingEnabled = false;
    }
    bindMenu() { document.querySelectorAll('[data-difficulty]').forEach((button) => button.addEventListener('click', () => this.start(button.dataset.difficulty))); }
    bindInput() {
      const setKey = (event, pressed) => {
        const key = event.key.toLowerCase(); const controls = { a: 'left', arrowleft: 'left', d: 'right', arrowright: 'right', ' ': 'fire', spacebar: 'fire' };
        if (!controls[key] || this.state !== 'playing') return;
        event.preventDefault(); this.input[controls[key]] = pressed;
      };
      window.addEventListener('keydown', (event) => setKey(event, true)); window.addEventListener('keyup', (event) => setKey(event, false));
      const bindTouch = (selector, key) => {
        const button = $(selector); const set = (pressed) => { if (this.state === 'playing') this.input[key] = pressed; };
        ['pointerdown', 'pointerenter'].forEach((event) => button.addEventListener(event, (e) => { if (event === 'pointerenter' && e.buttons !== 1) return; e.preventDefault(); set(true); }));
        ['pointerup', 'pointercancel', 'pointerleave'].forEach((event) => button.addEventListener(event, () => set(false)));
      };
      bindTouch('#move-left', 'left'); bindTouch('#move-right', 'right'); bindTouch('#fire', 'fire');
    }
    bindNameForm() {
      this.nameInputs.forEach((input, index) => input.addEventListener('input', () => {
        input.value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); if (input.value && index < 2) this.nameInputs[index + 1].focus();
      }));
      $('#name-form').addEventListener('submit', (event) => { event.preventDefault(); this.submitName(); });
      $('#skip-score').addEventListener('click', () => this.closeNameDialog('Score not submitted.'));
    }
    resetPreview() {
      this.difficulty = DIFFICULTIES.easy; this.score = 0; this.level = 1; this.stage = 1; this.speedStage = 1; this.lives = 3; this.player = { x: 380, y: GAME_SIZE.playerY, w: 40, h: 22 };
      this.enemies = this.makeFormation(); this.projectiles = []; this.enemyProjectiles = []; this.particles = []; this.barriers = this.makeBarriers(); this.ufo = null; this.updateHud(); this.draw();
    }
    start(difficultyKey) {
      if (!DIFFICULTIES[difficultyKey]) return; this.stopLoop(); this.state = 'playing'; this.difficultyKey = difficultyKey; this.difficulty = DIFFICULTIES[difficultyKey];
      this.score = 0; this.level = 1; this.stage = 1; this.speedStage = this.difficulty.startingSpeedStage; this.lives = 3; this.player = { x: 380, y: GAME_SIZE.playerY, w: 40, h: 22, lastShot: -9999, invulnerableUntil: 0 };
      this.enemies = this.makeFormation(); this.projectiles = []; this.enemyProjectiles = []; this.particles = []; this.barriers = this.makeBarriers(); this.ufo = null; this.ufoSpawnedThisRound = false; this.extraEnemies = 0; this.nextEnemyId = this.enemies.length; this.formationDirection = 1; this.formationDrop = 0; this.lastKamikazeAt = 0; this.nextEnemyShotAt = now() + 3500; this.nextUfoAt = now() + 8000; this.events = []; this.run = null; this.runStartedAt = now(); this.random = new SeededRandom(Math.floor(Math.random() * 0xffffffff)); this.input = { left: false, right: false, fire: false };
      this.leaderboard.detach(); this.overlay.hidden = true; this.message.textContent = ''; this.updateHud(); this.audio.play('start'); this.requestRun(++this.runToken, difficultyKey); this.startLoop();
    }
    async requestRun(token, difficulty) {
      try {
        const run = await this.api.startRun(difficulty);
        if (token !== this.runToken || this.state === 'menu') return;
        if (!run.runId || !Number.isFinite(Number(run.seed))) throw new Error('Invalid run response');
        this.run = run; this.random = new SeededRandom(run.seed);
        if (this.state === 'gameOver' && this.score > 0) this.openNameDialog();
      } catch (error) { console.info('This run cannot be submitted:', error.message); }
    }
    makeFormation() {
      const pattern = ['1010011100101', '1010100010101', '1110100010111', '0010100010001', '0010011100001'];
      const enemies = []; const offsetX = 120; const offsetY = 75; const stepX = 43; const stepY = 43;
      pattern.forEach((row, y) => [...row].forEach((pixel, x) => {
        if (pixel !== '1') return; const kind = y === 0 ? 'commander' : y < 3 ? 'guard' : 'scout';
        enemies.push({ id: enemies.length, kind, x: offsetX + x * stepX, y: offsetY + y * stepY, w: 27, h: 21, alive: true, mode: 'formation', targetX: 0, velocityX: 0, velocityY: 0 });
      }));
      return enemies;
    }
    makeBarriers() {
      const count = BARRIERS[this.difficultyKey] || BARRIERS.easy; const pattern = ['0111110', '1111111', '1111111', '1100011']; const spacing = GAME_SIZE.width / (count + 1);
      return Array.from({ length: count }, (_, barrierIndex) => ({
        blocks: pattern.flatMap((row, rowIndex) => [...row].flatMap((bit, column) => bit === '1' ? [{ x: Math.round(spacing * (barrierIndex + 1) - 24 + column * BARRIERS.blockSize), y: 420 + rowIndex * BARRIERS.blockSize, w: BARRIERS.blockSize, h: BARRIERS.blockSize, alive: true }] : []))
      }));
    }
    startLoop() { this.stopLoop(); const loopId = ++this.loopId; this.lastFrame = now(); this.animationFrame = requestAnimationFrame((time) => this.frame(time, loopId)); }
    stopLoop() { this.loopId += 1; if (this.animationFrame) cancelAnimationFrame(this.animationFrame); this.animationFrame = null; }
    frame(time, loopId) { if (loopId !== this.loopId || this.state !== 'playing') return; const dt = Math.min((time - this.lastFrame) / 1000, .05); this.lastFrame = time; this.update(dt, time); this.draw(); if (loopId === this.loopId && this.state === 'playing') this.animationFrame = requestAnimationFrame((next) => this.frame(next, loopId)); }
    update(dt, time) {
      this.updatePlayer(dt, time); this.updateProjectiles(dt); this.updateParticles(dt); this.updateFormation(dt, time); this.updateUfo(dt, time); this.updateEnemyFire(time); this.handleCollisions(time);
      if (!this.enemies.some((enemy) => enemy.alive)) this.completeLevel();
    }
    updatePlayer(dt, time) {
      const movement = (this.input.right ? 1 : 0) - (this.input.left ? 1 : 0); this.player.x = clamp(this.player.x + movement * 330 * dt, 16, GAME_SIZE.width - this.player.w - 16);
      if (this.input.fire && time - this.player.lastShot >= 255) this.fire(time);
    }
    fire(time) { this.player.lastShot = time; this.projectiles.push({ x: this.player.x + this.player.w / 2 - 2, y: this.player.y - 8, w: 4, h: 13, velocityY: -510 }); this.audio.play('fire'); this.record({ type: 'shot', x: Math.round(this.player.x) }); }
    updateProjectiles(dt) {
      this.projectiles.forEach((shot) => { shot.y += shot.velocityY * dt; }); this.projectiles = this.projectiles.filter((shot) => shot.y > -20);
      this.enemyProjectiles.forEach((shot) => { shot.y += shot.velocityY * dt; }); this.enemyProjectiles = this.enemyProjectiles.filter((shot) => shot.y < GAME_SIZE.height + 20);
    }
    updateParticles(dt) { this.particles.forEach((particle) => { particle.x += particle.velocityX * dt; particle.y += particle.velocityY * dt; particle.velocityY += 110 * dt; particle.life -= dt; }); this.particles = this.particles.filter((particle) => particle.life > 0); }
    updateFormation(dt, time) {
      const speed = PROGRESSION[Math.min(this.speedStage, PROGRESSION.length - 1)] || PROGRESSION.at(-1); const formation = this.enemies.filter((enemy) => enemy.alive && enemy.mode === 'formation');
      formation.forEach((enemy) => { enemy.x += this.formationDirection * speed * dt; });
      const leftEdge = Math.min(...formation.map((enemy) => enemy.x)); const rightEdge = Math.max(...formation.map((enemy) => enemy.x + enemy.w));
      if (leftEdge < 22 || rightEdge > GAME_SIZE.width - 22) {
        const correction = leftEdge < 22 ? 22 - leftEdge : GAME_SIZE.width - 22 - rightEdge;
        formation.forEach((enemy) => { enemy.x += correction; enemy.y += 11; });
        this.formationDirection = correction > 0 ? 1 : -1;
      }
      const attackerCount = this.enemies.filter((enemy) => enemy.alive && enemy.mode === 'kamikaze').length;
      const interval = Math.max(4900, 11000 - this.speedStage * 550);
      if (this.speedStage > 3 && attackerCount < 2 && time - this.lastKamikazeAt > interval) this.beginKamikaze(time);
      if (!this.ufo && !this.ufoSpawnedThisRound && time >= this.nextUfoAt) this.spawnUfo(time);
    }
    beginKamikaze(time) {
      const candidates = this.enemies.filter((enemy) => enemy.alive && enemy.mode === 'formation'); if (!candidates.length) return;
      const enemy = candidates[this.random.integer(0, candidates.length - 1)]; enemy.mode = 'kamikaze'; enemy.homeX = enemy.x; enemy.homeY = enemy.y; enemy.targetX = this.player.x + this.player.w / 2; enemy.velocityY = 74 + this.speedStage * 7; enemy.velocityX = clamp((enemy.targetX - enemy.x) * .46, -105, 105); this.lastKamikazeAt = time; this.record({ type: 'kamikaze', enemyId: enemy.id, targetX: Math.round(enemy.targetX) });
    }
    updateUfo(dt, time) {
      this.enemies.filter((enemy) => enemy.alive && enemy.mode === 'kamikaze').forEach((enemy) => { enemy.x += enemy.velocityX * dt; enemy.y += enemy.velocityY * dt; if (enemy.y > this.player.y + this.player.h) enemy.mode = 'returning'; });
      this.enemies.filter((enemy) => enemy.alive && enemy.mode === 'returning').forEach((enemy) => { const dx = enemy.homeX - enemy.x; const dy = enemy.homeY - enemy.y; const distance = Math.hypot(dx, dy); if (distance < 5) { enemy.x = enemy.homeX; enemy.y = enemy.homeY; enemy.mode = 'formation'; return; } const speed = 185 + this.speedStage * 8; enemy.x += (dx / distance) * speed * dt; enemy.y += (dy / distance) * speed * dt; });
      if (this.ufo) { this.ufo.x += this.ufo.velocityX * dt; if (this.ufo.x < -70 || this.ufo.x > GAME_SIZE.width + 70) this.ufo = null; }
      if (!this.ufo && !this.ufoSpawnedThisRound && time >= this.nextUfoAt) this.spawnUfo(time);
    }
    spawnUfo(time) { const fromLeft = this.random.next() > .5; this.ufo = { x: fromLeft ? -55 : GAME_SIZE.width + 55, y: 28, w: 52, h: 20, velocityX: fromLeft ? UFO.speed : -UFO.speed }; this.ufoSpawnedThisRound = true; }
    updateEnemyFire(time) {
      if (this.level < 3 || time < this.nextEnemyShotAt) return;
      const candidates = this.enemies.filter((enemy) => enemy.alive && enemy.mode !== 'kamikaze'); if (!candidates.length) return;
      const shooter = candidates[this.random.integer(0, candidates.length - 1)]; this.enemyProjectiles.push({ x: shooter.x + shooter.w / 2 - 2, y: shooter.y + shooter.h, w: 4, h: 12, velocityY: 155 + this.speedStage * 12 }); this.audio.play('enemyFire');
      const minimumDelay = Math.max(430, 1750 - this.speedStage * 125); this.nextEnemyShotAt = time + this.random.range(minimumDelay, minimumDelay + 800); this.record({ type: 'enemyShot', enemyId: shooter.id });
    }
    overlaps(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
    damageBarrier(projectile) {
      for (const barrier of this.barriers) {
        const block = barrier.blocks.find((candidate) => candidate.alive && this.overlaps(projectile, candidate));
        if (block) { block.alive = false; this.audio.play('barrier'); return true; }
      }
      return false;
    }
    handleCollisions(time) {
      for (const shot of this.projectiles) {
        if (shot.dead) continue;
        if (this.damageBarrier(shot)) { shot.dead = true; continue; }
        const target = this.enemies.find((enemy) => enemy.alive && this.overlaps(shot, enemy));
        if (target) { shot.dead = true; this.killEnemy(target, time); continue; }
        if (this.ufo && this.overlaps(shot, this.ufo)) { shot.dead = true; this.killUfo(time); }
      }
      this.projectiles = this.projectiles.filter((shot) => !shot.dead);
      for (const shot of this.enemyProjectiles) {
        if (this.damageBarrier(shot)) { shot.dead = true; continue; }
        if (this.overlaps(shot, this.player)) { shot.dead = true; if (time >= this.player.invulnerableUntil) this.loseLife(time); }
      }
      this.enemyProjectiles = this.enemyProjectiles.filter((shot) => !shot.dead);
      if (time < this.player.invulnerableUntil) return;
      const danger = this.enemies.find((enemy) => enemy.alive && ((enemy.mode === 'kamikaze' && this.overlaps(enemy, this.player)) || (enemy.mode === 'formation' && (this.overlaps(enemy, this.player) || enemy.y + enemy.h >= this.player.y + 8))));
      if (danger) this.loseLife(time);
    }
    killEnemy(enemy, time) {
      if (!enemy.alive) return; enemy.alive = false; const typeMultiplier = enemy.mode === 'kamikaze' ? SCORES.kamikazeMultiplier : 1; const points = Math.round(SCORES[enemy.kind] * this.difficulty.scoreMultiplier * typeMultiplier); this.score += points;
      this.spawnSplat(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, this.invaderColor(enemy)); this.audio.play('hit'); this.record({ type: 'kill', enemyId: enemy.id, kind: enemy.kind, mode: enemy.mode, points }); this.updateHud();
    }
    killUfo(time) {
      const points = Math.round(SCORES.ufo * this.difficulty.scoreMultiplier); this.score += points; this.spawnSplat(this.ufo.x + this.ufo.w / 2, this.ufo.y + this.ufo.h / 2, '#e8a4ff'); this.audio.play('ufo'); this.record({ type: 'ufoKill', points }); this.ufo = null; this.updateHud();
      if (this.random.next() < UFO.deployChance) this.deployInvaders();
    }
    deployInvaders() {
      const currentExtras = this.enemies.filter((enemy) => enemy.alive && enemy.extra).length; const count = Math.min(UFO.deployCount, UFO.maxExtraEnemies - currentExtras); if (count <= 0) return;
      for (let i = 0; i < count; i += 1) this.enemies.push({ id: this.nextEnemyId++, kind: 'scout', x: 270 + i * 46, y: 55, w: 27, h: 21, alive: true, extra: true, mode: 'formation', targetX: 0, velocityX: 0, velocityY: 0 });
      this.record({ type: 'ufoDeploy', count });
    }
    loseLife(time) { this.lives -= 1; this.player.invulnerableUntil = time + 1400; this.audio.play('life'); this.record({ type: 'lifeLost' }); this.updateHud(); if (this.lives <= 0) this.gameOver(); }
    completeLevel() {
      this.state = 'levelComplete'; this.stopLoop(); this.draw(); this.audio.play('level'); this.showOverlay('Formation Cleared', `Level ${this.level} Complete · Stage ${this.stage + 1} Incoming`, false); this.record({ type: 'levelComplete', level: this.level });
      setTimeout(() => { if (this.state !== 'levelComplete') return; this.level += 1; this.stage += 1; this.speedStage += 1; this.enemies = this.makeFormation(); this.nextEnemyId = this.enemies.length; this.formationDirection = 1; this.projectiles = []; this.enemyProjectiles = []; this.nextEnemyShotAt = now() + 1800; this.ufo = null; this.ufoSpawnedThisRound = false; this.state = 'playing'; this.overlay.hidden = true; this.updateHud(); this.startLoop(); }, 1150);
    }
    gameOver() { this.state = 'gameOver'; this.stopLoop(); this.draw(); this.audio.play('gameOver'); this.showOverlay('Signal Lost', `Final Score ${scoreText(this.score)}`, true, true); this.leaderboard.attach($('#leaderboard-content'), $('#leaderboard-status')); this.leaderboard.refresh().then((online) => { if (!online && this.state === 'gameOver') this.message.textContent = 'Leaderboard unavailable for this run. You can still play again.'; }); if (this.score > 0 && this.run) setTimeout(() => this.openNameDialog(), 450); else this.message.textContent = this.score ? 'Leaderboard unavailable for this run. You can still play again.' : 'Try another signal.'; }
    showOverlay(title, detail, showRestart, showLeaderboard = false) {
      this.leaderboard.detach(); this.overlay.hidden = false; this.overlay.innerHTML = `<div class="overlay-content"><p class="eyebrow">${title}</p><h2>${detail}</h2>${showRestart ? '<div class="difficulty-buttons"><button class="arcade-button" data-restart="easy">Play Easy</button><button class="arcade-button arcade-button-hard" data-restart="hard">Play Hard</button></div>' : ''}${showLeaderboard ? '<section class="game-over-leaderboard" aria-labelledby="leaderboard-title"><div class="leaderboard-heading"><h2 id="leaderboard-title">High Scores</h2><span id="leaderboard-status" class="server-status" aria-live="polite">Loading</span></div><div id="leaderboard-content" class="leaderboard-content" aria-live="polite"></div></section>' : ''}<p id="game-message" class="game-message" aria-live="polite"></p></div>`;
      this.message = $('#game-message'); this.overlay.querySelectorAll('[data-restart]').forEach((button) => button.addEventListener('click', () => this.start(button.dataset.restart)));
    }
    openNameDialog() { if (this.state !== 'gameOver' || !this.run) return; this.nameDialog.hidden = false; $('#name-dialog-score').textContent = `Score ${scoreText(this.score)} · ${this.difficulty.label}`; $('#name-error').textContent = ''; this.nameInputs.forEach((input) => { input.value = ''; }); this.nameInputs[0].focus(); }
    async submitName() {
      const name = this.nameInputs.map((input) => input.value).join('').toUpperCase(); const error = $('#name-error');
      if (!/^[A-Z0-9]{3}$/.test(name)) { error.textContent = 'Use exactly three letters or numbers.'; this.nameInputs[0].focus(); return; }
      if (!this.run) { error.textContent = 'This run could not be verified by the arcade server.'; return; }
      this.state = 'submittingScore'; error.textContent = 'Verifying run…';
      try {
        const result = await this.api.submitRun({ runId: this.run.runId, name, difficulty: this.difficultyKey, level: this.level, stage: this.stage, speedStage: this.speedStage, durationMs: Math.round(now() - this.runStartedAt), events: this.events });
        if (!result.accepted || !Array.isArray(result.leaderboard)) throw new Error('Run was not accepted');
        this.leaderboard.render(result.leaderboard); this.leaderboard.setStatus(IS_MOCK_MODE ? 'Mock mode' : 'Online', 'online'); this.closeNameDialog(`Verified score: ${Number(result.score || 0).toLocaleString()}.`); this.leaderboard.refresh();
      } catch (submitError) { console.info('Score submission rejected:', submitError.message); error.textContent = 'This score could not be accepted. The game is still ready for another run.'; this.state = 'gameOver'; }
    }
    closeNameDialog(message) { this.nameDialog.hidden = true; this.state = 'gameOver'; this.message.textContent = message; }
    record(event) { if (!this.events) return; this.events.push({ ...event, time: Math.round(now() - this.runStartedAt) }); }
    updateHud() { $('#game-score').textContent = scoreText(this.score); $('#game-level').textContent = this.level; $('#game-stage').textContent = this.stage; $('#game-lives').textContent = this.lives; }
    draw() {
      const ctx = this.ctx; ctx.clearRect(0, 0, GAME_SIZE.width, GAME_SIZE.height); ctx.fillStyle = '#04080e'; ctx.fillRect(0, 0, GAME_SIZE.width, GAME_SIZE.height); this.drawStars(ctx);
      this.enemies.filter((enemy) => enemy.alive).forEach((enemy) => this.drawInvader(ctx, enemy)); this.drawBarriers(ctx); if (this.ufo) this.drawUfo(ctx, this.ufo); this.projectiles.forEach((shot) => { ctx.fillStyle = '#f4fbff'; ctx.fillRect(shot.x, shot.y, shot.w, shot.h); }); this.enemyProjectiles.forEach((shot) => { ctx.fillStyle = '#ff9b8e'; ctx.fillRect(shot.x, shot.y, shot.w, shot.h); }); this.drawParticles(ctx); this.drawPlayer(ctx);
    }
    drawStars(ctx) { ctx.fillStyle = '#eaf5ff'; for (let i = 0; i < 42; i += 1) { const x = (i * 179 + 37) % GAME_SIZE.width; const y = (i * 71 + 23) % 440; ctx.globalAlpha = .16 + (i % 4) * .08; ctx.fillRect(x, y, i % 5 === 0 ? 2 : 1, i % 5 === 0 ? 2 : 1); } ctx.globalAlpha = 1; }
    invaderColor(enemy) { const colors = { scout: '#96d8f4', guard: '#b7e9a3', commander: '#ffc98a' }; return enemy.mode === 'kamikaze' ? '#ff91a4' : colors[enemy.kind]; }
    drawInvader(ctx, enemy) { ctx.fillStyle = this.invaderColor(enemy); const x = Math.round(enemy.x); const y = Math.round(enemy.y); const pixels = ['0111110', '1101011', '1111111', '1011101', '0100010']; pixels.forEach((row, rowIndex) => [...row].forEach((bit, column) => { if (bit === '1') ctx.fillRect(x + column * 4, y + rowIndex * 4, 4, 4); })); }
    spawnSplat(x, y, color) { for (let index = 0; index < 14; index += 1) { const angle = (index / 14) * Math.PI * 2 + Math.random() * .25; const speed = 32 + Math.random() * 85; this.particles.push({ x, y, velocityX: Math.cos(angle) * speed, velocityY: Math.sin(angle) * speed, life: .35 + Math.random() * .25, color, size: 3 + (index % 3) * 2 }); } }
    drawParticles(ctx) { this.particles.forEach((particle) => { ctx.globalAlpha = Math.min(1, particle.life * 2); ctx.fillStyle = particle.color; ctx.fillRect(Math.round(particle.x), Math.round(particle.y), particle.size, particle.size); }); ctx.globalAlpha = 1; }
    drawBarriers(ctx) { ctx.fillStyle = '#a7d99b'; this.barriers.forEach((barrier) => barrier.blocks.filter((block) => block.alive).forEach((block) => ctx.fillRect(block.x, block.y, block.w, block.h))); }
    drawUfo(ctx, ufo) { ctx.fillStyle = '#e8a4ff'; ctx.fillRect(ufo.x + 6, ufo.y + 8, 40, 8); ctx.fillRect(ufo.x + 15, ufo.y + 3, 22, 6); ctx.fillStyle = '#fff4ff'; ctx.fillRect(ufo.x + 17, ufo.y + 5, 18, 2); }
    drawPlayer(ctx) { const flash = this.player.invulnerableUntil > now() && Math.floor(now() / 100) % 2; if (flash) return; const x = Math.round(this.player.x); const y = this.player.y; ctx.fillStyle = '#f4fbff'; ctx.fillRect(x + 16, y, 8, 5); ctx.fillRect(x + 11, y + 5, 18, 6); ctx.fillRect(x + 4, y + 11, 32, 6); ctx.fillRect(x, y + 17, 40, 5); }
  }

  function init() {
    const api = new LeaderboardAPI(LEADERBOARD_API_BASE); const leaderboard = new LeaderboardView(api); const game = new Space404Game(api, leaderboard);
    leaderboard.refresh().then(() => leaderboard.startPolling()); window.space404Game = game;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();
