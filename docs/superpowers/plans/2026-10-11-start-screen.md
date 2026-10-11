# Start Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Step 4 of the design system's rollout for its first screen: the start screen with its left part, regrouped as Alex chose on four mockups, every piece on the shared components, and its seven files off the design check's allow-list.

**Architecture:** The shared pieces come first, into `ui/src/components/ui/` with a story each: eight from shadcn (Tooltip, Sheet, Toggle, ToggleGroup, Alert, Spinner, Empty, Item) and three of our own (`whole.tsx` for long names, `meter.tsx`, and a length helper). Then `Setup.tsx` is regrouped into three groups with the name in the footer, the left part moves into a Sheet below a width that follows the Appearance scale, and `LastTime.tsx` and the track rows move onto the shared pieces. The mockups already built most of this as patched code. The reference tree is in the project's files at `/mnt/project-files/design-system/screen-start/mockup-tree/`. Each task takes the chosen branch of it, as that tree's README says, and the rest from this plan.

**Tech Stack:** React 19, TypeScript, Tailwind v4, the unified `radix-ui` package, cva, lucide; Storybook 10.6.1; Vitest (node) and Playwright on `ui/e2e/fake-bridge.js`.

**Spec:** `docs/superpowers/specs/2026-10-08-design-system-design.md` (C1-C8, U1-U5, B1-B9, K3, rollout step 4). The rules as merged are in `docs/design-system.md`. Alex's four answers, with their mockups, are at the end of `/mnt/project-files/design-system/rulings.md` ("Start screen Q1" to "Q4"). What the PR does without asking, and which allow-list entries it clears, is in `/mnt/project-files/design-system/screen-start/inventory.md` §2-§3. How each mockup was built and measured is in `screen-start/q1/` to `q4/` `README.md`.

## Global Constraints

- Everything in the foundation plan's Global Constraints still holds (`docs/superpowers/plans/2026-10-10-design-system-foundation.md`):
  - Latin-only test titles;
  - the five text sizes and two weights;
  - radii of 4/8/12/full;
  - the motion values;
  - the spacing steps;
  - shared components only in `components/ui/`, with a story each;
  - Radix only there;
  - the shadcn source at the pinned commit `c2a67849be260701852b0977ba15eb5f3a0ce2a4`, with the import rewrites, never overwriting `button.tsx` or `input.tsx`;
  - tests first, seen failing.
- Alex's answers, exact:
  - **Q1 «Имя рядом со Start»:** three groups. The past is on the left (Last time, Not played last time, Earlier). The tracks are one group, with "Recording with" as its first row, Tracks with Check signal and Save as template at its head, rows split by a line, and Add track and the disk line at its foot. The footer holds the rehearsal's name beside the set picker and Start. Air: 32 px round the screen, 48 between groups, 24 inside a group; the left part is 28rem.
  - **Q2 «Столбики»:** a song in Last time keeps its goes as columns at the row's end. Each column is as tall as the go ran, the playing go is lit and ★ is green.
  - **Q3 «Цифры уступают»:** a name keeps its width. The figures beside it drop whole, least needed first, and show whole on hover. A name longer than its whole row wraps to a second line. Rows keep today's height.
  - **Q4 «За кнопкой Last time»:** narrower than 1100 px at 100 % scale, the left part is a Sheet from the left at 28rem (at most the window less 3rem). A "Last time" button in the header, before History, opens it. ✕, Esc or the veil close it, and focus returns to the button.
- The width where the left part leaves follows the Appearance scale: 68.75rem of the root's font size (1100 px at 100 %, 1430 px at 130 %).
- Copy, exact:
  - Header button `Last time`, with a screen-reader-only `, playing` while something from it plays.
  - The Sheet's hidden title `Last time` and description `The last rehearsal, the songs not played in it, and earlier ones.`
  - Track taken off: `{name} was taken off.` (`An unnamed track` for no name), with `Undo` and its key chip, for 10 s.
  - A track's port line, one of:
    - `Pick a port, or set it to Audio.`
    - `{other} takes notes from this port too.`
    - `In use by another app. Records its notes from the moment it is free.`
    - `Not connected. Records its notes from the moment it is plugged in.`
    - `Same notes as {other}. Plugged in twice?`
  - Statuses: `Not connected` (a port or an interface) and `Not on disk` (a rehearsal or take whose files are gone), both `text-xs text-muted-foreground`.
  - An empty track list: title `No tracks yet`, line `Add one per musician, then pick the input they plug into.`
  - The card's heading: `Last time · {day}, {ago}` (no capitals). Open's tip, once it has become a chevron: `Open in History`.
  - `Rehearsal name` keeps `id="rehearsal-name"`, and the check's button keeps the words `Check signal` and `Stop checking`: reha.stream's story drives both (`site/src/stage/Story.tsx:145-152`).
