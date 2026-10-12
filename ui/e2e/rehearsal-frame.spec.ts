import type { Locator, Page } from "@playwright/test"
import {
  callCount,
  calls,
  expect,
  openApp,
  openBandApp,
  openEvening,
  recordTake,
  scaled,
  settled,
  startButton,
  startRehearsal,
  style,
  test,
  TONIGHT,
} from "./app.ts"

// The rehearsal screen's frame (owner, 2026-10-12, Q1): a header whose name
// wraps and whose figures give way to it, the air the start screen has, and a
// footer where nothing moves. The stress band's rehearsal has a name of 80
// letters (stress-rehearsal.js).

const LONG = "Tuesday jam at the old brewery, with the horn section and the choir from upstairs"

const header = (page: Page) => page.locator("header")
const title = (page: Page) => header(page).getByRole("heading", { level: 1 })
const facts = (page: Page) => page.getByRole("group", { name: "About this rehearsal" })
const finish = (page: Page) => page.getByRole("button", { name: "Finish", exact: true })
const record = (page: Page) => page.getByRole("button", { name: /^Record take/ })
const panel = (page: Page) => page.locator("[data-next-take-panel]")

/** The facts in the order the header says them, most needed first. */
const ORDER = ["Length", "Takes", "In the cloud", "On disk"]

/** Which of the four facts the header draws now, by label. */
const shownFacts = (page: Page) =>
  facts(page)
    .locator("dt")
    .evaluateAll((labels) =>
      labels
        .filter((dt) => getComputedStyle(dt.parentElement!).display !== "none")
        .map((dt) => dt.textContent!)
    )

/** Whole figures give way least needed first: what shows is the front of the
 *  list, never a gap in it. */
const frontOfOrder = (shown: string[]) => expect(shown).toEqual(ORDER.slice(0, shown.length))

type Box = { x: number; y: number; width: number; height: number }
const box = async (it: Locator): Promise<Box> => (await it.boundingBox())!

/** The same box, to a quarter of a pixel (layout works in 1/64 px). */
function expectSame(now: Box, was: Box, what: string) {
  for (const k of ["x", "y", "width", "height"] as const) {
    expect(Math.abs(now[k] - was[k]), `${what} ${k}: ${now[k]} against ${was[k]}`).toBeLessThan(0.25)
  }
}

