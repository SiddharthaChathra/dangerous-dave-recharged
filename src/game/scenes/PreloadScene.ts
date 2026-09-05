import Phaser from 'phaser';

/**
 * Generates all procedural pixel-art textures used in the game.
 * Every sprite is drawn onto an offscreen canvas and registered as a Phaser texture,
 * so no external image files are needed.
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload(): void {
    // Nothing to load from network — all assets are generated in create().
  }

  create(): void {
    this.generatePlayerTextures();
    this.generateGemTexture();
    this.generateSecretTexture();
    this.generateEnemyTextures();
    this.generateSpikeTexture();
    this.generateCheckpointTexture();
    this.generatePlatformTextures();
    this.generateGoalTexture();
    this.scene.start('MainMenu');
  }

  /* ------------------------------------------------------------------ */
  /*  PLAYER                                                            */
  /* ------------------------------------------------------------------ */
  private generatePlayerTextures(): void {
    // 24×32 pixel-art character — green adventurer
    const w = 24, h = 32;
    const canvas = this.textures.createCanvas('player_idle', w, h)!;
    const ctx = canvas.getContext();
    // Body
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(6, 8, 12, 16); // torso
    // Head
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(7, 0, 10, 10);
    // Eyes
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(9, 3, 3, 3);
    ctx.fillRect(14, 3, 3, 3);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(10, 4, 2, 2);
    ctx.fillRect(15, 4, 2, 2);
    // Belt
    ctx.fillStyle = '#854d0e';
    ctx.fillRect(6, 18, 12, 3);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(10, 18, 4, 3);
    // Legs
    ctx.fillStyle = '#1e40af';
    ctx.fillRect(7, 24, 4, 8);
    ctx.fillRect(13, 24, 4, 8);
    // Boots
    ctx.fillStyle = '#78350f';
    ctx.fillRect(6, 29, 5, 3);
    ctx.fillRect(13, 29, 5, 3);
    // Arms
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(2, 10, 4, 10);
    ctx.fillRect(18, 10, 4, 10);
    canvas.refresh();

    // Running frame (slightly different arm position)
    const runCanvas = this.textures.createCanvas('player_run', w, h)!;
    const rctx = runCanvas.getContext();
    rctx.drawImage(canvas.getSourceImage() as HTMLCanvasElement, 0, 0);
    // Move arms for running look
    rctx.fillStyle = '#0b0b12';
    rctx.fillRect(2, 10, 4, 10);
    rctx.fillRect(18, 10, 4, 10);
    rctx.fillStyle = '#22c55e';
    rctx.fillRect(2, 8, 4, 8);
    rctx.fillRect(18, 14, 4, 8);
    runCanvas.refresh();

    // Jump frame (arms up)
    const jumpCanvas = this.textures.createCanvas('player_jump', w, h)!;
    const jctx = jumpCanvas.getContext();
    jctx.drawImage(canvas.getSourceImage() as HTMLCanvasElement, 0, 0);
    jctx.fillStyle = '#0b0b12';
    jctx.fillRect(2, 10, 4, 10);
    jctx.fillRect(18, 10, 4, 10);
    jctx.fillStyle = '#22c55e';
    jctx.fillRect(1, 4, 4, 8);
    jctx.fillRect(19, 4, 4, 8);
    jumpCanvas.refresh();
  }

  /* ------------------------------------------------------------------ */
  /*  COLLECTIBLES                                                      */
  /* ------------------------------------------------------------------ */
  private generateGemTexture(): void {
    const s = 14;
    const canvas = this.textures.createCanvas('gem', s, s)!;
    const ctx = canvas.getContext();
    // Diamond shape
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(s / 2, 0);
    ctx.lineTo(s, s / 2);
    ctx.lineTo(s / 2, s);
    ctx.lineTo(0, s / 2);
    ctx.closePath();
    ctx.fill();
    // Highlight
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(5, 3, 4, 4);
    canvas.refresh();
  }

  private generateSecretTexture(): void {
    const s = 14;
    const canvas = this.textures.createCanvas('secret_gem', s, s)!;
    const ctx = canvas.getContext();
    ctx.fillStyle = '#ec4899';
    ctx.beginPath();
    ctx.moveTo(s / 2, 0);
    ctx.lineTo(s, s / 2);
    ctx.lineTo(s / 2, s);
    ctx.lineTo(0, s / 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fbcfe8';
    ctx.fillRect(5, 3, 4, 4);
    canvas.refresh();
  }

  /* ------------------------------------------------------------------ */
  /*  ENEMIES                                                           */
  /* ------------------------------------------------------------------ */
  private generateEnemyTextures(): void {
    // Patrol enemy — orange crab-like
    this.generateEnemySprite('enemy_patrol', '#f97316', '#fdba74');
    // Flying enemy — purple bat-like
    this.generateEnemySprite('enemy_flying', '#a855f7', '#d8b4fe');
    // Chase enemy — red skull-like
    this.generateEnemySprite('enemy_chase', '#dc2626', '#fca5a5');
  }

  private generateEnemySprite(key: string, baseColor: string, highlightColor: string): void {
    const s = 24;
    const canvas = this.textures.createCanvas(key, s, s)!;
    const ctx = canvas.getContext();
    // Body
    ctx.fillStyle = baseColor;
    ctx.fillRect(4, 4, 16, 16);
    ctx.fillRect(2, 6, 20, 12);
    // Eyes
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(6, 7, 4, 4);
    ctx.fillRect(14, 7, 4, 4);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(8, 8, 2, 3);
    ctx.fillRect(16, 8, 2, 3);
    // Highlight
    ctx.fillStyle = highlightColor;
    ctx.fillRect(8, 4, 8, 2);
    // Mouth/detail
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(8, 14, 2, 2);
    ctx.fillRect(11, 15, 2, 2);
    ctx.fillRect(14, 14, 2, 2);
    canvas.refresh();
  }

  /* ------------------------------------------------------------------ */
  /*  HAZARDS                                                           */
  /* ------------------------------------------------------------------ */
  private generateSpikeTexture(): void {
    const w = 32, h = 20;
    const canvas = this.textures.createCanvas('spike', w, h)!;
    const ctx = canvas.getContext();
    ctx.fillStyle = '#ef4444';
    // Draw triangular spikes
    for (let i = 0; i < 4; i++) {
      const x = i * 8;
      ctx.beginPath();
      ctx.moveTo(x, h);
      ctx.lineTo(x + 4, 2);
      ctx.lineTo(x + 8, h);
      ctx.closePath();
      ctx.fill();
    }
    // Highlight tips
    ctx.fillStyle = '#fca5a5';
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(i * 8 + 3, 2, 2, 3);
    }
    canvas.refresh();
  }

  /* ------------------------------------------------------------------ */
  /*  CHECKPOINT                                                        */
  /* ------------------------------------------------------------------ */
  private generateCheckpointTexture(): void {
    const w = 16, h = 40;
    const canvas = this.textures.createCanvas('checkpoint', w, h)!;
    const ctx = canvas.getContext();
    // Pole
    ctx.fillStyle = '#71717a';
    ctx.fillRect(6, 0, 4, h);
    // Flag (inactive — yellow-ish)
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(10, 2, 6, 10);
    // Flag highlight
    ctx.fillStyle = '#fde68a';
    ctx.fillRect(10, 2, 6, 3);
    canvas.refresh();

    // Active checkpoint
    const activeCanvas = this.textures.createCanvas('checkpoint_active', w, h)!;
    const actx = activeCanvas.getContext();
    actx.fillStyle = '#71717a';
    actx.fillRect(6, 0, 4, h);
    actx.fillStyle = '#22c55e';
    actx.fillRect(10, 2, 6, 10);
    actx.fillStyle = '#86efac';
    actx.fillRect(10, 2, 6, 3);
    activeCanvas.refresh();
  }

  /* ------------------------------------------------------------------ */
  /*  PLATFORMS                                                         */
  /* ------------------------------------------------------------------ */
  private generatePlatformTextures(): void {
    // Ground/static platform tile (32×32 tileable)
    const s = 32;
    const groundCanvas = this.textures.createCanvas('platform_tile', s, s)!;
    const gctx = groundCanvas.getContext();
    gctx.fillStyle = '#334155';
    gctx.fillRect(0, 0, s, s);
    // Top grass/moss line
    gctx.fillStyle = '#22c55e';
    gctx.fillRect(0, 0, s, 4);
    gctx.fillStyle = '#16a34a';
    gctx.fillRect(0, 4, s, 2);
    // Brick pattern
    gctx.strokeStyle = '#1e293b';
    gctx.lineWidth = 1;
    gctx.strokeRect(0, 8, 16, 12);
    gctx.strokeRect(16, 8, 16, 12);
    gctx.strokeRect(8, 20, 16, 12);
    groundCanvas.refresh();

    // Moving platform
    const mpCanvas = this.textures.createCanvas('moving_platform', 100, 16)!;
    const mpctx = mpCanvas.getContext();
    mpctx.fillStyle = '#94a3b8';
    mpctx.fillRect(0, 0, 100, 16);
    mpctx.fillStyle = '#cbd5e1';
    mpctx.fillRect(0, 0, 100, 3);
    mpctx.fillStyle = '#64748b';
    mpctx.fillRect(0, 13, 100, 3);
    // Rivets
    mpctx.fillStyle = '#475569';
    for (let i = 10; i < 100; i += 20) {
      mpctx.fillRect(i, 6, 4, 4);
    }
    mpCanvas.refresh();

    // Falling platform (brownish, warning color)
    const fpCanvas = this.textures.createCanvas('falling_platform', 120, 20)!;
    const fpctx = fpCanvas.getContext();
    fpctx.fillStyle = '#92400e';
    fpctx.fillRect(0, 0, 120, 20);
    fpctx.fillStyle = '#b45309';
    fpctx.fillRect(0, 0, 120, 4);
    // Warning stripes
    fpctx.fillStyle = '#fbbf24';
    for (let i = 0; i < 120; i += 12) {
      fpctx.fillRect(i, 8, 6, 4);
    }
    fpCanvas.refresh();

    // Triggered falling platform (red danger)
    const ftCanvas = this.textures.createCanvas('falling_platform_triggered', 120, 20)!;
    const ftctx = ftCanvas.getContext();
    ftctx.fillStyle = '#991b1b';
    ftctx.fillRect(0, 0, 120, 20);
    ftctx.fillStyle = '#ef4444';
    ftctx.fillRect(0, 0, 120, 4);
    ftctx.fillStyle = '#fca5a5';
    for (let i = 0; i < 120; i += 8) {
      ftctx.fillRect(i, 8, 4, 4);
    }
    ftCanvas.refresh();
  }

  /* ------------------------------------------------------------------ */
  /*  GOAL (level exit)                                                 */
  /* ------------------------------------------------------------------ */
  private generateGoalTexture(): void {
    const w = 40, h = 80;
    const canvas = this.textures.createCanvas('goal_door', w, h)!;
    const ctx = canvas.getContext();
    // Door frame
    ctx.fillStyle = '#854d0e';
    ctx.fillRect(0, 0, w, h);
    // Door inner
    ctx.fillStyle = '#422006';
    ctx.fillRect(4, 4, w - 8, h - 4);
    // Arch top
    ctx.fillStyle = '#854d0e';
    ctx.beginPath();
    ctx.arc(w / 2, 16, 14, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#422006';
    ctx.beginPath();
    ctx.arc(w / 2, 16, 10, Math.PI, 0);
    ctx.fill();
    // Door handle
    ctx.fillStyle = '#facc15';
    ctx.fillRect(w - 12, h / 2, 4, 4);
    // Light glow from inside
    ctx.fillStyle = 'rgba(250, 204, 21, 0.3)';
    ctx.fillRect(8, 20, w - 16, h - 24);
    canvas.refresh();
  }
}
