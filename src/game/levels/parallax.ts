import Phaser from 'phaser';

/**
 * Layered environment renderer.
 *
 * Every layer is a screen-fixed TileSprite whose `tilePosition` is driven from the camera
 * each frame. That gives genuinely infinite, wrapping parallax (the previous implementation
 * used fixed-width rectangles, which meant the background was static and ran out), and it
 * costs a handful of draw calls regardless of level length.
 *
 * Each palette also defines its own sky gradient, silhouette shapes, ambient particles and
 * foreground band, so every level reads as a distinct place rather than a recoloured one.
 */
export interface ParallaxController {
  /** Drives layer scroll + any animated elements. Call once per frame from the scene. */
  update(camera: Phaser.Cameras.Scene2D.Camera, dtMs: number): void;
  destroy(): void;
}

type LayerKind = 'mountains' | 'city' | 'peaks' | 'clouds' | 'cave';
type AmbientKind = 'dust' | 'ember' | 'snow' | 'spark' | 'rain';

interface LayerSpec {
  kind: LayerKind;
  /** Base silhouette colour. */
  color: number;
  /** Optional accent used for windows / highlights / rims. */
  accent?: number;
  alpha: number;
  /** Horizontal parallax factor: 0 = pinned to screen, 1 = moves with the world. */
  scroll: number;
  /** Layer height in pixels. */
  height: number;
  /** Distance from the bottom of the viewport. */
  bottomOffset: number;
  /** Slow autonomous drift (px/sec) — used to keep clouds/haze alive when standing still. */
  drift?: number;
}

interface PaletteSpec {
  skyTop: number;
  skyMid: number;
  skyBottom: number;
  /** Optional glow disc (sun / moon / reactor) pinned high in the sky. */
  glow?: { color: number; radius: number; x: number; y: number; alpha: number };
  layers: LayerSpec[];
  ambient: { kind: AmbientKind; tint: number[]; frequency: number; alpha: number };
  /** Dark out-of-focus band drawn in front of gameplay for depth. */
  foreground?: { color: number; alpha: number; scroll: number; height: number };
}

const PALETTES: Record<string, PaletteSpec> = {
  training: {
    skyTop: 0x080d18,
    skyMid: 0x1b2b45,
    skyBottom: 0x46618a,
    glow: { color: 0x9fc7ff, radius: 120, x: 0.72, y: 0.24, alpha: 0.16 },
    layers: [
      { kind: 'mountains', color: 0x16233a, alpha: 0.9, scroll: 0.06, height: 200, bottomOffset: 195 },
      { kind: 'mountains', color: 0x203352, alpha: 0.9, scroll: 0.16, height: 170, bottomOffset: 155 },
      { kind: 'city', color: 0x1c2f47, accent: 0x6fa8d0, alpha: 0.6, scroll: 0.34, height: 150, bottomOffset: 115 },
    ],
    ambient: { kind: 'dust', tint: [0xbcd7ff, 0xffffff], frequency: 320, alpha: 0.35 },
    foreground: { color: 0x060a12, alpha: 0.85, scroll: 1.35, height: 70 },
  },
  industrial: {
    skyTop: 0x120c08,
    skyMid: 0x2c1c12,
    skyBottom: 0x6b452a,
    glow: { color: 0xffa552, radius: 150, x: 0.3, y: 0.3, alpha: 0.18 },
    layers: [
      { kind: 'city', color: 0x1b1410, accent: 0xff9d4d, alpha: 0.9, scroll: 0.07, height: 210, bottomOffset: 195 },
      { kind: 'city', color: 0x2a1f18, accent: 0xffb46b, alpha: 0.9, scroll: 0.18, height: 180, bottomOffset: 150 },
      { kind: 'city', color: 0x2b2018, accent: 0xd9a06b, alpha: 0.6, scroll: 0.36, height: 150, bottomOffset: 110 },
    ],
    ambient: { kind: 'ember', tint: [0xff9d4d, 0xffd08a], frequency: 220, alpha: 0.6 },
    foreground: { color: 0x0a0705, alpha: 0.9, scroll: 1.4, height: 80 },
  },
  neon: {
    skyTop: 0x07031a,
    skyMid: 0x1b0942,
    skyBottom: 0x3d1170,
    glow: { color: 0xb14dff, radius: 170, x: 0.55, y: 0.22, alpha: 0.22 },
    layers: [
      { kind: 'cave', color: 0x140833, alpha: 0.95, scroll: 0.05, height: 220, bottomOffset: 205 },
      { kind: 'city', color: 0x1f0d4d, accent: 0x35f0ff, alpha: 0.9, scroll: 0.2, height: 190, bottomOffset: 150 },
      { kind: 'city', color: 0x1f0d4a, accent: 0xc23da6, alpha: 0.6, scroll: 0.4, height: 150, bottomOffset: 105 },
    ],
    ambient: { kind: 'spark', tint: [0x35f0ff, 0xff4fd8, 0xb14dff], frequency: 200, alpha: 0.7 },
    foreground: { color: 0x05020f, alpha: 0.9, scroll: 1.45, height: 80 },
  },
  sky: {
    skyTop: 0x0a3a66,
    skyMid: 0x2f80c4,
    skyBottom: 0xa8dcf5,
    glow: { color: 0xffffff, radius: 140, x: 0.66, y: 0.2, alpha: 0.3 },
    layers: [
      { kind: 'clouds', color: 0xdcefff, alpha: 0.5, scroll: 0.05, height: 190, bottomOffset: 255, drift: 5 },
      { kind: 'peaks', color: 0x5f9fd0, alpha: 0.75, scroll: 0.16, height: 200, bottomOffset: 165 },
      { kind: 'clouds', color: 0xffffff, alpha: 0.45, scroll: 0.38, height: 150, bottomOffset: 105, drift: 12 },
    ],
    ambient: { kind: 'snow', tint: [0xffffff, 0xd8f0ff], frequency: 260, alpha: 0.55 },
    foreground: { color: 0x0d2b47, alpha: 0.75, scroll: 1.35, height: 70 },
  },
  final: {
    skyTop: 0x150202,
    skyMid: 0x3d0808,
    skyBottom: 0x8a1a10,
    glow: { color: 0xff5a2a, radius: 190, x: 0.5, y: 0.28, alpha: 0.28 },
    layers: [
      { kind: 'peaks', color: 0x1c0505, alpha: 0.95, scroll: 0.06, height: 230, bottomOffset: 200 },
      { kind: 'peaks', color: 0x2b0808, alpha: 0.95, scroll: 0.18, height: 195, bottomOffset: 150 },
      { kind: 'cave', color: 0x2c0807, accent: 0xc2502c, alpha: 0.65, scroll: 0.38, height: 160, bottomOffset: 105 },
    ],
    ambient: { kind: 'ember', tint: [0xff4d2a, 0xff9d4d, 0xffd08a], frequency: 130, alpha: 0.8 },
    foreground: { color: 0x0b0202, alpha: 0.92, scroll: 1.45, height: 85 },
  },
};

