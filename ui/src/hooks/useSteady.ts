import { useCallback, useLayoutEffect, useRef } from "react"

/**
 * A function that keeps its identity from one render to the next and always
 * calls the newest `fn`, with what that render saw: for a handler handed to
 * a part drawn with `memo`, which a new function doing the same thing would
 * draw again. For events, not for calling while rendering: it is brought up
 * to date once the render is on the screen.
 */
export function useSteady<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  const latest = useRef(fn)
  useLayoutEffect(() => {
    latest.current = fn
  })
  return useCallback((...args: A) => latest.current(...args), [])
}
