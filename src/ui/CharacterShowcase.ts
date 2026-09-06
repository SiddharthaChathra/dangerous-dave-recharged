/**
 * Canvas-based character showcase for the roster overlay.
 *
 * Draws the selected character's Phaser texture at 4× scale with ambient glow, ground shadow,
 * subtle floating motion, and a slow horizontal oscillation that simulates a turntable.
 *
 * Supports horizontal drag/scroll to rotate the character manually.
 *
 * The rAF loop is cleaned up on destroy() — the roster opens and closes repeatedly,
 * so a leaked loop drawing to a detached canvas would quietly cost frames.
 */

/** Per-character visual config for the showcase. */
export interface ShowcaseCharacterConfig {
  texturePrefix: string;
  name: string;
  blurb: string;
  glowColor: string;   // CSS color for the ambient glow
  accentHue: number;    // 0–360 hue for particle tinting
}

/** Registry mapping character ids to their showcase visuals. */
export const SHOWCASE_CONFIGS: Record<string, ShowcaseCharacterConfig> = {
  dave: {
    texturePrefix: 'player',
    name: 'Dangerous Dave',
    blurb: 'The original treasure hunter. Veteran of a hundred pixel-perfect jumps.',
    glowColor: 'rgba(0, 240, 255, 0.35)',
    accentHue: 185,
  },
  delta: {
    texturePrefix: 'char_delta',
    name: 'Delta',
    blurb: 'Foundry engineer. Built to withstand the heat of the Industrial Ruins.',
    glowColor: 'rgba(251, 146, 60, 0.35)',
    accentHue: 28,
  },
  nova: {
    texturePrefix: 'char_nova',
    name: 'Nova',
    blurb: 'Cavern diver. Her suit glows bright enough to navigate the Neon Caverns.',
    glowColor: 'rgba(192, 132, 252, 0.35)',
    accentHue: 270,
  },
  rex: {
    texturePrefix: 'char_rex',
    name: 'Rex',
    blurb: 'Sky-fortress veteran. Cybernetic enhancements from years above the clouds.',
    glowColor: 'rgba(45, 212, 191, 0.35)',
    accentHue: 168,
  },
};

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
}

export class CharacterShowcase {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private rafId: number | null = null;
  private currentConfig: ShowcaseCharacterConfig | null = null;
  private spriteImage: HTMLCanvasElement | HTMLImageElement | null = null;

  // Animation state
  private time = 0;
  private autoRotation = 0;     // auto-rotation angle (radians)
  private dragOffset = 0;       // accumulated drag rotation (radians)
  private isDragging = false;
  private lastDragX = 0;

  // Transition state
  private transitionProgress = 1; // 0→1, where 1 = fully visible
  private transitionDirection: 'in' | 'out' = 'in';

  // Particles
  private particles: Particle[] = [];

  // Bound handlers for cleanup
  private boundOnPointerDown: (e: PointerEvent) => void;
  private boundOnPointerMove: (e: PointerEvent) => void;
  private boundOnPointerUp: (e: PointerEvent) => void;
  private boundOnWheel: (e: WheelEvent) => void;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'showcase-canvas';
    this.canvas.width = 400;
    this.canvas.height = 400;
    this.ctx = this.canvas.getContext('2d');

    this.boundOnPointerDown = this.onPointerDown.bind(this);
    this.boundOnPointerMove = this.onPointerMove.bind(this);
    this.boundOnPointerUp = this.onPointerUp.bind(this);
    this.boundOnWheel = this.onWheel.bind(this);

    this.canvas.addEventListener('pointerdown', this.boundOnPointerDown);
    window.addEventListener('pointermove', this.boundOnPointerMove);
    window.addEventListener('pointerup', this.boundOnPointerUp);
    this.canvas.addEventListener('wheel', this.boundOnWheel, { passive: false });

