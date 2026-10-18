import {
  callCount,
  calls,
  colour,
  EDGE,
  expect,
  hold,
  keyOn,
  letGo,
  nameTake,
  notices,
  openApp,
  openBandApp,
  openHistory,
  recordTake,
  settled,
  startButton,
  startRehearsal,
  style,
  test,
} from "./app.ts"
import type { Locator, Page } from "@playwright/test"

test("finishing a rehearsal with takes in it asks, and is answered from the keyboard", async ({
  page,
}) => {
  // On the rehearsal screen the ladder is the open take, then the rehearsal
  // itself — and with takes in it, that rung is a decision and asks.
  await openApp(page)
  await startRehearsal(page)
  await recordTake(page, 1)
  await nameTake(page, "Pałyn")
  await page.getByRole("button", { name: /Save take/ }).click()
  await page.locator("[aria-label='Rehearsal overview'] button[aria-label^='Take 1 Pałyn']").click()
  const timeline = page.getByRole("group", { name: "Take timeline" })
  await expect(timeline).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(timeline).toHaveCount(0)

  const finishes = await callCount(page, "finish_rehearsal")
  const question = page.getByText("Finish this rehearsal?")
  await page.keyboard.press("Escape")
  await expect(question).toBeVisible()
  // And still there a moment later: a dialog opened by a keydown still on
  // its way through the page can be dismissed by that same keydown, which
  // looks like a flicker. Waiting for it to appear cannot see that.
  await page.waitForTimeout(300)
  await expect(question).toHaveCount(1)
  expect(await callCount(page, "finish_rehearsal")).toBe(finishes)

  // Answered without the mouse. It opens on the answer that changes
  // nothing, and getting to the other one is the app's doing, not the
  // browser's: the window the app runs in on a Mac moves focus on Tab only
  // with macOS keyboard navigation on, so the arrows carry the weight.
  const focused = () => page.evaluate(() => (document.activeElement as HTMLElement | null)?.innerText.trim() ?? "")
  expect(await focused()).toBe("Cancel")
  await page.keyboard.press("ArrowRight")
  await expect.poll(focused).toBe("Finish")
  await page.keyboard.press("ArrowLeft")
  await expect.poll(focused).toBe("Cancel")
  // Tab is taken over too, watched from the capture phase on window, where
  // the app takes the key and stops it.
  await page.evaluate(() => {
    const w = window as unknown as { __TAB_TAKEN__: boolean | null }
    w.__TAB_TAKEN__ = null
    window.addEventListener(
      "keydown",
      (e) => {
        if (e.key === "Tab") w.__TAB_TAKEN__ = e.defaultPrevented
      },
      true
    )
  })
  await page.keyboard.press("Tab")
  await expect.poll(focused).toBe("Finish")
  expect(await page.evaluate(() => (window as unknown as { __TAB_TAKEN__: boolean }).__TAB_TAKEN__)).toBe(true)

  await page.keyboard.press("Escape")
  await expect(question).toHaveCount(0)
  expect(await callCount(page, "finish_rehearsal")).toBe(finishes)
})

/** The stress band's Tuesday jam, too long for two lines of its row. */
const LONG_TUESDAY = "Tuesday jam at the old brewery, with the horn section and the choir from upstairs"

