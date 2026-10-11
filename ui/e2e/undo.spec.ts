import {
  callCount,
  calls,
  dragRegion,
  expect,
  nameTake,
  notices,
  openApp,
  openHistory,
  recordTake,
  setFake,
  startRehearsal,
  test,
} from "./app.ts"
import type { Locator, Page } from "@playwright/test"

// Removing something happens at once (spec B1): deleting a take or a
// rehearsal, clearing false starts, discarding a take and cropping one ask
// nothing, and a notice offers it back for ten seconds, with Undo or Ctrl+Z
// (Cmd+Z on a Mac). Python keeps what went until the notice ends; the fake
// keeps it in window.__UNDOABLE__, by the token its Undo sends back.

const MAC = "Object.defineProperty(navigator, 'platform', {get: () => 'MacIntel'});"
const WINDOWS = "Object.defineProperty(navigator, 'platform', {get: () => 'Win32'});"

/** The tokens of the removals waiting for their Undo, in the fake. */
const waiting = (page: Page) =>
  page.evaluate(() => Object.keys((window as unknown as { __UNDOABLE__: object }).__UNDOABLE__))

const row = (overview: Locator, n: number) => overview.locator(`[data-take="${n}"]`)

/** The notice whose words are exactly `text`. */
const said = (page: Page, text: string) =>
  notices(page).filter({ has: page.locator("p", { hasText: new RegExp(`^${escape(text)}$`) }) })

