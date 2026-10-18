import {
  callCount,
  calls,
  colour,
  EDGE,
  expect,
  keyOn,
  nameTake,
  notices,
  openApp,
  recordTake,
  scaled,
  setFake,
  startButton,
  startRehearsal,
  style,
  test,
} from "./app.ts"
import type { Locator, Page } from "@playwright/test"

// Settings: the card, the folders, the appearance, and Under the hood.

async function openSettings(page: Page, before?: string) {
  await openApp(page, { before })
  await page.getByRole("button", { name: "Settings" }).click()
  await expect(page.locator("#input-device")).toBeVisible()
}

const group = (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true }).first()

/** The tabs, in the order the section list gives them. */
const TAB_NAMES = ["Audio", "Folders", "Marks", "Sets", "Appearance", "Under the hood"]

const CLOUD = "window.__CLOUD_DIR__ = '/Users/alex/Google Drive/Band';"

const sections = (page: Page) => page.getByRole("navigation", { name: "Settings sections" })
const tabHead = (page: Page) => page.locator("[data-tab-head]")
const tabBody = (page: Page) => page.locator("[data-tab-body]")
const tooltip = (page: Page) => page.getByRole("tooltip")
const box = async (el: Locator) => (await el.boundingBox())!
const away = (page: Page) => page.mouse.move(0, 0, { steps: 8 })

test("Settings has a way back on the keyboard too", async ({ page }) => {
  await openSettings(page)
  await expect.poll(() => keyOn(page.getByRole("button", { name: "Back" }))).toBe("Esc")
  await page.keyboard.press("Escape")
  await expect(startButton(page)).toBeVisible()
  await expect(page.locator("#input-device")).toHaveCount(0)
})

test("Settings is in groups, not one long column", async ({ page }) => {
  await openSettings(page, "window.__CLOUD_DIR__ = '/Users/alex/Google Drive/Band';")
  // It opens on Audio, with the folders not on that page.
  await expect(page.locator("#recordings-dir")).toHaveCount(0)
  for (const name of ["Audio", "Folders", "Appearance", "Under the hood"]) {
    await expect(group(page, name)).toHaveCount(1)
  }
  // The version belongs with the paths: both are what somebody quotes when
  // something has gone wrong.
  await group(page, "Under the hood").click()
  await expect(
    page.locator("[aria-label='About this copy']").getByText("0.2.0", { exact: true })
  ).toHaveCount(1)

  await group(page, "Folders").click()
  await expect(page.locator("#recordings-dir")).toHaveValue(/RehearsalRecordings/)
  await expect(page.locator("#cloud-dir")).toHaveValue(/Google Drive/)
  await expect(page.locator("#input-device")).toHaveCount(0)
  await page.getByRole("button", { name: "Choose recordings folder" }).click()
  await expect.poll(() => callCount(page, "choose_recordings_dir")).toBe(1)
})

