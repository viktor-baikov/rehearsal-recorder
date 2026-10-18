import {
  calls,
  colour,
  EDGE,
  expect,
  hold,
  letGo,
  notices,
  openApp,
  scaled,
  settled,
  setFake,
  style,
  test,
  themed,
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
  await setFake(page, "__ACTIVITY__", [
    {
      id: 1,
      kind: "recover",
      title: "recover",
      folder: draft.dir,
      take_number: null,
      state: "running",
      fraction: 0.42,
      step: null,
      error: null,
      detail: null,
      retry: null,
      seen: false,
    },
  ])
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
