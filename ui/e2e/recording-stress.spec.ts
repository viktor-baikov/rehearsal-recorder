import { expect, openApp, test } from "./app.ts"

// The recording stress data (stress-recording.js): the screen as the longest
// names and the most tracks the band has make it, read from here by the
// recording screen's own tests. A fixture whose own test fails on any error in
// the page, so that what it lays over the rehearsal stress band is checked here
// once, and the tests built on it can rely on it.

test("the recording stress data opens on take 33 with eight tiles", async ({ page }) => {
  await openApp(page, { stress: "recording" })
  // The second take of the longest song name, take 33 of the evening, recording.
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Kalychanka (slow version for the wedding, with the long intro the bride asked for) 2"
  )
  await expect(page.getByText("Take 33", { exact: true })).toBeVisible()
  await expect(page.getByText("Recording", { exact: true })).toBeVisible()
  // Seven tracks that take sound and the Nord, on MIDI alone.
  const tiles = page.locator("main [role=group]")
  await expect(tiles).toHaveCount(8)
  // Somebody plays the Nord: its tile counts notes.
  const nord = page.getByRole("group", { name: "Keys (Nord Stage 3 MIDI)" })
  await expect(nord).toBeVisible()
  await expect(nord).toContainText(/[1-9][\d,]* notes?/)
  // Guitar clips three times in the first seconds, Percussion is silent.
  await expect(page.getByRole("group", { name: "Guitar", exact: true })).toContainText("clipped 3×")
  await expect(page.getByRole("group", { name: "Percussion" })).toContainText("silent")
  // The disk has 5 min left.
  await expect(
    page.getByText("Low disk space: room for about 5 min. Free some up or finish the rehearsal.", {
      exact: true,
    })
  ).toBeVisible()
})

// A tile's name (Q2, «В две строки и мельче»): up to two lines at 2.25rem; a
// name still too long gets smaller, down to 1.5rem, and past that it is cut
// and whole in the tile's tooltip. Short names keep 2.25rem. Sizes are read
// from the name as drawn, within 1 px: the container draws in Inter, a Mac or
// Windows in its own font.

import type { Page } from "@playwright/test"
import { openBandApp, setFake, settled, startRehearsal, tipLines } from "./app.ts"

const HANNA = "Lead and backing vocals (Hanna)"
const NORD = "Keys (Nord Stage 3 MIDI)"

type Drawn = { px: number; lines: number; cut: boolean; whole: boolean }

/** How each tile draws its track's name, by the track: the size, the lines
 *  (up the tile a line is as wide as its line height), and whether it is cut
 *  or whole: all of it, in its box. */
const names = (page: Page): Promise<Record<string, Drawn>> =>
  page.evaluate(() =>
    Object.fromEntries(
      [...document.querySelectorAll("main [role=group]")].map((t) => {
        const name = t.getAttribute("aria-label") ?? ""
        const el = t.querySelector("[data-name]")
        if (!el) return [name, { px: 0, lines: 0, cut: false, whole: false }]
        const cs = getComputedStyle(el)
        const cut = el.hasAttribute("data-cut")
        return [
          name,
          {
            px: parseFloat(cs.fontSize),
            lines: Math.round(el.getBoundingClientRect().width / parseFloat(cs.lineHeight)),
            cut,
            whole: !cut && el.textContent === name && el.scrollHeight <= el.clientHeight + 1,
          },
        ]
      })
    )
  )

type Want = { px: number | [number, number]; lines?: 1 | 2; cut?: true }

/** Every tile's name held against `want`, as one comparison that shows every
 *  name that is not as it should be: a size within 1 px of the one wanted,
 *  or strictly between the two, reads as the one wanted; the lines are read
 *  where they are wanted; and a name is whole unless it is to be cut. */
