# Drafts Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Drafts ("Unsaved takes found"), the rollout's sixth screen: one group of rows under the shared warning, one main button at the footer's right, nothing moving while a take recovers. Then only Settings is left.

**Architecture:** Three tasks, in order: the frame and rows (the same whatever Q1's answer), the main button (what Q1 decides), the docs. Reference: variant 2 of `/mnt/project-files/design-system/screen-drafts/q1/src/drafts-q1.patch` (b622baf), without `lib/mk.ts`, `useMk()`, variants 1 and 3, and `recoverAll`'s `rest` copy and `finish`, which lose a take an Undo brought back meanwhile.

**Tech Stack:** React 19, TypeScript, Tailwind v4; shared `components/ui/`; Playwright on `ui/e2e/fake-bridge.js`.

**Spec:** `docs/superpowers/specs/2026-10-08-design-system-design.md`, `docs/design-system.md`; `/mnt/project-files/design-system/screen-drafts/inventory.md` §1-§5; `/mnt/project-files/design-system/rulings.md`, "Экран Drafts".

## Global Constraints

- From the earlier plans: test titles in cp1252 or plain ASCII (no ł, ★, ·, … or →); five text sizes, two weights; radii 4/8/12/full; the motion values; shared components only in `components/ui/`, Radix only there; tests first, each seen failing; a cut name whole in the shared tip; groups set apart by fill, rows by 1 px lines; air 32 round the page, 24 inside a group; a footer button's error an error notice.
- **Q1 is with the owner; the plan is on «Внизу»:** the footer's main button (`footer`, `default`, rightmost) is **Recover**, or **Recover all**, which does the takes one after another and stops at one that fails; **Decide later** beside it; a row keeps **Discard**, and with more than one take its own **Recover** in `outline`.
- **The mockup's calls, accepted:** the warning heads the group; a row's title is the rehearsal's name; "Recovering… 42%" takes the line's place; Recover and Discard name their take; the column stays `max-w-3xl`.
- **Copy, exact:** the warning `Recover a take to add it to its rehearsal. The app closed while these takes were recording, so they were never saved. The audio is intact.`; a row's line `{formatWhen(created_at)} · {countOf(tracks.length, "track")} · {formatMMSS(duration_sec)}`; its buttons named `Discard {rehearsal_name}, {m:ss}`, `Recover {rehearsal_name}, {m:ss}`; the footer's `Recover`, `Recover all`; `Recover all stopped at “{rehearsal_name}”: {error}`. All other words as now.
- **Running** (since PR #54 e2e runs with reduced motion; a motion test opts in with `page.emulateMedia({ reducedMotion: "no-preference" })`): in `ui/`, `npx tsc -b`, `npm run lint`, `npm run design-check`, one `npm run build`, then the touched specs once each, `npx playwright test -c playwright.local.config.ts <specs>` (git-ignored; a worktree copies it). No full suite: CI runs it.
- British spelling; "take", never "go"; what a person reads follows CLAUDE.md "Writing". No model names in files or commits; commits end with the session's Co-Authored-By trailer alone.

## Review Focus

1. Recover all, the second of three failing: the first leaves, the third is not tried, the notice names the second, the buttons work again.
2. Undo of an earlier Discard during a recovery: the take comes back and stays after the run; meanwhile nothing can be discarded.
3. Undo after Recover closed the list: it opens again, that take alone, **Recover** in the footer.
4. **Decide later** during a recovery: the takes not reached wait for next time; the recovery's end moves nothing.
5. A name longer than two lines (`TOO_LONG` in drafts.spec.ts) at 960x680, 150 %: two lines, cut, whole in its tip, reached by Tab; the brewery name (`LONG`) wraps whole on two lines, with no tip and no Tab stop; nothing scrolls sideways.
6. Two takes of one rehearsal: told apart by length, by eye and by ear; each button and Undo acts on its own.

## Files

- Task 1: `ui/src/components/Shell.tsx`, `ui/src/screens/DraftsScreen.tsx`; create `ui/e2e/drafts.spec.ts`.
- Task 2: `DraftsScreen.tsx`, `ui/e2e/fake-bridge.js`, `drafts.spec.ts`, `ui/e2e/undo.spec.ts`.
- Task 3: `docs/design-system.md`, `docs/using-it.md`, `CHANGELOG.md`.
- Untouched: `site/` (reha.stream has no Drafts scene, `Story.tsx:27`); `tests/docs_screenshots.py` (the picture is retaken for the release); the allow-list; Python.

## Calls this plan makes

1. **The footer's word follows the list:** **Recover all** while more than one take is listed or a run goes on, else **Recover**; rows' Recover likewise, so nothing changes mid-run.
2. **Recover all works down the takes listed when pressed;** one an Undo brings back joins the list, not the run.
3. **During a recovery only Decide later of the screen's buttons works;** it stops Recover all after the take in hand, and a closed screen moves nothing.
4. **A row's buttons carry the take's length**, so two takes of one rehearsal differ by ear; the notice keeps the name alone (inventory §4).
5. **Shell holds a 36 px button's height in an `air` header**, where every redone screen has one; Settings waits for its PR.
6. **Progress comes from the journal, as now** (B5); one Recover's error keeps Python's words.

**Another variant changes Task 2 only.** «В каждой строке»: no footer button or `recoverAll`; each row's Recover `default`, spinning; `listed`, `drop` and the closed-screen guard stay; tests 1-6 and 10 become `every row's Recover is blue and names its take`, 7-9 stay on the row's Recover; the docs lose Recover all. «Без синего»: the same in `outline`, with no `--primary` fill on screen.

---

### Task 1: The frame and the rows

**Interfaces:**
- `Shell` with `air`: the title's box `min-h-9`, words centred, before `titleLeast` so Review's wins.
- `Shell air className="px-8 [--screen-pad-y:2rem]"`; the patch's `Card data-drafts` at `rise(0)`: the warning (as Setup's `Warning`), then `ItemGroup`, an `ItemSeparator` and `Item` per take; the footer's contents at `rise(1)`.
- A row: `Item size="sm" role="listitem" data-draft={dir}`, a div; title `Whole reach`, `line-clamp-2`; the line, or `RunningLine label="Recovering"` while the journal runs a `recover` for `dir`, each one 16 px line; Discard and Recover as now, named per the copy.
- For Task 2: `[data-drafts]`, `[data-draft]`, the names, the fixture:

```ts
const take = (n: number, rehearsal: string, folder: string, tracks: string[], sec: number, at = "2026-09-10T19:00:00") =>
  ({ dir: `${folder}/_drafts/take ${n}`, name: `take ${n}`, tracks, duration_sec: sec,
     rehearsal_folder: folder, rehearsal_name: rehearsal, created_at: at })
const LONG = "Tuesday jam at the old brewery, with the horn section and the choir from upstairs" // e2e/stress.js:12
const SEVEN = take(7, "Tuesday jam", "/rec/tue", ["Drums", "Bass", "Guitar", "Vocals"], 252)
const TWELVE = take(12, LONG, "/rec/brewery", ["Drums", "Bass", "Guitar", "Keys", "Vocals"], 3725, "2026-09-22T19:00:00")
const EIGHT = take(8, "Tuesday jam", "/rec/tue", ["Guitar"], 41)
const withDrafts = (list: object[]) => `window.__ACTIVITY__ = []; window.__DRAFTS__ = ${JSON.stringify(list)};`
```

- [ ] **Failing tests**, on `[SEVEN, TWELVE, EIGHT]` unless named:
  - `the takes are one group under the warning, rows split by 1 px lines`: the group `--card`, no edge, alert first, 3 `listitem`s; separators 1 px `--border`; rows DIVs with no `tabindex`, fill or edge.
  - `the screen has the air of the redone screens` (1180x820): header and footer left padding 32px; the group 32 px under the header, 768 wide; the warning 24 px in; rows' left padding 24px.
  - `the warning is the shared one, its icon in warn and its words not` (dark, light): `svg` `--warn`; words `--muted-foreground`, the exact copy.
  - `a take's row is titled by its rehearsal in 600, its line as History's`: titles `Tuesday jam`, LONG, `Tuesday jam` at 600; lines `Thu 10 Sep, 19:00 · 4 tracks · 4:12`, `Tue 22 Sep, 19:00 · 5 tracks · 62:05`, `Thu 10 Sep, 19:00 · 1 track · 0:41`.
  - `a long name takes two lines, then is cut, whole in its tip and reached by Tab` (960x680, `scaled(1.5)`; `[SEVEN, TWELVE, THIRTEEN]`): TWELVE's LONG wraps whole on two lines, no `data-cut`, no `tabindex`, no tip; THIRTEEN's `TOO_LONG` (LONG and more) is `data-cut`, two lines at most, `tabindex="0"`, `tipLines` `[TOO_LONG]`, tip on focus; short names no `tabindex`; buttons' `scrollWidth <= clientWidth`; nothing sideways.
  - `while a take recovers, its progress takes its line's place and nothing moves` (`[SEVEN]`): `hold(page, "recover_draft")`, a running `recover` at 0.42 for SEVEN in `__ACTIVITY__`, press `getByRole("button", { name: /^Recover/ })`: `Recovering… 42%`, no `[data-slot=item-description]`, the row's and group's boxes as when `settled` before, the work button in the header.
  - `the group and then the footer rise in, 40 ms apart` (motion on): `["rise", "0s"]`, `["rise", "0.04s"]`.
  - `two takes of one rehearsal are told apart by length, and each Undo brings back its own`: `Discard Tuesday jam, 4:12` and `Discard Tuesday jam, 0:41` once each, pressed: `discard_draft` SEVEN's then EIGHT's dir, two `“Tuesday jam” went to the Trash.`; one Undo gives two rows, the other three, both dirs.
- [ ] Run `drafts.spec.ts`; see them fail. Implement; `formatDateHuman` and the written-in plural go.
- [ ] Build; run `drafts`, `startup`, `notices`, `background`, `undo`, and for Shell `review` and `rehearsal-frame`, once; `tsc`, lint, design check.
- [ ] Commit `design system: Drafts' takes as one group of rows under the shared warning`.

### Task 2: The main button, Recover or Recover all (Q1, «Внизу»)

**Interfaces:**
- `listed = useRef<Draft[]>`; `put(list: Draft[]): void` sets it and `remaining`; `drop(dir: string): void` puts the list without that take and, if empty while `shown.current`, calls `onDone()`. `finish` goes; Discard and its Undo use them.
- `busy: { dir: string; job: "recover" | "discard" | "all" } | null`; `many = remaining.length > 1 || busy?.job === "all"`; `slow = useAfter(busy?.job === "recover" || busy?.job === "all", SPINNER_AFTER_MS)`.
- `recoverOne(draft: Draft): Promise<string | null>`: today's `recover` up to the answer; recovered, `drop(dir)` and null, else the error's words, which `recover(draft)` notifies as now. `recoverAll()` goes down `listed.current` as pressed, stopping once `!shown.current` or at a failure, with its notice (key `SAID`).
- Footer: **Decide later**, never disabled; `Button size="footer"`, `Save` or `Spinner after={0} className="size-5"` while `slow` on its job, its word by `many`. A row: Discard; while `many`, Recover `outline`, spinning while `slow` on its own. All but Decide later disabled while `busy`.
- `fake-bridge.js`: `__RECOVER_FAILS__` `true` fails every take, a dir that one only.

- [ ] **Failing tests**, on the three takes unless named:
  1. `one take: Recover is the footer's main button, at its right beside Decide later` (`[SEVEN]`): footer `Decide later`, `Recover` (exact), in order; Recover 56 px, `--primary`; none in the row; pressed, one `recover_draft`, the start screen.
  2. `more takes: Recover all in the footer, each row its own Recover in outline`: `Recover all`; one button on screen `--primary`, not the rows'; after two Discards, `Recover`, none in the row.
  3. `Recover all recovers the takes one after another, each showing its progress`: `hold`, SEVEN running at 0.3, Recover all: one call, `Recovering… 30%` in SEVEN's row, only Decide later enabled, still `Recover all`; `letGo`: calls SEVEN, TWELVE, EIGHT, the start screen.
  4. `Recover all stops at a take that fails and says so` (`__RECOVER_FAILS__` TWELVE's dir): calls SEVEN, TWELVE; rows TWELVE, EIGHT; one notice `Recover all stopped at “{LONG}”: Could not recover the take: its folder is read-only`; buttons enabled.
  5. `an Undo during Recover all brings its take back, and it stays once the run is done`: Discard EIGHT; `hold`; Recover all; Undo; three rows; `letGo`; calls SEVEN, TWELVE; EIGHT left; `Recover`.
  6. `Decide later during Recover all leaves the takes not reached for next time`: `hold`; Recover all; Decide later; `letGo`; `list_drafts()` comes to TWELVE, EIGHT; one `recover_draft` call.
  7. `a recovery that ends after Decide later leaves the app where it is` (`[SEVEN]`): `hold`; Recover; Decide later; open **Settings**; `letGo`; one call, Settings still open.
  8. `an Undo after Recover closed the list opens it again, Recover in the footer` (`[SEVEN, EIGHT]`): Discard SEVEN; Recover; Undo; SEVEN alone, `Recover`, none in the row.
  9. `Recover turns a spinner in its icon's place after a second, its words and box kept`, footer (`[SEVEN]`) and row (`[SEVEN, EIGHT]`), as `setup.spec.ts`'s Start test.
  10. `at 960x680 and 150 % the footer keeps Decide later and Recover all whole on one row`: one vertical centre, `scrollWidth <= clientWidth`, nothing sideways.
- [ ] Rewrite `undo.spec.ts:768`, `:784-791`, `:810-824` to count `[data-draft]`: `{ name: "Recover" }` now finds Recover all too.
- [ ] Run `drafts.spec.ts`; see the ten fail. Implement.
- [ ] Build; run `drafts`, `undo`, `startup`, `notices`, `background` once; `tsc`, lint, design check.
- [ ] Commit `design system: Drafts' main button, Recover or Recover all`.

### Task 3: The rules, the guide, the news

- [ ] `docs/design-system.md`: "Where things stand", Drafts redone, Settings last; C1, **Recover** (**Recover all**) `footer`, **Decide later** `footer-aside`; B4, an `air` header as tall with the work button, a recovering take's progress in its line's place; B5, Recover waits its second.
- [ ] `docs/using-it.md:1012-1015`, what to do first: **Recover** at the bottom right adds the take to its rehearsal; with more, **Recover all** does them one after another, and each take has its own **Recover**; one that fails stops it, a notice says why, the rest stay. **Discard**, **Undo**, **Decide later** as now; a long name is cut after two lines, whole when pointed at.
- [ ] `CHANGELOG.md`, Unreleased, after History's: **Unsaved takes have one main button, Recover, at the bottom right.** Then **Recover all** and where it stops, the rows' buttons, one card, the warning's plain words, long names, the day as in History, the spinner, nothing moving.
- [ ] Check both texts with the humanizer skill; run the design check.
- [ ] Commit `design system: Drafts in the rules, the guide and the news`; the PR says the picture is retaken for the release and lists the calls.
