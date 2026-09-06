import Phaser from 'phaser';

/**
 * Generates all advanced procedural textures used in the game.
 * Uses Canvas API with gradients, glowing shadows, and vector-like smooth paths 
 * to create a AAA modern 2.5D visual aesthetic instead of basic pixel art.
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload(): void {
    // Nothing to load from network — all assets are generated procedurally in create().
  }

  create(): void {
    this.generatePlayerTextures();
    this.generatePlayerClassicTextures();
    this.generateCharacterTextures();
    this.generateCharacterClassicTextures();
    
    this.generateGemTexture();
    this.generateGemClassicTexture();
    
    this.generateSecretTexture();
    this.generateSecretClassicTexture();
    
    this.generateEnemyTextures();
    this.generateEnemyClassicTextures();
    
    this.generateSpikeTexture();
    this.generateSpikeClassicTexture();
    
    this.generateWeaponTextures();
    this.generateWeaponClassicTextures();
    
    this.generatePlatformTextures();
    this.generatePlatformClassicTextures();
    
    this.generateGoalTexture();
    this.generateGoalClassicTexture();
    
    this.generateTrophyTexture();
    this.generateTrophyClassicTexture();
    
    this.generateFireLavaTextures();
    this.generateFireLavaClassicTextures();
    
    this.generateParticleTexture();
    this.generateParticleClassicTexture();
    
    this.generateTransitionTextures();
    
    // Add a slight delay before transitioning to ensure textures are fully registered
    this.time.delayedCall(50, () => {
      this.scene.start('MainMenu');
    });
  }

  /* ------------------------------------------------------------------ */
  /*  PLAYER (Modern, stylized vector hero)                             */
  /* ------------------------------------------------------------------ */
  private generatePlayerTextures(): void {
    const w = 72, h = 96; // 3x higher resolution than original
    
    // Helper to draw the hero base
    const drawHero = (ctx: CanvasRenderingContext2D, state: 'idle' | 'run' | 'jump' | 'fall') => {
      // Glow / Shadow behind character
      ctx.shadowColor = 'rgba(0, 240, 255, 0.4)';
      ctx.shadowBlur = 15;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 4;

      // Body parameters
      let headY = 10, headRot = 0;
      let armLY = 40, armRY = 40, armLRot = 0, armRRot = 0;
      let legLY = 70, legRY = 70;
      let torsoScaleY = 1;

      if (state === 'run') {
        headY = 12;
        headRot = 0.1;
        armLY = 35; armLRot = 0.5;
        armRY = 35; armRRot = -0.5;
        legLY = 65; legRY = 75;
      } else if (state === 'jump') {
        headY = 5;
        torsoScaleY = 1.1;
        armLY = 20; armLRot = -2;
        armRY = 20; armRRot = 2;
        legLY = 75; legRY = 80;
      } else if (state === 'fall') {
        headY = 8;
        armLY = 10; armLRot = -2.5;
        armRY = 10; armRRot = 2.5;
        legLY = 65; legRY = 65;
      }

      ctx.save();
      
      // Legs
      const drawLeg = (lx: number, ly: number, color: string) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(lx, ly, 12, 22, 6);
        ctx.fill();
        // Boot
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.roundRect(lx - 2, ly + 16, 18, 10, 4);
        ctx.fill();
      };
      
      // Draw back leg and back arm
      drawLeg(20, legLY, '#0f172a'); // darker for depth
      
      ctx.save();
      ctx.translate(22, armLY);
      ctx.rotate(armLRot);
      ctx.fillStyle = '#059669'; // dark green
      ctx.beginPath(); ctx.roundRect(-5, 0, 10, 26, 5); ctx.fill();
      ctx.restore();

      // Torso
      ctx.save();
      ctx.translate(w/2, 45);
      ctx.scale(1, torsoScaleY);
      const torsoGrad = ctx.createLinearGradient(0, -20, 0, 20);
      torsoGrad.addColorStop(0, '#10b981');
      torsoGrad.addColorStop(1, '#047857');
      ctx.fillStyle = torsoGrad;
      ctx.beginPath();
      ctx.roundRect(-14, -20, 28, 40, 10);
      ctx.fill();
      // Glowing emblem on chest
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#00f0ff';
      ctx.fillStyle = '#00f0ff';
      ctx.beginPath(); ctx.arc(0, -5, 6, 0, Math.PI*2); ctx.fill();
      ctx.restore();

      // Front leg
      drawLeg(40, legRY, '#1e293b');

      // Head
      ctx.save();
      ctx.translate(w/2, headY);
      ctx.rotate(headRot);
      const headGrad = ctx.createLinearGradient(-15, 0, 15, 30);
      headGrad.addColorStop(0, '#34d399');
      headGrad.addColorStop(1, '#059669');
      ctx.fillStyle = headGrad;
      ctx.beginPath();
      ctx.roundRect(-16, 0, 32, 32, 12);
      ctx.fill();
      
      // Visor / Eyes
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 15;
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.roundRect(0, 8, 18, 12, 4); ctx.fill();
      ctx.fillStyle = '#00f0ff';
      ctx.beginPath(); ctx.roundRect(4, 10, 12, 8, 3); ctx.fill();
      ctx.restore();

      // Front Arm
      ctx.save();
      ctx.translate(50, armRY);
      ctx.rotate(armRRot);
      ctx.fillStyle = '#10b981';
      ctx.beginPath(); ctx.roundRect(-6, 0, 12, 28, 6); ctx.fill();
      // Hand/Glove
      ctx.fillStyle = '#333';
      ctx.beginPath(); ctx.roundRect(-8, 22, 16, 10, 4); ctx.fill();
      ctx.restore();

      ctx.restore();
    };

    const states: ('idle'|'run'|'jump'|'fall')[] = ['idle', 'run', 'jump', 'fall'];
    for (const state of states) {
      const canvas = this.textures.createCanvas(`player_${state}`, w, h)!;
      const ctx = canvas.getContext();
      drawHero(ctx, state);
      canvas.refresh();
    }
  }

  private generatePlayerClassicTextures(): void {
    const w = 72, h = 96;
    
    const drawClassicHero = (ctx: CanvasRenderingContext2D, state: 'idle' | 'run' | 'jump' | 'fall') => {
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#ff0000'; // red hat/shirt
      
      let bobY = (state === 'run') ? 4 : 0;
      if (state === 'jump') bobY = -6;
      if (state === 'fall') bobY = -4;

      ctx.save();
      ctx.translate(w/2, h/2 + bobY);
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(-12, 40 - bobY, 24, 6);

      // Hat
      ctx.fillStyle = '#d32f2f';
      ctx.fillRect(-12, -36, 24, 12);
      ctx.fillRect(-16, -24, 32, 6);
      
      // Face
      ctx.fillStyle = '#ffccaa';
      ctx.fillRect(-10, -18, 20, 16);
      
      // Eyes
      ctx.fillStyle = '#000';
      ctx.fillRect(-6, -14, 4, 4);
      ctx.fillRect(6, -14, 4, 4);
      
      // Shirt
      ctx.fillStyle = '#d32f2f';
      ctx.fillRect(-12, -2, 24, 20);
      
      // Overalls
      ctx.fillStyle = '#1976d2';
      ctx.fillRect(-12, 18, 24, 10);
      
      // Arms
      ctx.fillStyle = '#d32f2f';
      if (state === 'jump' || state === 'fall') {
        ctx.fillRect(-22, -10, 10, 20);
        ctx.fillRect(12, -10, 10, 20);
      } else if (state === 'run') {
        ctx.fillRect(-20, -2, 8, 16);
        ctx.fillRect(12, -2, 8, 16);
      } else {
        ctx.fillRect(-20, -2, 8, 20);
        ctx.fillRect(12, -2, 8, 20);
      }
      
      // Hands
      ctx.fillStyle = '#ffccaa';
      if (state === 'jump' || state === 'fall') {
        ctx.fillRect(-22, -18, 10, 8);
        ctx.fillRect(12, -18, 10, 8);
      } else if (state === 'run') {
        ctx.fillRect(-20, 14, 8, 8);
        ctx.fillRect(12, 14, 8, 8);
      } else {
        ctx.fillRect(-20, 18, 8, 8);
        ctx.fillRect(12, 18, 8, 8);
      }
      
      // Legs
      ctx.fillStyle = '#1976d2';
      if (state === 'jump' || state === 'fall') {
        ctx.fillRect(-12, 28, 10, 8);
        ctx.fillRect(2, 24, 10, 8);
      } else if (state === 'run') {
        ctx.fillRect(-12, 28, 10, 10);
        ctx.fillRect(2, 28, 10, 10);
      } else {
        ctx.fillRect(-12, 28, 10, 12);
        ctx.fillRect(2, 28, 10, 12);
      }
      
      // Shoes
      ctx.fillStyle = '#5d4037';
      if (state === 'jump' || state === 'fall') {
        ctx.fillRect(-14, 36, 12, 6);
        ctx.fillRect(0, 32, 12, 6);
      } else if (state === 'run') {
        ctx.fillRect(-14, 38, 12, 6);
        ctx.fillRect(0, 38, 12, 6);
      } else {
        ctx.fillRect(-14, 40, 12, 6);
        ctx.fillRect(2, 40, 12, 6);
      }
      ctx.restore();
    };

    const states: ('idle'|'run'|'jump'|'fall')[] = ['idle', 'run', 'jump', 'fall'];
    for (const state of states) {
      const canvas = this.textures.createCanvas(`classic__player_${state}`, w, h)!;
      const ctx = canvas.getContext();
      drawClassicHero(ctx, state);
      canvas.refresh();
    }
  }

  /* ------------------------------------------------------------------ */
  /*  COLLECTIBLES                                                      */
  /* ------------------------------------------------------------------ */
  private generateGemTexture(): void {
    const s = 40;
    const canvas = this.textures.createCanvas('gem', s, s)!;
    const ctx = canvas.getContext();
    
    ctx.shadowColor = 'rgba(250, 204, 21, 0.8)';
    ctx.shadowBlur = 15;
    
    const grad = ctx.createLinearGradient(0, 0, s, s);
    grad.addColorStop(0, '#fef08a');
    grad.addColorStop(0.5, '#facc15');
    grad.addColorStop(1, '#a16207');
    
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(s / 2, 4);
    ctx.lineTo(s - 4, s / 2);
    ctx.lineTo(s / 2, s - 4);
    ctx.lineTo(4, s / 2);
    ctx.closePath();
    ctx.fill();
    
    // Core highlight
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(s / 2, 8);
    ctx.lineTo(s / 2 + 6, s / 2);
    ctx.lineTo(s / 2, s / 2 + 6);
    ctx.lineTo(s / 2 - 6, s / 2);
    ctx.closePath();
    ctx.fill();
    
    canvas.refresh();
  }

  private generateGemClassicTexture(): void {
    const s = 40;
    const canvas = this.textures.createCanvas('classic__gem', s, s)!;
    const ctx = canvas.getContext();
    
    ctx.fillStyle = '#ffaa00'; // Gold
    ctx.fillRect(10, 4, 20, 16);
    ctx.fillRect(8, 6, 2, 12);
    ctx.fillRect(30, 6, 2, 12);
    ctx.fillRect(14, 20, 12, 4);
    ctx.fillRect(16, 24, 8, 8);
    ctx.fillRect(12, 32, 16, 6);
    
    ctx.fillStyle = '#ffff55';
    ctx.fillRect(12, 6, 4, 12);
    ctx.fillRect(14, 34, 12, 2);
    
    canvas.refresh();
  }

  private generateSecretTexture(): void {
    const s = 40;
    const canvas = this.textures.createCanvas('secret_gem', s, s)!;
    const ctx = canvas.getContext();
    
    ctx.shadowColor = 'rgba(236, 72, 153, 0.8)';
    ctx.shadowBlur = 15;
    
    const grad = ctx.createLinearGradient(0, 0, s, s);
    grad.addColorStop(0, '#fbcfe8');
    grad.addColorStop(0.5, '#ec4899');
    grad.addColorStop(1, '#831843');
    
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(s / 2, 4);
    ctx.lineTo(s - 4, s / 2);
    ctx.lineTo(s / 2, s - 4);
    ctx.lineTo(4, s / 2);
    ctx.closePath();
    ctx.fill();
    
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(s / 2, 8);
    ctx.lineTo(s / 2 + 6, s / 2);
    ctx.lineTo(s / 2, s / 2 + 6);
    ctx.lineTo(s / 2 - 6, s / 2);
    ctx.closePath();
    ctx.fill();
    
    canvas.refresh();
  }

  private generateSecretClassicTexture(): void {
    const s = 40;
    const canvas = this.textures.createCanvas('classic__secret_gem', s, s)!;
    const ctx = canvas.getContext();
    
    ctx.fillStyle = '#ff55ff'; // Magenta
    ctx.fillRect(8, 12, 24, 16);
    ctx.fillRect(4, 16, 32, 8);
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(10, 14, 6, 6);
    
    ctx.fillStyle = '#aa00aa';
    ctx.fillRect(8, 28, 24, 8);
    ctx.fillRect(12, 36, 16, 4);

    canvas.refresh();
  }

  /* ------------------------------------------------------------------ */
  /*  ENEMIES                                                           */
  /* ------------------------------------------------------------------ */
  private generateEnemyTextures(): void {
    this.generateEnemySprite('enemy_patrol', '#f97316', '#fdba74', 'rgba(249, 115, 22, 0.6)');
    this.generateEnemySprite('enemy_flying', '#a855f7', '#d8b4fe', 'rgba(168, 85, 247, 0.6)');
    this.generateEnemySprite('enemy_chase', '#dc2626', '#fca5a5', 'rgba(220, 38, 38, 0.6)');
  }

  private generateEnemyClassicTextures(): void {
    this.generateEnemyClassicSprite('classic__enemy_patrol', '#d32f2f');
    this.generateEnemyClassicSprite('classic__enemy_flying', '#7b1fa2');
    this.generateEnemyClassicSprite('classic__enemy_chase', '#c2185b');
  }

  private generateEnemySprite(key: string, baseColor: string, highlightColor: string, glowColor: string): void {
    const s = 64;
    const canvas = this.textures.createCanvas(key, s, s)!;
    const ctx = canvas.getContext();
    
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 15;
    ctx.shadowOffsetY = 4;
    
    // Main Body (Round, organic shape)
    const grad = ctx.createRadialGradient(s/2, s/2-10, 5, s/2, s/2, 30);
    grad.addColorStop(0, highlightColor);
    grad.addColorStop(1, baseColor);
    
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(s/2, s/2, 24, 0, Math.PI * 2);
    ctx.fill();
    
    // Angry Eye Visor
    ctx.shadowBlur = 5;
    ctx.shadowColor = '#fff';
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.roundRect(s/2 - 16, s/2 - 8, 32, 12, 6);
    ctx.fill();
    
    // Glowing red/yellow eye core
    ctx.fillStyle = '#ff003c';
    ctx.shadowColor = '#ff003c';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(s/2 - 6, s/2 - 2, 3, 0, Math.PI*2);
    ctx.arc(s/2 + 6, s/2 - 2, 3, 0, Math.PI*2);
    ctx.fill();

    canvas.refresh();
  }

  private generateEnemyClassicSprite(key: string, color: string): void {
    const s = 64;
    const canvas = this.textures.createCanvas(key, s, s)!;
    const ctx = canvas.getContext();
    
    ctx.fillStyle = color;
    ctx.fillRect(16, 16, 32, 24);
    ctx.fillRect(8, 24, 8, 16);
    ctx.fillRect(48, 24, 8, 16);
    
    ctx.fillRect(16, 40, 8, 12);
    ctx.fillRect(30, 40, 4, 12);
    ctx.fillRect(40, 40, 8, 12);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(20, 20, 8, 8);
    ctx.fillRect(36, 20, 8, 8);
    
    ctx.fillStyle = '#000000';
    ctx.fillRect(24, 24, 4, 4);
    ctx.fillRect(40, 24, 4, 4);

    canvas.refresh();
  }

  /* ------------------------------------------------------------------ */
  /*  HAZARDS                                                           */
  /* ------------------------------------------------------------------ */
  private generateSpikeTexture(): void {
    const w = 64, h = 40;
    const canvas = this.textures.createCanvas('spike', w, h)!;
    const ctx = canvas.getContext();
    
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#fca5a5');
    grad.addColorStop(1, '#991b1b');

    ctx.fillStyle = grad;
    ctx.shadowColor = 'rgba(255, 0, 60, 0.4)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetY = -5;

    // 3 sleek, sharp spikes
    for (let i = 0; i < 3; i++) {
      const x = i * 21 + 10;
      ctx.beginPath();
      ctx.moveTo(x, h);
      ctx.lineTo(x + 10, 4);
      ctx.lineTo(x + 20, h);
      ctx.closePath();
      ctx.fill();
    }
    
    // Base plate
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#27272a';
    ctx.fillRect(0, h - 8, w, 8);
    ctx.fillStyle = '#52525b';
    ctx.fillRect(0, h - 8, w, 2);
    
    canvas.refresh();
  }

  private generateSpikeClassicTexture(): void {
    const w = 64, h = 40;
    const canvas = this.textures.createCanvas('classic__spike', w, h)!;
    const ctx = canvas.getContext();
    
    ctx.fillStyle = '#ff5500';
    ctx.fillRect(0, h - 16, w, 16);
    
    ctx.fillStyle = '#ffff00';
    for (let i = 0; i < 4; i++) {
        const x = i * 16;
        ctx.fillRect(x + 4, h - 24, 8, 8);
        ctx.fillRect(x + 6, h - 32, 4, 8);
    }
    
    canvas.refresh();
  }

  /* ------------------------------------------------------------------ */
  /*  WEAPON & PROJECTILE                                               */
  /* ------------------------------------------------------------------ */
  private generateWeaponTextures(): void {
    const w = 22, h = 14;
    const canvas = this.textures.createCanvas('weapon_pickup', w, h)!;
    const ctx = canvas.getContext();
    
    // Modern sci-fi blaster
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(0, 4, 16, 6, 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(4, 10, 6, 4, 1);
    ctx.fill();
    
    // Glowing barrel
    ctx.fillStyle = '#00f0ff';
    ctx.fillRect(16, 5, 6, 4);
    
    canvas.refresh();

    const pw = 10, ph = 6;
    const pcanvas = this.textures.createCanvas('projectile', pw, ph)!;
    const pctx = pcanvas.getContext();
    
    pctx.shadowColor = '#00f0ff';
    pctx.shadowBlur = 8;
    pctx.fillStyle = '#ffffff';
    pctx.beginPath();
    pctx.roundRect(2, 1, 6, 4, 2);
    pctx.fill();
    
    pcanvas.refresh();
  }

  private generateWeaponClassicTextures(): void {
    const w = 22, h = 14;
    const canvas = this.textures.createCanvas('classic__weapon_pickup', w, h)!;
    const ctx = canvas.getContext();
    
    ctx.fillStyle = '#aaaaaa';
    ctx.fillRect(0, 4, 16, 6);
    ctx.fillStyle = '#555555';
    ctx.fillRect(4, 10, 6, 4);
    ctx.fillStyle = '#ffff55';
    ctx.fillRect(16, 4, 6, 6);
    
    canvas.refresh();

    const pw = 10, ph = 6;
    const pcanvas = this.textures.createCanvas('classic__projectile', pw, ph)!;
    const pctx = pcanvas.getContext();
    
    pctx.fillStyle = '#ffffff';
    pctx.fillRect(0, 1, pw, 4);
    pctx.fillStyle = '#000000';
    pctx.fillRect(2, 2, 6, 2);
    
    pcanvas.refresh();
  }

  /* ------------------------------------------------------------------ */
  /*  PLATFORMS                                                         */
  /* ------------------------------------------------------------------ */
  private generatePlatformTextures(): void {
    const s = 64; // 2x original size
    const groundCanvas = this.textures.createCanvas('platform_tile', s, s)!;
    const gctx = groundCanvas.getContext();
    
    // Lit body: brightest just under the trim, falling into shadow at the base.
    // A flat fill read as a black checkerboard against the new parallax sky; the
    // gradient plus grain gives the floor volume and keeps the player readable on it.
    const bodyGrad = gctx.createLinearGradient(0, 0, 0, s);
    bodyGrad.addColorStop(0, '#3a4453');
    bodyGrad.addColorStop(0.28, '#252c38');
    bodyGrad.addColorStop(1, '#12151c');
    gctx.fillStyle = bodyGrad;
    gctx.fillRect(0, 0, s, s);

    // Fine grain so large floors don't look like flat vector blocks.
    for (let i = 0; i < 140; i++) {
      const gx = Math.random() * s;
      const gy = Math.random() * s;
      const bright = Math.random() > 0.5;
      gctx.fillStyle = bright ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.16)';
      gctx.fillRect(gx, gy, 2, 2);
    }

    // Top neon trim with a soft bloom bleeding down into the body.
    const trimGlow = gctx.createLinearGradient(0, 0, 0, 18);
    trimGlow.addColorStop(0, 'rgba(0,240,255,0.55)');
    trimGlow.addColorStop(1, 'rgba(0,240,255,0)');
    gctx.fillStyle = trimGlow;
    gctx.fillRect(0, 0, s, 18);
    gctx.fillStyle = '#7df4ff';
    gctx.fillRect(0, 0, s, 3);
    gctx.fillStyle = '#00c8dd';
    gctx.fillRect(0, 3, s, 2);

    // Recessed panel seams.
    gctx.strokeStyle = 'rgba(0,0,0,0.45)';
    gctx.lineWidth = 2;
    gctx.beginPath();
    gctx.moveTo(s / 2, 6); gctx.lineTo(s / 2, s);
    gctx.moveTo(0, s / 2); gctx.lineTo(s, s / 2);
    gctx.stroke();
    gctx.strokeStyle = 'rgba(255,255,255,0.06)';
    gctx.lineWidth = 1;
    gctx.beginPath();
    gctx.moveTo(s / 2 + 2, 6); gctx.lineTo(s / 2 + 2, s);
    gctx.moveTo(0, s / 2 + 2); gctx.lineTo(s, s / 2 + 2);
    gctx.stroke();

    // Rivets catch the trim light.
    gctx.fillStyle = 'rgba(160,200,220,0.35)';
    for (const [rx, ry] of [[10, 14], [s - 10, 14], [10, s - 12], [s - 10, s - 12]]) {
      gctx.beginPath();
      gctx.arc(rx, ry, 2, 0, Math.PI * 2);
      gctx.fill();
    }
    groundCanvas.refresh();

    // Moving platform
    const mpCanvas = this.textures.createCanvas('moving_platform', 200, 32)!;
    const mpctx = mpCanvas.getContext();
    // Matches the static floor's lit-deck language (cyan trim, shadowed underside) so
    // moving platforms read as the same technology rather than a stray grey slab.
    const mpGrad = mpctx.createLinearGradient(0, 0, 0, 32);
    mpGrad.addColorStop(0, '#3a4453');
    mpGrad.addColorStop(0.35, '#252c38');
    mpGrad.addColorStop(1, '#10131a');
    mpctx.fillStyle = mpGrad;
    mpctx.beginPath();
    mpctx.roundRect(0, 0, 200, 32, 6);
    mpctx.fill();

    const mpTrim = mpctx.createLinearGradient(0, 0, 0, 12);
    mpTrim.addColorStop(0, 'rgba(0,240,255,0.5)');
    mpTrim.addColorStop(1, 'rgba(0,240,255,0)');
    mpctx.fillStyle = mpTrim;
    mpctx.fillRect(4, 0, 192, 12);
    mpctx.fillStyle = '#7df4ff';
    mpctx.fillRect(4, 0, 192, 3);

    // Hover engines glowing below
    mpctx.shadowColor = '#00f0ff';
    mpctx.shadowBlur = 15;
    mpctx.fillStyle = '#00f0ff';
    mpctx.beginPath(); mpctx.arc(40, 28, 5, 0, Math.PI*2); mpctx.fill();
    mpctx.beginPath(); mpctx.arc(160, 28, 5, 0, Math.PI*2); mpctx.fill();
    mpCanvas.refresh();

    // Falling platform
    const fpCanvas = this.textures.createCanvas('falling_platform', 240, 40)!;
    const fpctx = fpCanvas.getContext();
    fpctx.fillStyle = '#3f3f46';
    fpctx.roundRect(0, 0, 240, 40, 8);
    fpctx.fill();
    
    // Warning stripes (black and yellow/orange)
    fpctx.save();
    fpctx.clip(new Path2D(`M8,0 h224 a8,8 0 0 1 8,8 v24 a8,8 0 0 1 -8,8 h-224 a8,8 0 0 1 -8,-8 v-24 a8,8 0 0 1 8,-8 z`));
    fpctx.fillStyle = '#ffaa00';
    for(let i = -40; i < 240; i += 40) {
      fpctx.beginPath();
      fpctx.moveTo(i, 0); fpctx.lineTo(i+20, 0);
      fpctx.lineTo(i+60, 40); fpctx.lineTo(i+40, 40);
      fpctx.fill();
    }
    fpctx.restore();
    fpCanvas.refresh();

    // Falling platform triggered
    const ftCanvas = this.textures.createCanvas('falling_platform_triggered', 240, 40)!;
    const ftctx = ftCanvas.getContext();
    ftctx.drawImage(fpCanvas.getSourceImage() as HTMLCanvasElement, 0, 0);
    // Add red distress glow overlay
    ftctx.fillStyle = 'rgba(255, 0, 60, 0.4)';
    ftctx.globalCompositeOperation = 'source-atop';
    ftctx.fillRect(0,0, 240, 40);
    ftCanvas.refresh();
  }

  private generatePlatformClassicTextures(): void {
    const s = 64; 
    const groundCanvas = this.textures.createCanvas('classic__platform_tile', s, s)!;
    const gctx = groundCanvas.getContext();
    
    gctx.fillStyle = '#aa4444';
    gctx.fillRect(0, 0, s, s);
    gctx.fillStyle = '#ff6666';
    gctx.fillRect(0, 0, s, 4);
    
    gctx.fillStyle = '#552222';
    gctx.fillRect(0, 0, s, 2);
    gctx.fillRect(0, 32, s, 2);
    gctx.fillRect(0, 62, s, 2);
    gctx.fillRect(30, 2, 2, 30);
    gctx.fillRect(14, 34, 2, 28);
    gctx.fillRect(46, 34, 2, 28);
    groundCanvas.refresh();

    const mpCanvas = this.textures.createCanvas('classic__moving_platform', 200, 32)!;
    const mpctx = mpCanvas.getContext();
    
    mpctx.fillStyle = '#888888';
    mpctx.fillRect(0, 0, 200, 32);
    mpctx.fillStyle = '#aaaaaa';
    mpctx.fillRect(0, 0, 200, 4);
    mpctx.fillStyle = '#444444';
    mpctx.fillRect(0, 28, 200, 4);
    
    mpctx.fillStyle = '#ffffff';
    for (let i = 10; i < 200; i+= 40) {
        mpctx.fillRect(i, 14, 4, 4);
    }
    mpCanvas.refresh();

    const fpCanvas = this.textures.createCanvas('classic__falling_platform', 240, 40)!;
    const fpctx = fpCanvas.getContext();
    
    fpctx.fillStyle = '#aa6600';
    fpctx.fillRect(0, 0, 240, 40);
    fpctx.fillStyle = '#ffaa00';
    fpctx.fillRect(0, 0, 240, 4);
    fpctx.fillStyle = '#553300';
    fpctx.fillRect(0, 36, 240, 4);
    fpCanvas.refresh();

    const ftCanvas = this.textures.createCanvas('classic__falling_platform_triggered', 240, 40)!;
    const ftctx = ftCanvas.getContext();
    ftctx.drawImage(fpCanvas.getSourceImage() as HTMLCanvasElement, 0, 0);
    ftctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
    ftctx.fillRect(0,0, 240, 40);
    ftCanvas.refresh();
  }

  /* ------------------------------------------------------------------ */
  /*  GOAL (level exit)                                                 */
  /* ------------------------------------------------------------------ */
  private generateGoalTexture(): void {
    this.createGoalDoorTexture('goal_door', false);
    this.createGoalDoorTexture('goal_door_locked', true);
  }

  private createGoalDoorTexture(key: string, isLocked: boolean): void {
    const w = 80, h = 160;
    const canvas = this.textures.createCanvas(key, w, h)!;
    const ctx = canvas.getContext();
    
    // Frame
    const frameGrad = ctx.createLinearGradient(0, 0, w, 0);
    frameGrad.addColorStop(0, '#18181b');
    frameGrad.addColorStop(0.5, '#3f3f46');
    frameGrad.addColorStop(1, '#18181b');
    ctx.fillStyle = frameGrad;
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, 40);
    ctx.fill();

    // Portal inner space
    ctx.fillStyle = isLocked ? '#1a0000' : '#000';
    ctx.beginPath();
    ctx.roundRect(8, 8, w-16, h-8, 32);
    ctx.fill();

    if (!isLocked) {
      // Portal energy field (glowing)
      ctx.shadowColor = '#7000ff';
      ctx.shadowBlur = 30;
      const energyGrad = ctx.createLinearGradient(0, 0, 0, h);
      energyGrad.addColorStop(0, 'rgba(112, 0, 255, 0.9)');
      energyGrad.addColorStop(1, 'rgba(0, 240, 255, 0.9)');
      ctx.fillStyle = energyGrad;
      ctx.beginPath();
      ctx.roundRect(10, 10, w-20, h-10, 30);
      ctx.fill();
      
      // Central energy vortex
      ctx.shadowColor = '#fff';
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(w/2, h/2, 6, 0, Math.PI*2); ctx.fill();
    } else {
      // Locked state: Red grid or barrier
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 15;
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)';
      ctx.lineWidth = 4;
      for (let y = 30; y < h - 10; y += 20) {
        ctx.beginPath();
        ctx.moveTo(10, y);
        ctx.lineTo(w - 10, y);
        ctx.stroke();
      }
      
      // Giant glowing padlock icon in center
      ctx.fillStyle = '#ff3333';
      ctx.fillRect(w/2 - 12, h/2 - 5, 24, 20);
      ctx.beginPath();
      ctx.arc(w/2, h/2 - 5, 8, Math.PI, 0);
      ctx.strokeStyle = '#ff3333';
      ctx.lineWidth = 4;
      ctx.stroke();
    }

    canvas.refresh();
  }

  private generateGoalClassicTexture(): void {
    this.createGoalClassicTexture('classic__goal_door', false);
    this.createGoalClassicTexture('classic__goal_door_locked', true);
  }

  private createGoalClassicTexture(key: string, isLocked: boolean): void {
    const w = 80, h = 160;
    const canvas = this.textures.createCanvas(key, w, h)!;
    const ctx = canvas.getContext();
    
    ctx.fillStyle = '#6d4c41';
    ctx.fillRect(0, 0, w, h);
    
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(0, 0, w, 8);
    ctx.fillRect(0, 0, 8, h);
    ctx.fillRect(w-8, 0, 8, h);
    
    ctx.fillStyle = isLocked ? '#2e0000' : '#5d4037';
    ctx.fillRect(16, 16, w-32, 60);
    ctx.fillRect(16, 90, w-32, 60);
    
    if (!isLocked) {
      // Golden knob
      ctx.fillStyle = '#ffca28';
      ctx.fillRect(16, h/2, 8, 12);
    } else {
      // Red locked bars
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(16, h/2 - 4, w - 32, 8);
      ctx.fillRect(w/2 - 4, 16, 8, h - 32);
    }
    
    canvas.refresh();
  }

  /* ------------------------------------------------------------------ */
  /*  PARTICLE                                                          */
  /* ------------------------------------------------------------------ */
  private generateParticleTexture(): void {
    const s = 32;
    const canvas = this.textures.createCanvas('particle', s, s)!;
    const ctx = canvas.getContext();
    const gradient = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.2, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, s, s);
    canvas.refresh();
  }

  private generateParticleClassicTexture(): void {
    const s = 16;
    const canvas = this.textures.createCanvas('classic__particle', s, s)!;
    const ctx = canvas.getContext();
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, s, s);
    canvas.refresh();
  }

  /* ------------------------------------------------------------------ */
  /*  CHARACTERS (Roster)                                               */
  /* ------------------------------------------------------------------ */
  private generateCharacterTextures(): void {
    const w = 72, h = 96;
    
    // Base helper to draw a modern stylized character given primary and secondary colors
    const drawChar = (ctx: CanvasRenderingContext2D, state: 'idle' | 'run' | 'jump' | 'fall', color1: string, color2: string, glowColor: string, isBulky: boolean = false) => {
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 15;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 4;

      let headY = 10, headRot = 0;
      let armLY = 40, armRY = 40, armLRot = 0, armRRot = 0;
      let legLY = 70, legRY = 70;
      let torsoScaleY = 1;

      if (state === 'run') {
        headY = 12; headRot = 0.1;
        armLY = 35; armLRot = 0.5;
        armRY = 35; armRRot = -0.5;
        legLY = 65; legRY = 75;
      } else if (state === 'jump') {
        headY = 5; torsoScaleY = 1.1;
        armLY = 20; armLRot = -2;
        armRY = 20; armRRot = 2;
        legLY = 75; legRY = 80;
      } else if (state === 'fall') {
        headY = 8;
        armLY = 10; armLRot = -2.5;
        armRY = 10; armRRot = 2.5;
        legLY = 65; legRY = 65;
      }

      ctx.save();
      
      const drawLeg = (lx: number, ly: number, color: string) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(lx, ly, isBulky ? 14 : 10, 22, 6);
        ctx.fill();
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.roundRect(lx - 2, ly + 16, isBulky ? 20 : 16, 10, 4);
        ctx.fill();
      };
      
      // Back leg & back arm
      drawLeg(20, legLY, '#1e293b');
      
      ctx.save();
      ctx.translate(22, armLY);
      ctx.rotate(armLRot);
      ctx.fillStyle = color2;
      ctx.beginPath(); ctx.roundRect(-5, 0, isBulky ? 12 : 8, 26, 5); ctx.fill();
      ctx.restore();

      // Torso
      ctx.save();
      ctx.translate(w/2, 45);
      ctx.scale(1, torsoScaleY);
      const torsoGrad = ctx.createLinearGradient(0, -20, 0, 20);
      torsoGrad.addColorStop(0, color1);
      torsoGrad.addColorStop(1, color2);
      ctx.fillStyle = torsoGrad;
      ctx.beginPath();
      ctx.roundRect(isBulky ? -16 : -12, -20, isBulky ? 32 : 24, 40, 10);
      ctx.fill();
      ctx.shadowBlur = 10;
      ctx.shadowColor = glowColor;
      ctx.fillStyle = glowColor;
      ctx.beginPath(); ctx.arc(0, -5, 6, 0, Math.PI*2); ctx.fill();
      ctx.restore();

      // Front leg
      drawLeg(40, legRY, '#334155');

      // Head
      ctx.save();
      ctx.translate(w/2, headY);
      ctx.rotate(headRot);
      const headGrad = ctx.createLinearGradient(-15, 0, 15, 30);
      headGrad.addColorStop(0, color1);
      headGrad.addColorStop(1, color2);
      ctx.fillStyle = headGrad;
      ctx.beginPath();
      ctx.roundRect(isBulky ? -18 : -14, 0, isBulky ? 36 : 28, isBulky ? 36 : 28, 12);
      ctx.fill();
      
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 15;
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.roundRect(0, 8, 18, 12, 4); ctx.fill();
      ctx.fillStyle = glowColor;
      ctx.beginPath(); ctx.roundRect(4, 10, 12, 8, 3); ctx.fill();
      ctx.restore();

      // Front Arm
      ctx.save();
      ctx.translate(50, armRY);
      ctx.rotate(armRRot);
      ctx.fillStyle = color1;
      ctx.beginPath(); ctx.roundRect(-6, 0, isBulky ? 14 : 10, 28, 6); ctx.fill();
      ctx.fillStyle = '#333';
      ctx.beginPath(); ctx.roundRect(-8, 22, 16, 10, 4); ctx.fill();
      ctx.restore();

      ctx.restore();
    };

    const states: ('idle'|'run'|'jump'|'fall')[] = ['idle', 'run', 'jump', 'fall'];
    for (const state of states) {
      // Delta: Orange/Yellow themes, bulky
      const canvasDelta = this.textures.createCanvas(`char_delta_${state}`, w, h)!;
      drawChar(canvasDelta.getContext(), state, '#fb923c', '#c2410c', 'rgba(251, 146, 60, 0.5)', true);
      canvasDelta.refresh();

      // Nova: Purple/Magenta themes, sleek
      const canvasNova = this.textures.createCanvas(`char_nova_${state}`, w, h)!;
      drawChar(canvasNova.getContext(), state, '#c084fc', '#7e22ce', 'rgba(192, 132, 252, 0.5)', false);
      canvasNova.refresh();

      // Rex: Green/Cyan cyber themes, sleek
      const canvasRex = this.textures.createCanvas(`char_rex_${state}`, w, h)!;
      drawChar(canvasRex.getContext(), state, '#2dd4bf', '#0f766e', 'rgba(45, 212, 191, 0.5)', false);
      canvasRex.refresh();
    }
  }

  private generateCharacterClassicTextures(): void {
    const w = 72, h = 96;
    
    const drawClassicChar = (ctx: CanvasRenderingContext2D, state: 'idle' | 'run' | 'jump' | 'fall', shirtColor: string, pantsColor: string, skinColor: string, hatColor: string) => {
      ctx.imageSmoothingEnabled = false;
      let bobY = (state === 'run') ? 4 : 0;
      if (state === 'jump') bobY = -6;
      if (state === 'fall') bobY = -4;

      ctx.save();
      ctx.translate(w/2, h/2 + bobY);
      
      // Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(-12, 40 - bobY, 24, 6);

      // Hat/Helmet
      ctx.fillStyle = hatColor;
      ctx.fillRect(-12, -36, 24, 12);
      ctx.fillRect(-16, -24, 32, 6);
      
      // Face
      ctx.fillStyle = skinColor;
      ctx.fillRect(-10, -18, 20, 16);
      
      // Eyes
      ctx.fillStyle = '#000';
      ctx.fillRect(-6, -14, 4, 4);
      ctx.fillRect(6, -14, 4, 4);
      
      // Shirt
      ctx.fillStyle = shirtColor;
      ctx.fillRect(-12, -2, 24, 20);
      
      // Pants/Overalls
      ctx.fillStyle = pantsColor;
      ctx.fillRect(-12, 18, 24, 10);
      
      // Arms
      ctx.fillStyle = shirtColor;
      if (state === 'jump' || state === 'fall') {
        ctx.fillRect(-22, -10, 10, 20);
        ctx.fillRect(12, -10, 10, 20);
      } else if (state === 'run') {
        ctx.fillRect(-20, -2, 8, 16);
        ctx.fillRect(12, -2, 8, 16);
      } else {
        ctx.fillRect(-20, -2, 8, 20);
        ctx.fillRect(12, -2, 8, 20);
      }
      
      // Hands
      ctx.fillStyle = skinColor;
      if (state === 'jump' || state === 'fall') {
        ctx.fillRect(-22, -18, 10, 8);
        ctx.fillRect(12, -18, 10, 8);
      } else if (state === 'run') {
        ctx.fillRect(-20, 14, 8, 8);
        ctx.fillRect(12, 14, 8, 8);
      } else {
        ctx.fillRect(-20, 18, 8, 8);
        ctx.fillRect(12, 18, 8, 8);
      }
      
      // Legs
      ctx.fillStyle = pantsColor;
      if (state === 'jump' || state === 'fall') {
        ctx.fillRect(-12, 28, 10, 8);
        ctx.fillRect(2, 24, 10, 8);
      } else if (state === 'run') {
        ctx.fillRect(-12, 28, 10, 10);
        ctx.fillRect(2, 28, 10, 10);
      } else {
        ctx.fillRect(-12, 28, 10, 12);
        ctx.fillRect(2, 28, 10, 12);
      }
      
      // Shoes
      ctx.fillStyle = '#222';
      if (state === 'jump' || state === 'fall') {
        ctx.fillRect(-14, 36, 12, 6);
        ctx.fillRect(0, 32, 12, 6);
      } else if (state === 'run') {
        ctx.fillRect(-14, 38, 12, 6);
        ctx.fillRect(0, 38, 12, 6);
      } else {
        ctx.fillRect(-14, 40, 12, 6);
        ctx.fillRect(2, 40, 12, 6);
      }
      ctx.restore();
    };

    const states: ('idle'|'run'|'jump'|'fall')[] = ['idle', 'run', 'jump', 'fall'];
    for (const state of states) {
      // Delta: Orange/Yellow
      const canvasDelta = this.textures.createCanvas(`classic__char_delta_${state}`, w, h)!;
      drawClassicChar(canvasDelta.getContext(), state, '#f57c00', '#ffb300', '#ffccaa', '#e65100');
      canvasDelta.refresh();

      // Nova: Purple/Magenta
      const canvasNova = this.textures.createCanvas(`classic__char_nova_${state}`, w, h)!;
      drawClassicChar(canvasNova.getContext(), state, '#8e24aa', '#e53935', '#ffccaa', '#4a148c');
      canvasNova.refresh();

      // Rex: Green/Cyan
      const canvasRex = this.textures.createCanvas(`classic__char_rex_${state}`, w, h)!;
      drawClassicChar(canvasRex.getContext(), state, '#00897b', '#00acc1', '#ffccaa', '#004d40');
      canvasRex.refresh();
    }
  }

  /* ------------------------------------------------------------------ */
  /*  TROPHY                                                            */
  /* ------------------------------------------------------------------ */
  private generateTrophyTexture(): void {
    const w = 48, h = 64;
    const canvas = this.textures.createCanvas('trophy', w, h)!;
    const ctx = canvas.getContext();

    // Premium modern glowing chalice/hourglass
    ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
    ctx.shadowBlur = 20;

    // Golden gradient
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#fef08a');
    grad.addColorStop(0.5, '#eab308');
    grad.addColorStop(1, '#a16207');
    ctx.fillStyle = grad;

    ctx.beginPath();
    // Top cup
    ctx.moveTo(8, 8);
    ctx.lineTo(w - 8, 8);
    ctx.quadraticCurveTo(w - 8, h / 2 - 4, w / 2 + 4, h / 2);
    // Base
    ctx.quadraticCurveTo(w - 8, h / 2 + 4, w - 8, h - 8);
    ctx.lineTo(8, h - 8);
    ctx.quadraticCurveTo(8, h / 2 + 4, w / 2 - 4, h / 2);
    // Back up
    ctx.quadraticCurveTo(8, h / 2 - 4, 8, 8);
    ctx.closePath();
    ctx.fill();

    // Inner glow
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.beginPath();
    ctx.arc(w / 2, h / 4, 6, 0, Math.PI * 2);
    ctx.fill();

    canvas.refresh();
  }

  private generateTrophyClassicTexture(): void {
    const w = 48, h = 64;
    const canvas = this.textures.createCanvas('classic__trophy', w, h)!;
    const ctx = canvas.getContext();

    // Pixel art style chalice
    ctx.fillStyle = '#ffaa00';
    // Top rim
    ctx.fillRect(8, 8, 32, 8);
    // Cup sides
    ctx.fillRect(12, 16, 24, 12);
    ctx.fillRect(16, 28, 16, 8);
    // Stem
    ctx.fillRect(20, 36, 8, 16);
    // Base
    ctx.fillRect(12, 52, 24, 8);

    // Highlights
    ctx.fillStyle = '#ffff55';
    ctx.fillRect(12, 8, 8, 8);
    ctx.fillRect(16, 16, 4, 12);

    canvas.refresh();
  }

  /* ------------------------------------------------------------------ */
  /*  FIRE AND LAVA                                                     */
  /* ------------------------------------------------------------------ */
  private generateFireLavaTextures(): void {
    // Fire (64x64 repeating tile)
    const w = 64, h = 64;
    const fireCanvas = this.textures.createCanvas('fire', w, h)!;
    const fctx = fireCanvas.getContext();
    
    // Base heat gradient
    const fGrad = fctx.createLinearGradient(0, h/2, 0, h);
    fGrad.addColorStop(0, 'rgba(252, 165, 16, 0)');
    fGrad.addColorStop(0.5, 'rgba(239, 68, 68, 0.6)');
    fGrad.addColorStop(1, 'rgba(127, 29, 29, 0.9)');
    fctx.fillStyle = fGrad;
    fctx.fillRect(0, 0, w, h);

    // Render wavy flame vectors
    fctx.fillStyle = '#f97316';
    fctx.shadowColor = '#facc15';
    fctx.shadowBlur = 10;
    fctx.beginPath();
    fctx.moveTo(0, h);
    for (let i = 0; i <= w; i += 16) {
      fctx.lineTo(i, h - 20 - Math.random() * 24);
    }
    fctx.lineTo(w, h);
    fctx.fill();

    // Core bright heat
    fctx.fillStyle = '#fef08a';
    fctx.shadowBlur = 0;
    fctx.beginPath();
    fctx.moveTo(0, h);
    for (let i = 0; i <= w; i += 16) {
      fctx.lineTo(i, h - 10 - Math.random() * 12);
    }
    fctx.lineTo(w, h);
    fctx.fill();

    fireCanvas.refresh();

    // Lava (64x64 repeating tile)
    const lavaCanvas = this.textures.createCanvas('lava', w, h)!;
    const lctx = lavaCanvas.getContext();
    
    lctx.fillStyle = '#7f1d1d';
    lctx.fillRect(0, 0, w, h);

    // Molten surface
    const lGrad = lctx.createLinearGradient(0, 0, 0, 20);
    lGrad.addColorStop(0, '#f97316');
    lGrad.addColorStop(1, '#991b1b');
    lctx.fillStyle = lGrad;
    lctx.fillRect(0, 0, w, 24);

    // Hot bubbles/crust
    lctx.fillStyle = '#facc15';
    lctx.shadowColor = '#f97316';
    lctx.shadowBlur = 8;
    for (let i = 0; i < 8; i++) {
      lctx.beginPath();
      lctx.arc(Math.random() * w, Math.random() * 24, 2 + Math.random() * 4, 0, Math.PI * 2);
      lctx.fill();
    }
    lavaCanvas.refresh();
  }

  private generateFireLavaClassicTextures(): void {
    const w = 64, h = 64;
    // Classic Fire
    const fireCanvas = this.textures.createCanvas('classic__fire', w, h)!;
    const fctx = fireCanvas.getContext();
    
    fctx.fillStyle = '#d32f2f'; // Red base
    fctx.fillRect(0, h/2, w, h/2);
    
    fctx.fillStyle = '#ff9800'; // Orange flames
    for (let i = 0; i < w; i += 8) {
      const spikeH = 16 + Math.floor(Math.random() * 16);
      fctx.fillRect(i, h - spikeH - 16, 8, spikeH);
    }
    fctx.fillStyle = '#ffea00'; // Yellow core
    for (let i = 0; i < w; i += 8) {
      const spikeH = 8 + Math.floor(Math.random() * 16);
      fctx.fillRect(i + 2, h - spikeH, 4, spikeH);
    }
    fireCanvas.refresh();

    // Classic Lava
    const lavaCanvas = this.textures.createCanvas('classic__lava', w, h)!;
    const lctx = lavaCanvas.getContext();
    
    lctx.fillStyle = '#b71c1c';
    lctx.fillRect(0, 0, w, h);
    
    lctx.fillStyle = '#ff5722';
    lctx.fillRect(0, 0, w, 16);
    
    lctx.fillStyle = '#ffeb3b';
    for (let i = 0; i < 6; i++) {
      lctx.fillRect(Math.floor(Math.random() * (w/8))*8, Math.floor(Math.random() * 2)*8, 8, 8);
    }
    lavaCanvas.refresh();
  }

  /* ------------------------------------------------------------------ */
  /*  TRANSITION SEQUENCE                                               */
  /* ------------------------------------------------------------------ */
  private generateTransitionTextures(): void {
    // Premium dark metallic brick for Modern
    const bw = 64, bh = 64;
    const brickCanvas = this.textures.createCanvas('transition_brick', bw, bh)!;
    const bctx = brickCanvas.getContext();
    
    const bGrad = bctx.createLinearGradient(0, 0, 0, bh);
    bGrad.addColorStop(0, '#1e293b');
    bGrad.addColorStop(1, '#0f172a');
    bctx.fillStyle = bGrad;
    bctx.fillRect(0, 0, bw, bh);
    
    bctx.strokeStyle = '#334155';
    bctx.lineWidth = 2;
    bctx.strokeRect(0, 0, bw, bh/2);
    bctx.strokeRect(bw/2, bh/2, bw, bh/2);
    bctx.strokeRect(-bw/2, bh/2, bw, bh/2);
    brickCanvas.refresh();

    // Neon blue brick for Classic
    const cBrickCanvas = this.textures.createCanvas('classic__transition_brick', bw, bh)!;
    const cbctx = cBrickCanvas.getContext();
    cbctx.fillStyle = '#000088';
    cbctx.fillRect(0, 0, bw, bh);
    cbctx.fillStyle = '#0000ff';
    cbctx.fillRect(0, 0, bw, 4);
    cbctx.fillRect(0, bh/2, bw, 4);
    cbctx.fillRect(0, 0, 4, bh/2);
    cbctx.fillRect(bw/2, bh/2, 4, bh/2);
    cBrickCanvas.refresh();

    // Light ray mask (triangle gradient)
    const rw = 256, rh = 256;
    const rayCanvas = this.textures.createCanvas('transition_light_ray', rw, rh)!;
    const rctx = rayCanvas.getContext();
    
    const rGrad = rctx.createLinearGradient(0, 0, rw, 0);
    rGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    rGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    rctx.fillStyle = rGrad;
    rctx.beginPath();
    rctx.moveTo(0, rh/2);
    rctx.lineTo(rw, 0);
    rctx.lineTo(rw, rh);
    rctx.closePath();
    rctx.fill();
    rayCanvas.refresh();

    // Radial gradient background for Modern transition
    const bgCanvas = this.textures.createCanvas('transition_bg_gradient', 512, 512)!;
    const bgctx = bgCanvas.getContext();
    const bgGrad = bgctx.createRadialGradient(256, 256, 0, 256, 256, 350);
    bgGrad.addColorStop(0, '#1e1b4b'); // Deep indigo
    bgGrad.addColorStop(1, '#020617'); // Dark slate
    bgctx.fillStyle = bgGrad;
    bgctx.fillRect(0, 0, 512, 512);
    bgCanvas.refresh();
  }
}
