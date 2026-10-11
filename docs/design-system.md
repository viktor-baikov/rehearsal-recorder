# The design system

How РЭХА's screens look and how they work: each rule in a line or two, why
it is there, and what in the code carries it. The full reasoning, with the
mockups and rulings behind every rule, is the spec,
[superpowers/specs/2026-10-08-design-system-design.md](superpowers/specs/2026-10-08-design-system-design.md);
the numbers here are its numbers. A path inside `ui/src/` is written from
there: `lib/notices.ts` is `ui/src/lib/notices.ts`.

Three decisions sit under the rest. The app has its own look, the same on
the Mac and on Windows, and takes three habits from the system it runs on:
its font, the order of a dialog's buttons, and its words (D3). The app and
reha.stream share one foundation of colours, font and sizes, so the site
shows the app as it is; the site keeps its own big headings and layout
(D4). And the rules cover how a screen works as much as how it looks (D5).

## Where things stand

The foundation is in: the theme values, the shared components, Undo, the
showcase and the check. The screens are redone on it one at a time, a pull
request each, in this order: the start screen, the rehearsal screen,
recording, Review, History, Drafts, and Settings. Until its turn a screen is
on the check's [allow-list](#the-check) and may still break the rules it is
listed for. Where a rule below says "as each screen is redone", the screens'
pull requests carry it out and nothing does it yet. On reha.stream the
pieces of the app are the real components and follow the theme already, but
the page itself takes only the accent from it so far
(`--page-accent: var(--primary)` in `site/src/page/page.css`); its own
background, text colours and font (Instrument Sans) take the shared ones in
the same release as the screens. The new look goes out in that one release,
once every screen is done.

## The foundation

Every value lives in one file, `ui/src/index.css`, which the app, the
showcase and reha.stream all import. A screen uses the names (`bg-primary`,
`text-sm`, `rounded-md`), never a value.

### Colour

- **F1. One accent, cobalt.** `oklch(0.56 0.24 266)` with a white label, the
  same in both themes: one bright colour for what matters, on a screen that
  is otherwise nearly black and white. White on it reads at 4.8:1.
  `--primary`, `--primary-foreground` and `--ring`; reha.stream's accent is
  the same variable (`site/src/page/page.css`).
- **F2. The accent is for the one main action and for what plays.** A blue
  that also meant "on", "selected" and Stop pointed at nothing in
  particular. A selected tab, pill or row, and a switch that is on, are
  `bg-selected`, a grey. Stop is `strong`, the text's own colour
  (`Button variant="strong"`): that look is Stop's alone. The record red,
  the danger red and the statuses keep their own colours. In a set, the song
  the next take is named after is a selected row, with *next* and ✓ in the
  text's colours; notes coming in from MIDI are grey; notes played in the
  player's notes lane stay in the accent, as what plays. Whatever is blue
  today for "selected" or "on" turns neutral as each screen is redone, and
  so do the MIDI notes.
- **F3. A mark's label is one of eight colours, and blue is orange.** A blue
  mark disappeared into the played part of a waveform, which is the accent;
  now cobalt is the only blue in the app. The stored key stays `"blue"`, so
  no library needs a migration, and is drawn with `--label-orange`
  (`lib/labels.ts`); orange stands sixth in Settings' picker, where blue
  was.
- **F4. A group is set apart by its fill, with no border.** An outline round
  every panel made the screens busy; a card a shade off the page does the
  same job quietly. `--card` against `--background`, at least 0.03 apart in
  lightness in both themes (`lib/theme.test.ts` checks it), and the `Card`
  component (C7). Fields, buttons and dialogs keep their frames. The
  bordered panels lose theirs as each screen is redone.

### Type