test.describe("History", () => {
  test("opens on the newest rehearsal beside the list, and Escape goes back a layer at a time", async ({
    page,
  }) => {
    await openApp(page)
    const list = await openHistory(page)
    // Chosen already, and on screen next to the list: no row to open first.
    await expect(page.getByRole("heading", { name: "Tuesday jam" })).toBeVisible()
    await expect(list.locator("[aria-current='true']")).toContainText("Tuesday jam")
    await page.getByRole("button", { name: "Take 1 Pałyn 1", exact: true }).click()
    await expect(page.getByRole("button", { name: "Mute Guitar" })).toBeVisible()
    // A ten-minute take gets a clock in minutes.
    await expect(page.getByRole("group", { name: "Timeline clock" })).toContainText("2:00")
    // The player has the whole window.
    await expect(list).toHaveCount(0)
    await page.keyboard.press("Escape")
    await expect(page.getByRole("group", { name: "Take timeline" })).toHaveCount(0)
    await expect(list).toBeVisible()
    await expect(page.getByRole("button", { name: "Take 1 Pałyn 1", exact: true })).toHaveCount(1)
    // The list is history itself, so the next rung is the setup screen.
    await page.keyboard.press("Escape")
    await expect(startButton(page)).toBeVisible()
    await expect(list).toHaveCount(0)
  })

  test("lists each rehearsal by month, with when, how long and its evening drawn", async ({
    page,
  }) => {
    // Months later a rehearsal is recognised by what was played in it and
    // how the evening went. The strip says it without a single mark.
    await openApp(page)
    const list = await openHistory(page)
    await expect(list.getByRole("group", { name: "September 2026" })).toHaveCount(1)
    await expect(list.getByRole("group", { name: "August 2026" })).toHaveCount(1)
    const jam = list.getByRole("button", { name: /^Tuesday jam/ })
    await expect(jam).toContainText("Thu 10 Sep, 19:00")
    await expect(jam).toContainText("42 min")
    await expect(jam).toContainText("9 takes")
    // One run per song, one bar per go, and the starred go in green.
    const strip = jam.locator("[data-strip]")
    await expect(strip.locator(":scope > div")).toHaveCount(6)
    await expect(strip.locator("span")).toHaveCount(9)
    await expect(strip.locator("[data-starred]")).toHaveCount(1)
    // Takes nobody named are one run, still drawn.
    const quiet = list.getByRole("button", { name: /^Wednesday jam/ })
    await expect(quiet.locator("[data-strip] > div")).toHaveCount(1)
    await expect(quiet.locator("[data-strip] span")).toHaveCount(2)
    // All of it, in the header.
    await expect(page.locator("header")).toContainText("4 rehearsals · 1 h 20 min played · 1.7 GB")
  })

  test("↑ and ↓ go through the rehearsals, and what was playing stops", async ({ page }) => {
    await openApp(page, { before: "window.__FULL_EVENING__ = true;" })
    const list = await openHistory(page)
    const overview = page.locator("[aria-label='Rehearsal overview']")
    await overview.getByRole("button", { name: "Play Viasna" }).click()
    await expect(page.getByRole("button", { name: "Pause Viasna" })).toBeVisible()
    const closes = await callCount(page, "player_close")

    await page.keyboard.press("ArrowDown")
    await expect(page.getByRole("heading", { name: "Wednesday jam" })).toBeVisible()
    await expect(list.locator("[aria-current='true']")).toContainText("Wednesday jam")
    await expect(overview).toContainText("Not named")
    // Viasna belonged to the rehearsal that was left.
    await expect(page.getByRole("button", { name: /Pause/ })).toHaveCount(0)
    expect(await callCount(page, "player_close")).toBeGreaterThan(closes)

    await page.keyboard.press("ArrowUp")
    await expect(page.getByRole("heading", { name: "Tuesday jam" })).toBeVisible()
    await expect(overview).toContainText("guitar drifts here")

    // And by the mouse.
    await list.getByRole("button", { name: /^First rehearsal/ }).click()
    await expect(page.getByRole("heading", { name: "First rehearsal" })).toBeVisible()
    await expect(overview).toContainText("Daroha")
    await expect(overview).toContainText("2 takes")
  })

  test("deleting a rehearsal asks nothing, says it went, and Undo brings it back", async ({
    page,
  }) => {
    await openApp(page)
    const list = await openHistory(page)
    await page.getByRole("button", { name: "Delete rehearsal Tuesday jam" }).click()
    await expect(page.getByRole("dialog")).toHaveCount(0)
    expect((await calls(page, "delete_rehearsal")).map((c) => c.args)).toEqual([["/rec/old"]])
    await expect(list.getByRole("button", { name: /^Tuesday jam/ })).toHaveCount(0)
    const notice = notices(page).filter({ hasText: "“Tuesday jam” went to the Trash." })
    await notice.getByRole("button", { name: "Undo" }).click()
    await expect(list.getByRole("button", { name: /^Tuesday jam/ })).toHaveCount(1)
    expect((await calls(page, "undo_trash")).length).toBe(1)
  })

  test("a take playing in one rehearsal is not taken for the same take number in another", async ({
    page,
  }) => {
    await openApp(page, { before: "window.__FULL_EVENING__ = true;" })
    const list = await openHistory(page, "Tuesday jam")
    const overview = page.locator("[aria-label='Rehearsal overview']")
    await overview.getByRole("button", { name: "Play Pałyn 1" }).click()
    await expect(overview.getByRole("button", { name: "Pause Pałyn 1" })).toBeVisible()
    const toggles = await callCount(page, "player_toggle")

    // Daroha 1 is First rehearsal's take 1, as Pałyn 1 is Tuesday jam's.
    await list.getByRole("button", { name: /^First rehearsal/ }).click()
    await overview.getByRole("button", { name: "Play Daroha 1" }).click()
    await expect(overview.getByRole("button", { name: "Pause Daroha 1" })).toBeVisible()
    expect((await calls(page, "player_open")).at(-1)?.args[0]).toEqual([
      { name: "Guitar", file: "/rec/older/d1.wav" },
    ])
    expect(await callCount(page, "player_toggle")).toBe(toggles)
  })

  test("the switch is three radios, and arrow keys on it leave the list alone", async ({ page }) => {
    await openApp(page)
    const list = await openHistory(page)
    const views = page.getByRole("radiogroup", { name: "History view" })
    await expect(views.getByRole("radio")).toHaveText(["Rehearsals", "Songs", "Marks"])
    const rehearsals = views.getByRole("radio", { name: "Rehearsals", exact: true })
    const songs = views.getByRole("radio", { name: "Songs", exact: true })
    await expect(rehearsals).toHaveAttribute("aria-checked", "true")

    // Along the switch the arrows move the focus and choose nothing.
    await rehearsals.focus()
    await page.keyboard.press("ArrowRight")
    await expect(songs).toBeFocused()
    await expect(songs).toHaveAttribute("aria-checked", "false")
    await expect(rehearsals).toHaveAttribute("aria-checked", "true")
    await expect(list).toBeVisible()

    // Down is the list's, wherever the focus is: the next rehearsal, in the
    // view that was on.
    await page.keyboard.press("ArrowDown")
    await expect(page.getByRole("heading", { name: "Wednesday jam" })).toBeVisible()
    await expect(list.locator("[aria-current='true']")).toContainText("Wednesday jam")
    await expect(rehearsals).toHaveAttribute("aria-checked", "true")
    await expect(songs).toBeFocused()
    expect(await calls(page, "save_history_view")).toEqual([])
  })

  test("a chosen row is grey with no frame", async ({ page }) => {
    await openApp(page)
    await openHistory(page)
    const selected = await colour(page, "--selected")
    const chosen = page.locator("nav [aria-current='true']")
    const check = async (view: string) => {
      await expect(chosen, view).toHaveCount(1)
      await page.mouse.move(0, 0)
      await expect
        .poll(async () => (await style(chosen, "background-color"))["background-color"], view)
        .toBe(selected)
      const edge = await style(chosen, ...EDGE)
      for (const side of ["top", "right", "bottom", "left"]) {
        const clear =
          edge[`border-${side}-width`] === "0px" || edge[`border-${side}-color`] === "rgba(0, 0, 0, 0)"
        expect(clear, `${view}, ${side} edge`).toBe(true)
      }
    }
    await check("Rehearsals")
    for (const view of ["Songs", "Marks"]) {
      await page.getByRole("radio", { name: view, exact: true }).click()
      await check(view)
    }
  })

  test("a long name takes two lines in its row, then is cut, whole in its tip, and the minutes give way", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 960, height: 680 })
    await openBandApp(page, { stress: true })
    const list = await openHistory(page)
    await settled(page)
    const row = list.locator("[data-rehearsal='/rec/tue']")

    // The minutes give their room to the name first.
    const figures = row.locator("[data-figures]")
    await expect(figures).toHaveAttribute("data-dropped")
    await expect(figures.locator("[data-shown]")).toHaveText("")
    const minutes = (await figures.locator(".sr-only").textContent()) ?? ""
    expect(minutes).toMatch(/ min$/)

    // Then the name takes two lines, and is cut.
    const name = row.locator("[data-name]")
    await expect(name).toHaveText(LONG_TUESDAY)
    expect(
      await name.evaluate((el) => ({
        lines: Math.round(el.clientHeight / parseFloat(getComputedStyle(el).lineHeight)),
        cut: el.scrollHeight > el.clientHeight + 1,
      }))
    ).toEqual({ lines: 2, cut: true })

    // Whole in the row's tip, with the minutes under it: on hover, and on
    // focus from the keys, which reach the row and not its figures.
    const tip = page.locator("[data-whole][data-state$='open']")
    await row.hover()
    await expect(tip).toContainText(LONG_TUESDAY)
    await expect(tip).toContainText(minutes)
    await page.mouse.move(0, 0, { steps: 8 })
    await expect(tip).toHaveCount(0)
    await page.getByRole("radio", { name: "Rehearsals", exact: true }).focus()
    await page.keyboard.press("Tab")
    await expect(row).toBeFocused()
    await expect(tip).toContainText(LONG_TUESDAY)
    await expect(tip).toContainText(minutes)

    // A short name keeps its minutes beside it.
    const short = list.locator("[data-rehearsal='/rec/sat']")
    await expect(short.locator("[data-figures]")).not.toHaveAttribute("data-dropped")
    await expect(short.locator("[data-figures] [data-shown]")).toHaveText(/ min$/)
    expect(await list.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
  })
})

