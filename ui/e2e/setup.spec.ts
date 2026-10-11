import {
  callCount,
  calls,
  expect,
  keyOn,
  notices,
  openApp,
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
