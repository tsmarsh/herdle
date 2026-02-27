# Herdle

A 2D top-down browser herding game where you control shepherd dogs to herd sheep into a pen. Each level teaches a game theory concept through mechanics — no textbooks required.

## How to Play

Open `index.html` in a browser. Select dogs with **A/S/D/F** keys, then **left-click** to set a destination. Herd all sheep into the pen to advance.

## Levels

The 10 levels form a progressive curriculum in game theory, from basic leader-follower dynamics to multi-agent equilibrium.

| Lvl | Name | Sheep | Dogs | Concept | What You Learn |
|-----|------|------:|-----:|---------|----------------|
| 1 | The Stackelberg Shepherd | 5 | 1 | Leader-follower | Sheep react to where you *are*, not where you're going. Loop behind them. |
| 2 | Best Response | 7 | 1 | Best response | Only one approach angle avoids the obstacles. Find the optimal response. |
| 3 | The Coordination Game | 10 | 2 | Coordination game | Flanking from two sides strictly dominates pushing from one. |
| 4 | Subgame Perfect | 13 | 2 | Backward induction | Two separated groups and one gap — solve the far subgame first. |
| 5 | Prisoner's Dilemma | 14 | 3 | Prisoner's dilemma | Herding one group scatters the other. Cooperate: contain one, herd the other. |
| 6 | Dominant Strategy | 12 | 2 | Dominant strategy | Three corridors, but only the middle one reaches the pen. The rest are traps. |
| 7 | Mechanism Design | 15 | 3 | Mechanism design | Obstacles form a V-funnel with gaps. Dogs *become* the mechanism by plugging them. |
| 8 | Information Cascade | 25 | 2 | Information cascade | Nudge the right edge gently. Cohesion ripples through the flock. Push too hard and they scatter. |
| 9 | Minimax | 15 | 3 | Minimax | Tight maze where wrong moves cause maximum scatter. Block the worst-case escapes first. |
| 10 | Nash Equilibrium | 20 | 4 | Nash equilibrium | Four gaps need four dogs. Once all hold position, no dog wants to deviate — and the sheep funnel in. |

## Development

```bash
npm run build    # Compile TypeScript → dist/
npm run lint     # ESLint
```

A pre-push hook runs `lint && build` automatically. The `dist/` directory is committed for GitHub Pages deployment.

## Architecture

```
src/
  game.ts        Game loop, input, state management
  entities.ts    Entity system, dog controls, sheep AI (boid flocking + FSM)
  renderer.ts    Canvas 2D procedural sprites and HUD
  levels.ts      Level definitions (obstacles, pens, spawns)
  config.ts      Dog personality config + localStorage persistence
  vector.ts      2D vector math
```
