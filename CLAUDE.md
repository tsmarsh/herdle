# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Herdle is a 2D top-down browser-based herding game built with TypeScript and Canvas 2D. Players control four shepherd dogs (Ace, Shep, Duke, Fido) to herd 20 sheep into a pen.

## Commands

| Command | What it does |
|---------|-------------|
| `npm run build` | Compile TypeScript → `dist/` |
| `npm run lint` | ESLint on `src/**/*.ts` |

There are no tests. A Husky pre-push hook runs `lint && build` automatically.

To play, open `index.html` in a browser (loads `dist/game.js` as an ES module).

## Architecture

Four TypeScript source files in `src/`, compiled to `dist/`:

```
game.ts          Game loop orchestrator
  ├── entities.ts  Entity system & AI
  ├── renderer.ts  Canvas 2D drawing
  └── vector.ts    2D vector math (shared utility)
```

**game.ts** — Initializes canvas, entities, and input handlers. Runs the `requestAnimationFrame` loop: update dogs → update sheep AI → check pen containment → render.

**entities.ts** — Base `Entity` class with physics (position, velocity, acceleration). `Dog` extends it (player-controlled, destination-seeking). `Sheep` extends it (AI-driven with FSM: GRAZING → FLOCKING → SPOOKED → PENNED). Also defines `Obstacle` (static circular colliders) and `Pen` (rectangular goal zone, bottom-right).

**renderer.ts** — Procedurally animated sprites for dogs and sheep (multi-layer wool, animated legs/tails, eyes). Draws background, obstacles, pen, HUD, and score.

**vector.ts** — 2D vector math class used throughout for physics and positioning.

## Key Design Details

- **Sheep AI** uses boid-like flocking (separation, alignment, cohesion, flee, wander, obstacle avoidance). State transitions depend on dog proximity: 150px → flocking, 60px → spooked.
- **Dog controls:** A/S/D/F selects dogs; left-click sets destination. Multiple dogs can be selected at once.
- **`dist/` is committed** for GitHub Pages deployment — keep it in sync with source.
- **ESM throughout:** `"type": "module"` in package.json, `NodeNext` resolution in tsconfig.
