import {
  colour,
  EDGE,
  expect,
  keyOn,
  mixed,
  nameTake,
  openApp,
  setFake,
  settled,
  startRehearsal,
  style,
  test,
  themed,
  tileNames,
  tipLines,
} from "./app.ts"
import type { Page } from "@playwright/test"

// The recording screen is read from across the room. Nobody stands at the
// laptop while they play, so the screen is read from behind the kit: the
// take's name over a big clock, and a tile per track that lights up. A clip
// stays on its tile to the end of the take, because nobody was looking at the
// moment it happened. The page's clock is a fake one, so time can pass
// without waiting for it.

/** The second go at "Viasna", recording, both tracks at half scale. */
async function secondGo(page: Page, song = "Viasna", before = "") {
  await page.clock.install()
  await openApp(page, { before: `window.__LEVELS__ = {'Guitar': [0.5], 'Vocals': [0.5]};${before}` })
  await startRehearsal(page)
  await page.getByRole("button", { name: /Record take 1/ }).click()
  await page.getByRole("button", { name: /^Stop/ }).click()
  await nameTake(page, song)
  await page.getByRole("button", { name: /Save take/ }).click()
  await page.getByRole("button", { name: /Record take 2/ }).click()
  await expect(page.getByRole("button", { name: /^Stop/ })).toBeVisible()
  await vocalsAt(page, 50)
}

const levels = (page: Page, guitar: number, vocals: number) =>
  setFake(page, "__LEVELS__", { Guitar: [guitar], Vocals: [vocals] })

/** Until the Vocals tile shows this level: the page has polled since. */
const vocalsAt = (page: Page, level: number) =>
  expect(
    page.locator("main [role=group][aria-label='Vocals'] [data-side]").first()
  ).toHaveAttribute("data-level", String(level))

const tile = (page: Page, name: string) => page.getByRole("group", { name })
/** The take's name, big over the clock. */
const takeName = (page: Page) => page.getByRole("heading", { level: 1 })
/** The line up top, beside the red RECORDING. */
const topLine = (page: Page) => page.locator("[data-recording-line]")
/** The disk line up top, with the battery and what is wrong with the interface:
 *  one box that keeps its size whatever it says. */
const health = (page: Page) => page.locator("[data-health]")
/** The pill in the middle that said all was well, or what was not. */
const pill = (page: Page) => page.getByRole("status", { name: "Take status" })

/** CI's Linux draws the page in Liberation Sans, which has Arial's metrics
 *  and is wider than Segoe UI or San Francisco. Measured in Arial, the tiles
 *  fit or do not the same on every machine, and a squeeze only CI would have
 *  seen shows up here first. */
const wideFont = (page: Page) =>
  page.addStyleTag({ content: "html, body { font-family: Arial, sans-serif !important; }" })

/** The track names a tile cuts short: no worse than it is without the take's
 *  name over the clock, at each size checked. */
const cutNames = async (page: Page) =>
  (await tileNames(page)).filter((n) => !n.whole).map((n) => n.name)

/** How far up its side the Vocals tile's fill reaches, 0..1. */
const reach = (page: Page) =>
  page.evaluate(() => {
    const side = document.querySelector("main [role=group][aria-label='Vocals'] [data-side='1']")
    const fill = side?.querySelector("[data-fill]")
    return side && fill
      ? fill.getBoundingClientRect().height / side.getBoundingClientRect().height
      : 0
  })

/** How each tile writes its track's name: up the tile, whole, from its
 *  bottom left corner, on the lines it says it has, and on two only where it
 *  has a space to break at — "Overheads" broken into "Overhea / ds" across a
 *  narrow tile is what this replaced. Returns the ones that do not. */
const badNames = async (page: Page) =>
  (await tileNames(page))
    .map((n) => ({
      name: n.name,
      upward: n.upward,
      lines: n.lines >= 1 && n.said === n.lines && (n.lines === 1 || /\s/.test(n.text)),
      whole: n.whole,
      corner: n.corner,
    }))
    .filter((n) => !Object.values(n).every(Boolean))

