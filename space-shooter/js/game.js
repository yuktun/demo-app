// ============================================================================
// Core Game Engine & Wave Director
// ============================================================================

class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.dpr = window.devicePixelRatio || 1;

    this.width = 800;
    this.height = 900;

    this.state = 'MENU'; // 'MENU' | 'PLAYING' | 'PAUSED' | 'GAMEOVER'

    // Systems
    this.starfield = new Starfield(this.width, this.height);
    this.particles = new ParticleSystem();

    // Entities
    this.player = null;
    this.projectiles = [];
    this.enemyBullets = [];
    this.enemies = [];
    this.powerups = [];
    this.boss = null;

    // Progression
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem('void_striker_high_score') || '0', 10);
    this.wave = 1;
    this.waveState = 'PREPARE'; // 'PREPARE' | 'SPAWNING' | 'WAVE_ACTIVE' | 'WAVE_CLEARED'
    this.waveTimer = 0;
    this.enemiesToSpawn = [];
    this.enemiesDefeated = 0;
    this.shotsFired = 0;
    this.shotsHit = 0;

    // Combo system
    this.combo = 0;
    this.comboTimer = 0;
    this.maxCombo = 0;

    // Input state
    this.input = {
      up: false,
      down: false,
      left: false,
      right: false,
      shoot: false,
      bomb: false,
      mouseMove: false,
      mouseX: 0,
      mouseY: 0
    };
    this.autoFire = true;

    // Setup
    this.initCanvas();
    this.initInputs();
    this.updateHUD();

    // Loop
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  initCanvas() {
    const resize = () => {
      const container = document.getElementById('game-container');
      const rect = container.getBoundingClientRect();
      this.width = rect.width;
      this.height = rect.height;

      this.canvas.width = this.width * this.dpr;
      this.canvas.height = this.height * this.dpr;
      this.canvas.style.width = `${this.width}px`;
      this.canvas.style.height = `${this.height}px`;

      this.ctx.resetTransform();
      this.ctx.scale(this.dpr, this.dpr);
      this.starfield.resize(this.width, this.height);
    };

    window.addEventListener('resize', resize);
    resize();
  }

  initInputs() {
    window.addEventListener('keydown', (e) => {
      window.soundManager.resume();

      if (e.code === 'KeyW' || e.code === 'ArrowUp') this.input.up = true;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') this.input.down = true;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') this.input.left = true;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') this.input.right = true;
      if (e.code === 'Space') {
        this.input.shoot = true;
        e.preventDefault();
      }
      if (e.code === 'KeyB' || e.code === 'KeyX') {
        this.triggerBomb();
        e.preventDefault();
      }
      if (e.code === 'KeyP' || e.code === 'Escape') {
        this.togglePause();
        e.preventDefault();
      }
      if (e.code === 'KeyF') {
        this.autoFire = !this.autoFire;
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'KeyW' || e.code === 'ArrowUp') this.input.up = false;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') this.input.down = false;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') this.input.left = false;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') this.input.right = false;
      if (e.code === 'Space') this.input.shoot = false;
    });

    // Mouse Controls
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.input.mouseX = e.clientX - rect.left;
      this.input.mouseY = e.clientY - rect.top;
      this.input.mouseMove = true;
    });

    this.canvas.addEventListener('mousedown', (e) => {
      window.soundManager.resume();
      if (e.button === 0) {
        this.input.shoot = true;
      } else if (e.button === 2) {
        this.triggerBomb();
        e.preventDefault();
      }
    });

    this.canvas.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.input.shoot = false;
    });

    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Touch controls with relative delta dragging (so fingers don't block the ship)
    let touchLastX = null;
    let touchLastY = null;

    this.canvas.addEventListener('touchstart', (e) => {
      window.soundManager.resume();
      if (e.touches.length > 0) {
        touchLastX = e.touches[0].clientX;
        touchLastY = e.touches[0].clientY;
        this.input.shoot = true;
      }
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0 && this.player && touchLastX !== null) {
        const curX = e.touches[0].clientX;
        const curY = e.touches[0].clientY;
        const dx = curX - touchLastX;
        const dy = curY - touchLastY;

        this.player.x += dx * 1.15;
        this.player.y += dy * 1.15;

        // Visual banking tilt on touch swipe
        this.player.tiltTarget = Math.max(-1, Math.min(1, dx / 4));

        const padding = 24;
        this.player.x = Math.max(padding, Math.min(this.width - padding, this.player.x));
        this.player.y = Math.max(padding, Math.min(this.height - padding, this.player.y));

        touchLastX = curX;
        touchLastY = curY;
      }
      e.preventDefault();
    }, { passive: false });

    this.canvas.addEventListener('touchend', (e) => {
      if (e.touches.length === 0) {
        touchLastX = null;
        touchLastY = null;
        this.input.shoot = false;
      }
    });

    this.canvas.addEventListener('touchcancel', () => {
      touchLastX = null;
      touchLastY = null;
      this.input.shoot = false;
    });
  }

  startNewGame() {
    window.soundManager.resume();
    window.soundManager.startMusic();

    this.player = new Player(this.width / 2, this.height - 100);
    this.projectiles = [];
    this.enemyBullets = [];
    this.enemies = [];
    this.powerups = [];
    this.boss = null;

    this.score = 0;
    this.wave = 1;
    this.enemiesDefeated = 0;
    this.shotsFired = 0;
    this.shotsHit = 0;
    this.combo = 0;
    this.maxCombo = 0;

    this.state = 'PLAYING';
    document.getElementById('menu-screen').classList.add('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('pause-screen').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');

    const mobileBombBtn = document.getElementById('btn-mobile-bomb');
    if (mobileBombBtn) mobileBombBtn.classList.remove('hidden');

    this.prepareWave();
  }

  prepareWave() {
    this.waveState = 'PREPARE';
    this.waveTimer = 140; // ~2.3 seconds
    this.enemiesToSpawn = [];
    this.boss = null;

    // Check if Boss wave (every 5th wave)
    const isBossWave = (this.wave % 5 === 0);

    if (isBossWave) {
      this.starfield.warpMultiplier = 3.5;
      window.soundManager.playBossAlarm();
      this.particles.addFloatingText('⚠️ ALERT: DREADNOUGHT TITAN DETECTED ⚠️', this.width / 2, this.height * 0.4, '#ef4444', 22);
    } else {
      this.starfield.warpMultiplier = 2.2;
      this.particles.addFloatingText(`--- SECTOR ${this.wave} ---`, this.width / 2, this.height * 0.4, '#00f0ff', 24);

      // Populate wave spawns
      const totalScouts = 4 + this.wave * 2;
      const totalInterceptors = Math.floor(this.wave * 1.5);
      const totalBombers = Math.floor((this.wave - 1) / 2);

      // Staggered spawns
      for (let i = 0; i < totalScouts; i++) {
        this.enemiesToSpawn.push({
          type: 'scout',
          delay: 40 + i * 35,
          x: 40 + Math.random() * (this.width - 80)
        });
      }

      for (let i = 0; i < totalInterceptors; i++) {
        this.enemiesToSpawn.push({
          type: 'interceptor',
          delay: 90 + i * 50,
          x: 60 + Math.random() * (this.width - 120)
        });
      }

      for (let i = 0; i < totalBombers; i++) {
        this.enemiesToSpawn.push({
          type: 'bomber',
          delay: 150 + i * 90,
          x: 100 + Math.random() * (this.width - 200)
        });
      }
    }
  }

  triggerBomb() {
    if (this.state !== 'PLAYING' || !this.player || this.player.bombs <= 0) return;

    this.player.bombs--;
    window.soundManager.playBomb();
    this.particles.triggerScreenShake(16, 450);

    // Create EMP shockwave ring
    this.particles.createExplosion(this.player.x, this.player.y, 60, ['#00ffff', '#38bdf8', '#ffffff', '#e0f2fe'], 8);
    this.particles.addFloatingText('EMP DETONATED!', this.width / 2, this.height / 2, '#00ffff', 24);

    // Clear all enemy bullets into harmless energy sparks
    this.enemyBullets.forEach(b => {
      this.particles.createExplosion(b.x, b.y, 4, ['#38bdf8', '#ffffff'], 2);
    });
    this.enemyBullets = [];

    // Heavy damage to all active enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      const killed = e.takeDamage(260);
      if (killed) {
        this.handleEnemyKilled(e);
      }
    }

    if (this.boss) {
      const killed = this.boss.takeDamage(350);
      if (killed) {
        this.handleEnemyKilled(this.boss);
        this.boss = null;
      }
    }

    this.updateHUD();
  }

  togglePause() {
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
      document.getElementById('pause-screen').classList.remove('hidden');
    } else if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
      document.getElementById('pause-screen').classList.add('hidden');
    }
  }

  handleEnemyKilled(enemy) {
    this.enemiesDefeated++;
    const isBoss = enemy instanceof BossEnemy;
    const explosionSize = isBoss ? 'boss' : (enemy instanceof BomberEnemy ? 'medium' : 'small');
    window.soundManager.playExplosion(explosionSize);

    // Explosions
    const colors = isBoss
      ? ['#ef4444', '#f59e0b', '#ffffff', '#ff0055']
      : (enemy instanceof BomberEnemy ? ['#f59e0b', '#fbbf24', '#ffffff'] : ['#a855f7', '#ec4899', '#ffffff']);
    this.particles.createExplosion(enemy.x, enemy.y, isBoss ? 90 : 25, colors, isBoss ? 9 : 5);

    if (isBoss) {
      this.particles.triggerScreenShake(20, 600);
      this.particles.addFloatingText('BOSS DESTROYED! +5000', enemy.x, enemy.y - 30, '#ffd700', 26);
    }

    // Combo streak
    this.combo++;
    this.comboTimer = 180; // 3 seconds window to chain
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;

    const multiplier = Math.min(5, 1 + Math.floor(this.combo / 4));
    const gainedScore = enemy.scoreValue * multiplier;
    this.score += gainedScore;

    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('void_striker_high_score', this.highScore.toString());
    }

    this.particles.addFloatingText(
      multiplier > 1 ? `+${gainedScore} (x${multiplier})` : `+${gainedScore}`,
      enemy.x,
      enemy.y,
      multiplier >= 3 ? '#ff00aa' : '#00ffff',
      multiplier >= 3 ? 18 : 14
    );

    // Power-up Drop Chance
    const dropChance = isBoss ? 1.0 : (enemy instanceof BomberEnemy ? 0.6 : 0.15);
    if (Math.random() < dropChance) {
      const types = ['spread', 'rapid', 'plasma', 'shield', 'bomb', 'drone', 'health'];
      const chosen = types[Math.floor(Math.random() * types.length)];
      this.powerups.push(new PowerUp(enemy.x, enemy.y, chosen));
    }
  }

  applyPowerUp(p) {
    window.soundManager.playPowerup();
    this.particles.createExplosion(p.x, p.y, 20, [p.color, '#ffffff'], 4);
    this.particles.addFloatingText(p.name, p.x, p.y, p.color, 18);

    switch (p.type) {
      case 'spread':
        this.player.weaponLevel = Math.min(5, this.player.weaponLevel + 1);
        break;
      case 'rapid':
        this.player.rapidFireTimer = 600; // 10 seconds
        break;
      case 'plasma':
        this.player.plasmaTimer = 450; // 7.5 seconds
        break;
      case 'shield':
        this.player.shield = this.player.maxShield;
        break;
      case 'bomb':
        this.player.bombs = Math.min(5, this.player.bombs + 1);
        break;
      case 'drone':
        this.player.hasDrone = true;
        break;
      case 'health':
        this.player.health = Math.min(this.player.maxHealth, this.player.health + 40);
        break;
    }

    this.score += 250;
    this.updateHUD();
  }

  gameOver() {
    this.state = 'GAMEOVER';
    window.soundManager.stopMusic();
    window.soundManager.playGameOver();

    // Player death explosion
    this.particles.createExplosion(this.player.x, this.player.y, 80, ['#00ffff', '#ff0055', '#ffffff', '#ffaa00'], 9);
    this.particles.triggerScreenShake(22, 700);

    // Update Game Over UI
    const accuracy = this.shotsFired > 0 ? Math.round((this.shotsHit / this.shotsFired) * 100) : 0;
    document.getElementById('go-final-score').innerText = this.score.toLocaleString();
    document.getElementById('go-high-score').innerText = this.highScore.toLocaleString();
    document.getElementById('go-waves').innerText = this.wave;
    document.getElementById('go-enemies').innerText = this.enemiesDefeated;
    document.getElementById('go-combo').innerText = `x${this.maxCombo}`;
    document.getElementById('go-accuracy').innerText = `${accuracy}%`;

    const newHighBanner = document.getElementById('new-high-score-banner');
    if (this.score >= this.highScore && this.score > 0) {
      newHighBanner.classList.remove('hidden');
    } else {
      newHighBanner.classList.add('hidden');
    }

    setTimeout(() => {
      document.getElementById('game-over-screen').classList.remove('hidden');
      const mobileBombBtn = document.getElementById('btn-mobile-bomb');
      if (mobileBombBtn) mobileBombBtn.classList.add('hidden');
    }, 800);
  }

  updateHUD() {
    if (!this.player) return;

    // Health & Shield Bars
    const hpPercent = Math.max(0, (this.player.health / this.player.maxHealth) * 100);
    const shieldPercent = Math.max(0, (this.player.shield / this.player.maxShield) * 100);

    const hpBar = document.getElementById('hud-health-fill');
    const shieldBar = document.getElementById('hud-shield-fill');
    if (hpBar) hpBar.style.width = `${hpPercent}%`;
    if (shieldBar) shieldBar.style.width = `${shieldPercent}%`;

    // Values
    document.getElementById('hud-score').innerText = this.score.toLocaleString();
    document.getElementById('hud-high-score').innerText = this.highScore.toLocaleString();
    document.getElementById('hud-wave').innerText = `SECTOR ${this.wave}`;

    // Combo
    const comboEl = document.getElementById('hud-combo');
    if (this.combo > 1) {
      const multiplier = Math.min(5, 1 + Math.floor(this.combo / 4));
      comboEl.innerText = `COMBO x${multiplier} (${this.combo})`;
      comboEl.style.opacity = '1';
    } else {
      comboEl.style.opacity = '0';
    }

    // Bombs count
    const bombContainer = document.getElementById('hud-bombs');
    if (bombContainer) {
      bombContainer.innerHTML = '';
      for (let i = 0; i < this.player.bombs; i++) {
        const icon = document.createElement('span');
        icon.className = 'bomb-pip';
        icon.innerText = '💣';
        bombContainer.appendChild(icon);
      }
    }

    // Powerup indicators
    const powerupList = document.getElementById('hud-powerups');
    if (powerupList) {
      powerupList.innerHTML = '';
      if (this.player.rapidFireTimer > 0) {
        powerupList.innerHTML += `<div class="powerup-badge rapid">RAPID ${(this.player.rapidFireTimer / 60).toFixed(1)}s</div>`;
      }
      if (this.player.plasmaTimer > 0) {
        powerupList.innerHTML += `<div class="powerup-badge plasma">PLASMA ${(this.player.plasmaTimer / 60).toFixed(1)}s</div>`;
      }
      if (this.player.hasDrone) {
        powerupList.innerHTML += `<div class="powerup-badge drone">DRONE</div>`;
      }
      if (this.player.weaponLevel > 1) {
        powerupList.innerHTML += `<div class="powerup-badge spread">TIER ${this.player.weaponLevel}</div>`;
      }
    }

    // Boss Bar
    const bossBar = document.getElementById('hud-boss-bar-container');
    if (this.boss && !this.boss.markedForDeletion) {
      bossBar.classList.remove('hidden');
      const bossHpPercent = Math.max(0, (this.boss.hp / this.boss.maxHp) * 100);
      document.getElementById('hud-boss-bar-fill').style.width = `${bossHpPercent}%`;
    } else {
      bossBar.classList.add('hidden');
    }
  }

  update(dt) {
    this.starfield.update(dt);
    this.particles.update(dt);

    if (this.state !== 'PLAYING') return;

    // Combo Timer Decay
    if (this.comboTimer > 0) {
      this.comboTimer--;
      if (this.comboTimer <= 0) {
        this.combo = 0;
      }
    }

    // Wave Spawning Director
    if (this.waveState === 'PREPARE') {
      this.waveTimer--;
      if (this.waveTimer <= 0) {
        this.starfield.warpMultiplier = 1.0;
        const isBossWave = (this.wave % 5 === 0);
        if (isBossWave) {
          this.boss = new BossEnemy(this.width / 2, -70);
          this.enemies.push(this.boss);
          this.waveState = 'WAVE_ACTIVE';
        } else {
          this.waveState = 'SPAWNING';
        }
      }
    } else if (this.waveState === 'SPAWNING') {
      // Spawn queued enemies
      for (let i = this.enemiesToSpawn.length - 1; i >= 0; i--) {
        const item = this.enemiesToSpawn[i];
        item.delay--;
        if (item.delay <= 0) {
          if (item.type === 'scout') {
            this.enemies.push(new ScoutEnemy(item.x, -25));
          } else if (item.type === 'interceptor') {
            this.enemies.push(new InterceptorEnemy(item.x, -30));
          } else if (item.type === 'bomber') {
            this.enemies.push(new BomberEnemy(item.x, -40));
          }
          this.enemiesToSpawn.splice(i, 1);
        }
      }

      if (this.enemiesToSpawn.length === 0) {
        this.waveState = 'WAVE_ACTIVE';
      }
    } else if (this.waveState === 'WAVE_ACTIVE') {
      // Check if all enemies cleared
      if (this.enemies.length === 0 && (!this.boss || this.boss.markedForDeletion)) {
        this.waveState = 'WAVE_CLEARED';
        this.waveTimer = 100;
        this.score += 500 * this.wave; // Wave bonus
        this.particles.addFloatingText(`SECTOR ${this.wave} SECURED!`, this.width / 2, this.height * 0.45, '#38bdf8', 22);
      }
    } else if (this.waveState === 'WAVE_CLEARED') {
      this.waveTimer--;
      if (this.waveTimer <= 0) {
        this.wave++;
        this.prepareWave();
      }
    }

    // Player update & shooting
    if (this.player) {
      this.player.update(this.input, { width: this.width, height: this.height }, this.particles);

      if (this.input.shoot || this.autoFire) {
        const newShots = this.player.shoot();
        if (newShots.length > 0) {
          this.shotsFired += newShots.length;
          this.projectiles.push(...newShots);
        }
      }
    }

    // Update Player Projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.update();
      if (proj.markedForDeletion) {
        this.projectiles.splice(i, 1);
      }
    }

    // Update Enemy Bullets
    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const eb = this.enemyBullets[i];
      eb.update({ width: this.width, height: this.height });
      if (eb.markedForDeletion) {
        this.enemyBullets.splice(i, 1);
      }
    }

    // Update Enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      enemy.update(this.player, this.enemyBullets, { width: this.width, height: this.height }, this.particles);
      if (enemy.markedForDeletion) {
        this.enemies.splice(i, 1);
      }
    }

    // Update Powerups
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const p = this.powerups[i];
      p.update({ width: this.width, height: this.height });
      if (p.markedForDeletion) {
        this.powerups.splice(i, 1);
      }
    }

    // ------------------------------------------------------------------------
    // Collisions
    // ------------------------------------------------------------------------

    // 1. Player Projectiles vs Enemies
    for (let pIdx = this.projectiles.length - 1; pIdx >= 0; pIdx--) {
      const proj = this.projectiles[pIdx];

      for (let eIdx = this.enemies.length - 1; eIdx >= 0; eIdx--) {
        const enemy = this.enemies[eIdx];
        if (proj.isColliding(enemy)) {
          this.shotsHit++;
          const killed = enemy.takeDamage(proj.damage);
          this.particles.createExplosion(proj.x, proj.y, 6, ['#ffffff', '#00f0ff'], 3);

          if (!(proj instanceof PlasmaBall)) {
            proj.markedForDeletion = true;
          }

          if (killed) {
            this.handleEnemyKilled(enemy);
            if (enemy === this.boss) this.boss = null;
          }
          break;
        }
      }
    }

    // 2. Enemy Bullets vs Player
    if (this.player) {
      for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
        const eb = this.enemyBullets[i];
        if (eb.isColliding(this.player)) {
          eb.markedForDeletion = true;
          this.particles.createExplosion(eb.x, eb.y, 8, [eb.color, '#ffffff'], 3);
          const dead = this.player.takeDamage(eb.damage, this.particles);
          if (dead) {
            this.gameOver();
            return;
          }
        }
      }

      // 3. Enemy Ships vs Player (Ramming)
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const enemy = this.enemies[i];
        if (enemy.isColliding(this.player)) {
          this.particles.createExplosion(enemy.x, enemy.y, 16, ['#ef4444', '#ffffff'], 4);
          enemy.takeDamage(100);
          if (enemy.hp <= 0) {
            this.handleEnemyKilled(enemy);
            if (enemy === this.boss) this.boss = null;
          }
          const dead = this.player.takeDamage(35, this.particles);
          if (dead) {
            this.gameOver();
            return;
          }
        }
      }

      // 4. Player vs Power-ups
      for (let i = this.powerups.length - 1; i >= 0; i--) {
        const p = this.powerups[i];
        if (p.isColliding(this.player)) {
          p.markedForDeletion = true;
          this.applyPowerUp(p);
        }
      }
    }

    this.updateHUD();
  }

  draw() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    // Apply Screen Shake offset
    this.ctx.save();
    this.ctx.translate(this.particles.shakeOffsetX, this.particles.shakeOffsetY);

    // Draw Parallax Starfield & Nebulae
    this.starfield.draw(this.ctx);

    // Draw Power-ups
    this.powerups.forEach(p => p.draw(this.ctx));

    // Draw Player Projectiles
    this.projectiles.forEach(p => p.draw(this.ctx));

    // Draw Enemy Bullets
    this.enemyBullets.forEach(b => b.draw(this.ctx));

    // Draw Enemies & Boss
    this.enemies.forEach(e => e.draw(this.ctx));

    // Draw Player
    if (this.player && this.state !== 'GAMEOVER') {
      this.player.draw(this.ctx);
    }

    // Draw Particles, Shockwaves, and Floating Damage Numbers
    this.particles.draw(this.ctx);

    this.ctx.restore();
  }

  gameLoop(currentTime) {
    const dt = Math.min(2.0, (currentTime - this.lastTime) / 16.666);
    this.lastTime = currentTime;

    this.update(dt);
    this.draw();

    requestAnimationFrame((t) => this.gameLoop(t));
  }
}