test.describe("the frame and the section list", () => {
  /** Until a section, with the pointer away from it, has this fill: it
   *  eases to it over 200 ms after a click. */
  const filled = async (page: Page, el: Locator, fill: string, what?: string) => {
    await away(page)
    await expect
      .poll(async () => (await style(el, "background-color"))["background-color"], what)
      .toBe(fill)
  }
  const edgeClear = async (el: Locator) => {
    const edge = await style(el, ...EDGE)
    return ["top", "right", "bottom", "left"].every(
      (side) =>
        edge[`border-${side}-width`] === "0px" || edge[`border-${side}-color`] === "rgba(0, 0, 0, 0)"
    )
  }

  test("the section list is the shared rows, the chosen one grey with no frame", async ({ page }) => {
    await openSettings(page)
    const nav = sections(page)
    await expect(nav).toHaveAttribute("data-sections", "rows")
    const rows = nav.getByRole("button")
    await expect(rows).toHaveText(TAB_NAMES)
    // Each is the shared row, on a button the keys reach. Its data-slot is
    // the tip's, round it, so the row is told by Item's own class.
    for (const row of await rows.all()) {
      await expect(row).toHaveClass(/(^|\s)group\/item(\s|$)/)
      expect(await row.evaluate((e) => e.tagName)).toBe("BUTTON")
    }
    const selected = await colour(page, "--selected")
    const audio = nav.locator("[data-tab='audio']")
    await expect(audio).toHaveAttribute("aria-current", "page")
    await filled(page, audio, selected)
    expect(await edgeClear(audio)).toBe(true)
    for (const name of TAB_NAMES.slice(1)) {
      const row = rows.filter({ hasText: name })
      await expect(row, name).not.toHaveAttribute("aria-current")
      await filled(page, row, "rgba(0, 0, 0, 0)", name)
    }

    // Another chosen: it is the grey one now, and Audio is not.
    await group(page, "Folders").click()
    await expect(nav.locator("[aria-current='page']")).toHaveText("Folders")
    await filled(page, nav.locator("[data-tab='folders']"), selected)
    await filled(page, audio, "rgba(0, 0, 0, 0)")
  })

  test("the section list and the tab's head stay put while the tab scrolls", async ({ page }) => {
    await openSettings(page, CLOUD)
    await group(page, "Folders").click()
    await expect(page.locator("#cloud-dir")).toHaveValue(/Google Drive/)
    const body = tabBody(page)
    // With a cloud folder, Folders is longer than the window.
    expect(await body.evaluate((e) => e.scrollHeight > e.clientHeight)).toBe(true)
    const before = [await box(sections(page)), await box(tabHead(page))]
    await body.hover()
    await page.mouse.wheel(0, 600)
    await expect.poll(() => body.evaluate((e) => e.scrollTop)).toBeGreaterThan(0)
    expect([await box(sections(page)), await box(tabHead(page))]).toEqual(before)
    // Only the tab's body scrolls, not the page round it.
    expect(await page.locator("main").evaluate((e) => e.scrollTop)).toBe(0)
    // Its end can be reached.
    await body.evaluate((e) => (e.scrollTop = e.scrollHeight))
    await expect(page.getByText("This is also what Send starred sends.")).toBeInViewport()
  })

  test("narrower than 900 px times the scale, the sections are icons, each named, with its tip", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 960, height: 680 })
    await openSettings(page, scaled(1.5))
    const nav = sections(page)
    await expect(nav).toHaveAttribute("data-sections", "icons")
    const icons = nav.getByRole("button")
    await expect(icons).toHaveCount(TAB_NAMES.length)
    for (const [i, name] of TAB_NAMES.entries()) {
      const icon = icons.nth(i)
      await expect(icon).toHaveAccessibleName(name)
      // An icon and nothing else, 36 px square at 100 %.
      expect(await icon.evaluate((e) => (e as HTMLElement).innerText.trim()), name).toBe("")
      const b = await box(icon)
      expect(b.width, name).toBeCloseTo(54, 0)
      expect(b.height, name).toBeCloseTo(54, 0)
      // The name in the shared tip, at the icon's right, when pointed at.
      await away(page)
      await expect(tooltip(page)).toHaveCount(0)
      await icon.hover()
      await expect(tooltip(page), name).toHaveText(name)
      // It only repeats the name, so it is not read out again.
      await expect(icon, name).toHaveAccessibleDescription("")
      await expect(page.locator("[data-slot='tooltip-content']")).toHaveAttribute("data-side", "right")
    }
    await away(page)
    await expect(tooltip(page)).toHaveCount(0)

    // Tab reaches them in their order, each saying its name in the tip.
    await page.getByRole("button", { name: "Back" }).focus()
    for (const [i, name] of TAB_NAMES.entries()) {
      await page.keyboard.press("Tab")
      await expect(icons.nth(i), name).toBeFocused()
      await expect(tooltip(page), name).toHaveText(name)
    }

    // The chosen one grey, as a chosen row is.
    const audio = nav.locator("[data-tab='audio']")
    await expect(audio).toHaveAttribute("aria-current", "page")
    await filled(page, audio, await colour(page, "--selected"))
    expect(await edgeClear(audio)).toBe(true)
    // The panel gets the room the names had.
    expect((await box(tabHead(page))).width).toBeCloseTo(762, 0)

    await page.setViewportSize({ width: 1180, height: 820 })
    await expect(nav).toHaveAttribute("data-sections", "icons")
    await page.setViewportSize({ width: 1400, height: 900 })
    await expect(nav).toHaveAttribute("data-sections", "rows")
    await expect(icons).toHaveText(TAB_NAMES)

    // 960 px is room enough at 100 %.
    await page.setViewportSize({ width: 960, height: 680 })
    await expect(nav).toHaveAttribute("data-sections", "icons")
    await nav.getByRole("button", { name: "Appearance" }).click()
    await page.getByRole("radio", { name: "Scale 100 percent" }).click()
    await expect(nav).toHaveAttribute("data-sections", "rows")
    await expect(icons).toHaveText(TAB_NAMES)
  })

  test("the icons keep the new version's dot on Under the hood", async ({ page }) => {
    await page.setViewportSize({ width: 960, height: 680 })
    await openSettings(page, scaled(1.5) + "window.__LATEST__ = {version: '0.3.0'};")
    const nav = sections(page)
    await expect(nav).toHaveAttribute("data-sections", "icons")
    const hood = nav.locator("[data-tab='about']")
    await expect(hood).toHaveAccessibleName("Under the hood, a new version is out")
    // The one dot, inside the icon's box.
    await expect(nav.locator("[data-new-version]")).toHaveCount(1)
    const dot = await box(hood.locator("[data-new-version]"))
    const icon = await box(hood)
    expect(dot.x).toBeGreaterThanOrEqual(icon.x)
    expect(dot.y).toBeGreaterThanOrEqual(icon.y)
    expect(dot.x + dot.width).toBeLessThanOrEqual(icon.x + icon.width)
    expect(dot.y + dot.height).toBeLessThanOrEqual(icon.y + icon.height)
    // The tip names the tab; the news is in the name.
    await hood.hover()
    await expect(tooltip(page)).toHaveText("Under the hood")
    await expect(hood).toHaveAccessibleDescription("")
  })

  test("a window made narrower keeps the open tab, its scroll, its focus and what was typed", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1400, height: 900 })
    await openSettings(page, scaled(1.5) + CLOUD)
    const nav = sections(page)
    await expect(nav).toHaveAttribute("data-sections", "rows")
    await group(page, "Folders").click()
    const field = page.locator("#false-start")
    await expect(field).toHaveValue("30")
    await field.fill("45")
    const body = tabBody(page)
    await body.evaluate((e) => (e.scrollTop = 120))
    await expect(field).toBeFocused()
    const header = await box(page.locator("header"))
    const head = await box(tabHead(page))

    const kept = async (look: string) => {
      await expect(nav).toHaveAttribute("data-sections", look)
      await expect(nav.locator("[aria-current='page']")).toHaveAttribute("data-tab", "folders")
      await expect(tabHead(page).locator("h2")).toHaveText("Folders")
      await expect(field, look).toBeFocused()
      await expect(field, look).toHaveValue("45")
      expect(await body.evaluate((e) => e.scrollTop), look).toBe(120)
      const nowHeader = await box(page.locator("header"))
      expect(nowHeader.height, look).toBeCloseTo(header.height, 0)
      expect((await box(tabHead(page))).y, look).toBeCloseTo(head.y, 0)
    }
    await page.setViewportSize({ width: 1180, height: 820 })
    await kept("icons")
    await page.setViewportSize({ width: 1400, height: 900 })
    await kept("rows")
    // Nothing was left, so nothing was saved.
    expect(await callCount(page, "set_false_start")).toBe(0)

    // Focus on the list stays on its section as it turns to icons and back.
    const folders = nav.locator("[data-tab='folders']")
    await folders.focus()
    for (const [size, look] of [
      [{ width: 1180, height: 820 }, "icons"],
      [{ width: 1400, height: 900 }, "rows"],
    ] as const) {
      await page.setViewportSize(size)
      await expect(nav).toHaveAttribute("data-sections", look)
      await expect(folders, look).toBeFocused()
    }
  })

  test("choosing 150 % at 960x680 turns the list to icons, and the scale keeps focus", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 960, height: 680 })
    await openSettings(page)
    const nav = sections(page)
    await expect(nav).toHaveAttribute("data-sections", "rows")
    await group(page, "Appearance").click()
    const largest = page.getByRole("radio", { name: "Scale 150 percent" })
    await largest.click()
    await expect(nav).toHaveAttribute("data-sections", "icons")
    await expect(largest).toHaveAttribute("aria-checked", "true")
    await expect(largest).toBeFocused()
    // And back from the keys: the focus goes along the switch and stays.
    // Radix moves it just after each key, so each step is waited for.
    for (const percent of [130, 115, 100]) {
      await page.keyboard.press("ArrowLeft")
      await expect(page.getByRole("radio", { name: `Scale ${percent} percent` })).toBeFocused()
    }
    const usual = page.getByRole("radio", { name: "Scale 100 percent" })
    await page.keyboard.press("Space")
    await expect(nav).toHaveAttribute("data-sections", "rows")
    await expect(usual).toHaveAttribute("aria-checked", "true")
    await expect(usual).toBeFocused()
  })

  test("the screen has the air of the redone screens", async ({ page }) => {
    await openSettings(page)
    expect(await style(page.locator("header"), "padding-left", "padding-right")).toEqual({
      "padding-left": "32px",
      "padding-right": "32px",
    })
    const header = await box(page.locator("header"))
    const nav = await box(sections(page))
    const head = await box(tabHead(page))
    // The list and the tab's head 32 px under the header, side by side.
    expect(nav.y - (header.y + header.height)).toBeCloseTo(32, 0)
    expect(head.y - (header.y + header.height)).toBeCloseTo(32, 0)
    // The column is 56 rem, in the middle of the 1180 px window.
    expect(head.x + head.width - nav.x).toBeCloseTo(896, 0)
    expect(nav.x).toBeCloseTo((1180 - 896) / 2, 0)
  })

  test("the tab's head and its group rise in, 40 ms apart", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" })
    await openSettings(page)
    await group(page, "Appearance").click()
    const rise = (el: Locator) =>
      el.evaluate((e) => {
        const s = getComputedStyle(e.closest(".animate-rise")!)
        return [s.animationName, s.animationDelay]
      })
    expect(await rise(tabHead(page))).toEqual(["rise", "0s"])
    expect(await rise(page.locator("[data-settings-group]"))).toEqual(["rise", "0.04s"])
    // The header and the section list are there from the first frame.
    for (const still of [page.locator("header"), sections(page)]) {
      expect(await still.evaluate((e) => e.closest(".animate-rise") === null)).toBe(true)
    }
  })
})

