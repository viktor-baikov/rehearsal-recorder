import { ListMusic } from "lucide-react"
import { Whole } from "@/components/ui/whole"
import { cn } from "@/lib/utils"

// What History says of a rehearsal played by a set (issue #12 step 8, H1 and
// H4): its name in the list and beside the date. The card of what was played
// of it (H2) is SetCard, the one the rehearsal screen has. One played freely
// looks as it always did.

/** The set's name, small, after its icon: in the list of rehearsals and
 *  beside the date under a rehearsal's title (H1). Cut where it has no room.
 *  With `whole`, as under the title, it is whole on hover when cut. In the
 *  list it is plainly cut: the row is one button, and its tip is the row's
 *  name. */
export function SetName({
  name,
  whole = false,
  className,
}: {
  name: string
  whole?: boolean
  className?: string
}) {
  return (
    <span
      data-set-name
      className={cn("flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground", className)}
    >
      <ListMusic aria-hidden className="size-3.5 shrink-0" />
      {whole ? <Whole text={name} className="truncate" /> : <span className="truncate">{name}</span>}
    </span>
  )
}