async function namesAgainst(page: Page, want: Record<string, Want>) {
  const seen = await names(page)
  const keys = [...new Set([...Object.keys(want), ...Object.keys(seen)])]
  const fits = (px: number, w: Want["px"]) =>
    typeof w === "number" ? Math.abs(px - w) <= 1 : px > w[0] && px < w[1]
  const read = (name: string) => {
    const n = seen[name]
    const w = want[name]
    if (!n) return "not drawn"
    if (!w) return "not wanted"
    return {
      px: fits(n.px, w.px) ? w.px : n.px,
      ...(w.lines ? { lines: n.lines } : {}),
      ...(n.cut ? { cut: true } : n.whole ? {} : { overflows: true }),
    }
  }
  return {
    seen: Object.fromEntries(keys.map((k) => [k, read(k)])),
    wanted: Object.fromEntries(keys.map((k) => [k, want[k] ?? "not drawn"])),
  }
}

test("long names fit on two lines and get smaller at 1180x820", async ({ page }) => {
  await openApp(page, { stress: "recording" })
  await page.setViewportSize({ width: 1180, height: 820 })
  await settled(page)
  const { seen, wanted } = await namesAgainst(page, {
    // Too long for two lines even at 1.5rem: cut, and whole in the tooltip.
    [HANNA]: { px: 24, lines: 2, cut: true },
    [NORD]: { px: 24, lines: 2 },
    // Smaller, on one line, and not as small as it may get.
    Percussion: { px: [24, 36], lines: 1 },
    "Second guitar": { px: 36, lines: 2 },
    Drums: { px: 36 },
    Bass: { px: 36 },
    Guitar: { px: 36 },
    Keys: { px: 36 },
  })
  expect(seen).toEqual(wanted)
})

test("only Hanna is cut at 960x680", async ({ page }) => {
  await openApp(page, { stress: "recording" })
  await page.setViewportSize({ width: 960, height: 680 })
  await settled(page)
  const seen = Object.entries(await names(page))
  expect(seen).toHaveLength(8)
  expect(seen.filter(([, n]) => n.cut).map(([name]) => name), "cut").toEqual([HANNA])
  expect(
    seen.filter(([name, n]) => name !== HANNA && !n.whole).map(([name]) => name),
    "not whole"
  ).toEqual([])
  // None under 1.5rem, within 1 px.
  expect(
    seen.filter(([, n]) => n.px < 23).map(([name, n]) => `${name} ${n.px}`),
    "under 24 px"
  ).toEqual([])
})

test("a cut name is whole in the tooltip on hover", async ({ page }) => {
  await openApp(page, { stress: "recording" })
  await page.setViewportSize({ width: 960, height: 680 })
  await settled(page)
  const hanna = page.getByRole("group", { name: HANNA })
  await expect(hanna.locator("[data-name]")).toHaveAttribute("data-cut")
  await expect(hanna.locator("[data-name]")).toHaveText(/…$/)
  expect(await tipLines(page, hanna)).toContain(HANNA)
  // A name drawn whole is not said again.
  expect(await tipLines(page, page.getByRole("group", { name: "Bass" }))).not.toContain("Bass")
})

test("the input line gives way to a second line and the tooltip says it", async ({ page }) => {
  await openApp(page, { stress: "recording" })
  await page.setViewportSize({ width: 1180, height: 680 })
  // The input line stands beside the name on a tile 7rem wide or more. A
  // name on two lines at 2.25rem needs its width there only on a tile just
  // that wide, a pixel or two of window: so the tiles are held at 7rem, the
  // narrowest that has room for the line.
  await page.addStyleTag({ content: "main [role=group] { width: 7rem !important; }" })
  await settled(page)
  /** The levels tiles whose input line has given way to their name, and
   *  what the line said. */
  const gone = () =>
    page.evaluate(() =>
      [...document.querySelectorAll("main [role=group]")].flatMap((t) => {
        const line = t.querySelector("[data-side-line]")
        const shows = line?.parentElement && getComputedStyle(line.parentElement).display !== "none"
        return t.querySelector("[data-levels]") && shows && getComputedStyle(line).display === "none"
          ? [{ name: t.getAttribute("aria-label") ?? "", input: line.textContent ?? "" }]
          : []
      })
    )
  await expect.poll(async () => (await gone()).length, { message: "input lines gone" }).toBeGreaterThan(0)
  for (const { name, input } of await gone()) {
    const tile = page.getByRole("group", { name, exact: true })
    await expect(tile.locator("[data-name]"), name).toHaveAttribute("data-lines", "2")
    expect(input, name).toMatch(/^Inputs? \d/)
    expect(await tipLines(page, tile), name).toContain(input)
  }
  // A name on one line keeps its input line, and the tooltip does not say
  // it again.
  const bass = page.getByRole("group", { name: "Bass" })
  await expect(bass.locator("[data-side-line]")).toBeVisible()
  expect(await tipLines(page, bass)).not.toContain(await bass.locator("[data-side-line]").textContent())
})