test("the recording card and its rates are set in Settings", async ({ page }) => {
  await openSettings(page)
  // One audio system: choosing it would be a question with one answer.
  await expect(page.locator("#input-device-driver")).toHaveCount(0)
  await expect(page.locator("#output-device-driver")).toHaveCount(0)
  await expect(page.getByText("Each driver can offer")).toHaveCount(0)
  // Shown only where there was a choice, the outputs were a setting nobody
  // knew existed. With the system output there is nothing to pick, and it
  // says what to pick instead.
  const channels = page.locator("#output-channels")
  await expect(channels).toBeDisabled()
  await expect(channels).toContainText("1–2")
  await expect(page.getByText("choose the interface itself")).toHaveCount(1)
  await expect(page.getByRole("button", { name: "44.1 kHz" })).toHaveCount(1)
  await expect(page.getByRole("button", { name: "96 kHz" })).toHaveCount(1)

  await page.getByRole("button", { name: "48 kHz" }).click()
  await expect
    .poll(async () => (await calls(page, "set_recording_format")).at(-1)?.args.slice(1))
    .toEqual([48000, 24])
  // This card does 96 kHz only at 24 bit, so 16 stops being offered.
  await page.getByRole("button", { name: "96 kHz" }).click()
  await expect(page.getByRole("button", { name: "16 bit" })).toBeDisabled()
})

test("what cloud copies are written as, and nothing about copies without a folder", async ({
  page,
}) => {
  await openSettings(page, "window.__CLOUD_DIR__ = '/Users/alex/Google Drive/Band';")
  await group(page, "Folders").click()
  await page.getByRole("button", { name: "Lossless (FLAC)" }).click()
  await expect.poll(async () => (await calls(page, "set_cloud_format")).at(-1)?.args[0]).toBe("flac")
  await page.getByText("Send saved takes automatically").click()
  await expect.poll(async () => (await calls(page, "set_auto_publish")).at(-1)?.args[0]).toBe(true)
  await page.getByText("The original tracks").click()
  await expect.poll(async () => (await calls(page, "set_auto_publish")).at(-1)?.args[1]).toBe("tracks")

  // Turning sending off does not take the question with it: it also says
  // what Send starred sends, so it stays live, and its answer says what goes.
  await page.getByText("Send saved takes automatically").click()
  await expect(page.getByText("What gets published")).toHaveCount(1)
  await expect(page.getByRole("button", { name: "The mix" })).toBeEnabled()
  await expect(page.getByText("Every track as recorded")).toHaveCount(1)
  await expect(page.getByText("This is also what Send starred sends.")).toHaveCount(1)

  // The cloud folder is the gate. Without one none of the questions about a
  // copy have a subject: they are not greyed out but gone, and the folder
  // says the whole of it.
  await page.getByText("Forget the cloud folder").click()
  await expect.poll(() => callCount(page, "clear_cloud_dir")).toBe(1)
  const field = page.locator("#cloud-dir")
  const says = (await field.inputValue()) + " " + ((await field.getAttribute("placeholder")) ?? "")
  expect(says).toContain("Not set")
  await expect(page.getByRole("button", { name: "Lossless (FLAC)" })).toHaveCount(0)
  await expect(page.locator("#auto-publish")).toHaveCount(0)
  await expect(page.getByRole("button", { name: "The mix" })).toHaveCount(0)
  await expect(page.getByText("Only the copies are affected")).toHaveCount(0)
})

