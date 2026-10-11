import {
  callCount,
  calls,
  expect,
  keyOn,
  lastTimeButton,
  notices,
  openApp,
  openBandApp,
  setFake,
  startButton,
  startRehearsal,
  test,
} from "./app.ts"
import type { Locator, Page } from "@playwright/test"

// The setup screen: the band on the card's inputs, and what stops a
// rehearsal from starting on a card that cannot take it.

const MAC = "Object.defineProperty(navigator, 'platform', {get: () => 'MacIntel'});"

/** The band's four, each on its own input of the fake's 18. */
const FOUR = [
  { name: "Drums", channel: 1, icon: "drums" },
  { name: "Bass", channel: 2, icon: "bass" },
  { name: "Guitar", channel: 3, icon: "guitar-electric" },
  { name: "Vocals", channel: 4, icon: "vocals" },
]

/**
 * The setup screen with the band's four on it, and what the check hears from
 * each, by the names Python knows them by: the names they had when it began.
 */
async function openFour(page: Page, levels: Record<string, number[]> = {}, before = "") {
  await openApp(page, {
    before: `window.__MONITOR_LEVELS__ = ${JSON.stringify(levels)}; ${before}`,
    after: `window.pywebview.api.load_default_tracks = async () => ({tracks: ${JSON.stringify(FOUR)}});`,
  })
  await expect(rows(page)).toHaveCount(4)
}

/** The tracks group's rows, one per track, in the band's order. */
const rows = (page: Page) => page.locator("[data-track-row]")

/** Each row's name, top to bottom. */
const namesOf = (page: Page) =>
  rows(page)
    .locator("textarea")
    .evaluateAll((fields) => fields.map((f) => (f as HTMLTextAreaElement).value))

/** What the check says of a row's input: "signal" or "silent". */
const heard = (row: Locator, word: "signal" | "silent") =>
  row.locator("[data-check-slot='signal']").getByText(word, { exact: true })

/** How far along a row's level bar reaches, 0..1. */
const reach = (row: Locator) =>
  row.locator("[data-meter]").evaluate((m) => {
    const bar = m.firstElementChild
    return bar ? bar.getBoundingClientRect().width / m.getBoundingClientRect().width : 0
  })

/** The notice whose words are exactly `text`. */
const said = (page: Page, text: string) =>
  notices(page).filter({ has: page.locator("p", { hasText: new RegExp(`^${text.replace(/\./g, "\\.")}$`) }) })

/** Until the screen's groups have risen into place: a box measured while one
 *  rises is up to 12 px off. */
const settled = (page: Page) =>
  page.waitForFunction(() =>
    document
      .getAnimations()
      .every((a) => (a as CSSAnimation).animationName !== "rise" || a.playState === "finished")
  )

/** Waits for the check to have read the levels `n` more times. */
async function polls(page: Page, n: number) {
  const done = await callCount(page, "monitor_levels")
  await expect.poll(() => callCount(page, "monitor_levels")).toBeGreaterThanOrEqual(done + n)
}

test("says the app's name with its logo, and fills the band in from the template", async ({
  page,
}) => {
  await openApp(page)
  // The one screen that says the app's name says it with the logo; the
  // working screens after it carry neither. The logo can still be loading
  // when the screen first shows.
  await expect
    .poll(() =>
      page.evaluate(() => {
        const h = document.querySelector("header h1")
        const img = h?.querySelector<HTMLImageElement>('img[src$="favicon.svg"]')
        return !!img && img.complete && img.naturalWidth > 0 && h!.textContent!.trim() === "РЭХА"
      })
    )
    .toBe(true)
  await expect(page.locator("textarea[aria-label='Track 1 name']")).toHaveValue("Guitar")
  // Free space is always on screen. The fake's disk lasts for weeks: past
  // two days the estimate is "many hours", which "about" does not go in
  // front of.
  await expect(page.getByText("Room for many hours of recording", { exact: true })).toHaveCount(1)
  // The figures beside the interface's name, all of them shown at this width.
  await expect(
    page.getByRole("button", { name: "Change the interface and quality" }).locator("[data-shown]")
  ).toHaveText("18 inputs · 44.1 kHz · 24 bit")
  await expect.poll(() => keyOn(startButton(page))).toBe("Space")
})

test.describe("the signal check", () => {
  /** How far along the Guitar row's bar reaches, 0..1. */
  const guitarReach = (page: Page) =>
    page.evaluate(() => {
      const m = document.querySelector("[data-meter='Guitar']")
      const bar = m?.firstElementChild
      return m && bar ? bar.getBoundingClientRect().width / m.getBoundingClientRect().width : 0
    })

  test("listens over the bridge, and says which inputs have signal", async ({ page }) => {
    await openApp(page)
    await page.getByText("Check signal").click()
    await expect(page.getByText("Stop checking")).toBeVisible()
    expect(await callCount(page, "start_monitor")).toBe(1)
    // With no /api route here the meters can only be fed over the bridge,
    // which is the fallback doing its job.
    await expect.poll(() => callCount(page, "monitor_levels")).toBeGreaterThan(2)
    await expect(page.getByText("signal", { exact: true })).toHaveCount(1)
    await expect(page.getByText("silent", { exact: true })).toHaveCount(1)
    // In dB, like the recording screen and the desk: −4 dBFS is most of the
    // bar. On a straight scale it was three fifths of it.
    await expect.poll(() => guitarReach(page)).toBeGreaterThan(0.88)
    expect(await guitarReach(page)).toBeLessThan(0.97)
  })

  test("counts a quiet input as signal, and lets a bar fall back rather than drop", async ({
    page,
  }) => {
    await openApp(page)
    await page.getByText("Check signal").click()
    await expect.poll(() => guitarReach(page)).toBeGreaterThan(0.88)
    // With the gain set for the loudest hit, whole passages sit around −48.
    await setFake(page, "__MONITOR_LEVELS__", { Guitar: [0.62], Vocals: [0.004] })
    await expect(page.getByText("silent", { exact: true })).toHaveCount(0)
    // A meter rises at once and falls back at a steady rate, as on the desk:
    // dropping to each poll's level made a voice blink.
    await setFake(page, "__MONITOR_LEVELS__", { Guitar: [0.0004], Vocals: [0.004] })
    const polls = await callCount(page, "monitor_levels")
    await expect.poll(() => callCount(page, "monitor_levels")).toBeGreaterThanOrEqual(polls + 2)
    expect(await guitarReach(page)).toBeGreaterThan(0.3)
    await expect.poll(() => guitarReach(page), { timeout: 8000 }).toBeLessThan(0.05)
  })

  test("Space after clicking Check signal starts the rehearsal, not the check again", async ({
    page,
  }) => {
    await openApp(page)
    await page.getByText("Check signal").click()
    await page.getByText("Stop checking").click()
    // Clicked last, the check's button keeps focus, as a clicked button does
    // in Chromium — the browser the app runs in on Windows. Space used to
    // press it again.
    expect(await page.evaluate(() => document.activeElement?.textContent ?? "")).toContain(
      "Check signal"
    )
    const monitors = await callCount(page, "start_monitor")
    await page.keyboard.press("Space")
    await expect(page.getByRole("button", { name: /Record take 1/ })).toBeVisible()
    expect(await callCount(page, "start_monitor")).toBe(monitors)
    // With exactly what the screen said it would record with.
    const started = await calls(page, "start_rehearsal")
    expect(started).toHaveLength(1)
    expect(started[0].args[2]).toBe(44100)
    expect(started[0].args[4]).toBe(24)
  })
})

