import {
  callCount,
  calls,
  colour,
  EDGE,
  expect,
  hold,
  holdFor,
  letGo,
  letThrough,
  notices,
  openApp,
  scaled,
  settled,
  setFake,
  startButton,
  style,
  test,
  themed,
  waitingFor,
} from "./app.ts"
import type { Locator, Page } from "@playwright/test"

// Drafts, the "Unsaved takes found" screen: takes that were recorded and never
// saved, offered before anything else. The takes are one group under the
// warning, a row each.

const take = (n: number, rehearsal: string, folder: string, tracks: string[], sec: number, at = "2026-09-10T19:00:00") =>
  ({ dir: `${folder}/_drafts/take ${n}`, name: `take ${n}`, tracks, duration_sec: sec,
     rehearsal_folder: folder, rehearsal_name: rehearsal, created_at: at })
const LONG = "Tuesday jam at the old brewery, with the horn section and the choir from upstairs" // e2e/stress.js:12
const SEVEN = take(7, "Tuesday jam", "/rec/tue", ["Drums", "Bass", "Guitar", "Vocals"], 252)
const TWELVE = take(12, LONG, "/rec/brewery", ["Drums", "Bass", "Guitar", "Keys", "Vocals"], 3725, "2026-09-22T19:00:00")
const EIGHT = take(8, "Tuesday jam", "/rec/tue", ["Guitar"], 41)
// More than two lines of the narrowest window at 150 %: LONG takes two there
// and fits, so the cut shows with this one.
const TOO_LONG = `${LONG}, the kids from next door and the man with the accordion`
const THIRTEEN = take(13, TOO_LONG, "/rec/accordion", ["Guitar"], 95, "2026-09-29T19:00:00")
const withDrafts = (list: object[]) => `window.__ACTIVITY__ = []; window.__DRAFTS__ = ${JSON.stringify(list)};`

const WARNING =
  "Recover a take to add it to its rehearsal. The app closed while these takes were recording, so they were never saved. The audio is intact."

/** The group of takes, and its rows. */
const group = (page: Page) => page.locator("[data-drafts]")
const rows = (page: Page) => page.locator("[data-draft]")
/** A row's title, the text itself. */
const title = (row: Locator) => row.locator("[data-slot=item-title] > span")
const workButton = (page: Page) => page.locator("header button[aria-label^='Background work']")
/** The tip a cut name shows whole. */
const tip = (page: Page) => page.locator("[data-whole][data-state$='open']")
const box = async (el: Locator) => (await el.boundingBox())!
/** A take's row. */
const rowOf = (page: Page, draft: { dir: string }) => page.locator(`[data-draft="${draft.dir}"]`)
/** The footer's buttons, in order, and its main one, the last. By its place,
 *  since a second into a recovery its spinner's "Loading" is in its name. */
const footerButtons = (page: Page) => page.locator("footer").getByRole("button")
const mainButton = (page: Page) => footerButtons(page).last()
/** The buttons of the screen itself, its rows' and its footer's, that work now. */
const working = (page: Page) => page.locator("main button:enabled, footer button:enabled")
/** The journal's entry for a take being recovered, this far along. */
const recovering = (dir: string, fraction: number) => ({
  id: 1,
  kind: "recover",
  title: "recover",
  folder: dir,
  take_number: null,
  state: "running",
  fraction,
  step: null,
  error: null,
  detail: null,
  retry: null,
  seen: false,
})
/** The takes Python still has unsaved, as it would list them next time. */
const onDisk = (page: Page) =>
  page.evaluate(async () => {
    const w = window as unknown as {
      pywebview: { api: { list_drafts: () => Promise<{ dir: string }[]> } }
    }
    return (await w.pywebview.api.list_drafts()).map((d) => d.dir)
  })

