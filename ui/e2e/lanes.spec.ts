import {
  colour,
  expect,
  hold,
  letGo,
  openApp,
  openBandApp,
  recordTake,
  scaled,
  settled,
  startRehearsal,
  style,
  test,
} from "./app.ts"
import type { Locator, Page } from "@playwright/test"

// The player's track lanes (spec C6): 56 px, a plate of the card's colour
// with no frame, M and S at 20, a Both track as one card of two halves, and
// the master holding the window's bottom edge. M and S are after the fader, on
// its row (owner, 2026-10-12, Q3), so the name has the plate's whole width.

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

const HANNA = "Lead and backing vocals (Hanna)"

/** The rehearsal stress band's take 2, up in the player: eight tracks, the
 *  drummer on Both, a keyboard on MIDI alone, and a name that is too long for
 *  its plate (Hanna's). `held` runs once the rehearsal is up, before the take
 *  is opened. Returns when the take was asked for, in ms. */
async function openTake2(page: Page, held?: () => Promise<void>) {
  await openBandApp(page, { stress: "rehearsal" })
  await startRehearsal(page, 33)
  await held?.()
  const since = Date.now()
  await page.locator('[data-take="2"]').getByRole("button", { name: /^Take 2 / }).click()
  await expect(page.getByRole("group", { name: "Take timeline" })).toBeVisible()
  return since
}

/** The middle of a box, down the page. */
const middle = (b: { y: number; height: number }) => b.y + b.height / 2

/** The pixel the screen shows at a point of the window, as [r, g, b]. */
async function pixelAt(page: Page, x: number, y: number) {
  const png = await page.screenshot({ clip: { x: Math.floor(x), y: Math.floor(y), width: 1, height: 1 } })
  return page.evaluate(async (data) => {
    const img = new Image()
    img.src = `data:image/png;base64,${data}`
    await img.decode()
    const ctx = Object.assign(document.createElement("canvas"), { width: 1, height: 1 }).getContext("2d")!
    ctx.drawImage(img, 0, 0)
    return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3)
  }, png.toString("base64"))
}