test("Escape leaves a rehearsal with nothing in it yet, without asking", async ({ page }) => {
  // Nothing recorded, so nothing to protect: one level up from an empty
  // rehearsal is what Finish does. Python takes the empty folder with it.
  await openApp(page)
  await startButton(page).click()
  await expect(page.getByRole("button", { name: /Record take 1/ })).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(startButton(page)).toBeVisible()
  await expect(page.locator("#rehearsal-name")).toBeVisible()
  expect(await callCount(page, "finish_rehearsal")).toBe(1)
})

test("Finish goes straight to the start screen; Escape asks first", async ({ page }) => {
  // Bands close the app rather than press Finish, so nothing waits after it:
  // the start screen's Last time already has the evening.
  await openApp(page, { before: "window.__TONIGHT__ = [{name: 'Pałyn', duration_sec: 200}];" })
  await startRehearsal(page, 2)
  await page.getByRole("button", { name: /^Finish/ }).click()
  await expect(startButton(page)).toBeVisible()
  await expect(page.locator("#rehearsal-name")).toBeVisible()
  expect(await callCount(page, "finish_rehearsal")).toBe(1)
  await expect(page.getByText("Rehearsal finished")).toHaveCount(0)

  await startButton(page).click()
  await expect(page.getByRole("button", { name: /Record take 2/ })).toBeVisible()
  await page.keyboard.press("Escape")
  const dialog = page.getByRole("dialog")
  await expect(dialog.getByRole("heading")).toHaveText("Finish this rehearsal?")
  await dialog.getByRole("button", { name: "Finish" }).click()
  await expect(startButton(page)).toBeVisible()
  expect(await callCount(page, "finish_rehearsal")).toBe(2)
})

test("does not guess a driver when several are offered and none is resolved", async ({ page }) => {
  // A Windows-shaped list with nothing chosen: a legacy choice dropped on
  // upgrade, or a card unplugged. Guessing the first would usually land on an
  // MME entry nobody chose.
  await openApp(page, {
    before: "window.__HOST_API__ = 'Windows WASAPI'; window.__NO_DEVICE__ = true;",
  })
  await expect(page.getByText("No interface chosen")).toHaveCount(1)
  await expect(startButton(page)).toBeDisabled()
})

test("names a track left on another card's inputs, and what would fix it", async ({ page }) => {
  // The template keeps its input numbers, and changing the interface in
  // Settings does not touch them. On a narrower card the selector went blank
  // and nothing said anything until the signal check came back with
  // paInvalidChannelCount.
  await openApp(page, { before: "window.__TRACKS_FROM_A_BIGGER_CARD__ = true;" })
  const stray = page.getByRole("status").filter({ hasText: "no input" })
  await expect(stray).toHaveCount(1)
  await expect(stray).toContainText("Vocals")
  await expect(stray).toContainText("Little USB box")
  await expect(stray).toContainText("2")
  await expect(stray).not.toContainText("Guitar")
  await expect(stray).toContainText("Pick one")
  await expect(page.locator("[aria-label='Track 2 input']")).toHaveText("No input")
  await expect(startButton(page)).toBeDisabled()

  // More tracks than the card has inputs is the other way of not fitting,
  // and the one where choosing again cannot help.
  for (let i = 0; i < 3; i++) await page.getByText("Add track").click()
  const crowded = page.getByRole("status").filter({ hasText: "not enough" })
  await expect(crowded).toHaveCount(1)
  await expect(crowded).not.toContainText("Pick one")
})

test("a track in stereo takes the input after its own, and waits when that is taken", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1180, height: 900 })
  await openApp(page)
  const input = page.locator("[aria-label='Track 1 input']")
  await expect(input).toHaveText("Input 1")

  await page.getByRole("button", { name: "Track 1 in stereo" }).click()
  await expect(input).toHaveText("No input")
  const note = page.getByRole("status").filter({ hasText: "no input" })
  await expect(note).toHaveCount(1)
  await expect(note).toContainText("Guitar")
  await expect(startButton(page)).toBeDisabled()

  // Input 3 is free: the pair 3–4 fits, and the control says so.
  await input.click()
  await page.getByRole("option", { name: "Inputs 3–4" }).click()
  await expect(input).toHaveText("Inputs 3–4")
  await expect(startButton(page)).toBeEnabled()
  // The free space is worked out for three channels, not two tracks.
  await expect
    .poll(async () => (await calls(page, "disk_estimate")).at(-1)?.args[0])
    .toBe(3)
})