/** The screen with these takes, risen into place; `before` runs ahead of the fake. */
async function openDrafts(page: Page, list: object[] = [SEVEN, TWELVE, EIGHT], before = "") {
  await openApp(page, { before: withDrafts(list) + before })
  await expect(page.getByRole("heading", { name: "Unsaved takes found" })).toBeVisible()
  await expect(rows(page)).toHaveCount(list.length)
  await settled(page)
}

test("the takes are one group under the warning, rows split by 1 px lines", async ({ page }) => {
  await openDrafts(page)
  const card = group(page)
  // A group is set apart by its fill alone: no edge, no shadow (F4).
  expect(await style(card, "background-color")).toEqual({ "background-color": await colour(page, "--card") })
  for (const [side, width] of Object.entries(await style(card, ...EDGE))) {
    if (side.endsWith("-width")) expect(width, side).toBe("0px")
  }
  expect(await style(card, "box-shadow")).toEqual({ "box-shadow": "none" })

  // The warning first, in the group, then the list with a row to a take.
  await expect(card.locator("[data-slot=alert]")).toHaveCount(1)
  expect(await card.evaluate((g) => g.firstElementChild!.querySelector("[data-slot=alert]") !== null)).toBe(true)
  const list = card.getByRole("list")
  await expect(list.getByRole("listitem")).toHaveCount(3)
  expect((await box(card.locator("[data-slot=alert]"))).y).toBeLessThan((await box(list)).y)

  // A 1 px line above each row, across the group, in the border's colour.
  const lines = card.locator("[data-slot=item-separator]")
  await expect(lines).toHaveCount(3)
  const wide = (await box(card)).width
  for (let i = 0; i < 3; i++) {
    const line = await box(lines.nth(i))
    expect(line.height, `line ${i}`).toBe(1)
    expect(line.width, `line ${i}`).toBeCloseTo(wide, 0)
    expect(await style(lines.nth(i), "background-color"), `line ${i}`).toEqual({
      "background-color": await colour(page, "--border"),
    })
    expect(line.y + line.height, `line ${i} right above its row`).toBeCloseTo((await box(rows(page).nth(i))).y, 0)
    if (i > 0) {
      const above = await box(rows(page).nth(i - 1))
      expect(above.y + above.height, `line ${i} right under the row before`).toBeCloseTo(line.y, 0)
    }
  }

  // The rows go nowhere: plain boxes, no Tab stop, no fill, no edge.
  for (const row of await rows(page).all()) {
    expect(await row.evaluate((e) => e.tagName)).toBe("DIV")
    await expect(row).not.toHaveAttribute("tabindex")
    const look = await style(row, "background-color", ...EDGE)
    expect(look["background-color"]).toBe("rgba(0, 0, 0, 0)")
    for (const [side, width] of Object.entries(look)) if (side.endsWith("-width")) expect(width, side).toBe("0px")
  }
})

test("the screen has the air of the redone screens", async ({ page }) => {
  await openDrafts(page)
  // 32 px at the header's and the footer's sides.
  expect(await style(page.locator("header"), "padding-left")).toEqual({ "padding-left": "32px" })
  expect(await style(page.locator("footer"), "padding-left")).toEqual({ "padding-left": "32px" })
  const head = await box(page.locator("header"))
  const card = await box(group(page))
  // The group 32 px under the header, as wide as the column: 768.
  expect(card.y - (head.y + head.height)).toBeCloseTo(32, 0)
  expect(card.width).toBeCloseTo(768, 0)
  // 24 px inside it: the warning, the rows' padding and what is in them.
  expect((await box(group(page).locator("[data-slot=alert]"))).x - card.x).toBeCloseTo(24, 0)
  const first = rows(page).first()
  expect(await style(first, "padding-left")).toEqual({ "padding-left": "24px" })
  expect(await style(first, "padding-right")).toEqual({ "padding-right": "24px" })
  expect((await box(title(first))).x - card.x).toBeCloseTo(24, 0)
  const recover = await box(first.getByRole("button", { name: /^Recover/ }))
  expect(card.x + card.width - (recover.x + recover.width)).toBeCloseTo(24, 0)
})

