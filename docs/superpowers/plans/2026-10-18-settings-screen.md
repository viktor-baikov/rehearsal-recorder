# Settings Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Settings, the rollout's last screen: its tabs as groups on the shared pieces, a section list that stays put and turns to icons in a narrow window, a Keys tab whose two switches turn single keys off (B9), Undo for a song taken out of a set, and an empty allow-list.

**Architecture:** Task 1 (the frame and its section list, Q2) and Task 2 (the keys' setting, kept by Python and obeyed by the hooks, Q1) share no file and may run side by side; Tasks 3 to 7 follow in order. `Settings.tsx` keeps the frame; Audio, Folders and Appearance get files of their own. Sketches: Q1's variant 2 and Q2's variant 3 in `/mnt/project-files/design-system/screen-settings/q{1,2}/src/*.patch`, less `lib/mk.ts`, `listed` and `chipKind`.

**Tech Stack:** React 19, TypeScript, Tailwind v4, `components/ui/`; Vitest and Playwright on `ui/e2e/fake-bridge.js`; Python's `Api` and `tests/test_engine.py`.

**Spec:** `docs/design-system.md`; `/mnt/project-files/design-system/screen-settings/inventory.md` §1-§6; `/mnt/project-files/design-system/rulings.md`, "Экран Settings".

## Global Constraints

- As in the earlier plans: test titles in cp1252 or plain ASCII (no ł, ★, ·, …, ↑ or →); the type, radii and motion values; Radix only in `components/ui/`; a cut name whole in the shared tip; groups set apart by fill, rows by 1 px lines; air 32 round the page, 48 between groups, 24 inside one; a chosen row `bg-selected`; a button's error an error notice.
- **Q1 (Alex 19:27Z, «2»):** a tab **Keys** with two switches, "Space and Esc" and "The player's keys", each over one row per screen. Off: those keys do nothing and their chips leave the buttons; ⌘Z or Ctrl+Z, and Esc in a dialog or a field, always work. Both on by default, kept by Python.
- **Q2 (Alex 19:29Z, «Разделы значками»):** in a window narrower than 900 px × the Appearance scale, the section list is its icons, each named for its tab, with the shared tip; every tab gets the wider panel; Sets keeps two columns.
- **The mockup's calls, accepted:** each section a group; the section list still while a tab scrolls, Sets' list and set each scrolling on its own; no accent but **Download** while a new version is out; **Check the interface** `outline`; the check's result an `Alert` with no tinted edge; no Undo in New set on the start screen; the column stays 56rem.
- Every §2 change of the inventory has a test, its words included.
- **Running**, as the earlier plans: in `ui/`, `tsc`, lint, the design check, the touched Vitest files, one build, each touched spec once with `-c playwright.local.config.ts` (git-ignored; a worktree copies it); `python tests/test_engine.py` when touched; a motion test opts out of reduced motion with `page.emulateMedia`. Tests first, each seen failing; CI runs the rest.
- British spelling; "take", never "go"; what a person reads follows CLAUDE.md "Writing". No model names in files or commits; commits end with the session's attribution lines.

## Review Focus

1. Keys off with a dialog open: Esc closes the dialog and does nothing else (Task 2, test 3).
2. Keys off while typing: M, R, ? and Space are typed, Esc leaves the field, the screen stays (Task 2, test 3).
3. A chip or `aria-keyshortcuts` left on a button with the keys off, on any screen (Task 3, test 3).
4. The switch after a restart (Task 2's Python test; Task 3, test 2).
5. The icons at 960x680 and 150 % with a new version out: Under the hood named for it, its dot inside its box, its tip (Task 1, test 4).
6. Wide to narrow and back with a tab open: the tab, its scroll, the focus and what was typed stay; only the list changes (Task 1, tests 5, 6).
7. 16 sets with the 40-letter name at 960x680 and 150 %: two columns each scrolling, the 16th set's top in view, nothing sideways (Task 5, test 3).
8. A song taken out, another set picked, then Undo: the song goes back into its own set at its place (Task 5, test 5).
9. PR #57's Controls tab: `TABS` is the one list of tabs, so it lands as one entry (its own icon, after Keys) with a body of `SettingsGroup`s; Task 1's test 3 fails until it has a row, a name and a tip.

## Files

- Task 1: `ui/src/screens/Settings.tsx`; new `components/{SettingsGroup,AudioSettings,FoldersSettings,AppearanceSettings}.tsx`; `lib/wide.ts` and its test; `ui/design-check.allow.json`; `e2e/settings.spec.ts`, `startup.spec.ts`.
- Task 2: `src/rehearsal_recorder/api.py`, `tests/test_engine.py`; `e2e/fake-bridge.js`, `e2e/app.ts`; `lib/api.ts`; new `lib/keys.ts` and its test; `App.tsx`, `hooks/useSpacebar.ts`; new `e2e/keys.spec.ts`.
- Task 3: new `components/KeysSettings.tsx`; `Settings.tsx`; the chips' files; `keys.spec.ts`, `settings.spec.ts`.
- Task 4: `AudioSettings.tsx`, `FoldersSettings.tsx`, `ShareDialog.tsx`; new `lib/share.ts`; the allow-list; `settings.spec.ts`, `cloud.spec.ts`.
- Task 5: `MarksSettings.tsx`, `SetsSettings.tsx`, `SetEditor.tsx`, `hooks/useSets.ts`; new `lib/setSongs.ts` and its test; Sets' line in `TABS`; the allow-list; `labels.spec.ts`, `sets.spec.ts`.
- Task 6: `UnderTheHood.tsx`, `fake-bridge.js`, the allow-list; `settings.spec.ts`.
- Task 7: `docs/design-system.md`, `docs/using-it.md`, `CHANGELOG.md`, `ui/scripts/design-rules.test.mjs`.
- Left alone: `site/` (reha.stream shows no Settings, `Story.tsx:93`); `tests/docs_screenshots.py`, whose selectors hold. The pictures are retaken for the release.

## Calls this plan makes

1. **The switch is the shared pick-one (`ToggleGroup` `switch`, On and Off), not a new `Switch`:** the owner chose on a mockup with it, and a Switch's track would be a third look for "on" (rulings "Switch look", F2) in a new piece with two uses.
2. **Narrow is a window under 56.25rem** (900 px at 100 %, 1350 at 150 %), the inventory's number, measured as `lib/wide` does: icons at 960 px from 115 %, at 1180 at 150 %.
3. **Sets keeps two columns at every size:** with icons the narrowest panel is 762 px, the set's column about 430 (computed), so §2's breakpoint for Sets goes.
4. **A tab's head stays and its body scrolls**; Sets fills the body.
5. **Audio and Folders read the settings when they open**, as Marks and Sets do.
6. **Off leaves the browser's own keys:** Space presses the focused button, even one the mouse left focused; ↑ and ↓ in the Next take field stay the field's.
7. **Off takes the key out of `aria-keyshortcuts`, and the chip is not drawn**: a setting is not a moment, so no room is kept. The player's **?** stays for the wheel, listing only the keys that work.
8. **Python keeps `space_keys` and `player_keys`; anything but `false` is on**, so a hand-edited config never turns keys off.
9. **One Undo notice per song taken out** (`set-song:{n}`, as the start screen's tracks), from any screen: back before the song that followed it, else at its old place; a deleted set is said.
10. **A mark count is `marksLabel`**, so "0 marks" (B8). **The check's result is the default `Alert`, its icon coloured by the result**, as the other variants tint the edge.

---

### Task 1: The frame and the section list (Q2)

**Interfaces:**
- `lib/wide.ts`: `SETTINGS_WIDE_REM = 56.25`; `isWide(windowPx, rootPx, rem = WIDE_REM)`, `useWide(rem = WIDE_REM)` cached per `rem`.
- `TABS: { id; label; icon; blurb; fills? }[]`, still the one list of tabs.
- `components/SettingsGroup.tsx`: `SettingsGroup({ title?, hint?, action?, rise, ...div })`, a `Card data-settings-group` rising at `rise(rise)`; titled, a `region` named by its `h3`, the `hint` under it, `action` at its right. `PickRow<T>({ label, value, options, onChange })`: the label beside the switch `ToggleGroup` it names, `""` ignored, the items keeping today's `aria-label`s.
- `AudioSettings()`, `FoldersSettings()`: today's bodies, moved. `AppearanceSettings({ theme, scale, onChange })`: one untitled group, `PickRow`s **Theme** and **Scale**.
- The frame: `Shell air backKey`, not scrolling, round the 56rem column. `<nav aria-label="Settings sections" data-sections="rows" | "icons">` by `useWide(SETTINGS_WIDE_REM)`. A row: `Item asChild size="sm"` round a ghost `Button` (icon, label, `NewDot`). An icon: a ghost `Button size="icon"` named `{label}` (`{label}, a new version is out` when flagged), `NewDot` at its top right, in a `Tooltip side="right"` of `{label}`. Each has `data-tab={id}`; the chosen one `aria-current="page"` and `bg-selected`. The panel, `key={tab}`: `[data-tab-head]` (`h2`, blurb), then `[data-tab-body]`, scrolling unless `fills`.
- `TAB_NAMES` in `settings.spec.ts`: Audio, Folders, Marks, Sets, Appearance, Under the hood.

- [ ] **Failing tests** in `settings.spec.ts`:
  1. `the section list is the shared rows, the chosen one grey with no frame`: `TAB_NAMES` in order, Audio current on `--selected` with `EDGE` clear, the others unfilled.
  2. `the section list and the tab's head stay put while the tab scrolls` (Folders with a cloud folder).
  3. `narrower than 900 px times the scale, the sections are icons, each named, with its tip`: 960x680 and 1180x820 at `scaled(1.5)` give `icons`, `TAB_NAMES` in Tab order, no text, 54 px square, each name in its tip on hover and on focus, the chosen one current on `--selected`, the panel 762 px at 960; 960x680 at 1 and 1400x900 at 1.5 give `rows`.
  4. `the icons keep the new version's dot on Under the hood` (960x680, 1.5, `__LATEST__`): named `Under the hood, a new version is out`, the dot inside its box, the tip `Under the hood`.
  5. `a window made narrower keeps the open tab, its scroll, its focus and what was typed` (1.5, 1400x900 to 1180x820 and back; Folders, 45 typed in `#false-start`, scrolled 120 px): all kept, the header and the tab's head at the same height, no `set_false_start`.
  6. `choosing 150 % at 960x680 turns the list to icons, and the scale keeps focus`.
  7. `Appearance is one group: Theme and Scale as switches, applied at once and kept` (replaces `:117`, `:132`): one "Appearance"; Light drops `dark` and stays after a reload; no "next launch".
  8. `the screen has the air of the redone screens`: the header's padding 32 px; the nav and the tab's head 32 px under the header; the column 896 px.
  9. `the tab's head and its group rise in, 40 ms apart` (motion on).
- [ ] `wide.test.ts`: `isWide(960, 16, SETTINGS_WIDE_REM)` true, `(1349, 24, …)` false, `(1350, 24, …)` true. `startup.spec.ts:48-51` to radios.
- [ ] Run them; see them fail. Implement; the narrow row (`sm:hidden`) goes; on the allow-list `Settings.tsx` goes and `raw-colour` moves to `src/components/AudioSettings.tsx` with the amber box.
- [ ] Build; run `settings`, `startup`, `labels`, `sets`, `notices`, `dialogs`, `wide.test.ts`.
- [ ] Commit `design system: Settings' frame, its sections as rows or icons`.

### Task 2: Single keys can be turned off, kept by Python (Q1)

**Interfaces:**
- `Api.save_keys(kind, on)`: `"space"` or `"player"`, kept as `space_keys` or `player_keys`, `{"ok": True}`; another kind `{"ok": False, "error": "Unknown keys"}`. `get_settings()` adds both as `self._config.get(k) is not False`. The fake likewise; `lib/api.ts` types both and `KeyKind`.
- `lib/keys.ts`: `keysOn(kind)`, `useKeysOn(kind)`; `loadKeys(settings)`, a missing field on, called after App's `get_settings`; `switchKeys(kind, on)`, in force at once, then saved, and put back with an error notice (key `keys`) when refused.
- `useSpacebar` and `useEscape` return at the top of their bubble listener while `!keysOn("space")`, before `preventDefault`; Escape's capture listener, which leaves a field, stays. `useKey` and `usePlayerKeys` likewise with `"player"` (every `useKey` is a player key).
- `e2e/app.ts`: `withKeys({ space?, player? })`, merging both into the stored config.

- [ ] **Failing tests.** `test_engine.py`, `[78] The single keys, kept as the theme is`: both on in a fresh config; `save_keys("space", False)` ok, and after `fresh_api` again `space_keys` False, `player_keys` True; `save_keys("arrows", False)` refused, nothing changed; `"space_keys": "no"` by hand reads as on. `lib/keys.test.ts`: on before any read; `loadKeys({})` both on; `loadKeys({ space_keys: false })` Space and Esc alone off. `keys.spec.ts`:
  1. `with Space and Esc off, they do nothing on the start, rehearsal, recording and review screens` (`withKeys({ space: false })`, moving on by clicks): no `start_rehearsal`, `start_take`, `finish_rehearsal`, `stop_take`, `keep_take` or `discard_take`, no dialog; Esc on Settings leaves it up.
  2. `with the player's keys off, the arrows, Home, M, R and ? do nothing` (`withKeys({ player: false })`, `openEvening`): ArrowDown leaves the Next take field alone; a take open, no `player_seek` or `player_set_loop`, no dialog, the same take, and Space still plays; in History the same rehearsal stays chosen.
  3. `with the keys off, Esc still closes a dialog and leaves a field, and Ctrl+Z still undoes`: **Player keys** opened, Esc closes it, the take still open; `Mr ?` and Space typed in the Next take field hold `Mr ? `, no mark or dialog; Esc blurs it, no question; on Review **Discard**, then `Control+Z` brings the take's screen back.
- [ ] Run them; see them fail. Implement.
- [ ] Build; `python tests/test_engine.py`; run `keys.test.ts`, `keys`, `song-keys`, `transport`, `dialogs`, `undo`.
- [ ] Commit `keys: Space and Esc, and the player's keys, can be turned off`.

### Task 3: The Keys tab, and chips that leave with their keys

**Interfaces:**
- `TABS` gains `{ id: "keys", label: "Keys", icon: Keyboard, blurb: "Keys that work with one press, and when to turn them off" }` before `about`; `TAB_NAMES` gains `Keys`.
- `KeysSettings()`: `SettingsGroup title="Space and Esc" hint="Start, stop, save, discard and finish a take."` and `title="The player's keys" hint="Arrows, Home, M, R and ? in the player; ↑ and ↓ in the lists."`, each `action` a switch `ToggleGroup` named by its title, **On** and **Off**, `useKeysOn` to `switchKeys`. Under each a `dl` of `[data-keys-row]`s: the screen in grey, its keys as `Kbd`s with a few words. Last, in `text-xs`: `Off, a key's chip leaves its button too. Undo ({undoKey}), and Esc in a window or a field, work either way.`
- The rows, exact. Space and Esc: Start screen `Space start the rehearsal`; Rehearsal `Space record a take`, `Esc finish`; Recording `Space stop the take`; After a take `Space save the take`, `Esc discard it`; Listening `Space play or pause`, `Esc close the take`; History, Settings `Esc back to the start screen`. The player's keys: Rehearsal `↑ ↓ next song`; Listening `← → 10 seconds`, `Home start`, `↑ ↓ next take of the song`, `M mark`, `R repeat`, `? keys`; History `↑ ↓ next in the list`.
- Every `Kbd` and `aria-keyshortcuts` but Undo's shows only while its kind is on. The player's: `SongKeys`, `SongTab`, `TakePlayer`'s Home, ←, →, R and M, `HistoryScreen`'s ↑ ↓ hint (gains `data-list-keys`), `PlayerKeys`' **?** (its tip `Keys` when off; its list keeps the kinds on and the wheel's two rows). Space and Esc: the rest, in `Shell`, `Setup`, `Rehearsal`, `StopTake`, `Review`, `TakePlayer`, `RehearsalOverview`, `LastTime`, `MarksPage`, `SongPage`.

- [ ] **Failing tests** in `keys.spec.ts`; `noKeysShown(page)`: no `button kbd`, `[data-song-keys]` or `[data-list-keys]`, every `aria-keyshortcuts` `Meta+Z` or `Control+Z`.
  1. `Keys is a tab between Appearance and Under the hood, two switches over their screens`: two radiogroups, **On** checked; the rows as above.
  2. `Space and Esc switched off is kept after a reload, and Start loses its chip`: **Off** sends `save_keys` `["space", false]`; Escape leaves Settings up; Back; `keyOn(startButton)` null, no `aria-keyshortcuts`, Space starts nothing; reloaded, Space and Esc **Off**, the player's **On**.
  3. `with both off, no button shows a key or says one, on any screen`: `noKeysShown` on the start screen, Settings, rehearsal, recording, Review, a take open, History and a take open there.
  4. `with the player's keys off, the player's key list keeps only what still works`.
  5. `the Keys tab at 960x680 and 150 % wraps its rows and scrolls nothing sideways`.
- [ ] Run them; see them fail. Implement.
- [ ] Build; run `keys`, `settings`, `setup`, `rehearsal-frame`, `recording`, `review`, `player`, `history`, `song-keys`.
- [ ] Commit `design system: the Keys tab, and chips that leave with their keys`.

### Task 4: Audio and Folders as groups, one set of share words

**Interfaces:**
- Audio: `SettingsGroup title="Recording" hint="Set once for the room and the interface. The start screen shows what is in force but does not change it."` (the device, **Look again**, its notes, a `Warning` when the rates are not said, `PickRow`s **Rate** and **Depth**, the mic note) and `title="Playback output" hint="Where takes play back: the headphones on the interface, say, rather than the laptop's speakers."`. **Look again** keeps its word and width, its tip `Find an interface plugged in since the app started`; after a second a `Spinner` takes its icon's place (`useAfter`). Outputs counted by `countOf`.
- Folders: **Recordings folder** (`Where everything is recorded to.`), **False starts**, **Cloud folder** with its format row, the `Checkbox` **Send saved takes automatically** and the `PickRow` **What gets sent**. `path_warning` and `encoder_hint` in a `Warning`.
- `lib/share.ts`: `SHARE_OPTIONS: { id; label; hint }[]` for Folders and `ShareDialog`. `ShareDialog`: its error an error notice (key `share`); with no folder, `TriangleAlert` in `text-warn`, the words in the text's colour.
- **Copy, exact:** `Plug it in and switch it on, then press Look again, or pick another interface to record with.`; `Each driver can offer a different number of inputs. If your interface shows fewer than it has, try another driver: ASIO, where there is one, usually offers all of them.`; `This driver offers two outputs on it. If your interface has more, choose it under another driver: ASIO, where there is one, usually offers all of them.`; `A take this short, with no ★ and no marks, shows as a false start on the rehearsal screen and in History, where Clear false starts clears them all at once, with Undo.`; `Where the takes you pick out are copied. Point it at a Drive or Dropbox folder, not at the recordings folder, so only the takes worth keeping go up, one at a time.`; the placeholder `Not set, so nothing is copied anywhere`; `Every track as recorded, untouched, and the notes as .mid, to open in a DAW later.`; the dialog's `The files are copied into your cloud folder, and the app that syncs it does the uploading.` Other words as now.

- [ ] **Failing tests** in `settings.spec.ts`:
  1. `Audio is two groups and Folders three, each under one heading` (dark, light): regions on `--card`, no edge or line; `2 outputs`.
  2. `the pick-one rows on Audio and Folders are switches, and nothing there is cobalt` (nothing filled `--primary`).
  3. `Look again keeps its word and box, its icon turning to a spinner after a second` (`hold(page, "rescan_devices")`, `page.clock`; its tip, no `title`).
  4. `the warnings have the shared look: the icon amber, the words in the text's colour` (`__FORMATS_REFUSED__`, `__PATH_WARNING__`, `__NO_ENCODER__`).
  5. `the words say what happens, with no dashes`: the copy above; no dash in either body.
- [ ] `cloud.spec.ts`: `a copy the cloud folder refuses is said in a notice, and the dialog stays` (`share_take` answering `{ok: false, error: "The cloud folder is read-only"}`); `with no cloud folder the dialog warns with the icon, its words in the text's colour`; `the dialog and Folders give the three options the same words, with no dashes`.
- [ ] Rewrite to radios: `settings.spec.ts:58-115`, `:359-377`, `:479-499`, `:606-648`, `TRACKS_HINT`.
- [ ] Run them; see them fail. Implement; `AudioSettings.tsx` leaves the allow-list.
- [ ] Build; run `settings`, `cloud`, `setup`, `evening`, `dialogs`, `notices`.
- [ ] Commit `design system: Audio and Folders as groups, one set of share words`.

### Task 5: Marks and Sets, and Undo for a song taken out

**Interfaces:**
- Marks: one `SettingsGroup`; a row's grip, dot and name are ghost `icon-tiny` or `row` `Button`s named `Move {name}`, `Colour of {name}` (holding `LabelDot`) and `Rename {name}` (holding `Whole`); the dot's popover a `ToggleGroup type="single"` of eight 20 px swatches, four to a row, named `colourName(c)` in `LABEL_COLOURS` order; counts by `marksLabel`, the question's too.
- Sets: `fills: true`; two columns, `13rem` and the rest, each scrolling on its own. The list, `ul aria-label="Sets"`: `WholeTip`s round `Item asChild size="sm"` round a ghost `Button` (`data-set-item`; picked, `aria-current` and `bg-selected`; the name cut by `useCut` over `songsLabel`), then **New set**. The set: a `Card data-set-detail`, its name's error in `Whole`. No sets: `Empty` across both columns, `No sets yet`, `A set is the songs a rehearsal goes through, in order. Make one with New set, then pick it beside Start rehearsal.`, **New set** in it.
- `SetSongsEditor`: `onChange(titles, out?: { title; at })`, `out` from ✕ alone; grip and ✕ ghost `icon-tiny` `Button`s (✕ round, its tip `Take it out of the set`); the name in `Whole`; no songs: `Empty`, `No songs yet`, `Add them below, in the order you play them.`
- `lib/setSongs.ts`: `withSongBack(titles, title, at, next)`: unchanged when there (case aside), else before `next`, else at `min(at, titles.length)`. `hooks/useSets.ts`: `putSongBack(setId, title, at, next): Promise<string | null>` reads `list_sets`, then gives `its set was deleted`, or calls `update_set` and `setsChanged` and gives Python's error or null.
- Once Python took a song out: `notify({ key: \`set-song:${n}\`, kind: "done", text: \`“${title}” was taken out of the set.\`, action: Undo })`; a refused Undo says `Could not put “{title}” back: {error}` (key `sets`).
- `MANY_SETS` in `sets.spec.ts`: the 16 sets of `q2/src/data.js` (id 3 the 40-letter name, id 5 24 songs with Kalychanka).

- [ ] **Failing tests.** `setSongs.test.ts`: before the next song, at its place, at the end of a shorter set, unchanged when there. `labels.spec.ts`: `the labels are one group, each row on the shared pieces` (dark, light; grip and dot 24 px, the dot 8 inside; `1 mark`, `0 marks`); `the colour picker is a pick-one of eight, the label's colour chosen` (orange sixth); `a long label name at 960x680 and 150 % is cut, whole in its tip`. `sets.spec.ts`:
  1. `the sets are the shared rows, the chosen one grey with no frame`.
  2. `a set's songs on the shared pieces, a cut name whole in its tip` (id 5, 960x680, 150 %).
  3. `16 sets at 960x680 and 150 %: two columns, each scrolling on its own` (`MANY_SETS`): the 40-letter name cut, whole in its tip on hover and focus; the 16th picked, the list unmoved, the set's top in view; nothing sideways.
  4. `a song taken out goes at once, and Undo puts it back in its place`: `update_set` `[1, null, ["Pałyn", "Viasna", "Ahoń", "Sonca"]]`.
  5. `Undo after picking another set puts the song back in its own set`: New songs shown, unchanged.
  6. `two songs taken out each keep their Undo`; `Undo of a song whose set was deleted says why`.
  7. `no sets, or a set with no songs, says so on the shared Empty`; `New set's cross on the start screen raises no notice`.
- [ ] Rewrite `labels.spec.ts:82-98`, `:137-165` and `sets.spec.ts:836-857` (its narrow window test gives way to test 3).
- [ ] Run them; see them fail. Implement; `MarksSettings.tsx`, `SetEditor.tsx` and `SetsSettings.tsx` leave the allow-list.
- [ ] Build; run `setSongs.test.ts`, `labels`, `sets`, `undo`, `marks`.
- [ ] Commit `design system: Marks and Sets on the shared pieces, Undo for a song taken out`.

### Task 6: Under the hood

**Interfaces:**
- `SettingsGroup`s, rising in this order: this copy (untitled, `aria-label="About this copy"`), **Updates**, **Sound** with the check under a `Separator`, **Files**, **System** with the local server; every `hr`, border and inner box goes.
- `Run from source` and the audio systems `outline` `Badge`s, the one in use `secondary` with the tip `The interface records through this one`; input chips `text-xs`; **Check for new versions** a `Checkbox`; the download a `Progress` named `Download`; the check's result a default `Alert`, `CircleCheck` in `text-signal` or `TriangleAlert` in `text-warn` or `text-destructive`; a check that cannot start an error notice (key `hood`). Native `title`s become the shared tip, `Whole` for paths. While the page is asked for, a `Spinner`, with `Asking the machine…` from 10 s.
- **Copy, exact:** `Every rehearsal and take, with their names and marks`; `Written if the app ever dies. Send it with a bug report`; `{file}: unpack it, close this copy and open the new one.`; `Nothing chosen yet: pick an interface in Audio`; `Not written yet: the app has had nothing to put in it`; `WAV only: compressing needs the soundfile package`; an attempt `{Label}: {what}`.

- [ ] **Failing tests** in `settings.spec.ts`:
  1. `Under the hood is groups on the card's fill: this copy, Updates, Sound, Files and System` (dark, light; no `hr` or edge; the copy, no dash).
  2. `the badges and the checkbox are the shared ones: Run from source outline, the audio system in use grey with its tip`.
  3. `while the page is asked for, a spinner after a second, the words after ten` (`hold(page, "under_the_hood")`, `page.clock`).
  4. `Check the interface is outline, its result an alert on the group's fill` (works, silent, failed, as `:299` scripts them); `a check that cannot start says so in a notice`.
  5. `with a new version out, Download is the one cobalt button, its bar the shared Progress`.
  6. `a long interface name wraps, no figure breaks across two lines, and a cut path is whole in its tip` (`openBandApp(page, { stress: true })`, 960x680, 1.5; no `title`).
- [ ] Rewrite `:202-335` and `:502-603` where a box, a colour or a `title` moved; the fake's `under_the_hood` waits on `held('under_the_hood')`.
- [ ] Run them; see them fail. Implement; `UnderTheHood.tsx` leaves the allow-list.
- [ ] Build; run `settings`.
- [ ] Commit `design system: Under the hood as groups on the shared pieces`.

### Task 7: The rules, the guide, the news, an empty allow-list

- [ ] `design-rules.test.mjs`: `the allow-list is empty: every screen is redone` reads `design-check.allow.json` and expects `{}`; the design check says `0 known cases in 0 files`.
- [ ] `docs/design-system.md`: "Where things stand", every screen redone and the allow-list empty, reha.stream's colours and font next, then the release; "The check", the list empty for good; B1, Undo for a song out of a set; B4, no chip with the keys off; B5, Look again, Under the hood; B7, Sets' empties; B9 as built (Settings › Keys, two switches, on by default, kept by Python, off taking chips and `aria-keyshortcuts`, Undo and Esc in a dialog or field always working); C8, `SettingsGroup` and `PickRow`.
- [ ] `docs/using-it.md`, what to do first: Keyboard, **Settings → Keys**, **Space and Esc** and **The player's keys**, **On** or **Off**, what off does and what always works; "Play by a set", ✕ takes a song out at once and **Undo** puts it back; Appearance, at a large scale in a small window Settings' sections are icons, named when pointed at; **What gets published** becomes **What gets sent** (`:156`, `:636`).
- [ ] `CHANGELOG.md`, Unreleased, after Drafts', each item starting bold: **Single keys can be turned off, in Settings → Keys.** (the two switches, what off does, what always works); **Settings is calmer, in groups, with its sections always in view.** (switches for every choice, icons in a narrow window, Sets in two columns at any size, Look again's spinner, the hints that were wrong: false starts clear with Undo, the theme applies at once); **A song taken out of a set has Undo.**
- [ ] Check the guide's and the news' texts with the humanizer skill; run the design check.
- [ ] Commit `design system: Settings in the rules, the guide and the news`; the PR lists the calls and says the pictures are retaken for the release.
