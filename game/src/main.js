// Emberkeeper v2 — the browser entry: canvas, loop, screens, input wiring.
// The world (world.js) owns the rules; the renderer (render.js) owns the
// pixels; this file owns the frame loop and the screen state machine.
// One action queue per frame: frame() takes the actions once and hands them
// to the first fixed step, so a key press can never fire twice in one frame.
import {
  BEST_KEY, STEP,
} from './config.js';
import {
  EVENT_BANISH, EVENT_BOSS, EVENT_DASH, EVENT_FLARE, EVENT_HEARTH_HIT,
  EVENT_NIGHT_CLEAR, EVENT_OVER, EVENT_PICKUP, EVENT_WIN,
  createWorld, createWorldWithSeed,
} from './world.js';
import { createRenderer } from './render.js';
import {
  ACTION_BUILD, ACTION_CONFIRM, ACTION_DASH, ACTION_FLARE,
  ACTION_MUTE, ACTION_PAUSE, ACTION_RESTART, createInput,
} from './input.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';
import { canPlaceBrazier } from './braziers.js';
import { SHOP_TRACKS, shopBeginAt, shopRowAt } from './shop.js';

const canvas = document.querySelector('canvas');
const renderer = createRenderer(canvas);
const input = createInput(canvas);
const audio = createAudio();

let world = createWorld();
let screen = renderer.SCREEN_TITLE;
let buildMode = false;
let hoverBoon = -1;
let hoverShop = -1;
let hoverShopBegin = false;
let lastTime = 0;
let acc = 0;
// Edge-triggered actions are never dropped: a frame that runs zero fixed
// steps (short dt after a long frame) must not swallow a key press. Fresh
// actions accumulate here and are cleared only by the branch that consumes
// them — the play branch clears them on its first fixed step.
let pendingActions = 0;
let best = 0;
try { best = Number(localStorage.getItem(BEST_KEY) || 0) || 0; } catch (e) { best = 0; }
world.state.best = best;

function saveBest() {
  if (world.state.score > best) {
    best = world.state.score;
    world.state.best = best;
    try { localStorage.setItem(BEST_KEY, String(best)); } catch (e) { /* private mode */ }
  }
}

function startRun() {
  world = createWorld();
  world.state.best = best;
  screen = renderer.SCREEN_PLAY;
  buildMode = false;
  pendingActions = 0;
  world.state.banner = { text: 'NIGHT 1', timer: 2.6 };
  audio.unlock();
  audio.nightStart();
}

function endRun(won) {
  saveBest();
  screen = won ? renderer.SCREEN_WIN : renderer.SCREEN_OVER;
  buildMode = false;
  if (won) audio.win(); else audio.lose();
}

function boonCardAt(x, y) {
  const choices = world.state.boonChoices || [];
  if (!choices.length) return -1;
  const cw = 250;
  const ch = 170;
  const gap = 24;
  const total = choices.length * cw + (choices.length - 1) * gap;
  const x0 = (960 - total) / 2;
  const yy = 190;
  for (let i = 0; i < choices.length; i++) {
    const xx = x0 + i * (cw + gap);
    if (x >= xx && x <= xx + cw && y >= yy && y <= yy + ch) return i;
  }
  return -1;
}

function chooseBoon(i) {
  const choices = world.state.boonChoices || [];
  if (i < 0 || i >= choices.length) return;
  const id = choices[i].id;
  audio.boon();
  world.applyBoon(id);
  // The boon is in hand; now the hearth shop opens before the next night.
  screen = renderer.SCREEN_SHOP;
  hoverBoon = -1;
}

// Buy one level of a shop track (by row). A failed buy is silent — the
// row's price tag already shows whether the keeper can afford it.
function buyShopRow(i) {
  const track = SHOP_TRACKS[i];
  if (!track) return;
  if (world.buyShop(track.id).ok) audio.buy();
}

// Leave the shop and begin the next night.
function beginNight() {
  if (world.beginNextNight()) {
    screen = renderer.SCREEN_PLAY;
    hoverShop = -1;
    hoverShopBegin = false;
    audio.nightStart();
  }
}

function playStep(dt, actions) {
  const dir = input.direction();
  // A click in play is a flare — unless build mode is on, where it plants.
  let stepActions = 0;
  if (actions & ACTION_DASH) stepActions |= ACTION_DASH;
  if (actions & ACTION_FLARE) stepActions |= ACTION_FLARE;
  if (buildMode) {
    const click = input.clickPosition();
    if (click) {
      const placed = world.placeBrazier(click.x, click.y);
      if (placed.ok) {
        audio.flare();
        if (world.state.embers < world.brazierCost()) buildMode = false;
      }
    }
  } else {
    const click = input.clickPosition();
    if (click) stepActions |= ACTION_FLARE;
  }
  const result = world.step(dt, dir, stepActions);
  const mask = result.mask;
  if (mask & EVENT_BANISH) audio.banish();
  if (mask & EVENT_PICKUP) audio.pickup();
  if (mask & EVENT_DASH) audio.dash();
  if (mask & EVENT_FLARE) audio.flare();
  if (mask & EVENT_HEARTH_HIT) audio.hearthHit();
  if (mask & EVENT_BOSS) audio.boss();
  if (mask & EVENT_WIN) { endRun(true); return; }
  if (mask & EVENT_NIGHT_CLEAR) {
    screen = renderer.SCREEN_BOON;
    audio.nightStart();
    return;
  }
  if (mask & EVENT_OVER) { endRun(false); return; }
  // Screen-level keys, handled after the step so a pause never eats a frame.
  if (actions & ACTION_MUTE) audio.toggleMute();
  if (actions & ACTION_PAUSE) { screen = renderer.SCREEN_PAUSED; return; }
  if (actions & ACTION_BUILD) { buildMode = !buildMode; return; }
  if (actions & ACTION_RESTART) { startRun(); return; }
}

