# Rehearsal Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Step 4 of the design system's rollout for its second screen: the rehearsal screen and the big player. The screen is grouped as the owner chose on three mockups, and the lanes are one group as he asked after them. Every piece is on the shared components, nothing jumps, and its 15 files leave the design check's allow-list.

**Architecture:** First the test fixtures: a rehearsal stress band with a MIDI-only track, which the band's meters can take. Then the screen from the outside in:

1. the Next take panel as one group (Q1, Q2);
2. the frame: a header name that wraps, figures that give way, a footer where nothing moves;
3. the evening's songs as one group, with the take row on the shared pieces;
4. the strip and its tabs;
5. the transport, and the one line the player keeps for what it has to say;
6. the lane plates with M and S at the fader (Q3);
7. last, the lanes as one group.

Each task adds the shared piece it is the first to need, with its story: `PopoverAnchor`, `rise`, `MarkTick`, Alert's `line` size, `Whole`'s `reach`, Toggle's `lane` size. The reference tree is `/mnt/project-files/design-system/screen-rehearsal/mockup-tree/`: q3's patch, which carries q1 and q2, applied on 684d726. Its README says which `lib/mk.ts` branches the PR keeps. Task 8 takes the lanes from `/mnt/project-files/design-system/screen-rehearsal/q4-lanes/` instead: its `src/q4-over-q3.diff` is what it changes over q3, and its README says how it was measured.

**Tech Stack:** React 19, TypeScript, Tailwind v4, the unified `radix-ui` package, cva, lucide; Storybook 10.6.1; Vitest (node) and Playwright on `ui/e2e/fake-bridge.js` with `ui/e2e/band.js`.

**Spec:** `docs/superpowers/specs/2026-10-08-design-system-design.md`: C1-C8, U1-U5, B1-B9, K3, rollout step 4 (`:416-421`), and the big player restyled with this screen (`:495-496`). The rules as merged are in `docs/design-system.md`. The owner's answers are at the end of `/mnt/project-files/design-system/rulings.md`: "Rehearsal screen Q1" to "Q3" and "Lanes as one group". What the PR does without asking is in `/mnt/project-files/design-system/screen-rehearsal/inventory.md`:

- §1: the pieces, and six layout jumps;
- §2: the 29 allow-list cases in 15 files;
- §3: what is already decided;
- §4: Claude's calls, which the owner did not object to.

The inventory counted lines on 4de49d5; `ui/src` is the same on 684d726, and every line below is 684d726's. How each mockup was built and measured is in `screen-rehearsal/q1/` to `q3/` `README.md`.

## Global Constraints

- Everything in the foundation plan's Global Constraints still holds (`docs/superpowers/plans/2026-10-10-design-system-foundation.md`):
  - Latin-only test titles (plain ASCII here: no ★, ×, ‹ or →);
  - the five text sizes and two weights;
  - radii of 4/8/12/full (`rounded-sm`/`md`/`lg`=`xl`/`full`, `ui/src/index.css:70-74`);
  - the motion values;
  - the spacing steps;
  - shared components only in `components/ui/`, with a story each;
  - Radix only there;
  - tests first, seen failing.
- The start screen's rulings carry over:
  - Shell's title is `text-xl`;
  - the shared `TooltipTrigger` opens no tip on focus that the mouse left behind;
  - tips are for cut names and icon buttons, and other native titles go. This plan adds one exception, under Calls.
- The owner's answers, exact:
  - **Q1 «Песни одной группой»** (2026-10-12 09:12Z): one group per job.
    - The evening's songs are one group: Send starred, Clear false starts and the legend at its head, each song's takes split from the next by a 1 px line.
    - The Next take panel is one group: the field at its head, the set and the other songs as its rows under full-width lines.
    - Air as the start screen's: 32 round the screen, 48 between groups, 24 inside a group.
  - **Q2 «Сбоку, как сейчас»** (09:40Z): under 1100 px the panel stays beside the takes at 22.5rem, and from 1100 px it is 26rem. The breakpoint follows the Appearance scale. There is no header button. At 960×680 two tabs in view and a transport on two lines are accepted.
  - **Q3 «M и S у фейдера»** (10:08Z): on every plate in the player (tracks, Master, MIDI notes), M and S sit in the fader's row, after the fader. The name has the plate's whole width (about 152 px), is cut past that, and shows whole in the shared tooltip on hover and keyboard focus. Every lane stays 56 px.
  - **Lanes as one group** (10:09Z, «и я бы дорожки сделал одной группой»):
    - one fill for all the track lanes, plates and waveforms, the MIDI notes lane included;
    - lanes split by a 1 px line, as the start screen's tracks group;
    - Master stays its own group under the lanes, sticky at the bottom;
    - lanes stay 56 px, with M and S at the fader.
- Copy, exact:
  - The panel's label is `Next take` (no capitals). An empty set says `This set has no songs yet. Add them in Settings › Sets.`
  - Footer: `Finish` with `Esc`, and `Record take {N}` with `Space`. Both chips stay, unseen, while a take is in hand.
  - The header's figures are labelled `Length`, `Takes`, `In the cloud` and `On disk` (no capitals). Their tip says them all as `Length 1 h 54 min · Takes 32, 14 songs · …`: each label, a space and its value as the header writes it (`lengthLabel`, `takesLine`, `formatBytes`), joined by ` · `.
  - A take row says `false start` on a Badge.
  - Mark is `Mark` or `Open mark`, in one width.
  - The player's line says `Cropping…` (RunningLine, as today), the output warning or the load error, in their own words.
  - Tips keep today's words: `To start`, `Keys (?)`, `Earlier songs`, `Later songs`, `Every take of {song} (↑ ↓)`, `Repeat it (R)` / `Stop repeating it (R)`, `Clear it — Repeat then loops the whole take`, `Star this take` / `Starred. Click to take the star off`, and Send starred's and Clear false starts' reasons.
  - Wording, as the take PR left it: take and takes, never go or goes, in the UI and in CHANGELOG. A song's take is `Pałyn 3`, and one nobody named is `Take 7`.
- Selectors that reha.stream's story drives keep working (`site/src/stage/Story.tsx`):
  - `#next-take-name` and its `.value` (`:169-176`);
  - `[data-name-pills='4'] [data-song-choice='Sonca']` (`:213`);
  - `[role='group'][aria-label='Sonca'] [data-take='4']` (`:220`);
  - a button `Send starred` (`:221`);
  - `button[aria-label^="Take 2 Pałyn 5"]` (`:264`);
  - a button labelled exactly `Repeat` (`:268`);
  - `[data-tab][aria-current='true'] [data-tab-line]` (`:276`);
  - the `Songs` button (`:279`).

  `site/e2e/notfound.spec.ts:49` reads Repeat's `aria-pressed`.
- **The allow-list only shrinks, task by task.** `npm run design-check` fails on an entry that no longer matches anything (`ui/scripts/design-check.mjs:4-8`). So each task removes, in its own commit, the entries of its files it has emptied. At the end, design-check says `31 known cases in 20 files`.
- Tests:
  - Boxes are measured only after `settled(page)`, moved into `e2e/app.ts` by Task 1: a group mid-rise is up to 12 px off, which made PR #46's CI flaky.
  - Looks are checked by computed style, not by class strings.
  - Held calls go through `hold`/`letGo`.
  - Text in a regular expression goes through `literally()`.
  - A colour is compared with a theme token through `getComputedStyle` of a probe, as `lanes.spec.ts`'s `colour()` does.
- Python is not touched. If it is, `/home/claude/venv312/bin/python tests/run_all.py` runs too.
- Pictures in `docs/screenshots/` are retaken at the release, not here.
- Branch `claude/design-system-rules-8v42zg`, from main 684d726. The PR opens only after the whole-branch review's findings, minors included, are fixed and pushed. It is never merged without the owner's word.
- The checks, in `ui/`:
  - `npm run build`;
  - `npx playwright test -c playwright.local.config.ts` (4 workers). `scrollbars.spec.ts:12` fails only in the container;
  - `npx tsc -p tsconfig.app.json --noEmit` and `npx tsc -p tsconfig.node.json --noEmit`;
  - `npm run lint` (oxlint, 21 warnings: no new ones);
  - `npm run design-check`;
  - `npx vitest run`;
  - `npm run build-storybook` when a file in `components/ui/` changes.

