// The screenshot scenes behind ?shot=start|play|boon|end. Each one plays the
// real rules forward from a fresh world for a fixed number of steps, steered
// by a simple autopilot, so the frame is what a short game really looks like
// and the same seed always gives the same frame.
import { FIELD, HEARTH, STEP } from './config.js';
import { EVENT_OVER, EVENT_WIN } from './world.js';
import { SCREEN_BOON, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const START_SECONDS = 6;
const PLAY_SECONDS = 60;
const BOON_SECONDS = 200;
const END_LIMIT_SECONDS = 600;
const SAMPLE = 1 / 30;

/** Steer toward the wisp nearest the hearth (the most dangerous one), else the
 *  nearest ember; dash and flare when crowded. */
function autopilot(state, world) {
  const player = state.player;
  let target = null;
  let bestDanger = Infinity;
  for (const wisp of state.wisps) {
    const danger = Math.hypot(wisp.x - HEARTH.x, wisp.y - HEARTH.y);
    if (danger < bestDanger) {
      bestDanger = danger;
      target = wisp;
    }
  }
  if (!target) {
    let bestDistance = Infinity;
    for (const shard of state.shards) {
      const distance = Math.hypot(shard.x - player.x, shard.y - player.y);
      if (distance < bestDistance) {
        bestDistance = distance;
        target = shard;
      }
    }
  }
  if (!target) return { move: { x: 0, y: -1 }, dash: false, flare: false };
  const dx = target.x - player.x;
  const dy = target.y - player.y;
  const distance = Math.hypot(dx, dy) || 1;
  // Stop inside the lantern light instead of running through the wisp.
  const move = distance < 70 ? { x: 0, y: 0 } : { x: dx / distance, y: dy / distance };
  let nearby = 0;
  for (const wisp of state.wisps) {
    if (Math.hypot(wisp.x - player.x, wisp.y - player.y) < 120) nearby += 1;
  }
  const flare = nearby >= 3 && state.embers >= world.flareCost();
  const dash = nearby >= 2 && player.dashCooldown <= 0;
  return { move, dash, flare };
}

/** Stand still: the fire drains and the wisps reach the hearth, as a lost game does. */
function idlePilot() {
  return { move: { x: 0, y: 0 }, dash: false, flare: false };
}

function actionsOf(pilot) {
  return (pilot.dash ? 1 : 0) | (pilot.flare ? 2 : 0);
}

/**
 * Set `world` to the named scene (start, play, boon or end; any other name is
 * start) and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  const state = world.state;
  if (name !== 'play' && name !== 'boon' && name !== 'end') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) world.stepAmbient(STEP);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  const limit = name === 'end' ? END_LIMIT_SECONDS : name === 'boon' ? BOON_SECONDS : PLAY_SECONDS;
  const pilot = name === 'end' ? idlePilot : autopilot;
  for (let index = 0; index < limit / STEP; index += 1) {
    // The boon scene stops the moment the choice appears.
    if (name === 'boon' && state.boonChoices.length > 0) {
      return { screen: SCREEN_BOON, best: state.score };
    }
    // A lost game still clears nights on the lantern alone: take the first boon
    // and keep standing still, so the fire eventually dies.
    if (state.boonChoices.length > 0) world.applyBoon(state.boonChoices[0].id);
    const decision = pilot(state, world);
    const result = world.step(STEP, decision.move, actionsOf(decision));
    if (result.mask & EVENT_OVER) return { screen: SCREEN_OVER, best: state.score };
    if (result.mask & EVENT_WIN) return { screen: SCREEN_WIN, best: state.score };
    // The play scene wants mid-wave action: stop once the field is busy, while
    // the night is still running and wisps are on screen.
    if (name === 'play' && index * STEP > 8
      && ((state.spawned >= 10 && state.wisps.length >= 5)
        || (state.spawned >= 13 && state.wisps.length >= 4))) {
      return { screen: SCREEN_PLAY, best: state.score };
    }
  }
  // The boon scene never cleared in time: stage it by hand so the shot still shows it.
  if (name === 'boon') {
    world.reset();
    world.state.night = 2;
    world.state.score = 340;
    world.state.embers = 7;
    world.state.boonChoices = world.state.boonChoices.length > 0
      ? world.state.boonChoices
      : [{ id: 'wide', name: 'Wide Lantern', blurb: 'Lantern light reaches +28 farther.' },
         { id: 'swift', name: 'Swift Boots', blurb: 'Move 15% faster.' },
         { id: 'flare', name: 'Bright Flare', blurb: 'Flare is +55 wider and costs 1 less.' }];
    return { screen: SCREEN_BOON, best: 340 };
  }
  return { screen: SCREEN_PLAY, best: state.score };
}

export { FIELD, HEARTH, autopilot, idlePilot, actionsOf };
