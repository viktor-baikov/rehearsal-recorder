import { Check } from "lucide-react"
import { Meter } from "@/components/ui/meter"
import { END_WORD } from "@/components/midi/ModeSwitch"
import { cn } from "@/lib/utils"

/**
 * The signal check's meter for a port, at the end of its line in a track's
 * row: the shared meter, jumping with each note's velocity and falling back,
 * and "notes" with the check's one tick once a note has arrived. Grey, in
 * the text's colour, not the level's green: notes are not a sound and have
 * no level to set. As wide as the place it is given, the row's end column,
 * so the bar is under the input's.
 */
export function NotesCheck({
  seen,
  vel,
  className,
}: {
  /** A note has arrived from this port since the check began. */
  seen: boolean
  /** Where the bar stands, 0..1. */
  vel: number
  className?: string
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      <Meter sides={[vel]} tone="notes" className="flex-1" />
      {seen ? (
        <span
          className={cn("flex items-center gap-1 text-xs whitespace-nowrap text-foreground", END_WORD)}
        >
          <Check className="size-3" />
          notes
        </span>
      ) : (
        <span className={cn("text-xs whitespace-nowrap text-muted-foreground", END_WORD)}>
          no notes
        </span>
      )}
    </div>
  )
}