for (const theme of ["dark", "light"] as const) {
  test(`the warning is the shared one, its icon in warn and its words not, in the ${theme} theme`, async ({
    page,
  }) => {
    await openDrafts(page, [SEVEN, TWELVE, EIGHT], themed(theme))
    expect(await page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(
      theme === "dark"
    )
    // The Alert the start screen's warnings are: its icon in the warn colour,
    // its words in the grey of a description, which reads on the wash in
    // both themes where amber words did not (1.84 to 1 in light).
    const alert = group(page).locator("[data-slot=alert]")
    await expect(alert).toHaveAttribute("role", "status")
    await expect(alert.locator("svg")).toHaveCount(1)
    expect(await style(alert.locator("svg"), "color")).toEqual({ color: await colour(page, "--warn") })
    const words = alert.getByText(WARNING, { exact: true })
    await expect(words).toHaveCount(1)
    expect(await style(words, "color")).toEqual({ color: await colour(page, "--muted-foreground") })
  })
}

test("a take's row is titled by its rehearsal in 600, its line as History's", async ({ page }) => {
  await openDrafts(page)
  await expect(rows(page).locator("[data-slot=item-title]")).toHaveText(["Tuesday jam", LONG, "Tuesday jam"])
  for (const row of await rows(page).all()) {
    expect(await style(title(row), "font-weight")).toEqual({ "font-weight": "600" })
  }
  const lines = rows(page).locator("[data-slot=item-description]")
  await expect(lines).toHaveText([
    "Thu 10 Sep, 19:00 · 4 tracks · 4:12",
    "Tue 22 Sep, 19:00 · 5 tracks · 62:05",
    "Thu 10 Sep, 19:00 · 1 track · 0:41",
  ])
  // Each a 16 px line.
  for (const line of await lines.all()) expect((await box(line)).height).toBeCloseTo(16, 0)

  // Each button names its take, and its length tells two of one rehearsal apart.
  for (const [row, name, length] of [
    [0, "Tuesday jam", "4:12"],
    [1, LONG, "62:05"],
    [2, "Tuesday jam", "0:41"],
  ] as const) {
    for (const verb of ["Discard", "Recover"]) {
      const button = rows(page).nth(row).getByRole("button", { name: `${verb} ${name}, ${length}`, exact: true })
      await expect(button).toHaveCount(1)
      await expect(button).toHaveText(verb)
    }
  }
})

test("a long name takes two lines, then is cut, whole in its tip and reached by Tab", async ({ page }) => {
  await page.setViewportSize({ width: 960, height: 680 })
  await openDrafts(page, [SEVEN, TWELVE, THIRTEEN], scaled(1.5))
  const [short, fits, cut] = [0, 1, 2].map((n) => title(rows(page).nth(n)))
  const line = await cut.evaluate((el) => parseFloat(getComputedStyle(el).lineHeight))

  // The brewery's name wraps to a second line and is all there: no cut, no
  // Tab stop, no tip.
  await expect(fits).toHaveText(LONG)
  const wrapped = (await box(fits)).height
  expect(wrapped).toBeGreaterThanOrEqual(2 * line - 1)
  expect(wrapped).toBeLessThanOrEqual(2 * line + 1)
  for (const name of [short, fits]) {
    await expect(name).not.toHaveAttribute("data-cut")
    await expect(name).not.toHaveAttribute("tabindex")
    await name.hover()
    await page.waitForTimeout(700)
    await expect(page.locator("[data-whole]")).toHaveCount(0)
    await page.mouse.move(0, 0, { steps: 8 })
  }

  // One longer than two lines takes two and is cut after the second.
  await expect(cut).toHaveText(TOO_LONG)
  await expect(cut).toHaveAttribute("data-cut")
  expect((await box(cut)).height).toBeLessThanOrEqual(2 * line + 1)
  expect((await box(cut)).height).toBeGreaterThanOrEqual(2 * line - 1)
  await expect(cut).toHaveAttribute("tabindex", "0")

  // Whole under the pointer.
  await cut.hover()
  await expect(tip(page)).toHaveText(TOO_LONG)
  await page.mouse.move(0, 0, { steps: 8 })
  await expect(tip(page)).toHaveCount(0)

  // Under the keys: Tab from the row before reaches the name, once, with the
  // shared ring, and the tip shows. The name that fits is no stop.
  await rows(page).nth(0).getByRole("button", { name: /^Recover/ }).focus()
  await page.keyboard.press("Tab")
  await expect(rows(page).nth(1).getByRole("button", { name: /^Discard/ })).toBeFocused()
  await page.keyboard.press("Tab")
  await expect(rows(page).nth(1).getByRole("button", { name: /^Recover/ })).toBeFocused()
  await page.keyboard.press("Tab")
  await expect(cut).toBeFocused()
  await expect(tip(page)).toHaveText(TOO_LONG)
  expect((await style(cut, "box-shadow"))["box-shadow"]).not.toBe("none")
  await page.keyboard.press("Tab")
  await expect(rows(page).nth(2).getByRole("button", { name: /^Discard/ })).toBeFocused()
  await expect(tip(page)).toHaveCount(0)

  // The names leave the buttons their words whole, and nothing scrolls sideways.
  for (const button of await rows(page).getByRole("button").all()) {
    expect(await button.evaluate((b) => b.scrollWidth <= b.clientWidth), await button.innerText()).toBe(true)
  }
  const named = await box(cut)
  const discard = await box(rows(page).nth(2).getByRole("button", { name: /^Discard/ }))
  expect(named.x + named.width).toBeLessThanOrEqual(discard.x + 0.5)
  expect(
    await page.evaluate(() => {
      const main = document.querySelector("main")!
      return document.documentElement.scrollWidth > window.innerWidth || main.scrollWidth > main.clientWidth
    })
  ).toBe(false)
})

/** A take recovering with the journal at 42 %: its row's progress takes its
 *  line's place, and the header, the group and the row keep their boxes. */
async function recoveringKeepsTheBoxes(page: Page, draft: ReturnType<typeof take>, scale: number) {
  await openDrafts(page, [draft], scale === 1 ? "" : scaled(scale))
  const row = rows(page)
  const line = row.locator("[data-slot=item-description]")
  await expect(line).toHaveCount(1)
  const before = {
    header: await box(page.locator("header")),
    group: await box(group(page)),
    row: await box(row),
    line: await box(line),
  }
  // A 16 px line, as big as the text is.
  expect(before.line.height).toBeCloseTo(16 * scale, 0)
  await expect(workButton(page)).toHaveCount(0)

  // Python is slow to recover; the journal says how far it has come.
  await hold(page, "recover_draft")
  await setFake(page, "__ACTIVITY__", [recovering(draft.dir, 0.42)])
  await page.getByRole("button", { name: /^Recover/ }).click()
  await expect(row).toContainText("Recovering… 42%")
  // In its line's place: the line is gone, and the progress is as tall.
  await expect(line).toHaveCount(0)
  expect((await box(row.getByRole("status"))).height).toBeCloseTo(before.line.height, 0)
  // The button for the work comes into the header, which holds its height.
  await expect(workButton(page)).toBeVisible()
  expect(await box(page.locator("header"))).toEqual(before.header)
  expect(await box(group(page))).toEqual(before.group)
  expect(await box(row)).toEqual(before.row)
  await letGo(page, "recover_draft")
}

test("while a take recovers, its progress takes its line's place and nothing moves", async ({ page }) => {
  await recoveringKeepsTheBoxes(page, SEVEN, 1)
})

test("while a take recovers at 960x680 and 150 %, its row keeps its height", async ({ page }) => {
  // The brewery's take has the longest line and a name on two lines.
  await page.setViewportSize({ width: 960, height: 680 })
  await recoveringKeepsTheBoxes(page, TWELVE, 1.5)
})

test("the group and then the footer rise in, 40 ms apart", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" })
  await openApp(page, { before: withDrafts([SEVEN, TWELVE, EIGHT]) })
  await expect(rows(page)).toHaveCount(3)
  const rise = (el: Locator) =>
    el.evaluate((e) => {
      const s = getComputedStyle(e.closest(".animate-rise")!)
      return [s.animationName, s.animationDelay]
    })
  expect(await rise(group(page))).toEqual(["rise", "0s"])
  expect(await rise(page.getByRole("button", { name: "Decide later" }))).toEqual(["rise", "0.04s"])
  // The header is there from the first frame.
  expect(await page.locator("header").evaluate((e) => e.closest(".animate-rise") === null)).toBe(true)
})

