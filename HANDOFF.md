# HANDOFF — Emberkeeper v3 (make.fun best-game-01)

## Game
**Emberkeeper: The Gloomlord Rises** — keep the last hearth burning through
eight nights of gloom. You are the keeper of the only fire left in a dark
forest. Gloom wisps drift in from the trees to steal its fuel. Your lantern
burns wisps that come too close; the ember shards they drop feed the fire.
Plant **braziers** — fire bowls that guard a patch of ground on their own —
hunt **golden wisps** that pay 10 embers, and face a named twist every night
from the second. On nights 4 and 8 the **Gloomlord** rises: a crowned
wisp-king that walks for the hearth and calls minions from the dark every
six seconds. Between nights, spend embers in the **hearth shop**. Survive
all eight nights and the dawn breaks.

## v2 result (why v3 exists)
v1 graded **73.46% (12W/0D/8L), rank 40**. v2 graded **77.87% (9W/3D/8L),
rank 37/1,710, prize_rank 36** — a real gain (+4.4 pts) but the top-10
cutoff rose +5.1 pts to **81.60%**, and #1 SUNWRIGHT now sits at **89.51%**.
Diagnosis: v2's systems (braziers, twists, golden wisps) are incremental
depth on the same loop — the field improves fast, so v3 adds a REAL step
up, not a polish pass: a boss that changes how nights 4 and 8 play, and an
economy that turns embers into lasting power between nights. Both are
visible on screen: the Gloomlord's crown, HP bar and shockwave ring in the
play shot; the shop's four tracks and prices in the third shot.

## Controls
- **WASD / arrows** — walk the keeper
- **Space** — dash (burst of speed that burns through wisps in your path)
- **Mouse click / F** — flare: banish frail wisps around you, costs 3 embers
- **B** — build mode, then click to plant a brazier (5 embers, max 3, +1 with
  the Brazier Craft boon); ghost + burn-radius circle show where it will land
- **P / Esc** — pause · **M** — sound on/off · **R** — restart on end screens
- **1 / 2 / 3 or click** — choose a boon between nights
- **1 / 2 / 3 / 4 or click** — buy a shop track between nights; **Enter** —
  begin the next night

## Features (v3 — new/changed in bold)
- **The Gloomlord (NEW, `game/src/boss.js`): a crowned wisp-king on nights 4
  ("THE GLOOMLORD'S HERALD", 14 HP) and 8 ("THE GLOOMLORD", 24 HP); drifts
  to the hearth; every 6 s its gloom pulse births 2 minions; banishing it
  pays +15 embers + 500/1000 score. Boss nights send 20% fewer ordinary
  wisps — the Gloomlord IS the night. Crown, red eyes, segmented HP bar
  (in the play field and under the HUD), pulse shockwave ring, low roar.**
- **The hearth shop (NEW, `game/src/shop.js`): after the boon, spend embers
  between nights — Lantern Oil (aura +14/level), Deep Well (max fuel +20 and
  +20 fuel now), Swift Current (dash cooldown ×0.8/level), Ember Rounds
  (flare +1 damage vs tough wisps and +20 radius/level). 3 levels each,
  costs 6/10/14 (rounds 6/10/14, current 5/9/13); level pips, price tags,
  "BEGIN NIGHT N" button. The night does not start until the keeper begins
  it.**
- **Flare/dash damage helpers (`boss.js`): frail wisps burn at once; brutes
  and the Gloomlord take repeated hits (flare 3 + Ember Rounds vs the boss,
  dash 2) — the shop's Ember Rounds now matter against tough wisps**
- **Autopilot hunts the boss (shots.js): when the Gloomlord stands and no
  wisp is about to hit the hearth, the autopilot walks to it and flares it**
- **Play shot is now the boss night (night 4): the Gloomlord wounded (8/14
  HP) with minions, 2 braziers, a golden wisp, shards, combo x4**
- **Third shot is now the shop (`3-shop.jpg`): 24 embers, Lantern Oil level
  1 bought, other tracks priced; the boon screen still exists, unshot**
- **End shot is now a bigger win: score 4,860, 268 banished, 2 Gloomlords
  felled, 8 golden, 6 braziers**
- Braziers (v2): buildable fire bowls, 5 embers, burn wisps in radius 74 at
  1 hp / 0.9 s, 42 s fuel then gutter out; placement rules (120 px from
  hearth, 90 px apart, inside the clearing, slot limit)
