import { useSyncExternalStore } from "react"

/**
 * How wide the window has to be, in rem of the root's font size, for the
 * start screen's left part to stand beside the setup (Q4): 1100 px at 100 %,
 * 1430 px at 130 %. Narrower, it waits behind a button.
 *
 * A media query cannot say this: its rem is the browser's 16 px, never the
 * root's, which the Appearance scale sets (lib/appearance).
 */
export const WIDE_REM = 68.75

/** Whether a window `windowPx` wide, with the root's font at `rootPx`, has
 *  that room. */
export function isWide(windowPx: number, rootPx: number): boolean {
  return windowPx >= WIDE_REM * rootPx
}

// What was last found, read again only once something has changed: the start
// screen renders many times a second while the check runs or a take plays,
// and reading the root's style each time would make the browser work its
// styles out each time. Null until it is read again.
let known: boolean | null = null

function subscribe(changed: () => void) {
  const again = () => {
    known = null
    changed()
  }
  // Nothing was listening while no screen asked, so a newcomer reads afresh.
  known = null
  window.addEventListener("resize", again)
  // applyAppearance sets the scale as the root's font size, on its style.
  const scale = new MutationObserver(again)
  scale.observe(document.documentElement, { attributes: true, attributeFilter: ["style"] })
  return () => {
    window.removeEventListener("resize", again)
    scale.disconnect()
  }
}

function snapshot(): boolean {
  known ??= isWide(
    window.innerWidth,
    parseFloat(getComputedStyle(document.documentElement).fontSize)
  )
  return known
}

/** Whether the window is wide enough for the start screen's left part beside
 *  the setup, following the window and the Appearance scale. */
export function useWide(): boolean {
  return useSyncExternalStore(subscribe, snapshot)
}
