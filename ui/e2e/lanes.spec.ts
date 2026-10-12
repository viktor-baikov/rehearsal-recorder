import { colour, expect, openApp, recordTake, scaled, startRehearsal, style, test } from "./app.ts"
import type { Locator, Page } from "@playwright/test"

// The player's track lanes (spec C6): 56 px, a plate of the card's colour
// with no frame, M and S at 20, a Both track as one card of two halves, and
// the master holding the window's bottom edge.

const NAMES = ["Drums", "Bass", "Guitar", "Vocals", "Keys", "Horns", "Room", "Talkback"]

/** A take of `n` audio tracks: the fake's own has two, so its answer to
 *  stop_take is widened to the band's first `n`. */
const band = (n: number, stereo = "") => ({
  before: `window.__STEREO_TRACKS__ = ${JSON.stringify(stereo ? [stereo] : [])};`,
  after: `
    const real = window.pywebview.api.stop_take;
    window.pywebview.api.stop_take = async (...args) => ({
      ...(await real(...args)),
      tracks: ${JSON.stringify(NAMES.slice(0, n))}.map((name) => ({name, file: '/rec/' + name + '.wav'})),
    });`,
})

/** The drummer on Both, a guitar, and a keyboard on MIDI alone. */
const BOTH = {
  before: `
    window.__SESSION_TRACKS__ = [
      {name: 'Drums', channel: 1, icon: 'drums', mode: 'both', midi_port: {name: 'TD-17'}},
      {name: 'Gtr', channel: 2, icon: 'guitar-electric', mode: 'audio'},
      {name: 'Keys', channel: null, icon: 'keys', mode: 'midi', midi_port: {name: 'Launchkey Mini MK3'}},
    ];
    window.__BAND_ICONS__ = {Drums: 'drums', Gtr: 'guitar-electric', Keys: 'keys'};`,
}

const light = "window.localStorage.setItem('mock-python-config', JSON.stringify({theme:'light', ui_scale:1}));"

/** The first take of a band up for review. */
async function review(page: Page, setup: { before?: string; after?: string }, theme = "") {
  await openApp(page, { before: theme + (setup.before ?? ""), after: setup.after })
  await startRehearsal(page)
  await recordTake(page, 1)
  await expect(page.getByRole("button", { name: /^Mute / }).first()).toBeVisible()
}

const plate = (page: Page, name: string) => page.locator(`[data-plate='${name}']`)
/** The waveform's own box, which is what is drawn: its wrapper is only a cell. */
const lane = (page: Page, name: string) => page.locator(`[data-lane='${name}'] > div`)
const notesPlate = (page: Page, name: string) => page.locator(`[data-notes-plate='${name}']`)
const notesLane = (page: Page, name: string) => page.locator(`[data-notes-lane='${name}']`)
/** The master's strip, where the page's own scroll holds it. */
const strip = (page: Page) =>
  page.getByRole("slider", { name: "Master volume" }).locator("xpath=ancestor::div[contains(@class, 'sticky')][1]")

async function box(locator: Locator) {
  const b = await locator.boundingBox()
  expect(b, "on screen").not.toBeNull()
  return b!
}