/** A CSS colour as the [r, g, b] a screen shows for it. */
const rgbOf = (page: Page, css: string) =>
  page.evaluate((c) => {
    const ctx = Object.assign(document.createElement("canvas"), { width: 1, height: 1 }).getContext("2d")!
    ctx.fillStyle = c
    ctx.fillRect(0, 0, 1, 1)
    return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3)
  }, css)

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
        // The fader keeps its 1rem, whole and inside the plate, with its name
        // above it; M and S are beside it, on its row, not over it.
        const fader = await box(page.getByRole("meter", { name: `${name} level` }).locator("xpath=.."))
        expect(fader.height).toBeCloseTo(rem, 0)
        expect(fader.y + fader.height).toBeLessThanOrEqual(at.y + at.height + 0.5)
        const title = await box(p.locator("[data-plate-name]"))
        expect(title.y + title.height).toBeLessThanOrEqual(fader.y + 0.5)
        expect(title.y).toBeGreaterThanOrEqual(at.y - 0.5)
        for (const label of ["Mute", "Solo"]) {
          const b = await box(p.getByRole("button", { name: `${label} ${name}` }))
          expect(b.height).toBeCloseTo(1.25 * rem, 0)
          expect(b.x).toBeGreaterThanOrEqual(fader.x + fader.width - 0.5)
          expect(Math.abs(middle(b) - middle(fader))).toBeLessThan(1)
          expect(b.y + b.height).toBeLessThanOrEqual(at.y + at.height + 0.5)
          expect(b.y).toBeGreaterThanOrEqual(title.y + title.height - 0.5)
        }
      }
      // The master is a lane's height as well.
      expect((await box(strip(page).locator(":scope > div"))).height).toBeCloseTo(3.5 * rem, 0)
    })
  }

  // Six drum rows named in rem (0.875rem each) between 3 px above and below,
  // and under the 1 px line of a lower half: 91 at the scale of 1.
  for (const scale of [0.9, 1, 1.15, 1.3, 1.5]) {
    test(`at the Appearance scale ${scale} the notes plate keeps its text and its drum rows are named`, async ({
      page,
    }) => {
      await review(page, BOTH, scaled(scale))
      const midi = notesPlate(page, "Drums")
      const at = await box(midi)
      // At least what six named rows need, which is with the scale; the 7 px
      // are not.
      expect(at.height).toBeGreaterThanOrEqual(84 * scale + 7 - 0.5)
      if (scale === 1) expect(at.height).toBeGreaterThanOrEqual(91 - 0.5)
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

// Q3: M and S in the fader's row, after the fader. The name is alone on the
// row above and has the plate's whole width, about 152 px.
test.describe("M and S at the fader", () => {
  test("M and S sit after the fader on its row and the name has the plate's width", async ({
    page,
  }) => {
    await openTake2(page)
    await settled(page)
    for (const name of [HANNA, "Drums"]) {
      const p = plate(page, name)
      const fader = await box(p.getByRole("slider", { name: `${name} volume` }))
      for (const label of ["Mute", "Solo"]) {
        const b = await box(p.getByRole("button", { name: `${label} ${name}` }))
        expect(b.x, `${label} is right of the fader's right edge`).toBeGreaterThanOrEqual(
          fader.x + fader.width - 0.5
        )
        expect(Math.abs(middle(b) - middle(fader)), `${label} is level with the fader`).toBeLessThan(1)
      }
      // The name alone on the row above, at the plate's width less its
      // padding and the icon: 152 px of the 200.
      const title = await box(p.locator("[data-plate-name]"))
      expect(title.width, `${name}'s width`).toBeGreaterThanOrEqual(140)
      expect(title.y + title.height).toBeLessThanOrEqual(fader.y + 0.5)
      // And the lane is still 56 px.
      expect((await box(p)).height).toBeCloseTo(56, 0)
      expect((await box(lane(page, name))).height).toBeCloseTo(56, 0)
    }
  })

  test("a cut plate name shows whole on hover and when Tab reaches it", async ({ page }) => {
    await openTake2(page)
    await settled(page)
    const hanna = plate(page, HANNA).locator("[data-plate-name]")
    const drums = plate(page, "Drums").locator("[data-plate-name]")
    const tip = page.locator("[data-whole][data-state$='open']")
    await expect(hanna).toHaveText(HANNA)
    await expect(hanna).toHaveAttribute("data-cut")
    await expect(hanna).toHaveAttribute("tabindex", "0")
    // A name that fits has no tip and no place in the Tab order.
    await expect(drums).not.toHaveAttribute("data-cut")
    await expect(drums).not.toHaveAttribute("tabindex")

    // Under the pointer.
    await hanna.hover()
    await expect(tip).toHaveText(HANNA)
    await page.mouse.move(0, 0, { steps: 8 })
    await expect(tip).toHaveCount(0)

    // Under the keys: Tab from the control before it, with the shared ring.
    await hanna.locator("xpath=preceding::button[1]").focus()
    await page.keyboard.press("Tab")
    await expect(hanna).toBeFocused()
    await expect(tip).toHaveText(HANNA)
    expect((await style(hanna, "box-shadow"))["box-shadow"]).not.toBe("none")
    // Tab goes on to the fader: the name is one stop, and only while it is cut.
    await page.keyboard.press("Tab")
    await expect(plate(page, HANNA).getByRole("slider")).toBeFocused()
    await expect(tip).toHaveCount(0)
  })

  for (const theme of ["dark", "light"]) {
    test(`M and S are grey when on, not amber or the accent, in the ${theme} theme`, async ({ page }) => {
      await review(page, band(2), theme === "light" ? light : "")
      const grey = await colour(page, "--selected")
      for (const label of ["Mute", "Solo"]) {
        const button = plate(page, "Drums").getByRole("button", { name: `${label} Drums` })
        await expect(button).toHaveAttribute("aria-pressed", "false")
        await button.click()
        await expect(button).toHaveAttribute("aria-pressed", "true")
        // The fill fades in, so it is read once it has settled.
        await expect
          .poll(async () => (await style(button, "background-color"))["background-color"], label)
          .toBe(grey)
        // The pointer is still on it: an "on" button keeps its fill.
        expect((await style(button, "background-color"))["background-color"]).toBe(grey)
      }
    })

    // The thumb is the engine's own pseudo-element, which getComputedStyle
    // does not answer for: so it is read where it is drawn. A fader at its top
    // has its thumb at the right end.
    test(`the fader thumbs are in the text colour, in the ${theme} theme`, async ({ page }) => {
      await review(page, band(2), theme === "light" ? light : "")
      const text = await colour(page, "--foreground")
      for (const name of ["Drums volume", "Master volume"]) {
        const fader = await box(page.getByRole("slider", { name }))
        const thumb = await pixelAt(page, fader.x + fader.width - 7, middle(fader))
        expect(thumb, name).toEqual(await rgbOf(page, text))
      }
    })
  }

  test("the master's figure sits after its fader, under the name", async ({ page }) => {
    await review(page, band(2))
    const master = strip(page)
    const fader = await box(master.getByRole("slider", { name: "Master volume" }))
    const figure = await box(master.getByText(/^\d+%$/))
    const name = await box(master.getByText("Master", { exact: true }))
    expect(figure.x).toBeGreaterThanOrEqual(fader.x + fader.width - 0.5)
    expect(Math.abs(middle(figure) - middle(fader))).toBeLessThan(1)
    expect(figure.y).toBeGreaterThanOrEqual(name.y + name.height - 0.5)
    // Where a track has M and S, so every fader in the column is as long as
    // the others and ends in the same place.
    const track = await box(plate(page, "Drums").getByRole("slider", { name: "Drums volume" }))
    expect(Math.abs(fader.x - track.x)).toBeLessThan(0.5)
    expect(Math.abs(fader.width - track.width)).toBeLessThan(0.5)
  })

  // Review Focus 3: the notes of a take are read once it is opened, and a
  // slow disk is a lane with a spinner in it after a second.
  test("a notes lane shows a spinner after one second while it reads", async ({ page }) => {
    const since = await openTake2(page, () => hold(page, "take_notes"))
    const at = (ms: number) => page.waitForTimeout(Math.max(0, ms - (Date.now() - since)))
    // Each notes lane has one, and it shows nothing before the second: it is
    // on the page the whole time, hidden (so out of the role query).
    const spinners = page
      .locator("[data-notes-lane]")
      .getByRole("status", { name: "Loading", includeHidden: true })
    await expect(page.locator("[data-notes-lane]")).toHaveCount(2)
    expect(await spinners.count(), "a spinner in each notes lane").toBe(2)
    await at(500)
    expect(await spinners.first().isVisible(), "a spinner at 0.5 s").toBe(false)
    await at(900)
    expect(await spinners.first().isVisible(), "a spinner at 0.9 s").toBe(false)
    expect(await spinners.last().isVisible(), "a spinner at 0.9 s").toBe(false)
    await expect(spinners.first(), "a spinner by 2 s").toBeVisible({ timeout: 2000 })
    await expect(spinners.last()).toBeVisible()
    await settled(page)
    const layout = () =>
      page
        .locator("[data-plate], [data-lane], [data-notes-plate], [data-notes-lane]")
        .evaluateAll((els) => els.map((e) => JSON.stringify(e.getBoundingClientRect())))
    const waiting = await layout()

    // The notes come: they draw, the spinners go, and nothing has moved.
    await letGo(page, "take_notes")
    await expect(notesLane(page, "Drums").getByText("Kick", { exact: true })).toBeVisible()
    await expect(spinners).toHaveCount(0)
    await page.waitForTimeout(300)
    expect(await layout()).toEqual(waiting)
  })

  test("a notes lane's row names are 12 px", async ({ page }) => {
    await openTake2(page)
    await settled(page)
    const kick = notesLane(page, "Drums").getByText("Kick", { exact: true })
    await expect(kick).toBeVisible()
    expect((await style(kick, "font-size"))["font-size"]).toBe("12px")
    // A keyboard's are its octaves' Cs.
    const octave = notesLane(page, "Keys (Nord Stage 3 MIDI)").getByText(/^C\d$/).first()
    await expect(octave).toBeVisible()
    expect((await style(octave, "font-size"))["font-size"]).toBe("12px")
  })
})