test("a first take says what is recording, what clipped and what is silent", async ({ page }) => {
  // The fake holds Guitar at the top and Vocals at nothing, unless a test
  // plays its own.
  await openApp(page)
  await startRehearsal(page)
  await page.getByRole("button", { name: /Record take 1/ }).click()
  // A take nobody named says so, big: the sign that a name was forgotten.
  // Said once — "Take 1" up top as well would say it twice.
  await expect(takeName(page)).toHaveText("Take 1")
  await expect(topLine(page)).toHaveText("Recording")
  // Silent is said once an input has been quiet for a moment.
  await expect(tile(page, "Vocals")).toHaveAttribute("data-silent")
  await expect(tile(page, "Vocals")).toContainText("silent")
  // An estimate under two days keeps its about.
  await expect(
    page.getByText("Interface connected · room for about 10 h 40 min of recording", {
      exact: true,
    })
  ).toHaveCount(1)
  // Guitar at the top the whole time is one clip that has not ended, not
  // one for every poll, said on its tile and nowhere else.
  await expect(tile(page, "Guitar")).toHaveAttribute("data-clipped")
  await expect(tile(page, "Guitar")).toContainText("clipped")
  await expect(tile(page, "Guitar")).not.toContainText("clipped 2×")
  await expect(pill(page)).toHaveCount(0)
  // The clock counts minutes, not hours nobody has played yet, and a first
  // take has nothing to be measured against.
  await expect(page.getByRole("timer")).toHaveText(/^0:0\d$/)
  await expect(page.getByText("last time")).toHaveCount(0)
  await expect.poll(() => keyOn(page.getByRole("button", { name: /^Stop/ }))).toBe("Space")
  await expect(page.getByText("autosaved every 30 s", { exact: true })).toHaveCount(1)
})

test("a second go at a song is measured against the first, under the take's name", async ({
  page,
}) => {
  await secondGo(page)
  // The name, big over the clock, half its size and centred over it, so it
  // reads from as far away. The number goes up beside RECORDING.
  await expect(takeName(page)).toHaveText("Viasna 2")
  await expect(topLine(page)).toHaveText(/^Recording\s*Take 2$/)
  const shape = await page.evaluate(() => {
    const name = document.querySelector("h1")!
    const clock = document.querySelector("[role=timer]")!
    const n = name.getBoundingClientRect()
    const c = clock.getBoundingClientRect()
    return {
      half: parseFloat(getComputedStyle(name).fontSize) / parseFloat(getComputedStyle(clock).fontSize),
      offCentre: Math.abs(n.left + n.width / 2 - (c.left + c.width / 2)),
      over: c.top - n.bottom,
    }
  })
  expect(shape.half).toBeCloseTo(0.5, 1)
  expect(shape.offCentre).toBeLessThan(2)
  expect(shape.over).toBeGreaterThanOrEqual(0)
  expect(shape.over).toBeLessThan(12)

  // The song is up there already; the bar under the clock says only the time.
  await expect(page.getByText("Took 0:06 last time", { exact: true })).toHaveCount(1)
  // On a bar that fills as the band gets further into it.
  await expect(page.getByRole("progressbar", { name: "Against the last take" })).toHaveAttribute(
    "aria-valuemax",
    "6"
  )
  await expect(pill(page)).toHaveCount(0)
})

test("a long name is cut short on one line, and moves nothing", async ({ page }) => {
  await secondGo(page, "A very long name for a song about spring, summer and a little autumn")
  const name = takeName(page)
  await expect(name).toHaveText(/^A very long name .* 2$/)
  // The title is what is cut; the go beside it stays whole.
  const cut = await name.evaluate((el) => {
    const title = el.querySelector("span.truncate")!
    const go = title.nextElementSibling!.getBoundingClientRect()
    return {
      short: title.scrollWidth > title.clientWidth,
      oneLine: el.getBoundingClientRect().height < parseFloat(getComputedStyle(el).fontSize) * 1.5,
      inside: el.getBoundingClientRect().right <= window.innerWidth,
      ellipsis: getComputedStyle(title).textOverflow,
      goWhole: go.width > 0 && go.right <= window.innerWidth,
    }
  })
  expect(cut).toEqual({
    short: true,
    oneLine: true,
    inside: true,
    ellipsis: "ellipsis",
    goWhole: true,
  })
})

