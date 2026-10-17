# Recording Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Step 4 of the design system's rollout, for its third screen: the recording screen. It is grouped as the owner chose on two mockups. Every piece is on the shared components, nothing jumps, and its 3 files leave the design check's allow-list.

**Architecture:** First come the two pieces the screen shares with others: one way to say free space and counts, and one clip level. Then the meter a tile draws. Then one tile for a track: the MIDI tile becomes a variant of the track tile. Then the tile's name (Q2). Then the screen itself (Q1). Last, reha.stream and the docs.

The reference is the Q2 mockup's patch, `/mnt/project-files/design-system/screen-recording/q2/src/recording-screen-q2.patch`, against 8be3652. It carries Q1's answer. Take its code, but:
- leave out `lib/mk.ts` and every branch on `useMkNames()`: keep the «В две строки и мельче» path only (`twoLines` and `smaller` true);
- leave out the `--mk-probe-min` hook;
- drop every `MOCKUP` comment.

Its `README.md` says how it was measured. Q1's mockup (`../q1/`) measured the other variants and the jumps.

**Tech Stack:** React 19, TypeScript, Tailwind v4, the unified `radix-ui` package, cva, lucide; Storybook 10.6.1; Vitest (node) and Playwright on `ui/e2e/fake-bridge.js` with `ui/e2e/band.js`.

**Spec:** `docs/superpowers/specs/2026-10-08-design-system-design.md`: C1-C8, U1-U5, B1-B9, F2-F11, and rollout step 4 (`:416-421`). The rules as merged are in `docs/design-system.md`.

The owner's answers are at the end of `/mnt/project-files/design-system/rulings.md`, under "Recording screen Q1" and "Recording screen Q2". What the PR does without asking is in `/mnt/project-files/design-system/screen-recording/inventory.md`:
- §1: the pieces, and three layout jumps;
- §2: the 4 allow-list cases in 3 files;
- §3: what is already decided;
- §4: Claude's calls, shown on both mockups and not objected to.

