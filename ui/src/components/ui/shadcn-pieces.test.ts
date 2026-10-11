import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

// The pieces taken from shadcn, as the files they are now: shadcn's own
// weights, durations and veil are not the theme's, so what was changed is
// kept changed (F5, F10, C4).
const PIECES = ["tooltip", "sheet", "toggle", "toggle-group", "alert", "spinner", "empty", "item"]
const source = (name: string) =>
  readFileSync(new URL(`./${name}.tsx`, import.meta.url), "utf-8")

describe("the pieces from shadcn", () => {
  it.each(PIECES)("%s is set in the two weights, 400 and 600 (F5)", (name) => {
    expect(source(name)).not.toMatch(/\bfont-(thin|extralight|light|medium|bold|extrabold|black)\b/)
  })

  it.each(PIECES)("%s takes its motion from the theme, not a duration of its own (F10)", (name) => {
    expect(source(name)).not.toMatch(/\bduration-\d+\b/)
  })

  it("the sheet stands behind the notices on the dialog's veil, not one of its own (C4)", () => {
    const sheet = source("sheet")
    expect(sheet).toContain("DialogOverlay")
    expect(sheet).not.toMatch(/bg-black|bg-overlay/)
  })
})