## Review Focus

1. **Appearance at 150 % in the smallest window (960 × 680), with the rehearsal stress data.** Expected:
   - the panel is beside the takes at 22.5rem;
   - neither the main column nor the panel scrolls sideways;
   - the rehearsal's long name wraps with its pencil;
   - Finish and Record are whole.

   Test in Task 3.
2. **A take playing in place, then opened in the player, then put away with Esc.** Expected: Finish, Record, the field and the playing bar keep their boxes, the sound goes on into the player, and Space stays the take's. Tests in Tasks 3 and 4.
3. **A crop running when the output goes quiet, on a take whose notes are still being read.** Expected:
   - the player's line says one thing at a time: the error over Cropping, Cropping over the warning;
   - the notes lane shows its spinner after 1 s;
   - the timeline's top never moves.

   Tests in Tasks 6 and 7.
4. **A short starred take with a mark in its first seconds, playing in place, in both themes.** Expected:
   - the tick passes under the number and the name, which keep the bar's fill behind them;
   - the played part washes over the name;
   - the bar keeps its width.

   Test in Task 4.
5. **Eight tracks, one on Both and one on MIDI only, at 960 × 680 with the page scrolled** (the rehearsal stress data). Expected:
   - the lanes are one group, with a 1 px line between tracks, none between a Both track's audio and notes, and no gaps;
   - every audio lane is 56 px;
   - Master is its own group, stuck to the bottom in a band as wide as the lanes, with nothing of a lane beside it;
   - a cut plate name reached by Tab shows whole.

   Tests in Tasks 7 and 8.

## Files

| File | Its one job |
|---|---|
| `ui/e2e/stress-rehearsal.js` (new), `ui/e2e/app.ts`, `ui/e2e/band.js` (modify) | The rehearsal's stress band, opted into; meters for the tracks that take sound; the shared test helpers. |
| `ui/e2e/{rehearsal-stress,next-take,rehearsal-frame,overview,strip,transport}.spec.ts` (new), and the specs each task lists (modify) | The tests. |
| `ui/src/components/ui/{popover,mark,alert,whole,toggle}.tsx` and their stories (modify) | The shared pieces this screen is first to need. |
| `ui/src/lib/motion.ts` (modify) | One `rise(i)` for a screen's entrance. |
| `ui/src/screens/Rehearsal.tsx` (modify) | The screen: the panel, the frame, the footer. |
| `ui/src/screens/{Setup,Review,HistoryScreen}.tsx` (modify) | One line each: `rise` from `lib/motion.ts`; the player's `status` only while cropping. |
| `ui/src/components/{Shell,FooterRow,EveningFacts}.tsx` (modify) | The header's name and figures, the footer's error. |
| `ui/src/components/{TakeNameField,NextTakeSongs,SongKeys}.tsx` (modify) | The Next take panel. |
| `ui/src/components/{RehearsalOverview,SongPills,EveningActions,StarButton}.tsx` (modify) | The evening's songs and the take row. |
| `ui/src/components/{TakeStrip,SongTab}.tsx` (modify) | The strip and its tabs. |
| `ui/src/components/{TakePlayer,RegionTag,TakeMap,MarkerDialog,ShareDialog,PlayerKeys}.tsx` (modify) | The transport and what the player says. |
| `ui/src/components/LaneControls.tsx`, `midi/NotesPlate.tsx`, `midi/NotesLane.tsx` (modify) | The plates (Q3). |
| `ui/src/components/Timeline.tsx`, `ui/src/components/ui/lane-plate.tsx`, `ui/scripts/design-rules.mjs` and `design-rules.test.mjs` (a comment each) (modify); `ui/src/lib/laneHalf.ts`, `laneHalf.test.ts` (delete) | The lanes as one group. |
| `ui/design-check.allow.json`, `docs/design-system.md`, `docs/using-it.md`, `CHANGELOG.md` (modify) | The list, the rules, the guide, the news. |

## Calls this plan makes

The inventory's §4 calls stand. This plan adds:

- **A mark tick passes under a short take's name** (asked for by the coordinator as a §4-style call). In a short bar a tick lands on the name and strikes it out. So the bar's fill is opaque in every state:
  - at rest, `bg-muted`;
  - starred, `bg-card` with the signal tint as a flat gradient over it (`bg-linear-to-r from-signal/10 to-signal/10`);
  - a false start or a take that is missing, `bg-card`.

  The number and the name sit on a backing that inherits the bar's background (`[background:inherit]`, `-mx-1 px-1 rounded-sm`), drawn after the ticks. The played wash and the playhead are drawn after the name, so the part played shows over it. Cost: the row's hover tint no longer shows through the bar.
- **The player keeps one line for what it has to say** (B4), on Alert's new `line` size. The crop's progress, the output warning and a load error all go there, one at a time: the error, then Cropping, then the warning. The line is cut to one line and whole on hover. It takes the place of the gap between the transport and the map (`h-6`, with no gap round it), so the timeline sits where the mockup puts it and nothing moves when it fills. A load error is said there too, since the lanes never come.
- **The footer's error moves nothing** (B4, jump 5). `FooterRow` draws it over the buttons in the room the footer's top padding already has: one line of `text-xs`, cut, whole on hover, `role="alert"`. This holds on the four screens that use it. Cost: a long error is cut on screen, though a screen reader hears it whole.
- **A greyed button's reason is a Tooltip, and the button's description**, not dropped. This covers Send starred and Clear false starts (`EveningActions.tsx:149`, `:161`), and a row's cloud error (`RehearsalOverview.tsx:487`). It is the only place the reason is said, and `docs/using-it.md` promises that pointing at the button says why. Every other native title in §3's list goes, or becomes a Tooltip on an icon button with the same words.
- **Rows that do one thing are the shared `Button`**: the set's and the songs' rows, a tab list's rows, a mark's line, as the mockup drew them. A take row keeps its own grid, with its bar (a Button) as the way in by keys. `Item`'s paddings (12 px or 16 px) would make every row taller than in the mockup the owner chose. §3's "rows on Item" is carried out as rows that keys reach, with the shared focus ring. The share dialog's three options, each a title and a line, go on `Item asChild` with a ghost `Button`, as Earlier's rows do (`LastTime.tsx:425-447`).
- **A cut plate name is the shared `Whole` with a new `reach` option**: a Tab stop only while the name is cut, the shared focus ring, and the tip on focus. The mockup's `PlateName` does not come over. That keeps one piece for a cut name (U2: a variant, not a copy).
- **The notes lane's row names go from 9 px to 12 px**, and in rem. They need 14 px a row (`0.875rem`), and the notes plate's least height becomes 91 px at the scale of 1 (6 × 14 + 3 + 3 + 1), also in rem. A lane of notes is 18 px taller. In Task 8 the lower half's line goes: a Both track's notes row has none, and a MIDI-only notes row has its line outside it. So the plate's least height is 90.
- **The lanes group (Task 8) is q4-lanes' as built in its second round**: a line between tracks only, none between a Both track's audio and its notes, and Master's sticky band as wide as the lanes. Two calls the mockup left open:
  - **`laneHalf` goes.** Once every track plate is a row of the group, only Master's plate has a box, and nothing uses the halves. `LanePlate` takes `grouped` in place of `half`, and `lib/laneHalf.ts` and its test are deleted.
  - **The notes lane's octave lines drop to 40 % of the border colour** (`--nl-grid`, today 80 %), and its row names' backing becomes the card's (`bg-card/85`). On the group's fill the octave lines at 80 % read as the lines between lanes in the light theme, and a `bg-background` backing would show as a chip.