test("Appearance is one group: Theme and Scale as switches, applied at once and kept", async ({
  page,
}) => {
  await openSettings(page)
  await group(page, "Appearance").click()
  const groups = tabBody(page).locator("[data-settings-group]")
  await expect(groups).toHaveCount(1)
  // Named once, by the tab's head: the group under it has no title.
  await expect(tabHead(page).locator("h2")).toHaveText("Appearance")
  await expect(tabBody(page).getByText("Appearance")).toHaveCount(0)
  await expect(groups.locator("h3")).toHaveCount(0)

  const theme = groups.getByRole("radiogroup", { name: "Theme" })
  const scale = groups.getByRole("radiogroup", { name: "Scale" })
  for (const [name, row] of [["Theme", theme], ["Scale", scale]] as const) {
    await expect(row, name).toHaveAttribute("data-variant", "switch")
    // Its name at its left, on its line.
    const label = await box(groups.getByText(name, { exact: true }))
    const track = await box(row)
    expect(label.x + label.width, name).toBeLessThan(track.x)
    expect(label.y + label.height / 2, name).toBeCloseTo(track.y + track.height / 2, 0)
  }
  await expect(theme.getByRole("radio")).toHaveText(["Dark", "Light", "Match system"])
  await expect(scale.getByRole("radio")).toHaveText(["90%", "100%", "115%", "130%", "150%"])
  // The figures are of one width, so no scale is wider for its digits.
  expect(
    await scale
      .getByRole("radio")
      .evaluateAll((els) => els.map((e) => getComputedStyle(e.firstElementChild ?? e).fontVariantNumeric))
  ).toEqual(Array(5).fill("tabular-nums"))
  await expect(theme.getByRole("radio", { name: "Dark" })).toHaveAttribute("aria-checked", "true")
  await expect(scale.getByRole("radio", { name: "Scale 100 percent" })).toHaveAttribute(
    "aria-checked",
    "true"
  )

  // Applied at once, and choosing moves nothing beside it.
  const dark = () => page.evaluate(() => document.documentElement.classList.contains("dark"))
  const size = () => page.evaluate(() => getComputedStyle(document.documentElement).fontSize)
  const widths = () =>
    theme.getByRole("radio").evaluateAll((els) => els.map((e) => e.getBoundingClientRect().width))
  const before = await widths()
  const light = theme.getByRole("radio", { name: "Light", exact: true })
  await light.click()
  await expect.poll(dark).toBe(false)
  await expect(light).toHaveAttribute("aria-checked", "true")
  expect(await widths()).toEqual(before)
  await scale.getByRole("radio", { name: "Scale 130 percent" }).click()
  await expect.poll(size).toBe("20.8px")
  // Nothing says it waits for the next launch: it does not.
  await expect(page.getByText("next launch")).toHaveCount(0)

  // Kept by Python, so the next window opens the same.
  await page.reload()
  await page.getByRole("button", { name: "Settings" }).click()
  await group(page, "Appearance").click()
  expect(await dark()).toBe(false)
  expect(await size()).toBe("20.8px")
  await expect(page.getByRole("radio", { name: "Light", exact: true })).toHaveAttribute("aria-checked", "true")
  await expect(page.getByRole("radio", { name: "Scale 130 percent" })).toHaveAttribute(
    "aria-checked",
    "true"
  )
})

