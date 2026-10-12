import { useEffect, useState } from "react"

/**
 * True once `on` has been true for `ms`, and for as long as it stays so;
 * false again, counting afresh, whenever `on` turns false. With no wait (`ms`
 * of 0 or less) it is true at once while `on`, whatever it was counting
 * before. What waits a second before it shows (B5) asks it: the Spinner, and
 * a control that keeps its own icon until a spinner takes its place, as the
 * small player, Look again, Check signal and Start do.
 */
export function useAfter(on: boolean, ms: number): boolean {
  const [late, setLate] = useState(false)
  useEffect(() => {
    if (!on || ms <= 0) return
    const timer = setTimeout(() => setLate(true), ms)
    return () => {
      clearTimeout(timer)
      setLate(false)
    }
  }, [on, ms])
  return on && (ms <= 0 || late)
}
