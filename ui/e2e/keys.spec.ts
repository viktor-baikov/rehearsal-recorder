import {
  callCount,
  expect,
  openApp,
  openEvening,
  openHistory,
  startButton,
  startRehearsal,
  test,
  withKeys,
} from "./app.ts"
import type { Locator, Page } from "@playwright/test"

// Settings › Keys: Space and Esc, and the player's keys, each turned off
// on its own. Off, those keys do nothing on any screen. Ctrl+Z, and Esc in a
// dialog or a text field, work whatever the switches say. Python keeps both
// with the other settings; the fake keeps them in its config.

/** Presses the keys in turn, then gives them the time to do what they would. */
async function press(page: Page, ...keys: string[]) {
  for (const key of keys) await page.keyboard.press(key)
  await page.waitForTimeout(200)
}

/** How many times each of these was called. */
async function counts(page: Page, names: string[]) {
  const said: Record<string, number> = {}
  for (const name of names) said[name] = await callCount(page, name)
  return said
}

const timeline = (page: Page) => page.getByRole("group", { name: "Take timeline" })
const nextTake = (page: Page) => page.getByRole("textbox", { name: "Next take" })
const firstTake = (overview: Locator) => overview.locator("button[aria-label^='Take 1 Pałyn']")

test("with Space and Esc off, they do nothing on the start, rehearsal, recording and review screens", async ({
  page,
}) => {
  await openApp(page, { before: withKeys({ space: false }) })
  const dialog = page.getByRole("dialog")

  // The start screen: Space would start the rehearsal.
  await expect(startButton(page)).toBeVisible()
  await press(page, "Space", "Escape")
  expect(await callCount(page, "start_rehearsal")).toBe(0)
  await expect(startButton(page)).toBeVisible()

  // The set button, its focus left by the mouse: Space presses it as it
  // presses any button, and its menu opens.
  await page.locator("[data-set-picker]").click()
  const sets = page.getByRole("menu", { name: "Sets" })
  await sets.getByRole("menuitemradio", { name: /No set/ }).click()
  await expect(sets).toHaveCount(0)
  await press(page, "Space")
  await expect(sets).toBeVisible()
  expect(await callCount(page, "start_rehearsal")).toBe(0)
  await page.keyboard.press("Escape")
  await expect(sets).toHaveCount(0)

  // Settings: Esc would take you back to the start screen.
  await page.getByRole("button", { name: "Settings", exact: true }).click()
  const settings = page.getByRole("heading", { name: "Settings", level: 1 })
  await expect(settings).toBeVisible()
  await press(page, "Escape")
  await expect(settings).toBeVisible()
  await page.getByRole("button", { name: "Back", exact: true }).click()

  // The rehearsal screen, no takes yet: Space would record, and Esc would
  // finish the rehearsal without asking.
  await startRehearsal(page)
  await press(page, "Space", "Escape")
  expect(await counts(page, ["start_take", "finish_rehearsal"])).toEqual({
    start_take: 0,
    finish_rehearsal: 0,
  })
  await expect(dialog).toHaveCount(0)

  // Recording: Space would stop the take.
  await page.getByRole("button", { name: /Record take 1/ }).click()
  const clock = page.locator("[role=timer]")
  await expect(clock).toBeVisible()
  await press(page, "Space", "Escape")
  expect(await callCount(page, "stop_take")).toBe(0)
  await expect(clock).toBeVisible()

  // The screen after a take: Space would save it, and Esc discard it.
  await page.getByRole("button", { name: /^Stop/ }).click()
  const summary = page.locator("[data-take-summary]")
  await expect(summary).toBeVisible()
  await press(page, "Space", "Escape")
  expect(await counts(page, ["keep_take", "discard_take"])).toEqual({
    keep_take: 0,
    discard_take: 0,
  })
  await expect(summary).toBeVisible()
  await expect(dialog).toHaveCount(0)
})

test("with the player's keys off, the arrows, Home, M, R and ? do nothing", async ({ page }) => {
  const overview = await openEvening(page, withKeys({ player: false }))

  // No take open: down would name the next take after the first song.
  const named = await nextTake(page).inputValue()
  const sent = await callCount(page, "set_next_take_name")
  await press(page, "ArrowDown")
  await expect(nextTake(page)).toHaveValue(named)
  expect(await callCount(page, "set_next_take_name")).toBe(sent)

  // Pałyn 1 open, with three more takes of Pałyn tonight for up and down.
  await firstTake(overview).click()
  const play = page.getByRole("toolbar", { name: "Transport" }).getByRole("button", {
    name: "Play",
    exact: true,
  })
  await expect(play).toBeEnabled()
  const watched = ["player_seek", "player_set_loop", "player_open", "add_take_marker"]
  const before = await counts(page, watched)
  await press(page, "ArrowLeft", "ArrowRight", "Home", "r", "ArrowDown", "ArrowUp", "m", "?")
  await expect(page.getByRole("dialog")).toHaveCount(0)
  expect(await counts(page, watched)).toEqual(before)
  await expect(timeline(page)).toBeVisible()

  // Space is not one of the player's keys: it still plays.
  const plays = await callCount(page, "player_toggle")
  await page.keyboard.press("Space")
  await expect.poll(() => callCount(page, "player_toggle")).toBe(plays + 1)

  // History: down would choose the next rehearsal.
  await page.getByRole("button", { name: "Finish", exact: true }).click()
  const list = await openHistory(page)
  const chosen = list.locator("[aria-current='true']")
  await expect(chosen).toContainText("Tuesday jam")
  await press(page, "ArrowDown")
  await expect(chosen).toContainText("Tuesday jam")
})

test("with the keys off, Esc still closes a dialog and leaves a field, and Ctrl+Z still undoes", async ({
  page,
}) => {
  const overview = await openEvening(page, withKeys({ space: false, player: false }))
  await firstTake(overview).click()
  await expect(timeline(page)).toBeVisible()

  // The player's keys, opened from their button: Esc closes the list, and
  // the take stays open.
  await page.getByRole("button", { name: "Player keys" }).click()
  const list = page.getByRole("dialog", { name: "Keys in the player" })
  await expect(list).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(list).toHaveCount(0)
  await expect(timeline(page)).toBeVisible()

  // In the Next take field M, R, ? and Space are typed, and do nothing else.
  // The first click selects the whole name, so what is typed replaces it.
  await nextTake(page).click()
  await page.keyboard.type("Mr ?")
  await page.keyboard.press("Space")
  await expect(nextTake(page)).toHaveValue("Mr ? ")
  await expect(page.getByRole("dialog")).toHaveCount(0)
  expect(await callCount(page, "add_take_marker")).toBe(0)

  // Esc leaves the field, and asks nothing.
  await press(page, "Escape")
  await expect(nextTake(page)).not.toBeFocused()
  await expect(page.getByRole("dialog")).toHaveCount(0)
  await expect(timeline(page)).toBeVisible()

  // A take discarded on the screen after it: Ctrl+Z brings that screen back.
  await page.getByRole("button", { name: /Record take 11/ }).click()
  await page.getByRole("button", { name: /^Stop/ }).click()
  const summary = page.locator("[data-take-summary]")
  await expect(summary).toBeVisible()
  await page.getByRole("button", { name: /Discard/ }).click()
  await expect(summary).toHaveCount(0)
  await page.keyboard.press("Control+z")
  await expect(summary).toBeVisible()
})
