import { useCallback, useEffect, useRef } from "react"
import { dismiss, notify } from "@/lib/notices"

/**
 * A screen's error notice (C4), in a slot of its own, `key`: what this
 * gives says a button's failure there, and the screen puts it away with
 * `dismiss(key)` before a retry. The notice goes when the screen goes. A
 * button whose answer comes once its screen has gone (a name sent, then
 * Finish pressed before Python answered) says nothing: the screen it was
 * about is not there to try again on, and the notice would sit on the next
 * one.
 */
export function useErrorNotice(key: string): (text: string) => void {
  const here = useRef(false)
  useEffect(() => {
    here.current = true
    return () => {
      here.current = false
      dismiss(key)
    }
  }, [key])
  return useCallback(
    (text: string) => {
      if (here.current) notify({ key, kind: "error", text })
    },
    [key]
  )
}
