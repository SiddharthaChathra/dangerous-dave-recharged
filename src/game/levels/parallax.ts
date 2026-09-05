import Phaser from 'phaser';

export interface ParallaxLayer {
  update(cameraScrollX: number): void;
}

const PARALLAX_PALETTES: Record<string, { colors: number[]; scrollFactors: number[] }> = {
  training: { colors: [0x1e293b, 0x334155, 0x475569], scrollFactors: [0.1, 0.25, 0.45] },
  industrial: { colors: [0x27272a, 0x3f3f46, 0x52525b], scrollFactors: [0.1, 0.25, 0.45] },
  neon: { colors: [0x1e1b4b, 0x312e81, 0x4c1d95], scrollFactors: [0.1, 0.25, 0.45] },
  sky: { colors: [0x0c4a6e, 0x0369a1, 0x0284c7], scrollFactors: [0.08, 0.2, 0.4] },
  final: { colors: [0x450a0a, 0x7f1d1d, 0x991b1b], scrollFactors: [0.1, 0.25, 0.45] },
};

export function buildParallaxLayers(scene: Phaser.Scene, palette: string, levelWidthPx: number, levelHeightPx: number): ParallaxLayer[] {
  const config = PARALLAX_PALETTES[palette] ?? PARALLAX_PALETTES.training;
  const layers = config.colors.map((color, index) => {
    const scrollFactor = config.scrollFactors[index];
    const rect = scene.add.rectangle(0, 0, levelWidthPx * 1.5, levelHeightPx, color).setOrigin(0, 0).setScrollFactor(scrollFactor, 0);
    rect.setDepth(-100 + index);
    return {
      update: () => {
        /* Phaser's setScrollFactor already handles per-frame positioning. */
      },
    };
  });

  // Add decorative elements based on palette
  addEnvironmentalDecor(scene, palette, levelWidthPx, levelHeightPx);

  return layers;
}

/** Adds procedural environmental decorations behind the gameplay layer. */
function addEnvironmentalDecor(scene: Phaser.Scene, palette: string, levelWidthPx: number, levelHeightPx: number): void {
  const colors = getDecorColors(palette);

  // Distant silhouette mountains/buildings
  for (let x = 0; x < levelWidthPx * 1.2; x += 120 + Math.random() * 80) {
    const h = 40 + Math.random() * 100;
    const w = 60 + Math.random() * 40;
    const rect = scene.add.rectangle(x, levelHeightPx - h / 2 - 20, w, h, colors.silhouette, 0.3);
    rect.setScrollFactor(0.15, 0.15);
    rect.setDepth(-95);
  }

  // Mid-ground details (smaller structures)
  for (let x = 0; x < levelWidthPx * 1.1; x += 200 + Math.random() * 150) {
    const h = 20 + Math.random() * 50;
    const w = 30 + Math.random() * 30;
    const rect = scene.add.rectangle(x, levelHeightPx - h / 2 - 10, w, h, colors.midground, 0.25);
    rect.setScrollFactor(0.3, 0.3);
    rect.setDepth(-90);
  }

  // Atmospheric dots/stars (for sky/neon/final palettes)
  if (['sky', 'neon', 'final'].includes(palette)) {
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * levelWidthPx * 1.3;
      const y = Math.random() * levelHeightPx * 0.6;
      const size = 1 + Math.random() * 2;
      const dot = scene.add.rectangle(x, y, size, size, colors.particle, 0.3 + Math.random() * 0.4);
      dot.setScrollFactor(0.05 + Math.random() * 0.1, 0.05);
      dot.setDepth(-98);
    }
  }
}

function getDecorColors(palette: string): { silhouette: number; midground: number; particle: number } {
  switch (palette) {
    case 'industrial':
      return { silhouette: 0x71717a, midground: 0x52525b, particle: 0xa1a1aa };
    case 'neon':
      return { silhouette: 0x7c3aed, midground: 0x6d28d9, particle: 0xc4b5fd };
    case 'sky':
      return { silhouette: 0x0ea5e9, midground: 0x38bdf8, particle: 0xffffff };
    case 'final':
      return { silhouette: 0xb91c1c, midground: 0xdc2626, particle: 0xfca5a5 };
    default: // training
      return { silhouette: 0x64748b, midground: 0x475569, particle: 0x94a3b8 };
  }
}