test("clips are counted, on the tile that clipped, and kept to the end of the take", async ({
  page,
}) => {
  await secondGo(page)
  for (let i = 0; i < 3; i++) {
    await levels(page, 0.5, 0.99)
    await vocalsAt(page, 99)
    await levels(page, 0.5, 0.5)
    await vocalsAt(page, 50)
  }
  await expect(tile(page, "Vocals")).toHaveAttribute("data-clipped")
  await expect(tile(page, "Vocals")).toContainText("clipped 3×")
  await expect(tile(page, "Guitar")).not.toHaveAttribute("data-clipped")

  // Whoever was playing at the time sees it when they look up, however much
  // later that is.
  await page.clock.fastForward(61_000)
  await vocalsAt(page, 50)
  await expect(tile(page, "Vocals")).toHaveAttribute("data-clipped")
  await expect(tile(page, "Vocals")).toContainText("clipped 3×")
  // And the clock goes on in minutes past the first.
  await expect(page.getByRole("timer")).toHaveText(/^1:0\d$/)
})

test("a quiet singer is not silent, and a dead input dims without an alarm", async ({ page }) => {
  await secondGo(page)
  const vocals = tile(page, "Vocals")
  // With the gain set for the loudest hit, whole passages sit around −48 dBFS.
  await levels(page, 0.5, 0.004)
  await vocalsAt(page, 0)
  await page.clock.fastForward(2_000)
  const polls = () =>
    page.evaluate(() => (window as unknown as { __LEVEL_POLLS__?: number }).__LEVEL_POLLS__ ?? 0)
  const now = await polls()
  await expect.poll(polls).toBeGreaterThanOrEqual(now + 2)
  await expect(vocals).not.toHaveAttribute("data-silent")

  // A singer between verses is quiet: dimmed, and nothing said about it.
  await levels(page, 0.5, 0.0005)
  await expect(vocals).toHaveAttribute("data-silent")
  await expect(page.locator("[data-notice]")).toHaveCount(0)
  await levels(page, 0.5, 0.5)
  await expect(vocals).not.toHaveAttribute("data-silent")
})

test("the fill is in dB and falls back, and the figure holds the peak", async ({ page }) => {
  await secondGo(page)
  // A band sets its gain for the loudest hit to reach about −18 dBFS, which
  // on a straight scale was an eighth of the tile.
  // From half scale it sinks there rather than drops, so it is waited for.
  await levels(page, 0.5, 0.126)
  await vocalsAt(page, 13)
  await expect.poll(() => reach(page)).toBeLessThan(0.75)
  expect(await reach(page)).toBeGreaterThan(0.65)

  // A meter rises at once and falls back at a steady rate, as on the desk:
  // dropping to each poll's level made a voice blink.
  await levels(page, 0.5, 0.5)
  await vocalsAt(page, 50)
  await expect.poll(() => reach(page)).toBeGreaterThan(0.85)
  await levels(page, 0.5, 0.0005)
  await vocalsAt(page, 0)
  expect(await reach(page)).toBeGreaterThan(0.3)
  await page.clock.fastForward(3_000)
  await expect.poll(() => reach(page)).toBeLessThan(0.05)

  // The figure is the peak the line holds, not the last poll's: that changed
  // fourteen times a second, and what the eye kept was the troughs.
  await levels(page, 0.5, 0.5)
  await vocalsAt(page, 50)
  await levels(page, 0.5, 0.126)
  await vocalsAt(page, 13)
  await expect(tile(page, "Vocals")).toContainText("-6.0 dB")
  await page.clock.fastForward(2_000)
  await expect(tile(page, "Vocals")).toContainText("-18.0 dB")
})