test.describe("Under the hood", () => {
  // The page someone opens when something has gone wrong: what this copy is
  // and runs on, where it keeps things, a report to paste into a message,
  // and --audio-probe for someone with no command line.
  test.use({
    viewport: { width: 1180, height: 900 },
    permissions: ["clipboard-read", "clipboard-write"],
  })

  async function underTheHood(page: Page, before = "") {
    await openApp(page, { before: "window.__CHECK_MS__ = 900;" + before })
    await page.getByRole("button", { name: "Settings" }).click()
    await page.getByRole("button", { name: "Under the hood", exact: true }).first().click()
    await expect(page.locator("[aria-label='About this copy']")).toBeVisible()
  }

  const check = (page: Page) => page.locator("[aria-label='Interface check']")

  test("says which copy this is, what it runs on, and what it records with", async ({ page }) => {
    await underTheHood(page)
    const about = page.locator("[aria-label='About this copy']")
    await expect(about).toContainText("0.2.0")
    await expect(about).toContainText("from source")
    // The audio systems on the machine, each with its devices, and the one
    // the interface records through standing out.
    const systems = page.getByRole("list", { name: "Audio systems" })
    await expect(systems.getByRole("listitem")).toHaveCount(3)
    await expect(systems).toContainText("ASIO")
    await expect(systems.getByRole("listitem").filter({ hasText: "ASIO" })).toHaveAttribute(
      "data-in-use"
    )
    await expect(page.locator("main")).toContainText("X32 USB")
  })

  // The Sound section's rows, and the value beside one of them.
  const soundRows = (page: Page) => page.locator("dl").filter({ hasText: "Audio engine" })
  const valueOf = (page: Page, label: string) =>
    soundRows(page)
      .locator("dt", { hasText: new RegExp(`^${label}$`) })
      .locator("xpath=following-sibling::dd[1]")
  const colorOf = (el: Locator) => el.evaluate((e) => getComputedStyle(e).color)

  test("says which MIDI system the app is on, in a row after the audio engine", async ({ page }) => {
    await underTheHood(page)
    // Right after the audio engine, in the same list, and nothing else added.
    await expect(soundRows(page).locator("dt")).toHaveText([
      "Recording with",
      "Playback",
      "Audio systems",
      "Audio engine",
      "MIDI",
    ])
    await expect(valueOf(page, "MIDI")).toHaveText("Windows MIDI Services")
    await expect(valueOf(page, "Audio engine")).toHaveText("PortAudio V19.7.0-devel")
  })

  test("says why there is no MIDI system, in muted grey", async ({ page }) => {
    await underTheHood(page, "window.__MIDI_ERROR__ = 'MIDI is not available: the library is missing';")
    const midi = valueOf(page, "MIDI")
    await expect(midi).toHaveText("MIDI is not available: the library is missing")
    // The grey of the label beside it, not the page's own text.
    expect(await colorOf(midi.locator("span"))).toBe(
      await colorOf(soundRows(page).locator("dt", { hasText: /^MIDI$/ }))
    )
    expect(await colorOf(midi.locator("span"))).not.toBe(await colorOf(valueOf(page, "Playback")))
  })

  test("copies a report for a bug, and opens what it points at", async ({ page }) => {
    await underTheHood(page)
    await page.getByRole("button", { name: "Copy details for a bug report" }).click()
    // Said on the button itself, whose name stays what it does.
    await expect(page.locator("button", { hasText: "Copied" })).toBeVisible()
    expect(await callCount(page, "bug_report")).toBe(1)
    expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(
      /^РЭХА 0\.2\.0/
    )

    await page.getByRole("button", { name: "Show the crash log" }).click()
    await expect.poll(async () => (await calls(page, "show_file")).map((c) => c.args)).toEqual([
      ["crash_log"],
    ])
    // The releases page opens in the browser, not in the window.
    await page.getByRole("button", { name: "Releases on GitHub" }).click()
    await expect.poll(() => callCount(page, "open_releases")).toBe(1)
  })

  test("the releases link sits under the copy button, flush with its right edge", async ({
    page,
  }) => {
    await underTheHood(page)
    const about = page.locator("[aria-label='About this copy']")
    const copy = about.getByRole("button", { name: "Copy details for a bug report" })
    const link = about.getByRole("button", { name: "All releases on GitHub" })
    // Where the link's words end, and the line they are set on: a bare link
    // is its words, with no frame or padding of its own round them.
    const words = await link.evaluate((e) => {
      const range = document.createRange()
      range.selectNodeContents(e)
      return {
        left: range.getBoundingClientRect().left,
        right: range.getBoundingClientRect().right,
        line: parseFloat(getComputedStyle(e).lineHeight),
      }
    })
    const box = (await link.boundingBox())!
    const above = (await copy.boundingBox())!
    // The words end where the copy button does.
    expect(words.right).toBeCloseTo(above.x + above.width, 1)
    // The box is the words: as wide, and one line high, 6 px under the button.
    expect(box.x).toBeCloseTo(words.left, 1)
    expect(box.x + box.width).toBeCloseTo(words.right, 1)
    expect(box.height).toBeCloseTo(words.line, 1)
    expect(box.y - (above.y + above.height)).toBeCloseTo(6, 1)
  })

  test("checks the interface, and says what came of it", async ({ page }) => {
    await underTheHood(page)
    await page.getByRole("button", { name: "Check the interface" }).click()
    // While it listens it says so, and it can be stopped.
    await expect(check(page)).toContainText("Listening to X32 USB")
    await expect(page.getByRole("button", { name: "Stop" })).toHaveCount(1)
    await expect(check(page)).toContainText("X32 USB works")
    // With each input it opened, and the ones sound came in on lit.
    const inputs = check(page).getByRole("list", { name: "Inputs with signal" })
    await expect(inputs.getByRole("listitem")).toHaveCount(6)
    await expect(inputs.locator("[data-signal]")).toHaveCount(3)

    // A card that sends only silence is not called working.
    await setFake(page, "__CHECK_RESULT__", "silent")
    await page.getByRole("button", { name: "Check again" }).click()
    await expect(check(page)).toContainText("X32 USB opens and sends, but every input is silent")
    await expect(check(page)).toHaveAttribute("data-state", "silent")

    // A card that does not work says what is wrong, what to do, and every
    // way it was tried.
    await setFake(page, "__CHECK_RESULT__", "no_sound")
    await page.getByRole("button", { name: "Check again" }).click()
    await expect(check(page)).toContainText("The card opens, but sends no sound")
    await expect(check(page)).toContainText("delivers little or nothing")
    await expect(check(page)).toContainText("The first two channels only")
  })

  test("stops a check that is taking long, and says it was stopped", async ({ page }) => {
    await underTheHood(page)
    await setFake(page, "__CHECK_MS__", 60_000)
    await page.getByRole("button", { name: "Check the interface" }).click()
    await page.getByRole("button", { name: "Stop", exact: true }).click()
    await expect(check(page)).toContainText("Stopped")
    expect(await callCount(page, "stop_interface_check")).toBe(1)
  })
})

test("an open dropdown keeps its keys", async ({ page }) => {
  // A dropdown's list is not a dialog, and the screen's keys used to reach
  // through it: Space picking an input started the rehearsal, and Escape
  // closing a list left Settings along with it.
  await openApp(page)
  await expect(startButton(page)).toBeVisible()
  await page.locator("button[role='combobox']").first().click()
  await expect(page.getByRole("listbox")).toBeVisible()
  await page.keyboard.press("Space")
  await expect(page.getByRole("listbox")).toHaveCount(0)
  expect(await callCount(page, "start_rehearsal")).toBe(0)

  await page.getByRole("button", { name: "Settings" }).click()
  await page.click("#output-device")
  await expect(page.getByRole("listbox")).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(page.getByRole("listbox")).toHaveCount(0)
  await expect(page.locator("#output-device")).toHaveCount(1)
  // And the next Escape leaves Settings.
  await page.keyboard.press("Escape")
  await expect(page.locator("#output-device")).toHaveCount(0)
})

