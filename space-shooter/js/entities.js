// ============================================================================
// Entities: Player, Enemies, Boss, Projectiles & Powerups
// ============================================================================

// Base Vector Entity
class Entity {
  constructor(x, y, radius) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.markedForDeletion = false;
  }

  isColliding(other) {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    const dist = Math.hypot(dx, dy);
    return dist < (this.radius + other.radius);
  }
}

// ----------------------------------------------------------------------------
// Player Ship
// ----------------------------------------------------------------------------
class Player extends Entity {
  constructor(x, y) {
    super(x, y, 18);
    this.vx = 0;
    this.vy = 0;
    this.maxSpeed = 6.5;
    this.acceleration = 0.8;
    this.friction = 0.88;

    this.maxHealth = 100;
    this.health = 100;
    this.maxShield = 100;
    this.shield = 100;
    this.shieldRegenDelay = 240; // frames since hit before regen
    this.hitTimer = 0;

    this.tilt = 0; // -1 to 1 for banking
    this.tiltTarget = 0;

    this.invulnerableTimer = 0; // i-frames
    this.bombs = 2;

    // Weapons
    this.weaponLevel = 1; // 1 to 5
    this.fireCooldown = 0;
    this.baseFireRate = 14; // frames between shots
    this.rapidFireTimer = 0;
    this.plasmaTimer = 0;

    // Drones
    this.hasDrone = false;
    this.droneAngle = 0;
  }

  takeDamage(amount, particleSystem) {
    if (this.invulnerableTimer > 0) return false;

    this.hitTimer = this.shieldRegenDelay;
    window.soundManager.playHit();

    if (this.shield > 0) {
      window.soundManager.playShieldDeflect();
      this.shield -= amount;
      if (this.shield < 0) {
        this.health += this.shield; // spillover
        this.shield = 0;
      }
    } else {
      this.health -= amount;
    }

    this.invulnerableTimer = 45; // ~0.75 seconds of i-frames
    particleSystem.triggerScreenShake(7, 200);

    if (this.health <= 0) {
      this.health = 0;
      return true; // Destroyed
    }
    return false;
  }

  update(input, bounds, particleSystem) {
    // Movement input
    let moveX = 0;
    let moveY = 0;

    if (input.left) moveX -= 1;
    if (input.right) moveX += 1;
    if (input.up) moveY -= 1;
    if (input.down) moveY += 1;

    // Normalize diagonal
    if (moveX !== 0 && moveY !== 0) {
      moveX *= 0.7071;
      moveY *= 0.7071;
    }

    this.vx += moveX * this.acceleration;
    this.vy += moveY * this.acceleration;

    // Apply friction
    this.vx *= this.friction;
    this.vy *= this.friction;

    // Clamp speed
    const speed = Math.hypot(this.vx, this.vy);
    if (speed > this.maxSpeed) {
      this.vx = (this.vx / speed) * this.maxSpeed;
      this.vy = (this.vy / speed) * this.maxSpeed;
    }

    this.x += this.vx;
    this.y += this.vy;

    // Clamp inside viewport
    const padding = 24;
    this.x = Math.max(padding, Math.min(bounds.width - padding, this.x));
    this.y = Math.max(padding, Math.min(bounds.height - padding, this.y));

    // Tilt for visual banking
    this.tiltTarget = Math.max(-1, Math.min(1, this.vx / 3));
    this.tilt += (this.tiltTarget - this.tilt) * 0.2;

    // Shield Regen
    if (this.hitTimer > 0) {
      this.hitTimer--;
    } else if (this.shield < this.maxShield) {
      this.shield = Math.min(this.maxShield, this.shield + 0.18);
    }

    // Invulnerability tick
    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer--;
    }

    // Powerup Timers
    if (this.rapidFireTimer > 0) this.rapidFireTimer--;
    if (this.plasmaTimer > 0) this.plasmaTimer--;
    if (this.fireCooldown > 0) this.fireCooldown--;