test.describe("the header", () => {
  test("a long rehearsal name wraps with its pencil beside its last word", async ({ page }) => {
    await page.setViewportSize({ width: 1180, height: 820 })
    await openBandApp(page, { stress: "rehearsal" })
    await startRehearsal(page, 33)

    for (const [width, height] of [
      [1180, 820],
      [960, 680],
    ]) {
      await page.setViewportSize({ width, height })
      await settled(page)
      const h1 = title(page)
      await expect(h1).toContainText(LONG)
      const seen = await h1.evaluate((el) => {
        const own = el.getBoundingClientRect()
        // Each line of the name, by the boxes its words make.
        const words = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
        const lines = new Map<number, { top: number; bottom: number }>()
        let right = 0
        for (let n = words.nextNode(); n; n = words.nextNode()) {
          const range = document.createRange()
          range.selectNodeContents(n)
          for (const r of range.getClientRects()) {
            if (r.width === 0) continue
            lines.set(Math.round(r.top), { top: r.top, bottom: r.bottom })
            right = Math.max(right, r.right)
          }
        }
        const last = [...lines.values()].sort((a, b) => a.top - b.top).at(-1)!
        const pencil = el.querySelector("button")!.getBoundingClientRect()
        const cs = getComputedStyle(el)
        return {
          lines: lines.size,
          // Cut is clipped, or shown with an ellipsis, or drawn past the box.
          cut: cs.overflowX !== "visible" || cs.textOverflow === "ellipsis" || right > own.right,
          pencilRight: pencil.right - own.right,
          pencilMiddle: pencil.top + pencil.height / 2,
          last,
        }
      })
      // The whole name is in the h1 and nothing of it is cut.
      expect(seen.cut, `${width} px`).toBe(false)
      // The pencil is inside the h1's right edge, level with its last line.
      expect(seen.pencilRight, `${width} px`).toBeLessThanOrEqual(0.5)
      expect(seen.pencilMiddle, `${width} px`).toBeGreaterThan(seen.last.top)
      expect(seen.pencilMiddle, `${width} px`).toBeLessThan(seen.last.bottom)
      // In a window this narrow the name takes more than one line.
      if (width === 960) expect(seen.lines).toBeGreaterThan(1)
    }
  })

  test("the header's figures give way least needed first and show whole on hover", async ({
    context,
    page,
  }) => {
    // The room the name leaves is wide enough for all four, where the old
    // rule showed two under 1280 px.
    await page.setViewportSize({ width: 1180, height: 820 })
    await openBandApp(page)
    await startButton(page).click()
    await expect(facts(page)).toBeVisible()
    await settled(page)
    expect(await shownFacts(page)).toEqual(ORDER)

    // With the stress band the name takes the room: what shows is the front
    // of the list, and pointing at the group says all four, each with its
    // label, as the header writes them.
    const stress = await context.newPage()
    await stress.setViewportSize({ width: 960, height: 680 })
    await openBandApp(stress, { stress: "rehearsal" })
    await startRehearsal(stress, 33)
    await settled(stress)
    frontOfOrder(await shownFacts(stress))
    const line = facts(stress).locator(".sr-only")
    await expect(line).toHaveText(
      /^Length 1 h 54 min · Takes 32, 14 songs · In the cloud \d+ of 32 · On disk .+$/
    )
    await facts(stress).hover({ position: { x: 4, y: 4 } })
    await expect(stress.locator("[data-whole][data-state$='open']")).toHaveText(
      (await line.textContent())!
    )
  })

  test("the figures that stay are always the front of the list, at every width", async ({
    page,
  }) => {
    await openBandApp(page, { stress: "rehearsal" })
    await startRehearsal(page, 33)
    const counts = new Set<number>()
    for (const width of [960, 1100, 1280, 1500, 1700, 1900, 2200]) {
      await page.setViewportSize({ width, height: 820 })
      await settled(page)
      const shown = await shownFacts(page)
      frontOfOrder(shown)
      counts.add(shown.length)
    }
    // Some widths show none and some all, or this proves little.
    expect(counts).toContain(0)
    expect(counts).toContain(ORDER.length)
    expect(counts.size).toBeGreaterThan(2)
  })

  test("the header's fact labels have no capitals and are 12 px", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 820 })
    await openEvening(page)
    await settled(page)
    const labels = facts(page).locator("dt")
    await expect(labels).toHaveText(ORDER)
    for (const label of await labels.all()) {
      expect(await style(label, "text-transform", "font-size")).toEqual({
        "text-transform": "none",
        "font-size": "12px",
      })
    }
  })

  test("the folder button says its path in the shared tip, not a native title", async ({
    page,
  }) => {
    await openEvening(page)
    await settled(page)
    const folder = facts(page).getByRole("button", { name: "Open folder" })
    await expect(folder).not.toHaveAttribute("title")
    await folder.hover()
    // The fake puts a rehearsal in /rec, under the name it was started with.
    const name = (await calls(page, "start_rehearsal"))[0].args[0]
    await expect(page.getByRole("tooltip")).toHaveText(`/rec/${name}`)
  })
})