/** Guitar and Percussion as the test plays them, over the stress data's own:
 *  both at a fair level until the test sets window.__PLAYED__ otherwise. */
const PLAYED = `{
  const api = window.pywebview.api;
  const read = api.get_levels;
  window.__PLAYED__ = {Guitar: [0.3], Percussion: [0.3]};
  api.get_levels = async () => ({...(await read()), ...window.__PLAYED__});
}`

test("a name does not change when a clip or a silence comes", async ({ page }) => {
  await openApp(page, { stress: "recording", after: PLAYED })
  const guitar = page.getByRole("group", { name: "Guitar", exact: true })
  const percussion = page.getByRole("group", { name: "Percussion" })
  /** Every name's size, lines, cut and box, by its track. */
  const fitted = () =>
    page.evaluate(() =>
      [...document.querySelectorAll("main [role=group]")].map((t) => {
        const el = t.querySelector("[data-name]")!
        const r = el.getBoundingClientRect()
        return {
          name: t.getAttribute("aria-label"),
          px: el.getAttribute("data-name-px"),
          lines: el.getAttribute("data-lines"),
          cut: el.getAttribute("data-cut"),
          box: [r.x, r.y, r.width, r.height],
        }
      })
    )
  type Fitted = Awaited<ReturnType<typeof fitted>>
  /** `now` as `was`, with a box within 0.5 px of the one it had read as
   *  "same". */
  const against = (now: Fitted, was: Fitted) =>
    now.map((n, i) => ({
      ...n,
      box: was[i] && n.box.every((v, j) => Math.abs(v - was[i].box[j]) <= 0.5) ? "same" : n.box,
    }))
  // At 1180x680 the tiles are wide enough to show their status line, and
  // short enough that a long name's size is set by their height.
  const windows = [
    [1180, 820],
    [1180, 680],
    [960, 680],
  ] as const
  const before: Record<string, Fitted> = {}
  for (const [width, height] of windows) {
    await page.setViewportSize({ width, height })
    await settled(page)
    before[`${width}x${height}`] = await fitted()
  }
  // Fitted, every one: a name with no size or lines to compare has no jump
  // to show either.
  expect(
    Object.values(before)
      .flat()
      .filter((n) => !n.px || !n.lines)
      .map((n) => n.name),
    "names not fitted"
  ).toEqual([])
  await expect(guitar).not.toHaveAttribute("data-clipped")
  await expect(percussion).not.toHaveAttribute("data-silent")

  await setFake(page, "__PLAYED__", { Guitar: [0.995], Percussion: [0.0005] })
  await expect(guitar).toHaveAttribute("data-clipped")
  await expect(percussion).toHaveAttribute("data-silent")
  for (const [width, height] of [...windows].reverse()) {
    await page.setViewportSize({ width, height })
    await settled(page)
    const was = before[`${width}x${height}`]
    expect(against(await fitted(), was), `at ${width}x${height}`).toEqual(
      was.map((n) => ({ ...n, box: "same" }))
    )
  }
})

test("the band's names are whole at 960x680", async ({ page }) => {
  // The band's take of Viasna, its second tonight, with the bar against the
  // first under the clock.
  await openBandApp(page)
  await startRehearsal(page, 6)
  await page.locator("#next-take-name").fill("Viasna")
  await page.getByRole("button", { name: /Record take 6/ }).click()
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Viasna 2")
  await page.setViewportSize({ width: 960, height: 680 })
  await settled(page)
  const seen = await names(page)
  expect(Object.keys(seen)).toEqual(["Drums", "Bass", "Guitar", "Vocals"])
  expect(
    Object.entries(seen).filter(([, n]) => !n.whole).map(([name]) => name),
    "not whole"
  ).toEqual([])
  // 35 px, within 1 px.
  expect(seen.Vocals.px).toBeGreaterThanOrEqual(34)
})
