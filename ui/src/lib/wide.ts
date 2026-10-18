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

/** How wide the window has to be for Settings' section list to show its
 *  names beside the tab (Q2): 900 px at 100 %, 1350 px at 150 %. Narrower,
 *  the list is its icons, and the tab has their room. */
export const SETTINGS_WIDE_REM = 56.25

/** Whether a window `windowPx` wide, with the root's font at `rootPx`, has
 *  room for `rem`: the start screen's, unless another is given. */
export function isWide(windowPx: number, rootPx: number, rem = WIDE_REM): boolean {
  return windowPx >= rem * rootPx
}

type Watch = { subscribe: (changed: () => void) => () => void; snapshot: () => boolean }

// One watch for each width asked about, made once, so React gets the same
// two functions at every render.
const watches = new Map<number, Watch>()

function watchFor(rem: number): Watch {
  const made = watches.get(rem)
  if (made) return made

  // What was last found, read again only once something has changed: the
  // start screen renders many times a second while the check runs or a take
  // plays, and reading the root's style each time would make the browser
  // work its styles out each time. Null until it is read again.
  let known: boolean | null = null

  const subscribe = (changed: () => void) => {
    const again = () => {
      known = null
      changed()
    }
    // Nothing hears a change made before a screen begins listening or after
    // it stops: one between its first render and this, or while no screen is
    // on. So what is known is forgotten at both ends, and a screen that comes
    // back reads afresh from its first render.
    known = null
    window.addEventListener("resize", again)
    // applyAppearance sets the scale as the root's font size, on its style.
    const scale = new MutationObserver(again)
    scale.observe(document.documentElement, { attributes: true, attributeFilter: ["style"] })
    return () => {
      window.removeEventListener("resize", again)
      scale.disconnect()
      known = null
    }
  }

  const snapshot = () => {
    known ??= isWide(
      window.innerWidth,
      parseFloat(getComputedStyle(document.documentElement).fontSize),
      rem
    )
    return known
  }

  const watch = { subscribe, snapshot }
  watches.set(rem, watch)
  return watch
}

/** Whether the window has room for `rem`, following the window and the
 *  Appearance scale: by default, for the start screen's left part beside the
 *  setup. */
export function useWide(rem = WIDE_REM): boolean {
  const { subscribe, snapshot } = watchFor(rem)
  // With no window to measure, wide: what the site's frame is, at 1180 px.
  return useSyncExternalStore(subscribe, snapshot, () => true)
}