test("says so when a card will not say which rates it takes", async ({ page }) => {
  // The list fell back to the usual three in silence, so a card that
  // answered nothing looked exactly like one that answered "all of them" —
  // which is how an XR18, with no 96 kHz and only the rate its own mixer is
  // set to, came to have every one of them on screen as though it had said
  // so itself.
  await openApp(page, { before: "window.__FORMATS_REFUSED__ = true;" })
  await page.getByRole("button", { name: "Settings" }).click()
  await page.getByRole("button", { name: "Audio", exact: true }).first().click()
  await expect(page.locator("#input-device")).toBeVisible()
  const note = page.getByRole("status").filter({ hasText: "did not say" })
  await expect(note).toHaveCount(1)
  // Without making the person read the driver's error code, and without
  // passing the usual three off as the card's own answer.
  await expect(note).not.toContainText("-9999")
  await expect(note).not.toContainText("PaErrorCode")
  await expect(note).toContainText("rather than its own")
  await expect(page.getByRole("button", { name: "44.1 kHz" })).toHaveCount(1)
})

test.describe("on a machine shaped like Windows", () => {
  // Windows without send2trash, with no encoder for compressed copies,
  // several audio systems, and a recordings folder whose path is already
  // long. Automatic sending is on with no cloud folder, set to MP3: the
  // state a config left behind by an older version can be in.
  const WINDOWS = `window.__TRASH_KIND__ = 'folder';
    window.__NO_ENCODER__ = true;
    window.__HOST_API__ = 'Windows WASAPI';
    window.__PATH_WARNING__ = "This folder's path is already 214 characters.";
    window.__AUTO_PUBLISH__ = {on: true, what: 'mix'};
    window.__CLOUD_FORMAT__ = 'mp3';`

  test("deleting names the _deleted folder rather than promising a Trash", async ({ page }) => {
    await openApp(page, { before: WINDOWS })
    await page.getByRole("button", { name: "History", exact: true }).click()
    await page.getByRole("button", { name: "Delete rehearsal Tuesday jam" }).click()
    await expect(
      notices(page, "done").filter({ hasText: "“Tuesday jam” moved to the _deleted folder." })
    ).toHaveCount(1)
    await expect(page.getByText("went to the Trash")).toHaveCount(0)
    await expect(page.getByText("went to the Recycle Bin")).toHaveCount(0)
  })

  test("the recording card is chosen by driver first", async ({ page }) => {
    await openApp(page, { before: WINDOWS })
    await page.getByRole("button", { name: "Settings" }).click()
    const driver = page.locator("#input-device-driver")
    await expect(driver).toHaveCount(1)
    // Starting from the one the saved card is on, which the card no longer
    // repeats, with a line on why the driver matters.
    await expect(driver).toContainText("MME")
    await expect(page.locator("#input-device")).not.toContainText("(MME)")
    await expect(page.getByText("Each driver can offer")).toHaveCount(1)

    await driver.click()
    expect((await page.getByRole("option").allInnerTexts()).sort()).toEqual([
      "ASIO",
      "MME",
      "Windows WASAPI",
    ])
    await page.getByRole("option", { name: "ASIO" }).click()
    await page.click("#input-device")
    await expect(page.getByRole("option")).toHaveText(["X32 USB · up to 16 ch"])
    // Changing the driver saved nothing on its own; picking the card does.
    expect((await calls(page, "set_recording_format")).some((c) => c.args[0] === 3)).toBe(false)
    await page.getByRole("option").first().click()
    await expect
      .poll(async () => (await calls(page, "set_recording_format")).at(-1)?.args[0])
      .toBe(3)
  })

  test("playback is chosen the same way, and a desk's outputs by pair or one", async ({ page }) => {
    await openApp(page, { before: WINDOWS })
    await page.getByRole("button", { name: "Settings" }).click()
    const driver = page.locator("#output-device-driver")
    await expect(driver).toHaveCount(1)
    // With nothing saved the first driver is shown.
    await expect(driver).toContainText("MME")
    await driver.click()
    expect((await page.getByRole("option").allInnerTexts()).sort()).toEqual(["ASIO", "MME"])
    await page.getByRole("option", { name: "ASIO" }).click()
    await page.click("#output-device")
    await expect(page.getByRole("option")).toHaveText(["System output", "X32 USB · 16 outputs"])
    await page.getByRole("option", { name: "X32 USB" }).click()
    await expect.poll(async () => (await calls(page, "set_output_device")).at(-1)?.args[0]).toBe(3)

    // A 16-output desk: which of its outputs the mix comes out of. Pairs
    // first, the way cards label them, then each output on its own.
    const channels = page.locator("#output-channels")
    await expect(channels).toContainText("1–2")
    await channels.click()
    const offered = await page.getByRole("option").allInnerTexts()
    expect(offered.slice(0, 3)).toEqual(["1–2", "3–4", "5–6"])
    expect(offered).not.toContain("2–3")
    expect(offered).toContain("1 (mono)")
    expect(offered).toContain("16 (mono)")
    expect(offered).toHaveLength(8 + 16)
    await expect(page.getByText("This driver offers two outputs")).toHaveCount(0)
    await page.getByRole("option", { name: "3–4", exact: true }).click()
    await expect
      .poll(async () => (await calls(page, "set_output_channels")).at(-1)?.args[0])
      .toEqual([3, 4])
    await expect(channels).toContainText("3–4")

    // The chosen card is on ASIO; switching to a driver that does not carry
    // it must not read as "System output" — nothing was unchosen.
    await driver.click()
    await page.getByRole("option", { name: "MME" }).click()
    const device = page.locator("#output-device")
    await expect(device).not.toContainText("System output")
    await expect(device).toContainText("Pick an output")

    // Through MME a desk is often a stereo device. Whoever picked it there
    // saw no outputs to choose and had no reason to look under ASIO.
    await device.click()
    await page.getByRole("option", { name: "Speakers" }).click()
    await expect(channels).toBeEnabled()
    await expect(page.getByText("This driver offers two outputs")).toHaveCount(1)
  })

  test("the folders say what this machine cannot do", async ({ page }) => {
    await openApp(page, { before: WINDOWS })
    await page.getByRole("button", { name: "Settings" }).click()
    await page.getByRole("button", { name: "Folders", exact: true }).first().click()
    await expect(page.getByText("214 characters")).toHaveCount(1)

    // Nothing offers to publish automatically while there is nowhere to
    // publish to — every take would only collect "No cloud folder chosen".
    await expect(page.locator("#auto-publish")).toHaveCount(0)
    for (const label of ["The mix", "The original tracks", "Both"]) {
      await expect(page.getByRole("button", { name: label, exact: true })).toHaveCount(0)
    }
    await expect(page.getByRole("button", { name: "Compressed (MP3)" })).toHaveCount(0)

    // Pick one and all of it appears — including what this machine has to
    // say about the format it was already set to.
    await page.getByRole("button", { name: "Choose cloud folder" }).click()
    await expect(page.getByRole("button", { name: "Compressed (MP3)" })).toBeEnabled()
    await expect(page.locator("#auto-publish")).toHaveCount(1)
    await expect(page.getByText("soundfile package is missing")).toHaveCount(1)
  })
})