test.describe("the footer", () => {
  test("Finish and Record keep their boxes with a take in hand", async ({ page }) => {
    const overview = await openEvening(page)
    await settled(page)
    const was = { finish: await box(finish(page)), record: await box(record(page)) }
    const chips = page.locator("footer kbd")
    const hidden = async () =>
      chips.evaluateAll((all) => all.map((k) => getComputedStyle(k).visibility))
    expect(await hidden()).toEqual(["visible", "visible"])

    // A take playing where it is: both keys are the take's now, and the
    // buttons keep the room the chips take.
    const row = overview.locator('[data-take="1"]')
    await row.getByRole("button", { name: /^Play / }).click()
    await expect(row.getByRole("button", { name: /^Pause / })).toBeVisible()
    await settled(page)
    expect(await hidden()).toEqual(["hidden", "hidden"])
    expectSame(await box(finish(page)), was.finish, "Finish while it plays")
    expectSame(await box(record(page)), was.record, "Record while it plays")

    // Opened in the player, it plays on: nothing toggles it again.
    const toggles = await callCount(page, "player_toggle")
    await row.getByRole("button", { name: /^Take 1 / }).click()
    await expect(page.getByRole("group", { name: "Take timeline" })).toBeVisible()
    await settled(page)
    expect(await callCount(page, "player_toggle")).toBe(toggles)
    expect(await hidden()).toEqual(["hidden", "hidden"])
    expectSame(await box(finish(page)), was.finish, "Finish with the take open")
    expectSame(await box(record(page)), was.record, "Record with the take open")

    // Space is the take's: it plays or pauses, and records nothing.
    await page.keyboard.press("Space")
    await expect.poll(() => callCount(page, "player_toggle")).toBe(toggles + 1)
    expect(await callCount(page, "start_take")).toBe(0)

    // Escape puts the take away, the keys come back, and nothing has moved.
    await page.keyboard.press("Escape")
    await expect(page.getByRole("group", { name: "Take timeline" })).toHaveCount(0)
    await settled(page)
    expect(await hidden()).toEqual(["visible", "visible"])
    expectSame(await box(finish(page)), was.finish, "Finish after Escape")
    expectSame(await box(record(page)), was.record, "Record after Escape")
  })

  test("Record keeps its width from take 9 to take 10", async ({ page }) => {
    await openEvening(page, "", TONIGHT.slice(0, 8))
    await settled(page)
    const was = { finish: await box(finish(page)), record: await box(record(page)) }
    await expect(record(page)).toHaveAccessibleName("Record take 9")

    await recordTake(page, 9)
    await page.getByRole("button", { name: /Save take/ }).click()
    await expect(record(page)).toHaveAccessibleName("Record take 10")
    await settled(page)
    expectSame(await box(record(page)), was.record, "Record at take 10")
    expectSame(await box(finish(page)), was.finish, "Finish at take 10")
  })

  test("an error in the footer moves nothing", async ({ page }) => {
    await openApp(page, {
      after: `window.pywebview.api.start_take = async () => ({ok: false, error: 'The interface is gone'});`,
    })
    await startRehearsal(page)
    await settled(page)
    const footer = page.locator("footer")
    const was = {
      footer: await box(footer),
      finish: await box(finish(page)),
      record: await box(record(page)),
    }

    await record(page).click()
    const error = page.getByRole("alert").filter({ hasText: "The interface is gone" })
    await expect(error).toBeVisible()
    expectSame(await box(footer), was.footer, "the footer")
    expectSame(await box(finish(page)), was.finish, "Finish")
    expectSame(await box(record(page)), was.record, "Record")

    // It is over the buttons it is about, at their right edge, in the room
    // the footer's own padding has.
    const at = await box(error)
    expect(at.y + at.height).toBeLessThanOrEqual(was.record.y)
    expect(at.y).toBeGreaterThanOrEqual(was.footer.y)
    expect(at.x + at.width).toBeCloseTo(was.record.x + was.record.width, 0)
  })

  test("a long error in the footer is cut and shows whole on hover", async ({ page }) => {
    const long =
      "The interface is gone, and with it every input the rehearsal was recording from, " +
      "so nothing more can be recorded here until it is plugged back in and the app is opened again"
    await openApp(page, {
      after: `window.pywebview.api.start_take = async () => ({ok: false, error: ${JSON.stringify(long)}});`,
    })
    await startRehearsal(page)
    await settled(page)
    await record(page).click()
    const error = page.getByRole("alert").filter({ hasText: "The interface is gone" })
    await expect(error).toBeVisible()
    expect(await error.evaluate((p) => p.scrollWidth > p.clientWidth)).toBe(true)
    await error.hover()
    await expect(page.locator("[data-whole][data-state$='open']")).toHaveText(long)
  })
})

