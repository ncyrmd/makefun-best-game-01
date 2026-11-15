# Emberkeeper

[![best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![rank](https://make.fun/badge/best-game-01/ncyrmd/makefun-best-game-01/rank.svg)](https://make.fun/bounty/best-game-01)
[![reward](https://make.fun/badge/best-game-01/ncyrmd/makefun-best-game-01/reward.svg)](https://make.fun/bounty/best-game-01)

An entry for [make.fun — Make the best game](https://make.fun/bounty/best-game-01).

**Emberkeeper** — keep the last hearth burning through eight nights of gloom.
You are the keeper of the only fire left in a dark forest. Gloom wisps drift
in from the trees to steal its fuel. Your lantern burns any wisp that comes
too close; the ember shards they drop feed the fire. Survive all eight nights
and the dawn breaks.

## How to play

- **Move** — WASD or arrow keys.
- **Dash** — Space. A burst of speed that burns through wisps in your path.
- **Flare** — mouse click or F. A burst of light that banishes frail wisps
  around you. Costs 3 embers.
- **Build a brazier** — B, then click a spot. A fire bowl that burns wisps
  in its light until its fuel gutters out. Costs 5 embers.
- **Pause** — P or Esc. **Sound** — M. **Restart** — R on the end screens.

Your lantern's light slows wisps and burns them over time. Banishing wisps
builds a combo multiplier (up to x5). Wisps that reach the hearth steal fuel;
embers you gather feed it back. Clear a night and choose one of three boons —
a wider lantern, swifter boots, a brighter flare, a sturdier hearth, and more.
If the fuel runs out, the light fades and the night wins.

Four kinds of wisp stalk the fire: drifting **wisps**, quick **darts**,
**splitters** that break into two, and armoured **brutes**. From night 5,
**golden wisps** flee the keeper — banish one for 10 embers. Every night
from the second carries a twist — Ember Rain, Swift Gloom, Thick Gloom,
Golden Hour, Iron Gloom, Ember Drought, The Longest Night — named on the
night banner and in the HUD. Eleven boons can be earned between nights,
including Brazier Craft, Golden Touch and Ember Magnet.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network requests — plain static files under `game/`.
Screenshots are deterministic: `?shot=start|play|boon|end&seed=N` stages each
scene from the real rules.
