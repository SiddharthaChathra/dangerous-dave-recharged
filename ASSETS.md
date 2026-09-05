# Asset Credits — Dangerous Dave: Recharged

## Visual Assets

All visual assets in this game are **procedurally generated at runtime** using the HTML5 Canvas API.
No external image files, sprite sheets, or ripped assets are used.

- **Player sprites**: Generated in `PreloadScene.ts` — pixel-art character drawn programmatically
- **Enemy sprites**: Generated in `PreloadScene.ts` — 3 distinct enemy types with unique colors
- **Collectibles**: Diamond-shaped gems and secret gems, drawn via Canvas path operations
- **Platforms**: Tiled ground with brick pattern, moving platforms with rivets, falling platforms with warning stripes
- **Hazards**: Triangular spike formations
- **Checkpoints**: Flag on pole with inactive/active states
- **Goal door**: Arched doorway with warm inner glow
- **Backgrounds**: Parallax layers using Phaser rectangles with procedural environmental decorations

## Audio Assets

All audio is **synthesized at runtime** using the Web Audio API (OscillatorNode + GainNode).
No audio sample files (`.mp3`, `.wav`, `.ogg`) are used or loaded.

- Jump, collect, damage, enemy defeat, checkpoint, level complete, and UI click sounds
- Background ambient music via procedural arpeggio synthesis

## Fonts

- **Orbitron** — Google Fonts, OFL (Open Font License)
- **Inter** — Google Fonts, OFL (Open Font License)

Both fonts are loaded from Google Fonts CDN and are licensed under the
[SIL Open Font License](https://scripts.sil.org/OFL).

## License Summary

| Asset Category | Source | License |
|---------------|--------|---------|
| All sprites | Procedurally generated (Canvas API) | MIT (part of this project) |
| All audio | Procedurally generated (Web Audio API) | MIT (part of this project) |
| Orbitron font | Google Fonts | SIL OFL |
| Inter font | Google Fonts | SIL OFL |
| Level designs | Original | MIT (part of this project) |

No copyrighted, proprietary, or externally-sourced game assets are included in this project.