test("two takes of one rehearsal are told apart by length, and each Undo brings back its own", async ({
  page,
}) => {
  await openDrafts(page)
  const long = page.getByRole("button", { name: "Discard Tuesday jam, 4:12", exact: true })
  const short = page.getByRole("button", { name: "Discard Tuesday jam, 0:41", exact: true })
  await expect(long).toHaveCount(1)
  await expect(short).toHaveCount(1)

  await long.click()
  await expect(rows(page)).toHaveCount(2)
  await short.click()
  await expect(rows(page)).toHaveCount(1)
  expect((await calls(page, "discard_draft")).map((c) => c.args)).toEqual([[SEVEN.dir], [EIGHT.dir]])

  // Both say the same words; the length is in the buttons, not the notice.
  // They stand oldest first, so the last is the 0:41 take's: its Undo brings
  // that one back, and not the 4:12 one.
  const gone = notices(page).filter({ hasText: "“Tuesday jam” went to the Trash." })
  await expect(gone).toHaveCount(2)
  await gone.last().getByRole("button", { name: "Undo" }).click()
  await expect(rows(page)).toHaveCount(2)
  await expect(page.locator(`[data-draft="${EIGHT.dir}"]`)).toHaveCount(1)
  await expect(page.locator(`[data-draft="${SEVEN.dir}"]`)).toHaveCount(0)
  await expect(short).toHaveCount(1)
  await expect(long).toHaveCount(0)

  // The other one, and then all three are there.
  await gone.first().getByRole("button", { name: "Undo" }).click()
  await expect(rows(page)).toHaveCount(3)
  await expect(page.locator(`[data-draft="${SEVEN.dir}"]`)).toHaveCount(1)
  await expect(long).toHaveCount(1)
  await expect(short).toHaveCount(1)
  // Each back where it was when it went, so the order is the fake's; what
  // counts is that all three are there.
  const dirs = await rows(page).evaluateAll((els) => els.map((e) => e.getAttribute("data-draft")))
  expect([...dirs].sort()).toEqual([SEVEN.dir, TWELVE.dir, EIGHT.dir].sort())
})