const TILE_W = 512;

/** Deterministic per-key RNG so a layer's silhouette is stable across restarts. */
function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function ensureLayerTexture(scene: Phaser.Scene, key: string, spec: LayerSpec, seed: number): void {
  if (scene.textures.exists(key)) return;
  const h = spec.height;
  const canvas = scene.textures.createCanvas(key, TILE_W, h);
  if (!canvas) return;
  const ctx = canvas.getContext();
  const base = Phaser.Display.Color.IntegerToColor(spec.color);
  const fill = `rgb(${base.red}, ${base.green}, ${base.blue})`;
  const rng = makeRng(seed);
  ctx.clearRect(0, 0, TILE_W, h);
  ctx.fillStyle = fill;

  const accent = spec.accent !== undefined ? Phaser.Display.Color.IntegerToColor(spec.accent) : null;

  if (spec.kind === 'mountains' || spec.kind === 'peaks') {
    const sharp = spec.kind === 'peaks';
    // Draw a continuous ridge line; the first and last points share a height so the tile
    // repeats seamlessly.
    const points: Array<[number, number]> = [];
    const steps = sharp ? 10 : 7;
    const edgeY = h * (sharp ? 0.55 : 0.62);
    for (let i = 0; i <= steps; i++) {
      const x = (TILE_W / steps) * i;
      const isEdge = i === 0 || i === steps;
      const peak = sharp ? h * (0.1 + rng() * 0.35) : h * (0.3 + rng() * 0.3);
      points.push([x, isEdge ? edgeY : peak]);
    }
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (const [x, y] of points) ctx.lineTo(x, y);
    ctx.lineTo(TILE_W, h);
    ctx.closePath();
    ctx.fill();
    // Rim light along the ridge for readable silhouettes.
    ctx.strokeStyle = `rgba(255,255,255,0.10)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (const [x, y] of points.slice(1)) ctx.lineTo(x, y);
    ctx.stroke();
  } else if (spec.kind === 'city') {
    let x = 0;
    while (x < TILE_W) {
      const w = 26 + rng() * 46;
      const bh = h * (0.35 + rng() * 0.6);
      const y = h - bh;
      ctx.fillStyle = fill;
      ctx.fillRect(x, y, w, bh);
      // Rooftop highlight
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      ctx.fillRect(x, y, w, 2);
      // Lit windows
      if (accent) {
        const cols = Math.max(1, Math.floor(w / 12));
        const rows = Math.max(1, Math.floor(bh / 16));
        for (let c = 0; c < cols; c++) {
          for (let r = 0; r < rows; r++) {
            if (rng() > 0.62) {
              ctx.fillStyle = `rgba(${accent.red}, ${accent.green}, ${accent.blue}, ${0.25 + rng() * 0.5})`;
              ctx.fillRect(x + 5 + c * 12, y + 8 + r * 16, 4, 6);
            }
          }
        }
      }
      x += w + 8 + rng() * 20;
    }
  } else if (spec.kind === 'cave') {
    // Stalactites hanging from the top plus a rough floor ridge.
    ctx.beginPath();
    ctx.moveTo(0, 0);
    let x = 0;
    while (x < TILE_W) {
      const w = 30 + rng() * 50;
      const drop = h * (0.2 + rng() * 0.45);
      ctx.lineTo(x + w / 2, drop);
      ctx.lineTo(x + w, 0);
      x += w;
    }
    ctx.lineTo(TILE_W, 0);
    ctx.closePath();
    ctx.fill();
    if (accent) {
      ctx.strokeStyle = `rgba(${accent.red}, ${accent.green}, ${accent.blue}, 0.18)`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  } else if (spec.kind === 'clouds') {
    // Soft overlapping discs. Each is drawn three times — one tile left, in place, and
    // one tile right — so a disc straddling an edge continues into the neighbouring
    // repeat instead of being clipped into a hard vertical seam.
    for (let i = 0; i < 14; i++) {
      const cx = rng() * TILE_W;
      const r = 26 + rng() * 46;
      // Keep the disc fully inside the strip vertically, for the same reason.
      const cy = Phaser.Math.Clamp(h * (0.35 + rng() * 0.45), r, h - r);
      for (const ox of [-TILE_W, 0, TILE_W]) {
        const x0 = cx + ox;
        const grad = ctx.createRadialGradient(x0, cy, r * 0.2, x0, cy, r);
        grad.addColorStop(0, `rgba(${base.red}, ${base.green}, ${base.blue}, 0.85)`);
        grad.addColorStop(1, `rgba(${base.red}, ${base.green}, ${base.blue}, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x0, cy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  canvas.refresh();
}

/** A soft radial dot used for ambient motes; generated once and shared. */
function ensureMoteTexture(scene: Phaser.Scene): string {
  const key = 'ddr_mote';
  if (scene.textures.exists(key)) return key;
  const size = 24;
  const canvas = scene.textures.createCanvas(key, size, size);
  if (!canvas) return key;
  const ctx = canvas.getContext();
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  canvas.refresh();
  return key;
}

/**
 * Builds the full environment for a palette. Returns a controller the scene drives each
 * frame; the caller owns its lifetime.
 */
export function buildParallaxLayers(
  scene: Phaser.Scene,
  palette: string,
  _levelWidthPx: number,
  _levelHeightPx: number,
): ParallaxController {
  const spec = PALETTES[palette] ?? PALETTES.training;
  const viewW = scene.scale.width;
  const viewH = scene.scale.height;
  const created: Phaser.GameObjects.GameObject[] = [];

  // --- Sky gradient (screen-fixed, furthest back) ---
  const sky = scene.add.graphics().setScrollFactor(0).setDepth(-200);
  sky.fillGradientStyle(spec.skyTop, spec.skyTop, spec.skyMid, spec.skyMid, 1);
  sky.fillRect(0, 0, viewW, viewH * 0.6);
  sky.fillGradientStyle(spec.skyMid, spec.skyMid, spec.skyBottom, spec.skyBottom, 1);
  sky.fillRect(0, viewH * 0.6 - 1, viewW, viewH * 0.4 + 1);
  created.push(sky);

  const moteKey = ensureMoteTexture(scene);

  // --- Celestial / reactor glow ---
  if (spec.glow) {
    const glow = scene.add
      .image(viewW * spec.glow.x, viewH * spec.glow.y, moteKey)
      .setScrollFactor(0)
      .setDepth(-199)
      .setTint(spec.glow.color)
      .setAlpha(spec.glow.alpha)
      .setBlendMode(Phaser.BlendModes.ADD);
    glow.setDisplaySize(spec.glow.radius * 2, spec.glow.radius * 2);
    scene.tweens.add({
      targets: glow,
      alpha: spec.glow.alpha * 1.45,
      duration: 3800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    created.push(glow);
  }

  // --- Silhouette layers ---
  const tiles: Array<{ tile: Phaser.GameObjects.TileSprite; spec: LayerSpec }> = [];
  spec.layers.forEach((layerSpec, i) => {
    const key = `ddr_par_${palette}_${i}`;
    ensureLayerTexture(scene, key, layerSpec, (palette.charCodeAt(0) + i * 977) * 7919);
    const tile = scene.add
      .tileSprite(0, viewH - layerSpec.height - layerSpec.bottomOffset, viewW, layerSpec.height, key)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(-190 + i)
      .setAlpha(layerSpec.alpha);
    tiles.push({ tile, spec: layerSpec });
    created.push(tile);
  });

  // --- Ambient particles (per-level atmosphere) ---
  const ambient = spec.ambient;
  const emitterConfig: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig = {
    x: { min: -40, max: viewW + 40 },
    y: ambient.kind === 'ember' ? { min: viewH * 0.65, max: viewH + 20 } : { min: -20, max: viewH },
    lifespan: ambient.kind === 'rain' ? 1400 : { min: 4200, max: 9000 },
    quantity: 1,
    frequency: ambient.frequency,
    tint: ambient.tint,
    alpha: { start: ambient.alpha, end: 0 },
    blendMode: Phaser.BlendModes.ADD,
    scale:
      ambient.kind === 'snow'
        ? { min: 0.14, max: 0.3 }
        : ambient.kind === 'ember'
          ? { start: 0.22, end: 0 }
          : { min: 0.08, max: 0.2 },
    speedY:
      ambient.kind === 'ember'
        ? { min: -46, max: -14 }
        : ambient.kind === 'snow'
          ? { min: 12, max: 34 }
          : ambient.kind === 'rain'
            ? { min: 260, max: 340 }
            : { min: -10, max: 10 },
    speedX:
      ambient.kind === 'snow'
        ? { min: -18, max: 18 }
        : ambient.kind === 'ember'
          ? { min: -14, max: 14 }
          : { min: -8, max: 8 },
  };
  const ambientEmitter = scene.add.particles(0, 0, moteKey, emitterConfig);
  ambientEmitter.setScrollFactor(0).setDepth(-150);
  created.push(ambientEmitter);

  // --- Foreground depth band (drawn in front of gameplay) ---
  let foreground: Phaser.GameObjects.TileSprite | null = null;
  let foregroundSpec: PaletteSpec['foreground'] | undefined = spec.foreground;
  if (foregroundSpec) {
    const key = `ddr_fg_${palette}`;
    ensureLayerTexture(
      scene,
      key,
      {
        kind: 'mountains',
        color: foregroundSpec.color,
        alpha: 1,
        scroll: foregroundSpec.scroll,
        height: foregroundSpec.height,
        bottomOffset: 0, // unused: this spec only feeds ensureLayerTexture, never placement
      },
      palette.charCodeAt(1) * 104729,
    );
    // Depth note: this band sits BEHIND gameplay (negative depth), not in front of it.
    // The playfield runs along the bottom of the screen, so an overlapping foreground
    // silhouette hid the player entirely — it reads as near-background depth instead.
    foreground = scene.add
      .tileSprite(0, viewH - foregroundSpec.height, viewW, foregroundSpec.height, key)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(-120)
      .setAlpha(foregroundSpec.alpha);
    created.push(foreground);
  }

  // Dark scrim over the lower screen: pushes the busy skyline back so the player,
  // platforms and hazards keep the strongest contrast in the frame.
  const scrim = scene.add.graphics().setScrollFactor(0).setDepth(-110);
  scrim.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.55, 0.55);
  scrim.fillRect(0, viewH * 0.45, viewW, viewH * 0.55);
  created.push(scrim);

  let driftMs = 0;

  return {
    update(camera, dtMs) {
      driftMs += dtMs;
      for (const { tile, spec: ls } of tiles) {
        tile.tilePositionX = camera.scrollX * ls.scroll + (ls.drift ? (driftMs / 1000) * ls.drift : 0);
        // A touch of vertical parallax keeps jumps feeling three-dimensional.
        tile.tilePositionY = camera.scrollY * ls.scroll * 0.35;
      }
      if (foreground && foregroundSpec) {
        foreground.tilePositionX = camera.scrollX * foregroundSpec.scroll;
      }
    },
    destroy() {
      for (const obj of created) obj.destroy();
      tiles.length = 0;
      foreground = null;
      foregroundSpec = undefined;
    },
  };
}