    this.canvas.style.cursor = 'grab';
    this.canvas.style.touchAction = 'none'; // prevent scroll on touch
  }

  getElement(): HTMLCanvasElement {
    return this.canvas;
  }

  /**
   * Set the character to display. Extracts the sprite texture from Phaser's texture manager.
   * Pass the Phaser game instance to access textures.
   */
  setCharacter(characterId: string, phaserGame: Phaser.Game): void {
    const config = SHOWCASE_CONFIGS[characterId] ?? SHOWCASE_CONFIGS['dave'];
    const textureKey = `${config.texturePrefix}_idle`;

    // Extract the texture canvas from Phaser
    const tex = phaserGame.textures.get(textureKey);
    if (tex && tex.key !== '__MISSING') {
      const source = tex.getSourceImage();
      this.spriteImage = source as HTMLCanvasElement | HTMLImageElement;
    } else {
      // Fallback to Dave
      const fallback = phaserGame.textures.get('player_idle');
      if (fallback && fallback.key !== '__MISSING') {
        this.spriteImage = fallback.getSourceImage() as HTMLCanvasElement | HTMLImageElement;
      }
    }

    // Trigger transition
    if (this.currentConfig) {
      // Already showing a character — transition out then in
      this.transitionDirection = 'out';
      this.transitionProgress = 1;
    } else {
      this.transitionDirection = 'in';
      this.transitionProgress = 0;
    }

    this.currentConfig = config;
    this.particles = [];
    this.autoRotation = 0;

    // Start the render loop if not already running
    if (this.rafId === null) {
      this.lastFrameTime = performance.now();
      this.loop();
    }
  }

  private lastFrameTime = 0;

  private loop = (): void => {
    const now = performance.now();
    const dt = Math.min((now - this.lastFrameTime) / 1000, 0.05); // cap at 50ms
    this.lastFrameTime = now;

    this.time += dt;
    this.update(dt);
    this.render();

    this.rafId = requestAnimationFrame(this.loop);
  };

  private update(dt: number): void {
    // Auto-rotation (slow, continuous)
    if (!this.isDragging) {
      this.autoRotation += dt * 0.5; // ~0.5 rad/s ≈ full rotation every ~12.5s
    }

    // Transition progress
    if (this.transitionDirection === 'in' && this.transitionProgress < 1) {
      this.transitionProgress = Math.min(1, this.transitionProgress + dt * 3);
    } else if (this.transitionDirection === 'out' && this.transitionProgress > 0) {
      this.transitionProgress = Math.max(0, this.transitionProgress - dt * 4);
      if (this.transitionProgress <= 0) {
        // Switch to 'in'
        this.transitionDirection = 'in';
      }
    }

    // Spawn particles occasionally
    if (this.currentConfig && Math.random() < dt * 3) {
      this.particles.push({
        x: this.canvas.width / 2 + (Math.random() - 0.5) * 120,
        y: this.canvas.height * 0.75 + Math.random() * 30,
        vx: (Math.random() - 0.5) * 15,
        vy: -10 - Math.random() * 25,
        life: 0,
        maxLife: 1.5 + Math.random() * 1.5,
        size: 1.5 + Math.random() * 2.5,
        hue: this.currentConfig.accentHue + (Math.random() - 0.5) * 30,
      });
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }
  }

  private render(): void {
    const { ctx, canvas } = this;
    if (!ctx) return;

    const cw = canvas.width;
    const ch = canvas.height;

    ctx.clearRect(0, 0, cw, ch);

    if (!this.currentConfig || !this.spriteImage) return;

    const config = this.currentConfig;

    // Eased transition: smooth cubic
    const t = this.transitionDirection === 'in'
      ? this.easeOutCubic(this.transitionProgress)
      : this.easeOutCubic(this.transitionProgress);

    const alpha = t;
    const scaleTransition = 0.8 + 0.2 * t;

    // Floating motion
    const floatY = Math.sin(this.time * 1.2) * 6;

    // Total rotation angle (auto + drag)
    const totalRotation = this.autoRotation + this.dragOffset;

    // Simulated 3D: use sin(rotation) to scale X (perspective foreshortening)
    const perspectiveX = Math.cos(totalRotation);
    const facingRight = Math.sin(totalRotation) > 0;

    // Character scale
    const baseScale = 4;
    const sw = this.spriteImage.width * baseScale * Math.abs(perspectiveX) * scaleTransition;
    const sh = this.spriteImage.height * baseScale * scaleTransition;

    const cx = cw / 2;
    const cy = ch * 0.45 + floatY;

    ctx.save();
    ctx.globalAlpha = alpha;

    // Ground shadow (ellipse)
    const shadowY = ch * 0.82;
    ctx.save();
    ctx.globalAlpha = alpha * 0.3;
    ctx.beginPath();
    ctx.ellipse(cx, shadowY, 60 * scaleTransition, 10, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fill();
    ctx.restore();

    // Ambient glow behind character
    ctx.save();
    ctx.globalAlpha = alpha * 0.5;
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 140);
    glow.addColorStop(0, config.glowColor);
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, 140, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Particles (behind character)
    for (const p of this.particles) {
      const pa = 1 - p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = pa * alpha * 0.6;
      ctx.fillStyle = `hsla(${p.hue}, 80%, 65%, 1)`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * pa, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Draw the character sprite
    ctx.save();
    ctx.translate(cx, cy);
    // Flip horizontally when facing the other way
    if (facingRight) {
      ctx.scale(-1, 1);
    }
    // Light rim effect: slight shadow on the character
    ctx.shadowColor = config.glowColor;
    ctx.shadowBlur = 25;
    ctx.drawImage(
      this.spriteImage,
      -sw / 2, -sh / 2,
      sw, sh
    );
    // Second pass for bloom
    ctx.globalAlpha = 0.15;
    ctx.shadowBlur = 40;
    ctx.drawImage(
      this.spriteImage,
      -sw / 2, -sh / 2,
      sw, sh
    );
    ctx.restore();

    ctx.restore();
  }

  private easeOutCubic(x: number): number {
    return 1 - Math.pow(1 - x, 3);
  }

  // --- Pointer interaction ---

  private onPointerDown(e: PointerEvent): void {
    this.isDragging = true;
    this.lastDragX = e.clientX;
    this.canvas.style.cursor = 'grabbing';
    this.canvas.setPointerCapture(e.pointerId);
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.isDragging) return;
    const dx = e.clientX - this.lastDragX;
    this.dragOffset += dx * 0.01; // sensitivity
    this.lastDragX = e.clientX;
  }

  private onPointerUp(e: PointerEvent): void {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.canvas.style.cursor = 'grab';
    this.canvas.releasePointerCapture(e.pointerId);
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    this.dragOffset += e.deltaX * 0.005;
    // Also support vertical scroll as rotation if no horizontal delta
    if (Math.abs(e.deltaX) < 1) {
      this.dragOffset += e.deltaY * 0.005;
    }
  }

  /** Resize canvas to match container (call on layout change). */
  resize(width: number, height: number): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    if (this.ctx) {
      this.ctx.scale(dpr, dpr);
    }
  }

  /** Must be called when the roster closes. Cancels the rAF loop and removes listeners. */
  destroy(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.canvas.removeEventListener('pointerdown', this.boundOnPointerDown);
    window.removeEventListener('pointermove', this.boundOnPointerMove);
    window.removeEventListener('pointerup', this.boundOnPointerUp);
    this.canvas.removeEventListener('wheel', this.boundOnWheel);
    this.particles = [];
    this.spriteImage = null;
    this.currentConfig = null;
  }
}
