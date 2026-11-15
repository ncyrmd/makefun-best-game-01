// Night modifiers — one twist per night, named on the banner and the HUD.
// Pure data helpers: the world asks which twist a night carries and what it
// changes; nothing here touches the DOM or the canvas.
import { MODIFIERS, NIGHTS } from './config.js';

// The twist for a night. Night 1 is always quiet; nights past the last one
// return the plain "none" modifier so callers never see undefined.
export function modifierForNight(night) {
  if (night <= 1 || night > NIGHTS) return MODIFIERS[0];
  return MODIFIERS[night - 1];
}

// A one-line summary for the HUD, e.g. "NIGHT 4 / 8 — THICK GLOOM".
export function modifierLabel(modifier) {
  if (!modifier || !modifier.name) return '';
  return modifier.name.toUpperCase();
}

// Every modifier in play order, for the title screen's "what to expect" list
// and for tests that want to check each night has a distinct twist.
export function listModifiers() {
  return MODIFIERS.slice(1);
}

// Combine a night modifier with the run's boon table into the multipliers the
// world actually uses for one night. Keeps the stacking rule in one place:
// boons multiply the base, the night twist multiplies on top.
export function nightMultipliers(modifier, mods) {
  const m = modifier || MODIFIERS[0];
  return {
    speedMul: (m.speedMul || 1) * (mods ? mods.speedMul : 1),
    countMul: m.countMul || 1,
    dropMul: (m.dropMul || 1) * (1 + (mods ? mods.dropBonus : 0)),
    auraTickMul: (m.auraTickMul || 1) * (mods ? mods.auraTickMul : 1),
    shardFuelBonus: (m.shardFuelBonus || 0) + (mods ? mods.emberFuelBonus : 0),
    golden: Boolean(m.golden),
  };
}

// The chance a spawned wisp is golden on a given night.
export function goldenChanceFor(night, modifier, mods) {
  const goldenFrom = mods && mods.goldenFromNight ? mods.goldenFromNight : 5;
  if (night < goldenFrom) return 0;
  if (modifier && modifier.golden) return 0.16;
  return 0.05;
}
