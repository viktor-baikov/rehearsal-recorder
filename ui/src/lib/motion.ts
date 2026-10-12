import type { CSSProperties } from "react"

/**
 * Whether motion should be left out right now (spec F11): the system's
 * Reduce motion is on, or a take is being recorded — Recording.tsx puts
 * `data-recording` on <html> for as long as its screen is up.
 *
 * The CSS animations switch themselves off for the same two reasons (see the
 * end of the motion block in index.css). This is for what the stylesheet
 * cannot reach: a scroll that smooths itself, a transition set in a class.
 * Asked when it is about to move, not once, so a change in the system's
 * setting is seen at the next one.
 */
export function motionOff(): boolean {
  if (typeof document === "undefined") return false
  const reduce = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
  return reduce || document.documentElement.hasAttribute("data-recording")
}

/** How a scroll the code makes moves: smoothly, or at once where motion is
 *  off (motionOff), asked at each scroll. */
export function scrollBehavior(): ScrollBehavior {
  return motionOff() ? "auto" : "smooth"
}

/**
 * A group's place in the line a screen brings its groups in by, 40 ms apart
 * (F10): `--i` for `animate-rise`, which reads it as the animation's delay.
 * The group nearest the top or the left is 0.
 */
export function rise(i: number): CSSProperties {
  return { "--i": i } as CSSProperties
}
