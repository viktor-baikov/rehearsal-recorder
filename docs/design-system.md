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
showcase and the check. The start screen is redone on it, and so are the
rehearsal screen, the recording screen and the big player, which Review and
History open takes in too: their pieces are the shared ones, and their
files are off the check's [allow-list](#the-check). The one piece the start
screen still builds on its own is the song list in New set, which it
shares with Settings' Sets and which is redone with Settings. The other
screens follow, one pull request each, in this order: Review, History,
Drafts, and Settings. Until its turn a screen is on the allow-list and may
still break the rules it is listed for. Where a rule below says "as each
screen is redone", the screens' pull requests carry it out, and so far the
start screen's, the rehearsal screen's and the recording screen's have. On
reha.stream the pieces of the app are the real components and follow the
theme already, but the page itself takes only the accent from it so far
(`--page-accent: var(--primary)` in `site/src/page/page.css`). After the
last screen, reha.stream's own background, text colours and font
(Instrument Sans) take the shared ones, and the release comes when the
allow-list is empty: the new look goes out in that one release.

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
- **F4. A group has no border.** An outline round every panel made the
  screens busy. In the dark theme a card a shade lighter than the page sets
  a group apart quietly. In the light theme the page is white, as the card
  is: a grey page with grey fills on it read as grey on grey, and grey text
  on them fell under 4.5 to 1. So there air and the group's own lines set
  it apart, and grey is left for a side panel, a well, what is selected, a
  hover and a pill. On a side panel a card is white on the grey in light,
  and lighter than the panel in dark. `lib/theme.test.ts` checks that the
  card is at least 0.03 lighter than the page in dark and than a side panel
  in light, and that grey text reads at 4.5 to 1 or more on every fill in
  both themes: the page, a card, a side panel, a pill, a secondary button,
  a hover and what is selected. The `Card` component
  is C7. Fields, buttons and dialogs keep their frames. The bordered panels
  lose theirs as each screen is redone.

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
  past it, so the two cannot drift apart. In a window too short for the
  recording screen, things give way in one order. First the clock and the
  take's name over it get smaller, down to the clock's 3 rem. Then the
  tiles' least height gives way, from 12.5 rem down to 6 rem. Only then
  does the screen scroll. The clock is also never bigger than 10:00:00 has
  room for inside the screen's air (32 px round the screen, 48 between its
  two groups and 24 inside one), so after ten hours it does not run off the
  left edge. `screens/Recording.tsx` fits this as the screen comes up and
  when the window or the Appearance scale changes, never because of
  anything the take does, so nothing moves while the band plays (B4).
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
  `row`, `footer`, `footer-aside`, `icon`, `icon-row`, `icon-tiny` and
  `player`. Every variant has the same weight and the same 1 px border, so
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
  track's name is gone. The name has the plate's whole width, and a name cut
  at its end shows whole on hover and on keyboard focus (`Whole reach`).
  Under it is the fader, with M and S after it. M and S are
  `Toggle size="lane"`: 20 px, 12 px text and 4 px corners, 6 px apart,
  which keeps their 24 px touch areas apart (WCAG 2.5.8), and grey when on.
  The lanes are one group on the card's fill, with no lines between tracks:
  each lane's picture, a waveform or a lane of notes, sits on a well of its
  own (C7), with 3 px of the group's fill above and below it, and a Both
  track's audio and notes share one well split by a 1 px line. That split
  is two class strings, said once in `Timeline.tsx`.
  `LanePlate` is the plate beside a lane, the same for audio, notes and the
  master; `LanePlate grouped` is a plate in the group, with no fill or
  corners of its own. A notes lane is as tall as its plate needs. Master is
  its own group, a plate with the card's fill, sticky at the bottom in a
  band as wide as the lanes, so that no part of a lane shows beside it.
- **C7. Group**, `Card`: a panel set apart as F4 says, with 12 px
  corners, 16 px inside, and no border or shadow. A screen gives it more air
  with `className`. It takes the place of about 21 hand-made bordered boxes
  as each screen is redone. A group of rows, such as the start screen's
  tracks or the evening's songs on the rehearsal screen, splits them with
  1 px lines and lets each row keep its own padding. Where each row holds a
  picture of its own, as the player's lanes do, the pictures' wells split
  the rows instead, and there are no lines. A well is where a picture or a
  recording tile sits in its group: `bg-well`, with 8 px corners and 3 px of
  the group's fill round it. `--well` is the side panel's colour,
  `var(--panel)`, in both themes, a shade darker than the card it is on. The
  page's colour was faint on the card in dark, and in light, where the page
  is white as the card is (F4), it would not show at all.
  `lib/theme.test.ts` checks that a well is the side panel's colour.