test.describe("an interface switched on after the app", () => {
  // PortAudio lists the devices once, when the app starts. A desk switched
  // on afterwards is not there until somebody looks again, and until then
  // the screen says so rather than "No interface chosen", or on a Mac
  // quietly taking the laptop's own microphone.
  test.use({ viewport: { width: 1180, height: 900 } })

  test("is said to be not connected on the setup screen, until it is found", async ({ page }) => {
    await openApp(page, { before: "window.__PLUGGED_IN_LATE__ = true;" })
    const box = page.getByRole("button", { name: "Change the interface and quality" })
    await expect(box).toContainText("“X18/XR18” is not connected")
    await expect(box).not.toContainText("MacBook")
    await expect(startButton(page)).toBeDisabled()

    // Edited while the desk boots, which is when people do it.
    await page.fill("textarea[aria-label='Track 2 name']", "Bass")
    await page.getByRole("button", { name: "Look again" }).click()
    await expect(page.getByText("Still not there")).toBeVisible()
    expect(await callCount(page, "rescan_devices")).toBe(1)
    await expect(box).toContainText("not connected")

    await page.getByRole("button", { name: "Look again" }).click()
    await expect(box.locator("[data-shown]")).toContainText("18 inputs")
    await expect(box).toHaveText(/^X18\/XR18/)
    await expect(page.getByRole("button", { name: "Look again" })).toHaveCount(0)
    await expect(page.getByText("Still not there")).toHaveCount(0)
    // A name edited meanwhile is kept, because the band on screen is what
    // gets placed on the desk's inputs.
    await expect(page.locator("textarea[aria-label='Track 2 name']")).toHaveValue("Bass")
    const placed = (await calls(page, "load_default_tracks")).at(-1)?.args[0] as { name: string }[]
    expect(placed.map((t) => t.name)).toEqual(["Guitar", "Bass"])
    await expect(page.locator("[aria-label='Track 2 input']")).toHaveText("Input 2")
    await expect(startButton(page)).toBeEnabled()
  })

  test("is said to be not connected in Settings, until it is found", async ({ page }) => {
    await openApp(page, { before: "window.__PLUGGED_IN_LATE__ = true;" })
    await page.getByRole("button", { name: "Settings" }).click()
    const device = page.locator("#input-device")
    await expect(device).toContainText("“X18/XR18” is not connected")
    const asked = await callCount(page, "recording_formats")
    const listed = await callCount(page, "list_input_devices")
    await page.getByRole("button", { name: "Look again" }).click()
    await expect.poll(() => callCount(page, "rescan_devices")).toBe(1)
    await page.getByRole("button", { name: "Look again" }).click()
    await expect(page.getByText("Found “X18/XR18”")).toBeVisible()
    expect(await callCount(page, "list_input_devices")).toBeGreaterThanOrEqual(listed + 2)
    await expect(device).toHaveText(/^X18\/XR18/)
    expect(await callCount(page, "recording_formats")).toBeGreaterThan(asked)

    await page.getByRole("button", { name: "Look again" }).click()
    await expect(page.getByText("No new interfaces")).toBeVisible()
    await expect(page.getByText("Found “X18/XR18”")).toHaveCount(0)
  })
})

test.describe("a track's icon", () => {
  test.use({ viewport: { width: 1180, height: 900 } })

  test("is chosen from a grid at the start of its row, and goes with the band", async ({
    page,
  }) => {
    await openApp(page)
    const first = page.getByRole("button", { name: "Track 1 icon" })
    // None chosen yet: the neutral one, not a guess from the name.
    await expect(first).toHaveAttribute("data-icon", "other")
    await first.click()
    const grid = page.getByRole("dialog", { name: "Icon for Guitar" })
    await expect(grid.getByRole("button")).toHaveCount(14)
    await expect(grid.getByRole("button", { name: "Other" })).toHaveAttribute("aria-pressed", "true")
    await grid.getByRole("button", { name: "Electric guitar" }).click()
    await expect(grid).toHaveCount(0)
    await expect(first).toHaveAttribute("data-icon", "guitar-electric")
    await expect(first).toBeFocused()

    // From the keys: the grid opens on the one chosen, the arrows move
    // through it, Enter takes one and Escape takes none.
    const second = page.getByRole("button", { name: "Track 2 icon" })
    await second.focus()
    await page.keyboard.press("Enter")
    const vocals = page.getByRole("dialog", { name: "Icon for Vocals" })
    await expect(vocals.getByRole("button", { name: "Other" })).toBeFocused()
    await page.keyboard.press("Home")
    await expect(vocals.getByRole("button", { name: "Vocals" })).toBeFocused()
    await page.keyboard.press("ArrowDown")
    await expect(vocals.getByRole("button", { name: "Drums" })).toBeFocused()
    await page.keyboard.press("ArrowRight")
    await expect(vocals.getByRole("button", { name: "Percussion" })).toBeFocused()
    await page.keyboard.press("Escape")
    await expect(vocals).toHaveCount(0)
    await expect(second).toHaveAttribute("data-icon", "other")
    await page.keyboard.press("Enter")
    await page.keyboard.press("Home")
    await page.keyboard.press("Enter")
    await expect(second).toHaveAttribute("data-icon", "vocals")

    // Kept with the band, as stereo is: in the template and when it starts.
    await page.getByRole("button", { name: "Save as template" }).click()
    const saved = (await calls(page, "save_default_tracks")).at(-1)?.args[0] as {
      tracks: { name: string; icon?: string }[]
    }
    expect(saved.tracks.map((t) => [t.name, t.icon])).toEqual([
      ["Guitar", "guitar-electric"],
      ["Vocals", "vocals"],
    ])
    await startButton(page).click()
    const started = (await calls(page, "start_rehearsal"))[0].args[3] as { icon?: string }[]
    expect(started.map((t) => t.icon)).toEqual(["guitar-electric", "vocals"])
  })

  test("comes back from the saved band", async ({ page }) => {
    await openApp(page, { before: "window.__BAND_ICONS__ = {Guitar: 'bass'};" })
    await expect(page.getByRole("button", { name: "Track 1 icon" })).toHaveAttribute(
      "data-icon",
      "bass"
    )
  })

  test("one it does not know is drawn as the neutral one", async ({ page }) => {
    await openApp(page, { before: "window.__BAND_ICONS__ = {Guitar: 'theremin'};" })
    await expect(page.getByRole("button", { name: "Track 1 icon" })).toHaveAttribute(
      "data-icon",
      "other"
    )
  })
})