    // Thruster exhaust particles
    if (Math.random() < 0.8) {
      const thrusterColor = this.rapidFireTimer > 0 ? '#ff00aa' : '#00e5ff';
      particleSystem.createEngineParticle(this.x - 7, this.y + 16, this.vx * 0.2, 4 + Math.random() * 2, thrusterColor);
      particleSystem.createEngineParticle(this.x + 7, this.y + 16, this.vx * 0.2, 4 + Math.random() * 2, thrusterColor);
    }

    // Wingman Drone angle
    if (this.hasDrone) {
      this.droneAngle += 0.04;
    }
  }

  shoot() {
    if (this.fireCooldown > 0) return [];

    const effectiveRate = this.rapidFireTimer > 0 ? Math.floor(this.baseFireRate * 0.5) : this.baseFireRate;
    this.fireCooldown = effectiveRate;

    const projectiles = [];
    const isPlasma = this.plasmaTimer > 0;
    const soundType = isPlasma ? 'plasma' : (this.rapidFireTimer > 0 ? 'rapid' : 'default');
    window.soundManager.playLaser(soundType);

    if (isPlasma) {
      // Massive piercing plasma cannon shot
      projectiles.push(new PlasmaBall(this.x, this.y - 15, 0, -11));
      return projectiles;
    }

    // Standard / upgraded weapon tiers
    switch (this.weaponLevel) {
      case 1:
        // Single central laser
        projectiles.push(new PlayerLaser(this.x, this.y - 18, 0, -13));
        break;
      case 2:
        // Dual laser blasters
        projectiles.push(new PlayerLaser(this.x - 10, this.y - 10, 0, -13));
        projectiles.push(new PlayerLaser(this.x + 10, this.y - 10, 0, -13));
        break;
      case 3:
        // Triple spread
        projectiles.push(new PlayerLaser(this.x, this.y - 18, 0, -13));
        projectiles.push(new PlayerLaser(this.x - 12, this.y - 8, -2, -12.5));
        projectiles.push(new PlayerLaser(this.x + 12, this.y - 8, 2, -12.5));
        break;
      case 4:
        // Quad focused blaster
        projectiles.push(new PlayerLaser(this.x - 6, this.y - 18, -0.6, -13));
        projectiles.push(new PlayerLaser(this.x + 6, this.y - 18, 0.6, -13));
        projectiles.push(new PlayerLaser(this.x - 16, this.y - 6, -3, -12));
        projectiles.push(new PlayerLaser(this.x + 16, this.y - 6, 3, -12));
        break;
      default:
        // 5-Way Omni Spread Storm
        projectiles.push(new PlayerLaser(this.x, this.y - 20, 0, -13.5));
        projectiles.push(new PlayerLaser(this.x - 10, this.y - 12, -2, -13));
        projectiles.push(new PlayerLaser(this.x + 10, this.y - 12, 2, -13));
        projectiles.push(new PlayerLaser(this.x - 18, this.y - 6, -4.5, -12));
        projectiles.push(new PlayerLaser(this.x + 18, this.y - 6, 4.5, -12));
        break;
    }

    // Drone fire
    if (this.hasDrone) {
      const droneDist = 36;
      const d1x = this.x + Math.cos(this.droneAngle) * droneDist;
      const d1y = this.y + Math.sin(this.droneAngle) * droneDist * 0.6;
      const d2x = this.x - Math.cos(this.droneAngle) * droneDist;
      const d2y = this.y - Math.sin(this.droneAngle) * droneDist * 0.6;
      projectiles.push(new PlayerLaser(d1x, d1y - 8, 0, -13));
      projectiles.push(new PlayerLaser(d2x, d2y - 8, 0, -13));
    }

    return projectiles;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Invulnerability flashing
    if (this.invulnerableTimer > 0 && Math.floor(this.invulnerableTimer / 4) % 2 === 0) {
      ctx.globalAlpha = 0.35;
    }

    // Bank rotation
    ctx.rotate(this.tilt * 0.35);

    // Glowing ship hull
    ctx.shadowBlur = 12;
    ctx.shadowColor = this.plasmaTimer > 0 ? '#ff0055' : (this.rapidFireTimer > 0 ? '#ff00dd' : '#00e5ff');

    // Main fighter fuselage
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(0, -22); // Nose
    ctx.lineTo(8, -6);
    ctx.lineTo(20, 10); // Right wing tip
    ctx.lineTo(12, 16);
    ctx.lineTo(5, 12);
    ctx.lineTo(5, 18);  // Right engine
    ctx.lineTo(2, 18);
    ctx.lineTo(0, 15);  // Center tail
    ctx.lineTo(-2, 18);
    ctx.lineTo(-5, 18); // Left engine
    ctx.lineTo(-5, 12);
    ctx.lineTo(-12, 16);
    ctx.lineTo(-20, 10); // Left wing tip
    ctx.lineTo(-8, -6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Wing accents & cockpit
    ctx.fillStyle = '#00f0ff';
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(3, 0);
    ctx.lineTo(-3, 0);
    ctx.closePath();
    ctx.fill();

    // Cockpit glass
    ctx.fillStyle = '#7dd3fc';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#38bdf8';
    ctx.beginPath();
    ctx.ellipse(0, -4, 3, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Shield Dome if shield is up
    if (this.shield > 0) {
      const shieldAlpha = 0.15 + (this.shield / this.maxShield) * 0.35;
      ctx.strokeStyle = `rgba(0, 240, 255, ${shieldAlpha * 1.5})`;
      ctx.fillStyle = `rgba(0, 200, 255, ${shieldAlpha * 0.25})`;
      ctx.lineWidth = 1.8;
      ctx.shadowBlur = 14;
      ctx.shadowColor = '#00f0ff';
      ctx.beginPath();
      ctx.ellipse(0, 0, 26, 28, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fill();
    }

    ctx.restore();

    // Draw Companion Drones
    if (this.hasDrone) {
      const droneDist = 36;
      [
        { x: this.x + Math.cos(this.droneAngle) * droneDist, y: this.y + Math.sin(this.droneAngle) * droneDist * 0.6 },
        { x: this.x - Math.cos(this.droneAngle) * droneDist, y: this.y - Math.sin(this.droneAngle) * droneDist * 0.6 }
      ].forEach(dp => {
        ctx.save();
        ctx.translate(dp.x, dp.y);
        ctx.fillStyle = '#050515';
        ctx.strokeStyle = '#a855f7';
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#a855f7';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#00f0ff';
        ctx.beginPath();
        ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }
  }
}

// ----------------------------------------------------------------------------
// Projectiles
// ----------------------------------------------------------------------------
class PlayerLaser extends Entity {
  constructor(x, y, vx, vy) {
    super(x, y, 4);
    this.vx = vx;
    this.vy = vy;
    this.damage = 22;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    if (this.y < -20 || this.x < -20 || this.x > 2000) {
      this.markedForDeletion = true;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00f0ff';

    ctx.beginPath();
    ctx.moveTo(this.x, this.y - 7);
    ctx.lineTo(this.x, this.y + 7);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(this.x, this.y - 4, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class PlasmaBall extends Entity {
  constructor(x, y, vx, vy) {
    super(x, y, 14);
    this.vx = vx;
    this.vy = vy;
    this.damage = 60;
    this.pulse = 0;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.pulse += 0.2;
    if (this.y < -30) {
      this.markedForDeletion = true;
    }
  }

  draw(ctx) {
    ctx.save();
    const r = this.radius + Math.sin(this.pulse) * 2;
    ctx.shadowBlur = 18;
    ctx.shadowColor = '#ec4899';

    const grad = ctx.createRadialGradient(this.x, this.y, 2, this.x, this.y, r);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.4, '#f43f5e');
    grad.addColorStop(1, 'rgba(236, 72, 153, 0.2)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class EnemyBullet extends Entity {
  constructor(x, y, vx, vy, color = '#f43f5e') {
    super(x, y, 5);
    this.vx = vx;
    this.vy = vy;
    this.damage = 18;
    this.color = color;
  }

  update(bounds) {
    this.x += this.vx;
    this.y += this.vy;
    if (this.y > bounds.height + 30 || this.y < -30 || this.x < -30 || this.x > bounds.width + 30) {
      this.markedForDeletion = true;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = this.color;
    ctx.shadowBlur = 8;
    ctx.shadowColor = this.color;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

// ----------------------------------------------------------------------------
// Enemies
// ----------------------------------------------------------------------------
class Enemy extends Entity {
  constructor(x, y, radius, hp, scoreValue) {
    super(x, y, radius);
    this.hp = hp;
    this.maxHp = hp;
    this.scoreValue = scoreValue;
    this.time = Math.random() * 100;
  }

  takeDamage(amount) {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.markedForDeletion = true;
      return true; // killed
    }
    return false;
  }
}

// Drone / Scout (Fast, wave motion)
class ScoutEnemy extends Enemy {
  constructor(x, y) {
    super(x, y, 14, 25, 100);
    this.startX = x;
    this.vy = 2.2 + Math.random() * 0.8;
    this.freq = 0.03 + Math.random() * 0.02;
    this.amp = 45 + Math.random() * 25;
    this.shootTimer = 40 + Math.random() * 60;
  }

  update(player, bullets, bounds) {
    this.time++;
    this.y += this.vy;
    this.x = this.startX + Math.sin(this.time * this.freq) * this.amp;

    this.shootTimer--;
    if (this.shootTimer <= 0 && this.y < bounds.height * 0.65) {
      this.shootTimer = 90 + Math.random() * 40;
      window.soundManager.playEnemyLaser();
      bullets.push(new EnemyBullet(this.x, this.y + 10, 0, 4.5, '#f43f5e'));
    }

    if (this.y > bounds.height + 40) {
      this.markedForDeletion = true;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.fillStyle = '#1e1b4b';
    ctx.strokeStyle = '#f43f5e';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#f43f5e';
    ctx.lineWidth = 1.8;

    ctx.beginPath();
    ctx.moveTo(0, 14);
    ctx.lineTo(14, -10);
    ctx.lineTo(4, -6);
    ctx.lineTo(0, -12);
    ctx.lineTo(-4, -6);
    ctx.lineTo(-14, -10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Eye
    ctx.fillStyle = '#ff0055';
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// Interceptor (Strafes sideways, aimed dual shots)
class InterceptorEnemy extends Enemy {
  constructor(x, y) {
    super(x, y, 18, 55, 250);
    this.vx = (Math.random() < 0.5 ? -1 : 1) * (1.8 + Math.random() * 0.8);
    this.vy = 1.2;
    this.shootTimer = 60 + Math.random() * 40;
  }

  update(player, bullets, bounds) {
    this.x += this.vx;
    this.y += this.vy;

    if (this.x < 30 || this.x > bounds.width - 30) {
      this.vx *= -1;
    }

    this.shootTimer--;
    if (this.shootTimer <= 0 && this.y < bounds.height * 0.7) {
      this.shootTimer = 75;
      window.soundManager.playEnemyLaser();

      // Aim at player
      const angle = Math.atan2(player.y - this.y, player.x - this.x);
      const speed = 4.8;
      bullets.push(new EnemyBullet(this.x - 8, this.y + 8, Math.cos(angle) * speed, Math.sin(angle) * speed, '#a855f7'));
      bullets.push(new EnemyBullet(this.x + 8, this.y + 8, Math.cos(angle) * speed, Math.sin(angle) * speed, '#a855f7'));
    }

    if (this.y > bounds.height + 40) {
      this.markedForDeletion = true;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.fillStyle = '#2e1065';
    ctx.strokeStyle = '#c084fc';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#a855f7';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(0, 16);
    ctx.lineTo(18, 2);
    ctx.lineTo(14, -14);
    ctx.lineTo(0, -8);
    ctx.lineTo(-14, -14);
    ctx.lineTo(-18, 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#e879f9';
    ctx.fillRect(-3, -2, 6, 6);
    ctx.restore();
  }
}

// Heavy Bomber (Slow, tanky, fires 3-way spread)
class BomberEnemy extends Enemy {
  constructor(x, y) {
    super(x, y, 26, 140, 500);
    this.vy = 0.8;
    this.shootTimer = 90;
  }

  update(player, bullets, bounds) {
    this.y += this.vy;
    this.shootTimer--;

    if (this.shootTimer <= 0 && this.y < bounds.height * 0.75) {
      this.shootTimer = 110;
      window.soundManager.playEnemyLaser();

      // 3-way spread
      const angles = [Math.PI * 0.4, Math.PI * 0.5, Math.PI * 0.6];
      angles.forEach(ang => {
        bullets.push(new EnemyBullet(this.x, this.y + 16, Math.cos(ang) * 4, Math.sin(ang) * 4, '#fbbf24'));
      });
    }

    if (this.y > bounds.height + 50) {
      this.markedForDeletion = true;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.fillStyle = '#1c1917';
    ctx.strokeStyle = '#f59e0b';
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#f59e0b';
    ctx.lineWidth = 2.2;

    ctx.beginPath();
    ctx.moveTo(0, 24);
    ctx.lineTo(26, -4);
    ctx.lineTo(20, -22);
    ctx.lineTo(0, -14);
    ctx.lineTo(-20, -22);
    ctx.lineTo(-26, -4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Health bar above bomber
    const barW = 34;
    const barH = 4;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(-barW / 2, -32, barW, barH);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(-barW / 2, -32, barW * (this.hp / this.maxHp), barH);

    ctx.restore();
  }
}

// ----------------------------------------------------------------------------
// Dreadnought Titan (Epic Boss)
// ----------------------------------------------------------------------------
class BossEnemy extends Enemy {
  constructor(x, y) {
    super(x, y, 55, 1200, 5000);
    this.targetY = 120;
    this.vx = 2.0;
    this.shootTimer = 60;
    this.phase = 1;
    this.phaseAngle = 0;
    this.beamCharging = false;
    this.beamTimer = 0;
  }

  update(player, bullets, bounds, particleSystem) {
    // Entrance descent
    if (this.y < this.targetY) {
      this.y += 1.2;
    } else {
      // Horizontal patrol
      this.x += this.vx;
      if (this.x < 100 || this.x > bounds.width - 100) {
        this.vx *= -1;
      }
    }

    // Determine phase based on HP
    const hpRatio = this.hp / this.maxHp;
    if (hpRatio < 0.33) {
      this.phase = 3;
    } else if (hpRatio < 0.66) {
      this.phase = 2;
    } else {
      this.phase = 1;
    }

    // Emit damage smoke when injured
    if (hpRatio < 0.5 && Math.random() < 0.35) {
      particleSystem.createExplosion(
        this.x + (Math.random() - 0.5) * 60,
        this.y + (Math.random() - 0.5) * 30,
        3,
        ['#ff4400', '#555555', '#222222'],
        2
      );
    }

    this.shootTimer--;
    if (this.shootTimer <= 0) {
      if (this.phase === 1) {
        this.shootTimer = 45;
        window.soundManager.playEnemyLaser();
        // Alternating wing cannons
        bullets.push(new EnemyBullet(this.x - 45, this.y + 20, 0, 5, '#ef4444'));
        bullets.push(new EnemyBullet(this.x + 45, this.y + 20, 0, 5, '#ef4444'));
      } else if (this.phase === 2) {
        this.shootTimer = 35;
        window.soundManager.playEnemyLaser();
        // Radial star burst
        const count = 8;
        this.phaseAngle += 0.25;
        for (let i = 0; i < count; i++) {
          const ang = this.phaseAngle + (i * Math.PI * 2) / count;
          bullets.push(new EnemyBullet(this.x, this.y + 20, Math.cos(ang) * 4.2, Math.sin(ang) * 4.2, '#ec4899'));
        }
      } else {
        // Phase 3: Enraged bullet rain
        this.shootTimer = 18;
        window.soundManager.playEnemyLaser();
        const spread = (Math.random() - 0.5) * 4;
        bullets.push(new EnemyBullet(this.x - 35, this.y + 25, spread, 5.5, '#ff0055'));
        bullets.push(new EnemyBullet(this.x + 35, this.y + 25, spread, 5.5, '#ff0055'));
        bullets.push(new EnemyBullet(this.x, this.y + 35, (player.x - this.x) * 0.015, 6, '#ffaa00'));
      }
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    ctx.shadowBlur = 18;
    ctx.shadowColor = this.phase === 3 ? '#ff0055' : (this.phase === 2 ? '#ec4899' : '#ef4444');
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = this.phase === 3 ? '#ff0055' : '#ef4444';
    ctx.lineWidth = 3;

    // Boss Hull
    ctx.beginPath();
    ctx.moveTo(0, 48);
    ctx.lineTo(35, 30);
    ctx.lineTo(65, 10);
    ctx.lineTo(55, -25);
    ctx.lineTo(25, -38);
    ctx.lineTo(0, -25);
    ctx.lineTo(-25, -38);
    ctx.lineTo(-55, -25);
    ctx.lineTo(-65, 10);
    ctx.lineTo(-35, 30);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Wing turrets
    ctx.fillStyle = '#334155';
    ctx.fillRect(-50, 15, 10, 22);
    ctx.fillRect(40, 15, 10, 22);

    // Glowing Core Reactor
    const coreGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, 22);
    coreGrad.addColorStop(0, '#ffffff');
    coreGrad.addColorStop(0.5, this.phase === 3 ? '#ff0055' : '#ef4444');
    coreGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

// ----------------------------------------------------------------------------
// Power-Ups
// ----------------------------------------------------------------------------
class PowerUp extends Entity {
  constructor(x, y, type) {
    super(x, y, 16);
    this.type = type; // 'spread', 'rapid', 'plasma', 'shield', 'bomb', 'drone', 'health'
    this.vy = 1.6;
    this.floatTimer = Math.random() * 10;
    this.setupConfig();
  }

  setupConfig() {
    switch (this.type) {
      case 'spread':
        this.label = 'S';
        this.color = '#38bdf8';
        this.name = 'SPREAD WEAPON';
        break;
      case 'rapid':
        this.label = 'R';
        this.color = '#e879f9';
        this.name = 'RAPID FIRE';
        break;
      case 'plasma':
        this.label = 'P';
        this.color = '#f43f5e';
        this.name = 'PLASMA CANNON';
        break;
      case 'shield':
        this.label = '+';
        this.color = '#00f0ff';
        this.name = 'SHIELD RESTORE';
        break;
      case 'bomb':
        this.label = 'B';
        this.color = '#f59e0b';
        this.name = 'EMP BOMB';
        break;
      case 'drone':
        this.label = 'D';
        this.color = '#a855f7';
        this.name = 'WINGMAN DRONE';
        break;
      default:
        this.label = 'H';
        this.color = '#10b981';
        this.name = 'HULL REPAIR';
        break;
    }
  }

  update(bounds) {
    this.floatTimer += 0.05;
    this.y += this.vy;
    this.x += Math.sin(this.floatTimer) * 0.8;

    if (this.y > bounds.height + 30) {
      this.markedForDeletion = true;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Glowing badge orb
    ctx.shadowBlur = 14;
    ctx.shadowColor = this.color;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2.2;

    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Inner icon label
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = this.color;
    ctx.fillText(this.label, 0, 0);

    ctx.restore();
  }
}

window.Player = Player;
window.PlayerLaser = PlayerLaser;
window.PlasmaBall = PlasmaBall;
window.EnemyBullet = EnemyBullet;
window.ScoutEnemy = ScoutEnemy;
window.InterceptorEnemy = InterceptorEnemy;
window.BomberEnemy = BomberEnemy;
window.BossEnemy = BossEnemy;
window.PowerUp = PowerUp;