function frame(t) {
  requestAnimationFrame(frame);
  const now = t || 0;
  const dt = Math.min(0.1, Math.max(0, (now - lastTime) / 1000 || 0));
  lastTime = now;
  const time = now / 1000;
  pendingActions |= input.takeActions();
  const actions = pendingActions;

  if (screen === renderer.SCREEN_TITLE) {
    world.stepAmbient(dt);
    pendingActions = 0;
    if (actions & ACTION_CONFIRM) { startRun(); return; }
    if (actions & ACTION_MUTE) audio.toggleMute();
    const click = input.clickPosition();
    if (click) { startRun(); return; }
  } else if (screen === renderer.SCREEN_PLAY) {
    acc += dt;
    let first = true;
    while (acc >= STEP) {
      playStep(STEP, first ? actions : 0);
      if (first) pendingActions = 0;
      first = false;
      acc -= STEP;
      if (screen !== renderer.SCREEN_PLAY) { acc = 0; break; }
    }
  } else if (screen === renderer.SCREEN_BOON) {
    const mouse = input.mousePosition();
    hoverBoon = boonCardAt(mouse.x, mouse.y);
    pendingActions = 0;
    const click = input.clickPosition();
    if (click) {
      const i = boonCardAt(click.x, click.y);
      if (i >= 0) { chooseBoon(i); return; }
    }
    if (actions & ACTION_CONFIRM) { chooseBoon(hoverBoon >= 0 ? hoverBoon : 0); return; }
    if (actions & ACTION_MUTE) audio.toggleMute();
  } else if (screen === renderer.SCREEN_SHOP) {
    const mouse = input.mousePosition();
    hoverShop = shopRowAt(mouse.x, mouse.y);
    hoverShopBegin = shopBeginAt(mouse.x, mouse.y);
    pendingActions = 0;
    const click = input.clickPosition();
    if (click) {
      const i = shopRowAt(click.x, click.y);
      if (i >= 0) { buyShopRow(i); return; }
      if (shopBeginAt(click.x, click.y)) { beginNight(); return; }
    }
    if (actions & ACTION_CONFIRM) { beginNight(); return; }
    if (actions & ACTION_MUTE) audio.toggleMute();
  } else if (screen === renderer.SCREEN_PAUSED) {
    pendingActions = 0;
    if (actions & ACTION_PAUSE) { screen = renderer.SCREEN_PLAY; return; }
    if (actions & ACTION_MUTE) audio.toggleMute();
    if (actions & ACTION_RESTART) { startRun(); return; }
    input.clickPosition();
  } else if (screen === renderer.SCREEN_WIN || screen === renderer.SCREEN_OVER) {
    pendingActions = 0;
    if (actions & ACTION_RESTART) { startRun(); return; }
    if (actions & ACTION_CONFIRM) { startRun(); return; }
    const click = input.clickPosition();
    if (click) { startRun(); return; }
    if (actions & ACTION_MUTE) audio.toggleMute();
  }

  // Build-mode ghost validity for the renderer.
  let buildOk = true;
  if (buildMode && screen === renderer.SCREEN_PLAY) {
    const mouse = input.mousePosition();
    const check = canPlaceBrazier(
      world.state.braziers, mouse.x, mouse.y, world.state.mods.brazierSlots,
    );
    buildOk = check.ok && world.state.embers >= world.brazierCost();
  }
  const ui = {
    buildMode: buildMode && screen === renderer.SCREEN_PLAY,
    buildOk,
    mouse: input.mousePosition(),
    hoverBoon,
    hoverShop,
    hoverShopBegin,
  };
  renderer.draw(world.state, screen, time, ui);
}

// Number keys for boon choice (keydown is separate from the action queue).
window.addEventListener('keydown', (e) => {
  if (screen === renderer.SCREEN_BOON) {
    if (e.code === 'Digit1') chooseBoon(0);
    if (e.code === 'Digit2') chooseBoon(1);
    if (e.code === 'Digit3') chooseBoon(2);
    return;
  }
  if (screen === renderer.SCREEN_SHOP) {
    if (e.code === 'Digit1') buyShopRow(0);
    if (e.code === 'Digit2') buyShopRow(1);
    if (e.code === 'Digit3') buyShopRow(2);
    if (e.code === 'Digit4') buyShopRow(3);
  }
});

// --- shot mode (?shot=start|play|boon|shop|end&seed=N): stage a fixed scene,
// draw it once, and raise the flag the screenshot harness waits for. ---
const params = new URLSearchParams(window.location.search);
const shotKind = params.get('shot');
if (shotKind) {
  const seed = Number(params.get('seed') || 7);
  world = createWorldWithSeed(seed);
  world.state.best = best;
  const staged = stageShot(shotKind, world);
  screen = staged.screen;
  const ui = { buildMode: false, buildOk: true, mouse: { x: 0, y: 0, inside: false }, hoverBoon: -1 };
  renderer.draw(world.state, screen, 1.2, ui);
  window.__shotReady = true;
  window.__emberkeeper = {
    get state() { return world.state; },
    screen: () => screen,
    get world() { return world; },
    version: 3,
  };
} else {
  window.__emberkeeper = {
    get state() { return world.state; },
    screen: () => screen,
    get world() { return world; },
    version: 3,
  };
  requestAnimationFrame(frame);
}