// The main button. With one take the footer's Recover recovers it; with more,
// Recover all does them one after another, and each row has its own Recover
// as well, in outline.

test("one take: Recover is the footer's main button, at its right beside Decide later", async ({ page }) => {
  await openDrafts(page, [SEVEN])
  await expect(footerButtons(page)).toHaveText(["Decide later", "Recover"])
  const recover = page.locator("footer").getByRole("button", { name: "Recover", exact: true })
  const later = await box(footerButtons(page).first())
  const main = await box(recover)
  // At the right of Decide later, on its line, the 56 px of a main button, in
  // the accent.
  expect(main.x).toBeGreaterThan(later.x + later.width)
  expect(main.y + main.height / 2).toBeCloseTo(later.y + later.height / 2, 0)
  expect(main.height).toBeCloseTo(56, 0)
  expect(await style(recover, "background-color")).toEqual({
    "background-color": await colour(page, "--primary"),
  })
  // The row keeps its Discard alone.
  await expect(rows(page).getByRole("button")).toHaveText(["Discard"])

  await recover.click()
  await expect(startButton(page)).toBeVisible()
  expect((await calls(page, "recover_draft")).map((c) => c.args)).toEqual([[SEVEN.dir]])
})

test("more takes: Recover all in the footer, each row its own Recover in outline", async ({ page }) => {
  await openDrafts(page)
  await expect(footerButtons(page)).toHaveText(["Decide later", "Recover all"])
  // One button on the screen is in the accent: the footer's, not the rows'.
  const primary = await colour(page, "--primary")
  const filled = await page
    .getByRole("button")
    .evaluateAll(
      (buttons, fill) =>
        buttons.filter((b) => getComputedStyle(b).backgroundColor === fill).map((b) => b.textContent),
      primary
    )
  expect(filled).toEqual(["Recover all"])
  const own = rows(page).getByRole("button", { name: /^Recover/ })
  await expect(own).toHaveCount(3)
  for (const button of await own.all()) await expect(button).toHaveAttribute("data-variant", "outline")

  // Two discarded, one is left: the footer says Recover, and the row has
  // Discard alone.
  await page.getByRole("button", { name: "Discard Tuesday jam, 4:12", exact: true }).click()
  await expect(rows(page)).toHaveCount(2)
  await expect(footerButtons(page)).toHaveText(["Decide later", "Recover all"])
  await page.getByRole("button", { name: "Discard Tuesday jam, 0:41", exact: true }).click()
  await expect(rows(page)).toHaveCount(1)
  await expect(footerButtons(page)).toHaveText(["Decide later", "Recover"])
  await expect(rows(page).getByRole("button")).toHaveText(["Discard"])
})