- **History's overview loses its figures line with this PR** (§4's call). Its header has the same figures through `EveningFacts`, and History's PR leaves it so. `EveningFacts` gives way in History's header too.
- **The header's figures measure with `fitFigures`** (`lib/figures.ts`, B6's arithmetic). The facts stay stacked as label over value, 24 apart (today 28). A fact that gives way is not drawn. The group's tip and an `sr-only` line say them all.
- **"Record take {N}" keeps room for two digits** (`tnum`), so Finish does not move at take 10 (jump 6). It grows once, at 100.
- **One cloud icon, `CloudUpload`**, on the take toolbar in the strip and the row whatever the state. The button's label says which, as today, and the row keeps its `CloudCheck` mark for a take in the cloud.
- **The old name's line is on the shared `Popover`** (§3), anchored to the field. Its content is portalled, so it leaves the field's group in the DOM, and the tests find it by page. Focus stays in the field.
- **`rise(i)` moves into `lib/motion.ts`** for `Setup.tsx`, `Rehearsal.tsx` and the overview. The songs group rises first, then the panel, 40 ms apart.
- **The set card stays in `NextTakeSongs.tsx`.** History's `SetPlayed.tsx` moves onto it with History's PR: shared once two screens use it (U3).
- **B9 is not in this PR**, as on the start screen. `Shell.tsx`'s `uppercase` and `ActivityButton.tsx` stay on the allow-list.

---

### Task 1: The rehearsal stress band, and meters for a MIDI-only track