- **C8. Everything else that is built more than once.** About thirty kinds
  of piece are built two to sixteen times each, and each copy drifts from
  the others. Each becomes one shared piece, taken from shadcn/ui where it
  has one (U1). Some are in `components/ui/` already, and the copies made by
  hand move onto them: dividers (`Separator`), chips (`Badge`), progress
  bars (`Progress`), and, added with the start screen, on/off and pick-one
  buttons (`Toggle` and `ToggleGroup`, with arrow keys inside a group), one
  list row (`Item`, every row reachable by keyboard), warnings (`Alert`),
  loading (`Spinner`), empty states (`Empty`), tooltips (`Tooltip`) and
  meters (`Meter`). The rest are added by the first screen's pull request
  that needs them: one ✕, one link, one size of icon button, expanding
  (Collapsible), checkboxes (Checkbox or Switch), a field with a button
  (InputGroup), and our own set list for both screens, screen header, side
  panel and pane head. A take's name is written by `TakeTitle`
  (`components/TakeTitle.tsx`) everywhere, where today one list uses it and
  the rest write the name their own way. A track that records is one tile,
  `TrackTile` (`components/TrackTile.tsx`), where the MIDI tile was a copy
  of it: its levels, with a narrow column for its notes on Both, or with
  `kind="notes"` a MIDI track's notes alone. Its fill is `Meter` up, and its
  name is `TileName` (B6). On the recording screen the tiles are one group
  on the card's fill, each tile on a well of its own (`surface="well"`,
  C7), and reha.stream shows them so. A take drawn as a bar is as tall as
  it ran against the longest, through `drawnLength` (`lib/takeScale.ts`),
  never under a few pixels. "Selected" has two looks instead of seven: the
  white plate inside a switch, and a grey fill for a row, pill, tab or
  toggle that is on. The full table, with every place each piece is built
  today, is C8 in the spec.

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
  name. `PopoverAnchor` hangs one from something that is not its button,
  with the focus left where it is: the line under the Next take field that
  says an old name is a song's now, as wide as the field.
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
- **Tooltip**, `tooltip.tsx`: a small tip in the text's colour. On hover it
  comes after 400 ms, so a pointer on its way across the screen is not
  asking; on keyboard focus it comes at once. Focus the mouse left opens
  none: a click, or a menu or popover shut with a click handing focus back
  to its button. It is gone with Esc or the pointer leaving. It is for a
  name a row had to cut, shown whole (B6), for what an icon button does, and
  for a word on a button that needs a line to say what it does (Stereo):
  C8's native `title` tooltips. A tip that only repeats its button's name is
  for the eyes (`aria-hidden` inside it), so a screen reader does not hear
  the name twice. Each `Tooltip` has its own provider, so it needs nothing
  round it.
- **Sheet**, `sheet.tsx`: a panel that slides in from the left or the right
  over the window's full height, 28 rem wide and never wider than the window
  less 3 rem. It is a dialog on the Dialog's veil and z-index, so the notices
  stay above it and a click on one does not close it (C4); Esc, the veil and
  its ✕, the shared `Button`, close it and the focus goes back to the button
  that opened it. For the start screen's left part in a narrow window, the
  narrow form of C8's side panel.
- **Toggle**, `toggle.tsx`: a button that stays pressed (`aria-pressed`), in
  `default` and `outline`, sized as Button's `row` (32 px) and `icon-row`,
  and `lane`, the 20 px square of M and S on a track's plate (C6), with 12 px
  text and 4 px corners. On is the grey `selected` fill, never the accent
  (F2), and it has the same weight and 1 px frame on or off, so pressing it
  moves nothing. C8's on/off buttons: Stereo, the strip's Songs, the
  player's Repeat, and M and S. Check signal says what pressing it does
  ("Check signal", "Stop checking"), and a toggle's name must not change
  with it, so it is a Button, grey while the check runs.
