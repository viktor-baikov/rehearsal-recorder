import {
  callCount,
  calls,
  expect,
  nameTake,
  notices,
  openApp,
  recordTake,
  startRehearsal,
  test,
} from "./app.ts"
import type { Page } from "@playwright/test"

// The band's cloud folder: what goes there, and when.

/** What the last saved take was told about the cloud: false kept out, null
 *  left to the setting. */
async function sentAs(page: Page) {
  const args = (await calls(page, "keep_take")).at(-1)?.args ?? []
  return args.length > 6 ? args[6] : null
}

test("saving a take says whether it goes to the cloud, take by take", async ({ page }) => {
  await openApp(page, {
    before: `window.__CLOUD_DIR__ = '/Users/alex/Google Drive/Band';
      window.__AUTO_PUBLISH__ = {on: true, what: 'mix'};`,
  })
  await startRehearsal(page)
  await recordTake(page, 1)
  const box = page.locator("#send-to-cloud")
  await expect(box).toBeChecked()
  const label = page.locator("label[for='send-to-cloud']")
  await expect(label).toContainText("the mix")
  await expect(label).toContainText("WAV")
  await box.uncheck()
  // Space right after clicking the box must still save, not tick it again.
  await page.keyboard.press("Space")
  await expect.poll(() => sentAs(page)).toBe(false)

  // The next take starts from the setting again, not from the last one, and
  // left alone it simply follows the setting.
  await recordTake(page, 2)
  await expect(box).toBeChecked()
  await page.getByRole("button", { name: /Save take/ }).click()
  await expect.poll(async () => (await calls(page, "keep_take")).length).toBe(2)
  expect(await sentAs(page)).toBeNull()
})

test("a take is copied to the cloud from its row, and taken back out again", async ({ page }) => {
  await openApp(page)
  await startRehearsal(page)
  await recordTake(page, 1)
  await nameTake(page, "Pałyn")
  await page.getByRole("button", { name: /Save take/ }).click()
  await expect(page.getByRole("button", { name: /Record take 2/ })).toBeVisible()
  await page.locator("[aria-label='Rehearsal overview'] button[aria-label^='Take 1 Pałyn']").click()
  await expect(page.getByRole("button", { name: "Mute Guitar" })).toBeVisible()

  await page.getByRole("button", { name: "Copy Pałyn 1 to the cloud" }).click()
  // There is nowhere to copy to yet, and it says so.
  await expect(page.getByText("No cloud folder chosen yet")).toBeVisible()
  await expect(page.getByRole("button", { name: "The mix", exact: true })).toBeDisabled()
  await page.getByText("Choose").click()
  await expect.poll(() => callCount(page, "choose_cloud_dir")).toBe(1)
  await page.getByRole("button", { name: "Both", exact: true }).click()
  // The dialog lets go as soon as the copy is queued.
  await expect(page.getByRole("dialog")).toHaveCount(0)
  const shared = await calls(page, "share_take")
  expect(shared).toHaveLength(1)
  expect(shared[0].args[2]).toBe("both")
  await expect(page.getByRole("button", { name: "Cloud copies of Pałyn 1" })).toHaveCount(1)

  // Deleting a take takes its copy out of the cloud folder too, at once; its
  // Undo puts both back.
  await page.getByRole("button", { name: "Delete take Pałyn 1" }).click()
  await expect(page.getByRole("dialog")).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Cloud copies of Pałyn 1" })).toHaveCount(0)
  await notices(page)
    .filter({ hasText: "“Pałyn 1” went to the Trash." })
    .getByRole("button", { name: "Undo" })
    .click()
  await expect(page.getByRole("button", { name: "Cloud copies of Pałyn 1" })).toHaveCount(1)

  await page.getByRole("button", { name: "Cloud copies of Pałyn 1" }).click()
  await expect(page.getByRole("dialog")).toContainText("already there")
  await page.getByText("Remove from the cloud").click()
  await expect.poll(() => callCount(page, "unshare_take")).toBe(1)
  await expect(page.getByRole("button", { name: "Copy Pałyn 1 to the cloud" })).toHaveCount(1)
})

test("a share option is named by its title and described by its hint", async ({ page }) => {
  const MIX_HINT = "One stereo file with the balance you set here. This is what you send people."
  const TRACKS_HINT =
    "Every track as recorded, untouched, and the notes as .mid — for opening in a DAW later."
  await openApp(page, { before: "window.__CLOUD_DIR__ = '/Users/alex/Google Drive/Band';" })
  await startRehearsal(page)
  await recordTake(page, 1)
  await nameTake(page, "Pałyn")
  await page.getByRole("button", { name: /Save take/ }).click()
  await expect(page.getByRole("button", { name: /Record take 2/ })).toBeVisible()
  await page.locator("[aria-label='Rehearsal overview'] button[aria-label^='Take 1 Pałyn']").click()
  await page.getByRole("button", { name: "Copy Pałyn 1 to the cloud" }).click()

  // The name is the title alone; the hint is what a screen reader says after
  // it. The option is found by its hint, so the name is what is checked.
  const mix = page.getByRole("dialog").getByRole("button").filter({ hasText: MIX_HINT })
  await expect(mix).toHaveCount(1)
  await expect(mix).toHaveAccessibleName("The mix")
  await expect(mix).toHaveAccessibleDescription(MIX_HINT)
  await expect(page.getByRole("button", { name: "The original tracks", exact: true })).toHaveAccessibleDescription(
    TRACKS_HINT
  )

  // Once the mix is there, the description says so before the hint.
  await mix.click()
  await expect(page.getByRole("dialog")).toHaveCount(0)
  await page.getByRole("button", { name: "Cloud copies of Pałyn 1" }).click()
  await expect(mix).toHaveAccessibleName("The mix")
  await expect(mix).toHaveAccessibleDescription(`already there ${MIX_HINT}`)
  await expect(page.getByRole("button", { name: "The original tracks", exact: true })).toHaveAccessibleDescription(
    TRACKS_HINT
  )
})