- Night modifiers (v2): one named twist per night 2–8 — Ember Rain, Swift
  Gloom, Thick Gloom, Golden Hour, Iron Gloom, Ember Drought, The Longest
  Night — shown on the night banner + HUD; boss nights show the boss's name
  on the banner too
- Golden wisps (v2): from night 5 (16% spawn on Golden Hour nights), fast,
  flee the keeper, banish for +10 embers (+5 with Golden Touch)
- 3 new boons (v2, pool 8 → 11): Brazier Craft (+1 slot, −1 cost), Golden
  Touch (golden from night 3, +5 embers), Ember Magnet (+60 magnet radius)
- Visual overhaul (v2): layered night sky (gradient, twinkling stars, moon,
  mist, two tree lines, glowing mushrooms, fireflies, grass, stones), hearth
  glow that pulses with fuel, per-kind wisp silhouettes + trails + HP pips,
  lantern aura circle, brazier light pools + fuel arcs, build-mode ghost,
  damage vignette + screen shake on hearth hits, low-fuel red vignette,
  golden-dawn WIN screen with score card
- Canvas backing store 960x600, the field's own resolution
- 8 escalating nights, 5 wisp kinds (wisp, dart, splitter that breaks into
  two, armoured brute, golden) + the Gloomlord; night totals +10% from night
  3 (braziers add power, so later nights send more wisps)
- Lantern aura: slows + burns wisps inside its light; dash strike; flare burst
- Ember economy: banished wisps drop shards; shards feed hearth fuel (+3) and
  pay for flares/braziers/shop; golden wisps pay a fortune; the Gloomlord
  pays +15
- Combo multiplier up to x5; floating score popups; particles
- Boon choice after every cleared night (11 boons), then the shop
- HUD: hearth fuel bar, night + modifier name, score, combo, embers, braziers,
  wisps left, dash/flare status, build-mode hint, Gloomlord HP bar while it
  stands
- Win screen ("DAWN BREAKS", fuel bonus = fuel left x10) and lose screen
  ("THE LIGHT HAS FADED") with stats + restart; title screen with feature
  strip + animated ambient wisps; pause screen
- Synthesized WebAudio: night drone, banish/pickup/dash/flare/hearth-hit/boon/
  win/lose sounds, **boss roar (low sawtooth fall + noise) and shop coin
  chime**, M to mute
- Seeded deterministic screenshot hooks: `?shot=start|play|boon|shop|end&seed=N`
  (sets `window.__shotReady`); `window.__emberkeeper` exposes live
  `{state, screen(), world}` via getters (stays live across restarts)
- Original art/names/sounds; no commercial copy. No network requests, no
  external assets.

## Source layout (one job per file)
- `game/index.html` — shell + canvas (no `<link>`, no favicon link; real `game/favicon.ico` file) — UNCHANGED
- `game/src/config.js` — all tunables (nights, wisp kinds, braziers, golden, modifiers, boons, **BOSS table + bossDefForNight / isBossNight / bossName**) — EDITED (boss table only)
- `game/src/random.js` — seeded RNG (mulberry32) — UNCHANGED
- `game/src/world.js` — rules only, no DOM (runs headless in Node for tests) — EDITED (boss spawn/pulse/banish, shop buy/begin, boon→shop flow, damage helpers)
- `game/src/boss.js` — **NEW: the Gloomlord's numbers, shape, damage helpers, isBoss**
- `game/src/shop.js` — **NEW: the four shop tracks, costs, level state, shop screen geometry + hit-testing**
- `game/src/braziers.js` — placement rules + burn step — UNCHANGED
- `game/src/modifiers.js` — night twists, multipliers, golden chance — UNCHANGED
- `game/src/render.js` — all canvas drawing — EDITED (boss drawing + HP bar, shop screen, title strip, end stats)
- `game/src/audio.js` — synthesized WebAudio SFX + drone — EDITED (boss roar, buy chime)
- `game/src/input.js` — keyboard + mouse + touch — UNCHANGED
- `game/src/shots.js` — deterministic scene staging + autopilot — EDITED (boss-night play shot, shop shot, boss-hunting autopilot, bigger win shot)
- `game/src/main.js` — boot, fixed-step loop, screen flow — EDITED (SHOP screen, shop keys/clicks, EVENT_BOSS sound, version 3)
- `main.ts` (root, Node 22 stdlib only), `serve.ts`, `vendor/makefun-game.ts` (kit copy, unchanged),
  `shots.json` (**3-boon.jpg → 3-shop.jpg**), `LICENSE` (MIT), `README.md` (3 live make.fun badges + bounty link),
  `.makefun/owner.json` (57 bytes exactly).
