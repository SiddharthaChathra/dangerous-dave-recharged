# Asset Sourcing & Licensing

All assets in this project are original, created specifically for
Dangerous Dave: Recharged. No assets, source code, levels, or branding
from the original 1988 "Dangerous Dave" are used anywhere in this project.

## Visuals

Sprites (player, enemies, tiles, collectibles) are simple original
shapes/tints rendered via Phaser primitives and the built-in white-pixel
texture, authored directly in code (see `src/game/entities/`). No external
image files are downloaded or bundled.

## Audio

All sound effects and music are generated at runtime using the Web Audio
API (oscillator-based synthesis) in `src/game/systems/AudioSystem.ts`. No
sampled/recorded audio files are used, so there is nothing to license.

## Fonts

System font stack only (`system-ui, sans-serif`) — no bundled font files.

## License

Project code is original work. See `README.md` for the project license.