// The start screen in three groups (Alex, Q1): the past on the left, the
// tracks as one group headed by the interface they record with, and
// tonight's name in the footer beside the set and Start.
test.describe("the start screen's groups", () => {
  test("the start screen is three groups: past, tracks, tonight", async ({ page }) => {
    await openApp(page)
    await expect(page.locator("footer #rehearsal-name")).toHaveCount(1)
    const group = page.locator("[data-part='setup'] section[data-tracks]")
    const recordingWith = group.locator("[data-recording-with]")
    await expect(recordingWith).toContainText("Recording with")
    await expect(group.locator("[data-track-row]")).toHaveCount(2)
    await expect(page.locator("[data-part='past']")).toBeVisible()
    await settled(page)

    // "Recording with" is the group's first row, under its head.
    const head = (await group.getByRole("heading", { name: "Tracks" }).boundingBox())!
    const rw = (await recordingWith.boundingBox())!
    const first = (await rows(page).first().boundingBox())!
    expect(head.y + head.height).toBeLessThanOrEqual(rw.y)
    expect(rw.y + rw.height).toBeLessThanOrEqual(first.y + 0.5)

    // The past on the left of the tracks at 1180 px.
    const past = (await page.locator("[data-part='past']").boundingBox())!
    const setup = (await page.locator("[data-part='setup']").boundingBox())!
    expect(past.x + past.width).toBeLessThanOrEqual(setup.x + 0.5)

    // Tonight: the name, a rule, then the set and Start.
    await expect(page.locator("footer [data-footer-rule]")).toHaveCount(1)
    const name = (await page.locator("#rehearsal-name").boundingBox())!
    const set = (await page.locator("footer [data-set-picker]").boundingBox())!
    expect(name.x + name.width).toBeLessThan(set.x)

    // The groups come in one after another, 40 ms apart.
    const rising = await page.evaluate(() =>
      [
        document.querySelector("[data-part='past'] > *"),
        document.querySelector("section[data-tracks]"),
        document.querySelector("footer > *"),
      ].map((el) => {
        const style = el ? getComputedStyle(el) : null
        return style && [style.animationName, style.animationDelay]
      })
    )
    expect(rising).toEqual([
      ["rise", "0s"],
      ["rise", "0.04s"],
      ["rise", "0.08s"],
    ])
  })

  test("no empty band under Recording with", async ({ page }) => {
    // A track that takes notes used to keep a place above the rows for the
    // notes' own notes, empty while none was said.
    await openApp(page)
    await page
      .getByRole("group", { name: "Track 1 records" })
      .getByRole("button", { name: "Both", exact: true })
      .click()
    await expect(page.getByRole("combobox", { name: "Track 1 MIDI port" })).toBeVisible()
    await settled(page)
    const rw = (await page.locator("[data-recording-with]").boundingBox())!
    const first = (await rows(page).first().boundingBox())!
    // The first row's own line is the edge between them.
    expect(Math.abs(first.y - (rw.y + rw.height))).toBeLessThanOrEqual(1)
  })

  test("Start keeps its width while Last time plays", async ({ page }) => {
    await openApp(page, { before: "window.__FULL_EVENING__ = true;" })
    const panel = page.getByRole("complementary", { name: "Last time" })
    const play = panel.getByRole("button", { name: "Play Pałyn 2, the last go at Pałyn" })
    await expect(play).toBeVisible()
    await settled(page)
    const boxes = async () => [
      await startButton(page).boundingBox(),
      await page.locator("[data-set-picker]").boundingBox(),
    ]
    const before = await boxes()

    await play.click()
    await expect(panel.getByRole("button", { name: "Pause Pałyn 2, the last go at Pałyn" })).toBeVisible()
    expect(await boxes()).toEqual(before)
    // Its Space chip keeps its room, unseen: Space is the take's now.
    const chip = startButton(page).locator("kbd")
    await expect(chip).toHaveCount(1)
    await expect(chip).toHaveCSS("visibility", "hidden")
    expect(await keyOn(startButton(page))).toBeNull()
  })
})

// A track taken off goes at once, with Undo (B1); and the check keeps each
// reading with its own track, by its place, whatever the track is called
// now (rollout step 4).
test.describe("the tracks during the check", () => {
  test("renaming a track during the check keeps its meter and signal", async ({ page }) => {
    await openFour(page, { Drums: [0.62], Bass: [0.0004], Guitar: [0.0004], Vocals: [0.0004] })
    await page.getByRole("button", { name: "Check signal" }).click()
    const drums = rows(page).first()
    await expect.poll(() => reach(drums)).toBeGreaterThan(0.8)
    await expect(heard(drums, "signal")).toBeVisible()

    await page.getByRole("textbox", { name: "Track 1 name" }).fill("Kit")
    await polls(page, 3)
    expect(await reach(drums)).toBeGreaterThan(0.8)
    await expect(heard(drums, "signal")).toBeVisible()
    await expect(heard(rows(page).nth(1), "silent")).toBeVisible()
  })

  test("taking a track off says so and Undo puts it back in its place", async ({ page }) => {
    await openFour(page)
    await page.getByRole("button", { name: "Remove track Bass" }).click()
    await expect(rows(page)).toHaveCount(3)
    expect(await namesOf(page)).toEqual(["Drums", "Guitar", "Vocals"])
    const notice = said(page, "Bass was taken off.")
    await expect(notice).toHaveCount(1)

    await notice.getByRole("button", { name: "Undo" }).click()
    await expect(rows(page)).toHaveCount(4)
    expect(await namesOf(page)).toEqual(["Drums", "Bass", "Guitar", "Vocals"])
    await expect(page.locator("[aria-label='Track 2 input']")).toHaveText("Input 2")
    await expect(page.getByRole("button", { name: "Track 2 icon" })).toHaveAttribute("data-icon", "bass")
    await expect(notices(page)).toHaveCount(0)
  })

  test("Cmd+Z puts back the track taken off", async ({ page }) => {
    await openFour(page, {}, MAC)
    await page.getByRole("button", { name: "Remove track Bass" }).click()
    await expect(rows(page)).toHaveCount(3)
    await expect(said(page, "Bass was taken off.").locator("kbd")).toHaveText("⌘Z")
    // Not in a field, where the key would undo its typing.
    await expect(page.locator("textarea:focus, input:focus")).toHaveCount(0)

    await page.keyboard.press("Meta+z")
    await expect(rows(page)).toHaveCount(4)
    expect(await namesOf(page)).toEqual(["Drums", "Bass", "Guitar", "Vocals"])
    await expect(page.locator("[aria-label='Track 2 input']")).toHaveText("Input 2")
    await expect(notices(page)).toHaveCount(0)
  })

  test("taking a track off during the check keeps the others' meters", async ({ page }) => {
    await openFour(page, { Drums: [0.62], Bass: [0.0004], Guitar: [0.62], Vocals: [0.0004] })
    await page.getByRole("button", { name: "Check signal" }).click()
    const row = (n: number) => rows(page).nth(n - 1)
    await expect(heard(row(1), "signal")).toBeVisible()
    await expect(heard(row(3), "signal")).toBeVisible()

    await page.getByRole("button", { name: "Remove track Drums" }).click()
    await expect(rows(page)).toHaveCount(3)
    await polls(page, 3)
    // Bass, Guitar and Vocals, each with what its own input sends.
    await expect(heard(row(1), "silent")).toBeVisible()
    await expect(heard(row(2), "signal")).toBeVisible()
    await expect(heard(row(3), "silent")).toBeVisible()
    expect(await reach(row(1))).toBeLessThan(0.05)
    expect(await reach(row(2))).toBeGreaterThan(0.8)
    expect(await reach(row(3))).toBeLessThan(0.05)

    // Undo puts Drums back first, with its reading, and the others keep theirs.
    await said(page, "Drums was taken off.").getByRole("button", { name: "Undo" }).click()
    await expect(rows(page)).toHaveCount(4)
    expect(await namesOf(page)).toEqual(["Drums", "Bass", "Guitar", "Vocals"])
    await polls(page, 3)
    for (const [n, word] of [[1, "signal"], [2, "silent"], [3, "signal"], [4, "silent"]] as const)
      await expect(heard(row(n), word)).toBeVisible()
    expect(await reach(row(1))).toBeGreaterThan(0.8)
    expect(await reach(row(2))).toBeLessThan(0.05)
  })

  test("a port pulled out is said in its track's line and no row moves", async ({ page }) => {
    await openApp(page)
    await page.getByRole("textbox", { name: "Track 2 name" }).fill("Keys")
    await page
      .getByRole("group", { name: "Track 2 records" })
      .getByRole("button", { name: "MIDI", exact: true })
      .click()
    await page.getByRole("combobox", { name: "Track 2 MIDI port" }).click()
    await page.getByRole("option", { name: "Launchkey Mini MK3" }).click()
    await expect(page.getByRole("listbox")).toHaveCount(0)
    await page.getByRole("button", { name: "Check signal" }).click()
    const keys = rows(page).nth(1)
    await expect(keys.getByText("no notes")).toBeVisible({ timeout: 3000 })
    await page.mouse.move(0, 0)
    await settled(page)

    /** Every row's top and bottom, Add track's box and the footer's. */
    const layout = () =>
      page.evaluate(() => {
        const box = (el: Element | null) => {
          const b = el!.getBoundingClientRect()
          return [b.x, b.y, b.width, b.height].map((v) => Math.round(v * 2) / 2)
        }
        const add = [...document.querySelectorAll("button")].find((b) =>
          b.textContent?.includes("Add track")
        )
        return {
          rows: [...document.querySelectorAll("[data-track-row]")].map((r) => {
            const b = r.getBoundingClientRect()
            return [b.top, b.bottom].map((v) => Math.round(v * 2) / 2)
          }),
          add: box(add ?? null),
          footer: box(document.querySelector("footer")),
        }
      })
    const before = await layout()

    await setFake(page, "__MIDI_GONE__", ["Launchkey Mini MK3"])
    const gone = "Not connected. Records its notes from the moment it is plugged in."
    await expect(keys.getByRole("status").filter({ hasText: gone })).toBeVisible({ timeout: 3000 })
    expect(await layout()).toEqual(before)
  })
})