// History, and an open rehearsal with no take picked: the evening at a
// glance, and each go at a song as a row.

async function openEvening(page: Page) {
  await openApp(page, { before: "window.__FULL_EVENING__ = true;" })
  await openHistory(page)
  const overview = page.locator("[aria-label='Rehearsal overview']")
  await expect(overview).toBeVisible()
  return overview
}

const current = (page: Page) => page.locator("[data-tab][aria-current='true']")

const facts = (page: Page) => page.getByRole("group", { name: "About this rehearsal" })
const fact = (page: Page, label: string) =>
  facts(page).locator("div", { has: page.locator("dt", { hasText: label }) }).locator("dd")
/** The rehearsal pane's head, its first part: the name, the facts and
 *  Delete in a row, and the meta line under them. */
const paneHead = (page: Page) =>
  page.locator("section").filter({ has: facts(page) }).locator(":scope > div").first()

test("an open rehearsal with no take picked shows the evening", async ({ page }) => {
  // It used to be one lonely "Pick a take" under the strip. What was played,
  // how many goes each song got and every note left while listening are all
  // known already, and are what you came back for.
  const overview = await openEvening(page)
  const said = await overview.innerText()
  for (const part of [
    "Pałyn",
    "2 takes",
    "Viasna",
    "1 Keep this",
    "1 Went wrong",
    "1 Note",
    "Not named",
    "this one is the take",
    "guitar drifts here",
  ]) {
    expect(said).toContain(part)
  }
  // Every mark has its line, a plain one with nothing written included: by
  // its label's name.
  await expect(overview.locator("[data-note]")).toHaveCount(3)
  await expect(page.getByText("Pick a take")).toHaveCount(0)
  // Only the take already in the cloud folder says so on its row.
  await expect(page.locator("[data-take='2'] [data-in-cloud]")).toHaveCount(1)
  await expect(overview.locator("[data-in-cloud]")).toHaveCount(1)
  // Every go on one scale: the four-minute Viasna is the longest bar.
  const widths = await page.evaluate(() =>
    Object.fromEntries(
      [...document.querySelectorAll<HTMLElement>("[data-take]")].map((r) => [
        r.dataset.take,
        r.querySelector('button[aria-label^="Take "]')!.getBoundingClientRect().width,
      ])
    )
  )
  expect(widths["4"]).toBeGreaterThan(widths["1"])
  expect(widths["1"]).toBeGreaterThan(widths["3"])
  // And no strip of pills repeating it.
  await expect(page.getByRole("group", { name: "Take strip" })).toHaveCount(0)
  // The evening's figures are the pane head's, not the overview's.
  expect(said).not.toMatch(/\bplayed\b/)
  await expect(fact(page, "Length")).toHaveText("12 min")
  await expect(fact(page, "Takes")).toHaveText("4, 2 songs")
  await expect(fact(page, "In the cloud")).toHaveText("1 of 4")
})

// The facts in the pane's head, beside the rehearsal's name: the name has its
// room first and they give way to it fact by fact, as in the rehearsal
// screen's header. The stress band has a rehearsal whose name is 60 letters
// and one of 80, which wrap, and a short one.
const FACTS = ["Length", "Takes", "In the cloud", "On disk"]