test("Recover all recovers the takes one after another, each showing its progress", async ({ page }) => {
  await openDrafts(page)
  // The first take held where it is, and the last one held on its own after.
  await holdFor(page, "recover_draft", EIGHT.dir)
  await hold(page, "recover_draft")
  await setFake(page, "__ACTIVITY__", [recovering(SEVEN.dir, 0.3)])
  await mainButton(page).click()
  await expect(rowOf(page, SEVEN)).toContainText("Recovering… 30%")
  expect(await callCount(page, "recover_draft")).toBe(1)
  // Of the screen's buttons only Decide later works while it runs, and the
  // footer still says Recover all.
  await expect(working(page)).toHaveText(["Decide later"])
  await expect(mainButton(page)).toHaveText("Recover all")

  // The first two done, the last one in hand: one take is listed, and the
  // buttons stay as they were for the run.
  await letGo(page, "recover_draft")
  await expect.poll(() => waitingFor(page)).toBe(1)
  await setFake(page, "__ACTIVITY__", [recovering(EIGHT.dir, 0.6)])
  await expect(rows(page)).toHaveCount(1)
  await expect(rowOf(page, EIGHT)).toContainText("Recovering… 60%")
  await expect(mainButton(page)).toHaveText("Recover all")
  await expect(rowOf(page, EIGHT).getByRole("button", { name: /^Recover/ })).toBeDisabled()
  await expect(working(page)).toHaveText(["Decide later"])

  await letThrough(page)
  await expect(startButton(page)).toBeVisible()
  expect((await calls(page, "recover_draft")).map((c) => c.args)).toEqual([
    [SEVEN.dir],
    [TWELVE.dir],
    [EIGHT.dir],
  ])
})

test("Recover all stops at a take that fails and says so", async ({ page }) => {
  await openDrafts(page, [SEVEN, TWELVE, EIGHT], `window.__RECOVER_FAILS__ = ${JSON.stringify(TWELVE.dir)};`)
  await mainButton(page).click()
  // The first is recovered, the second fails, the third is not tried.
  await expect(notices(page)).toHaveCount(1)
  await expect(notices(page, "error").locator("p")).toHaveText(
    `Recover all stopped at “${LONG}”: Could not recover the take: its folder is read-only`
  )
  await expect(rows(page)).toHaveCount(2)
  expect(await rows(page).evaluateAll((els) => els.map((e) => e.getAttribute("data-draft")))).toEqual([
    TWELVE.dir,
    EIGHT.dir,
  ])
  // The buttons work again.
  await expect(page.locator("main button:disabled, footer button:disabled")).toHaveCount(0)
  await expect(mainButton(page)).toHaveText("Recover all")
  expect((await calls(page, "recover_draft")).map((c) => c.args)).toEqual([[SEVEN.dir], [TWELVE.dir]])
})