The inventory counted lines on 811868d. `ui/src` is the same on 8be3652 (PR #49 bumped dependencies only).

## Global Constraints

- **From the foundation plan** (`docs/superpowers/plans/2026-10-10-design-system-foundation.md`), all still holding:
  - Latin-only test titles, plain ASCII (no ×, ·, … or →);
  - the five text sizes and two weights;
  - radii 4/8/12/full;
  - the motion values;
  - the spacing steps;
  - shared components only in `components/ui/`, each with a story;
  - Radix only there;
  - tests first, seen failing.
- **The other screens' rulings carry over:**
  - tips are for cut names and icon buttons;
  - a cut name is whole in the shared tooltip (`WholeTip`, `components/ui/whole.tsx`);
  - groups are set apart by fill only;
  - a well is the page's colour with 8 px corners and 3 px of the group's fill round it («Волна на подложке»).
- **The owner's answers, exact:**
  - **Q1 «Статус у Stop»** (2026-10-17 18:19Z). The screen is two groups and a footer:
    - the take: its name, the clock, and the bar against the last take;
    - the tiles as one group on one fill (`bg-card`, `rounded-xl`, `p-[3px]`, 6 px between tiles), each tile's fill on a well of its own;
    - the status row (the red dot, `Recording`, `Take N`, and the disk and battery line under them), in the footer's left beside Stop.

    There is no header. The air is the start screen's: 32 round the screen, 48 between the groups, 24 inside a group.
  - **Q2 «В две строки и мельче»** (2026-10-17 18:56Z): a tile's upright name takes up to two lines at 2.25rem. A name still too long gets smaller, down to 1.5rem. Past that it is cut and whole in the shared tooltip on hover. Short names keep 2.25rem.
  - **In every variant of Q2**, the tiles keep a minimum of 12.5rem, and in a short window the clock and the take's name give way first (§4).
- **Copy, exact:**
  - The status row: `Recording` (no capitals), then `Take {N}`.
  - The disk line, on both screens, through one `diskLine(minutes, low)`:
    - start screen: `Room for {about} of recording`, or `Low disk space: room for {about}`;
    - recording screen: `Interface connected · room for {about} of recording`, or `Low disk space: room for {about}. Free some up or finish the rehearsal.`
  - Unchanged: `Battery {N}%: plug the laptop in`, `Checking free space…`, and an error in its own words.
  - The tiles: `clipped`, `clipped {N}×`, `silent`, `not connected`, `{N} note` / `{N} notes`, `Input {N}`, `Inputs {N}–{N+1}`, `No input`, `MIDI`.
  - The bar: `0:00` and `Took {m:ss} last time` / `Took {m:ss} on {date}`.
  - Footer: `Stop` with `Space`, and `autosaved every 30 s`.
  - Wording: take and takes, never go or goes, in the UI and in CHANGELOG.
- **reha.stream's story and page keep working** (`site/src/stage/Story.tsx:101`, `site/src/page/pieces.tsx:73-74`, `:161`). `site/e2e/page.spec.ts:74-76` reads `Interface connected · room for`, `clipped 3×` and `autosaved every 30 s`.
- **The allow-list only shrinks, task by task.** `npm run design-check` fails on an entry that no longer matches anything. At the end it says `27 known cases in 17 files`.
- **Tests:**
  - Boxes are measured only after `settled(page)` (`e2e/app.ts`).
  - Looks are checked by computed style, not by class strings.
  - A colour is compared with a theme token through a probe's `getComputedStyle`, as `lanes.spec.ts`'s `colour()` does.
  - Font sizes are compared within ±1 px: the container draws in Inter, and a Mac or Windows draws in its own font.
- Python is not touched. Pictures in `docs/screenshots/` are retaken at the release, not here.
- **Branch** `claude/design-system-rules-8v42zg`, from main 8be3652. The PR opens only after the whole-branch review's findings, minors included, are fixed and pushed. It is never merged without the owner's word.
- **The checks, in `ui/`:**
  - `npm run build`;
  - `npx playwright test -c playwright.local.config.ts` (4 workers; `scrollbars.spec.ts:12` fails only in the container);
  - both `tsc` configs;
  - `npm run lint` (21 warnings, no new ones);
  - `npm run design-check`;
  - `npx vitest run`;
  - `npm run build-storybook` when a file in `components/ui/` changes.

  Site, in `site/`: tsc, Vitest, build, then Playwright after `npm run og`.

## Review Focus

1. **150 % in 960 × 680 with the recording stress data.**
   - Expected: the clock and the take's name give way to the clock's 3rem floor, then the tiles to 6rem. Nothing scrolls sideways.
   - If the page still has to scroll down, the footer stays put and Stop stays in view.
   - Test in Task 4.
2. **A take past 10 hours in a 960 × 820 window.**
   - Expected: the clock fits inside the screen's air, and its seconds stay where `0:00` ended at 10:00, 1:00:00 and 10:00:00.
   - Test in Task 4.
3. **Low space arriving mid-take at 150 % in 960 × 680.**
   - Expected: the line in the footer changes its words, and no box on the page moves.
   - Test in Task 4.
4. **A clip and a silence arriving on a tile whose name is cut.**
   - Expected: the name's size, lines and cut stay as they were, and the header's height does not change.
   - Test in Task 3.
5. **Sixteen tracks at 960 × 680.**
   - Expected: every name is upright from its tile's corner, and nothing runs past a tile's edge.
   - A dB figure with no room hides and is in the tile's tooltip.
   - Test in Task 2.

## Files

| File | Its one job |
|---|---|
| `ui/src/lib/format.ts`, `format.test.ts` | `diskLine`, `countOf`, `nounFor`. |
| `ui/src/lib/levels.ts`, `ui/src/components/LaneControls.tsx` | One clip level. |
| `ui/src/components/HealthLine.tsx`, `ui/src/screens/Setup.tsx` | One disk line, in one look. |
| `ui/src/components/ui/meter.tsx`, `meter.stories.tsx` | The upright meter a tile draws. |
| `ui/src/index.css` | The `--well` token. |
| `ui/src/components/TrackTile.tsx`; `midi/MidiTile.tsx` (deleted) | One tile, with a notes-only variant. |
| `ui/src/components/TileName.tsx` (new) | A tile's name, fitted to its room (Q2). |
| `ui/src/components/Waveform.tsx`, `midi/NotesLane.tsx` | The rehearsal screen's wells on `--well`. |
| `ui/src/components/TakeTitle.tsx` | The take's name on up to two lines. |
| `ui/src/screens/Recording.tsx` | The screen (Q1), the clock, the give-way. |
| `ui/e2e/app.ts`, `ui/e2e/stress-recording.js` (new), `ui/e2e/recording.spec.ts`, `ui/e2e/recording-stress.spec.ts` (new), `ui/e2e/midi-recording.spec.ts`, `ui/e2e/setup.spec.ts` | The tests. |
| `site/src/page/pieces.tsx` | The tiles as the app now draws them. |
| `ui/design-check.allow.json`, `docs/design-system.md`, `docs/using-it.md`, `CHANGELOG.md` | The list, the rules, the guide, the news. |

## Calls this plan makes

The inventory's §4 calls stand. This plan adds the following.

- **One look for a well, the `--well` token.** Light is `--background`, as now. Dark is `--panel`, because a well on `--background` was faint on the group's `--card`: 1.09:1, against 1.11:1 in light. On `--panel` it is 1.14:1, as the Q2 mockup drew it. The tiles use `bg-well`, and so do the rehearsal screen's wells (`Waveform.tsx:125`, `NotesLane`), so the two screens keep one look.
- **The low disk line takes the shared warning look**: the icon in `warn` and the words in the text's colour, as `Alert`'s `warning` draws them (`ui/alert.tsx:25`). This applies on both screens and both themes. Amber words were 1.86:1 on the light footer. The Q2 mockup tried `warn-foreground` for the words, but the Alert's look is the one the system already has. Other screens' amber words (`Settings.tsx:734`, `:904`, `DraftsScreen.tsx:119`, `ShareDialog.tsx:120`) wait for their screens' PRs.
- **The order things give way in a short window.**
  1. The clock and the take's name shrink, down to the clock's 3rem floor.
  2. Then the tiles' minimum gives way, from 12.5rem down to today's 6rem.
  3. Only then may the page scroll.

  This is fitted when the screen comes up and when the window or the scale changes, never during a take. The Q2 mockup did step 1 only; at 150 % its 12.5rem is 300 px, and in 960 × 680 the page would have scrolled.
- **The clock is never bigger than lets 10:00:00 fit inside the screen's air.** It grows to the left from where `0:00` ends (§4). Without the cap, a 900 or 960 px window ran it off the left edge after ten hours (Q1's mockup). The cap is about 142 px at 960 × 820 (152 today) and does not bite at 1180 × 820 or 960 × 680. It is computed once, from an unseen `10:00:00`.
- **The MIDI tile becomes the track tile's notes-only variant** (§3, U2). `TrackTile` draws:
  - the levels, with a notes column for a track on Both;
  - or, with `kind="notes"`, the notes alone.

  `midi/MidiTile.tsx` is deleted. Its count-hiding and its port line move in.
