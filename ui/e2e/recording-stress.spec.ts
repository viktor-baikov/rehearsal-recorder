import { expect, openApp, scaled, settled, test } from "./app.ts"
import type { Page } from "@playwright/test"

// The recording stress data (stress-recording.js): the screen as the longest
// names and the most tracks the band has make it, read from here by the
// recording screen's own tests. A fixture whose own test fails on any error in
// the page, so that what it lays over the rehearsal stress band is checked here
// once, and the tests built on it can rely on it.

test("the recording stress data opens on take 33 with eight tiles", async ({ page }) => {
  await openApp(page, { stress: "recording" })
  // The second take of the longest song name, take 33 of the evening,
  // recording. Read whole: drawn, it is cut after two lines.
  await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName(
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

// What gives way in a window too short for everything (the plan's calls): the
// clock and the take's name first, down to the clock's 3rem; then the tiles,
// from their 12.5rem down to 6rem; only then does the page scroll.

/** The clock's size, the tiles' heights, and whether the screen scrolls. */
const fitted = (page: Page) =>
  page.evaluate(() => {
    const main = document.querySelector("main")!
    const tiles = [...document.querySelectorAll("main [data-tiles] [role=group]")].map(
      (t) => t.getBoundingClientRect().height
    )
    const stop = [...document.querySelectorAll("footer button")]
      .find((b) => b.textContent?.startsWith("Stop"))!
      .getBoundingClientRect()
    return {
      clock: parseFloat(getComputedStyle(document.querySelector("[role=timer]")!).fontSize),
      lowest: Math.min(...tiles),
      highest: Math.max(...tiles),
      down: main.scrollHeight > main.clientHeight + 1,
      mainSideways: main.scrollWidth > main.clientWidth + 1,
      pageSideways: document.documentElement.scrollWidth > window.innerWidth,
      stopInView: stop.top >= 0 && stop.bottom <= window.innerHeight,
    }
  })

test("in a short window the clock gives way before the tiles", async ({ page }) => {
  await page.setViewportSize({ width: 960, height: 680 })
  await openApp(page, { stress: "recording" })
  await settled(page)
  const seen = await fitted(page)
  // The tiles keep their 12.5rem; the clock is smaller than the window's
  // 19vh would make it, and no smaller than its 3rem.
  expect(seen.lowest, "the tiles").toBeGreaterThanOrEqual(200 - 0.5)
  expect(seen.clock, "the clock").toBeLessThan(129)
  expect(seen.clock, "the clock").toBeGreaterThanOrEqual(48)
  expect(seen.down, "the screen scrolls").toBe(false)
})

test("at 150 percent in 960x680 the tiles give way after the clock", async ({ page }) => {
  await page.setViewportSize({ width: 960, height: 680 })
  await openApp(page, { stress: "recording", before: scaled(1.5) })
  await settled(page)
  const seen = await fitted(page)
  // The clock at its 3rem, and the tiles between 6rem and 12.5rem.
  expect(Math.abs(seen.clock - 72), `the clock at ${seen.clock}px`).toBeLessThanOrEqual(1)
  expect(seen.lowest, "the tiles").toBeGreaterThanOrEqual(144 - 0.5)
  expect(seen.highest, "the tiles").toBeLessThanOrEqual(300 + 0.5)
  expect(seen.mainSideways, "the screen scrolls sideways").toBe(false)
  expect(seen.pageSideways, "the page scrolls sideways").toBe(false)
  if (seen.down) expect(seen.stopInView, "Stop, with the screen scrolling").toBe(true)
})

test("tab reaches only stop", async ({ page }) => {
  await openApp(page, { stress: "recording" })
  await settled(page)
  // From the page's start: a press on the screen's empty corner puts the
  // keys' starting point there.
  const main = (await page.locator("main").boundingBox())!
  await page.mouse.click(main.x + 4, main.y + 4)
  const stop = page.getByRole("button", { name: /^Stop/ })
  await page.keyboard.press("Tab")
  await expect(stop).toBeFocused()
  await page.keyboard.press("Tab")
  // Off the page, or round to Stop again.
  const away = await page.evaluate(() => {
    const at = document.activeElement
    return !at || at === document.body || at.textContent?.trim().startsWith("Stop")
  })
  expect(away, "the second Tab").toBe(true)
})
