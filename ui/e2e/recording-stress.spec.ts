import { expect, openApp, test } from "./app.ts"

// The recording stress data (stress-recording.js): the screen as the longest
// names and the most tracks the band has make it, read from here by the
// recording screen's own tests. A fixture whose own test fails on any error in
// the page, so that what it lays over the rehearsal stress band is checked here
// once, and the tests built on it can rely on it.

test("the recording stress data opens on take 33 with eight tiles", async ({ page }) => {
  await openApp(page, { stress: "recording" })
  // The second take of the longest song name, take 33 of the evening, recording.
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
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
  await expect(nord).toContainText(/\d[\d,]* notes?/)
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
