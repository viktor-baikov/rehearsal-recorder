# History Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Step 4 of the design system's rollout, for its fifth screen: History, with its Rehearsals, Songs and Marks lists, the rehearsal, song and label pages, and a take open. A rehearsal's long name takes two lines and is cut, and the folder opens from the path line under it, as the owner chose. Every piece is on the shared components, nothing jumps, and History's nine files leave the design check's allow-list.

**Architecture:** First three tasks that share no file, in parallel: Undo for a forgotten old name, the shared pieces the pages need, and the switch with the three lists. Then, one at a time: the screen's frame with the rehearsal's head (the one owner of `HistoryScreen.tsx`), the set card, the song page, the Marks page, and last reha.stream and the docs.

The reference for the rehearsal's head is the owner's mockup patch, `/mnt/project-files/design-system/screen-history/q1/src/history-q1.patch` against 0d18b89. Take variant 1 «Папка в строке» (`mk === 1`), but leave out `lib/mk.ts`, `useMk()`, variants 2 and 3, the `summary.name.length > 40` guess (the tip goes by `useCut`) and the hand-made `<button>`.

**Tech Stack:** React 19, TypeScript, Tailwind v4, the unified `radix-ui` package, cva, lucide; Storybook 10.6.1; Vitest (node) and Playwright on `ui/e2e/fake-bridge.js` with `ui/e2e/band.js` (and `stress.js` through `openBandApp(page, { stress: true })`); Python's store and Api with their test files.

**Spec:** `docs/superpowers/specs/2026-10-08-design-system-design.md` (C1-C8, U1-U5, B1-B9, F2-F11, rollout step 4); the rules as merged in `docs/design-system.md`. The screen today, what changes without asking, the calls and the stress cases: `/mnt/project-files/design-system/screen-history/inventory.md` §1-§5. The owner's answer: `/mnt/project-files/design-system/rulings.md`, "Экран History".

## Global Constraints