- Notes coming in are grey, in the text's colour: the notes meter's fill is `bg-foreground/60`, and "✓ notes" is `text-foreground`. An "on" Toggle is `bg-selected`, never the accent.
- Branch `claude/design-system-rules-8v42zg`, restarted from main bf547bc (its PR #43 is merged). The PR opens only after the whole-branch review's findings, minors included, are fixed and pushed. It is never merged without Alex's word.

## Review Focus

1. **Appearance at 130 % or 150 % in the smallest window (960 × 680).** Expected: the left part is in the Sheet, the tracks group has the window's width, nothing scrolls sideways, and names keep their width. Test in Task 5.
2. **A track renamed, taken off, or put back with Undo while the check runs.** Expected: each meter, "signal" and port note stays with its own track by its place, and Undo puts the track back with its readings. Tests in Task 4.
3. **Last time playing while the Sheet closes, the window widens, or Start is pressed.** Expected:
   - the sound goes on;
   - the header button shows it is playing;
   - Space and Esc stay with the player until it stops;
   - Start and the set picker do not move.

   Tests in Tasks 4 and 5.
4. **Long names with the stress data at 960 px, in the Sheet.** Expected: figures drop in order, a cut name shows whole on hover and on keyboard focus, and focus that scrolls the panel still shows the tip. Tests in Task 6.
5. **A MIDI port pulled out during the check, on a track with a long name.** Expected: the note is said in that track's port line, and no row, Add track or footer moves. Test in Task 7.

## Files

| File | Its one job |
|---|---|
| `ui/src/components/ui/{tooltip,sheet,toggle,toggle-group,alert,spinner,empty,item}.tsx` (new, shadcn) | Shared pieces C8 names for this screen. |
| `ui/src/components/ui/whole.tsx` (new), `ui/src/lib/figures.ts` (new) | B6: a cut name whole on hover, and a figure line that drops whole figures. |
| `ui/src/components/ui/meter.tsx` (new) | C8: one meter for the check's level and notes bars. |
| `ui/src/lib/takeScale.ts` (new) | C8: one way to draw a go's length. |
| `ui/src/lib/wide.ts` (new) | Q4: whether the window is wide enough for the left part, following the scale. |
| `ui/src/lib/format.ts`, `ui/src/lib/midiPorts.ts` (modify) | B8: figures and port sentences said once. |
| `ui/src/components/Shell.tsx` (modify) | The title at 16; more air for a screen that asks. |
| `ui/src/screens/Setup.tsx` (modify) | The start screen. |
| `ui/src/components/LastTime.tsx`, `SongName.tsx`, `IconPicker.tsx`, `NameField.tsx`, `midi/ModeSwitch.tsx`, `midi/PortPicker.tsx`, `midi/NotesCheck.tsx`, `SetPicker.tsx`, `TakeSummary.tsx` (modify) | Its pieces, on the shared ones. |
| `ui/design-check.allow.json`, `docs/design-system.md`, `CHANGELOG.md`, `docs/screenshots/setup.png` (modify) | The allow-list, the rules, the news, the picture. |

## Calls this plan makes

The inventory's §4 calls stand: headings without capitals, the track's name bare at rest, Recording with as an outline Button, the Undo wording, the new-version dot cobalt, and the side panel's right edge. This plan adds:

- **Check signal stays a button that names its action** ("Check signal" / "Stop checking"), grey while checking, with no `aria-pressed`. A toggle's label must not change with its state, and this one's words are what the mockups showed and what reha.stream drives. Stereo is a real Toggle.
- **One width test in JavaScript** (`useWide`) decides both the layout and the header button, instead of a CSS breakpoint plus a script, so the two can never disagree at the edge. It follows the root's font size, so the Appearance scale moves it.
- **The Tooltip opens after 400 ms**, close to a native title's delay. shadcn's 0 ms would flash a tip on every row the pointer crosses.
- **Statuses in one quiet look:** "Not connected" and "Not on disk" are muted text. The problem itself shows on the control (the picker's warning edge, a ▶ that cannot be pressed). Today Earlier's "not found" is red.
- **The Spinner holds its room:** before its second, it is the same icon made invisible, so nothing moves when it appears (B4).
- **Shell's title goes from 18 to 16 on every screen** (F5): it is Shell's one size, and the allow-list's `text-size` entry for Shell is that line. Shell's `uppercase` subtitle stays on the list for the screens that show it.
- **B9 is not in this PR.** The setting to turn off single-key shortcuts comes with Settings' PR; this screen's Space obeys it then.
- **Review's bars take the shared length now** (`TakeSummary.tsx`), with no change to their look, so the helper has its second user from the start.

---

### Task 1: The shadcn pieces

**Files:**
- Create: `ui/src/components/ui/{tooltip,sheet,toggle,toggle-group,alert,spinner,empty,item}.tsx`, each with a `*.stories.tsx` beside it
- Modify: `docs/design-system.md` ("Shared components": a line each, and which C8 row it carries)

**Interfaces:**
- Produces:
  - `Tooltip`, `TooltipTrigger`, `TooltipContent`; each `Tooltip` has its own provider, as shadcn's v4 file does, with `delayDuration` 400.
  - `Sheet`, `SheetContent({ side: "left" | "right" })`, `SheetTitle`, `SheetDescription`.
  - `Toggle` with sizes `row` (h-8, as Button's) and `icon-row`, and variants `default` and `outline`.
  - `ToggleGroup` and `ToggleGroupItem` with a `variant="switch"` that is `HistorySwitch.tsx`'s look: a grey track, the chosen item a white plate with a light shadow.
  - `Alert`, `AlertTitle` and `AlertDescription`, with variants `default`, `warning` (the theme's `warn` colour for its icon and edge, `bg-warn/10`) and `destructive`.
  - `Spinner({ after?: number })`.
  - `Empty`, `EmptyTitle`, `EmptyDescription`, `EmptyContent`.
  - `Item`, `ItemContent`, `ItemTitle`, `ItemDescription`, `ItemActions`.

- [ ] **Step 1:** Fetch each file from the pinned commit's `apps/v4/registry/new-york-v4/ui/<name>.tsx` with the foundation's rewrites. Write its story first: every state, both themes, Mac and Windows, as the foundation's stories do. Run `npm run build-storybook` (in `ui/`) and confirm it fails on the missing module.
- [ ] **Step 2:** Adapt each piece to the theme:
  - On is `data-[state=on]:bg-selected`.
  - Motion is 220 ms, through the foundation's motion classes, so it is off under Reduce motion and while recording.
  - The Sheet uses the Dialog's veil and z-index, so notices stay above it (C4). Its ✕ is the shared ✕ Button (`variant="ghost" size="icon-row"`, aria-label `Close`).
  - `Spinner` renders lucide `Loader2Icon` with `animate-spin`, `role="status"` and aria-label `Loading`. Until `after` ms have passed (default `SPINNER_AFTER_MS` from `lib/playLook.ts`), it renders the same icon with `invisible`.
- [ ] **Step 3:** `npm run build-storybook`, `npm run design-check`, `npm run lint` (warnings stay at 21), `npx tsc -b` all pass.
- [ ] **Step 4:** Commit: `ui: Tooltip, Sheet, Toggle, ToggleGroup, Alert, Spinner, Empty and Item from shadcn`.

### Task 2: Long names, one meter, one length

**Files:**
- Create: `ui/src/lib/figures.ts`, `ui/src/lib/figures.test.ts`
- Create: `ui/src/components/ui/whole.tsx` and `whole.stories.tsx`, from `mockup-tree/ui/src/components/Whole.tsx`
- Create: `ui/src/components/ui/meter.tsx` and `meter.stories.tsx`
- Create: `ui/src/lib/takeScale.ts`, `ui/src/lib/takeScale.test.ts`
- Modify: `ui/src/components/TakeSummary.tsx:131` (its bar height through `drawnLength`, least 5)
- Modify: `docs/design-system.md` (B6 and C8 lines name these)

**Interfaces:**
- Produces:
  - `type Part = { text: string; keep: number; join?: string }`
  - `fitFigures(parts: Part[], widths: number[], dot: number, comma: number, room: number): boolean[]`: which parts show. Parts are dropped lowest `keep` first, until the joined width is at most `room + 0.5`.
  - `joinFigures(parts: Part[], shown: boolean[]): string`
  - `useCut<T>()`, `WholeTip({ cut, text, children })`, `Whole({ text, className })`, `Figures({ parts, className })`
  - `Meter({ sides: number[]; tone: "signal" | "notes"; label?: string; className? })`: values are 0..1. One bar, split top and bottom for two sides. The `signal` fill is `bg-signal`, the `notes` fill is `bg-foreground/60`. The look is today's check bar (`h-2 rounded-full border bg-background`).
  - `drawnLength(sec: number, longest: number, full: number, least = 4): number`

- [ ] **Step 1: Write the failing tests.**

```ts
// figures.test.ts
const p = (text: string, keep: number, join?: string): Part => ({ text, keep, join })
const parts = [p("18 inputs", 2), p("48 kHz", 1), p("24 bit", 0)]
test("all fit", () => expect(fitFigures(parts, [60, 40, 40], 10, 6, 200)).toEqual([true, true, true]))
test("the least needed goes first", () => expect(fitFigures(parts, [60, 40, 40], 10, 6, 115)).toEqual([true, true, false]))
test("then the next", () => expect(fitFigures(parts, [60, 40, 40], 10, 6, 65)).toEqual([true, false, false]))
test("none fit", () => expect(fitFigures(parts, [60, 40, 40], 10, 6, 20)).toEqual([false, false, false]))
test("a comma join only after a shown part", () =>
  expect(joinFigures([p("Sat 19 Sep", 1), p("3 weeks ago", 0, ", ")], [true, true])).toBe("Sat 19 Sep, 3 weeks ago"))
// takeScale.test.ts
test("half as long, half as tall", () => expect(drawnLength(30, 60, 24)).toBe(12))
test("never under the least", () => expect(drawnLength(1, 600, 24)).toBe(4))
test("no length is the least", () => expect(drawnLength(0, 0, 24, 5)).toBe(5))
```

- [ ] **Step 2:** `npx vitest run src/lib/figures.test.ts src/lib/takeScale.test.ts`. Expected: FAIL, the module is missing.
- [ ] **Step 3: Implement.**
  - `Figures` measures through `fitFigures`.
  - `WholeTip` opens on hover and on keyboard focus while the text is cut. It stays open while focus is inside, even when focusing scrolled its container (Review Focus 4: Radix closes on scroll, so set `open` from focus as well as from Radix).
  - `Figures` keeps the whole line in an `sr-only` span.
  - Drop the mockup's MOCKUP comments.
- [ ] **Step 4:** Run the Vitest file again (PASS). Build the stories. Run `npm run design-check`.
- [ ] **Step 5:** Commit: `ui: shared pieces for long names, the meter and a go's length`.

### Task 3: Figures and port sentences said once (B8)

**Files:**
- Modify: `ui/src/lib/format.ts`, `ui/src/lib/format.test.ts`, `ui/src/lib/midiPorts.ts`, `ui/src/lib/midiPorts.test.ts`, `ui/src/components/SetPicker.tsx:30`, `ui/src/screens/Recording.tsx:342-345`

**Interfaces:**
- Produces:
  - `inputsLabel(n): string` ("1 input", "18 inputs")
  - `rehearsalsLabel(n)` ("1 rehearsal", "4 rehearsals")
  - `songsLabel(n)` (moved from `SetPicker.tsx`, same words)
  - `inCloudLabel(n)` ("3 in the cloud")
  - `portBusyText(port: string): string` (`“{port}” is in use by another app.`)
  - `portGoneText(port: string, track: string): string` (`“{port}” is not connected. {track} records its notes from the moment it is plugged in.`)

- [ ] **Step 1:** Add the failing Vitest cases with exactly the strings above. Run them and see them fail.
- [ ] **Step 2:** Implement. Point `SetPicker` and `Recording` at them, then `grep` `ui/src` for the inline forms ("input" plurals, "rehearsals", "in the cloud") and move this screen's onto the helpers. The screen's own uses are rewired in Tasks 4-7.
- [ ] **Step 3:** `npx vitest run` passes. `npm run build` passes.
- [ ] **Step 4:** Commit: `ui: counts and port sentences from one place`.

### Task 4: Three groups, the name beside Start, and the check by place

**Files:**
- Modify: `ui/src/components/Shell.tsx` (title `text-base`; prop `air?: boolean` makes header `px-8` and footer `px-8 py-6`)
- Modify: `ui/src/screens/Setup.tsx` (layout per Q1, from `mockup-tree/ui/src/screens/Setup.tsx` with `air`, `panel` and `footer` true; Check signal by place; taking a track off with Undo; Start's width)
- Test: `ui/e2e/setup.spec.ts`

**Interfaces:**
- Consumes: Task 1's Alert, Task 2's `Meter`, Task 3's helpers.
- Produces: `Setup` lays out three parts:
  - `data-part="past"` (the left part);
  - `data-part="setup"`, holding `section[data-tracks]`;
  - the footer's `FooterRow` with `left` = the name field and `rule`.

  Track rows carry `data-track-row` (renamed from `data-track-card`; update every spec that used it).

- [ ] **Step 1: Write the failing e2e tests** (Latin titles):
  - `the start screen is three groups: past, tracks, tonight`: `#rehearsal-name` is inside `footer`. "Recording with" is the first row inside `section[data-tracks]`. `data-part="past"` is left of `data-part="setup"` at 1180 px.
  - `renaming a track during the check keeps its meter and signal`: start the check, see Drums' meter move and "signal", rename Drums to "Kit", and the meter still moves and "signal" stays.
  - `taking a track off says so and Undo puts it back in its place`: remove the second of four. The notice reads `Bass was taken off.` Undo puts it back as the second, with its input and name.
  - `Cmd+Z puts back the track taken off`: the same, by the key, with focus outside a field.
  - `taking a track off during the check keeps the others' meters`: remove the first while checking. The remaining tracks' meters and "signal" stay with them.
  - `Start keeps its width while Last time plays`: measure Start and the set picker, press ▶ on a Last time song, and both boxes are unchanged to the pixel. The Space chip is there but invisible (`toBeHidden` is not enough; check `visibility`).
- [ ] **Step 2:** Build (`npm run build`) and run `npx playwright test -c playwright.local.config.ts e2e/setup.spec.ts`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement.**
  - Take the mockup's layout with only the chosen branches.
  - Keep the readings by place: `checkedNames` (the names Python knows each track's input by, set when the check begins) moves with the tracks on removal and Undo, as `checkedPorts` does.
  - Take `removeTrack` with `notify({ kind: "done", key: "setup-track", text, action: { label: "Undo", run } })`.
  - Start keeps its `Kbd`, with `invisible` while `inHand`.
  - The three groups use `animate-rise` with `--i` set to 0, 1 and 2 (`index.css:92`), which puts them 40 ms apart.
  - Warnings go on `Alert variant="warning"`.
  - Spacing: `px-8 py-8` round the screen, `gap-12` between groups, rows `px-6 py-4`, the head `px-6 pt-5 pb-4`, the left part `w-[28rem]`.
- [ ] **Step 4:** Run the whole Playwright suite. Fix the specs whose selectors changed (`data-track-card`, the name field's place) without weakening what they check. Then `npx vitest run`, `npm run lint` and `npm run design-check`.
- [ ] **Step 5:** Commit: `ui: the start screen in three groups, with the name beside Start`.

### Task 5: The left part behind a button in a narrow window

**Files:**
- Create: `ui/src/lib/wide.ts`, `ui/src/lib/wide.test.ts`
- Modify: `ui/src/screens/Setup.tsx` (the header button and the Sheet, from the mockup's `narrow === "panel"` branch; every `min-[1100px]:` class becomes conditional on `useWide()`)
- Test: `ui/e2e/setup.spec.ts`

**Interfaces:**
- Consumes: Task 1's Sheet.
- Produces:
  - `WIDE_REM = 68.75`
  - `isWide(windowPx: number, rootPx: number): boolean`
  - `useWide(): boolean`: via `useSyncExternalStore`, on window `resize` and on a `MutationObserver` of `documentElement`'s `style` (where `applyAppearance` sets the font size).

- [ ] **Step 1: Write the failing tests.** Vitest:
  - `isWide(1100, 16)` is true;
  - `isWide(1099, 16)` is false;
  - `isWide(1100, 20.8)` is false;
  - `isWide(1430, 20.8)` is true.

  Playwright:
  - `under 1100 px Last time opens as a side panel from the header`: at 1000 × 820, `data-part="past"` is not visible and the "Last time" button is. Clicking it gives `aria-expanded="true"`, and the panel holds the Last time card.
  - `Esc closes the panel and focus returns to its button`; the same for ✕ and a click on the veil.
  - `widening the window closes the panel`: open at 1000 px, resize to 1180 px, and the panel is gone, the left part is on the left and the button is hidden.
  - `at 130 percent the side panel takes over below 1430 px`: set the root's font size to 20.8 px at 1280 × 820. The button shows, and the tracks group is as wide as the screen's content box.
  - `the header button shows Last time playing`: ▶ in the panel, close it, and the button has `[data-playing]`, the same width as before, and the `, playing` text.
- [ ] **Step 2:** Run both. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - The panel closes when `useWide()` turns true.
  - `onCloseAutoFocus` sends focus to the header button.
  - The button is rendered only while not wide and the screen has a Last time.
- [ ] **Step 4:** Run the whole Playwright suite, Vitest, lint and design-check.
- [ ] **Step 5:** Commit: `ui: under 1100 px the left part opens from a Last time button`.

### Task 6: Last time on the shared pieces

**Files:**
- Modify: `ui/src/components/LastTime.tsx` (from the mockup tree, `names === "first"` branches)
- Modify: `ui/src/components/SongName.tsx` (the shared `Button variant="link"`, a block title that can wrap, its tip through `WholeTip`; History's overview takes the same look)
- Test: `ui/e2e/setup.spec.ts`, and `ui/e2e/history.spec.ts` where song names are asserted

**Interfaces:**
- Consumes:
  - `PlayButton` (size `row`) in place of the hand-made ▶ (`LastTime.tsx:378-410`);
  - `Item` for Earlier's rows;
  - `Card` (fill, no border) for the Last time card;
  - `Figures`/`Whole` and `drawnLength`;
  - `TakeTitle`, lucide `Star` for ★;
  - one label dot, one mark note line;
  - `rehearsalsLabel`, `inCloudLabel`.

- [ ] **Step 1: Write the failing e2e tests:**
  - `Not played keeps the song name whole and drops figures`: with the stress data (copy `mockup-tree`'s q3 stress names into the fake band, or reuse `/mnt/project-files/design-system/screen-start/q4/src/stress.js`), "Dym" is not cut. Its figure line has `[data-dropped]` and its sr-only text is the whole line.
  - `a cut name shows whole on hover`: hover Kalychanka's name and the tooltip holds the whole title. Then the same by Tab, when the focus scrolls the left part.
  - `the small play button shows a spinner after one second`: make the fake bridge slow to load a take (add a `window.__SLOW_LOAD_MS__` switch to `fake-bridge.js` if none exists). There is no spinner at 0.5 s and there is one at 1.5 s. This is the foundation's deferred PlayButton e2e.
  - `Earlier rows open their rehearsal by keyboard`: Tab to a row, press Enter, and History opens on it.
  - `the Last time heading has no capitals`: its text is `Last time · …` and its computed `text-transform` is `none`.
- [ ] **Step 2:** Build and run them. Expected: FAIL.
- [ ] **Step 3: Implement**, with the inventory §3 rows for `LastTime.tsx`, `SongName.tsx` and `IconPicker.tsx` as the checklist:
  - text sizes in rem;
  - no capitals;
  - fill only;
  - PlayButton;
  - every button the shared Button;
  - the link look;
  - Item;
  - TakeTitle, the dot, the note line and ★;
  - `Not on disk`;
  - tooltips for native titles;
  - figures through `lib/format`;
  - the columns through `drawnLength` (24 px full, 4 least).
- [ ] **Step 4:** Run the whole Playwright suite, Vitest, lint and design-check.
- [ ] **Step 5:** Commit: `ui: Last time on the shared pieces, long names kept whole`.

### Task 7: The tracks group's rows

**Files:**
- Modify: `ui/src/screens/Setup.tsx` (rows, Recording with, warnings, Look again, empty state)
- Modify: `ui/src/components/IconPicker.tsx`, `NameField.tsx`, `midi/ModeSwitch.tsx`, `midi/PortPicker.tsx`, `midi/NotesCheck.tsx`
- Test: `ui/e2e/setup.spec.ts`, `ui/e2e/midi.spec.ts`

**Interfaces:**
- Consumes: Toggle, ToggleGroup (`switch`), Alert, Spinner, Empty, Tooltip, `Meter`, `Figures`/`Whole`, `inputsLabel`.
- Produces:
  - `NameField` keeps its props. Its text area takes the shared focus ring and a fill on hover, and stays bare at rest.
  - `ModeSwitch` keeps its props, on `ToggleGroup type="single" variant="switch"`.

- [ ] **Step 1: Write the failing e2e tests:**
  - `a port pulled out is said in its track's line and no row moves`: with Keys on MIDI and the check running, pull the port (`__MIDI_GONE__`). The note `Not connected. Records its notes from the moment it is plugged in.` is inside Keys' row. Every row's top and bottom, Add track's box and the footer's box are unchanged.
  - `no empty band under Recording with`: with a track on Both, the first row starts at Recording with's bottom plus the row line, with no gap over 1 px.
  - `an empty band says how to add tracks`: remove every track. `No tracks yet` and its line show, and Add track works.
  - `Stereo is a toggle with aria-pressed`, and the on look is not the accent (its background is not `--primary`).
  - `arrow keys move along Audio Both MIDI`.
  - `Look again shows a spinner only after one second` (the fake bridge's rescan made slow).
  - `the device name keeps its width and the figures give way`: with the stress device name, the name is not cut and the figure line has `[data-dropped]`.
- [ ] **Step 2:** Build and run them. Expected: FAIL.
- [ ] **Step 3: Implement**, with the inventory §3 rows for `Setup.tsx`'s tracks, `ModeSwitch`, `PortPicker`, `NotesCheck` and `NameField` as the checklist. The mockup tree's port-line code has the five notes. Only "At least one track has to record sound" stays above the rows, on an Alert. Use one `Check` icon for "signal" and for "notes".
- [ ] **Step 4:** Run the whole Playwright suite, Vitest, lint and design-check.
- [ ] **Step 5:** Commit: `ui: the start screen's track rows on the shared pieces`.

### Task 8: Off the allow-list, and what the PR says

**Files:**
- Modify: `ui/design-check.allow.json` (remove the entries for `Setup.tsx`, `LastTime.tsx`, `IconPicker.tsx`, `midi/ModeSwitch.tsx`, `midi/NotesCheck.tsx`, `midi/PortPicker.tsx` and `SongName.tsx`; Shell keeps only `uppercase`)
- Modify: `docs/design-system.md` ("Where things stand": the start screen is redone)
- Modify: `CHANGELOG.md` (Unreleased)
- Modify: `docs/screenshots/setup.png` (via `tests/docs_screenshots.py`)
- Check: `site/` (its story drives this screen)

- [ ] **Step 1:** Remove the entries and run `npm run design-check`. It passes, with fewer known cases than 74. Fix any leftover finding in those files; never add a `design-ok` waiver except for a real exception, with its reason.
- [ ] **Step 2:** Add a CHANGELOG paragraph, in the Unreleased section's voice, covering:
  - the start screen in three groups, with the name beside Start;
  - Last time behind a button in a narrow window;
  - long names kept whole;
  - Undo for a track taken off;
  - Check signal keeping a renamed track's meter.
- [ ] **Step 3:** Regenerate `setup.png` with `tests/docs_screenshots.py`. If Python Playwright cannot launch, point it at `/opt/pw-browsers/chromium` through a temporary copy; never run `playwright install`. Look at the picture before committing.
- [ ] **Step 4:** Run everything:
  - `tests/run_all.py`;
  - in `ui/`: design-check, lint, Vitest, build, build-storybook, and the whole Playwright suite;
  - in `site/`: tsc, Vitest, build and Playwright (draw `dist/og.png` first, as the foundation did).

  All pass, except the known `scrollbars.spec.ts:12` in the container.
- [ ] **Step 5:** Commit: `ui: the start screen leaves the allow-list`.
