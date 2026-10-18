# Review Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Step 4 of the design system's rollout, for its fourth screen: Review, the screen after Stop. The take's name becomes the header's title, as the owner chose. Every piece is on the shared components, nothing jumps, and `Shell.tsx`, `ActivityButton.tsx` and `TakeSummary.tsx` leave the design check's allow-list.

**Architecture:** First the shared pieces Review needs: the checkbox, one columns piece shared with the start screen's Last time, and no capitals in Shell and the background work list. Then the take's facts, name and figures (`TakeSummary.tsx`) and the screen itself. Last, reha.stream and the docs.

The reference is the Q1 mockup's patch, `/mnt/project-files/design-system/screen-review/q1/src/review-q1.patch`, against 47a5b21. Take its code for variant 2, «Имя в шапке», but:
- leave out `lib/mk.ts`, `useMkReview()` and the code of variants 1 and 3 (the footer's `TakeSummary` with `over`, `FooterRow`'s `snug`, Shell's corner speaker);
- drop every `mockup` comment.

**Tech Stack:** React 19, TypeScript, Tailwind v4, the unified `radix-ui` package, cva, lucide; Storybook 10.6.1; Vitest (node) and Playwright on `ui/e2e/fake-bridge.js` with `ui/e2e/band.js`.

**Spec:** `docs/superpowers/specs/2026-10-08-design-system-design.md`: C1-C8, U1-U5, B1-B9, F2-F11, and rollout step 4. The rules as merged are in `docs/design-system.md`. The screen today and what changes without asking: `/mnt/project-files/design-system/screen-review/inventory.md` §1 and §2. The owner's answer: `/mnt/project-files/design-system/rulings.md`, "Экран Review".

## Global Constraints

- From the foundation plan, still holding: Latin-only test titles in plain ASCII (no ×, ·, … or →); the five text sizes and two weights; radii 4/8/12/full; the motion values; shared components only in `components/ui/`, each with a story; Radix only there; tests first, seen failing.
- The other screens' rulings carry over: tips are for cut names and icon buttons; a cut name is whole in the shared tooltip (`WholeTip`, `components/ui/whole.tsx`); groups are set apart by fill only; air 32 round the screen, 48 between groups, 24 inside a group.
- **The owner's answer, Q1 «Имя в шапке»** (2026-10-18 00:02Z):
  - the header's title is the take: the song and its number, "Kalychanka 2", with its pencil (Rename take), on up to two lines, then cut with the number kept, whole in the shared tooltip; a take nobody named is "Take 33", grey;
  - over it the subtitle `Take {N} · {rehearsal}`;
  - at the header's right, where the rehearsal screen has its figures: the song's takes tonight as columns, then the line; they take only the room the name leaves and give way to it, the columns first, then the line (cut at its end, gone under 5rem); whatever has given way is whole in the tooltip;
  - the footer is one row: the cloud line at the left, **Discard** and **Save take** at the right; no rule between them.
- The calls shown on the mockup, not objected to: **Save take** is `size="footer"` (56 px), **Discard** stays `footer-aside`; the cloud box is the shared `Checkbox`, ticked in the text's colour; the columns are one piece with Last time's; the line names the take it is measured against in full ("2:04 shorter than Kalychanka (…) 1").
- **Copy, exact:** `Take {N} · {rehearsal}`; `Send to the cloud: {the mix | the original tracks | the mix and the tracks}, {FORMAT}`; `Stays on this computer: no cloud folder is set`; the line `{m:ss}`, `{m:ss} · {against(...)}`, `{m:ss} · the song's first take tonight`; the pencil's tip and name `Rename take`; the columns' tip `{song} {n}: {m:ss}, …`.
- While developing, run only the tests a change touches, each once. The full suites run once on CI on the branch before the PR.

## Review Focus

1. A long song name and a long rehearsal name at 960×680 and 150 %: the title keeps its two lines and its pencil; the figures, then the line, give way; nothing scrolls sideways.
2. Rename to a much shorter or longer name: the header's height changes only with the title's line count, and the player below does not jump while the cloud line answers (B4).
3. Space after ticking the cloud box still saves the take, not toggles the box (the box gives up focus, as today).
4. A take nobody named ("Take 33"): no columns, the line has the length alone, the title grey.
5. A failed save: the error over the buttons, cut, and reachable by Tab while cut.

## Files

- Create `ui/src/components/ui/checkbox.tsx` (+ `checkbox.stories.tsx`): from the patch.
- Create `ui/src/components/ui/take-columns.tsx` (+ story, + `take-columns.test.ts` if logic): the one columns piece.
- Modify `ui/src/components/LastTime.tsx`: its `data-goes` columns use `TakeColumns`.
- Modify `ui/src/components/Shell.tsx`, `ui/src/components/ActivityButton.tsx`: no capitals.
- Modify `ui/src/components/TakeTitle.tsx`: `start` for two lines at the line's start; the pencil after the last word.
- Rewrite `ui/src/components/TakeSummary.tsx`: `useTakeFacts`, `TakeName`, `TakeFigures`.
- Modify `ui/src/screens/Review.tsx`, `ui/src/components/FooterRow.tsx` (the error's Tab stop), `ui/src/components/LaneControls.tsx` (fader focus).
- Tests: `ui/e2e/review.spec.ts`, `cloud.spec.ts`, `undo.spec.ts` and any other spec that finds Review by "Take N recorded", the summary or the cloud box.
- Modify `ui/design-check.allow.json`, `site/src/stage/Story.tsx` (if it needs props), `docs/design-system.md`, `docs/using-it.md`, `CHANGELOG.md`.

## Calls this plan makes

1. **The columns' colours, one for both screens:** the lit one (Review's new take, Last time's playing take) in the text's colour, `bg-foreground`, or `bg-signal` when starred; a starred one `bg-signal/45`; the rest `bg-muted-foreground/35`. On Last time the playing take turns from grey to the text's colour; on Review a ★ take is a paler green than today's.
2. **The pencil follows the name's last word**, inline, and the two-line fit counts its width, so on two lines it is not stranded at the box's right edge (seen on the mockup).
3. **The footer's error is a Tab stop while cut**, as the player's line is (`TakePlayer.tsx:215-235`), so a keyboard reaches its whole sentence (carried item, `../sdd/rehearsal-progress.md:61`).
4. **The fader shows keyboard focus**: a ring on its thumb on `:focus-visible` (`LaneControls.tsx:93`), on Review, the rehearsal screen and History at once (carried item).
5. **The groups rise in**, 40 ms apart, with `animate-rise` and `rise(n)` as the other screens.
6. B9, Space and Esc following a single-key setting, waits for Settings, which has no such setting yet.

---

### Task 1: The checkbox, the columns, no capitals

**Files:** `components/ui/checkbox.tsx` + story; `components/ui/take-columns.tsx` + story; `LastTime.tsx`; `Shell.tsx`; `ActivityButton.tsx`; `design-check.allow.json`; the e2e and Vitest checks they touch.

**Interfaces:**
- Produces: `Checkbox` (shadcn new-york-v4 on `radix-ui`'s `Checkbox`, as in the patch: `data-[state=checked]:bg-foreground text-background`, `rounded-sm`).
- Produces: `TakeColumns({ columns, height, numbers = false, className })`, `columns: { key: number; sec: number; starred: boolean; lit: boolean; label?: number | null }[]`, `height: 24 | 36` (px). Each column as tall as it ran via `drawnLength(sec, longest, height)` (`lib/takeScale`); with `numbers`, `label` under it at `text-xs` (12 px), `font-semibold text-foreground` when lit. Colours as call 1. `aria-hidden` itself; the caller names it.

- [ ] Write the failing checks: a Vitest or story-level test that `TakeColumns` gives each colour class by `lit`/`starred` (call 1), and that the design check passes with the `uppercase` entries for `Shell.tsx` and `ActivityButton.tsx` removed from the allow-list.
- [ ] Run them; see them fail.
- [ ] Add the two components and their stories; move Last time's columns onto `TakeColumns` (`height={24}`, no numbers); remove `uppercase tracking-wide` from Shell's subtitle and the "Working"/"Done" headings; drop those two allow-list entries.
- [ ] Run the touched Vitest file, the design check (`npm run design-check` or the repo's script) and the e2e specs that read Last time's columns (`grep -l "data-goes" ui/e2e`), each once.
- [ ] Commit `design system: the checkbox, one columns piece, no capitals in the header`.

### Task 2: The Review screen (Q1 «Имя в шапке»)

**Files:** `TakeTitle.tsx`, `TakeSummary.tsx`, `Review.tsx`, `FooterRow.tsx`, `LaneControls.tsx`, `design-check.allow.json`, `ui/e2e/review.spec.ts` and the other specs that find Review.

**Interfaces:**
- Consumes: `Checkbox`, `TakeColumns` (Task 1); `WholeTip`, `useCut`; `Tooltip*`; `GoTitle`.
- Produces from `TakeSummary.tsx` (the old `TakeSummary` export goes):
  - `useTakeFacts({ name, takeNumber, durationSec, takes, choices }) => { song, go, unnamed, shown, columns, columnsText, line }` (the patch's, with `columns` in `TakeColumns`' shape);
  - `TakeName({ facts, name, fallback, choices, onRename })`: the title with `GoTitle lines={2} start`, the pencil after it (call 2) with the shared Tooltip "Rename take", and `RenameTakeDialog`;
  - `TakeFigures({ facts })`: the patch's, with `LINE_LEAST_REM = 12`, `LINE_GONE_REM = 5`, the columns by `TakeColumns height={36} numbers`, named `Takes of {song} tonight: {columnsText}`.
- `GoTitle` gains `start?: boolean` (with `lines={2}`).

- [ ] Write the failing e2e tests in `review.spec.ts` (titles ASCII):
  - `the header's title is the take with its number and pencil, over "Take N - rehearsal"`: `h1` has `Pałyn 4` (band), the subtitle `Take 7 · Tuesday jam`; no "recorded" anywhere;
  - `a long title takes two lines, then is cut with its number, whole in the tooltip` (the 111-character name at 960x680);
  - `the columns give way before the title, then the line; hovering says them`: stress take at 960x680, `data-columns-gone` set, the tip has the columns' text;
  - `Save take is the footer's 56 px button and Discard 40`;
  - `the cloud line holds its room before the settings answer` (hold `get_settings`, compare the footer's height before and after: equal);
  - `the cloud box is a checkbox, and Space after ticking it saves the take`;
  - `a cut save error is reachable by Tab`.
  Rewrite the old tests that read the footer summary, "Take N recorded", native titles or the 26rem column (`review.spec.ts`, `cloud.spec.ts`, `undo.spec.ts`, and any `grep -rln "recorded\b\|data-take-summary\|send-to-cloud\|go-bar" ui/e2e` finds) to the new places.
- [ ] Run the new tests; see them fail.
- [ ] Implement: `Review.tsx` as the patch's variant 2 (`air`, `className="px-8 [--screen-pad-y:2rem]"`, subtitle, `title={<TakeName …/>}`, `facts={<TakeFigures …/>}`, `FooterRow error={error} left={cloudLine}` with the buttons as children, the cloud line holding its room); `TakeTitle.tsx` `start` and call 2; `FooterRow.tsx` call 3; `LaneControls.tsx` call 4; call 5 on the player's groups; drop `TakeSummary.tsx: px-text` from the allow-list.
- [ ] Run `review.spec.ts`, `cloud.spec.ts`, `undo.spec.ts`, `volume.spec.ts`, `player.spec.ts` and the specs the grep found, each once; `npx tsc -b`; the design check.
- [ ] Commit `design system: the Review screen, the take's name in the header`.

### Task 3: reha.stream, the rules, the guide, the news

**Files:** `site/src/stage/Story.tsx` and its test if it reads the old summary; `docs/design-system.md`; `docs/using-it.md`; `CHANGELOG.md`.

- [ ] Story: the Review stage renders with the new header (props as `Review` now needs); its site test, if one reads the footer summary, moves to the header. Run the site's tests that touch the story once.
- [ ] `docs/design-system.md`: C8 names `Checkbox` and `TakeColumns` among the shared pieces; F7 no longer lists Shell's subtitle as an exception if it did; the footer's rule (B-section on `FooterRow`) says Review has no rule and its **Save take** is `footer` size.
- [ ] `docs/using-it.md`: the paragraph on the screen after Stop says the take's name is at the top with its pencil, the song's takes tonight beside it, and **Save take** and **Discard** at the bottom with the cloud box. Written under CLAUDE.md "Writing"; British spelling; button names bold.
- [ ] `CHANGELOG.md`, under Unreleased, one item starting bold: **The take's name is at the top of the screen after Stop.** Then what moved, in a musician's words.
- [ ] Commit `design system: Review on reha.stream, in the rules, the guide and the news`.
