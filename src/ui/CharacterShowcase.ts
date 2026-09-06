/**
 * Canvas-based character showcase for the roster overlay.
 *
 * Draws the selected character's Phaser texture at 4× scale with ambient glow, ground shadow,
 * subtle floating motion, and a slow horizontal oscillation that simulates a turntable.
 *
 * Listens for visual-mode changes so the showcase always reflects the active presentation
 * mode — switching between classic and modern art in real time.
 *
 * Supports horizontal drag/scroll to rotate the character manually.
 *
 * The rAF loop is cleaned up on destroy() — the roster opens and closes repeatedly,
 * so a leaked loop drawing to a detached canvas would quietly cost frames.
 */

import { gameEvents } from '../game/core/EventBus';
import { getCharacterPreviewImage } from '../game/characters/preview';
import { getVisualMode } from '../game/core/visualMode';

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

/** Orbiting energy node for the 3D holographic ring effect. */
interface OrbitNode {
  angle: number;
  speed: number;
  radius: number;
  size: number;
  hue: number;
}

export class CharacterShowcase {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private rafId: number | null = null;
  private currentConfig: ShowcaseCharacterConfig | null = null;
  private currentCharacterId: string | null = null;
  private spriteImage: CanvasImageSource | null = null;

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

  // Orbiting energy nodes (3D ring effect)
  private orbitNodes: OrbitNode[] = [];

  // Bound handlers for cleanup
  private boundOnPointerDown: (e: PointerEvent) => void;
  private boundOnPointerMove: (e: PointerEvent) => void;
  private boundOnPointerUp: (e: PointerEvent) => void;
  private boundOnWheel: (e: WheelEvent) => void;

  // Event bus unsubscribers
  private unsubscribers: (() => void)[] = [];

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