function escape(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** History on Tuesday jam, four takes long, with Pałyn 2 starred. */
async function tuesday(page: Page, before = "") {
  await openApp(page, {
    before: `window.__FULL_EVENING__ = true; window.__STARRED__ = ['/rec/old#2']; ${before}`,
  })
  await openHistory(page)
  const overview = page.locator("[aria-label='Rehearsal overview']")
  await expect(overview).toBeVisible()
  return overview
}

/** The 🗑 on a take's row, which used to ask. */
async function deleteTake(overview: Locator, n: number, name: string) {
  await row(overview, n).hover()
  await row(overview, n).getByRole("button", { name: `Delete take ${name}` }).click()
}

/** A rehearsal started with takes in it already, on its screen. */
async function tonight(page: Page, takes: object[], before = "") {
  await openApp(page, { before: `window.__TONIGHT__ = ${JSON.stringify(takes)}; ${before}` })
  await startRehearsal(page, takes.length + 1)
  const overview = page.locator("[aria-label='Rehearsal overview']")
  await expect(overview).toBeVisible()
  return overview
}

const TWO = [
  { name: "Pałyn", duration_sec: 200 },
  { name: "Viasna", duration_sec: 180 },
]

test("deleting a take in History asks nothing, and Undo brings it back with its star", async ({
  page,
}) => {
  const overview = await tuesday(page)
  const star = overview.getByRole("button", { name: "Star Pałyn 2" })
  await expect(star).toHaveAttribute("aria-pressed", "true")
  await deleteTake(overview, 2, "Pałyn 2")
  await expect(row(overview, 2)).toHaveCount(0)
  await expect(page.getByRole("dialog")).toHaveCount(0)
  expect((await calls(page, "delete_take")).map((c) => c.args)).toEqual([["/rec/old", 2]])

  const notice = said(page, "“Pałyn 2” went to the Trash.")
  await expect(notice).toHaveCount(1)
  await notice.getByRole("button", { name: "Undo" }).click()
  await expect(overview.getByRole("button", { name: /^Take 2 Pałyn 2/ })).toBeVisible()
  await expect(star).toHaveAttribute("aria-pressed", "true")
  await expect(notice).toHaveCount(0)
  expect(await callCount(page, "undo_trash")).toBe(1)
  // Brought back, it is not sent on to the Trash when its notice would have
  // ended.
  expect(await callCount(page, "end_trash")).toBe(0)
})

test("Ctrl+Z brings a take back as Undo does", async ({ page }) => {
  const overview = await tuesday(page)
  await deleteTake(overview, 2, "Pałyn 2")
  await expect(row(overview, 2)).toHaveCount(0)
  await page.keyboard.press("Control+z")
  await expect(overview.getByRole("button", { name: /^Take 2 Pałyn 2/ })).toBeVisible()
  await expect(notices(page)).toHaveCount(0)
})

test("on a Mac Cmd+Z brings it back, and Ctrl+Z does not", async ({ page }) => {
  const overview = await tuesday(page, MAC)
  await deleteTake(overview, 2, "Pałyn 2")
  await expect(row(overview, 2)).toHaveCount(0)
  // The key on the button is the Mac's.
  await expect(said(page, "“Pałyn 2” went to the Trash.").locator("kbd")).toHaveText("⌘Z")
  await page.keyboard.press("Control+z")
  await page.waitForTimeout(200)
  expect(await callCount(page, "undo_trash")).toBe(0)
  await page.keyboard.press("Meta+z")
  await expect(overview.getByRole("button", { name: /^Take 2 Pałyn 2/ })).toBeVisible()
})

test("Ctrl+Z in the take name field is the field's own", async ({ page }) => {
  const overview = await tonight(page, TWO)
  await deleteTake(overview, 1, "Pałyn 1")
  await expect(row(overview, 1)).toHaveCount(0)
  await expect(said(page, "“Pałyn 1” went to the Trash.")).toHaveCount(1)
  await page.locator("#next-take-name").click()
  await page.keyboard.press("Control+z")
  await page.waitForTimeout(200)
  expect(await callCount(page, "undo_trash")).toBe(0)
  await expect(row(overview, 1)).toHaveCount(0)
  // Out of the field, the key is Undo's again.
  await page.keyboard.press("Escape")
  await page.keyboard.press("Control+z")
  await expect(row(overview, 1)).toBeVisible()
})

test("two deletions: Ctrl+Z brings back the second, and the first still offers Undo", async ({
  page,
}) => {
  const overview = await tuesday(page)
  await deleteTake(overview, 1, "Pałyn 1")
  await expect(row(overview, 1)).toHaveCount(0)
  await deleteTake(overview, 3, "Take 3")
  await expect(row(overview, 3)).toHaveCount(0)
  await page.mouse.move(10, 10)
  await page.keyboard.press("Control+z")
  await expect(row(overview, 3)).toBeVisible()
  await expect(row(overview, 1)).toHaveCount(0)
  const first = said(page, "“Pałyn 1” went to the Trash.")
  await expect(first.getByRole("button", { name: "Undo" })).toBeVisible()
  await expect(said(page, "“Take 3” went to the Trash.")).toHaveCount(0)
  await page.keyboard.press("Control+z")
  await expect(row(overview, 1)).toBeVisible()
})

test.describe("ten seconds", () => {
  test("the notice is there at 9 s, gone at 11 s, and what went is sent on", async ({ page }) => {
    await page.clock.install()
    const overview = await tuesday(page)
    await deleteTake(overview, 2, "Pałyn 2")
    const notice = said(page, "“Pałyn 2” went to the Trash.")
    await expect(notice).toHaveCount(1)
    await page.mouse.move(10, 10)
    const tokens = await waiting(page)
    expect(tokens).toHaveLength(1)

    await page.clock.fastForward(9000)
    await expect(notice).toHaveCount(1)
    expect(await callCount(page, "end_trash")).toBe(0)
    await page.clock.fastForward(2000)
    await expect(notice).toHaveCount(0)
    await expect
      .poll(async () => (await calls(page, "end_trash")).map((c) => c.args))
      .toEqual([tokens])
    expect(await waiting(page)).toEqual([])
    await expect(row(overview, 2)).toHaveCount(0)
  })

  test("hovered at 9 s, Undo is still offered past 11 s", async ({ page }) => {
    await page.clock.install()
    const overview = await tuesday(page)
    await deleteTake(overview, 2, "Pałyn 2")
    const notice = said(page, "“Pałyn 2” went to the Trash.")
    await page.mouse.move(10, 10)
    await page.clock.fastForward(9000)
    await notice.hover()
    await page.clock.fastForward(3000)
    await expect(notice).toHaveCount(1)
    expect(await callCount(page, "end_trash")).toBe(0)
    await page.mouse.move(10, 10)
    await page.clock.fastForward(11000)
    await expect(notice).toHaveCount(0)
    await expect.poll(() => callCount(page, "end_trash")).toBe(1)
  })
})

test("clearing false starts asks nothing, and Undo brings them all back", async ({ page }) => {
  const overview = await tonight(page, [
    { name: "Pałyn", duration_sec: 200 },
    { name: "Pałyn", duration_sec: 12 },
    { name: "Take 3", duration_sec: 8 },
  ])
  const clear = overview.getByRole("button", { name: /Clear false starts/ })
  await expect(clear).toHaveText(/Clear false starts\s*2/)
  await clear.click()
  await expect(page.getByRole("dialog")).toHaveCount(0)
  await expect(row(overview, 2)).toHaveCount(0)
  await expect(row(overview, 3)).toHaveCount(0)
  expect((await calls(page, "delete_takes")).at(-1)?.args[1]).toEqual([2, 3])
  const notice = said(page, "2 false starts went to the Trash.")
  await notice.getByRole("button", { name: "Undo" }).click()
  await expect(row(overview, 2)).toBeVisible()
  await expect(row(overview, 3)).toBeVisible()
  await expect(clear).toHaveText(/Clear false starts\s*2/)
})

test("one false start cleared is said as one", async ({ page }) => {
  const overview = await tonight(page, [
    { name: "Pałyn", duration_sec: 200 },
    { name: "Take 2", duration_sec: 8 },
  ])
  await overview.getByRole("button", { name: /Clear false starts/ }).click()
  await expect(said(page, "1 false start went to the Trash.")).toHaveCount(1)
})

test.describe("on the screen after a take", () => {
  const title = (page: Page) => page.locator("[data-take-summary] h2")

  test("Esc leaves it, and Undo opens it again as it was left", async ({ page }) => {
    await openApp(page)
    await startRehearsal(page)
    await recordTake(page)
    await nameTake(page, "Sonca")
    await expect(title(page)).toHaveText("Sonca 1")
    await page.getByRole("button", { name: "Add marker" }).click()
    await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click()
    await expect(page.getByRole("button", { name: /^Remove marker at/ })).toHaveCount(1)

    await page.keyboard.press("Escape")
    await expect(title(page)).toHaveCount(0)
    await expect(page.getByRole("button", { name: /Record take 2/ })).toBeVisible()
    expect(await callCount(page, "discard_take")).toBe(1)
    await said(page, "“Sonca 1” went to the Trash.").getByRole("button", { name: "Undo" }).click()

    await expect(title(page)).toHaveText("Sonca 1")
    await expect(page.getByRole("button", { name: /^Remove marker at/ })).toHaveCount(1)
    await page.getByRole("button", { name: /Save take/ }).click()
    await expect.poll(() => callCount(page, "keep_take")).toBe(1)
    const kept = (await calls(page, "keep_take"))[0].args
    expect(kept[2]).toBe("Sonca")
    expect(kept[5]).toHaveLength(1)
  })

  test("starting the next take ends the offer, and the take goes on to the Trash", async ({
    page,
  }) => {
    await openApp(page)
    await startRehearsal(page)
    await recordTake(page)
    await page.getByRole("button", { name: /^Discard/ }).click()
    const notice = said(page, "“Take 1” went to the Trash.")
    await expect(notice).toHaveCount(1)
    const tokens = await waiting(page)
    await page.getByRole("button", { name: /Record take 2/ }).click()
    await expect(page.getByRole("button", { name: /^Stop/ })).toBeVisible()
    await expect(notice).toHaveCount(0)
    await expect
      .poll(async () => (await calls(page, "end_trash")).map((c) => c.args))
      .toEqual([tokens])
  })

  test("finishing the rehearsal ends the offer too", async ({ page }) => {
    await openApp(page)
    await startRehearsal(page)
    await recordTake(page)
    await page.getByRole("button", { name: /^Discard/ }).click()
    const notice = said(page, "“Take 1” went to the Trash.")
    await expect(notice).toHaveCount(1)
    await page.getByRole("button", { name: /^Finish/ }).click()
    await expect(page.getByRole("button", { name: /Start rehearsal/ })).toBeVisible()
    await expect(notice).toHaveCount(0)
    await expect.poll(() => callCount(page, "end_trash")).toBe(1)
  })

  test("a crop's Undo gives back the take and the marks it cut off", async ({ page }) => {
    await openApp(page)
    await startRehearsal(page)
    await recordTake(page)
    // A mark at the start, outside the part kept.
    await page.getByRole("button", { name: "Add marker" }).click()
    await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click()
    await expect(page.getByRole("button", { name: /^Remove marker at/ })).toHaveCount(1)

    await dragRegion(page, 0.25, 0.75)
    await page.getByRole("button", { name: "Crop to the region" }).click()
    await expect(page.getByRole("dialog")).toHaveCount(0)
    await expect(page.locator("span", { hasText: "/ 0:03" }).first()).toBeVisible()
    await expect(page.getByRole("button", { name: /^Remove marker at/ })).toHaveCount(0)
    const notice = said(page, "“Take 1” is cropped. The uncut take went to the Trash.")
    await notice.getByRole("button", { name: "Undo" }).click()
    await expect(page.locator("span", { hasText: "/ 0:06" }).first()).toBeVisible()
    await expect(page.getByRole("button", { name: /^Remove marker at/ })).toHaveCount(1)
  })

  test("saving the take ends its crop's offer", async ({ page }) => {
    await openApp(page)
    await startRehearsal(page)
    await recordTake(page)
    await dragRegion(page, 0.25, 0.75)
    await page.getByRole("button", { name: "Crop to the region" }).click()
    const notice = said(page, "“Take 1” is cropped. The uncut take went to the Trash.")
    await expect(notice).toHaveCount(1)
    const tokens = await waiting(page)
    await page.getByRole("button", { name: /Save take/ }).click()
    await expect(page.getByRole("button", { name: /Record take 2/ })).toBeVisible()
    await expect(notice).toHaveCount(0)
    await expect
      .poll(async () => (await calls(page, "end_trash")).map((c) => c.args))
      .toEqual([tokens])
  })
})

test("a crop asks nothing, and Undo gives back the take's old length", async ({ page }) => {
  await openApp(page)
  await startRehearsal(page)
  await recordTake(page)
  await nameTake(page, "Pałyn")
  await page.getByRole("button", { name: /Save take/ }).click()
  await page.locator("[aria-label='Rehearsal overview'] button[aria-label^='Take 1 Pałyn']").click()
  await expect(page.locator("span", { hasText: "/ 0:06" }).first()).toBeVisible()
  await dragRegion(page, 0.25, 0.75)
  await page.getByRole("button", { name: "Crop to the region" }).click()
  await expect(page.getByRole("dialog")).toHaveCount(0)
  await expect(page.locator("span", { hasText: "/ 0:03" }).first()).toBeVisible()
  const notice = said(page, "“Pałyn 1” is cropped. The uncut take went to the Trash.")
  await notice.getByRole("button", { name: "Undo" }).click()
  await expect(page.locator("span", { hasText: "/ 0:06" }).first()).toBeVisible()
  await expect(notice).toHaveCount(0)
})

test("on Windows it went to the Recycle Bin", async ({ page }) => {
  const overview = await tuesday(page, WINDOWS)
  await deleteTake(overview, 2, "Pałyn 2")
  await expect(said(page, "“Pałyn 2” went to the Recycle Bin.")).toHaveCount(1)
  await expect(said(page, "“Pałyn 2” went to the Recycle Bin.").locator("kbd")).toHaveText(
    "Ctrl+Z"
  )
})

test("with no Trash on the machine it moved to the _deleted folder", async ({ page }) => {
  const overview = await tuesday(page, `${WINDOWS} window.__TRASH_KIND__ = 'folder';`)
  await deleteTake(overview, 2, "Pałyn 2")
  await expect(said(page, "“Pałyn 2” moved to the _deleted folder.")).toHaveCount(1)
})

test("deleting a rehearsal asks nothing, and Undo lists it again", async ({ page }) => {
  const list = await (async () => {
    await openApp(page)
    return openHistory(page)
  })()
  await expect(list.getByRole("button", { name: /^Tuesday jam/ })).toHaveCount(1)
  await page.getByRole("button", { name: "Delete rehearsal Tuesday jam" }).click()
  await expect(page.getByRole("dialog")).toHaveCount(0)
  await expect(list.getByRole("button", { name: /^Tuesday jam/ })).toHaveCount(0)
  await said(page, "“Tuesday jam” went to the Trash.").getByRole("button", { name: "Undo" }).click()
  await expect(list.getByRole("button", { name: /^Tuesday jam/ })).toHaveCount(1)
  await expect(page.getByRole("heading", { name: "Tuesday jam" })).toBeVisible()
})

test("with the Rename take dialog open, Ctrl+Z brings nothing back", async ({ page }) => {
  const overview = await tuesday(page)
  await deleteTake(overview, 2, "Pałyn 2")
  await expect(row(overview, 2)).toHaveCount(0)
  await row(overview, 1).hover()
  await row(overview, 1).getByRole("button", { name: "Rename take Pałyn 1" }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByRole("button", { name: "Cancel" }).focus()
  await page.keyboard.press("Control+z")
  await page.waitForTimeout(200)
  expect(await callCount(page, "undo_trash")).toBe(0)
  await expect(dialog).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(dialog).toHaveCount(0)
  await page.keyboard.press("Control+z")
  await expect(row(overview, 2)).toBeVisible()
})

test("during a take Ctrl+Z brings nothing back", async ({ page }) => {
  const overview = await tonight(page, TWO)
  await deleteTake(overview, 1, "Pałyn 1")
  await expect(row(overview, 1)).toHaveCount(0)
  await page.getByRole("button", { name: /Record take 3/ }).click()
  await expect(page.getByRole("button", { name: /^Stop/ })).toBeVisible()
  await page.keyboard.press("Control+z")
  await page.waitForTimeout(200)
  expect(await callCount(page, "undo_trash")).toBe(0)
  await expect(said(page, "“Pałyn 1” went to the Trash.")).toHaveCount(1)
})

test("discarding the last unsaved take leaves the list, and Undo opens it again", async ({
  page,
}) => {
  await openApp(page, {
    before: `window.__DRAFTS__ = [{dir: '/rec/old/_drafts/take 4', name: 'take 4',
      tracks: ['Guitar', 'Vocals'], duration_sec: 95,
      rehearsal_folder: '/rec/old', rehearsal_name: 'Tuesday jam',
      created_at: '2026-09-10T19:00:00'}];`,
  })
  await expect(page.getByText("Unsaved takes found")).toBeVisible()
  await page.getByRole("button", { name: "Discard" }).click()
  await expect(page.getByRole("dialog")).toHaveCount(0)
  await expect(page.getByText("Unsaved takes found")).toHaveCount(0)
  await expect(page.getByRole("button", { name: /Start rehearsal/ })).toBeVisible()
  expect((await calls(page, "discard_draft")).map((c) => c.args)).toEqual([
    ["/rec/old/_drafts/take 4"],
  ])
  await said(page, "“Tuesday jam” went to the Trash.").getByRole("button", { name: "Undo" }).click()
  await expect(page.getByText("Unsaved takes found")).toBeVisible()
  await expect(page.getByRole("button", { name: "Recover" })).toHaveCount(1)
})

test("a folder switch names what could not be ended in the old folder", async ({ page }) => {
  await openApp(page)
  await page.getByRole("button", { name: "Settings" }).click()
  await page.getByRole("button", { name: "Folders", exact: true }).first().click()
  await setFake(page, "__KEPT__", ["/Users/alex/Old/_deleting/3"])
  await page.fill("#recordings-dir", "/Users/alex/Band")
  await page.keyboard.press("Tab")
  await expect(
    said(
      page,
      "Something that was being removed stays in “/Users/alex/Old/_deleting/3”: it could not be put back or moved to the Trash."
    )
  ).toHaveAttribute("data-notice", "warning")
  await expect(notices(page, "done")).toContainText("Folder saved")
})