// Narrower than 68.75rem (1100 px at 100 %, 1430 at 130 %) the left part
// waits behind a Last time button in the header, before History, and opens
// as a panel from the left (Alex, Q4). The player stays the screen's, so the
// panel can close, or the window widen, with a take playing.
test.describe("the left part behind a button in a narrow window", () => {
  test.use({ viewport: { width: 1000, height: 820 } })

  /** The panel the header's Last time button opens. */
  const panel = (page: Page) => page.getByRole("dialog", { name: "Last time" })
  /** The left part, where it is beside the setup. */
  const past = (page: Page) => page.locator("[data-part='past']")

  /** The Appearance scale, as Settings keeps it: the root's font size follows. */
  const scaled = (scale: number) =>
    `window.localStorage.setItem('mock-python-config', JSON.stringify({theme:'dark', ui_scale:${scale}}));`

  /** The tracks group's width; the most the setup part gives it (its width
   *  less its padding, at most 48rem); and how wide the setup part and the
   *  screen are. */
  const tracksRoom = (page: Page) =>
    page.evaluate(() => {
      const setup = document.querySelector<HTMLElement>("[data-part='setup']")!
      const style = getComputedStyle(setup)
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize)
      const inside = setup.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
      return {
        group: document.querySelector("section[data-tracks]")!.getBoundingClientRect().width,
        most: Math.min(inside, 48 * rem),
        setup: setup.getBoundingClientRect().width,
        screen: document.querySelector("main")!.clientWidth,
      }
    })

  /** What the fake's player says: whether it plays, and where it is. */
  const playerNow = (page: Page) =>
    page.evaluate(() => {
      const w = window as unknown as {
        pywebview: { api: { player_state: () => Promise<{ playing: boolean; position: number }> } }
      }
      return w.pywebview.api.player_state()
    })

  /** What the open panel locks, as a modal does: the pointer off the page,
   *  its scroll, the screen hidden from a screen reader, anything inert. */
  const locks = (page: Page) =>
    page.evaluate(() => ({
      pointer: getComputedStyle(document.body).pointerEvents === "none",
      scroll: document.body.hasAttribute("data-scroll-locked"),
      hidden: document.querySelector("main")!.closest("[aria-hidden='true']") !== null,
      inert: document.querySelector("[inert]") !== null,
    }))

  /** Last time's button for Pałyn 2, the last go at Pałyn, in `where`. */
  const palyn = (where: Locator, does: "Play" | "Pause") =>
    where.getByRole("button", { name: `${does} Pałyn 2, the last go at Pałyn` })

  test("under 1100 px Last time opens as a side panel from the header", async ({ page }) => {
    await openApp(page, { before: "window.__FULL_EVENING__ = true;" })
    const button = lastTimeButton(page)
    await expect(button).toBeVisible()
    await expect(past(page)).toBeHidden()
    const history = page.locator("header").getByRole("button", { name: "History", exact: true })
    expect((await button.boundingBox())!.x).toBeLessThan((await history.boundingBox())!.x)
    await expect(button).toHaveAttribute("aria-expanded", "false")

    await button.click()
    await expect(button).toHaveAttribute("aria-expanded", "true")
    const sheet = panel(page)
    await expect(sheet.getByRole("complementary", { name: "Last time" })).toContainText(
      "Last time · Thu 10 Sep"
    )
    // From the left, 28rem wide.
    await expect.poll(async () => (await sheet.boundingBox())?.x).toBe(0)
    expect((await sheet.boundingBox())!.width).toBeCloseTo(28 * 16, 0)
  })

  test("Esc closes the panel and focus returns to its button", async ({ page }) => {
    await openApp(page)
    const button = lastTimeButton(page)
    const ways: [string, () => Promise<void>][] = [
      ["Esc", () => page.keyboard.press("Escape")],
      ["the close button", () => panel(page).getByRole("button", { name: "Close" }).click()],
      // Right of the panel, on the veil.
      ["the veil", () => page.mouse.click(980, 400)],
    ]
    for (const [way, close] of ways) {
      await button.click()
      await expect(panel(page), way).toBeVisible()
      await close()
      await expect(panel(page), way).toHaveCount(0)
      await expect(button, way).toBeFocused()
      await expect(button, way).toHaveAttribute("aria-expanded", "false")
    }
  })

  test("widening the window closes the panel", async ({ page }) => {
    await openApp(page, { before: "window.__FULL_EVENING__ = true;" })
    await lastTimeButton(page).click()
    await palyn(panel(page), "Play").click()
    await expect(palyn(panel(page), "Pause")).toBeVisible()
    expect(await locks(page)).toEqual({ pointer: true, scroll: true, hidden: true, inert: false })

    await page.setViewportSize({ width: 1180, height: 820 })
    await expect(panel(page)).toHaveCount(0)
    await expect(lastTimeButton(page)).toHaveCount(0)
    await expect(past(page)).toBeVisible()
    // What the panel locked goes with it.
    await expect
      .poll(() => locks(page))
      .toEqual({ pointer: false, scroll: false, hidden: false, inert: false })
    await settled(page)
    const left = (await past(page).boundingBox())!
    const setup = (await page.locator("[data-part='setup']").boundingBox())!
    expect(left.x + left.width).toBeLessThanOrEqual(setup.x + 0.5)

    // The take plays on beside the setup, and Space is still its own.
    await expect(palyn(past(page), "Pause")).toBeVisible()
    await page.keyboard.press("Space")
    await expect(palyn(past(page), "Play")).toBeVisible()
    expect((await playerNow(page)).playing).toBe(false)

    // Narrowed again, it stays shut until it is asked for.
    await page.setViewportSize({ width: 1000, height: 820 })
    await expect(lastTimeButton(page)).toHaveAttribute("aria-expanded", "false")
    await expect(panel(page)).toHaveCount(0)
  })

  test("at 130 percent the side panel takes over below 1430 px", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 820 })
    await openApp(page)
    // At 100 % the window has room for both.
    await expect(past(page)).toBeVisible()
    await expect(lastTimeButton(page)).toHaveCount(0)

    // 130 %, as Appearance sets it: on the root's font size.
    await page.evaluate(() => (document.documentElement.style.fontSize = "20.8px"))
    await expect(lastTimeButton(page)).toBeVisible()
    await expect(past(page)).toBeHidden()
    await settled(page)
    const room = await tracksRoom(page)
    expect(room.setup).toBeCloseTo(room.screen, 0)
    expect(room.group).toBeCloseTo(room.most, 0)
  })

  test("at 150 percent in the smallest window the panel takes over and nothing scrolls sideways", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 960, height: 680 })
    await openApp(page, { before: scaled(1.5) })
    await expect
      .poll(() => page.evaluate(() => getComputedStyle(document.documentElement).fontSize))
      .toBe("24px")
    await expect(lastTimeButton(page)).toBeVisible()
    await expect(past(page)).toBeHidden()
    await settled(page)
    const room = await tracksRoom(page)
    expect(room.setup).toBeCloseTo(room.screen, 0)
    expect(room.group).toBeCloseTo(room.most, 0)

    // Shell clips the page, so the document itself never scrolls: what
    // could is the screen's middle and, with the panel open, what scrolls in
    // the panel (null while there is none). A header button cut off at the
    // window's edge is looked for directly.
    const sideways = () =>
      page.evaluate(() => {
        const wider = (el: Element) => el.scrollWidth > el.clientWidth + 1
        const dialog = document.querySelector("[role='dialog']")
        const scrollers = dialog
          ? [...dialog.querySelectorAll("*")].filter((el) => getComputedStyle(el).overflowY === "auto")
          : []
        return {
          middle: wider(document.querySelector("main")!),
          panel: scrollers.length ? scrollers.some(wider) : null,
          cut: [...document.querySelectorAll("header button")].some(
            (b) => b.getBoundingClientRect().right > window.innerWidth
          ),
        }
      })
    expect(await sideways()).toEqual({ middle: false, panel: null, cut: false })

    await lastTimeButton(page).click()
    await expect(panel(page).getByRole("complementary", { name: "Last time" })).toBeVisible()
    expect(await sideways()).toEqual({ middle: false, panel: false, cut: false })
  })

  test("the header button shows Last time playing", async ({ page }) => {
    await openApp(page, { before: "window.__FULL_EVENING__ = true;" })
    const button = lastTimeButton(page)
    await expect(button).toBeVisible()
    const width = (await button.boundingBox())!.width
    await expect(button).not.toHaveAttribute("data-playing")
    await expect(button).toHaveAccessibleName("Last time")

    await button.click()
    await palyn(panel(page), "Play").click()
    await expect(palyn(panel(page), "Pause")).toBeVisible()
    // Esc is the panel's while it is open: it closes it, and the take plays on.
    await page.keyboard.press("Escape")
    await expect(panel(page)).toHaveCount(0)
    await expect(button).toHaveAttribute("data-playing")
    // The sr-only words are a box of their own, so Chromium sets them apart.
    await expect(button).toHaveAccessibleName(/^Last time ?, playing$/)
    expect((await button.boundingBox())!.width).toBe(width)
    const was = await playerNow(page)
    expect(was.playing).toBe(true)
    await expect.poll(async () => (await playerNow(page)).position).toBeGreaterThan(was.position)

    // Widened, the left part is beside the setup again, the take still
    // playing in it, never opened again.
    const opens = await callCount(page, "player_open")
    await page.setViewportSize({ width: 1180, height: 820 })
    await expect(lastTimeButton(page)).toHaveCount(0)
    await expect(palyn(past(page), "Pause")).toBeVisible()
    expect((await playerNow(page)).playing).toBe(true)
    expect(await callCount(page, "player_open")).toBe(opens)
  })

  test("after the close button Space pauses the take, after Esc it opens the panel again", async ({
    page,
  }) => {
    await openApp(page, { before: "window.__FULL_EVENING__ = true;" })
    const button = lastTimeButton(page)
    await button.click()
    await palyn(panel(page), "Play").click()
    await expect(button).toHaveAttribute("data-playing")

    // Closed with the mouse, the panel sends focus back to its button, but
    // the mouse put it there: Space is the take's, and pauses it.
    await panel(page).getByRole("button", { name: "Close" }).click()
    await expect(panel(page)).toHaveCount(0)
    await expect(button).toBeFocused()
    await page.keyboard.press("Space")
    await expect(button).not.toHaveAttribute("data-playing")
    expect((await playerNow(page)).playing).toBe(false)
    await expect(panel(page)).toHaveCount(0)
    await page.keyboard.press("Space")
    await expect(button).toHaveAttribute("data-playing")

    // Closed with Esc, focus is back on the button by the keyboard, and Space
    // presses it, as it presses any button so reached: the panel opens
    // again, and the take plays on.
    await button.click()
    await expect(panel(page)).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(panel(page)).toHaveCount(0)
    await expect(button).toBeFocused()
    await page.keyboard.press("Space")
    await expect(panel(page)).toBeVisible()
    await expect(palyn(panel(page), "Pause")).toBeVisible()
    expect((await playerNow(page)).playing).toBe(true)
  })

  test("with no rehearsal before there is no Last time button and no panel", async ({ page }) => {
    await openApp(page, { before: "window.__NO_HISTORY__ = true;" })
    await expect(startButton(page)).toBeVisible()
    await expect.poll(() => callCount(page, "last_time")).toBe(1)
    await expect(page.locator("header").getByRole("button", { name: "History", exact: true })).toBeVisible()
    await expect(lastTimeButton(page)).toHaveCount(0)
    await expect(panel(page)).toHaveCount(0)
    await expect(past(page)).toHaveCount(0)
  })
})

