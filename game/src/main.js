// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps, and the renderer paints what is there. The game moves between
// six screens: title, play, boon choice, paused, game over and dawn (win).
//
// ?seed=N fixes the night's pattern. ?shot=start|play|boon|end (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, FIELD, STEP } from './config.js';
import { createRandom } from './random.js';
import { createAudio } from './audio.js';
import {
  ACTION_CONFIRM, ACTION_DASH, ACTION_FLARE, ACTION_MUTE, ACTION_PAUSE, createInput,
} from './input.js';
import {
  EVENT_BANISH, EVENT_DASH, EVENT_FLARE, EVENT_HEARTH_HIT, EVENT_NIGHT_CLEAR,
  EVENT_OVER, EVENT_PICKUP, EVENT_WIN, createWorld,
} from './world.js';
import {
  SCREEN_BOON, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN, createRenderer,
} from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();
window.__emberkeeper = { world, state: world.state };

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    audio.unlock();
    announce(`Playing. Night 1 of 8. Keep the hearth burning.`);
  }

  function finishGame(won) {
    screen = won ? SCREEN_WIN : SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    if (won) audio.win();
    else audio.lose();
    announce(won
      ? `Dawn breaks. You survived all eight nights. Score ${world.state.score}. Best ${best}.`
      : `Game over. The light faded on night ${world.state.night}. Score ${world.state.score}. Best ${best}.`);
  }

  function playSounds(result) {
    if (result.mask & EVENT_BANISH) audio.banish(result.combo);
    if (result.mask & EVENT_PICKUP) audio.pickup();
    if (result.mask & EVENT_HEARTH_HIT) audio.hearthHit();
    if (result.mask & EVENT_FLARE) audio.flare();
    if (result.mask & EVENT_DASH) audio.dash();
    if (result.mask & EVENT_NIGHT_CLEAR) audio.boon();
  }

  function stepPlay(actions) {
    const move = input.direction();
    let stepActions = 0;
    if (actions & ACTION_DASH) stepActions |= 1;
    if (actions & ACTION_FLARE) stepActions |= 2;
    const result = world.step(STEP, move, stepActions);
    playSounds(result);
    if (result.mask & EVENT_OVER) finishGame(false);
    else if (result.mask & EVENT_WIN) finishGame(true);
    else if (result.mask & EVENT_NIGHT_CLEAR) {
      screen = SCREEN_BOON;
      announce(`Night ${world.state.night} is clear. Choose a boon.`);
    }
  }

  function chooseBoon(index) {
    const choices = world.state.boonChoices;
    if (index < 0 || index >= choices.length) return;
    const boon = choices[index];
    world.applyBoon(boon.id);
    audio.boon();
    audio.nightStart();
    screen = SCREEN_PLAY;
    announce(`Night ${world.state.night}. Boon chosen: ${boon.name}.`);
  }

  function boonCardAt(mouse) {
    if (world.state.boonChoices.length === 0) return -1;
    const cardWidth = 250;
    const cardHeight = 170;
    const gap = 24;
    const total = cardWidth * 3 + gap * 2;
    const startX = (FIELD.width - total) / 2;
    const top = 200;
    const scaleX = FIELD.width / canvas.clientWidth;
    const scaleY = FIELD.height / canvas.clientHeight;
    const x = mouse.x * scaleX;
    const y = mouse.y * scaleY;
    if (y < top || y > top + cardHeight) return -1;
    for (let i = 0; i < 3; i += 1) {
      const cardX = startX + i * (cardWidth + gap);
      if (x >= cardX && x <= cardX + cardWidth) return i;
    }
    return -1;
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Sound off.' : 'Sound on.');
    }
    if (screen === SCREEN_TITLE) {
      if (actions & (ACTION_CONFIRM | ACTION_DASH | ACTION_FLARE)) startGame();
    } else if (screen === SCREEN_OVER || screen === SCREEN_WIN) {
      if (actions & (ACTION_CONFIRM | ACTION_DASH | ACTION_FLARE)) startGame();
      // R restarts too; it arrives as a keydown the input layer does not map, so
      // listen for it directly on the window (see below).
    } else if (screen === SCREEN_PAUSED) {
      if (actions & (ACTION_PAUSE | ACTION_CONFIRM)) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    } else if (screen === SCREEN_BOON) {
      if (actions & ACTION_CONFIRM) {
        const card = boonCardAt(input.mousePosition());
        if (card >= 0) chooseBoon(card);
      }
    } else if (screen === SCREEN_PLAY) {
      if (actions & ACTION_PAUSE) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      }
    }
    return actions;
  }

  function handleBoonKeys(event) {
    if (screen !== SCREEN_BOON) return;
    if (event.code === 'Digit1') chooseBoon(0);
    else if (event.code === 'Digit2') chooseBoon(1);
    else if (event.code === 'Digit3') chooseBoon(2);
  }

  function handleRestartKey(event) {
    if ((screen === SCREEN_OVER || screen === SCREEN_WIN) && event.code === 'KeyR') startGame();
  }

  window.addEventListener('keydown', handleBoonKeys);
  window.addEventListener('keydown', handleRestartKey);

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = handleActions();
    if (screen === SCREEN_TITLE) {
      while (accumulator >= STEP) {
        world.stepAmbient(STEP);
        accumulator -= STEP;
      }
    } else if (screen === SCREEN_PLAY) {
      // Edge-triggered actions (dash, flare) fire on the first step only, so one
      // key press never dashes or flares twice in a slow frame.
      let firstStep = true;
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        stepPlay(firstStep ? actions : 0);
        firstStep = false;
        accumulator -= STEP;
      }
      if (screen !== SCREEN_PLAY) accumulator = 0;
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Emberkeeper. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