    // Listen for visual mode changes to swap the displayed sprite in real time
    this.unsubscribers.push(
      gameEvents.on('visual-mode:changed', () => this.refreshSprite()),
    );
  }

  getElement(): HTMLCanvasElement {
    return this.canvas;
  }

  /**
   * Set the character to display. Uses the preview system which already handles
   * visual mode resolution and fallback cascading.
   */
  setCharacter(characterId: string, _phaserGame?: Phaser.Game): void {
    const config = SHOWCASE_CONFIGS[characterId] ?? SHOWCASE_CONFIGS['dave'];

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
    this.currentCharacterId = characterId;
    this.particles = [];
    this.autoRotation = 0;

    // Initialise orbit nodes for the 3D ring effect
    this.initOrbitNodes(config.accentHue);

    // Resolve the sprite through the unified preview path
    this.refreshSprite();

    // Start the render loop if not already running
    if (this.rafId === null) {
      this.lastFrameTime = performance.now();
      this.loop();
    }
  }

  /** Re-reads the sprite image from the preview system (handles mode changes). */
  private refreshSprite(): void {
    if (!this.currentCharacterId) return;
    const image = getCharacterPreviewImage(this.currentCharacterId, 'idle', getVisualMode());
    if (image) {
      this.spriteImage = image;
    }
  }

  /** Create orbiting energy nodes that form a 3D ring around the character. */
  private initOrbitNodes(accentHue: number): void {
    this.orbitNodes = [];
    const nodeCount = 8;
    for (let i = 0; i < nodeCount; i++) {
      this.orbitNodes.push({
        angle: (Math.PI * 2 * i) / nodeCount,
        speed: 0.6 + Math.random() * 0.4,
        radius: 70 + Math.random() * 20,
        size: 2 + Math.random() * 3,
        hue: accentHue + (Math.random() - 0.5) * 40,
      });
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

    // Update orbit nodes
    for (const node of this.orbitNodes) {
      node.angle += dt * node.speed;
    }

    // Spawn particles occasionally
    if (this.currentConfig && Math.random() < dt * 4) {
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
    const t = this.easeOutCubic(this.transitionProgress);

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
    const sw = (this.spriteImage as HTMLCanvasElement | HTMLImageElement).width * baseScale * Math.abs(perspectiveX) * scaleTransition;
    const sh = (this.spriteImage as HTMLCanvasElement | HTMLImageElement).height * baseScale * scaleTransition;

    const cx = cw / 2;
    const cy = ch * 0.45 + floatY;

    ctx.save();
    ctx.globalAlpha = alpha;

    // --- HOLOGRAPHIC PLATFORM / PEDESTAL ---
    const platY = ch * 0.82;
    this.drawHoloPedestal(ctx, cx, platY, scaleTransition, config);

    // --- 3D ORBIT RING (behind character) ---
    // Draw nodes that are "behind" the character (z < 0)
    this.drawOrbitNodes(ctx, cx, cy, alpha, config, 'behind');

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

    // --- SCAN LINES (classic mode aesthetic) ---
    if (getVisualMode() === 'classic') {
      this.drawScanLines(ctx, cx, cy, sh, alpha);
    }

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

    // Third pass: coloured edge-light for "3D lighting" effect
    ctx.globalAlpha = 0.08;
    ctx.shadowColor = config.glowColor.replace('0.35', '0.8');
    ctx.shadowBlur = 60;
    ctx.shadowOffsetX = facingRight ? -6 : 6;
    ctx.drawImage(
      this.spriteImage,
      -sw / 2, -sh / 2,
      sw, sh
    );
    ctx.restore();

    // --- 3D ORBIT RING (in front of character) ---
    this.drawOrbitNodes(ctx, cx, cy, alpha, config, 'front');

    // --- HEX GRID OVERLAY (subtle) ---
    this.drawHexGridOverlay(ctx, cx, cy, alpha);

    ctx.restore();
  }

  /** Draws a holographic pedestal ellipse beneath the character. */
  private drawHoloPedestal(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number,
    scale: number,
    config: ShowcaseCharacterConfig,
  ): void {
    // Pulsing outer ring
    const pulse = 0.8 + Math.sin(this.time * 2) * 0.2;

    // Outer glow ellipse
    ctx.save();
    ctx.globalAlpha = 0.15 * pulse;
    ctx.strokeStyle = config.glowColor.replace('0.35', '1');
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 80 * scale, 16 * scale, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Inner bright ellipse
    ctx.save();
    ctx.globalAlpha = 0.25 * pulse;
    ctx.strokeStyle = config.glowColor.replace('0.35', '1');
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 60 * scale, 12 * scale, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Filled translucent base
    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = config.glowColor.replace('0.35', '1');
    ctx.beginPath();
    ctx.ellipse(cx, cy, 80 * scale, 16 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** Draws the orbiting energy nodes — either the ones behind or in front of the character. */
  private drawOrbitNodes(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number,
    alpha: number,
    _config: ShowcaseCharacterConfig,
    layer: 'behind' | 'front',
  ): void {
    for (const node of this.orbitNodes) {
      const nx = cx + Math.cos(node.angle) * node.radius;
      const nz = Math.sin(node.angle); // z-depth: negative = behind, positive = in front
      const ny = cy + nz * 30; // vertical offset to simulate orbit tilt

      const isBehind = nz < 0;
      if ((layer === 'behind' && !isBehind) || (layer === 'front' && isBehind)) continue;

      const depthAlpha = layer === 'behind' ? 0.3 : 0.7;
      const depthSize = layer === 'behind' ? 0.6 : 1.0;

      ctx.save();
      ctx.globalAlpha = alpha * depthAlpha;
      ctx.fillStyle = `hsla(${node.hue}, 80%, 65%, 1)`;
      ctx.shadowColor = `hsla(${node.hue}, 90%, 60%, 0.8)`;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(nx, ny, node.size * depthSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  /** Draws a subtle hexagonal grid overlay for a sci-fi holographic feel. */
  private drawHexGridOverlay(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number,
    alpha: number,
  ): void {
    const hexSize = 20;
    const rows = 4;
    const cols = 5;

    ctx.save();
    ctx.globalAlpha = alpha * 0.04;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.5;

    for (let r = -rows; r <= rows; r++) {
      for (let c = -cols; c <= cols; c++) {
        const hx = cx + c * hexSize * 1.75 + (r % 2 === 0 ? 0 : hexSize * 0.875);
        const hy = cy + r * hexSize * 1.5;
        const dist = Math.sqrt((hx - cx) ** 2 + (hy - cy) ** 2);
        if (dist > 120) continue; // Only draw near the character

        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i - Math.PI / 6;
          const px = hx + hexSize * 0.6 * Math.cos(angle);
          const py = hy + hexSize * 0.6 * Math.sin(angle);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  /** Draws retro scan-line bars for classic mode. */
  private drawScanLines(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number,
    spriteHeight: number,
    alpha: number,
  ): void {
    ctx.save();
    ctx.globalAlpha = alpha * 0.06;
    ctx.fillStyle = '#000000';
    const top = cy - spriteHeight / 2 - 20;
    const bottom = cy + spriteHeight / 2 + 20;
    for (let y = top; y < bottom; y += 4) {
      ctx.fillRect(cx - 80, y, 160, 1);
    }
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

    for (const unsub of this.unsubscribers) unsub();
    this.unsubscribers = [];

    this.particles = [];
    this.orbitNodes = [];
    this.spriteImage = null;
    this.currentConfig = null;
    this.currentCharacterId = null;
  }
}