- **The tile's meter is `Meter` with `direction="up"`** (§3, one meter). It draws:
  - each side's fill from the bottom;
  - the held peak's line;
  - a clip in `destructive`;
  - notes in the `notes` tone, grey.

  The tile keeps its dB scale (`meterReach`) and hands `Meter` reaches 0..1.
- **One clip level**: `CLIP_THRESHOLD` from `lib/levels.ts`, compared with `>` as the screen counts clips (`levels.ts:76`). `LaneControls.tsx:9` loses its own copy and its `>=`.
- **A dB figure keeps the room of `-60.0 dB` from the start**, so a louder reading never moves it. Where even that has no room, it hides and the tile's tooltip says it, as the MIDI count already does.
- **A tile's name is fitted on an unseen copy** (`TileName`). It is fitted again only when the room it has changes size, so a clip, a silence, a port that goes or the clock gaining a figure never changes it.
- **reha.stream's two tiles sit on the tiles' group fill**, as wells, as the app now draws them (`pieces.tsx:70-76`).

---

### Task 1: One disk line, one clip level, counts through `lib/format`

**Files:**
- Modify: `ui/src/lib/format.ts`, `ui/src/lib/format.test.ts`, `ui/src/components/LaneControls.tsx:9`, `:47`, `:71`, `ui/src/components/HealthLine.tsx`, `ui/src/screens/Setup.tsx:1074-1085`
- Create: `ui/e2e/stress-recording.js`, `ui/e2e/recording-stress.spec.ts`; modify `ui/e2e/app.ts` (`stress: "recording"`)
- Test: `ui/e2e/setup.spec.ts`, `ui/e2e/recording.spec.ts:264-305`

