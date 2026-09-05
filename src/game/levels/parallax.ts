import Phaser from 'phaser';

export interface ParallaxLayer {
  update(cameraScrollX: number): void;
}

const PARALLAX_PALETTES: Record<string, { colors: number[]; scrollFactors: number[] }> = {
  training: { colors: [0x1e293b, 0x334155, 0x475569], scrollFactors: [0.1, 0.25, 0.45] },
  industrial: { colors: [0x27272a, 0x3f3f46, 0x52525b], scrollFactors: [0.1, 0.25, 0.45] },
  neon: { colors: [0x1e1b4b, 0x312e81, 0x4c1d95], scrollFactors: [0.1, 0.25, 0.45] },
};

export function buildParallaxLayers(scene: Phaser.Scene, palette: string, levelWidthPx: number, levelHeightPx: number): ParallaxLayer[] {
  const config = PARALLAX_PALETTES[palette] ?? PARALLAX_PALETTES.training;
  return config.colors.map((color, index) => {
    const scrollFactor = config.scrollFactors[index];
    // Layers are wider than the level so they never run out while scrolling at a fractional rate.
    const rect = scene.add.rectangle(0, 0, levelWidthPx * 1.5, levelHeightPx, color).setOrigin(0, 0).setScrollFactor(scrollFactor, 0);
    rect.setDepth(-100 + index);
    return {
      update: () => {
        /* Phaser's setScrollFactor already handles per-frame positioning; no manual update needed,
           but the interface stays update()-shaped in case a future layer wants extra motion (e.g. drift). */
      },
    };
  });
}