test.describe("a newer version", () => {
  // Asked of GitHub by Python, at start and once a day (updates.py). Said
  // beside the version in Under the hood, with a dot on the way there: the
  // gear, then the group, since Settings opens on Audio.
  test.use({ viewport: { width: 1180, height: 900 } })

  test("is said beside the version, with a dot on the way there", async ({ page }) => {
    await openApp(page, { before: "window.__LATEST__ = {version: '0.3.0'};" })
    const gear = page.getByRole("button", { name: /^Settings/ })
    await expect(gear).toHaveAccessibleName("Settings, a new version is out")
    await gear.click()
    const hood = page.getByRole("button", { name: /^Under the hood/ }).first()
    await expect(hood).toHaveAccessibleName("Under the hood, a new version is out")
    await hood.click()
    // In a section of its own under the card, which says only what this
    // copy is: the news, what to do with it, and the switch together.
    const updates = page.getByRole("region", { name: "Updates" })
    await expect(updates).toContainText("Version 0.3.0 is out")
    await expect(updates).toContainText("You have 0.2.0")
    await expect(page.locator("[aria-label='About this copy']")).not.toContainText("is out")
    // The newest release's own page, in the browser.
    await updates.getByRole("button", { name: "What's new" }).click()
    await expect
      .poll(async () => (await calls(page, "open_releases")).map((c) => c.args))
      .toEqual([[true]])

    // Switched off, nothing is said, and the dot goes with it.
    const box = page.getByRole("checkbox", { name: "Check for new versions" })
    await expect(box).toBeChecked()
    await box.uncheck()
    await expect
      .poll(async () => (await calls(page, "set_check_updates")).map((c) => c.args))
      .toEqual([[false]])
    await expect(updates).not.toContainText(/\d is out/)
    await expect(updates).toContainText("Not checking for new versions")
    await expect(hood).toHaveAccessibleName("Under the hood")
    await box.check()
    await expect(updates).toContainText("Version 0.3.0 is out")
  })

  test("is fetched into Downloads when asked, and shown there", async ({ page }) => {
    await openApp(page, { before: "window.__LATEST__ = {version: '0.3.0'};" })
    await page.getByRole("button", { name: /^Settings/ }).click()
    await page.getByRole("button", { name: /^Under the hood/ }).first().click()
    const updates = page.getByRole("region", { name: "Updates" })
    // Only when asked: on a phone's internet at the rehearsal space, thirty
    // megabytes is not the app's to spend.
    expect(await callCount(page, "download_update")).toBe(0)
    await updates.getByRole("button", { name: "Download", exact: true }).click()
    await expect.poll(() => callCount(page, "download_update")).toBe(1)
    await expect(updates).toContainText("Downloading 0.3.0…")
    await expect(updates.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "45")
    await expect(updates.getByRole("button", { name: "Download", exact: true })).toHaveCount(0)

    await setFake(page, "__DOWNLOAD__", {
      state: "done",
      version: "0.3.0",
      fraction: 1,
      file: "RehearsalRecorder-0.3.0-windows.zip",
    })
    await expect(updates).toContainText("0.3.0 is in Downloads")
    await expect(updates).toContainText(
      "RehearsalRecorder-0.3.0-windows.zip — unpack it, close this copy and open the new one"
    )
    await updates.getByRole("button", { name: "Show in folder" }).click()
    await expect.poll(() => callCount(page, "show_update")).toBe(1)
  })

  test("says why a download failed, and tries again", async ({ page }) => {
    await openApp(page, {
      before: `window.__LATEST__ = {version: '0.3.0'};
        window.__DOWNLOAD__ = {state: 'failed', version: '0.3.0',
          error: 'The download does not match the release'};`,
    })
    await page.getByRole("button", { name: /^Settings/ }).click()
    await page.getByRole("button", { name: /^Under the hood/ }).first().click()
    const updates = page.getByRole("region", { name: "Updates" })
    await expect(updates).toContainText("Could not download 0.3.0")
    await expect(updates).toContainText("The download does not match the release")
    await updates.getByRole("button", { name: "Try again" }).click()
    await expect.poll(() => callCount(page, "download_update")).toBe(1)
    await expect(updates).toContainText("Downloading 0.3.0…")
  })

  // "The latest" only once GitHub has answered: before the first check, or in
  // a room with no internet, nobody knows.
  for (const [before, said] of [
    ["window.__BUILT__ = true; window.__CHECKED__ = true;", "This is the latest version"],
    ["window.__BUILT__ = true;", "Not checked yet"],
    ["", "Run from source, the app does not check"],
  ]) {
    test(`with none newer, there is no dot, and it says: ${said}`, async ({ page }) => {
      await openApp(page, { before })
      await expect(page.getByRole("button", { name: "Settings", exact: true })).toBeVisible()
      await page.getByRole("button", { name: "Settings" }).click()
      await group(page, "Under the hood").click()
      const updates = page.getByRole("region", { name: "Updates" })
      await expect(updates).toContainText(said)
      await expect(updates).not.toContainText(/\d is out/)
      await expect(page.getByRole("checkbox", { name: "Check for new versions" })).toBeChecked()
    })
  }
})