- **ToggleGroup**, `toggle-group.tsx`: pick one or several, with the arrow
  keys moving along the group and Tab leaving it. `default` and `outline` are
  Toggles joined into a bar; `switch` is History's switch, a grey track with
  the chosen item a plate on it with a light shadow, as wide as the screen
  makes it (`size` does nothing for it). With `type="single"`, pressing the
  chosen item again empties the group (`onValueChange("")`), so a pick-one
  that must always have one chosen ignores the "", as Audio · Both · MIDI
  does (`ModeSwitch`), and so does the kind of a marker. In a dialog a
  pick-one group is one Tab stop too (`useDialogFocusKeys`). C8's three
  identical segmented switches and its pick-one groups.
- **Alert**, `alert.tsx`: a box for a line the screen has to say, with an
  icon, a title and a text, all optional. `warning` is the theme's `warn`
  colour on the icon and the edge with a faint wash behind; `destructive` is
  a failure; `default` is neutral. C8's warnings and errors. Its `size` is
  `box`, the default, or `line`: the icon in the variant's colour, and one
  line of 12 px words, red for `destructive` and in the text's colour
  otherwise. It is 24 px tall whatever it says, with no box or wash, and
  cut with "…" where the room ends, whole in the shared tip. `line` is for a
  place that keeps one line for whatever it has to say, as the player does
  (B4).
- **Spinner**, `spinner.tsx`: lucide's `Loader2Icon`, turning, `role="status"`
  and named Loading. It is there from the start but invisible for the first
  second (`SPINNER_AFTER_MS`, or its `after` in ms), so a quick answer does
  not flash it and nothing moves when it shows (B4, B5). It stands still
  under Reduce motion and while a take records (F11). C8's loading signs. A
  control that keeps its own icon until the spinner takes its place, as the
  small player, Look again, Check signal and Start do, counts the second
  with `useAfter`
  (`hooks/useAfter.ts`), the hook the Spinner counts with.
- **Empty**, `empty.tsx`: an empty list that says what will be here and how it
  gets here (B7): a title, a line, and the button that fills it. C8's empty
  states.
- **Item**, `item.tsx`: the one list row (C8): a title, a line under it and
  what can be done at the end, in `default`, `outline` and `muted`. A row that
  goes somewhere is an `asChild` link or button, which Tab reaches and Enter
  follows, with the shared focus ring.
- **Meter**, `meter.tsx`: one meter for a reading that moves, C8's meter:
  the signal check's level (`tone="signal"`, the signal green) and the notes
  check's velocity (`tone="notes"`, grey in the text's colour), and a
  recording tile's level and notes. `sides` are values from 0 to 1. Across,
  the default, it is one thin bar, and two sides split it along its length,
  the first above, the second below, so a dead half of a pair shows. With
  `direction="up"` it fills the box it is given, with no frame or ground of
  its own, as the tile is its ground: each side rises from the bottom,
  beside the other, with a line on its top, and a side at 0 draws nothing.
  `held` draws a 2 px line where each side's peak stands, and a side in
  `clipped` is drawn in the danger red. The tile keeps its own dB scale and
  gives the meter how far each fill reaches. It follows its value over
  75 ms and keeps doing so under Reduce motion and while a take records: a
  meter is a reading, not motion. It is a picture, hidden from a screen
  reader, unless given a `label`, and then a `meter` at its largest side.
- **Whole**, `whole.tsx`: B6's pieces for a long name. `Whole` is a plain
  text that shows whole in a tip on hover when it is cut; the keys do not
  reach a plain text, so it has no keyboard focus to show on. With `reach`
  it is a Tab stop while it is cut, with the shared focus ring, and its tip
  shows on keyboard focus too; one that fits is no stop. A name on a track's
  plate, and a notes plate's name and port, are `Whole reach`. `useCut` and
  `WholeTip` do the same round a button, a link or anything with a
  `tabindex`, the tip also showing on keyboard focus and staying while focus
  is there, even when focusing scrolled the panel. The tip is for the eyes:
  what it says is in the page already, so it is not read out again as the
  control's description.
  `Figures` is the line of figures beside a name: it takes the room the name
  leaves, drops whole figures, the least needed first (`lib/figures.ts`), and
  shows them all on hover once it has dropped some; a screen reader reads
  the whole line, whatever shows. That tip is for the pointer, and a line
  that has dropped everything has no width left to hover, so it says when
  it drops any (`onDropped`) and the name's tip, which the keyboard reaches,
  says the whole line under the name (WholeTip's `figures`, drawn by
  `FigureLine`). Where that tip is a whole row's, as on Earlier's rows and
  Recording with, the line has no tip of its own (`tip={false}`). A figure
  can be drawn as more than its words, such as a ★ take with the star icon
  (`node`): it is measured and shown as drawn, and read out as its `text`.
