// ============================================================================
// Particle System, Starfield & Visual FX
// ============================================================================

class Starfield {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.layers = [
      { count: 70, speed: 0.4, size: 1.0, color: 'rgba(180, 200, 255, 0.4)', stars: [] },
      { count: 45, speed: 1.2, size: 1.8, color: 'rgba(210, 230, 255, 0.75)', stars: [] },
      { count: 25, speed: 2.8, size: 2.5, color: 'rgba(255, 255, 255, 1.0)', stars: [] }
    ];
    this.nebulae = [];
    this.warpMultiplier = 1;
    this.init();
  }

  resize(w, h) {
    this.width = w;
    this.height = h;
    this.init();
  }

  init() {
    this.layers.forEach(layer => {
      layer.stars = [];
      for (let i = 0; i < layer.count; i++) {
        layer.stars.push({
          x: Math.random() * this.width,
          y: Math.random() * this.height,
          twinkleOffset: Math.random() * Math.PI * 2,
          twinkleSpeed: 0.02 + Math.random() * 0.04
        });
      }
    });

    // 4 Drifting glowing nebulae
    this.nebulae = [
      { x: this.width * 0.2, y: this.height * 0.2, radius: 260, color: 'rgba(75, 0, 130, 0.12)', vy: 0.15 },
      { x: this.width * 0.8, y: this.height * 0.6, radius: 320, color: 'rgba(0, 140, 255, 0.09)', vy: 0.18 },
      { x: this.width * 0.4, y: this.height * 0.85, radius: 280, color: 'rgba(255, 0, 128, 0.08)', vy: 0.12 },
      { x: this.width * 0.7, y: -100, radius: 290, color: 'rgba(0, 255, 200, 0.07)', vy: 0.14 }
    ];
  }

  update(time) {
    // Nebulae drift
    this.nebulae.forEach(neb => {
      neb.y += neb.vy * this.warpMultiplier;
      if (neb.y - neb.radius > this.height) {
        neb.y = -neb.radius;
        neb.x = Math.random() * this.width;
      }
    });

    // Stars drift
    this.layers.forEach(layer => {
      const speed = layer.speed * this.warpMultiplier;
      layer.stars.forEach(star => {
        star.y += speed;
        star.twinkleOffset += star.twinkleSpeed;
        if (star.y > this.height) {
          star.y = 0;
          star.x = Math.random() * this.width;
        }
      });
    });
  }

  draw(ctx, time) {
    // Draw Nebulae
    this.nebulae.forEach(neb => {
      const grad = ctx.createRadialGradient(neb.x, neb.y, 10, neb.x, neb.y, neb.radius);
      grad.addColorStop(0, neb.color);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(neb.x, neb.y, neb.radius, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw Star layers
    this.layers.forEach(layer => {
      ctx.fillStyle = layer.color;
      layer.stars.forEach(star => {
        const twinkle = 0.65 + 0.35 * Math.sin(star.twinkleOffset);
        ctx.globalAlpha = twinkle;
        
        if (this.warpMultiplier > 2) {
          // Draw warp streak lines
          ctx.strokeStyle = layer.color;
          ctx.lineWidth = layer.size;
          ctx.beginPath();
          ctx.moveTo(star.x, star.y);
          ctx.lineTo(star.x, star.y + layer.speed * this.warpMultiplier * 3);
          ctx.stroke();
        } else {
          ctx.fillRect(star.x, star.y, layer.size, layer.size);
        }
      });
    });
    ctx.globalAlpha = 1.0;
  }
}

// Particle System
class ParticleSystem {
  constructor() {
    this.particles = [];
    this.shockwaves = [];
    this.floatingTexts = [];
    this.shakeIntensity = 0;
    this.shakeDuration = 0;
    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;
  }

  triggerScreenShake(intensity = 8, durationMs = 250) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeDuration = durationMs;
  }

  // Create explosion burst
  createExplosion(x, y, count = 25, colorPalette = ['#ff3366', '#ffaa00', '#ffff55', '#ffffff'], speedMax = 5) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (0.5 + Math.random() * speedMax) * (Math.random() < 0.2 ? 1.5 : 1);
      const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      const life = 20 + Math.random() * 30; // frames
      const size = 2 + Math.random() * 3.5;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        drag: 0.94,
        size,
        color,
        life,
        maxLife: life,
        glow: true
      });
    }

    // Add a shockwave ring
    this.shockwaves.push({
      x,
      y,
      radius: 4,
      maxRadius: count > 30 ? 65 : 35,
      growth: count > 30 ? 3.5 : 2.5,
      color: colorPalette[0],
      alpha: 0.9,
      lineWidth: 3
    });
  }

  // Engine exhaust trail particle
  createEngineParticle(x, y, vx = 0, vy = 3, color = '#00f0ff') {
    this.particles.push({
      x: x + (Math.random() - 0.5) * 4,
      y,
      vx: vx + (Math.random() - 0.5) * 0.8,
      vy: vy + Math.random() * 2,
      drag: 0.96,
      size: 2 + Math.random() * 2,
      color,
      life: 14 + Math.random() * 10,
      maxLife: 24,
      glow: false
    });
  }

  // Floating combat text (+100, CRITICAL, etc.)
  addFloatingText(text, x, y, color = '#00ffff', size = 16) {
    this.floatingTexts.push({
      text,
      x,
      y,
      color,
      size,
      alpha: 1.0,
      vy: -1.2,
      life: 45,
      maxLife: 45
    });
  }

  update(dt = 1) {
    // Screen shake update
    if (this.shakeDuration > 0) {
      this.shakeDuration -= dt * 16.6;
      this.shakeOffsetX = (Math.random() - 0.5) * this.shakeIntensity * 2;
      this.shakeOffsetY = (Math.random() - 0.5) * this.shakeIntensity * 2;
      this.shakeIntensity *= 0.92;
    } else {
      this.shakeOffsetX = 0;
      this.shakeOffsetY = 0;
      this.shakeIntensity = 0;
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Update shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.radius += sw.growth;
      sw.alpha = Math.max(0, 1 - (sw.radius / sw.maxRadius));
      if (sw.radius >= sw.maxRadius) {
        this.shockwaves.splice(i, 1);
      }
    }

    // Update floating texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy;
      ft.life -= dt;
      ft.alpha = ft.life / ft.maxLife;
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    ctx.save();

    // Shockwaves
    this.shockwaves.forEach(sw => {
      ctx.save();
      ctx.globalAlpha = sw.alpha;
      ctx.strokeStyle = sw.color;
      ctx.lineWidth = sw.lineWidth;
      ctx.shadowBlur = 10;
      ctx.shadowColor = sw.color;
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });

    // Particles
    this.particles.forEach(p => {
      const progress = p.life / p.maxLife;
      ctx.globalAlpha = Math.max(0, progress);
      ctx.fillStyle = p.color;
      if (p.glow) {
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
      }
      const currentSize = p.size * (0.3 + 0.7 * progress);
      ctx.beginPath();
      ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
      ctx.fill();
    });

    // Floating text
    this.floatingTexts.forEach(ft => {
      ctx.save();
      ctx.globalAlpha = ft.alpha;
      ctx.font = `bold ${ft.size}px 'Courier New', monospace`;
      ctx.textAlign = 'center';
      ctx.fillStyle = ft.color;
      ctx.shadowBlur = 6;
      ctx.shadowColor = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    });

    ctx.restore();
  }
}

window.Starfield = Starfield;
window.ParticleSystem = ParticleSystem;