- **F5. Five text sizes, in rem: 12, 14, 16, 20 and 24, with body text at
  14.** Fifteen sizes made no order, and a size in px ignores the Appearance
  scale in Settings. `text-xs`, `text-sm`, `text-base`, `text-xl` and
  `text-2xl`; the body is `text-sm`. A screen's old sizes go 9, 10 and 11 to
  12; 13 and 15 to 14; 18 to 16; 22 to 20; 26 and 28 to 24. Text sized from
  the window (the recording clock, the track tiles) keeps sizing from it.
  Two weights, 400 and 600, are enough to tell a heading from text at five
  sizes. The check refuses px sizes and sizes off the five; the weights are
  not checked.
- **F6. The system's font**, San Francisco on the Mac and Segoe UI on
  Windows (`--font-sans`). Nothing is downloaded, so the app looks the same
  in a room with no internet. Figures take the `tnum` class: every digit the
  same width, in the same font, so times and counts line up in a column.
  `font-mono` is for file paths and technical values.
- **F7. No capitals made by CSS, and buttons in sentence case.** A label
  reads as it is written, "Last time" rather than "LAST TIME", and a button
  is a plain phrase, "Start rehearsal", with no Title Case on the Mac
  either. A heading that relied on capitals gets its weight and size when
  its screen is redone. The check refuses `uppercase`.

### Space and shape

- **F8. More air on every screen.** Big type and room round it, with little
  on screen at once (D6). How much is settled per screen, on its mockup; on
  the rehearsal screen the room comes from lower lanes (C6). Spacing takes
  the steps 2, 4, 8, 12, 16, 24, 32, 48 and 64 px. The check leaves spacing
  alone, since alignment needs its small odd offsets, so this document and
  the showcase carry it. `--screen-pad-y` is the space above and below a
  screen: Shell pads by it, and the player's master strip holds to the edge
  past it, so the two cannot drift apart.