- Still holding from the earlier plans: test titles in cp1252 or plain ASCII ("Palyn", " - "; no ł, ★, ·, … or →); five text sizes, two weights; radii 4/8/12/full; the motion values; shared components only in `components/ui/`, each with a story; Radix only there; tests first, seen failing.
- The other screens' rulings carry over: tips for cut names and icon buttons (`Whole`, `useCut`, `WholeTip`); groups set apart by fill; air 32 round the page, 48 between groups, 24 inside one; a selected row is `bg-selected`, a switch's chosen item the white plate.
- **The owner's answer, Q2 «Папка в строке»:** a rehearsal page's name takes up to two lines, then is cut, whole in the shared tooltip. The folder button leaves the head: the path line under the name is the button (folder icon and path, cut at its end; its tip says the system's word, "Show in Finder"). Delete stays at the right, an icon with a tip. The evening's figures still give way first. The song and label pages take the same head: title on two lines then cut, the pencil after its last word as Review's `TakeName`, lines under it, actions at the right. One component, `PaneHead`, for the three.
- **Q1, not asked:** decided from the owner's answers for the other screens (one group for one job): one group per page, its parts split by full-width 1 px lines. Songs: Starred, From last time, Every take. Marks: a part per rehearsal or song, "Group by" in the group's head row. The set card is the first part of the evening's group.
- **The calls on the mockup, accepted:** the list is a grey side panel (`bg-panel`, its edge), 16rem wide (20rem from `xl`), 16 px inside; the switch stays above it while the list scrolls; page titles 20 px (`text-xl`); the ladder keeps its bars, none under 6 px, wrapping past what fits; the set card in two columns when wide, one when narrow; the totals stay in the header as `Figures`, dropping whole where `hidden lg:block` hid them; a take open keeps its header and strip, with 48 px between the strip and the player.
- **Copy, exact:** the folder button is named `{Show in Finder | Show in Explorer | Open folder} {path}`, its tip the first part; pencils `Rename rehearsal {name}` and `Rename song {title}`, tips `Rename rehearsal`, `Rename song`; `Delete rehearsal {name}`, tip `Delete rehearsal`; the set card `{set} · {n} of {m} played` and `not played`; a folder that is gone `Not found on disk`, red, in every place; the totals `{N rehearsals} · {duration} played · {size}`; Remove's text `Only the entry goes: there is nothing on disk to delete. If the folder turns up again, it will not come back by itself.`; an old name's ✕ tip `Forget {name}: typed again, it is a new song`, its notice `“{name}” was forgotten.` with **Undo**, a refused Undo `Could not bring back {name}: {error}`; loading `Reading the folder…` beside the spinner from 10 s.
- **Known trap (Review, React #185):** a line in Shell's header after the facts must keep its room when the facts give way. History passes no `factsGone`: nothing toggles that line from what `Figures` drops.
- **Motion in tests:** since PR #54 (on main after 0d18b89) browser tests run with reduced motion. A test that checks an animation opts back in with `test.use({ reducedMotion: "no-preference" })` or `await page.emulateMedia({ reducedMotion: "no-preference" })`, as main's `review.spec.ts` rise test does.
- **Running:** in `ui/`, `npx tsc -b`, `npm run lint`, `npm run design-check`, the touched Vitest files, one `npm run build`, then only the touched specs, each once: `npx playwright test -c playwright.local.config.ts <specs>` (that config is git-ignored and is in the main checkout; a worktree copies it). Python: each touched test file once (`python tests/test_store.py`). No repeats and no full suite: CI runs it.
- **Order:** Tasks 1, 2 and 3 run in parallel worktrees; they have no file in common. Tasks 4 to 8 run after them, one at a time, in order: Task 1 changes one line of `HistoryScreen.tsx`, then Task 4 owns it and no later task touches it; 4 and 5 share `history.spec.ts` and `RehearsalOverview.tsx`; 5, 6 and 7 each edit `design-check.allow.json`.
- No model names in code, docs or commits. Commits end with the session's Co-Authored-By trailer and no other trailer.

## Review Focus

1. 960x680 at 150 % with the stress band's long Tuesday name: two lines, cut, whole in the tip; the figures gone first, Delete at the right; the path cut at its end and still a button; a step ↓ to a short name moves the evening by one title line at most; nothing scrolls sideways.
2. The header's totals at 960 px and 150 %: they drop whole, the size first, and the line after them never comes and goes (no React #185).
3. ↑ and ↓ with focus on the switch or on Group by still go through the list, and the view stays.
4. A take that cannot load says so on its ▶ on all three pages, and pressing tries again.
5. A 30-take evening on the ladder: the bars wrap, none under 6 px; 221 marks are one group and nothing scrolls sideways.
6. Undo of a forgotten old name brings it back on the song's page; one that has become a song's name since says why.

## Files

- Task 1: `src/rehearsal_recorder/store/library.py`, `src/rehearsal_recorder/api.py`, `tests/test_store.py`, `tests/test_engine.py`, `ui/e2e/fake-bridge.js`, `ui/src/lib/api.ts`, `ui/src/lib/songNames.ts`, one line of `ui/src/screens/HistoryScreen.tsx`, `ui/e2e/undo.spec.ts`.
- Task 2: create `components/ui/collapsible.tsx` + story; `lib/takeScale.ts`, `components/RehearsalOverview.tsx` (its fills), `lib/format.ts` + test, `lib/marks.ts` + test, `components/MarksPage.tsx` (one import), `components/ShareDialog.tsx`, `e2e/cloud.spec.ts`.
- Task 3: `HistorySwitch.tsx`, `RehearsalList.tsx`, `SongList.tsx`, `LabelList.tsx`, the allow-list; the specs named in it.
- Task 4: `screens/HistoryScreen.tsx`; create `components/PaneHead.tsx`; `EveningFacts.tsx`, `SetPlayed.tsx` (`SetName`), `Shell.tsx` (`EmptyState` goes), `RehearsalOverview.tsx` (`rise`), `lib/songs.ts` and `MarksPage.tsx` (`failed`); `e2e/history.spec.ts`.
- Task 5: `NextTakeSongs.tsx` (`SetCard`), `RehearsalOverview.tsx`, `SetPlayed.tsx`, the allow-list; `e2e/history.spec.ts`, `e2e/band.spec.ts`.
- Task 6: `SongPage.tsx`, `SongLadder.tsx`, `OldNames.tsx`, the allow-list; `e2e/songs.spec.ts`, `rename-songs.spec.ts`, `goes.spec.ts`, `strip.spec.ts`.
- Task 7: `MarksPage.tsx`, the allow-list; `e2e/marks.spec.ts`.
- Task 8: `site/src/stage/Story.tsx` (only if a selector moved), `docs/design-system.md`, `docs/using-it.md`, `docs/screenshots/history*.png`, `CHANGELOG.md`.

## Calls this plan makes

1. **A forgotten old name gets Undo here** (B1; the foundation plan gave it to History's PR, the inventory left it out). Only from the song's page: the Next take field's "Make Palyn a new song" names the take at once and keeps no notice.
2. **The totals are Shell's `facts`**, right of the title and before the line, the activity button and the speaker; least needed first: the size, then the time played, the count last.
3. **No shared side panel yet:** the three panels share `bg-panel` and an edge, but not width or padding (28rem and 32 px, 26rem and 32, 16rem and 16).
4. **The path button's tip** says the system's word, with the whole path under it while the path is cut. A rehearsal not on disk shows its path as plain text.
5. **The set card's dash goes on both screens:** "Gig on the 25th · 4 of 6 played" on the rehearsal screen too.
6. **The ladder's bars lose their native titles and get no tip:** an open rung names each take. An open rung has no fill of its own; its chevron says it is open.
7. **What rises:** the list's contents at 0 when History opens, each page's group at 1. The pane head never rises: it holds its place from the first frame (B4).
8. **Both switches are `orientation="horizontal"`**, so ↑ and ↓ stay the list's.
9. **`PaneHead` lives in `components/`**, not `components/ui/`: one screen uses it (U3).
10. **A list row's name takes two lines, then is cut**, its figures beside it dropping whole, as Earlier's rows on the start screen.

---

### Task 1: A forgotten old name comes back with Undo (parallel)

**Interfaces:**
- `Library.forget_song_name(name) -> {"song_id", "name"} | None` (the name as spelled; None where it returned False). `Library.remember_song_name(song_id, name) -> None`: `SongRefused("Its song is gone")`; `_taken(db, name, song_id)`'s refusals; nothing added when the name is that song's own title now.
- `Api.forget_song_name` answers `{"ok": True, "song_id", "name"}`; new `Api.remember_song_name(song_id, name)` answers `{"ok": True}` or `{"ok": False, "error"}`. The fake does the same, keeping a forgotten entry by its name; `lib/api.ts` types both.
- `forgetSongName(name, onUndone?)`: with `onUndone`, a `done` notice (key `song-names`) with **Undo**, which calls `remember_song_name`, bumps the names version and calls `onUndone()`; refused, an error notice. Without it, as now. History's `forgetName` passes `() => loadSongs()`.

- [ ] Write the failing tests: `tests/test_store.py` [13], `forget_song_name` returns the id and spelling, `remember_song_name` puts it back (`song_names()` has it again), and refuses a name now a song's title or another's old name, with `_taken`'s words, and a deleted song with "Its song is gone"; `tests/test_engine.py` [61], the Api's two answers, and `set_next_take_name("Palyn")` is Pałyn's again after it. In `undo.spec.ts`, with `window.__OLD_NAMES__ = [['Palyn', 'Pałyn']]`, reaching Songs by `getByRole("group", { name: "History view" }).getByText("Songs", { exact: true })` so the test holds before and after Task 3:
  - `forgetting an old name on a song's page says so, and Undo brings it back` (the notice's words, `remember_song_name` called once with "Palyn", the chip back);
  - `Undo of a forgotten name that has become another song's says why` (an `after` script answers `{ok: false, error: "Palyn is Viasna now"}`).
- [ ] Run them; see them fail. Implement. Run the two Python files and `undo.spec.ts` once; `npx tsc -b`.
- [ ] Commit `history: a forgotten old name comes back with Undo`.

### Task 2: Collapsible, the take fills, one count, the share options' hints (parallel)

- `collapsible.tsx`: shadcn's new-york-v4 (`npx shadcn add collapsible`, or the source at the commit `docs/design-system.md` names), `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` with their `data-slot`s; stories closed, open, and with a `Button` trigger.
- `TAKE_FILLS` in `lib/takeScale.ts`, the overview's three fills without their hover: `rest` `border-transparent bg-muted`, `starred` `border-signal/50 bg-card bg-linear-to-r from-signal/10 to-signal/10`, `quiet` `border-dashed border-muted-foreground/45 bg-card`. The overview's `FILLS` are these plus their hover classes, drawing what they drew.
- `marksLabel(n)` moves into `lib/format.ts` as `countOf(n, "mark")`; `lib/marks.ts` and `MarksPage.tsx` import it.
- `ShareOption`'s Button keeps its title as its name; `aria-describedby` points at a `useId()` span holding "already there" (when it is) and the hint.

- [ ] Failing tests: `format.test.ts` `marksLabel` gives "1 mark" and "221 marks"; `cloud.spec.ts` `a share option is named by its title and described by its hint` (`toHaveAccessibleDescription` with the mix's hint).
- [ ] Implement. Run `format.test.ts`, `marks.test.ts`, the design check, `cloud.spec.ts` and `overview.spec.ts` (the fills unchanged) once.
- [ ] Commit `design system: Collapsible, one set of take fills, the share options' hints`.

### Task 3: The switch and the three lists (parallel)

**Interfaces:**
- `HistorySwitch`: `ToggleGroup type="single" variant="switch" orientation="horizontal" aria-label="History view" className="w-full"`, three `ToggleGroupItem`s; `onValueChange` ignores "" and the view already on.
- A row is `WholeTip` (the name, and its figures once dropped) round `Item asChild size="sm"` round `Button variant="ghost"`: `h-auto w-full flex-col items-stretch gap-1.5 px-3 py-2.5 text-left whitespace-normal`, no border; the current one `aria-current="true"` and `bg-selected hover:bg-selected dark:bg-selected dark:hover:bg-selected`. Its first line is the name, `line-clamp-2 min-w-0 flex-[0_1_auto] break-words`, beside `Figures tip={false} onDropped className="tnum text-right text-xs text-muted-foreground"`, as `LastTime.tsx:415-436`.
  - Rehearsal: name `text-sm font-semibold`, figures `[minutes]` (none under 30 s); then when, cut, and `takesLabel` or `Not found on disk` in `text-destructive`; `SetName`; the strip. Month headings `px-3 pb-1 text-xs font-semibold text-muted-foreground`.
  - Song: name `text-base font-semibold`, figures `[{ text: "{n} starred", node: ★ {n} in text-signal }]`; `songLine`. Not named `text-sm text-muted-foreground`, `mt-2`, no dashed edge.
  - Label: `LabelDot` (`opacity-45` with no marks), name `text-base`, `font-semibold`, or `font-normal text-muted-foreground` with no marks; figures `[count]`; its line `pl-4`.
  - The data attributes stay, for the tests and reha.stream: `data-rehearsal`, `data-song`, `data-song-ref`, `data-label`, `data-empty`, `data-name`, `data-count`.

- [ ] Failing tests in `history.spec.ts`: `the switch is three radios, and arrow keys on it leave the list alone` (ArrowRight moves focus only; ArrowDown chooses the next rehearsal and the view stays); `a chosen row is grey with no frame` (its fill is `--selected`, every edge 0 or clear); `a long name takes two lines in its row, then is cut, whole in its tip, and the minutes give way` (stress, 960x680). In `songs.spec.ts`: `month headings and Not named have no capitals and no dashed edge`.
- [ ] Rewrite what reads the old switch: each `getByRole("button", { name: "Songs" | "Marks" | "Rehearsals", exact: true })` that means it (`grep -n 'name: "\(Songs\|Marks\|Rehearsals\)", exact' ui/e2e/*.spec.ts`; not `goes.spec.ts:35`, the strip's Songs) becomes `getByRole("radio", …)`, and its `aria-pressed` `aria-checked`: `dialogs`, `goes`, `labels`, `marks`, `player`, `rename-songs`, `songs`, `theme`.
- [ ] Implement; drop the allow-list's `HistorySwitch`, `LabelList`, `RehearsalList` and `SongList`. Run the design check and those nine specs with `history.spec.ts` once.
- [ ] Commit `design system: History's switch and lists on the shared pieces`.

### Task 4: The screen's frame and the rehearsal's head (Q2)

**Interfaces:**
- `PaneHead({ lead?, title, muted?, rename?: { label, tip, onClick }, lines?, actions?, ...header props })`, a `data-` attribute passed on as given: `<header data-pane-head className="flex min-w-0 items-start gap-4">`; `lead` `shrink-0`; a column `min-w-0 flex-1` with a row `flex min-w-0 items-start gap-2`: `<h2 className="min-w-0 text-xl font-semibold">` (`flex-[0_1_auto]` with `actions`, `flex-1` without; `text-muted-foreground` when `muted`) holding `GoTitle title go={null} cut lines={2} start after={pencil}`, then `actions` in `flex min-w-0 flex-1 items-start justify-end gap-2`; `lines` under it, `mt-2 flex min-w-0 flex-col gap-1`. The pencil: `Button variant="ghost" size="icon-row"` named `rename.label`, `text-muted-foreground hover:text-foreground`, in a Tooltip whose words are `aria-hidden`, as `TakeName`.
- `EveningFacts` gains `withFolder = true`; false leaves out the button and the `dl`'s `pr-6`. Its `show` becomes `export async function showFolder(folder)`.
- `SetName` loses its native title; with `whole` its name is `Whole` (the head), without it plainly cut (the list).
- `PlacedPlayback` and `hereFor` (`lib/songs.ts`) and `MarkPlayback` carry `failed?: boolean`, as `OverviewPlayback` does. `RehearsalOverview` gains `rise = 0`.

- [ ] Failing tests in `history.spec.ts`:
  - `the list is a grey side panel, its switch in view while the list scrolls` (30 more rehearsals by an `after` script; the panel's fill is `--panel`; scrolled to the end, the switch's box has not moved);
  - `the totals stay in the header at 960 px and 150 %, dropping whole, the size first` (what shows is a front of the line in keep order; the line after it is drawn; no page error);
  - `a long name takes two lines in the pane head, then is cut, whole in the tooltip` (1180x820 and 960x680, scale 1 and 1.5: `data-lines` 2 and `data-cut` at 960 and 1.5; the pencil after the last word; the facts gone before the name gives way; Delete inside the head at its right; nothing scrolls sideways);
  - `a step from the long name to a short one moves the evening one title line at most` (960x680, 1.5);
  - `the path under the name opens its folder, its tip in the system's words` (replaces `:593`: the button `Open folder /rec/quiet`, then `/rec/old`; tip `Open folder`; with `inALongFolder` at 960 the path is cut and the tip has it whole; no folder button among the facts);
  - `Delete is an icon at the head's right with its tip`;
  - `a rehearsal not on disk says Not found on disk in red, its path plain text`;
  - `a take that cannot be loaded says so on its play button in the overview` (an `after` script points take 1's tracks under `/gone/`);
  - `the list and the page's group rise in, 40 ms apart` (motion opted in);
  - `while the rehearsals are read, a spinner after a second and the words after ten` (`hold`, `page.clock`);
  - `with no rehearsal yet, History says how one gets here on the shared Empty`;
  - `a take open keeps its header, with 48 px between the strip and the player`.
- [ ] Rewrite the head tests at `history.spec.ts:262-608` to this head (two lines then cut, not wrapping anywhere; the date, set and path line across the head under the facts and Delete; the head still while the takes are read), and `:885`'s native title to the tip.
- [ ] Implement in `HistoryScreen.tsx`:
  - Shell `air`; reading or empty `className="px-8 [--screen-pad-y:2rem]"`, otherwise `flex overflow-hidden p-0`; `facts` the totals as `Figures` (`tnum text-right text-xs text-muted-foreground`), parts `rehearsalsLabel(n)` keep 2, `{formatDuration} played` keep 1 (from 30 s), `formatBytes` keep 0; `allOf` and the `hidden lg:block` span go.
  - The list: `<nav>` `flex w-64 shrink-0 flex-col border-r bg-panel xl:w-80`; its contents `animate-rise` at `rise(0)`: the switch `shrink-0 p-4 pb-3`, under it `min-h-0 flex-1 overflow-y-auto px-4 pb-4` with the list and the ↑ ↓ hint.
  - Each page a `<section>` `flex min-w-0 flex-1 flex-col gap-8 overflow-y-auto p-8`; the overview gets `rise={1}`.
  - The rehearsal's `PaneHead`: the name; the pencil unless missing; `actions` the facts with `withFolder={false}`, then Delete (`Button variant="ghost" size="icon"`, `Trash2`, `text-muted-foreground hover:text-destructive`, its tip); `lines` the `[data-rehearsal-head]` line as now (date, `SetName whole` at `max-w-1/2`), ending in the folder button: `Button variant="link"`, `h-auto min-w-0 gap-1.5 rounded-sm p-0 text-xs`, `FolderOpen size-3.5`, an `sr-only` `{folderButton} `, the path `min-w-0 truncate font-mono` (`useCut`), pressing `showFolder`.
  - Not on disk: the dashed box becomes a `Card` `gap-3 p-6`: `Not found on disk.` in `font-semibold text-destructive`, the line, **Locate folder…** and **Remove from history** as now.
  - `<Spinner />` while reading, the words beside it from `useAfter(reading, 10_000)`; the three `EmptyState`s on `Empty`, `EmptyTitle` and `EmptyDescription`, same words; `EmptyState` leaves `Shell.tsx`.
  - `failed: Boolean(player.loadError)` in the three playback objects, as `Rehearsal.tsx:607`.
  - A take open: Shell `air className="px-8 [--screen-pad-y:2rem]"`, `gap-12` between strip and player; its header as it is.
  - Remove's text as in Global Constraints.
- [ ] Run `history.spec.ts` and the specs that press Rename rehearsal or Delete rehearsal (`grep -l "Rename rehearsal\|Delete rehearsal" ui/e2e/*.spec.ts`) and `goes.spec.ts` once; `npx tsc -b`; the design check.
- [ ] Commit `design system: History's frame and the rehearsal's head, the folder in its path line`.

### Task 5: The set card, the evening's first part

**Interfaces:** `SetCard` gains `onGoTo?: (title: string) => void`. Given it, it is History's card: a played row goes to its song, a row not played is disabled and says `not played`; no *next*, nothing lit or highlighted (`current`, `onPick` and `highlighted` become optional). Its rows are two columns read down while the card is 32rem wide or more (`@container` on the section; on the list `@min-[32rem]:grid @min-[32rem]:grid-flow-col @min-[32rem]:grid-cols-2 @min-[32rem]:gap-x-6`, `ceil(n/2)` rows), one column under. Its title reads `{set} · {n} of {m} played` on both screens. With `set`, `RehearsalOverview` draws it as `[data-set-part]` under the group's head (`border-t px-6 py-6`), the songs under it. `SetPlayedCard` is deleted; `SetPlayed.tsx` keeps `SetName`.

- [ ] Rewrite `history.spec.ts:888-928` and `band.spec.ts:25`, `:46` to `[data-set-card]`, `[data-set-song]` and the new title; add `the set card is the first part of the evening's group, in two columns when wide` (after `[data-overview-head]`, before the first song; one column at 960x680 and 1.5) and `the set card's ticks are in the text's colour`.
- [ ] Run them; see them fail. Implement; drop `SetPlayed.tsx` from the allow-list. Run `history.spec.ts`, `band.spec.ts`, `sets.spec.ts` and `next-take.spec.ts` once; the design check.
- [ ] Commit `design system: the set card is one piece, the evening's first part in History`.

### Task 6: The song page

- `SongPage`: `PaneHead data-song-head` with `lead` a `PlayButton size="head"` (`playLook` from `here`, `failed` included; named after the take it plays; `aria-keyshortcuts="Space"` while it is the take in hand), the title or `Not named` muted, the pencil but for Not named, `lines`: `pageLine` in `text-sm`, the ▶ line in `text-xs`, `OldNames`. Then, 32 px under the head (the page's root `flex flex-col gap-8`, as the rehearsal's page), one group, `animate-rise flex flex-col rounded-xl bg-card` at `rise(1)`: Starred, From last time · {day} and Every take, each `px-6 py-6`, `border-t` from the second; a part with nothing is not drawn and leaves no line. Part titles `flex items-center gap-1.5 text-sm font-semibold` (★ in `text-signal`). A note is a `Button variant="ghost"` `h-auto w-full justify-start px-2 py-1 text-sm font-normal` with `data-note`, holding `MarkLine` with `take={<TakeTitle take={go.take} />}`.
- `SongLadder`: a `Collapsible` per rung (`open`, `onOpenChange` to `onToggle`); its trigger `Item asChild size="sm"` round `Button variant="ghost"`, the grid in rem (`grid-cols-[1.125rem_9.5rem_minmax(0,1fr)_4.5rem]`), `data-rung`, `data-missing`; no fill when open. The day `text-sm font-semibold`, the rehearsal `text-xs`, cut, whole in the rung's tip, then `Not found on disk` in red. `[data-bars]` is `flex flex-wrap items-center gap-1`; a bar `relative flex h-6 shrink-0 items-center overflow-hidden rounded-sm border` with `TAKE_FILLS` (`quiet` not on disk), `drawnLength(sec, longest, 7.5, 0.375)` rem wide, `MarkTick … className="inset-y-1"` for its marks, its number `text-xs`; no native title. The column labels `text-xs text-muted-foreground`, under the part's title. The open rung's link: `Button variant="link"` `h-auto self-start p-0 text-xs`.
- `OldNames`: each a `Badge variant="outline"` `font-normal`, its name `Whole`; ✕ a `Button variant="ghost" size="icon-tiny"` `rounded-full`, named `Forget {name}`, in a Tooltip with the ✕ tip.

- [ ] Failing tests in `songs.spec.ts`: `the song page's head: play 48 px, the title on two lines then cut, the pencil after it` (the stress band's Kalychanka at 960x680, 1.5); `the song page is one group: Starred, From last time and Every take split by lines`; `a take that cannot be loaded says so on the song's play button and on its rung`; `a rung opens with Enter, and a 30-take evening's bars wrap, none under 6 px` (an `after` script gives Palyn 30 takes in Tuesday jam, 5 s to 300 s); `the ladder's labels and part titles have no capitals`; `a rehearsal not on disk on the ladder says Not found on disk in red`. In `rename-songs.spec.ts`: `the cross on an old name is the shared button with its tip`.
- [ ] Rewrite what reads the 52 px ▶, the bars' `title`, "not on disk" or the 26 px title (`grep -n "not on disk\|26px\|title=\|\[title\]" ui/e2e/songs.spec.ts ui/e2e/goes.spec.ts ui/e2e/strip.spec.ts ui/e2e/rename-songs.spec.ts`).
- [ ] Implement; drop `OldNames`, `SongLadder` and `SongPage` from the allow-list. Run those four specs and `dialogs.spec.ts` once; the design check.
- [ ] Commit `design system: the song page as one group, its ladder wrapping`.

### Task 7: The Marks page

- `PaneHead` with `lead` `LabelDot … className="size-3.5"`, the label's name and `headLine` in `text-sm`; no pencil (labels are renamed in Settings › Marks), no actions.
- One group, 32 px under the head (`gap-8`, as the other pages), `animate-rise rounded-xl bg-card` at `rise(1)`. Its head row `[data-marks-head]` `flex items-center justify-end gap-2 px-6 pt-6 pb-4`: "Group by" (`text-xs text-muted-foreground`) and `ToggleGroup variant="switch" orientation="horizontal" aria-label="Group marks"` (By rehearsal, By song, One list; disabled with no marks). Then a part per group, `border-t px-6 py-4`, the last `pb-6`, its `h3 data-group-title` `text-sm font-semibold`: the rehearsal as a `Button variant="link"` with `SongName`'s inherited classes, named `Open the rehearsal {name}`, or the song as `SongName`; then ` · {marksLabel}` in `font-normal text-muted-foreground`. One list is one part with no title. No marks: `Empty` under the head row, its line as now.
- A row: `Item size="sm"` (a div, its click kept) with the grid as now; ▶ a `PlayButton` (`missing`, `failed`; named `{take} from {m:ss}`); the comment a `Button variant="ghost"` `h-auto min-w-0 justify-start p-0 text-sm font-normal` (`data-line="comment"`, cut, whole in its tip), the Tab stop that opens the take at the mark; `data-line="take"` with `SongName` in `font-semibold text-foreground`; `[data-take-bar]` `relative block h-6 rounded-sm border` with `TAKE_FILLS`, `drawnLength(sec, longest, 7.5, 0.5)` rem wide, `MarkTick` at the mark, the playhead; the length `text-xs tnum w-10`; `Not found on disk` in `text-xs text-destructive`. Every native title goes.

- [ ] Failing tests in `marks.spec.ts`: `Group by is the shared switch in the group's head, and arrow keys on it leave the list alone`; `the marks are one group, a part per rehearsal split by lines, titles without capitals`; `a mark's play button says when its take cannot be loaded`; `Tab reaches a row's comment, and Enter opens the take at the mark`; `221 marks at 960 px and 150 % are one group and scroll nothing sideways` (an `after` script).
- [ ] Rewrite `:121-153`, `:360`, `:428-462` to radios and `aria-checked`, `Pause {take} from {m:ss}`, `Not found on disk` and no `title`.
- [ ] Implement; drop `MarksPage.tsx` from the allow-list. Run `marks.spec.ts`, `labels.spec.ts` and `theme.spec.ts` once; the design check.
- [ ] Commit `design system: the Marks page as one group, Group by in its head`.

### Task 8: reha.stream, the rules, the guide, the news

- [ ] reha.stream: History's scene finds `button[data-label] [data-name]`, `section[aria-label="Went wrong"] [data-mark] [data-line="take"] button` and `[data-rung][aria-expanded="true"]`; change `Story.tsx` only where one moved. In `site/`, run `npm test` and `npx playwright test e2e/stage.spec.ts` once.
- [ ] `docs/design-system.md`: "Where things stand" has History redone and Drafts and Settings to come; C8 names `Collapsible`, `PaneHead` (History's three pages, in `components/`), `SetCard` on both screens and `TAKE_FILLS`, and its "other shared components" gets Collapsible's line; B1 says a forgotten old name has Undo from its song's page; B3 loses "today History's three views fall back to ▶ silently"; B5, B6 and B7 say what History does now (the spinner and its words; the pane head and the path line; the empties).
- [ ] `docs/using-it.md`, History: the head (two lines, then cut and whole when pointed at; the path under the name opens the folder, **Show in Finder** on Windows **Show in Explorer**; the bin at the right); the totals giving way in a narrow window; the set card's "Gig on the 25th · 4 of 6 played"; **Not found on disk** for **not on disk**; **Group by** in the marks' group; in "Names and songs" and "Undo", **Undo** after forgetting an old name. Under CLAUDE.md "Writing": a musician's words, British spelling, button names bold.
- [ ] Pictures: `python tests/docs_screenshots.py` if Playwright for Python is installed; keep `history.png`, `history-songs.png` and `history-marks.png` and put the rest back. If it is not installed, leave them and say so in the report.
- [ ] `CHANGELOG.md`, under Unreleased, two items, each starting bold: **History's pages are calmer, and a rehearsal's folder opens from its path.** (the grey list with its switch in view, a long name on two lines, the bin at the right, the totals giving way, one group per page, the ladder's bars wrapping, a ▶ that cannot load saying so); **Forgetting a song's old name has Undo.**
- [ ] Check that none of History's nine files is left in `ui/design-check.allow.json` (`HistorySwitch`, `LabelList`, `MarksPage`, `OldNames`, `RehearsalList`, `SetPlayed`, `SongLadder`, `SongList`, `SongPage`), and run the design check.
- [ ] Commit `design system: History on reha.stream, in the rules, the guide and the news`.