test("running out of disk is said on the disk line, and past an hour the clock says the hours", async ({
  page,
}) => {
  await secondGo(page)
  await levels(page, 0.5, 0.99)
  await vocalsAt(page, 99)
  await setFake(page, "__LOW_SPACE__", true)
  // Said where the free space always is, for as long as it holds: not a
  // notice over the tiles, and not instead of the clip.
  await expect(
    page.getByText("Low disk space: room for about 5 min. Free some up or finish the rehearsal.", {
      exact: true,
    })
  ).toHaveCount(1)
  await expect(page.locator("[data-notice]")).toHaveCount(0)
  await expect(pill(page)).toHaveCount(0)
  await expect(tile(page, "Vocals")).toHaveAttribute("data-clipped")
  await setFake(page, "__LOW_SPACE__", false)

  await page.clock.fastForward(3_600_000)
  await expect(page.getByRole("timer")).toHaveText(/^1:0\d:\d\d$/)
  // Two tracks give wide tiles, and the name is written the same way there:
  // one way to read a tile, whatever the band.
  expect(await badNames(page)).toEqual([])
})

test("a battery running low is said on the status line, and nothing moves", async ({ page }) => {
  await secondGo(page)
  // The row the status line shares with RECORDING: it must not grow a line.
  const row = topLine(page).locator("..")
  const before = (await row.boundingBox())!.height
  await setFake(page, "__BATTERY__", 14)
  // Said where the free space always is, as long as it holds: not a notice.
  await expect(page.getByText("Battery 14%: plug the laptop in", { exact: true })).toHaveCount(1)
  await expect(page.locator("[data-notice]")).toHaveCount(0)
  expect((await row.boundingBox())!.height).toBe(before)
  // Charged enough, or plugged in: the usual line.
  await setFake(page, "__BATTERY__", 64)
  await expect(page.getByText(/^Interface connected · room for/)).toHaveCount(1)
  await expect(page.getByText(/^Battery/)).toHaveCount(0)
  await setFake(page, "__BATTERY__", 14)
  await expect(page.getByText(/^Battery 14%/)).toHaveCount(1)
  await setFake(page, "__BATTERY__", null)
  await expect(page.getByText(/^Interface connected · room for/)).toHaveCount(1)
})

test("the recording disk line says the start screen's words", async ({ page }) => {
  await secondGo(page)
  // The start screen says "Room for about 10 h 40 min of recording"; here
  // the line leads with the interface, and the rest is the same sentence.
  await expect(health(page).getByText(/^Interface connected · room for /)).toHaveCount(1)
  await expect(
    page.getByText("Interface connected · room for about 10 h 40 min of recording", {
      exact: true,
    })
  ).toHaveCount(1)
  // Low space is the start screen's "Low disk space: room for about 5 min",
  // and what to do about it.
  await setFake(page, "__LOW_SPACE__", true)
  await expect(
    page.getByText("Low disk space: room for about 5 min. Free some up or finish the rehearsal.", {
      exact: true,
    })
  ).toHaveCount(1)
  await expect(page.getByText(/^Running out of space/)).toHaveCount(0)
  await expect(page.getByText(/^Interface connected/)).toHaveCount(0)
  await setFake(page, "__LOW_SPACE__", false)
  await expect(page.getByText(/^Interface connected · room for /)).toHaveCount(1)
})