for (const [pick, wraps] of [["New songs", false], ["Soundcheck at", true], ["Tuesday jam at", true]] as const) {
  test(`the pane head of ${pick} keeps the name's room and the facts give way at 960 px`, async ({ page }) => {
    await page.setViewportSize({ width: 960, height: 680 })
    await openBandApp(page, { stress: true })
    await openHistory(page, pick)
    await settled(page)
    const group = facts(page)
    await expect(group).toBeVisible()
    const pane = page.locator("section").filter({ has: group })
    const name = pane.getByRole("heading", { level: 2 })

    // Whole facts, the front of the list, never a gap in it.
    const shown = await group
      .locator("dt")
      .evaluateAll((labels) =>
        labels
          .filter((dt) => getComputedStyle(dt.parentElement!).display !== "none")
          .map((dt) => dt.textContent!)
      )
    expect(shown).toEqual(FACTS.slice(0, shown.length))
    if (!wraps) expect(shown.length).toBeGreaterThanOrEqual(2)

    const at = async (it: Locator) => (await it.boundingBox())!
    const [title, row, bin] = [
      await at(name),
      await at(group),
      await at(pane.getByRole("button", { name: /^Delete rehearsal / })),
    ]
    // Side by side, the name first, then the facts and their button, then Delete.
    expect(title.x + title.width).toBeLessThanOrEqual(row.x + 0.5)
    expect(row.x + row.width).toBeLessThanOrEqual(bin.x + 0.5)
    expect(bin.x + bin.width).toBeLessThanOrEqual((await at(pane)).x + (await at(pane)).width)
    expect(await pane.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
    // The name is never cut: one that is longer than the room it has first
    // wraps onto a second line, and has most of the room.
    expect(await name.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
    expect(title.height > 40).toBe(wraps)
    if (wraps) expect(title.width).toBeGreaterThanOrEqual(300)
  })
}

// A name longer than its row wraps and is never cut (B6): onto more lines, or
// through a single word wider than the row. The pencil stays beside the name,
// and the facts and Delete stay at the top of the head.
const LONG_NAMES = [
  ["many words", "Tuesday jam at the old brewery, with the horn section, the choir from upstairs and the kids"],
  ["one word", "Mississippi".repeat(5) + "abcde"],
] as const

for (const [what, long] of LONG_NAMES) {
  test(`a rehearsal's long name of ${what} wraps in the pane head at 960 px, its pencil beside it`, async ({ page }) => {
    await page.setViewportSize({ width: 960, height: 680 })
    await openApp(page)
    await openHistory(page)
    await page.getByRole("button", { name: "Rename rehearsal Tuesday jam" }).click()
    const dialog = page.getByRole("dialog", { name: "Rename rehearsal" })
    await dialog.locator("input").fill(long)
    await dialog.getByRole("button", { name: "Rename" }).click()
    await expect(page.getByRole("button", { name: `Delete rehearsal ${long}` })).toBeVisible()
    await settled(page)

    const group = facts(page)
    await expect(group).toBeVisible()
    const head = paneHead(page)
    const name = head.getByRole("heading", { level: 2 })
    await expect(name).toHaveText(long)
    const pencil = head.getByRole("button", { name: /^Rename rehearsal / })
    const bin = head.getByRole("button", { name: /^Delete rehearsal / })
    const at = async (it: Locator) => (await it.boundingBox())!
    const [room, title, edit, row, trash, meta] = [
      await at(head),
      await at(name),
      await at(pencil),
      await at(group),
      await at(bin),
      await at(head.locator("[data-rehearsal-head]")),
    ]

    // Not cut: it wraps, onto a second line at least, through a word if need be.
    expect(await name.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
    expect(await style(name, "overflow-wrap")).toEqual({ "overflow-wrap": "anywhere" })
    expect(title.height).toBeGreaterThan(40)
    // The name, the pencil, the facts and Delete are inside the head, the
    // name before the facts, and nothing scrolls sideways.
    for (const [part, it] of [["the name", title], ["the pencil", edit], ["the facts", row], ["Delete", trash]] as const) {
      expect(it.x, `${part} inside the head, left`).toBeGreaterThanOrEqual(room.x - 0.5)
      expect(it.x + it.width, `${part} inside the head, right`).toBeLessThanOrEqual(room.x + room.width + 0.5)
      expect(it.y, `${part} inside the head, top`).toBeGreaterThanOrEqual(room.y - 0.5)
      expect(it.y + it.height, `${part} inside the head, bottom`).toBeLessThanOrEqual(room.y + room.height + 0.5)
    }
    expect(title.x + title.width, "the name before the facts").toBeLessThanOrEqual(row.x + 0.5)
    expect(await head.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
    // The pencil is beside the name, not alone on a line of its own under it.
    expect(edit.y, "the pencil beside the name's first line").toBeLessThan(title.y + 32)
    expect(edit.x, "the pencil after the name").toBeGreaterThanOrEqual(title.x + title.width - 0.5)
    // The facts and Delete stay at the top while the name runs on, and the
    // meta line is under its last line.
    expect(Math.abs(trash.y - room.y), "Delete at the top").toBeLessThan(2)
    expect(Math.abs(row.y - room.y), "the facts at the top").toBeLessThan(2)
    expect(meta.y, "the meta line under the name").toBeGreaterThanOrEqual(title.y + title.height - 0.5)
  })
}

// A folder is a path of 60 letters or so, not the fake's eight. It takes none
// of the name's room nor the facts': the name has what it needs and the facts
// what it leaves (B6), however long the path. The meta line is under them,
// across the whole head, and the path has what the date and the set leave,
// cut at the head's edge.
const LONG_FOLDER = String.raw`C:\Users\alex\RehearsalRecordings\Tuesday jam - 2026-09-10 19-00`
const inALongFolder = (name: string | null = null) => `
  const api = window.pywebview.api; const real = '/rec/old'; const long = ${JSON.stringify(LONG_FOLDER)};
  const list = api.list_rehearsals; const get = api.get_rehearsal; const named = ${JSON.stringify(name)};
  const said = (r) => r.folder === real ? { ...r, folder: long, ...(named ? { name: named } : {}) } : r;
  api.list_rehearsals = async () => (await list()).map(said);
  api.get_rehearsal = async (f) => said(await get(f === long ? real : f));
`

/** The facts that show, in the order they stand. */
const shownFacts = (group: Locator) =>
  group
    .locator("dt")
    .evaluateAll((labels) =>
      labels
        .filter((dt) => getComputedStyle(dt.parentElement!).display !== "none")
        .map((dt) => dt.textContent!)
    )

for (const [width, every] of [[1180, true], [960, false]] as const) {
  test(`a short name keeps its facts beside a folder of a real length at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 760 })
    await openApp(page, { after: inALongFolder() })
    await openHistory(page)
    await settled(page)
    const group = facts(page)
    await expect(group).toBeVisible()
    const head = paneHead(page)
    const meta = head.locator("[data-rehearsal-head]")

    // All four at 1180 and Length at least at 960, as whole facts.
    const shown = await shownFacts(group)
    expect(shown).toEqual(FACTS.slice(0, shown.length))
    expect(shown.length).toBeGreaterThanOrEqual(every ? 4 : 1)

    // The date is whole, and the meta line is under the facts, not beside
    // them, so the path takes none of their room; it is inside the head.
    const date = meta.locator("span").first()
    expect(await date.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
    const at = async (it: Locator) => (await it.boundingBox())!
    const [room, line, row, path] = [
      await at(head),
      await at(meta),
      await at(group),
      await at(meta.locator("span.font-mono")),
    ]
    expect(line.y, "the meta line under the facts").toBeGreaterThanOrEqual(row.y + row.height - 0.5)
    expect(path.x + path.width, "the path inside the head").toBeLessThanOrEqual(room.x + room.width + 0.5)
    expect(await meta.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
    const pane = page.locator("section").filter({ has: group })
    expect(await pane.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
  })
}

test("the folder of a real length is cut inside the head under a longer name at 960 px, the set not squeezed", async ({ page }) => {
  await page.setViewportSize({ width: 960, height: 760 })
  await openApp(page, { before: PLAYED_BY_SET, after: inALongFolder("Tuesday jam at the old brewery") })
  await openHistory(page)
  await settled(page)
  const group = facts(page)
  await expect(group).toBeVisible()
  const head = paneHead(page)
  const meta = head.locator("[data-rehearsal-head]")
  const path = meta.locator("span.font-mono")
  await expect(path).toHaveText(LONG_FOLDER)
  await expect(path).toBeVisible()

  // Cut, and inside the head, under the facts.
  expect(await path.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true)
  const at = async (it: Locator) => (await it.boundingBox())!
  const [room, line, cut, row] = [await at(head), await at(meta), await at(path), await at(group)]
  expect(cut.x, "the path inside the head, left").toBeGreaterThanOrEqual(room.x - 0.5)
  expect(cut.x + cut.width, "the path inside the head, right").toBeLessThanOrEqual(room.x + room.width + 0.5)
  expect(line.y, "the meta line under the facts").toBeGreaterThanOrEqual(row.y + row.height - 0.5)
  expect(await meta.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
  const pane = page.locator("section").filter({ has: group })
  expect(await pane.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
  // The set shares the line with the path and keeps the room it asks for, up
  // to half of it: it is not squeezed to a letter by a path 60 letters long.
  const set = meta.locator("[data-set-name]")
  await expect(set).toBeVisible()
  expect(await set.locator("span.truncate").evaluate((el) => el.clientWidth)).toBeGreaterThanOrEqual(60)
})

// The meta line (the date, the set, the folder) is the whole head's width,
// under the name, its facts and Delete: a short name does not make it as
// narrow as the name, which left the date alone on it, and the set and the
// folder not drawn at all. The date is whole, the set's name too, and the
// path has the rest: whole at 1180 px, where the head is 876 px wide and the
// path 462, and cut at the head's edge at 960 px.
for (const [width, cutHere] of [[1180, false], [960, true]] as const) {
  test(`under a short name the date, the set and the folder take the whole head's width at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 760 })
    await openApp(page, { before: PLAYED_BY_SET, after: inALongFolder() })
    await openHistory(page)
    await settled(page)
    const group = facts(page)
    await expect(group).toBeVisible()
    const pane = page.locator("section").filter({ has: group })
    const name = pane.getByRole("heading", { level: 2 })
    await expect(name).toHaveText("Tuesday jam")
    const head = paneHead(page)
    const meta = head.locator("[data-rehearsal-head]")
    const date = meta.locator("span").first()
    const set = meta.locator("[data-set-name]")
    const path = meta.locator("span.font-mono")

    // The date, the set's name and the start of the path, all drawn.
    await expect(date).toBeVisible()
    expect(await date.evaluate((el) => el.scrollWidth <= el.clientWidth), "the date whole").toBe(true)
    await expect(set).toHaveText("Gig on the 25th")
    await expect(set).toBeVisible()
    expect(await set.locator("span.truncate").evaluate((el) => el.scrollWidth <= el.clientWidth), "the set whole").toBe(true)
    await expect(path).toHaveText(LONG_FOLDER)
    await expect(path).toBeVisible()
    expect(await path.evaluate((el) => el.clientWidth), "the start of the path").toBeGreaterThanOrEqual(100)
    // Cut at the head's edge where it does not fit, and nothing scrolls sideways.
    expect(await path.evaluate((el) => el.scrollWidth > el.clientWidth), "the path cut").toBe(cutHere)
    for (const it of [meta, head, pane]) {
      expect(await it.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
    }

    // The meta line spans the head, under the name, the facts and Delete.
    const at = async (it: Locator) => (await it.boundingBox())!
    const [room, line, cut, title, row, bin] = [
      await at(head),
      await at(meta),
      await at(path),
      await at(name),
      await at(group),
      await at(pane.getByRole("button", { name: /^Delete rehearsal / })),
    ]
    expect(Math.abs(line.x - room.x), "the meta line from the head's left edge").toBeLessThanOrEqual(0.5)
    expect(room.x + room.width - (line.x + line.width), "the meta line to the head's right edge").toBeLessThanOrEqual(4)
    expect(cut.x + cut.width, "the path inside the head").toBeLessThanOrEqual(room.x + room.width + 0.5)
    for (const [part, it] of [["the name", title], ["the facts", row], ["Delete", bin]] as const) {
      expect(line.y, `the meta line under ${part}`).toBeGreaterThanOrEqual(it.y + it.height - 0.5)
    }
  })
}

// The facts' place is there from the first frame, so that the name is laid
// out once: it used to be one line until the takes were read and two after,
// and the same at every switch from one rehearsal to another. Held between
// the click and the takes, the head is where it will be. A name of 50 letters
// wraps at 960 px, and the facts give way to it whole; a short one leaves them
// room.
const WHILE_READING = [
  ["a name of 50 letters", "Tuesday jam at the old brewery with the horn group", false],
  ["a short name", "Tuesday jam", true],
] as const

for (const [what, name, room] of WHILE_READING) {
  test(`the pane head does not move when the takes are read, with ${what} at 960 px`, async ({ page }) => {
    await page.setViewportSize({ width: 960, height: 680 })
    await openApp(page)
    const list = await openHistory(page)
    if (name !== "Tuesday jam") {
      await page.getByRole("button", { name: "Rename rehearsal Tuesday jam" }).click()
      const dialog = page.getByRole("dialog", { name: "Rename rehearsal" })
      await dialog.locator("input").fill(name)
      await dialog.getByRole("button", { name: "Rename" }).click()
    }
    await expect(page.getByRole("button", { name: `Delete rehearsal ${name}` })).toBeVisible()
    // Away to another rehearsal and back, the takes held on the way.
    await list.getByRole("button", { name: /^Wednesday jam/ }).click()
    await expect(page.getByRole("button", { name: "Delete rehearsal Wednesday jam" })).toBeVisible()
    await expect(fact(page, "Length")).toBeVisible()
    await hold(page, "get_rehearsal")
    const before = await callCount(page, "get_rehearsal")
    await list.getByRole("button", { name: new RegExp(`^${name}`) }).click()
    await expect.poll(() => callCount(page, "get_rehearsal")).toBeGreaterThan(before)
    const bin = page.getByRole("button", { name: `Delete rehearsal ${name}` })
    await expect(bin).toBeVisible()
    await settled(page)

    const group = facts(page)
    const pane = page.locator("section").filter({ has: bin })
    const box = async (it: Locator) => {
      if ((await it.count()) === 0) return null
      const b = (await it.boundingBox())!
      return { x: Math.round(b.x), y: Math.round(b.y), width: Math.round(b.width), height: Math.round(b.height) }
    }
    const where = async () => ({
      name: await box(pane.getByRole("heading", { level: 2 })),
      pencil: await box(pane.getByRole("button", { name: /^Rename rehearsal / })),
      meta: await box(pane.locator("[data-rehearsal-head]")),
      folder: await box(pane.getByRole("button", { name: "Open folder" })),
      bin: await box(bin),
    })

    // While the takes are not read: the folder button, and no figure, no zero.
    const held = await where()
    await expect.soft(group).toHaveText("Open folder")
    await expect.soft(group.locator("dt")).toHaveCount(0)

    await letGo(page, "get_rehearsal")
    // The figures are read out whatever shows, and show when the name leaves room.
    await expect(group.locator("dt")).toHaveCount(4)
    await expect(group.locator(".sr-only")).toContainText("Length")
    if (room) await expect(fact(page, "Length")).toBeVisible()
    else await expect(fact(page, "Length")).toBeHidden()
    await settled(page)
    expect(await where()).toEqual(held)
    // The name wraps in the one and not in the other, so that a head which
    // stayed put was not just one that never had a reason to move.
    expect(held.name!.height > 40).toBe(!room)
  })
}

test("a rehearsal that is not on disk has no facts in its pane head", async ({ page }) => {
  await openApp(page)
  await openHistory(page, "Missing jam")
  await expect(page.getByText("Not found on disk.")).toBeVisible()
  await expect(facts(page)).toHaveCount(0)
})

test("the pane's folder button opens the folder of the rehearsal it is in", async ({ page }) => {
  await openApp(page)
  // Not the newest, which History opens on.
  const list = await openHistory(page, "Wednesday jam")
  await expect(page.getByRole("button", { name: "Delete rehearsal Wednesday jam" })).toBeVisible()
  await facts(page).getByRole("button", { name: "Open folder" }).click()
  await expect.poll(async () => (await calls(page, "show_rehearsal_folder")).map((c) => c.args)).toEqual([
    ["/rec/quiet"],
  ])
  await list.getByRole("button", { name: /^Tuesday jam/ }).click()
  await expect(page.getByRole("button", { name: "Delete rehearsal Tuesday jam" })).toBeVisible()
  await facts(page).getByRole("button", { name: "Open folder" }).click()
  await expect.poll(async () => (await calls(page, "show_rehearsal_folder")).at(-1)?.args).toEqual([
    "/rec/old",
  ])
})

test("a note opens its take at the spot it was left", async ({ page }) => {
  const overview = await openEvening(page)
  await overview.getByText("guitar drifts here").click()
  await expect(page.locator("[aria-label='Take timeline']")).toBeVisible()
  await expect(current(page)).toContainText("Viasna")
  await expect
    .poll(async () => (await calls(page, "player_seek")).at(-1)?.args[0] as number)
    .toBeCloseTo(40, 0)
  // The overview makes way for the player, and the strip is back, to switch
  // takes without going back.
  await expect(overview).toHaveCount(0)
  await expect(page.getByRole("group", { name: "Take strip" })).toHaveCount(1)
})

test("a take opened from the overview is deleted at once, and Undo puts it back", async ({
  page,
}) => {
  const overview = await openEvening(page)
  await overview.getByRole("button", { name: "Take 2 Pałyn 2" }).click()
  await expect(page.locator("[aria-label='Take timeline']")).toBeVisible()
  await expect(current(page)).toContainText("Pałyn 2")
  await page.getByRole("button", { name: "Delete take Pałyn 2" }).click()
  await expect(page.getByRole("dialog")).toHaveCount(0)
  expect((await calls(page, "delete_take")).map((c) => c.args)).toEqual([["/rec/old", 2]])
  const strip = page.getByRole("group", { name: "Take strip" })
  await expect(strip.getByRole("button", { name: /Pałyn 2/ })).toHaveCount(0)
  const notice = notices(page).filter({ hasText: "“Pałyn 2” went to the Trash." })
  await notice.getByRole("button", { name: "Undo" }).click()
  await expect(overview.getByRole("button", { name: "Take 2 Pałyn 2" })).toBeVisible()
})

test("the whole of a take's row opens it, not only its bar", async ({ page }) => {
  // A short take's bar is a small thing to aim at, and the row lights up
  // under the mouse all the way across.
  const overview = await openEvening(page)
  const opens = async (x: number, y: number) => {
    await page.mouse.click(x, y)
    await expect(current(page)).toContainText("Take 3")
    await page.keyboard.press("Escape")
    await expect(overview).toBeVisible()
  }
  // Beside the actions, where a short take's row is empty.
  const past = await page.evaluate(() => {
    const row = document.querySelector("[data-take='3'] > div")!
    const actions = row.lastElementChild!.getBoundingClientRect()
    const r = row.getBoundingClientRect()
    return { x: actions.left - 6, y: r.top + r.height / 2 }
  })
  await opens(past.x, past.y)
  // And on its length.
  const length = await page.locator("[data-take='3'] > div span.tnum.shrink-0").first().boundingBox()
  await opens(length!.x + length!.width / 2, length!.y + length!.height / 2)
})

test("a take plays from its row, and on in the player and back", async ({ page }) => {
  const overview = await openEvening(page)
  const opens = await callCount(page, "player_open")
  await overview.getByRole("button", { name: "Play Viasna" }).click()
  await expect(page.getByRole("button", { name: "Pause Viasna" })).toBeVisible()
  // Right there, with no player on screen, and how far it has got beside
  // its bar.
  expect(await callCount(page, "player_open")).toBe(opens + 1)
  await expect(page.locator("[aria-label='Take timeline']")).toHaveCount(0)
  await expect(page.locator("[data-take='4']")).toContainText("/ 4:10")

  // Space pauses it, though the mouse pressed Play.
  await page.keyboard.press("Space")
  await expect(page.getByRole("button", { name: "Play Viasna" })).toBeVisible()
  await page.keyboard.press("Space")
  await expect(page.getByRole("button", { name: "Pause Viasna" })).toBeVisible()

  // Its bar opens it in the player without opening it again, and it carries
  // on playing there.
  await overview.getByRole("button", { name: "Take 4 Viasna" }).click()
  await expect(page.locator("[aria-label='Take timeline']")).toBeVisible()
  expect(await callCount(page, "player_open")).toBe(opens + 1)
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toHaveCount(1)

  // Back in the overview it plays on, and Escape stops it and puts it away.
  await page.keyboard.press("Escape")
  await expect(overview).toBeVisible()
  await expect(page.getByRole("button", { name: "Pause Viasna" })).toHaveCount(1)
  const closes = await callCount(page, "player_close")
  await page.keyboard.press("Escape")
  await expect(page.getByRole("button", { name: "Play Viasna" })).toBeVisible()
  expect(await callCount(page, "player_close")).toBeGreaterThan(closes)
  await expect(overview).toHaveCount(1)
})

test("a row's own buttons work on its take without opening it", async ({ page }) => {
  const overview = await openEvening(page)
  await page.hover("[data-take='1']")
  await page.getByRole("button", { name: "Rename take Pałyn 1", exact: true }).click()
  await expect(page.getByText("Rename take")).toBeVisible()
  await expect(page.locator("[aria-label='Take timeline']")).toHaveCount(0)
  await page.keyboard.press("Escape")
  await expect(page.getByRole("dialog")).toHaveCount(0)
  // The next Escape leaves history.
  await page.keyboard.press("Escape")
  await expect(startButton(page)).toBeVisible()
  await expect(overview).toHaveCount(0)
})

test.describe("a rehearsal whose folder is gone", () => {
  test("is marked, says why rather than opening, and can be found again", async ({ page }) => {
    await openApp(page)
    const list = await openHistory(page)
    const item = list.getByRole("button", { name: /^Missing jam/ })
    await expect(item).toContainText("Not found on disk")
    await expect(item.locator("[data-strip]")).toHaveCount(0)
    await expect(page.getByRole("heading", { name: "Tuesday jam" })).toBeVisible()
    const reads = await callCount(page, "get_rehearsal")
    await item.click()
    await expect(page.getByRole("heading", { name: "Missing jam" })).toBeVisible()
    await expect(page.getByText("Not found on disk.")).toBeVisible()
    // There is nothing to read, so nothing is asked for, and no overview.
    expect(await callCount(page, "get_rehearsal")).toBe(reads)
    await expect(page.locator("[aria-label='Rehearsal overview']")).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Delete rehearsal Missing jam" })).toHaveCount(0)

    await page.getByRole("button", { name: "Locate folder…" }).click()
    await expect.poll(() => callCount(page, "choose_rehearsal_folder")).toBe(1)
    expect((await calls(page, "choose_rehearsal_folder"))[0].args[0]).toBe("/rec/gone")
    // Found, it drops off the missing list.
    await expect(page.getByText("Not found on disk")).toHaveCount(0)
  })

  test("stays as it was when the folder dialog is cancelled, and can be forgotten", async ({
    page,
  }) => {
    await openApp(page, { before: "window.__CANCEL_LOCATE__ = true;" })
    const list = await openHistory(page, "Missing jam")
    await page.getByRole("button", { name: "Locate folder…" }).click()
    await expect.poll(() => callCount(page, "choose_rehearsal_folder")).toBe(1)
    await expect(page.getByText("Not found on disk.")).toHaveCount(1)

    await page.getByRole("button", { name: "Remove from history" }).click()
    await expect(page.getByText("Only the entry goes")).toBeVisible()
    // It asks before removing anything; confirmed, only the entry goes.
    expect(await callCount(page, "forget_rehearsal")).toBe(0)
    await page.getByRole("button", { name: "Remove", exact: true }).click()
    await expect.poll(() => callCount(page, "forget_rehearsal")).toBe(1)
    expect((await calls(page, "forget_rehearsal"))[0].args[0]).toBe("/rec/gone")
    await expect(list.getByText("Missing jam")).toHaveCount(0)
    // The one beside it in the list takes its place.
    await expect(page.getByRole("heading", { name: "First rehearsal" })).toBeVisible()
  })
})

// Last time, beside the setup: the rehearsal before this one, song by song,
// to listen to before starting.

const lastTime = (page: Page) => page.getByRole("complementary", { name: "Last time" })

test.describe("last time, on the setup screen", () => {
  test("goes over the last rehearsal song by song, and needs no marks to", async ({ page }) => {
    await openApp(page, { before: "window.__FULL_EVENING__ = true;" })
    const panel = lastTime(page)
    await expect(panel).toContainText("Last time · Thu 10 Sep")
    await expect(panel).toContainText("Tuesday jam")
    await expect(panel).toContainText("12 min · 4 takes · 1 in the cloud")
    // Each song with how many goes it got and how long they ran in all.
    await expect(panel.locator("[data-song='Pałyn']")).toContainText("2 takes · 6:10")
    await expect(panel.locator("[data-song='Viasna']")).toContainText("1 take · 4:10")
    await expect(panel.locator("[data-song='Not named']")).toContainText("1 take · 1:30")
    // The marks, under their song, each by its label and its comment.
    await expect(panel.locator("[data-song='Pałyn'] [data-note]")).toContainText("this one is the take")
    await expect(panel.locator("[data-song='Viasna'] [data-note]")).toContainText("guitar drifts here")
    await expect(panel.locator("[data-song='Not named'] [data-note]")).toContainText("Note")
    await expect(panel.locator("[data-note]")).toHaveCount(3)
    // What was not played last time, from before it.
    const leftOut = panel.getByRole("region", { name: "Not played last time" })
    await expect(leftOut).toContainText("Daroha")
    await expect(leftOut).toContainText(/Tue 25 Aug.* · 2 takes/)
    // And the rest of history.
    const earlier = panel.getByRole("region", { name: "Earlier" })
    await expect(earlier).toContainText("Wednesday jam")
    await expect(earlier).toContainText("First rehearsal")
    // One wording for a rehearsal whose folder is gone, in the quiet look.
    const missing = earlier.getByRole("button", { name: /Missing jam/ })
    await expect(missing).toContainText("Not on disk")
    await expect(missing).not.toContainText("not found")
    await expect(panel.getByRole("button", { name: /^History/ })).toContainText("4 rehearsals")
  })

  test("a song's button plays its last go, and has Space and Escape while it plays", async ({
    page,
  }) => {
    await openApp(page, { before: "window.__FULL_EVENING__ = true;" })
    const panel = lastTime(page)
    await expect(keyOn(startButton(page))).resolves.toBe("Space")
    await panel.getByRole("button", { name: "Play Pałyn 2, the last take of Pałyn" }).click()
    await expect(panel.getByRole("button", { name: "Pause Pałyn 2, the last take of Pałyn" })).toBeVisible()
    expect((await calls(page, "player_open")).at(-1)?.args[0]).toEqual([
      { name: "Guitar", file: "/rec/old/p2.wav" },
    ])
    await expect(panel.locator("[data-song='Pałyn']")).toContainText("/ 2:58")
    // Space is the take's now, not Start's.
    expect(await keyOn(startButton(page))).toBeNull()
    await page.keyboard.press("Space")
    await expect(panel.getByRole("button", { name: "Play Pałyn 2, the last take of Pałyn" })).toBeVisible()
    await expect(page.getByRole("button", { name: /Record take/ })).toHaveCount(0)
    await page.keyboard.press("Space")
    await expect(panel.getByRole("button", { name: "Pause Pałyn 2, the last take of Pałyn" })).toBeVisible()

    // Take 2 of another rehearsal is another take, not this one again.
    const opens = await callCount(page, "player_open")
    await panel.getByRole("button", { name: "Play Daroha 2, the last take of Daroha" }).click()
    await expect(panel.getByRole("button", { name: "Pause Daroha 2, the last take of Daroha" })).toBeVisible()
    expect(await callCount(page, "player_open")).toBe(opens + 1)
    expect((await calls(page, "player_open")).at(-1)?.args[0]).toEqual([
      { name: "Guitar", file: "/rec/older/d2.wav" },
    ])

    // Escape stops it, and Start has Space back.
    await page.keyboard.press("Escape")
    await expect(panel.getByRole("button", { name: /^Pause/ })).toHaveCount(0)
    await expect(keyOn(startButton(page))).resolves.toBe("Space")
  })

  test("checking the signal stops what was playing", async ({ page }) => {
    await openApp(page, { before: "window.__FULL_EVENING__ = true;" })
    const panel = lastTime(page)
    await panel.getByRole("button", { name: "Play Viasna 1, the last take of Viasna" }).click()
    await expect(panel.getByRole("button", { name: /^Pause Viasna/ })).toBeVisible()
    await page.getByRole("button", { name: "Check signal" }).click()
    await expect(panel.getByRole("button", { name: /^Pause/ })).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Stop checking" })).toBeVisible()
  })

  test("Open and the other rehearsals lead into history, on the one chosen", async ({ page }) => {
    await openApp(page)
    await lastTime(page).getByRole("button", { name: "Open Tuesday jam in history" }).click()
    await expect(page.getByRole("heading", { name: "Tuesday jam" })).toBeVisible()
    await page.keyboard.press("Escape")

    await lastTime(page).getByRole("region", { name: "Earlier" })
      .getByRole("button", { name: /First rehearsal/ }).click()
    await expect(page.getByRole("heading", { name: "First rehearsal" })).toBeVisible()
    const list = page.getByRole("navigation", { name: "Rehearsals" })
    await expect(list.locator("[aria-current='true']")).toContainText("First rehearsal")
    await page.keyboard.press("Escape")

    await lastTime(page).getByRole("button", { name: /^History/ }).click()
    await expect(page.getByRole("heading", { name: "Tuesday jam" })).toBeVisible()
  })

  test("with no rehearsal before, the setup has the screen to itself", async ({ page }) => {
    await openApp(page, { before: "window.__NO_HISTORY__ = true;" })
    await expect(startButton(page)).toBeVisible()
    await expect.poll(() => callCount(page, "last_time")).toBe(1)
    await expect(lastTime(page)).toHaveCount(0)
  })
})

// ---------- a rehearsal played by a set (issue #12 step 8, H1–H4) ----------

/** Tuesday jam was played by a set: Pałyn and Viasna played, Ahoń and
 *  Kupalle not. */
const PLAYED_BY_SET =
  "window.__FULL_EVENING__ = true;" +
  `window.__PLAYED_BY__ = {"/rec/old": {name: "Gig on the 25th", songs: ["Viasna", "Pałyn", "Ahoń", "Kupalle"]}};`

test("a rehearsal played by a set shows its name in the list and under its title", async ({
  page,
}) => {
  await openApp(page, { before: PLAYED_BY_SET })
  const list = await openHistory(page)
  await expect(list.locator("[data-rehearsal='/rec/old'] [data-set-name]")).toHaveText(
    "Gig on the 25th"
  )
  await expect(list.locator("[data-rehearsal='/rec/quiet'] [data-set-name]")).toHaveCount(0)
  await list.getByRole("button", { name: /^Tuesday jam/ }).click()
  const under = page.locator("[data-rehearsal-head] [data-set-name]")
  await expect(under).toHaveText("Gig on the 25th")
  await expect(under).toHaveAttribute("title", "Played by the set Gig on the 25th")
})

test("the set card counts what was played and says not played for the rest", async ({
  page,
}) => {
  await openApp(page, { before: PLAYED_BY_SET })
  await openHistory(page, "Tuesday jam")
  const card = page.getByRole("region", { name: "Set Gig on the 25th" })
  await expect(card).toContainText("Gig on the 25th — 2 of 4 played")
  const songs = card.locator("[data-set-played]")
  await expect(songs).toHaveText([/1\s*Viasna\s*1 take/, /2\s*Pałyn\s*2 takes/, /3\s*Ahoń\s*not played/, /4\s*Kupalle\s*not played/])
  // Two columns read down: Ahoń heads the second.
  const first = (await songs.nth(0).boundingBox())!
  const third = (await songs.nth(2).boundingBox())!
  expect(third.x).toBeGreaterThan(first.x + first.width - 1)
  expect(third.y).toBeCloseTo(first.y, 0)
  // Over the songs, under the figures.
  const pałyn = (await page.getByRole("group", { name: "Pałyn" }).boundingBox())!
  expect((await card.boundingBox())!.y).toBeLessThan(pałyn.y)
  // The take nobody named is where it was.
  await expect(page.getByRole("group", { name: "Not named" })).toBeVisible()
})

test("a click on a played song in the set card scrolls to it", async ({ page }) => {
  await page.setViewportSize({ width: 1180, height: 520 })
  await openApp(page, { before: PLAYED_BY_SET })
  await openHistory(page, "Tuesday jam")
  const viasna = page.getByRole("group", { name: "Viasna" })
  await expect(viasna).not.toBeInViewport()
  const card = page.getByRole("region", { name: "Set Gig on the 25th" })
  await card.locator("[data-set-played='Viasna']").click()
  await expect(viasna).toBeInViewport()
  // A song not played has nowhere to go.
  await expect(card.locator("[data-set-played='Ahoń']")).toBeDisabled()
})

test("a rehearsal played freely has no set card", async ({ page }) => {
  await openApp(page, { before: "window.__FULL_EVENING__ = true;" })
  await openHistory(page, "Tuesday jam")
  await expect(page.getByRole("group", { name: "Pałyn" })).toBeVisible()
  await expect(page.locator("[data-set-played-card]")).toHaveCount(0)
  await expect(page.locator("[data-set-name]")).toHaveCount(0)
})
