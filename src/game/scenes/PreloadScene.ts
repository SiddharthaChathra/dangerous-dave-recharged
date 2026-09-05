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
    this.generateGemTexture();
    this.generateSecretTexture();
    this.generateEnemyTextures();
    this.generateSpikeTexture();
    this.generateCheckpointTexture();
    this.generatePlatformTextures();
    this.generateGoalTexture();
    this.generateParticleTexture();
    
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

  /* ------------------------------------------------------------------ */
  /*  ENEMIES                                                           */
  /* ------------------------------------------------------------------ */
  private generateEnemyTextures(): void {
    this.generateEnemySprite('enemy_patrol', '#f97316', '#fdba74', 'rgba(249, 115, 22, 0.6)');
    this.generateEnemySprite('enemy_flying', '#a855f7', '#d8b4fe', 'rgba(168, 85, 247, 0.6)');
    this.generateEnemySprite('enemy_chase', '#dc2626', '#fca5a5', 'rgba(220, 38, 38, 0.6)');
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

  /* ------------------------------------------------------------------ */
  /*  CHECKPOINT                                                        */
  /* ------------------------------------------------------------------ */
  private generateCheckpointTexture(): void {
    const w = 32, h = 80;
    const canvas = this.textures.createCanvas('checkpoint', w, h)!;
    const ctx = canvas.getContext();
    // Pole
    const poleGrad = ctx.createLinearGradient(0, 0, 10, 0);
    poleGrad.addColorStop(0, '#52525b');
    poleGrad.addColorStop(1, '#27272a');
    ctx.fillStyle = poleGrad;
    ctx.fillRect(10, 0, 8, h);
    // Inactive antenna orb
    ctx.fillStyle = '#52525b';
    ctx.beginPath(); ctx.arc(14, 8, 6, 0, Math.PI*2); ctx.fill();
    canvas.refresh();

    // Active checkpoint (Neon green glow)
    const activeCanvas = this.textures.createCanvas('checkpoint_active', w, h)!;
    const actx = activeCanvas.getContext();
    actx.fillStyle = poleGrad;
    actx.fillRect(10, 0, 8, h);
    
    actx.shadowColor = '#00ff88';
    actx.shadowBlur = 20;
    actx.fillStyle = '#00ff88';
    actx.beginPath(); actx.arc(14, 8, 8, 0, Math.PI*2); actx.fill();
    
    // Glowing laser lines down the pole
    actx.fillStyle = '#00ff88';
    actx.fillRect(13, 20, 2, h-20);
    activeCanvas.refresh();
  }

  /* ------------------------------------------------------------------ */
  /*  PLATFORMS                                                         */
  /* ------------------------------------------------------------------ */
  private generatePlatformTextures(): void {
    const s = 64; // 2x original size
    const groundCanvas = this.textures.createCanvas('platform_tile', s, s)!;
    const gctx = groundCanvas.getContext();
    
    // Base block
    gctx.fillStyle = '#18181b';
    gctx.fillRect(0, 0, s, s);
    
    // Top neon trim (sci-fi floor look)
    gctx.fillStyle = '#00f0ff';
    gctx.fillRect(0, 0, s, 4);
    
    // Panel lines
    gctx.strokeStyle = '#27272a';
    gctx.lineWidth = 2;
    gctx.beginPath();
    gctx.moveTo(s/2, 4); gctx.lineTo(s/2, s);
    gctx.moveTo(0, s/2); gctx.lineTo(s, s/2);
    gctx.stroke();
    
    // Inner bevel
    gctx.strokeStyle = '#3f3f46';
    gctx.strokeRect(4, 8, s/2 - 8, s/2 - 12);
    gctx.strokeRect(s/2 + 4, 8, s/2 - 8, s/2 - 12);
    groundCanvas.refresh();

    // Moving platform
    const mpCanvas = this.textures.createCanvas('moving_platform', 200, 32)!;
    const mpctx = mpCanvas.getContext();
    const mpGrad = mpctx.createLinearGradient(0, 0, 0, 32);
    mpGrad.addColorStop(0, '#52525b');
    mpGrad.addColorStop(1, '#27272a');
    mpctx.fillStyle = mpGrad;
    mpctx.roundRect(0, 0, 200, 32, 8);
    mpctx.fill();
    
    // Hover engines glowing below
    mpctx.shadowColor = '#00f0ff';
    mpctx.shadowBlur = 15;
    mpctx.fillStyle = '#00f0ff';
    mpctx.beginPath(); mpctx.arc(40, 28, 6, 0, Math.PI*2); mpctx.fill();
    mpctx.beginPath(); mpctx.arc(160, 28, 6, 0, Math.PI*2); mpctx.fill();
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

  /* ------------------------------------------------------------------ */
  /*  GOAL (level exit)                                                 */
  /* ------------------------------------------------------------------ */
  private generateGoalTexture(): void {
    const w = 80, h = 160;
    const canvas = this.textures.createCanvas('goal_door', w, h)!;
    const ctx = canvas.getContext();
    
    // Frame
    const frameGrad = ctx.createLinearGradient(0, 0, w, 0);
    frameGrad.addColorStop(0, '#18181b');
    frameGrad.addColorStop(0.5, '#3f3f46');
    frameGrad.addColorStop(1, '#18181b');
    ctx.fillStyle = frameGrad;
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, 40); // heavily rounded top
    ctx.fill();

    // Portal inner space
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.roundRect(8, 8, w-16, h-8, 32);
    ctx.fill();

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
}