**Files:**
- Create: `ui/e2e/stress-rehearsal.js`, from `/mnt/project-files/design-system/screen-rehearsal/q4-lanes/src/stress.js` (q3's, with Drums on Both)
- Modify: `ui/e2e/band.js:204-207` (`meters()`), `ui/e2e/app.ts:86-95` (`openBandApp`)
- Modify: helpers move into `ui/e2e/app.ts`: `settled` (`setup.spec.ts:81-88`), `scaled` (`lanes.spec.ts:36-37`), `colour` and `style` (`lanes.spec.ts:62-77`), `TONIGHT` (`evening.spec.ts:13-34`, with its comment) and `openEvening` (`:40-49`); those specs import them
- Test: `ui/e2e/rehearsal-stress.spec.ts` (new)

**Interfaces:**
- Produces:
  - `openBandApp(page, { stress?: boolean | "rehearsal" })`. `true` is the start screen's `stress.js`, as today; `"rehearsal"` lays `stress-rehearsal.js` over the band. Its contents:
    - "Tuesday jam at the old brewery, with the horn section and the choir from upstairs", 32 takes;
    - seven audio tracks with "Lead and backing vocals (Hanna)", and "Keys (Nord Stage 3 MIDI)" on MIDI only;
    - Drums on Both from TD-17, so every take has `Drums.mid` too: nine lanes for eight tracks;
    - the set "Gig on the 25th at the old brewery with the horn section" of 10 songs;
    - the next take is 33.
  - From `e2e/app.ts`: `settled(page)`, `scaled(scale)`, `colour(page, token)`, `style(locator, ...props)`, `TONIGHT` and `openEvening(page, before?, tonight?)`, as they are today.
  - `meters()` names only the parts that take sound (`p.mode !== 'midi'`), as Python's meters do.

- [ ] **Step 1: Write the failing test.** `a band with a MIDI-only track records a take with no error in the page`: `openBandApp(page, { stress: "rehearsal" })`, Start, `recordTake(page, 33)`, Save take, and "Record take 34" shows. The fixture's own `test` fails on any page error. Copy q4-lanes' stress.js without its two stopgaps, `VOICE[MIDI_TRACK] = () => 0` and `soundOnly`, so that the test meets the band's bug.
- [ ] **Step 2:** `npm run build`, then `npx playwright test -c playwright.local.config.ts e2e/rehearsal-stress.spec.ts`. Expected: FAIL, because `VOICE[p.name]` is not a function in `get_levels`.
- [ ] **Step 3: Implement.** Filter the MIDI parts out in `meters()`. Move the helpers into `app.ts` unchanged, and import them where they were.
- [ ] **Step 4:** Run the whole Playwright suite, `npx tsc -p tsconfig.node.json --noEmit` and lint.
- [ ] **Step 5:** Commit: `ui: a rehearsal stress band, and meters only for tracks that take sound`.

### Task 2: The Next take panel as one group

**Files:**
- Modify: `ui/src/screens/Rehearsal.tsx:415-467`. Take the aside from `mockup-tree/ui/src/screens/Rehearsal.tsx` with `mk.group` and `mk.air` true and `behind` null. Its width comes from `useWide()`, which replaces `min-[1100px]:` at `:419`. Leave out `takeMkOpen`, `arrowPicks`, the Sheet and the header and top branches.
- Modify: `ui/src/components/TakeNameField.tsx`:
  - the big size wraps, on a `textarea`;
  - the label at `:228-236`;
  - the ✕ at `:332-342` and the link at `:204-221` on `Button`;
  - the old-name float at `:358-362` on `Popover`.

  Take the mockup's branches except `inline` and `oldAbove`.
- Modify: `ui/src/components/NextTakeSongs.tsx` (rows `:19-73`, SetCard `:82-140`, SongRows `:150-258`, from the mockup with `flat` and `air`) and `ui/src/components/SongKeys.tsx`
- Modify: `ui/src/components/ui/popover.tsx` (export `PopoverAnchor`, as shadcn's file has it) and `popover.stories.tsx` (an anchored case)
- Modify: `ui/design-check.allow.json` (drop `NextTakeSongs.tsx`, `SongKeys.tsx`, `TakeNameField.tsx`)
- Test: `ui/e2e/next-take.spec.ts` (new), `e2e/sets.spec.ts:175-181`, `e2e/naming.spec.ts:615`, `e2e/song-keys.spec.ts:178`

**Interfaces:**
- Consumes: `useWide()` (`lib/wide.ts:56`), `Empty`/`EmptyDescription`, `Button` (`ghost` rows, `link`, `icon-row` ✕), `PopoverAnchor`.
- Produces:
  - The aside `[data-next-take-panel]` holds the field, then the set (`[data-set-card]`), then the songs (`[data-song-list]`). Each part after the first sits under a 1 px line across the panel's width.
  - The panel is `px-8 py-8`, and `w-[26rem]` when `useWide()` holds, else `w-[22.5rem]`.
  - `TakeNameField` keeps its props. In the big size `#next-take-name` is a `textarea rows={1}`: a line break typed or pasted becomes a space, and Enter never adds a line.

- [ ] **Step 1: Write the failing e2e tests** in `next-take.spec.ts`:
  - `the next take panel is one group with lines between its parts`: the set's and the songs' parts each have a 1 px top border in `--border`, and their boxes span the aside's width. The set card has no border or radius of its own.
  - `the panel is 26rem from 1100 px and 22.5rem under it, following the scale`: 416 px at 1180, 360 at 1000, and 468 at 1280 with the root at 20.8 px.
  - `a long next take name wraps and its take number follows its end`: stress at 1180. Fill "Dancing barefoot on the roof of the old brewery". The field is at least two lines tall. `[data-take-go]` is visible and inside the field's box. The set card's top moved down by one line (±1 px).
  - `a line break pasted into the next take name becomes a space`: `fill("Pałyn\nViasna")` gives the value `Pałyn Viasna`.
  - `the next take label has no capitals`: `text-transform: none`, 12 px.
  - `the set row the field names is grey and next and the tick are in the text colour`: the `[data-set-song][aria-current='true']` background is `--selected`. "next" and `[data-played-check]` are `--foreground`.
  - `the arrow keys row shows the shared focus ring`: `[data-highlighted]`'s border colour is `--ring`.
  - `a long set name wraps and its played count stays whole`: stress. The set's name is not cut (`scrollWidth <= clientWidth`), and "of 10 played" is whole.
  - `the old name's line floats in a popover and the field keeps focus`: `__OLD_NAMES__` as in `naming.spec.ts:612`. Fill "Palyn". `[data-slot='popover-content'] [data-old-name]` is visible, the field is focused, and "Make Palyn a new song" is underlined in the text's colour.

  Update the existing tests:
  - `sets.spec.ts:175-181`: an empty set shows the new sentence inside `[data-slot='empty']`;
  - `naming.spec.ts:615`: `line` is `page.locator("[data-old-name]")`;
  - `song-keys.spec.ts:178`: the hint has no `title`.
- [ ] **Step 2:** Build and run them. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - Spacing: each part `-mx-8 px-8`, `pt-6` under a line, `pb-6` above one.
  - Text sizes from the mockup: titles `text-sm`, the field `text-2xl leading-8`.
  - The Popover is `open` while the old name shows, with `modal={false}`, and both auto-focus events prevented.
  - A cut song name in a row (`NextTakeSongs.tsx:45`, `:126`, `:232`) and the old name (`TakeNameField.tsx:201`) show whole through `WholeTip`. The other native titles in these files go (`NextTakeSongs.tsx:63`, `:110`; `TakeNameField.tsx:205`; `SongKeys.tsx:13`).
  - Leave the panel's entrance (`animate-rise`, `rise(1)`) to Task 3.
  - Drop the mockup's MOCKUP comments.
  - Remove the three allow-list entries.
- [ ] **Step 4:** Run the whole Playwright suite. The site's story types into `#next-take-name`, so build the site and run its Playwright too (`npm run og` first for `dist/og.png`). Then Vitest, lint, design-check and build-storybook.
- [ ] **Step 5:** Commit: `ui: the Next take panel as one group, its field wrapping a long name`.

### Task 3: The frame: a header name that wraps, figures that give way, a footer that stays

**Files:**
- Modify: `ui/src/components/Shell.tsx:104-115`. With `facts`, the title's box is `min-w-0 flex-[0_1_auto]` and the title wraps (`break-words`, no `truncate`).
- Modify: `ui/src/screens/Rehearsal.tsx`:
  - `:391-404`: the title from the mockup, the pencil with the last word;
  - `:388-390`: `air`, and main `className="px-8 [--screen-pad-y:2rem]"`;
  - `:468-496`: the footer, with the chips kept unseen and the number in `tnum min-w-[2ch]`;
  - `rise()` on the songs group (0) and the panel (1).
- Modify: `ui/src/components/EveningFacts.tsx`. Give way through `fitFigures`, put the folder's path in a Tooltip, take off the capitals, and use `gap-6`.
- Modify: `ui/src/components/FooterRow.tsx:35-45` (the error over the buttons)
- Modify: `ui/src/lib/motion.ts` (`rise`), `ui/src/screens/Setup.tsx:94` (imports it)
- Modify: `ui/design-check.allow.json` (drop `EveningFacts.tsx`)
- Test: `ui/e2e/rehearsal-frame.spec.ts` (new), `e2e/goes.spec.ts:341-349`

**Interfaces:**
- Consumes: `fitFigures` (`lib/figures.ts`), `Tooltip`, `Kbd`, `useWide()`; from Task 1, `settled`, `scaled`, `TONIGHT` and `openEvening`.
- Produces:
  - `rise(i: number): CSSProperties` gives `{ "--i": i }`.
  - `EveningFacts` keeps its props. A fact that gives way has `hidden`. The group `About this rehearsal` carries the tip, and an `sr-only` line with every fact. That line is a plain `span`, so `goes.spec.ts:292-293`'s `fact()` still finds one `dd` per fact.
  - `FooterRow` keeps its props. The actions column is `relative`, and the error is `absolute right-0 bottom-full mb-1 max-w-md truncate text-xs text-destructive`.

- [ ] **Step 1: Write the failing e2e tests:**
  - `a long rehearsal name wraps with its pencil beside its last word`: stress at 1180×820 and 960×680. The h1 holds the whole name and is not cut. "Rename rehearsal"'s box is inside the h1's right edge, and its middle is on the h1's last line.
  - `the header's figures give way least needed first and show whole on hover`. With the band at 1180, all four facts show (today two). With stress at 960, the shown facts are the most needed ones (Length before Takes, before In the cloud, before On disk), and hovering the group shows a tip with all four.
  - `the header's fact labels have no capitals and are 12 px`.
  - `Finish and Record keep their boxes with a take in hand` (Review Focus 2): `openEvening`. Measure both after `settled`. Play take 1 in place, open it in the player, then press Esc: at each step both boxes are as measured. The `Esc` and `Space` chips are `visibility: hidden` while the take is in hand, and `player_toggle` is not called again when the take opens (the sound goes on). While the take is open, Space calls `player_toggle`, not `start_take`.
  - `Record keeps its width from take 9 to take 10`: `openEvening(page, "", TONIGHT.slice(0, 8))`. Measure, `recordTake(page, 9)` and Save take, and "Record take 10" is as wide and Finish has not moved.
  - `an error in the footer moves nothing`: `openApp` with an `after` script setting `window.pywebview.api.start_take = async () => ({ok: false, error: "The interface is gone"})`, as `lanes.spec.ts:16` overrides a call, then `startRehearsal`. Press Record. The error is visible as `role="alert"`, and the footer's and both buttons' boxes are unchanged. If the bridge writes the failure to the console, take it off with `expectedError`.
  - `the rehearsal screen has the start screen's air`: main's left and top padding is 32 px, the header's and the footer's sides are 32 px, the footer is 24 px top and bottom, and the panel's padding is 32 px.
  - `the Next take panel rises 40 ms after the takes`: the panel's inner box has `--i` 1 and an `animation-delay` of 40 ms. (Task 4 gives the songs group its 0.)
  - `at 150 percent in a 960 by 680 window nothing scrolls sideways` (Review Focus 1): `page.addInitScript(scaled(1.5))`, then stress. `main`'s and the panel's `scrollWidth <= clientWidth`, and neither Finish nor Record is cut. (This may hold already; it must hold after.)

  Rewrite `goes.spec.ts:341-349` as `a narrow window keeps the most needed figures and the button`: at 1000 px in History, Length shows, every fact shown comes before every fact given way in the order Length, Takes, In the cloud, On disk, and the button shows. (Today's test expects In the cloud and On disk hidden by the fixed 1280 px rule, which goes.)
- [ ] **Step 2:** Build and run them. Expected: FAIL.
- [ ] **Step 3: Implement**, from the mockup's `Shell.tsx`, `EveningFacts.tsx` and `Rehearsal.tsx`. The measuring is `fitFigures`, not the mockup's own loop. The tip is the shared Tooltip, not the mockup's native `title` (`EveningFacts.tsx` in the mockup tree). Remove `EveningFacts.tsx` from the allow-list.
- [ ] **Step 4:** Run the whole Playwright suite (`footer.spec.ts` checks every screen's footer), Vitest, lint and design-check.
- [ ] **Step 5:** Commit: `ui: the rehearsal's frame: a name that wraps, figures that give way, a footer that stays`.

### Task 4: The evening's songs as one group, and the take row

**Files:**
- Modify: `ui/src/components/RehearsalOverview.tsx`:
  - the group and its head, from the mockup with `mk.group`;
  - the figures in the head at `:160-179` go (`:162-168`), with `Stat` at `:282-289`;
  - `TakeRow` at `:300-584`.
- Modify: `ui/src/components/ui/mark.tsx` (adds `MarkTick`), `mark.stories.tsx`, `mark.test.ts`
- Modify: `ui/src/components/SongPills.tsx` (`:13`, `:121-232`, from the mockup), `ui/src/components/EveningActions.tsx:143-170`, `ui/src/components/StarButton.tsx:32`
- Modify: `ui/src/screens/Rehearsal.tsx:539-545` (`failed` in `playback`)
- Modify: `ui/design-check.allow.json` (drop `RehearsalOverview.tsx`, `SongPills.tsx`)
- Test: `ui/e2e/overview.spec.ts` (new), plus `e2e/evening.spec.ts:112`, `:119`, `:128`, `:210-217`, `:244`, `:276` and `e2e/history.spec.ts:202-232`

**Interfaces:**
- Consumes: `PlayButton`, `playLook`, `Badge variant="warn"`, `Button`, `MarkLine`, `LabelDot`, `Tooltip`, `rise` (Task 3), `openEvening` and `colour` (Task 1).
- Produces:
  - `MarkTick({ colour, at, className })`: one tick, 3 px wide, `rounded-sm`, `aria-hidden`, `data-mark-colour`, `left: at%`. It replaces the hand-drawn ticks at `RehearsalOverview.tsx:428-439`. `SongLadder.tsx:133` and `MarksPage.tsx:261` move onto it with History's PR.
  - `OverviewPlayback.failed?: boolean`. Rehearsal sets it from `player.loadError`.
  - The overview's `[data-songs-group]` is one `rounded-xl bg-card`, with `[data-overview-head]` (the legend left, the buttons right), then each song's `[data-song-group]` (`role="group"`, `aria-label` its name), under a line after the head or the song before. "Not named" is in it, last.
  - A take row's toolbar is ★, rename, cloud (`CloudUpload`), and delete set apart (`ml-2`).

- [ ] **Step 1: Write the failing tests.**

  Vitest (`mark.test.ts`): `MarkTick` is placed at its `at` percent, carries its colour's dot class and `data-mark-colour`, and is hidden from a screen reader.

  E2e (`overview.spec.ts`, with `openEvening` and `TONIGHT` from `app.ts`):
  - `the songs are one group with a line between songs`: one `[data-songs-group]` with the `--card` fill, a 12 px radius and no border. Every `[data-song-group]` after the head has a 1 px top border.
  - `the takes nobody named are last in the group with a muted heading`: no dashed border, and the heading is `--muted-foreground`.
  - `the overview says no figures of its own`: no "played" text.
  - `the row's play button is the shared one and shows a spinner after one second`: `hold(page, "player_open")`, then press row 1's ▶. `data-look` is `loading`. There is no spinner at 0.5 s or 0.9 s, there is one by 2 s, and the box is unchanged. `letGo`, and "Pause Pałyn" shows. (Today's ▶ spins at once and has no `data-look`.)
  - `a playing bar keeps its width and its length keeps its place` (jump 3): play row 1 in place, wait until the position passes 0:01, and the bar's and the length's boxes are unchanged.
  - `a mark tick passes under a short take's name` (Review Focus 4): row 3 (Viasna, 0:12, a mark at 4 s).
    - The tick's x lies inside the title's box. This is the test's own check that it means something.
    - The title's backing has the bar's computed `background-color` and `background-image`, and the colour is opaque.
    - The same holds for a starred short take (row 2), in the light theme too.
    - While row 3 plays in place, the played wash comes after the title in the bar.
  - `the take row's toolbar is star, rename, cloud, delete`: the buttons' labels in order, with delete at least 8 px further from cloud than cloud is from rename.
  - `false start is a badge`: `[data-slot='badge']` in row 4.
  - `a greyed Send starred says why in a tip and in its description`: `toHaveAccessibleDescription("No take has ★")`, and the tip on hover.
  - `a chosen song pill is grey, not the accent`: in Rename take on take 1, the pill of its song has the `--selected` background.
  - `the row opens by keyboard through its bar`: Tab to row 1's bar, press Enter, and the player opens. (A guard: it passes before and after.)
  - `the songs group rises first`: `[data-songs-group]` has `--i` 0.
  - `a short take bar is opaque in every state`: rest, starred, false start.

  Update:
  - `evening.spec.ts:112`, `:119`, `:128`, `:244`, `:276`: `title` becomes `toHaveAccessibleDescription`;
  - `evening.spec.ts:210-217` becomes `the buttons and the legend share the songs group's head in a 960 px window`: Send starred's box is inside `[data-overview-head]`, and the overview does not scroll sideways;
  - `history.spec.ts:210-213`: the four figures move to the header's `About this rehearsal` group, in its words (`fact()` as at `goes.spec.ts:291-293`).
- [ ] **Step 2:** Run Vitest and the e2e tests. Expected: FAIL.
- [ ] **Step 3: Implement**, from the mockup's `RehearsalOverview.tsx` and `SongPills.tsx`, with the tick call above:
  - the opaque bar fills;
  - the name's backing after the ticks;
  - the wash and the playhead after the name;
  - `MarkTick` in place of the hand-drawn ticks.

  The length keeps the room of "0:00 / {length}" (the mockup's invisible copy). A mark's line is `Button variant="ghost" size="row"` around `MarkLine`, which keeps `data-note` for `goes.spec`, `history.spec`, `labels.spec` and `songs.spec`. Native titles: StarButton's (`:32`) and the row's cloud button's (`RehearsalOverview.tsx:530`) become Tooltips with the same words; the cloud error (`:487`) becomes a Tooltip and the status's description; the bar's (`:402`) and the missing ▶'s (`:372`) go, since PlayButton's `missing` look says it. Remove the two allow-list entries.
- [ ] **Step 4:** Run the whole Playwright suite. History's overview, song page and ladder use `TakeRow` (`SongPage.tsx:158`, `SongLadder.tsx:159`), and `history.spec`, `songs.spec`, `goes.spec` and `labels.spec` must stay green. Then build the site and run its Playwright (the story drives `Send starred`, the name pills and `[data-take]`). Then Vitest, lint, design-check and build-storybook.
- [ ] **Step 5:** Commit: `ui: the evening's songs as one group, the take row on the shared pieces`.

### Task 5: The strip and its tabs

**Files:**
- Modify: `ui/src/components/TakeStrip.tsx`:
  - Songs on `Toggle`, no capitals (`:173-188`);
  - the toolbar order and one cloud icon (`:227-275`);
  - `Edge` on `Button`, with its name in a Tooltip (`:284-306`);
  - "No takes yet" on `Empty` (`:157-165`).
- Modify: `ui/src/components/SongTab.tsx`:
  - `LabelDot`, with no title on a dot (`:17-33`);
  - the count at `text-xs`;
  - the number in `tnum`, not in a mono box (`NUMBER` `:36-37`);
  - "Every take of" on `Button` with its Tooltip (`:59-72`);
  - the cut name through `WholeTip`, with no imperative `title` (`:161-166`);
  - the open tab's bar grey and `rounded-t-sm` (`:217`);
  - the tab on `Button` (`:234`);
  - the list's rows `rounded-md bg-selected` (`:314-317`), on `Button` (`:343`);
  - day headings without capitals (`:333-338`).
- Modify: `ui/design-check.allow.json` (drop `TakeStrip.tsx`, `SongTab.tsx`)
- Test: `ui/e2e/strip.spec.ts` (new), `e2e/goes.spec.ts:654-667`

**Interfaces:**
- Consumes: `Toggle`, `Button`, `Tooltip`, `WholeTip`/`useCut`, `LabelDot`, `Empty`.
- Produces:
  - The strip's Songs is a `Toggle` named `Songs`, with `aria-pressed` and `aria-expanded`.
  - The tab keeps `[data-tab]`, `[data-tab-name]` and `[data-tab-line]`.
  - The toolbar order is the row's (Task 4).

- [ ] **Step 1: Write the failing e2e tests:**
  - `Songs is a toggle without capitals, grey when open`.
  - `the open tab's bar is grey`: `[data-tab-line]` is `--muted-foreground`, as the mockup draws it, and not `--primary`.
  - `the strip's toolbar is star, rename, cloud, delete, as on a take row`: the same order, with delete set at least 8 px further from cloud than cloud is from rename (today's strip has the order but not the gap).
  - `the strip shows one cloud icon whatever the take's cloud state`: the same `lucide-cloud-upload` for a take in the cloud and one not.
  - `a tab's take number is in even figures, not a mono box`: `font-variant-numeric` has `tabular-nums`, the family is not monospace, and there is no border.
  - `the edge buttons are the shared ones with their name in a tip`: at 900 px the › edge has its tip "Later songs" on hover.
  - `a tab list's day headings have no capitals`: open a song's column from its page in History, as `goes.spec.ts`'s column tests do.
  - `with no takes the strip says how they get there on the shared Empty`: right after Start, `[data-slot='empty']` holds "No takes yet" and the hint. (`EmptyState` stays in `Shell.tsx` for History's three uses.)

  Rewrite `goes.spec.ts:654-667` as `a long song name is cut to 224 px and shown whole on hover and on focus`: there is no `[title]` in the strip, and the tip holds the whole name on hover and after Tab.
- [ ] **Step 2:** Build and run them. Expected: FAIL.
- [ ] **Step 3: Implement**, from the mockup's `TakeStrip.tsx` and `SongTab.tsx`. The mockup's Songs Toggle keeps a native `title` ("Every song's takes"). It goes: Songs is a word, not an icon. The toolbar's cloud button's title (`TakeStrip.tsx:250`) becomes a Tooltip with the same words, and so do the edges' (`:291`) and Every take of's (`SongTab.tsx:63`). A dot's title (`SongTab.tsx:27`) goes. Remove the two allow-list entries.
- [ ] **Step 4:** Run the whole Playwright suite (`player.spec`, `goes.spec` and `scrollbars.spec` press Songs and the edges). Then the site's Playwright (the story presses `Songs` and reads `[data-tab-line]`), Vitest, lint and design-check.
- [ ] **Step 5:** Commit: `ui: the take strip and its tabs on the shared pieces`.

### Task 6: The transport, and the line the player keeps

**Files:**
- Modify: `ui/src/components/TakePlayer.tsx`:
  - the column at `:130-152`: transport, the kept line, timeline;
  - the marks row at `:186-241`: chips on `Button`, with `LabelDot`;
  - `Transport` at `:246-383`:
    - the card is `rounded-xl bg-card px-6 py-4` with no border;
    - Play shows a spinner only after 1 s;
    - Repeat is a `Toggle variant="outline"`;
    - Mark keeps one width with both labels stacked;
    - the native titles of icon buttons become Tooltips.
- Modify: `ui/src/components/ui/alert.tsx` (a `size` variant: `box`, the default, and `line`), `alert.stories.tsx`, `alert.test.ts`
- Modify: `ui/src/components/RegionTag.tsx`:
  - its three buttons on `Button`;
  - `hover:bg-black/10` and `bg-black/15 hover:bg-black/20` become `warn-foreground` tints (`/10`, `/15`, `/20`);
  - `text-xs` at `:85` and `:130`;
  - tips for Loop and Clear.
- Modify: `ui/src/components/TakeMap.tsx` (the view frame `bg-foreground/15` at `:154`; `text-xs` at `:167`), `ui/src/components/MarkerDialog.tsx:73-85` (the kind picker on `ToggleGroup variant="switch"`, with `LabelDot`), `ui/src/components/ShareDialog.tsx` (options `:181-225` on `Item asChild` with a ghost `Button`; spinners `:170` and `:212` from 1 s), `ui/src/components/PlayerKeys.tsx:53` (the tip)
- Modify: `ui/src/screens/Rehearsal.tsx:529`, `ui/src/screens/Review.tsx:343`, `ui/src/screens/HistoryScreen.tsx:1002`: pass `status={cropping && <RunningLine entry={cropping} label="Cropping" />}`, so `status` is set only while there is something to say
- Modify: `ui/design-check.allow.json` (drop `TakePlayer.tsx`, `RegionTag.tsx`, `TakeMap.tsx`, `ShareDialog.tsx`)
- Test: `ui/e2e/transport.spec.ts` (new), plus `e2e/labels.spec.ts:55`, `:61`, `:180-181`, `:285` and `e2e/player.spec.ts:263` (the kind picker's items are radios now)

**Interfaces:**
- Consumes: `Toggle`, `ToggleGroup`/`ToggleGroupItem`, `Spinner`, `useAfter`, `SPINNER_AFTER_MS`, `Tooltip`, `WholeTip`, `LabelDot`, `Item`, `RunningLine`.
- Produces:
  - `Alert` with `size="line"`: no box, one line of `text-xs` cut with "…", the icon in the variant's colour, `h-6`.
  - `TakePlayer`'s kept line, `[data-player-line]`, always present between the transport and the timeline, with no gap round it.

- [ ] **Step 1: Write the failing tests.** Vitest (`alert.test.ts`): `Alert size="line"` renders `data-size="line"` and keeps `role="alert"`. E2e:
  - `near a mark the transport keeps its height at 960 px` (jump 1): at 960×820, play a take with a mark until "Open mark" shows. The transport's and the timeline's boxes are as they were at rest.
  - `the warning and the crop line take the player's kept line and the timeline stays` (jump 4): open a take and measure the timeline's top after `settled`.
    - Set `__OUTPUT_QUIET__` while it plays: the warning shows inside `[data-player-line]`, and the top is unchanged.
    - Then `hold(page, "crop_take")`, draw a region and press Crop: "Cropping…" shows in the line instead, and the top is unchanged. `letGo`.
  - `a load error is said in the player's line`: a `__TONIGHT__` take whose file is under `/gone/`. "Track file not found" shows in the line, and Play is disabled.
  - `one thing at a time in the player's line` (Review Focus 3): the warning and a held crop together show only "Cropping…".
  - `Repeat is a toggle, grey when on`: `aria-pressed`, a `--selected` background, and the label `Repeat`.
  - `Play shows a spinner only after one second`: `hold(page, "player_open")` and open a take. There is no spinner at 0.9 s, and there is one by 2 s in Play's box.
  - `the marker's kind picker is a switch`: its items are radios, and the arrow keys move between them.
  - `the map's view frame is grey`: `[data-view-frame]`'s background equals a probe of `bg-foreground/15`'s value (the foreground mixed at 15 % with transparent), not today's accent.
  - `the share dialog shows a spinner only after one second`: hold `share_take`.
  - `a mark chip's time and words are buttons with the shared focus ring`: Tab reaches the time, then the words, and each shows a `box-shadow` ring when focused (today's hand-made buttons show none).

  Update `labels.spec.ts` and `player.spec.ts` as listed: `button[aria-pressed]` becomes `[role='radio'][aria-checked]`, and `getByRole("button", { name: "Went wrong" })` becomes `getByRole("radio", …)`.
- [ ] **Step 2:** Build and run them. Expected: FAIL.
- [ ] **Step 3: Implement**, from the mockup's `TakePlayer.tsx`, `RegionTag.tsx` and `TakeMap.tsx`:
  - The line holds the load error, else `status`, else the output warning: the error and the warning as `Alert size="line"`, `status` as it is. A cut line gets `WholeTip`.
  - Native titles: `To start` (`:292`), `Keys (?)` (`PlayerKeys.tsx:53`), and RegionTag's Loop and Clear (`:97`, `:106`) become Tooltips with the same words. A chip's cut words (`:213`) show whole through `WholeTip`. Jump to this marker (`:205`), Repeat's (`:352`), Mark's (`:368`) and Crop's (`RegionTag.tsx:121`) go: each is a word, and Crop's reason is said beside it already.
  - Play keeps its ▶ until `useAfter(player.loading, SPINNER_AFTER_MS)`, then `Spinner`. A share option keeps its icon until its second has passed.
  - The marker's kind cannot be cleared: pressing the chosen item again keeps it (`onValueChange` ignores an empty value).
  - Remove the four allow-list entries.
- [ ] **Step 4:** Run the whole Playwright suite. Review and History use the player (`player.spec`, `problems.spec` with `__OUTPUT_QUIET__`, `review.spec`, `history.spec`). Then the site's Playwright (the story presses `Repeat`; `notfound.spec.ts:49`), Vitest, lint, design-check and build-storybook.
- [ ] **Step 5:** Commit: `ui: the transport on the shared pieces, and one line the player keeps for what it says`.

### Task 7: M and S at the fader (Q3)

**Files:**
- Modify: `ui/src/components/LaneControls.tsx`:
  - `LaneControls` at `:131-212`: a name row with the icon and the name at the plate's full width, then a row with the fader, then M and S;
  - `MasterControls` at `:233-265`: the same rows;
  - the fader thumbs `bg-foreground` (`:96`, `:99`);
  - M and S on `Toggle variant="outline" size="lane"`, grey when on.

  Take these from `mockup-tree/ui/src/components/LaneControls.tsx`, `useMkPlate() === "fader"` branches only.
- Modify: `ui/src/components/midi/NotesPlate.tsx` (the name and port through `Whole reach`, `text-xs`, and `MIN_PX` and `MIN_HEIGHT` at `:5-15` as in Calls), `ui/src/components/midi/NotesLane.tsx` (labels `text-xs` at `:172` and `:186`, `LABEL_MIN` `0.875rem` at `:9` and `:142`, a `Spinner` while `data === null`)
- Modify: `ui/src/components/ui/whole.tsx` (`Whole`'s `reach`), `whole.stories.tsx`; `ui/src/components/ui/toggle.tsx` (size `lane`: `size-5 rounded-sm text-xs`, as Button's at `button.tsx:58`), `toggle.stories.tsx`
- Modify: `ui/design-check.allow.json` (drop `midi/NotesLane.tsx`, `midi/NotesPlate.tsx`)
- Test: `ui/e2e/lanes.spec.ts:96-163`, `ui/e2e/midi-player.spec.ts:299-336` (still green), new tests in `lanes.spec.ts`

**Interfaces:**
- Consumes: `openBandApp(page, { stress: "rehearsal" })`, `WholeTip`/`useCut`, `Toggle`, `Spinner`.
- Produces:
  - `Whole({ text, className, reach })`. With `reach`, the text is a Tab stop while it is cut (`tabIndex={0}`), with the shared focus ring, and its tip opens on keyboard focus. Not cut, it takes no Tab stop.
  - Plates keep `[data-plate]` and `[data-notes-plate]`. A name carries `data-plate-name`.

- [ ] **Step 1: Write the failing e2e tests:**
  - `M and S sit after the fader on its row and the name has the plate's width`: stress, open take 2.
    - On "Lead and backing vocals (Hanna)"'s plate, M's left edge is right of the fader's right edge, M's middle is level with the fader's, and the name's box is at least 140 px wide.
    - The lane is still 56 px.
  - `a cut plate name shows whole on hover and when Tab reaches it`: Hanna's name has `data-cut`. Tab reaches it, and the tip says the whole name. "Drums" is not cut and takes no Tab stop.
  - `M and S are grey when on, not amber or the accent`: both are `--selected` when pressed, and their `aria-pressed` is true.
  - `the fader thumbs are in the text colour`.
  - `the master's figure sits after its fader`: Master's percentage is right of its fader and level with it, under the name (today it is on the name's row).
  - `a notes lane shows a spinner after one second while it reads` (Review Focus 3): `hold(page, "take_notes")`. There is no spinner at 0.9 s and one by 2 s. `letGo`, and the notes draw with nothing moving (as `midi-player.spec.ts:299`).
  - `a notes lane's row names are 12 px`.

  Rewrite:
  - `lanes.spec.ts:114-145`: at each scale, M and S sit beside the fader, not above it. Keep the 3.5rem rows and the plates holding all they have;
  - `lanes.spec.ts:147-163`: the notes plate's least height is 91 and `91 * scale`.

  `M and S are 20 by 20 and 6 px apart` (`:96`) stays as it is.
- [ ] **Step 2:** Build and run them. Expected: FAIL.
- [ ] **Step 3: Implement.** Add `reach` to `Whole` and `lane` to Toggle, each with a story case. Port the plates. Remove the two allow-list entries.
- [ ] **Step 4:** Run the whole Playwright suite (`lanes`, `midi-player`, `player`, `review`), Vitest, lint, design-check and build-storybook.
- [ ] **Step 5:** Commit: `ui: M and S at the fader, the plate's name whole on hover and focus`.

### Task 8: The lanes as one group

The reference is the q4-lanes mockup in its second round, `/mnt/project-files/design-system/screen-rehearsal/q4-lanes/`. Take its changes over q3 (`src/q4-over-q3.diff`) to `Timeline.tsx`, `TakeMap.tsx`, `LaneControls.tsx`, `midi/NotesPlate.tsx` and `ui/lane-plate.tsx`, with this plan's two calls on top (Calls, "The lanes group"). Its `lib/mk.ts` change and its `twoLines` branches are mockup only. Its MOCKUP comments become plain ones. If its README has changed since this plan (a third round), follow the README and say so in the report.

**Files:**
- Modify: `ui/src/components/Timeline.tsx`:
  - `END_PX = 12` beside `ROW_GAP_PX` and `COLUMN_GAP_PX` (`:31-33`), and one column template, `${GUTTER_PX}px minmax(0, 1fr) ${END_PX - COLUMN_GAP_PX}px`, for the grid round the ruler (`:304`) and every row of the group;
  - the grid's rows (`:311-314`) become the ruler and one row for the group;
  - the lanes at `:479-559` become one `<div data-lanes className="flex flex-col rounded-lg bg-card">` spanning the grid's columns. Each lane is a `grid` row with `data-lane-row={name}` on the same template. An audio row is `height: 3.5rem` with `gridTemplateRows: "minmax(0, 1fr)"`; without that guard the waveform's canvas grows its row (q4-lanes, "Found on the way");
  - a row after the first draws `box-content border-t`, except a Both track's notes row, which carries `data-paired` and draws none;
  - the Waveform and the NotesLane get `rounded-none bg-transparent` in place of `laneHalf(…)` (`:508`, `:552`). The `laneHalf` import (`:11`) and the notes rows' `marginTop` (`:488`) go;
  - `endPx={END_PX}` on the TakeMap (`:289`);
  - Master at `:573-585`: the sticky strip carries `data-master-band` and loses its `width: GUTTER_PX`, so it spans the lanes in `bg-background`; a `GUTTER_PX`-wide div inside holds `MasterControls`;
  - the tick labels at `:351` become `text-xs`.
- Modify: `ui/src/components/TakeMap.tsx`: `endPx?: number` (default 0) beside `gutterPx` and `gapPx` (`:30-31`, `:48-49`), as `paddingRight` on the grid at `:96`.
- Modify: `ui/src/components/ui/lane-plate.tsx`: `grouped` in place of `half`. The box is `rounded-lg bg-card` unless `grouped`. `lane-plate.stories.tsx`: `Top` (`:71`), `Bottom` (`:76`) and `Halves` (`:88`) and their light twins give way to `Grouped` and `GroupedLight`: three rows on one fill, the second a Both track's notes with no line above it. `Both` (`:134-181`) drops `laneHalf`.
- Delete: `ui/src/lib/laneHalf.ts`, `ui/src/lib/laneHalf.test.ts`. The comments naming it at `ui/scripts/design-rules.mjs:274` and `design-rules.test.mjs:501` name `lib/labels.ts` alone.
- Modify: `ui/src/components/LaneControls.tsx` (a track's plate is `grouped`, with `data-paired`; Master's plate carries `data-master-plate`), `ui/src/components/midi/NotesPlate.tsx` (`grouped` in place of `half` at `:54`; `MIN_PX` 90, its comment saying a Both track's notes row has no line and a MIDI-only one has its line outside)
- Modify: `ui/src/components/midi/NotesLane.tsx`: `--nl-grid` at 40 % (`:152`); the row names' backing `bg-card/85` (`:172`, `:186`)
- Modify: `ui/design-check.allow.json` (drop `Timeline.tsx`)
- Test: `ui/e2e/lanes.spec.ts:147-267`, `ui/e2e/midi-player.spec.ts:109-146`, `:449-490`

**Interfaces:**
- Consumes: Task 1's `openBandApp(page, { stress: "rehearsal" })`; Task 7's plates; `review`, `BOTH`, `band(n)`, `plate`, `lane`, `notesPlate`, `notesLane` and `strip` in `lanes.spec.ts`.
- Produces:
  - `[data-lanes]`: one element with the `--card` fill, a 12 px radius and no border. Master is outside it.
  - `[data-lane-row]` on each row, and `data-paired` on a Both track's notes row. The plate, the waveform and the notes lane have no fill or corners of their own.
  - A row that starts a track, after the first, has a 1 px top border in `--border`, outside its 3.5rem (`box-content`), so the pitch from track to track is 57. A Both track's notes row has none.
  - `[data-master-band]`, the sticky strip, as wide as `[data-lanes]`; `[data-master-plate]`, Master's plate in it.
  - `TakeMap({ …, endPx })`; `LanePlate({ grouped })`, with no `half`.

- [ ] **Step 1: Write the failing e2e tests** (rewrite `lanes.spec.ts:165-267`):
  - `the lanes are one group with the card's fill and no frame, in the dark theme` and `…in the light theme`: as above. Every `[data-plate]`, `[data-lane] > div` and `[data-notes-lane]` background is transparent, with a 0 radius.
  - `the lanes touch, a 1 px line between each, and every audio lane is 56 px` (`band(4)`): for consecutive rows, the next row's border box starts where the row before ends, its top border is 1 px in `--border`, and each `[data-lane]` is 56 px. Resize to 960 by 680 and back to 1180 by 820, and each is still 56 px.
  - `a Both track's notes are the next row, with no line between them` (`BOTH`, replaces `:204-251`): the row holding `[data-notes-plate='Drums']` starts where Drums' audio row ends, with a 0 top border; Gtr's row has its line.
  - `a MIDI-only lane is a row of the group, under a line` (`BOTH`, replaces `:253-267`).
  - `the time axis is one line from the map down through every lane` (`band(4)`): every waveform starts and ends at the same x as the others (under 0.5 px apart), 212 px from `[data-lanes]`' left and 12 px from its right. Zoomed with ⌘ and the wheel over the lanes, the map's strip (`[data-view-frame]`'s parent) starts and ends there too.
  - `a loop drawn across two lanes runs from the ruler's foot to the group's foot`: drag from 0.3 to 0.6 of the axis across Drums and Bass. `[data-region]`'s bottom is the group's bottom (under 0.5 px apart), and its left and right are the drag's.
  - `the master is its own group in a band as wide as the lanes` (`band(4)`, not stuck): `[data-master-plate]` is outside `[data-lanes]`, 200 px, with the `--card` fill and 12 px corners, 24 px under the group. `[data-master-band]`'s left and right are the group's (under 0.5 px apart), and its background is `--background`.
  - `stuck, the master's band covers the lanes under it` (`band(8)` at 1180 by 600, as `:277`): with the band stuck, `document.elementFromPoint` at points across `[data-master-band]` every 20 px never lands inside `[data-lanes]`. The sticky tests at `:277-324` stay as they are.
  - `the octave lines are lighter than the lines between lanes`: `--nl-grid` on `[data-notes-lane]` mixes 40 % of the border colour.
  - `eight tracks with a Both and a MIDI-only track at 960 by 680 stay one group as the page scrolls` (Review Focus 5): `openBandApp(page, { stress: "rehearsal" })`, open take 2. There are 9 rows and 7 lines. Scroll `main` to the middle: the rows are still contiguous, the band is stuck to the bottom with nothing of a lane beside it, and Tab reaches Hanna's cut name, which shows whole.

  Update:
  - `lanes.spec.ts:147-163` (Task 7's rewrite): the notes plate's least height is 90 and `90 * scale`;
  - `midi-player.spec.ts:109` ("as the lower half of its card" becomes the next row of the group, with no line) and its assertions at `:449-490`, which keep the 56 px audio lanes and the notes lane as tall as its plate.
- [ ] **Step 2:** Build and run them. Expected: FAIL.
- [ ] **Step 3: Implement** as in Files. Then check by eye in both themes, at 960×680 with stress, that no waveform, loop band, mark or playhead reaches the group's round corners, and that a notes lane does not read as rows of its own. Remove `Timeline.tsx` from the allow-list.
- [ ] **Step 4:** Run the whole Playwright suite, Vitest, lint, design-check and build-storybook.
- [ ] **Step 5:** Commit: `ui: the player's lanes as one group, a line between tracks`.

### Task 9: Off the allow-list, and what the PR says

**Files:**
- Check: `ui/design-check.allow.json` (each task has emptied its own entries)
- Modify: `docs/design-system.md`:
  - "Where things stand" (`:17-35`): the rehearsal screen and the big player are redone;
  - "Shared components": `PopoverAnchor` in Popover's line (`:281`), Alert's `line` (`:332`), Toggle's `lane` (`:316`), Whole's `reach` (`:360`), `MarkTick` in Mark's line (`:379`);
  - C6 (`:233-241`): M and S are `Toggle size="lane"` after the fader, under the name. The lanes are one group on the card's fill, with a 1 px line between tracks and none between a Both track's audio and its notes. `LanePlate grouped` is a plate in that group, and `laneHalf()` is gone. Master is its own group, sticky in a band as wide as the lanes;
  - C7 (`:242-245`): a group of rows, such as the start screen's tracks or the player's lanes, splits them with 1 px lines and lets each row keep its own padding;
  - "How screens work": B4's models gain Finish and Record's unseen chips, Mark's one width and the player's kept line; B5, the notes lane; B6, `reach`; B7, its example is the new set sentence.
- Modify: `docs/using-it.md`:
  - `:158-160`: the buttons sit at the head of the songs, beside the marks' colours, with no figures above them;
  - `:167-172`: the figures give way when the name needs the room, the size on disk first, and pointing at them shows them all;
  - `:178-179`: the set is the first part of the panel, under the field, not a card;
  - `:307-309`: the fader is under the name, with M and S after it;
  - `:738-741`: a track's notes are the next lane of the group, with no line between them and its audio, not the lower half of a card.
- Modify: `CHANGELOG.md` (Unreleased: one entry, after the start screen's and the takes' at `:55-85`)
- Check: `site/`

- [ ] **Step 1:** Run `npm run design-check`. It prints `31 known cases in 20 files`. If a file of this PR is still listed, fix its finding; never add a `design-ok` waiver except for a real exception, with its reason. `Shell.tsx` (`uppercase`) and `ActivityButton.tsx` stay.
- [ ] **Step 2:** Write the CHANGELOG entry in the Unreleased voice, with no "go" or "goes". It covers:
  - the evening's songs as one group, and the Next take panel as one group beside them in every window;
  - a long rehearsal name that wraps, and figures that give way;
  - nothing moving as a take plays, a mark nears, a crop runs or an error shows;
  - M and S at the fader, and a cut track name whole on hover and focus;
  - the lanes as one group;
  - smaller things: spinners after a second, the notes lane's names at 12 px, Repeat, M and S grey when on, and an empty set saying how to fill it.
- [ ] **Step 3:** Run everything:
  - in `ui/`: design-check, lint (21), Vitest, both tsc, build, build-storybook, and the whole Playwright suite;
  - in `site/`: `npx tsc -b`, Vitest, `npm run build`, `npm run og`, then Playwright with its local config.

  All pass, except the known `scrollbars.spec.ts:12` in the container.
- [ ] **Step 4:** Commit: `ui, docs: the rehearsal screen leaves the allow-list`.