test.describe("track lanes", () => {
  test("every audio lane and its plate are 56 px tall", async ({ page }) => {
    await review(page, band(4))
    for (const name of NAMES.slice(0, 4)) {
      expect((await box(plate(page, name))).height).toBeCloseTo(56, 0)
      expect((await box(lane(page, name))).height).toBeCloseTo(56, 0)
    }
    // The master's plate is a lane's height.
    expect((await box(strip(page).locator(":scope > div"))).height).toBeCloseTo(56, 0)
    // And no taller in a tall window: the extra room stays empty.
    await page.setViewportSize({ width: 1180, height: 1400 })
    for (const name of NAMES.slice(0, 4)) {
      expect((await box(plate(page, name))).height).toBeCloseTo(56, 0)
      expect((await box(lane(page, name))).height).toBeCloseTo(56, 0)
    }
  })

  test("M and S are 20 by 20 and 6 px apart", async ({ page }) => {
    await review(page, band(4))
    for (const name of NAMES.slice(0, 4)) {
      const m = await box(plate(page, name).getByRole("button", { name: `Mute ${name}` }))
      const s = await box(plate(page, name).getByRole("button", { name: `Solo ${name}` }))
      expect([m.width, m.height, s.width, s.height]).toEqual([20, 20, 20, 20])
      expect(s.x - (m.x + m.width)).toBeCloseTo(6, 0)
      expect(Math.abs(s.y - m.y)).toBeLessThan(1)
    }
    const m = plate(page, "Drums").getByRole("button", { name: "Mute Drums" })
    expect(await style(m, "font-size", "border-top-left-radius")).toEqual({
      "font-size": "12px",
      "border-top-left-radius": "4px",
    })
  })

  // Everything on a plate is rem, so a lane is too: at 150 % a 56 px row would
  // leave the fader on top of M and S, and at 130 % squeeze it to nothing.
  for (const scale of [0.9, 1.15, 1.3, 1.5]) {
    test(`at the Appearance scale ${scale} a lane grows with it and a plate holds all it has`, async ({
      page,
    }) => {
      await review(page, band(4), scaled(scale))
      const rem = 16 * scale
      expect(
        parseFloat(await page.evaluate(() => getComputedStyle(document.documentElement).fontSize))
      ).toBeCloseTo(rem, 1)
      for (const name of NAMES.slice(0, 4)) {
        const p = plate(page, name)
        const at = await box(p)
        // 3.5rem: 56 px at the scale of 1.
        expect(at.height).toBeCloseTo(3.5 * rem, 0)
        expect((await box(lane(page, name))).height).toBeCloseTo(3.5 * rem, 0)
        expect(await p.evaluate((e) => e.scrollHeight - e.clientHeight)).toBeLessThanOrEqual(0)
        // The fader keeps its 1rem, whole and inside the plate, and M and S
        // are above it, not over it.
        const fader = await box(page.getByRole("meter", { name: `${name} level` }).locator("xpath=.."))
        expect(fader.height).toBeCloseTo(rem, 0)
        expect(fader.y + fader.height).toBeLessThanOrEqual(at.y + at.height + 0.5)
        for (const label of ["Mute", "Solo"]) {
          const b = await box(p.getByRole("button", { name: `${label} ${name}` }))
          expect(b.height).toBeCloseTo(1.25 * rem, 0)
          expect(b.y + b.height).toBeLessThanOrEqual(fader.y + 0.5)
          expect(b.y).toBeGreaterThanOrEqual(at.y - 0.5)
        }
      }
      // The master is a lane's height as well.
      expect((await box(strip(page).locator(":scope > div"))).height).toBeCloseTo(3.5 * rem, 0)
    })
  }

  for (const scale of [0.9, 1.5]) {
    test(`at the Appearance scale ${scale} the notes plate keeps its text and its drum rows are named`, async ({
      page,
    }) => {
      await review(page, BOTH, scaled(scale))
      const midi = notesPlate(page, "Drums")
      const at = await box(midi)
      // At least what six named rows need in px, and with the scale once it
      // is past 1 (the plate's own text is rem).
      expect(at.height).toBeGreaterThanOrEqual(73 - 0.5)
      expect(at.height).toBeGreaterThanOrEqual(73 * scale - 0.5)
      expect(await midi.evaluate((e) => e.scrollHeight - e.clientHeight)).toBeLessThanOrEqual(0)
      await expect(notesLane(page, "Drums").getByText("Kick", { exact: true })).toBeVisible()
      // The audio half above it is 3.5rem.
      expect((await box(plate(page, "Drums"))).height).toBeCloseTo(3.5 * 16 * scale, 0)
    })
  }

  for (const theme of ["dark", "light"]) {
    test(`a plate has no frame and the card's colour, in the ${theme} theme`, async ({ page }) => {
      await review(page, band(2), theme === "light" ? light : "")
      expect(await page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(
        theme === "dark"
      )
      const card = await colour(page, "--card")
      for (const name of ["Drums", "Bass"]) {
        for (const el of [plate(page, name), lane(page, name)]) {
          expect(await style(el, "border-top-width", "border-bottom-width", "background-color")).toEqual({
            "border-top-width": "0px",
            "border-bottom-width": "0px",
            "background-color": card,
          })
          expect((await style(el, "border-top-left-radius"))["border-top-left-radius"]).toBe("12px")
        }
      }
      // The master is a plate too.
      const master = page.getByRole("slider", { name: "Master volume" }).locator("xpath=ancestor::div[contains(@class, 'bg-card')][1]")
      expect(await style(master, "border-top-width", "background-color")).toEqual({
        "border-top-width": "0px",
        "background-color": card,
      })
    })
  }

  test("the plate has no Mono or Stereo line, whatever the file", async ({ page }) => {
    await review(page, band(2, "Bass"))
    for (const name of ["Drums", "Bass"]) {
      await expect(plate(page, name)).not.toContainText("Mono")
      await expect(plate(page, name)).not.toContainText("Stereo")
    }
    // The meter still says it: two bars for a stereo file.
    const fills = (name: string) =>
      page.getByRole("meter", { name: `${name} level` }).locator("[data-fill]")
    await expect(fills("Drums")).toHaveCount(1)
    await expect(fills("Bass")).toHaveCount(2)
  })

  test("a Both track's two halves touch, the lower under a solid 1 px line", async ({ page }) => {
    await review(page, BOTH)
    const card = await colour(page, "--card")
    const line = await colour(page, "--border")
    const upper = plate(page, "Drums")
    const lower = notesPlate(page, "Drums")
    const a = await box(upper)
    const m = await box(lower)
    expect(Math.abs(m.y - (a.y + a.height))).toBeLessThan(0.5)
    expect(Math.abs(m.x - a.x)).toBeLessThan(0.5)
    expect(Math.abs(m.width - a.width)).toBeLessThan(0.5)
    expect(
      await style(lower, "border-top-width", "border-top-style", "border-top-color", "background-color")
    ).toEqual({
      "border-top-width": "1px",
      "border-top-style": "solid",
      "border-top-color": line,
      "background-color": card,
    })
    // Outer corners round, inner ones square.
    expect(
      await style(upper, "border-top-left-radius", "border-bottom-left-radius", "border-bottom-right-radius")
    ).toEqual({
      "border-top-left-radius": "12px",
      "border-bottom-left-radius": "0px",
      "border-bottom-right-radius": "0px",
    })
    expect(
      await style(lower, "border-top-left-radius", "border-top-right-radius", "border-bottom-left-radius")
    ).toEqual({
      "border-top-left-radius": "0px",
      "border-top-right-radius": "0px",
      "border-bottom-left-radius": "12px",
    })
    expect((await style(upper, "border-bottom-width"))["border-bottom-width"]).toBe("0px")

    // The lanes beside them are cut the same way, one picture of one card.
    const wave = await box(lane(page, "Drums"))
    const notes = await box(notesLane(page, "Drums"))
    expect(Math.abs(notes.y - (wave.y + wave.height))).toBeLessThan(0.5)
    expect(Math.abs(notes.y - m.y)).toBeLessThan(0.5)
    expect(await style(notesLane(page, "Drums"), "border-top-width", "border-top-style", "border-top-color")).toEqual({
      "border-top-width": "1px",
      "border-top-style": "solid",
      "border-top-color": line,
    })
    expect((await style(lane(page, "Drums"), "border-bottom-width"))["border-bottom-width"]).toBe("0px")
  })

  test("a MIDI-only plate is a card of its own, with no line on top", async ({ page }) => {
    await review(page, BOTH)
    const keys = notesPlate(page, "Keys")
    expect(
      await style(keys, "border-top-width", "border-top-left-radius", "border-bottom-left-radius", "background-color")
    ).toEqual({
      "border-top-width": "0px",
      "border-top-left-radius": "12px",
      "border-bottom-left-radius": "12px",
      "background-color": await colour(page, "--card"),
    })
    // The same plate the audio track has: same padding on the same card.
    const pad = ["padding-left", "padding-top"]
    expect(await style(keys, ...pad)).toEqual(await style(plate(page, "Gtr"), ...pad))
  })

  /** How far the strip's lower edge is above the page's (the bottom of the
   *  scrolling area, which is the window's above a footer). */
  async function above(page: Page) {
    const main = await box(page.locator("main"))
    const b = await box(strip(page))
    return main.y + main.height - (b.y + b.height)
  }

  test("the master holds the window's bottom edge while the page scrolls, with eight tracks", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1180, height: 600 })
    await review(page, band(8))
    const main = page.locator("main")
    await expect(strip(page)).toBeVisible()
    const scrolls = await main.evaluate((el) => el.scrollHeight - el.clientHeight)
    expect(scrolls, "the page has more than a window of tracks").toBeGreaterThan(100)

    // Flush with the page's edge, not a strip of padding above it, at the
    // top and wherever the page is scrolled to.
    for (const to of [0, scrolls / 3, (scrolls * 2) / 3]) {
      await main.evaluate((el, y) => (el.scrollTop = y), to)
      expect(Math.abs(await above(page))).toBeLessThan(1)
    }
    // At the very end it is where it lies in the page, the padding below it,
    // and the last track is not under it.
    await main.evaluate((el) => (el.scrollTop = el.scrollHeight))
    expect(await above(page)).toBeGreaterThan(8)
    expect(await above(page)).toBeLessThanOrEqual(25)
    const last = await box(plate(page, "Talkback"))
    const held = await box(strip(page))
    expect(last.y + last.height).toBeLessThanOrEqual(held.y + 1)
  })

  test("the master's edge follows the screen's padding", async ({ page }) => {
    await page.setViewportSize({ width: 1180, height: 600 })
    await review(page, band(8))
    const main = page.locator("main")
    expect(
      await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue("--screen-pad-y").trim()
      )
    ).toBe("1.5rem")
    expect(await style(main, "padding-top", "padding-bottom")).toEqual({
      "padding-top": "24px",
      "padding-bottom": "24px",
    })
    // A roomier screen: the padding follows the token, and so does the master.
    await page.evaluate(() => document.documentElement.style.setProperty("--screen-pad-y", "3rem"))
    expect(await style(main, "padding-top", "padding-bottom")).toEqual({
      "padding-top": "48px",
      "padding-bottom": "48px",
    })
    await main.evaluate((el) => (el.scrollTop = 0))
    expect(Math.abs(await above(page))).toBeLessThan(1)
  })
})