**Interfaces:**
- Produces:
  - `openApp(page, { stress: "recording" })` lays `stress-recording.js` over `stress-rehearsal.js`.
    - The screen opens on take 33, the second take of "Kalychanka (slow version for the wedding, with the long intro the bride asked for)", recording.
    - Guitar clips three times in the first seconds, Percussion is silent, the Nord plays notes, and the disk has 5 min left.
    - Take these from the q2 mockup's `src/start.js` and `src/stress.js`. The fixture presses Record itself, and the helper waits for `[role=timer]`.

    `recording-stress.spec.ts` gets one test here: `the recording stress data opens on take 33 with eight tiles`.
  - `diskLine(minutes: number, low: boolean): string`;
  - `countOf(n: number, one: string, many?: string): string`, e.g. `"1,234 notes"`;
  - `nounFor(n: number, one: string, many?: string): string`;
  - `HealthLine` takes `align?: "start" | "end"` (default `"end"`) and holds, unseen, the room of the longest sentence it can say, so its box never changes size during a take (`[data-health]`).

- [ ] **Step 1: Write the failing tests.**
  - Vitest: `diskLine(5, true)` is `"Low disk space: room for about 5 min"`. `diskLine(180, false)` is `"Room for about 3 h of recording"`; use `aboutDuration`'s own words for the exact value. `countOf(1, "note")` is `"1 note"`, `countOf(1234, "note")` is `"1,234 notes"`, and `nounFor(2, "take")` is `"takes"`.
  - e2e:
    - `the start screen's low disk line is a warning in the text colour`: the icon is `--warn` and the words `--foreground`, in light and dark.
    - `the recording disk line says the start screen's words`: `Interface connected · room for … of recording`; with low space, `Low disk space: room for about 5 min. Free some up or finish the rehearsal.`
    - `the health line keeps its size when low space comes`: the box of `[data-health]` before and after is the same, ±0.5 px.
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3: Implement** from the patch's `format.ts`, `HealthLine.tsx` and `Setup.tsx` hunks, with the call's colours. `LaneControls` imports `CLIP_THRESHOLD` and compares with `>`.
- [ ] **Step 4:** Run the whole Playwright suite, Vitest, lint and design-check. Build the site and run its Playwright (`page.spec.ts:74`).
- [ ] **Step 5:** Commit: `ui: one disk line on both screens, one clip level, counts through lib/format`.

### Task 2: One tile, on a well, with the upright meter