for (const theme of ["dark", "light"] as const) {
  test(`the low disk line on the recording screen is a warning in the text colour, in the ${theme} theme`, async ({
    page,
  }) => {
    await secondGo(page, "Viasna", themed(theme))
    expect(await page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(
      theme === "dark"
    )
    await setFake(page, "__LOW_SPACE__", true)
    const words = page.getByText(/^Low disk space: room for about 5 min\./)
    await expect(words).toHaveCount(1)
    // The shared warning look (Alert's): the icon in warn, the words in the
    // text's colour. The same as on the start screen.
    expect(await style(words, "color")).toEqual({ color: await colour(page, "--foreground") })
    expect(await style(words.locator("..").locator("svg"), "color")).toEqual({
      color: await colour(page, "--warn"),
    })
    // A low battery is the same line and the same look.
    await setFake(page, "__LOW_SPACE__", false)
    await setFake(page, "__BATTERY__", 14)
    const battery = page.getByText("Battery 14%: plug the laptop in", { exact: true })
    await expect(battery).toHaveCount(1)
    expect(await style(battery, "color")).toEqual({ color: await colour(page, "--foreground") })
    expect(await style(battery.locator("..").locator("svg"), "color")).toEqual({
      color: await colour(page, "--warn"),
    })
    // Quiet when all is well.
    await setFake(page, "__BATTERY__", null)
    const fine = page.getByText(/^Interface connected · room for /)
    await expect(fine).toHaveCount(1)
    expect(await style(fine, "color")).toEqual({ color: await colour(page, "--muted-foreground") })
  })
}

test("the health line keeps its size when low space comes", async ({ page }) => {
  await secondGo(page)
  for (const width of [1180, 640]) {
    await page.setViewportSize({ width, height: 820 })
    await settled(page)
    const line = health(page)
    const said = () => line.evaluate((e) => (e as HTMLElement).innerText)
    const was = await said()
    const before = (await line.boundingBox())!
    // The longest it says is held, unseen, from the start; whatever it says
    // after that, it takes the same room.
    for (const [name, value] of [
      ["__LOW_SPACE__", true],
      ["__BATTERY__", 14],
    ] as const) {
      await setFake(page, name, value)
      await expect.poll(said, { message: `${name} at ${width}` }).not.toBe(was)
      await settled(page)
      const after = (await line.boundingBox())!
      for (const key of ["x", "y", "width", "height"] as const)
        expect(Math.abs(after[key] - before[key]), `${key} at ${width} with ${name}`).toBeLessThanOrEqual(0.5)
      await setFake(page, name, name === "__BATTERY__" ? null : false)
      await expect.poll(said, { message: `${name} gone at ${width}` }).toBe(was)
    }
  }
})

test("sixteen tracks still fit in one row, a stereo one split down the middle", async ({
  page,
}) => {
  // The XR18 has sixteen inputs and a stereo pair besides. However many of
  // them are recorded, every track is one tile of one width in one row —
  // never a second row, never a scrollbar.
  const tracks: { name: string; channel: number; stereo: boolean }[] = []
  let channel = 1
  for (const name of [
    "Kick", "Snare", "Hi-hat", "Tom 1", "Tom 2", "Floor tom", "Overheads", "Bass",
    "Guitar 1", "Guitar 2", "Keys", "Acoustic", "Vocals", "Backing 1", "Backing 2", "Sax",
  ]) {
    const stereo = name === "Overheads" || name === "Keys"
    tracks.push({ name, channel, stereo })
    channel += stereo ? 2 : 1
  }
  const lit = Object.fromEntries(
    tracks.map((t) => [t.name, t.name === "Keys" ? [0.4, 0] : t.stereo ? [0.4, 0.4] : [0.4]])
  )
  await openApp(page, {
    before: `window.__SESSION_TRACKS__ = ${JSON.stringify(tracks)};
      window.__LEVELS__ = ${JSON.stringify(lit)};`,
  })
  await wideFont(page)
  await startRehearsal(page)
  await page.getByRole("button", { name: /Record take 1/ }).click()
  await expect(page.locator("main [role=group]")).toHaveCount(16)

  for (const [width, height] of [
    [1180, 820],
    [1024, 640],
  ]) {
    await page.setViewportSize({ width, height })
    await expect
      .poll(() =>
        page.evaluate(() => {
          const tiles = [...document.querySelectorAll("main [role=group]")].map((el) =>
            el.getBoundingClientRect()
          )
          const main = document.querySelector("main")!
          const widths = tiles.map((r) => r.width)
          return {
            count: tiles.length,
            rows: new Set(tiles.map((r) => Math.round(r.top))).size,
            // A stereo tile is as wide as a mono one.
            sameWidth: Math.max(...widths) - Math.min(...widths) < 1,
            // Nothing scrolls, either way.
            inside: Math.max(...tiles.map((r) => r.right)) <= window.innerWidth,
            sideways: document.documentElement.scrollWidth > window.innerWidth,
            scrolls: main.scrollHeight > main.clientHeight + 1,
          }
        })
      , { message: `at ${width}×${height}` })
      .toEqual({ count: 16, rows: 1, sameWidth: true, inside: true, sideways: false, scrolls: false })
    expect(await badNames(page), `names at ${width}×${height}`).toEqual([])
  }

  // A stereo tile shows both sides, each on its own, so a side that has
  // gone dead shows as dead.
  const keys = tile(page, "Keys")
  await expect(keys).toHaveAttribute("data-channels", "2")
  await expect(keys.locator("[data-side]")).toHaveCount(2)
  await expect(keys.locator("[data-side='2']")).toHaveAttribute("data-level", "0")
})

test("on a small laptop the take's name leaves the tiles room for their names", async ({
  page,
}) => {
  // Eight tracks on a second go, with the bar under the clock: the tallest
  // the screen gets. The name over the clock takes no more than the pill in
  // the middle gave back.
  const tracks = ["Kick", "Snare", "Overheads", "Bass", "Guitar", "Keys", "Vocals", "Backing"].map(
    (name, i) => ({ name, channel: i + 1 })
  )
  await page.addInitScript(`window.__SESSION_TRACKS__ = ${JSON.stringify(tracks)};`)
  await secondGo(page)
  await wideFont(page)
  await expect(page.locator("main [role=group]")).toHaveCount(8)
  for (const [width, height, longest] of [
    [1366, 768, "whole"],
    // The narrowest tiles were already too short for "Overheads" here. The
    // header keeps the room of its status line from the start, and "Backing"
    // gets smaller for it.
    [1024, 640, "may be cut"],
  ] as const) {
    await page.setViewportSize({ width, height })
    await expect
      .poll(() => page.evaluate(() => {
        const main = document.querySelector("main")!
        return main.scrollHeight > main.clientHeight + 1
      }), { message: `scrolls at ${width}×${height}` })
      .toBe(false)
    const cut = await cutNames(page)
    expect(longest === "whole" ? cut : cut.filter((n) => n !== "Overheads"), `names cut short at ${width}×${height}`).toEqual([])
  }
})

test("a tile carries its track's icon in its top left corner", async ({ page }) => {
  await openApp(page, {
    before: `window.__SESSION_TRACKS__ = [{name: 'Guitar', channel: 1, icon: 'guitar-electric'},
      {name: 'Vocals', channel: 2}];`,
  })
  await startRehearsal(page)
  await page.getByRole("button", { name: /Record take 1/ }).click()
  const guitar = tile(page, "Guitar")
  const icon = guitar.locator("[data-icon]")
  await expect(icon).toHaveAttribute("data-icon", "guitar-electric")
  // None chosen: the neutral one, so every tile reads the same way.
  await expect(tile(page, "Vocals").locator("[data-icon]")).toHaveAttribute("data-icon", "other")

  const box = (await guitar.boundingBox())!
  const at = (await icon.boundingBox())!
  const name = (await guitar.locator("[data-name]").boundingBox())!
  expect(at.x - box.x).toBeLessThan(box.width / 4)
  expect(at.y - box.y).toBeLessThan(box.height / 4)
  expect(at.y + at.height).toBeLessThan(name.y)
})

// The tile itself (C8, F4, B4, B6): set apart by its fill alone, on a well;
// what comes during a take draws inside it and moves nothing; and what it has
// no room to show is in the shared tooltip, never cut or in a native title.

/** A first take, recording: Guitar held at the top, Vocals at nothing. */
async function firstTake(page: Page) {
  await openApp(page)
  await startRehearsal(page)
  await page.getByRole("button", { name: /Record take 1/ }).click()
  await expect(page.getByRole("button", { name: /^Stop/ })).toBeVisible()
  await settled(page)
}

/** A 2 px edge of `colour` on every side. */
const edgeOf = (colour: string) =>
  Object.fromEntries(EDGE.map((p) => [p, p.endsWith("color") ? colour : "2px"]))

/** Where a box stands, to the pixel's fraction. */
const at = (el: Element) => {
  const r = el.getBoundingClientRect()
  return [r.x, r.y, r.width, r.height]
}

const near = (a: number[] | null, b: number[] | null) =>
  !!a && !!b && a.every((v, i) => Math.abs(v - b[i]) <= 0.5)

test("a tile has no frame and sits on a well", async ({ page }) => {
  await firstTake(page)
  const well = await colour(page, "--well")
  expect(well, "the theme has a well").not.toBe("rgba(0, 0, 0, 0)")
  for (const name of ["Guitar", "Vocals"])
    expect(
      await style(
        tile(page, name),
        "border-top-width",
        "border-right-width",
        "border-bottom-width",
        "border-left-width",
        "background-color",
        "border-top-left-radius",
        "border-top-right-radius",
        "border-bottom-right-radius",
        "border-bottom-left-radius"
      ),
      name
    ).toEqual({
      "border-top-width": "0px",
      "border-right-width": "0px",
      "border-bottom-width": "0px",
      "border-left-width": "0px",
      "background-color": well,
      "border-top-left-radius": "8px",
      "border-top-right-radius": "8px",
      "border-bottom-right-radius": "8px",
      "border-bottom-left-radius": "8px",
    })
})

test("a clip draws an edge inside the tile and moves nothing", async ({ page }) => {
  await secondGo(page)
  await settled(page)
  const vocals = tile(page, "Vocals")
  const boxes = () =>
    vocals.evaluate((el) => {
      const box = (e: Element | null) => {
        const r = e?.getBoundingClientRect()
        return r ? [r.x, r.y, r.width, r.height] : null
      }
      return { tile: box(el), header: box(el.querySelector("[data-header]")) }
    })
  await expect(vocals.locator("[data-edge]")).toHaveCount(0)
  const before = await boxes()

  await levels(page, 0.5, 0.99)
  await vocalsAt(page, 99)
  await levels(page, 0.5, 0.5)
  await vocalsAt(page, 50)
  await expect(vocals).toHaveAttribute("data-clipped")
  const edge = vocals.locator("[data-edge='clip']")
  await expect(edge).toHaveCount(1)
  // The red at 70 %, 2 px inside the tile's own box.
  expect(await style(edge, ...EDGE)).toEqual(edgeOf(await mixed(page, "--destructive", 70)))
  expect(near(await edge.evaluate(at), await vocals.evaluate(at)), "the edge is the tile's box").toBe(true)

  const after = await boxes()
  expect(before.header, "the tile has a header").not.toBeNull()
  expect(near(after.tile, before.tile), "the tile stays").toBe(true)
  expect(near(after.header, before.header), "its header stays").toBe(true)
})

test("a held line at full scale stays inside its meter", async ({ page }) => {
  await secondGo(page)
  await settled(page)
  const vocals = tile(page, "Vocals")
  await levels(page, 0.5, 1)
  await vocalsAt(page, 100)
  // Each side's held line, against its side's box: at full scale the line is
  // the top 2 px of it, not 2 px over it, where the tile cut it off.
  const held = () =>
    vocals.locator("[data-levels] [data-side]").evaluateAll((sides) =>
      sides.map((side) => {
        const line = side.querySelector("[data-held]")?.getBoundingClientRect()
        const box = side.getBoundingClientRect()
        return line ? { top: line.top - box.top, bottom: box.bottom - line.bottom, tall: line.height } : null
      })
    )
  // Until the line has risen to the clip, from wherever it held before.
  await expect.poll(async () => (await held())[0]?.top ?? Infinity).toBeLessThan(3)
  const [line] = await held()
  expect(line!.tall, "a 2 px line").toBe(2)
  expect(line!.top, "inside the meter, at its top").toBeGreaterThanOrEqual(-0.01)
  expect(line!.top, "at its top").toBeLessThanOrEqual(0.01)
})

test("a silent tile dims at once", async ({ page }) => {
  await secondGo(page)
  const vocals = tile(page, "Vocals")
  // What is drawn on the well: the fill, the figures and the name.
  const face = vocals.locator("[data-face]")
  await expect(face).toHaveCount(1)
  await levels(page, 0.5, 0.0005)
  await expect(vocals).toHaveAttribute("data-silent")
  // Read the moment it is said: a fade would be part way.
  expect(await style(face, "opacity", "transition-duration")).toEqual({
    opacity: "0.45",
    "transition-duration": "0s",
  })
  // The well keeps its colour, so the row of tiles keeps its shape.
  expect(await style(vocals, "opacity", "transition-duration", "background-color")).toEqual({
    opacity: "1",
    "transition-duration": "0s",
    "background-color": await colour(page, "--well"),
  })
  await levels(page, 0.5, 0.5)
  await expect(vocals).not.toHaveAttribute("data-silent")
  expect(await style(face, "opacity")).toEqual({ opacity: "1" })
})

test("the header keeps the room of its status line", async ({ page }) => {
  await secondGo(page)
  await settled(page)
  const vocals = tile(page, "Vocals")
  const header = vocals.locator("[data-header]")
  const status = vocals.locator("[data-status]")
  const tall = async () => (await header.boundingBox())!.height
  const playing = await tall()
  await expect(status).toBeHidden()
  // The room is kept by nothing to read: a sounding tile does not say silent.
  await expect(vocals).not.toContainText("silent")

  await levels(page, 0.5, 0.0005)
  await expect(status).toBeVisible()
  await expect(status).toHaveText("silent")
  expect(Math.abs((await tall()) - playing), "silent").toBeLessThanOrEqual(0.5)

  for (let i = 0; i < 3; i++) {
    await levels(page, 0.5, 0.99)
    await vocalsAt(page, 99)
    await levels(page, 0.5, 0.5)
    await vocalsAt(page, 50)
  }
  await expect(status).toHaveText("clipped 3×")
  expect(Math.abs((await tall()) - playing), "clipped 3 times").toBeLessThanOrEqual(0.5)
})

test("a tile with nothing to say opens no tooltip", async ({ page }) => {
  await secondGo(page)
  await settled(page)
  // Its figure fits and it takes no notes: there is nothing to add.
  const vocals = tile(page, "Vocals")
  expect(await tipLines(page, vocals)).toEqual([])
  // Still resting on it: no tooltip, and no aria-describedby naming one
  // that is not there.
  await expect(page.getByRole("tooltip")).toHaveCount(0)
  await expect(vocals).not.toHaveAttribute("aria-describedby")
  await expect(vocals).toHaveAttribute("data-state", "closed")
})

test("a dB figure with no room hides and is in the tooltip", async ({ page }) => {
  const tracks = Array.from({ length: 16 }, (_, i) => ({ name: `Track ${i + 1}`, channel: i + 1 }))
  const lit = Object.fromEntries(tracks.map((t) => [t.name, [0.4]]))
  await page.setViewportSize({ width: 960, height: 680 })
  await openApp(page, {
    before: `window.__SESSION_TRACKS__ = ${JSON.stringify(tracks)};
      window.__LEVELS__ = ${JSON.stringify(lit)};`,
  })
  await startRehearsal(page)
  await page.getByRole("button", { name: /Record take 1/ }).click()
  await expect(page.locator("main [role=group]")).toHaveCount(16)
  await expect(tile(page, "Track 16").locator("[data-side]").first()).toHaveAttribute("data-level", "40")
  await settled(page)

  const seen = await page.evaluate(() =>
    [...document.querySelectorAll("main [role=group]")].map((t) => {
      const edge = t.getBoundingClientRect().right
      const past: string[] = []
      // What is drawn: the words, and the icons.
      const walk = document.createTreeWalker(t, NodeFilter.SHOW_TEXT)
      for (let n = walk.nextNode(); n; n = walk.nextNode()) {
        if (!n.textContent?.trim() || getComputedStyle(n.parentElement!).visibility !== "visible") continue
        const range = document.createRange()
        range.selectNodeContents(n)
        const r = range.getBoundingClientRect()
        if (r.width > 0 && r.right > edge + 0.5) past.push(n.textContent)
      }
      for (const svg of t.querySelectorAll("svg")) {
        const r = svg.getBoundingClientRect()
        if (getComputedStyle(svg).visibility === "visible" && r.width > 0 && r.right > edge + 0.5)
          past.push("an icon")
      }
      const figure = t.querySelector("[data-db]")
      return {
        name: t.getAttribute("aria-label")!,
        past,
        hidden: figure ? getComputedStyle(figure).visibility !== "visible" : null,
      }
    })
  )
  expect(seen.filter((s) => s.past.length > 0), "what runs past a tile's right edge").toEqual([])
  const hidden = seen.filter((s) => s.hidden)
  expect(hidden.length, "figures with no room").toBeGreaterThan(0)
  for (const s of hidden.slice(0, 3)) {
    const el = page.getByRole("group", { name: s.name, exact: true })
    await expect.poll(() => tipLines(page, el), { message: s.name }).toContain("-8.0 dB")
  }
})