test("an Undo during Recover all brings its take back, and it stays once the run is done", async ({
  page,
}) => {
  await openDrafts(page)
  await page.getByRole("button", { name: "Discard Tuesday jam, 0:41", exact: true }).click()
  await expect(rows(page)).toHaveCount(2)
  await hold(page, "recover_draft")
  await mainButton(page).click()
  await expect.poll(() => callCount(page, "recover_draft")).toBe(1)

  await notices(page)
    .filter({ hasText: "“Tuesday jam” went to the Trash." })
    .getByRole("button", { name: "Undo" })
    .click()
  await expect(rows(page)).toHaveCount(3)
  // Back in the list while the run goes on, and it cannot be discarded
  // meanwhile.
  await expect(rowOf(page, EIGHT).getByRole("button", { name: /^Discard/ })).toBeDisabled()

  // The run was the two takes listed when it was pressed; the one brought
  // back stays, with Recover in the footer.
  await letGo(page, "recover_draft")
  await expect(rows(page)).toHaveCount(1)
  await expect(rowOf(page, EIGHT)).toHaveCount(1)
  await expect(page.locator("main button:disabled, footer button:disabled")).toHaveCount(0)
  expect((await calls(page, "recover_draft")).map((c) => c.args)).toEqual([[SEVEN.dir], [TWELVE.dir]])
  await expect(footerButtons(page)).toHaveText(["Decide later", "Recover"])
  await expect(rows(page).getByRole("button")).toHaveText(["Discard"])
})

test("Decide later during Recover all leaves the takes not reached for next time", async ({ page }) => {
  await openDrafts(page)
  await hold(page, "recover_draft")
  await mainButton(page).click()
  await expect.poll(() => callCount(page, "recover_draft")).toBe(1)
  await page.getByRole("button", { name: "Decide later" }).click()
  await expect(startButton(page)).toBeVisible()

  // The take in hand is recovered, and the run stops there.
  await letGo(page, "recover_draft")
  await expect.poll(() => onDisk(page)).toEqual([TWELVE.dir, EIGHT.dir])
  await page.waitForTimeout(200)
  expect(await callCount(page, "recover_draft")).toBe(1)
  await expect(startButton(page)).toBeVisible()
})

test("a recovery that ends after Decide later leaves the app where it is", async ({ page }) => {
  await openDrafts(page, [SEVEN])
  await hold(page, "recover_draft")
  await page.locator("footer").getByRole("button", { name: "Recover", exact: true }).click()
  await expect.poll(() => callCount(page, "recover_draft")).toBe(1)
  await page.getByRole("button", { name: "Decide later" }).click()
  await page.getByRole("button", { name: "Settings" }).click()
  const settings = page.getByRole("heading", { name: "Settings" })
  await expect(settings).toBeVisible()

  await letGo(page, "recover_draft")
  await expect.poll(() => onDisk(page)).toEqual([])
  await page.waitForTimeout(200)
  expect(await callCount(page, "recover_draft")).toBe(1)
  await expect(settings).toBeVisible()
})

