// The Gloomlord — a crowned wisp-king that rises on boss nights (4 and 8).
// One job: the boss's own numbers and shape. The world (world.js) decides
// when it appears, when it pulses and how it dies; this module only says
// what it is. A boss is a wisp with a crown: it lives in state.wisps, drifts
// for the hearth like any wisp, and the night cannot clear while it stands.
import { BOSS, bossDefForNight, bossName } from './config.js';

// A fresh Gloomlord at (x, y) for a night. pulseTimer counts down to its
// next gloom pulse (a call that births minions); pulseFlash is the fading
// shockwave ring the renderer draws after a pulse.
export function makeBoss(rng, night, x, y) {
  const def = bossDefForNight(night);
  return {
    kind: 'gloomlord',
    name: bossName(night),
    x, y,
    hp: def.hp, maxHp: def.hp,
    speed: def.speed, radius: def.radius,
    score: def.score, fuelHit: def.fuelHit,
    wobble: rng.range(0, Math.PI * 2),
    wobbleSpeed: rng.range(0.8, 1.4),
    auraTimer: 0,
    lastDashHit: 0,
    flash: 0,
    life: 0,
    pulseTimer: BOSS.pulseInterval,
    pulseFlash: 0,
  };
}

// Is this wisp the Gloomlord? The world, the renderer and the autopilot all
// ask the same question, so it lives here, next to the boss's numbers.
export function isBoss(wisp) {
  return wisp && wisp.kind === 'gloomlord';
}

// How much a flare hurts a wisp. Frail wisps burn at once; brutes and the
// Gloomlord take a few hits — and the shop's Ember Rounds make flares hit
// tougher wisps harder still.
export function flareDamageTo(wisp, shopRounds) {
  if (wisp.kind === 'gloomlord') return 3 + (shopRounds || 0);
  if (wisp.kind === 'brute') return 2 + (shopRounds || 0);
  return 99;
}

// How much a dash strike hurts a wisp. Same rule as the flare, minus one.
export function dashDamageTo(wisp) {
  if (wisp.kind === 'gloomlord') return 2;
  if (wisp.kind === 'brute') return 2;
  return 99;
}