// Last time on the shared pieces, with the stress data's long names (Q3,
// Review Focus 4): a name keeps its width and wraps past its row, the
// figures beside it drop whole, and whatever is cut or dropped shows whole
// on hover and on keyboard focus — beside the setup at 1180 px, and in the
// panel at 960 px. The interface's name in Recording with does the same.
test.describe("Last time and long names on the shared pieces", () => {
  const KALYCHANKA = "Kalychanka (slow version for the wedding, with the long intro the bride asked for)"
  const DANCING = "Dancing barefoot on the roof of the old brewery"

  /** Last time, beside the setup. */
  const beside = (page: Page) =>
    page.locator("[data-part='past']").getByRole("complementary", { name: "Last time" })
  /** The panel the header's Last time button opens, and Last time in it. */
  const panel = (page: Page) => page.getByRole("dialog", { name: "Last time" })
  const inPanel = (page: Page) => panel(page).getByRole("complementary", { name: "Last time" })

  /** The smallest window, with Last time open in its panel. */
  async function openPanel(page: Page) {
    await page.setViewportSize({ width: 960, height: 680 })
    await lastTimeButton(page).click()
    await expect(inPanel(page)).toBeVisible()
    return inPanel(page)
  }

  /** The tip a name or a figure line shows. */
  const tip = (page: Page) => page.locator("[data-whole]")
  /** The pointer off to the window's corner, moving as a hand does: Radix
   *  keeps a tip while the pointer may be on its way into it, until it has
   *  moved somewhere else. */
  const away = (page: Page) => page.mouse.move(0, 0, { steps: 8 })

  /** A song's name in a row of Last time: the button that opens its page. */
  const songName = (past: Locator, title: string) =>
    past.getByRole("button", { name: `Open the song ${title}`, exact: true })

  test("Not played keeps the song name whole and drops figures", async ({ page }) => {
    await openBandApp(page, { stress: true })
    // Dym's ▶ plays a ★ go from another evening: its figure line is the
    // longest there is, and it used to squeeze "Dym" to "D…".
    const star = "★ Dym 2 (Tue 15 Sep)"
    const check = async (past: Locator, where: string) => {
      const row = past.getByRole("region", { name: "Not played last time" }).locator("[data-song='Dym']")
      const name = row.locator("[data-name]")
      await expect(name, where).toHaveText("Dym")
      await expect(name, where).not.toHaveAttribute("data-cut")
      expect(
        await name.evaluate((el) => el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight),
        where
      ).toBe(true)
      // In the one link look: the text's colour, underlined at rest.
      await expect(songName(past, "Dym"), where).toHaveCSS("text-decoration-line", "underline")

      const figures = row.locator("[data-figures]")
      await expect(figures, where).toHaveAttribute("data-dropped")
      const read = figures.locator(".sr-only")
      await expect(read, where).toHaveText(new RegExp(`^${star.replace(/[()]/g, "\\$&")} · Sat 19 Sep, .+ ago · 4 goes$`))
      // Dropped in order, the least needed first: how long ago, then the
      // day, then the goes, the ★ go last. The ★ is drawn, not written.
      const ago = (await read.innerText()).split(", ")[1].split(" · ")[0]
      const kept = [
        `${star} · Sat 19 Sep, ${ago} · 4 goes`,
        `${star} · Sat 19 Sep · 4 goes`,
        `${star} · 4 goes`,
        star,
        "",
      ].map((line) => line.replace("★ ", ""))
      const shown = (await figures.locator("[data-shown]").innerText()).trim()
      expect(kept.slice(1), `${where}: "${shown}"`).toContain(shown)
    }

    await check(beside(page), "beside the setup")
    await check(await openPanel(page), "in the panel")
  })

  test("a cut name shows whole on hover", async ({ page }) => {
    await openBandApp(page, { stress: true })
    // Longer than two lines of its row: cut, and whole under the pointer.
    const hover = async (past: Locator, where: string) => {
      const name = songName(past, KALYCHANKA)
      await expect(name.locator("[data-name]"), where).toHaveAttribute("data-cut")
      await name.hover()
      await expect(tip(page), where).toBeVisible()
      await expect(tip(page), where).toContainText(KALYCHANKA)
      await away(page)
      await expect(tip(page), where).toHaveCount(0)
    }
    await hover(beside(page), "beside the setup")
    await hover(await openPanel(page), "in the panel")
  })

  test("a cut name shows whole on keyboard focus, when the focus scrolls the panel", async ({
    page,
  }) => {
    // At 130 % in the smallest window, the name is below the panel's fold.
    await page.setViewportSize({ width: 960, height: 680 })
    await page.addInitScript(
      "window.localStorage.setItem('mock-python-config', JSON.stringify({theme:'dark', ui_scale:1.3}));"
    )
    await openBandApp(page, { stress: true })
    const past = await openPanel(page)
    const scroller = panel(page).locator(".overflow-y-auto")
    const name = songName(past, KALYCHANKA)
    await expect(name).not.toBeInViewport()
    expect(await scroller.evaluate((el) => el.scrollTop)).toBe(0)
    // Tab down the panel to the name, as a keyboard does: getting there
    // scrolls the panel.
    for (let i = 0; i < 80 && !(await name.evaluate((el) => el === document.activeElement)); i++)
      await page.keyboard.press("Tab")
    await expect(name).toBeFocused()
    expect(await scroller.evaluate((el) => el.scrollTop)).toBeGreaterThan(0)
    await expect(name).toBeInViewport()

    // The tip shows by the focused name, at once, and stays.
    await expect(tip(page)).toBeVisible()
    await expect(tip(page)).toContainText(KALYCHANKA)
    const by = async () => {
      const t = (await tip(page).boundingBox())!
      const n = (await name.boundingBox())!
      return {
        across: t.x < n.x + n.width && n.x < t.x + t.width,
        // Above it or under it, its arrow's length off.
        near: Math.min(Math.abs(t.y + t.height - n.y), Math.abs(n.y + n.height - t.y)) < 24,
      }
    }
    await expect.poll(by).toEqual({ across: true, near: true })
    // Still open once a closing tip would have faded (220 ms).
    const stays = async () => {
      await page.waitForTimeout(500)
      await expect(tip(page)).toBeVisible()
      await expect(tip(page)).not.toHaveAttribute("data-state", "closed")
      expect(await by()).toEqual({ across: true, near: true })
    }
    await stays()

    // The panel scrolled on round the focused name, which closes a Radix
    // tip: this one stays, by the name where it is now.
    const at = (await name.boundingBox())!.y
    await scroller.evaluate((el) => el.scrollBy(0, 40))
    await expect.poll(async () => (await name.boundingBox())!.y).toBeLessThan(at - 30)
    await expect(name).toBeFocused()
    await stays()
  })

  test("a name that takes its whole row carries its figures in its tip", async ({ page }) => {
    // Q3: dropped figures show whole on hover. A name wider than its row
    // wraps and leaves the figures no room at all, so there is nothing of
    // them to hover: the name's own tip says them, though it is not cut.
    await openBandApp(page, { stress: true })
    const check = async (past: Locator, where: string) => {
      const row = past.locator(`[data-song='${DANCING}']`)
      await expect(row.locator("[data-name]"), where).not.toHaveAttribute("data-cut")
      await expect(row.locator("[data-figures] [data-shown]"), where).toHaveText("")
      await songName(past, DANCING).hover()
      await expect(tip(page), where).toBeVisible()
      await expect(tip(page), where).toContainText(DANCING)
      await expect(tip(page), where).toContainText("2 goes · 10:10")
      await away(page)
      await expect(tip(page), where).toHaveCount(0)

      // A name with room beside it shows no tip of its own.
      await songName(past, "Zorka").hover()
      await page.waitForTimeout(700)
      await expect(tip(page), where).toHaveCount(0)
      await away(page)
    }
    await check(beside(page), "beside the setup")
    await check(await openPanel(page), "in the panel")
  })

  test("the interface's figures are said in its name's tip once none has room", async ({ page }) => {
    // At 150 % in the smallest window, the stress data's interface leaves
    // its figures no room: the name's tip says them.
    await page.setViewportSize({ width: 960, height: 680 })
    await page.addInitScript(
      "window.localStorage.setItem('mock-python-config', JSON.stringify({theme:'dark', ui_scale:1.5}));"
    )
    await openBandApp(page, { stress: true })
    const row = page.locator("[data-recording-with]")
    const name = row.getByText("Universal Audio Apollo Twin X DUO Heritage Edition", { exact: true })
    await expect(name).not.toHaveAttribute("data-cut")
    await expect(row.locator("[data-figures]")).toHaveAttribute("data-dropped")
    await expect(row.locator("[data-figures] [data-shown]")).toHaveText("")
    await name.hover()
    await expect(tip(page)).toBeVisible()
    await expect(tip(page)).toContainText("Universal Audio Apollo Twin X DUO Heritage Edition")
    await expect(tip(page)).toContainText("18 inputs · 48 kHz · 24 bit")
  })

  test("the small play button shows a spinner after one second", async ({ page }) => {
    await openApp(page, { before: "window.__FULL_EVENING__ = true;" })
    const past = page.getByRole("complementary", { name: "Last time" })
    const play = past.getByRole("button", { name: "Play Pałyn 2, the last go at Pałyn" })
    await expect(play).toBeVisible()
    // The take is slow to open: the fake holds it until it is let go.
    await page.evaluate(() => {
      const w = window as unknown as { __HOLD__?: Record<string, Promise<void>>; __LET_GO__?: () => void }
      w.__HOLD__ = { player_open: new Promise<void>((r) => (w.__LET_GO__ = r)) }
    })
    const button = past.locator("[data-song='Pałyn'] button[data-look]")
    const spinner = button.locator(".animate-spin")
    const since = Date.now()
    const at = (ms: number) => page.waitForTimeout(Math.max(0, ms - (Date.now() - since)))
    await play.click()
    await expect(button).toHaveAttribute("data-look", "loading")
    await at(500)
    expect(await spinner.count(), "a spinner at 0.5 s").toBe(0)
    await at(1500)
    expect(await spinner.count(), "a spinner at 1.5 s").toBe(1)

    await page.evaluate(() => (window as unknown as { __LET_GO__: () => void }).__LET_GO__())
    await expect(past.getByRole("button", { name: "Pause Pałyn 2, the last go at Pałyn" })).toBeVisible()
    await expect(spinner).toHaveCount(0)
  })

  test("Earlier rows open their rehearsal by keyboard", async ({ page }) => {
    await openApp(page)
    const earlier = page
      .getByRole("complementary", { name: "Last time" })
      .getByRole("region", { name: "Earlier" })
    // Each rehearsal is the one list row (Item).
    const rows = earlier.locator("[data-earlier]")
    await expect(rows).toHaveCount(3)
    for (const row of await rows.all()) await expect(row).toHaveClass(/(^| )group\/item( |$)/)
    // Read down to the heading, then Tab: the rows, in turn.
    await earlier.getByRole("heading", { name: "Earlier" }).click()
    await page.keyboard.press("Tab")
    await expect(rows.nth(0)).toBeFocused()
    await page.keyboard.press("Tab")
    await expect(rows.nth(1)).toBeFocused()
    await expect(rows.nth(1)).toContainText("First rehearsal")
    // With the shared focus ring.
    await expect(rows.nth(1)).not.toHaveCSS("box-shadow", "none")
    // A rehearsal whose folder is gone says so, quietly.
    await expect(rows.nth(2)).toContainText("Missing jam")
    await expect(rows.nth(2).getByText("Not on disk", { exact: true })).toHaveClass(/text-muted-foreground/)

    await page.keyboard.press("Enter")
    await expect(page.getByRole("heading", { name: "First rehearsal" })).toBeVisible()
    const list = page.getByRole("navigation", { name: "Rehearsals" })
    await expect(list.locator("[aria-current='true']")).toContainText("First rehearsal")
  })

  test("the Last time heading has no capitals", async ({ page }) => {
    await openApp(page)
    const past = page.getByRole("complementary", { name: "Last time" })
    const heading = past.getByRole("heading", { name: /^Last time · /i })
    await expect(heading).toHaveText(/^Last time · \w{3} \d{1,2} \w{3}, .+$/)
    await expect(heading).toHaveCSS("text-transform", "none")
    for (const name of ["Not played last time", "Earlier"])
      await expect(past.getByRole("heading", { name, exact: true }), name).toHaveCSS("text-transform", "none")
  })
})