test("an Undo after Recover closed the list opens it again, Recover in the footer", async ({ page }) => {
  await openDrafts(page, [SEVEN, EIGHT])
  await page.getByRole("button", { name: "Discard Tuesday jam, 4:12", exact: true }).click()
  await expect(rows(page)).toHaveCount(1)
  await page.locator("footer").getByRole("button", { name: "Recover", exact: true }).click()
  await expect(startButton(page)).toBeVisible()
  expect((await calls(page, "recover_draft")).map((c) => c.args)).toEqual([[EIGHT.dir]])

  await notices(page)
    .filter({ hasText: "“Tuesday jam” went to the Trash." })
    .getByRole("button", { name: "Undo" })
    .click()
  await expect(page.getByRole("heading", { name: "Unsaved takes found" })).toBeVisible()
  await expect(rows(page)).toHaveCount(1)
  await expect(rowOf(page, SEVEN)).toHaveCount(1)
  await expect(footerButtons(page)).toHaveText(["Decide later", "Recover"])
  await expect(rows(page).getByRole("button")).toHaveText(["Discard"])
})

// B5, as the start screen's Start: a press that takes a second shows a
// spinner in its icon's place, and nothing round it moves.
for (const where of ["the footer", "a row"] as const) {
  test(`Recover turns a spinner in its icon's place after a second, its words and box kept, in ${where}`, async ({
    page,
  }) => {
    const inFooter = where === "the footer"
    await openDrafts(page, inFooter ? [SEVEN] : [SEVEN, EIGHT])
    const recover = inFooter
      ? mainButton(page)
      : rowOf(page, SEVEN).getByRole("button", { name: /^Recover/ })
    const beside = inFooter
      ? page.getByRole("button", { name: "Decide later" })
      : rowOf(page, SEVEN).getByRole("button", { name: /^Discard/ })
    await expect(recover).toHaveText("Recover")
    const boxes = async () => [await recover.boundingBox(), await beside.boundingBox()]
    const before = await boxes()
    await hold(page, "recover_draft")
    const spinner = recover.getByRole("status", { name: "Loading" })
    const since = Date.now()
    const at = (ms: number) => page.waitForTimeout(Math.max(0, ms - (Date.now() - since)))
    await recover.click()
    await at(500)
    expect(await spinner.isVisible(), "a spinner at 0.5 s").toBe(false)
    await at(900)
    expect(await spinner.isVisible(), "a spinner at 0.9 s").toBe(false)
    await expect(spinner, "a spinner by 2 s").toBeVisible({ timeout: 2000 })
    // In the icon's place: one icon, the words kept, the boxes as they were.
    await expect(recover.locator("svg")).toHaveCount(1)
    await expect(recover).toHaveText("Recover")
    expect(await boxes()).toEqual(before)
    // Only the button pressed turns one.
    await expect(page.getByRole("status", { name: "Loading" })).toHaveCount(1)

    await letGo(page, "recover_draft")
    if (inFooter) await expect(startButton(page)).toBeVisible()
    else await expect(rows(page)).toHaveCount(1)
    await expect(page.getByRole("status", { name: "Loading" })).toHaveCount(0)
  })
}

test("at 960x680 and 150 % the footer keeps Decide later and Recover all whole on one row", async ({
  page,
}) => {
  await page.setViewportSize({ width: 960, height: 680 })
  await openDrafts(page, [SEVEN, TWELVE, EIGHT], scaled(1.5))
  const buttons = footerButtons(page)
  await expect(buttons).toHaveText(["Decide later", "Recover all"])
  const [later, all] = [await box(buttons.nth(0)), await box(buttons.nth(1))]
  // One vertical centre, and the main one at 56 px times the scale.
  expect(later.y + later.height / 2).toBeCloseTo(all.y + all.height / 2, 0)
  expect(all.height).toBeCloseTo(56 * 1.5, 0)
  // Their words whole, the buttons in the window, nothing scrolls sideways.
  for (const button of await buttons.all()) {
    expect(await button.evaluate((b) => b.scrollWidth <= b.clientWidth), await button.innerText()).toBe(true)
  }
  expect(all.x + all.width).toBeLessThanOrEqual(960)
  expect(
    await page.evaluate(() => {
      const footer = document.querySelector("footer")!
      return document.documentElement.scrollWidth > window.innerWidth || footer.scrollWidth > footer.clientWidth
    })
  ).toBe(false)
})