test.describe("the screen", () => {
  test("the rehearsal screen has the start screen's air", async ({ page }) => {
    await openApp(page)
    await startRehearsal(page)
    await settled(page)
    const px = (n: number) => `${n}px`
    expect(await style(page.locator("main"), "padding-left", "padding-top")).toEqual({
      "padding-left": px(32),
      "padding-top": px(32),
    })
    expect(await style(header(page), "padding-left", "padding-right")).toEqual({
      "padding-left": px(32),
      "padding-right": px(32),
    })
    expect(
      await style(
        page.locator("footer"),
        "padding-left",
        "padding-right",
        "padding-top",
        "padding-bottom"
      )
    ).toEqual({
      "padding-left": px(32),
      "padding-right": px(32),
      "padding-top": px(24),
      "padding-bottom": px(24),
    })
    expect(
      await style(panel(page), "padding-left", "padding-right", "padding-top", "padding-bottom")
    ).toEqual({
      "padding-left": px(32),
      "padding-right": px(32),
      "padding-top": px(32),
      "padding-bottom": px(32),
    })
  })

  test("the Next take panel rises 40 ms after the takes", async ({ page }) => {
    await openApp(page)
    await startRehearsal(page)
    // The panel's inner box, the one that rises: the second in the line (the
    // songs group, which is the first, is the overview's).
    const rises = panel(page).locator("> div")
    await expect(rises).toHaveCount(1)
    const it = await style(rises, "--i", "animation-delay", "animation-name")
    expect(it["--i"].trim()).toBe("1")
    expect(it["animation-delay"]).toBe("0.04s")
    expect(it["animation-name"]).toBe("rise")
  })

  test("at 150 percent in a 960 by 680 window nothing scrolls sideways", async ({ page }) => {
    await page.setViewportSize({ width: 960, height: 680 })
    await page.addInitScript(scaled(1.5))
    await openBandApp(page, { stress: "rehearsal" })
    await startRehearsal(page, 33)
    await settled(page)
    for (const [name, it] of [
      ["main", page.locator("main")],
      ["the Next take panel", panel(page)],
    ] as const) {
      const [scroll, client] = await it.evaluate((el) => [el.scrollWidth, el.clientWidth])
      expect(scroll, name).toBeLessThanOrEqual(client)
    }
    // Neither button is cut off at the window's edge.
    for (const button of [finish(page), record(page)]) {
      const at = await box(button)
      expect(at.x).toBeGreaterThanOrEqual(0)
      expect(at.x + at.width).toBeLessThanOrEqual(960)
    }
  })

  // What follows a bar goes under it only where there is no room for it beside
  // the bar at its smallest (the test above): before that the longest take's
  // bar is the first to give way. In a window of 880 the column has 12.75rem,
  // too little for the badge of a false start, which goes under its bar, and
  // enough for the length of every other take.
  test("a take's length stays beside its bar, whose width gives way first, at 100 percent in an 880 by 680 window", async ({ page }) => {
    await page.setViewportSize({ width: 880, height: 680 })
    await openBandApp(page, { stress: "rehearsal" })
    await startRehearsal(page, 33)
    await settled(page)
    const rows = page.locator("[data-take]:not([data-false-start])")
    const under = await rows.evaluateAll((all) =>
      all
        .filter((row) => {
          const middle = (el: Element) => el.getBoundingClientRect().top + el.getBoundingClientRect().height / 2
          const bar = row.querySelector("[data-bar-title]")!
          const length = row.querySelector("span.tnum.grid")!
          return Math.abs(middle(length) - middle(bar)) >= 4
        })
        .map((row) => (row as HTMLElement).dataset.take)
    )
    expect(under, "takes whose length is not beside their bar").toEqual([])
    expect(await rows.count()).toBeGreaterThan(20)
  })
})
