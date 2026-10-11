import { useLayoutEffect, type ReactNode } from "react"
import { setSystem, type System } from "../src/lib/platform.ts"

/** The toolbar's theme and system (preview.tsx), put in place after the
 *  story renders and before it is painted: setSystem tells every component
 *  that shows the system's words, and telling them while React is still
 *  rendering the story is an update in the middle of a render. */
export function Globals({
  theme,
  system,
  children,
}: {
  theme: string
  system: System
  children: ReactNode
}) {
  useLayoutEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
    setSystem(system)
  }, [theme, system])
  return children
}
