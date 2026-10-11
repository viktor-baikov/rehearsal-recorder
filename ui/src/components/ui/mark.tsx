import type * as React from "react"
import type { Label, LabelColour } from "@/lib/api"
import { formatMMSS } from "@/lib/format"
import { labelLook, markText } from "@/lib/labels"
import { cn } from "@/lib/utils"

/*
  A mark's pieces (C8): its label's colour as a dot, and its note line. The
  dot is drawn in five sizes in eleven places today and the note line three
  ways (Last time, a rehearsal's overview, a song's page); each place moves
  onto these as its screen is redone.

  The dot is a picture of the label, which the line says in words, so a
  screen reader skips it. 8 px, a step of the spacing scale, round.
*/

function LabelDot({ colour, className }: { colour: LabelColour; className?: string }) {
  return (
    <span
      aria-hidden
      data-slot="label-dot"
      className={cn("size-2 shrink-0 rounded-full", labelLook(colour).dot, className)}
    />
  )
}

/**
 * One mark as a line: the dot, where it is in the take, the take when the
 * line is read away from it, then its label and what was written. The
 * words are cut at the end of the room; the dot and the time never are. Its
 * text size is the caller's. It does nothing when pressed: a place that
 * opens the take at the mark puts it in its button.
 */
function MarkLine({
  label,
  at,
  note,
  take,
  className,
}: {
  label: Label
  /** Where in the take, in seconds. */
  at: number
  note: string
  /** The take it is on (its TakeTitle), where the line is not under it. */
  take?: React.ReactNode
  className?: string
}) {
  return (
    <span data-note className={cn("flex min-w-0 items-center gap-2", className)}>
      <LabelDot colour={label.colour} />
      <span className="tnum shrink-0 text-muted-foreground">{formatMMSS(at)}</span>
      <span className="truncate">
        {take != null && <span className="text-muted-foreground">{take} · </span>}
        {markText(label, note)}
      </span>
    </span>
  )
}

export { LabelDot, MarkLine }
