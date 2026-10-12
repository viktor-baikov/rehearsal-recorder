import type { ReactNode } from "react"

import { WholeTip, useCut } from "@/components/ui/whole"
import { cn } from "@/lib/utils"

/** The error over the buttons: out of the flow, one line, cut. */
function FooterError({ text }: { text: string }) {
  const [ref, cut] = useCut<HTMLParagraphElement>()
  return (
    <WholeTip cut={cut} text={text}>
      <p
        ref={ref}
        role="alert"
        className="absolute right-0 bottom-full mb-1 max-w-md truncate text-xs text-destructive"
      >
        {text}
      </p>
    </WholeTip>
  )
}

/**
 * A screen's footer as one row: what the screen has to say on the left, its
 * buttons on the right, the main one rightmost, so that it is in the same
 * place on every screen. Stacked with the name field and its songs, the
 * review screen's footer came to about 270 px; in a row, 183.
 *
 * `rule` draws a line between the two halves, where the left one holds a
 * field or, on the screen after a take, the take itself. An error goes over
 * the buttons it is about, in the room the footer's top padding has, so that
 * it moves nothing (B4); one too long for a line is cut, whole on hover.
 *
 * With a field, the buttons get the same room on every screen that has one.
 * Its songs wrap under it by the room they have, and buttons of different
 * widths gave the songs different room: a list that took two rows on one
 * screen fitted in one on the next, and the field dropped a row. 26rem
 * holds Record take 100 in the tests' browser. (The rehearsal screen has
 * its Next take field in a panel of its own since issue #12 step 6.)
 */
export function FooterRow({
  left,
  rule = false,
  error,
  children,
}: {
  left?: ReactNode
  rule?: boolean
  error?: string | null
  /** The buttons, and any line that goes under them. */
  children: ReactNode
}) {
  return (
    <div className="mx-auto flex w-full max-w-7xl items-center gap-7">
      <div className="min-w-0 flex-1">{left}</div>
      {rule && <div data-footer-rule aria-hidden className="w-px self-stretch bg-border" />}
      <div
        data-footer-actions
        className={cn("relative flex shrink-0 flex-col items-end gap-2", rule && "min-w-[26rem]")}
      >
        {error && <FooterError text={error} />}
        {children}
      </div>
    </div>
  )
}