- **F9. Three corner radii by role, plus round.** Nine radii said nothing;
  three say what a thing is. 4 px for small things (key chips, tags, take
  bars, M and S): `rounded-sm`, or bare `rounded`. 8 px for controls
  (buttons of every size, fields, selects, menus): `rounded-md`. 12 px for
  groups and dialogs: `rounded-lg` or `rounded-xl`. `rounded-full` for round
  things (play buttons, pills). A take's bar is `rounded-sm` at every size
  and in every place (after a take, under Last time, in History's strip, on
  a song's page and in Marks): one 2 px wide is a pill, since the browser
  cuts a corner down to fit the side it is on. A
  graphic, such as a 1-2 px line or a marker's diamond, keeps its own, with
  a `design-ok` comment ([the check](#the-check)). The check refuses
  `rounded-xs`, `rounded-2xl` and up, and a radius of one's own in
  brackets; `rounded-none` passes.

### Motion

- **F10. Smooth.** Motion says where a thing came from and that the app
  heard the click; it is never decoration, and it is short, never over
  400 ms (F11). What appears rises 12 px and fades in over 250 ms, easing
  out: `animate-rise`, on `--ease-smooth` (`cubic-bezier(.2,.8,.2,1)`). A
  screen brings its groups in one after another, 40 ms apart, by setting
  `--i` on each to its place. Dialogs, menus and notices take 220 ms
  (`animate-in`, `animate-out`); a hover's colour takes 200 ms, the default
  transition. The screens take on `animate-rise` as each is redone.
- **F11. Motion gives way.** Someone who turns on the system's Reduce motion
  has said that movement on screen bothers them, and the app takes their
  word for it. While a take records, the screen is read from across the room
  by people playing: it is there to show that the take is running, how long
  it has run and what is coming in, so apart from the meters and the clock
  nothing on it should move or draw the eye. That is on purpose: do not add
  an animation to the recording screen. Under Reduce motion, and while a
  take records, `animate-rise`, `animate-in` and `animate-out` do not play:
  a dialog is simply there. Spinners and pulses (`animate-spin`,
  `animate-ping`, `animate-pulse`) stand still too: a still arc still says
  "busy". `index.css` turns them off; the recording screen puts
  `data-recording` on `<html>` while it is up; what CSS cannot reach,
  such as a smooth scroll, asks `motionOff()` in `lib/motion.ts` as it
  moves (a scroll through `scrollBehavior()`). Meters and the clock are
  readings, not motion, and keep moving; the record dot is still. Nothing
  takes longer than 400 ms (`lib/theme.test.ts` checks every duration in
  the file).

## The system's habits

- **P1. One place knows which system it is**, `lib/platform.ts`: `system()`,
  and `useSystem()` for a component that has to redraw when it changes.
  Checks scattered through the code are how a Mac word ends up on Windows.
  `setSystem()` tells it to be another system, which is how the showcase
  shows both.
- **P2. The system's words.** ⌘ or Ctrl, Finder or Explorer, the Trash or
  the Recycle Bin: a list of keys that says Ctrl on a Mac is wrong. They
  come from `words(useSystem())`; `lib/deletion.ts` says where a removed
  thing went in them, or "the _deleted folder" on a computer with no Trash.
- **P3. The system's order of dialog buttons.** On the Mac the action is
  rightmost; on Windows it comes first, where Windows has taught people to
  look for it. `DialogButtons` (C3) stands them in order.

## Shared components

Each piece below is to be one component, so that it looks and works the
same wherever it appears. Those that exist are in `ui/src/components/ui/`,
each with a story for every state (U5), except three that are shared but
live outside it: the notices (`components/Notices.tsx` and
`lib/notices.ts`), `ConfirmDialog` (`components/ConfirmDialog.tsx`) and
`TakeTitle` (`components/TakeTitle.tsx`). A screen that still builds a
piece of its own moves onto the shared one when it is redone.

- **C1. Button.** Every button is the shared `Button`: a hand-made
  `<button>` has to remember the focus ring, the hover and the disabled look
  on its own, and some forgot. Variants say what a button is for: `default`
  (the accent, the one main action), `strong` (Stop), `destructive` (what
  cannot be brought back; full red in the dark theme too, where 60% read as
  switched off), `outline`, `ghost`, and `link` (the text's colour with a
  thin underline). Sizes say where it goes: `default`,
  `row`, `footer`, `footer-aside`, `icon`, `icon-row`, `icon-tiny`, `player`
  and `lane`. Every variant has the same weight and the same 1 px border, so
  a toggle that swaps variants never changes width and never moves what is
  beside it; all but `link`, which has no frame: it is bare words, never
  swapped with a filled button, and a clear frame set them 1 px in from what
  they line up with. The check refuses `<button` outside `components/ui/`.
- **C2. The small player**, `PlayButton`: one round ▶ for a take in a list
  or on a page, where there were four hand-made ones in three sizes. 32 px
  (`size="row"`), or 48 on the song page (`"head"`); a thin border, and the
  accent while its take is loaded or playing. Its `look` comes from
  `playLook()` in `lib/playLook.ts`, and covers a take that is loading (a
  spinner after its first second), one that failed to load (it says so, and
  pressing tries again) and one not on disk (a ▶ that cannot be pressed).
  Played from a mark, it starts 5 s before the mark. The screens replace
  their own ▶ with it as each is redone. The big player is not part of it.
- **C3. Dialog**, `dialog.tsx`: one frame for every dialog, with 12 px
  corners, a 16 px title and the veil behind it; `size` is `default`,
  `narrow` (a list of keys) or `tall` (hung near the top and growing down,
  as New set does). Its buttons are `DialogButtons`, in the system's order
  (P3). The way out says "Cancel" in every dialog that has an action (one
  whose options act at once has only "Close"), and the action is a verb:
  "Finish", "Remove", "Delete". Enter presses the action, except in a
  question nothing can undo, where Enter presses Cancel and a stray key
  changes nothing; that question is `ConfirmDialog`, in
  `components/ConfirmDialog.tsx`. A red button only for what cannot be
  brought back. The title and text stay as they were while it fades out
  (`useHeld`, `lib/held.ts`). The check refuses `role="dialog"` and
  `<dialog>` outside `components/ui/`.
- **C4. A notice can carry one action**, such as Undo (B1):
  `notify({ …, action, onGone })` in `lib/notices.ts`. A notice with an
  action stays 10 s, whatever its kind, and the pointer over it pauses the
  time; `onGone` runs once, when it leaves without its action having run.
  `Notices.tsx` draws the notices above a dialog's veil, so an Undo is never
  under one. ⌘Z or Ctrl+Z runs the newest notice's action
  (`hooks/useUndoKey.ts`), except in a text field, which undoes its own
  typing, with a dialog, a menu or a list open, or while a take records.
  A call into Python that raised is not a notice: it goes in the red bar
  across the top (`components/ErrorBar.tsx`, from `lib/bridgeErrors.ts`),
  which lists every problem said until it is put away, oldest first and the
  same one once, so a second problem at start no longer hides the first.
  It lists the first 20 and counts the rest under them, each once ("and 5
  more"): in a cascade the first is the cause, and a full list stops
  changing while only the count moves. One Dismiss puts them all away; a
  long list scrolls inside the bar, which stops at 40% of the window. The
  bar is `aria-atomic="false"`, so a screen reader says only a new problem,
  not the whole list again; the count line is `aria-live="off"`, read with
  the bar rather than at each change. A problem raised in the page itself,
  such as a notice's callback that threw, goes in through `reportPageError`,
  which also sends it to crash.log (`log_problem`), once per problem, so the
  bar's "all of them are in crash.log" holds for it too.
- **C5. Kbd**, `kbd.tsx`: one key chip, in the colour of the text round it,
  so the same chip reads on a page and on a filled button. Its ⌘ or Ctrl is
  `words().mod`. On a button the chip is `aria-hidden`, and the button names
  its key with `aria-keyshortcuts`.
- **C6. Track lane.** A rehearsal lane is 56 px, 3.5 rem so it grows with
  the Appearance scale (`LANE_REM` in `components/Timeline.tsx`). At 96,
  five tracks took a laptop's whole screen. The Mono or Stereo line under a
  track's name is gone. M and S are `Button size="lane"`: 20 px, 12 px text
  and 4 px corners, 6 px apart, which keeps their 24 px touch areas apart
  (WCAG 2.5.8). `LanePlate` is the plate beside a lane, the same for audio,
  notes and the master. A track that records both is one card of two halves
  split by a 1 px line, `laneHalf()` in `lib/laneHalf.ts`. A notes lane is
  as tall as its plate needs.
- **C7. Group**, `Card`: a panel set apart by its fill (F4), with 12 px
  corners, 16 px inside, and no border or shadow. A screen gives it more air
  with `className`. It takes the place of about 21 hand-made bordered boxes
  as each screen is redone.
- **C8. Everything else that is built more than once.** About thirty kinds
  of piece are built two to sixteen times each, and each copy drifts from
  the others. Each becomes one shared piece, taken from shadcn/ui where it
  has one (U1). Some are in `components/ui/` already, and the copies made by
  hand move onto them: dividers (`Separator`), chips (`Badge`) and progress
  bars (`Progress`). The rest are added by the first screen's pull request
  that needs them: on/off and pick-one buttons (Toggle and ToggleGroup, with
  arrow keys inside a group), one list row (Item, every row reachable by
  keyboard), one ✕, one link, one size of icon button, warnings (Alert),
  loading (Spinner), empty states (Empty), tooltips (Tooltip), expanding
  (Collapsible), checkboxes (Checkbox or Switch), a field with a button
  (InputGroup), and our own set list for both screens, meter, screen header,
  side panel and pane head. A take's name is written by `TakeTitle`
  (`components/TakeTitle.tsx`) everywhere, where today one list uses it and
  the rest write the name their own way. "Selected" has two looks instead of
  seven: the white plate inside a switch, and a grey fill for a row, pill,
  tab or toggle that is on. The full table, with every place each piece is
  built today, is C8 in the spec.

The other shared components, each with its stories:

- **Input**, `input.tsx`: a text field, with the shared focus ring and a red
  frame when `aria-invalid`: the rehearsal's name on the start screen, the
  rename dialogs, a mark's note, a label's and a set's name, the folders in
  Settings.
- **Label**, `label.tsx`: the name over or beside a field, on the start
  screen, in Settings and its Sets and Under the hood, and in New set. It is
  regular weight, as the system's own form labels are.
- **Select**, `select.tsx`: a pick-one list that opens over the screen, in
  `default` and `sm` sizes, for a choice too long for a row of buttons: a
  track's input on the start screen, the audio driver and device, the output
  channels, a MIDI port, and the label a deleted label's marks get.
- **Popover**, `popover.tsx`: a small panel that opens from a button and
  closes on Esc or a click outside, for a few controls that need no screen
  of their own: a track's icon grid, the playback volume in the header, the
  background work list, a label's colours, and *All songs…* under the take's
  name.
- **DropdownMenu**, `dropdown-menu.tsx`: a menu of things to pick or do,
  with a check on the chosen one. The set picker beside **Start rehearsal**
  is its one use so far.
- **Separator**, `separator.tsx`: a 1 px line in the border colour, across
  or down. Nothing uses it yet; the dividers made by hand move onto it.
- **Badge**, `badge.tsx`: a small pill for a word or a count, in the accent,
  a neutral grey, the danger red (full in both themes, as a destructive
  Button is), the signal green or the warning yellow, its word at 600.
  Nothing uses it yet; the chips made by hand move onto it.
- **Progress**, `progress.tsx`: a thin bar in the accent for how far along a
  job is, where it was started (the take being saved under Stop, a crop, a
  draft) and in the background work list.

## Writing components

These hold after the rollout too, for every new screen and feature.

- **U1. Use what exists first.** A component that already exists is one
  less to keep in step with the theme and the keyboard; shadcn's come on
  Radix, with focus, keys and screen readers already handled, and its own
  command is the documented way to add one, chosen over a leaner way of our
  own. In this order: a shared component in `components/ui/`; then a
  component from shadcn/ui, added with that command
  ([below](#adding-a-shadcn-component)); then our own, only when shadcn has
  nothing like it, as with `PlayButton` and `LanePlate`.
- **U2. A different look is a variant, not a copy.** A copy drifts: a fix or
  a restyle reaches one and not the other, which is how the app came to have
  four dialog frames and four key chips. A smaller button is a new size in
  `Button`, as `lane` is; a component is never copied to change it. A shadcn
  component, once added, is our code, and is changed in its own file to
  follow the theme.
- **U3. Shared, or the screen's own.** A piece used on two screens or more
  is shared. A piece of one screen may live with that screen, built only
  from shared components and theme values; when a second screen needs it, it
  moves to the shared ones instead of being copied. Copying is how there
  came to be four small ▶.
- **U4. Radix and other building blocks only inside `components/ui/`.**
  Screens use the shared component, so a fix or a restyle reaches every
  place at once. The check refuses a Radix import anywhere else.
- **U5. A shared component comes with its story and its line.** The story
  is where it is seen in every state, in both themes and on both systems,
  before a screen depends on it; the line is how the next person finds it
  instead of building another (U1). The story sits beside it
  (`button.stories.tsx` beside `button.tsx`), and the line goes in this
  document. The check refuses a component with no story.

### Adding a shadcn component

```bash
cd ui
npx shadcn add toggle
```

`ui/components.json` tells the command where things go, so the file lands
in `src/components/ui/`. Then:

- **Never overwrite `button.tsx` or `input.tsx`.** Some components bring a
  button or an input with them (`dialog`, `input-group`); ours have their
  own variants and sizes, so answer no when the command asks.
- shadcn's components import `cn` from the `cn` package. Change
  `from "cn"` back to `from "@/lib/utils"`, the app's own, and if the
  command added `cn` to `package.json`, take it out again.
- Put it on the theme (U2). `npm run design-check` names every raw colour,
  radius or text size in it, and it is fixed in the file: nothing in
  `components/ui/` can go on the allow-list.
- Write its story and its line here (U5).

Where the command cannot reach ui.shadcn.com, the same source is in
shadcn's repository on GitHub, under `apps/v4/registry/new-york-v4/ui/`; the
foundation's came from commit `c2a67849be260701852b0977ba15eb5f3a0ce2a4`. A
copy needs `@/registry/new-york-v4/ui/` changed to `@/components/ui/` as well
as the `cn` import.

## How screens work

- **B1. Moving to the Trash happens at once, with Undo.** A question before
  every removal gets answered without being read. Deleting a take or a
  rehearsal, clearing false starts, discarding a take (on Review and in
  Drafts) and cropping happen when clicked, and a notice says, for example,
  "“Pałyn 5” went to the Trash." with **Undo**, also on ⌘Z or Ctrl+Z, for
  10 s. Undo brings it back whole: its name, star, marks, notes and cloud
  copy. `offerUndo()` in `lib/trash.ts` raises the notice. Python keeps what
  went in `<recordings>/_deleting/` (`src/rehearsal_recorder/holding.py`)
  and sends it on to the Trash when the notice ends, when the app quits, or
  at the next start after a crash; nothing is destroyed either way. Three
  more removals that happen at once get the same notice as their screens are
  redone: a song taken out of a set, a song's old name forgotten, and a
  track taken off the start screen.
- **B2. A question only where nothing can be undone**: finishing a rehearsal
  by Esc, removing a rehearsal from history, deleting a label that has
  marks, deleting a set, and merging two songs. Each is a `ConfirmDialog`,
  where Enter presses Cancel. The **Finish** button itself does not ask. Its
  text counts properly, "1 take is saved", through `savedLine()` in
  `lib/format.ts`.
- **B3. Load errors show everywhere.** A ▶ that fails without a word looks
  like a button that does nothing, and today History's three views fall
  back to ▶ silently; an honest failure beats a silent fallback
  (CONTRIBUTING.md). A take that fails to load says so wherever its ▶ is:
  `PlayButton`'s failed look (C2). The screens get it with the small
  player.
- **B4. Nothing jumps.** A field keeps a line under it for its error, so an
  error appearing moves nothing, and a list keeps its place while it loads:
  a layout that jumps is a bug. The Check signal button, the notes warnings
  on the start screen and the song rows already hold their room and are the
  model; the rest as each screen is redone.
- **B5. Loading.** Under 1 s nothing shows, so a quick answer does not
  flash; from 1 s a spinner takes the place of what is loading; past 10 s it
  says what it is doing. `PlayButton` already waits its second
  (`SPINNER_AFTER_MS`); the rest as each screen is redone, on shadcn's
  Spinner.
- **B6. Long names.** A name never gives way to a secondary figure: the name
  is what tells one thing from another. The figure wraps, goes first, or
  hides and shows on hover, as the MIDI tile's count does; a cut name shows
  whole on hover; where a name has room for a second line, it wraps. As
  each screen is redone.
- **B7. Empty states.** An empty list that only says it is empty leaves the
  person to guess what to do next: "This set has no songs." under Next take
  does not say how a song gets there. So an empty list says, in its own
  place, what will appear there and how it gets there. On shadcn's Empty, as
  each screen is redone.
- **B8. Wording.** A name in a title is in quotes (*Delete “Fix”?*). A
  sentence said in two places comes from one place. Each kind of figure is
  written one way, through `lib/format.ts`, and a screen shows a figure
  once.
- **B9. Single-key shortcuts can be turned off** in Settings, on by default.
  Space starts a take and ↑ and ↓ pick the next take's song, and WCAG 2.1.4
  asks for a way to turn off shortcuts that are one plain key. Nothing does
  this yet.

## Where the rules live

- **K1. This document**: each rule in a line or two, with its reason and
  what carries it. The spec says how each rule was reached, with its mockups
  and arguments; this says what holds now, short enough to read before
  writing a screen. A pull request that adds a shared component, or changes
  a rule, changes this too.
- **K2. The showcase is Storybook**, run on your own computer. It shows
  every shared component in every state, light and dark, as on the Mac and
  on Windows, side by side, where the app would have to be driven into each
  state by hand to see it. It was decided to keep it on the computer (R22):
  it is not published, neither in pull request previews nor on reha.stream.
  CI builds it, so a story that does not build fails the pull request.
- **K3. CI refuses what breaks the rules**, with `npm run design-check`, the
  Design check step of the interface job in `.github/workflows/tests.yml`. A
  rule that lives only in a document wears away one screen at a time; the
  check names the line on the pull request, before a reviewer has to.
  Spacing is not checked (F8).

### The showcase

```bash
cd ui
npm run storybook                 # then open http://localhost:6006
```

The toolbar has two switches. **Theme** is dark (the default) or light.
**System** is mac (the default) or windows, and tells `lib/platform.ts`
which system to be, so a component's words and keys, and a dialog's button
order, follow it. Stories are `ui/src/**/*.stories.tsx`, each beside its
component.

`npm run build-storybook` is what CI runs, in its Showcase step; it writes
`storybook-static/`, which git ignores. It does not check types:
`npm run build` does, the stories included.

### The check

```bash
cd ui
npm run design-check
```

It reads every `.tsx` and `.ts` under `ui/src/`, stories included and
tests left out (class strings live in `.ts` files too, such as
`lib/laneHalf.ts`), prints each problem as `path:line rule text`, and then
says what each broken rule is for. The rules are in
`ui/scripts/design-rules.mjs`, and their tests, which Vitest runs, in
`ui/scripts/design-rules.test.mjs`.

| Rule | Refuses |
|---|---|
| `px-text` | a text size in px: `text-[13px]`, or `fontSize` in a style |
| `text-size` | a text size off the five: `text-lg`, `text-3xl` and up, `text-[…rem]` |
| `raw-colour` | a colour round the theme: a Tailwind palette colour, or white or black, after a colour utility (`bg-amber-500`, `text-white`, `border-black/20`); a hex, or an `oklch(…)`, `rgb(…)` or `hsl(…)`, written out |
| `radius` | a corner off 4, 8, 12 or full: `rounded-xs`, `rounded-2xl` and up, `rounded-[…]`; `rounded-none` passes |
| `uppercase` | the `uppercase` class |
| `raw-button` | a hand-made `<button>` outside `components/ui/` |
| `radix` | Radix imported outside `components/ui/` |
| `dialog` | `role="dialog"` or `<dialog>` outside `components/ui/`; a selector that finds one, `[role="dialog"]`, passes |
| `story` | a component in `components/ui/` with no story beside it |

**The allow-list.** The screens not yet redone are in
`ui/design-check.allow.json`, by file and rule; one of its entries:

```json
{
  "src/screens/Setup.tsx": ["px-text", "raw-colour", "raw-button"]
}
```

A file on the list may break the rules it is listed for, and no others.
Each screen's pull request takes its files off. A listed pair with nothing
left to find fails the check too, so the list only ever gets shorter; it is
empty before the release. Nothing in `components/ui/` can be listed: that is
where the rules are kept, so a problem there is fixed.

**`design-ok`.** Two kinds of thing are outside what the rules mean: a
graphic 1-2 px thick, which keeps its own corner, and text sized from the
window rather than from the scale (the recording clock, the names and
readouts on the track tiles). Such a line is let off one rule by a comment
on it, or on the line above, that says why, as `//` or `{/* */}`, whichever
the line allows. Two from the code, in `components/SongLadder.tsx` and
`screens/Recording.tsx`:

```tsx
// design-ok(radius): a 2 px mark tick on a take's bar, a graphic that keeps its own corner
// design-ok(px-text): the recording clock is sized from the window's height (CLOCK_SIZE)
```

A comment with no reason lets off nothing. It is not a way round the
allow-list: a screen that is not done yet belongs on the list, where its own
pull request will find it.