test("what gets published is chosen with sending off, and leaves it off", async ({ page }) => {
  // Send starred sends what it says, so it is a choice even while nothing
  // goes on its own; choosing must not switch automatic sending on.
  await openSettings(page, "window.__CLOUD_DIR__ = '/Users/alex/Google Drive/Band';")
  await group(page, "Folders").click()
  await expect(page.locator("#auto-publish")).not.toBeChecked()
  const tracks = page.getByRole("button", { name: "The original tracks" })
  await expect(tracks).toBeEnabled()
  await tracks.click()
  await expect
    .poll(async () => (await calls(page, "set_auto_publish")).at(-1)?.args)
    .toEqual([false, "tracks"])
  await expect(tracks).toHaveAttribute("aria-pressed", "true")
  await expect(page.locator("#auto-publish")).not.toBeChecked()
  await expect(page.getByText("Every track as recorded")).toHaveCount(1)
})

// The hint for the original tracks: the notes of a MIDI take go with them.
const TRACKS_HINT =
  "Every track as recorded, untouched, and the notes as .mid — for opening in a DAW later."

test("the hint for the original tracks in Settings says the notes come as .mid", async ({ page }) => {
  // The narrowest window the app is laid out for: the longer words wrap, and
  // nothing is pushed outside the window.
  await page.setViewportSize({ width: 960, height: 820 })
  await openSettings(page, "window.__CLOUD_DIR__ = '/Users/alex/Google Drive/Band';")
  await group(page, "Folders").click()
  await page.getByRole("button", { name: "The original tracks" }).click()
  const hint = page.getByText(TRACKS_HINT, { exact: true })
  await expect(hint).toHaveCount(1)
  await expect(hint).toBeVisible()
  const box = (await hint.boundingBox())!
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(960)
  expect(await hint.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
  // The other two answers did not pick up the words about notes.
  await page.getByRole("button", { name: "The mix", exact: true }).click()
  await expect(page.getByText("This is what you send people.")).toHaveCount(1)
  await expect(page.getByText("the notes as .mid")).toHaveCount(0)
  await page.getByRole("button", { name: "Both", exact: true }).click()
  await expect(page.getByText("the tracks to work from.")).toHaveCount(1)
  await expect(page.getByText("the notes as .mid")).toHaveCount(0)
})

test("the share dialog says the same about the original tracks", async ({ page }) => {
  await page.setViewportSize({ width: 960, height: 820 })
  await openApp(page, { before: "window.__CLOUD_DIR__ = '/Users/alex/Google Drive/Band';" })
  await startRehearsal(page)
  await recordTake(page, 1)
  await nameTake(page, "Verse")
  await page.getByRole("button", { name: /Save take/ }).click()
  await expect(page.getByRole("button", { name: /Record take 2/ })).toBeVisible()
  await page.locator("[aria-label='Rehearsal overview'] button[aria-label^='Take 1 Verse']").click()
  await page.getByRole("button", { name: "Copy Verse 1 to the cloud" }).click()
  const dialog = page.getByRole("dialog")
  const hint = dialog.getByText(TRACKS_HINT, { exact: true })
  await expect(hint).toHaveCount(1)
  await expect(hint).toBeVisible()
  const box = (await hint.boundingBox())!
  const frame = (await dialog.boundingBox())!
  expect(box.x).toBeGreaterThanOrEqual(frame.x)
  expect(box.x + box.width).toBeLessThanOrEqual(frame.x + frame.width)
  expect(await hint.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
  // It is the hint of that choice and of no other.
  await expect(dialog.getByRole("button", { name: "The original tracks" })).toContainText("the notes as .mid")
  await expect(dialog.getByRole("button", { name: "The mix", exact: true })).not.toContainText(".mid")
  await expect(dialog.getByRole("button", { name: "Both", exact: true })).not.toContainText(".mid")
})

test("the false-start limit is on the Folders page, saved when the field is left", async ({
  page,
}) => {
  await openSettings(page)
  await group(page, "Folders").click()
  const field = page.locator("#false-start")
  await expect(field).toHaveValue("30")
  await field.fill("45")
  await field.press("Tab")
  await expect.poll(async () => (await calls(page, "set_false_start")).at(-1)?.args).toEqual([45])
  // Kept within 5 to 120 by Python, and the field says what was kept.
  await field.fill("500")
  await field.press("Enter")
  await expect.poll(async () => (await calls(page, "set_false_start")).at(-1)?.args).toEqual([500])
  await expect(field).toHaveValue("120")
  // Emptied, it goes back to what it was.
  await field.fill("")
  await field.press("Tab")
  await expect(field).toHaveValue("120")
  expect(await callCount(page, "set_false_start")).toBe(2)
})
