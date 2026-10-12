import { createElement, type ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { PlayerLine } from "@/components/TakePlayer"

const line = (said: { error?: string | null; status?: ReactNode; warning?: string | null }) =>
  renderToStaticMarkup(
    createElement(PlayerLine, { error: null, status: null, warning: null, ...said })
  )

const CROP = createElement("span", { "data-crop": true }, "Cropping… 40%")

describe("the player's line", () => {
  it("is always there, empty until something is said", () => {
    const out = line({})
    expect(out).toContain("data-player-line")
    expect(out).not.toContain("role=")
  })

  it("says the output's warning when it is all there is", () => {
    const out = line({ warning: "Playback stopped" })
    expect(out).toContain("Playback stopped")
    // The warning's own colour on its icon, as the shared Alert gives it.
    expect(out).toContain("[&amp;&gt;svg]:text-warn")
  })

  it("says how far a crop is over the output's warning", () => {
    const out = line({ status: CROP, warning: "Playback stopped" })
    expect(out).toContain("data-crop")
    expect(out).not.toContain("Playback stopped")
  })

  it("says a take that did not load over the output's warning", () => {
    const out = line({ error: "Track file not found", warning: "Playback stopped" })
    expect(out).toContain("Track file not found")
    expect(out).toContain("text-destructive")
    expect(out).not.toContain("text-warn")
    expect(out).not.toContain("Playback stopped")
  })

  it("says a take that did not load over a crop as well", () => {
    const out = line({ error: "Track file not found", status: CROP, warning: "Playback stopped" })
    expect(out).toContain("Track file not found")
    expect(out).not.toContain("data-crop")
    expect(out).not.toContain("Playback stopped")
  })
})
