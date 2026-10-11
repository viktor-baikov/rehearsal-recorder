import { describe, expect, it } from "vitest"
import { playLabel, playLook, type PlayLook } from "@/lib/playLook"

// What a small player knows about its take; each test switches on only what it
// is about.
const none = { loaded: false, playing: false, loading: false, failed: false, missing: false }
const look = (on: Partial<typeof none>) => playLook({ ...none, ...on })

describe("playLook: which of the six looks a small player wears", () => {
  it("is idle for a take that is not the loaded one", () => {
    expect(look({})).toBe("idle")
  })

  it("is paused for the loaded take that is not playing", () => {
    expect(look({ loaded: true })).toBe("paused")
  })

  it("is playing while it plays", () => {
    expect(look({ loaded: true, playing: true })).toBe("playing")
  })

  it("is loading while the take is being opened", () => {
    expect(look({ loading: true })).toBe("loading")
  })

  it("is failed when the take could not be opened", () => {
    expect(look({ failed: true })).toBe("failed")
  })

  it("is missing for a take that is not on disk", () => {
    expect(look({ missing: true })).toBe("missing")
  })

  it("lets missing beat everything, playing included", () => {
    expect(look({ missing: true, playing: true, loaded: true })).toBe("missing")
    expect(look({ missing: true, failed: true, loading: true })).toBe("missing")
  })

  it("lets failed beat loading, so a retry that is under way still says why", () => {
    expect(look({ failed: true, loading: true })).toBe("failed")
    expect(look({ failed: true, playing: true, loaded: true })).toBe("failed")
  })

  it("lets loading beat playing and paused", () => {
    expect(look({ loading: true, playing: true })).toBe("loading")
    expect(look({ loading: true, loaded: true })).toBe("loading")
  })
})

describe("playLabel: what a screen reader hears", () => {
  it("says Pause only while it plays", () => {
    expect(playLabel("playing", "Take 3")).toBe("Pause Take 3")
  })

  it("says Play in every other look that can be pressed to play", () => {
    for (const l of ["idle", "loading", "paused"] as PlayLook[]) {
      expect(playLabel(l, "Take 3"), l).toBe("Play Take 3")
    }
  })

  it("says what went wrong, and that pressing tries again", () => {
    expect(playLabel("failed", "Take 3")).toBe("Could not load Take 3. Try again")
  })

  it("says a take that is not on disk is not", () => {
    expect(playLabel("missing", "Take 3")).toBe("Take 3 is not on disk")
  })
})
