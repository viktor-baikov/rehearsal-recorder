/**
 * The six looks of the small player (spec C2): what its ▶ shows, how it is
 * filled and what it says to a screen reader. Kept apart from the component so
 * the screens can work the look out without importing React, and so the order
 * in which the states win is tested.
 */
export type PlayLook = "idle" | "loading" | "playing" | "paused" | "failed" | "missing"

/** What a take shows a spinner after (B5): under this long nothing changes, so
 *  a take that opens at once does not flash one. */
export const SPINNER_AFTER_MS = 1000

/**
 * Which look a take's ▶ wears. A take that is not on disk is that and nothing
 * else; one that failed to load says so even while a retry is under way; then
 * come loading, playing, and paused for the take that is loaded but silent.
 */
export function playLook({
  loaded,
  playing,
  loading,
  failed,
  missing,
}: {
  loaded: boolean
  playing: boolean
  loading: boolean
  failed: boolean
  missing: boolean
}): PlayLook {
  if (missing) return "missing"
  if (failed) return "failed"
  if (loading) return "loading"
  if (playing) return "playing"
  return loaded ? "paused" : "idle"
}

/** The button's name for a screen reader: it carries the take's name, as the
 *  big player's does not. */
export function playLabel(look: PlayLook, name: string): string {
  if (look === "missing") return `${name} is not on disk`
  if (look === "failed") return `Could not load ${name}. Try again`
  return `${look === "playing" ? "Pause" : "Play"} ${name}`
}