- **Mark**, `mark.tsx`: a mark's pieces (C8). `LabelDot` is the one label
  dot, 8 px and round, in the label's colour; `MarkLine` is the one note
  line: the dot, the time, the take where the line is away from it, then the
  label and what was written, cut at the end of the room. `MarkTick` is one
  mark on a take's bar: a 3 px tick in the label's colour where the mark
  fell, as tall as its caller makes it. On the bars of an evening's takes,
  on the rehearsal screen and in History, it passes under the take's number
  and name. Last time, the rehearsal screen and the player use them; the
  other dots, note lines and ticks move onto them as their screens are
  redone.

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
  four dialog frames and four key chips. A smaller toggle is a new size in
  `Toggle`, as `lane` is; a component is never copied to change it. A shadcn
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
  at the next start after a crash; nothing is destroyed either way. A track
  taken off the start screen has it too ("{name} was taken off."), and puts
  the track back in its place with its readings; two more removals that
  happen at once get the same notice as their screens are redone: a song
  taken out of a set and a song's old name forgotten.
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
  a layout that jumps is a bug. On the start screen the Check signal button,
  a track's port line and Start's unseen Space chip hold their room, as the
  song rows do. On the rehearsal screen Finish and Record keep their key
  chips, unseen, while a take is in hand, and Record keeps room for a number
  of two digits; an error in the footer is said over its buttons, in room
  the footer has already; Mark is as wide as Open mark; and the player keeps
  one line between the transport and the map for what it has to say, one
  thing at a time (a load error, then Cropping, then the output's warning),
  so the timeline never moves when it fills. On the recording screen the
  disk line holds the room of the longest thing it can say, and a tile's dB
  figure holds the room of "-100.0", the widest it can read. These are the
  model; the rest as each screen is redone.
- **B5. Loading.** Under 1 s nothing shows, so a quick answer does not
  flash; from 1 s a spinner takes the place of what is loading; past 10 s it
  says what it is doing. `PlayButton` already waits its second
  (`SPINNER_AFTER_MS`), and so do the player's Play, the share dialog's
  options and its Remove, and a lane of notes being read, which says so in
  its place if they cannot be read; the rest as each screen is redone, on
  shadcn's Spinner.
- **B6. Long names.** A name never gives way to a secondary figure: the name
  is what tells one thing from another. The figure wraps, goes first, or
  hides and shows on hover, as a recording tile's dB figure does; a cut
  name shows whole on hover, and on keyboard focus when it is a button, a
  link or has a `tabindex` (`useCut` and `WholeTip` round it; `Whole` is a
  plain text and shows on hover only, unless it has `reach`, which makes it
  a Tab stop while it is cut, as a track's name on its plate is); where a
  name has room for a second line, it wraps; the figures beside it are
  `Figures`, which drop whole, least needed first. As each screen is
  redone. A recording tile's name runs up the tile and takes up to two
  lines at 2.25 rem. A name still too long gets smaller, down to 1.5 rem,
  and past that it is cut and whole in the tile's tooltip on hover. Short
  names keep 2.25 rem. `TileName` fits it on an unseen copy, and again only
  when its room changes size, so nothing that comes during a take changes
  it.
- **B7. Empty states.** An empty list that only says it is empty leaves the
  person to guess what to do next. So an empty list says, in its own place,
  what will appear there and how it gets there: an empty set under Next take
  says "This set has no songs yet. Add them in Settings › Sets." On shadcn's
  Empty, as each screen is redone.
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
`lib/labels.ts`), prints each problem as `path:line rule text`, and then
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
  "src/screens/Settings.tsx": ["raw-colour", "raw-button"]
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