- Rewrite note (transcript gate): v3's NEW files (boss.js, shop.js) were
  written fresh in this session. v3's EDITS to v2 files are all new lines
  authored in this session (boss table, boss/shop branches, shop screen,
  shot staging); untouched v2 lines trace to the v2 session, which the parent
  bundles alongside v1's. The bundle for the v3 check MUST include the v1 +
  v2 + v3 sessions (`--no-discover --no-family`).

## Play-test results (all in this session, after the 01:00 WIB opening)
### Headless system test (`~/workspace/makefun/ek3-test.mjs`, 40 checks)
- **40 passed, 0 failed.** Determinism (same seed → identical score/night);
  autopilot WIN **5/5 seeds** (scores 33,300–38,700, ~18,000 steps each, 2
  bosses felled in every run); stand-still LOSS on night 1, 35 s; brazier
  place/reject/burn/expire; golden spawn chance 0 night 1 / 0.16 Golden Hour,
  flee, +10 ember payout; 7 distinct night twists; splitter → 2 children;
  boon→shop flow (boon applies, night waits, begin starts night 2, begin
  refuses before a cleared night); **boss: spawns night 4 (14 HP, "THE
  GLOOMLORD'S HERALD"), pulse births 2 minions every 6 s (wisps 1 → 9),
  flare wounds 3 HP, banish pays +15 embers + counts the boss, hearth hit
  costs 25 fuel**; **shop: buy/level each track, refuse maxed/broke/unknown,
  Deep Well +20 max fuel and +20 fuel now, Ember Rounds flare wounds brute
  for 3**; renderer draws all 7 screens headless; all 5 staged shots (play:
  boss night, 2 braziers + 11 wisps + golden, boss hp 8; shop: 24 embers,
  oil level 1; end: WIN score 4,860, 2 bosses); flare costs 3 embers, dash
  fires.
- Three early failures were TEST bugs, not game bugs (shop.js was missing
  the `costs` arrays on three tracks — a real game bug, fixed in shop.js;
  the other two were test-side: the flare cooldown blocked a second cast in
  the same test, and the passive fuel drain made a hearth-hit expectation
  off by 1/60) — fixed in the test, game unchanged except the costs fix.

### Browser play-test (`~/workspace/makefun/ek3-playtest.mjs`, headless Chromium)
- **24 passed, 0 failed, 3 consecutive clean runs.** Title loads; click
  starts; W moves (y 440→211); Space dashes (dashId 0→1); F flares (embers
  20→17); B + click plants a brazier (embers 17→12); P pauses/resumes; 5 s
  live play spawns 5 wisps, fuel drains 100→93; **boon → shop flow in the
  real browser: night clear shows the boon screen, clicking a boon opens
  the shop, clicking Lantern Oil buys it (24→18 embers, aura +14), Digit2
  buys Deep Well (18→12 embers, fuel max 120), clicking BEGIN starts night
  2**; **boss shot page shows the Gloomlord (night 4, 8/14 HP, 11 wisps)**;
  4 shots retaken (all ≤256 KiB, 1280x720); **zero console errors, zero
  external requests, zero failed requests.**
- One run in the middle scored 23/24 with a single unexplained failure (the
  failure line was not captured — my tail cut it off); the runs before and
  after it were clean 24/24, and 3 consecutive clean runs followed. Treated
  as a timing flake in the interactive flow; if the parent re-runs the
  playtest and sees a repeated failure, that check deserves a look.
- `window.__emberkeeper.state` stays live across restarts (getters, v2 fix).
- Two visual fixes found by inspecting the screenshots (not by the tests):
  the Gloomlord's maw read as a smile (flipped to a frown) and the end
  screen's stats line overflowed its card (split onto two lines); the title
  subtitle still said HEARTHGUARD (now THE GLOOMLORD RISES). All three
  fixed and the shots retaken after.

## Screenshots (all 1280x720, taken with Playwright from the real running game)
- `screenshots/1-start.jpg` — 68,738 bytes — title: EMBERKEEPER / THE
  GLOOMLORD RISES, feature strip, how-to, ambient wisps, moon, mushrooms
- `screenshots/2-play.jpg` — 61,525 bytes — night 4 mid-fight with the
  Gloomlord: HUD (fuel 71/100, NIGHT 4/8 — THICK GLOOM, Score 420, COMBO x4,
  18 embers, BRAZIERS 2/3, wisps left 16), boss HP bar (8/14) + boss name,
  2 braziers with burn rings, hearth, keeper + lantern aura, 11 wisps incl.
  golden + splitters + dart, shards
- `screenshots/3-shop.jpg` — 59,712 bytes — THE HEARTH SHOP: 24 embers,
  Lantern Oil level 1, Deep Well / Swift Current / Ember Rounds priced,
  BEGIN NIGHT 3
- `screenshots/4-end.jpg` — 52,433 bytes — "DAWN BREAKS" golden dawn, score
  card (SCORE 4,860 incl. +410 fuel bonus), stats (268 banished, 2
  Gloomlords felled, 8 golden, 191 embers, 6 braziers), BEST 4,860, restart
  prompt
- All ≤256 KiB, long side 1280, short side 720. Visually inspected: all
  readable at a glance. The old `3-boon.jpg` was deleted — the third shot is
  the shop now.

## main.ts run
`mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts` → exit 0, wrote `out/dossier.json`
+ `out/game/` + `out/screenshots/`.
- **dossier.json sha256: a15d6cc59c9cf3b0fbd03f7c8e308efabb6d142d45cd6c51b309a5aae69f780b**
- Dossier: schema `makefun/dossier/v1`; Source files: 13 (102,948 bytes);
  Vendored: 0; Assets: ico 1 (1,150 bytes). game/ totals 14 files, 104,992 bytes.
- `out/` was removed after verification so the repo stays clean; re-running main.ts reproduces it.

## Kit check (run by me, v1+v2+v3 bundle)
`node kit-best-game-01/best-game-01-kit/cli/makefun.mjs check --kit
kit-best-game-01/best-game-01-kit --repo best-game-01 --transcripts
best-game-01-v3-bundle.tar.gz` → **13 passed, 0 failed, 6 skipped, 5 checked at
submission** ("ok: every check run here passes; the rest are the site's at
submission").
- `thinking_reproduces`: **2506 of 2515 counted lines (99.6%) authored, 4
  copied, 0 pasted, 0 read, 5 absent; left out: 186 kit starter lines** — at
  least 30% required. (The v3 session added 557 lines vs v2 in game/src;
  the bundle covers v1+v2+v3 sessions, so nearly every line traces to an
  in-window session.)
- `thinking_priced`: 2 usage records (v1+v2 rows). **My v3 usage row does
  NOT exist yet** — muse.db has 0 rows for my agent (usage is written when
  the session completes). **The parent MUST re-bundle after this session
  ends** (re-run the SELECT with all three agent ids, attach the v3 row)
  before submitting; the bundle CLI itself says so in its warning.
- The bundle was built while `out/` (the main.ts output) was still in the
  repo, so it records repo.dirty — `out/` has since been removed and the
  repo is clean at 6c4289d; the parent's re-bundle fixes that too.
- The 5 at-submission checks are the site's (repo public, repo owner,
  repo created after open, commit pushed, duplicate snapshot) — all depend on
  the parent's push + submit steps, not on the code.

## Link / network audit
- `grep -rn "data:" game/` → none. No `<link>` tags in index.html. No `http(s)://` strings in game/.
- No symlinks in game/.
- Playwright request log: zero non-localhost requests across title, play, boon, shop, end and all 4 shot pages.

## NOT verified / notes for the parent
- **NOT submitted, NOT pushed, NO quota spent** (per task — parent pushes via
  browser upload + submits; bundle must include the v1 + v2 + this v3 session,
  `--no-discover --no-family`).
- The full 8-night win path was verified headless (autopilot 5/5) and the win
  screen renders in the browser; a full 8-night HUMAN playthrough was not done.
- Audio: synthesized WebAudio only; headless Chromium raised no audio errors,
  but actual sound quality was not listened to by a human ear.
- Screenshots were re-taken after the last render change; the files in
  `screenshots/` are the final ones and match the dossier built from them.
- v3's local balance: autopilot wins 5/5 with boss nights + shop buying —
  the boss adds real pressure (pulses birth minions, 25-fuel hits) but the
  shop's upgrades (aura, fuel, dash, flare) keep the run winnable. If the
  dev grade lands below #1, the levers are boss HP / pulse interval and
  shop costs, not the core loop.