// Global game instance initialized once DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  window.game = new Game();

  // Attach button events
  document.getElementById('btn-start').addEventListener('click', () => {
    window.game.startNewGame();
  });

  document.getElementById('btn-restart').addEventListener('click', () => {
    window.game.startNewGame();
  });

  document.getElementById('btn-resume').addEventListener('click', () => {
    window.game.togglePause();
  });

  document.getElementById('btn-pause-restart').addEventListener('click', () => {
    window.game.startNewGame();
  });

  const soundBtn = document.getElementById('btn-sound-toggle');
  if (soundBtn) {
    soundBtn.addEventListener('click', () => {
      const isMuted = window.soundManager.toggleMute();
      soundBtn.innerText = isMuted ? '🔇 SOUND: OFF' : '🔊 SOUND: ON';
      soundBtn.classList.toggle('muted', isMuted);
    });
  }

  const autoFireBtn = document.getElementById('btn-autofire-toggle');
  if (autoFireBtn) {
    autoFireBtn.addEventListener('click', () => {
      window.game.autoFire = !window.game.autoFire;
      autoFireBtn.innerText = window.game.autoFire ? '⚡ AUTO-FIRE: ON' : '⚡ AUTO-FIRE: OFF';
      autoFireBtn.classList.toggle('off', !window.game.autoFire);
    });
  }

  // Mobile dedicated buttons
  const mobileBombBtn = document.getElementById('btn-mobile-bomb');
  if (mobileBombBtn) {
    mobileBombBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.game.triggerBomb();
    });
    mobileBombBtn.addEventListener('touchstart', (e) => {
      e.stopPropagation();
      window.game.triggerBomb();
    }, { passive: true });
  }

  const hudBombs = document.getElementById('hud-bombs');
  if (hudBombs) {
    hudBombs.addEventListener('click', () => {
      window.game.triggerBomb();
    });
    hudBombs.addEventListener('touchstart', () => {
      window.game.triggerBomb();
    }, { passive: true });
  }

  const mobilePauseBtn = document.getElementById('btn-mobile-pause');
  if (mobilePauseBtn) {
    mobilePauseBtn.addEventListener('click', () => {
      window.game.togglePause();
    });
    mobilePauseBtn.addEventListener('touchstart', () => {
      window.game.togglePause();
    }, { passive: true });
  }
});