**Files:**
- Modify: `ui/src/components/ui/meter.tsx`, `meter.stories.tsx` (up, stereo, held, clipped, notes) and `meter.test.ts` (the up variant's classes, as the across ones are tested)
- Modify: `ui/src/components/TrackTile.tsx`, `ui/src/index.css` (`--well` in `:root` and `.dark`, `--color-well` in `@theme`), `ui/src/components/Waveform.tsx:125`, `ui/src/components/midi/NotesLane.tsx` (its well `:174` and its names' backing `:198`, `:212`, as `bg-well` and `bg-well/85`), `ui/src/screens/Recording.tsx` (the tiles' map only)
- Delete: `ui/src/components/midi/MidiTile.tsx`
- Modify: `ui/design-check.allow.json` (drop `TrackTile.tsx` and `MidiTile.tsx`)
- Test: `ui/e2e/recording.spec.ts`, `ui/e2e/midi-recording.spec.ts`, `ui/e2e/lanes.spec.ts` (the wells' colour)

**Interfaces:**
- Consumes: `countOf`/`nounFor` and `CLIP_THRESHOLD` (Task 1). Task 1 runs in parallel: if it has not landed when this task starts, this task imports `CLIP_THRESHOLD` from `lib/levels.ts` (it is there already) and leaves `NoteCount`'s plural for the merge.
- Produces:
  - `Meter` takes:
    - `direction?: "across" | "up"` (default `"across"`, exactly as today);
    - `held?: number[]`: each side's held line, 0..1;
    - `clipped?: boolean[]`: a side drawn in `destructive`.

    Upright, the meter fills its box with no border, radius or background of its own, and draws what the tile draws today (`TrackTile.tsx:89-119`):
    - each side `[data-side]` (1-based, with `data-level` 0..100), side by side 2 px apart;
    - a fill `[data-fill]` rising from the bottom, with a 2 px top line: `signal` on `signal/15`; a clipped side `destructive` on `destructive/25`; the `notes` tone `foreground/60` on `foreground/15`;
    - no fill at all for a 0;
    - a held line, 2 px of `foreground/35`, for a held value over 0;
    - the fill following over 75 ms, as across does.

    The tile hands it reaches (`meterReach`), and 0 for a side under `QUIET_THRESHOLD`, so `recording.spec.ts:211-263` passes unchanged.
  - `TrackTile` keeps its props and adds:
    - `kind?: "levels" | "notes"` (default `"levels"`);
    - `surface?: "card" | "well"` (default `"card"`);
    - for `kind="notes"`, the MIDI tile's `port`, `vel`, `notes`, `connected` and `tip`.
  - The tile stays `role="group"` named by its track, and keeps `data-clipped`, `data-silent`, `data-not-connected`, `data-midi-tile` (notes kind) and `data-level`.
  - Its least height is `var(--tile-min, 6rem)`, which Task 4 sets.
  - The name is drawn by the slot Task 3 fills. Until then it is today's markup.

- [ ] **Step 1: Write the failing e2e tests:**
  - `a tile has no frame and sits on a well`: the border width is 0, the background is `--well`, and the radius is 8 px.
  - `a clip draws an edge inside the tile and moves nothing`: `[data-edge='clip']` is `--destructive` at 70 %, and the tile's and header's boxes are the same before and after (±0.5 px).
  - `a port that is gone draws a warn edge`: `[data-edge='port']` is `--warn`.
  - `a silent tile dims at once`: the opacity of what is on the well is 0.45 with no transition, and the well itself keeps opacity 1.
  - `the header keeps the room of its status line`: the header's height is the same before and after `silent`, then `clipped 3x`.
  - `notes coming in are grey`: the notes fill, the MIDI sign and the `MIDI` label are the text colour, and the label is 12 px.
  - `a Both track's notes are split from its levels by a 1 px line`: the border-left is 1 px solid `--border`.
  - `a tile's port sentence is a tooltip, not a title`: no `[title]` in `main`. Hovering a not-connected tile shows the sentence.
  - `a dB figure with no room hides and is in the tooltip`: sixteen tracks at 960 × 680. Nothing runs past a tile's right edge, and a hidden figure is in the tile's tooltip.
  - `the rehearsal screen's wells are --well`: in both themes.

  Update the tests that read the old frame, the amber edge, `title` or the accent on notes (`midi-recording.spec.ts`).
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3: Implement** from the patch's `TileBox.tsx`, `TrackTile.tsx` and `MidiTile.tsx`, folded into one `TrackTile.tsx`:
  - the box, its edge, its dimming and its tooltip;
  - the levels on `Meter` up;
  - the notes kind with the MIDI tile's count-hiding (`MidiTile.tsx:77-102`);
  - the icon's and the figures' backing in the surface's colour.

  `Recording.tsx` renders `TrackTile kind="notes"` where it rendered `MidiTile`, and passes `surface="well"`.
- [ ] **Step 4:** Run the whole Playwright suite, Vitest, lint, design-check and build-storybook. Build the site, then run its tests.
- [ ] **Step 5:** Commit: `ui: one recording tile, on a well, the MIDI tile its notes variant, Meter upright`.

### Task 3: The tile's name (Q2)

**Files:**
- Create: `ui/src/components/TileName.tsx`
- Modify: `ui/src/components/TrackTile.tsx` (the name's slot), `ui/e2e/recording-stress.spec.ts`, `ui/e2e/recording.spec.ts:71-95`, `:371-400`

**Interfaces:**
- Consumes: `TrackTile`'s tooltip lines (Task 2); `openApp(page, { stress: "recording" })` (Task 1).
- Produces:
  - `TileName({ name, side, sideClassName?, onFit? })`, as the patch has it, with `twoLines` and `smaller` always on. `NAME_REM = 2.25` and `NAME_FLOOR_REM = 1.5` are constants in the file.
  - The name element is `[data-name]`, with `data-name-px`, `data-lines` and `data-cut`. The input line is `[data-side-line]`.

- [ ] **Step 1: Write the failing tests** in `recording-stress.spec.ts`, at 100 %, with the sizes ±1 px:
  - `long names fit on two lines and get smaller at 1180x820`:
    - Hanna is cut on two lines at 24;
    - Keys (Nord Stage 3 MIDI) is whole on two lines at 24;
    - Percussion is whole on one line, between 24 and 36;
    - Second guitar is whole on two lines at 36;
    - every other name is whole at 36.
  - `only Hanna is cut at 960x680`: every other name is whole, none under 24 px.
  - `a cut name is whole in the tooltip on hover`: Hanna.
  - `the input line gives way to a second line and the tooltip says it`: a tile whose `[data-side-line]` is hidden says `Input N` in its tooltip.
  - `a name does not change when a clip or a silence comes`: `data-name-px`, `data-lines`, `data-cut` and the name's box are the same before Guitar clips and after.
  - `the band's names are whole at 960x680`: Vocals is whole, at least 35 px.

  In `recording.spec.ts`, `badNames` checks `data-lines` ≤ 2 instead of one line. The small-laptop test's `longest` cases stay.
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3: Implement** from the patch's `TileName.tsx`. The `design-ok(px-text)` comment says what the code does: fitted to its room, from 2.25rem down to 1.5rem.
- [ ] **Step 4:** Run the whole Playwright suite, Vitest, lint and design-check.
- [ ] **Step 5:** Commit: `ui: a tile's name on two lines, smaller when it must, whole in its tooltip`.

### Task 4: The screen (Q1), the clock, and what gives way

**Files:**
- Modify: `ui/src/screens/Recording.tsx`, `ui/src/components/TakeTitle.tsx` (`GoTitle`'s `lines`)
- Modify: `ui/design-check.allow.json` (drop `Recording.tsx`)
- Test: `ui/e2e/recording.spec.ts:97-185`, `:264-305`, `ui/e2e/recording-stress.spec.ts`

**Interfaces:**
- Consumes:
  - `HealthLine align="start"` (Task 1);
  - `TrackTile surface="well"` and `--tile-min` (Task 2);
  - `FooterRow`'s `left` (`FooterRow.tsx:41-54`);
  - `Progress` (`ui/progress.tsx`).
- Produces:
  - `[data-take]` holds the name, the clock and the bar, 24 apart.
  - `[data-tiles]` is the tiles' group, 48 under the take.
  - `[data-status-row]` is in the footer's left: `[data-recording-line]` over `[data-health]`.
  - The clock is `role="timer"`. Its figures `[data-clock]` stand at the right edge of an unseen `0:00`.
  - `GoTitle` takes `lines?: 1 | 2`.

- [ ] **Step 1: Write the failing tests.**
  - `the screen is the take and the tiles, with the status beside Stop`. At 1180 × 820 with the band:
    - `[data-status-row]` is inside the footer, left of Stop;
    - `Recording` has `text-transform: none`;
    - the main area's padding is 32;
    - the gap between `[data-take]` and `[data-tiles]` is 48;
    - the tiles' group is `--card` with 12 px corners.
  - `the bar against the last take is the shared progress bar, in grey`: `[data-slot='progress']`, and its indicator is the text colour at 55 %, not the accent.
  - `a long take name wraps to two lines and is cut after that with its number`: the stress name has `data-lines='2'`, ends in `…`, and ` 2` stays. It is whole in the tooltip on hover. This replaces `:162-185`.
  - `the seconds never move as the clock gains a figure`: with the page's clock at 9:59 → 10:00 → 59:59 → 1:00:00, `[data-clock]`'s right edge is the same (±0.5 px).
  - `ten hours fit in a 960x820 window`: at 10:00:00, `[data-clock]`'s left is ≥ the main area's left padding edge.
  - `nothing moves when low space comes at 150 percent in 960x680` (jump 1): every box in `main` and the footer is the same before and after.
  - `in a short window the clock gives way before the tiles`: stress at 960 × 680, 100 %.
    - The tiles are at least 200 px tall.
    - The clock is under 129 px and at least 48 px.
    - `main` does not scroll.
  - `at 150 percent in 960x680 the tiles give way after the clock`: stress.
    - The clock is at 72 px (3rem at 150 %, ±1).
    - The tiles are between 144 and 300 px.
    - Neither `main` nor the page scrolls sideways.
    - If `main` scrolls down, Stop is still in view.
  - `tab reaches only stop`: from the page's start, Tab focuses Stop, and a second Tab leaves the page or comes back to Stop.
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3: Implement** from the patch's `Recording.tsx` and `TakeTitle.tsx`, with the give-way order from Calls. The fit runs in `useLayoutEffect` and on a `ResizeObserver` of `main` and of the name-and-clock block. Each run first removes `--clock` and `--tile-min`, then:
  1. caps the clock for 10:00:00;
  2. while the tiles overflow, shrinks `--clock` toward 3rem;
  3. then lowers `--tile-min` toward 6rem.

  Shell gets `air`, `px-8` and `[--screen-pad-y:2rem]`. Stop's chip and the footer stay as they are.
- [ ] **Step 4:** Run the whole Playwright suite, Vitest, lint and design-check. Build the site and run its Playwright, because `Story.tsx:101` renders the screen.
- [ ] **Step 5:** Commit: `ui: the recording screen as two groups, its status beside Stop, nothing moving`.

### Task 5: reha.stream, the rules, the guide, the news

**Files:**
- Modify: `site/src/page/pieces.tsx:65-76` (the two tiles on the group's fill as wells), and `site/e2e/page.spec.ts` if a selector moved
- Modify: `docs/design-system.md`:
  - the well (`--well`);
  - `Meter` up;
  - the tile and its name;
  - the order things give way on the recording screen.
- Modify: `docs/using-it.md`, wherever it describes the recording screen's corner line, `RECORDING` or the disk line
- Modify: `CHANGELOG.md`, under Unreleased, in take wording

- [ ] **Step 1:** In `site/`: tsc, Vitest, build, `npm run og`, Playwright. Expected: PASS, with the tiles on wells in `#features`.
- [ ] **Step 2:** In `ui/`: design-check says `27 known cases in 17 files`.
- [ ] **Step 3:** Commit: `site, docs: the recording screen's tiles and rules`.

---

**Execution:** subagent-driven, as the rehearsal screen. Tasks 1 and 2 run in parallel worktrees: 1 owns `format.ts`, `levels.ts`, `LaneControls.tsx`, `HealthLine.tsx` and `Setup.tsx`; 2 owns `meter.tsx`, `TrackTile.tsx`, `MidiTile.tsx`, `index.css`, `Waveform.tsx`, `NotesLane.tsx` and the tiles' map in `Recording.tsx`. Task 1 also owns the stress fixture and `app.ts`. Tasks 3 and 4 run in parallel after both: 3 owns `TrackTile.tsx`, `TileName.tsx` and the name tests; 4 owns `Recording.tsx` and `TakeTitle.tsx`. Both add tests to `recording-stress.spec.ts` (3 the names' block, 4 the screen's block), and the merge keeps both. Task 5 is last. Each task gets its own review, then the whole branch gets one.
