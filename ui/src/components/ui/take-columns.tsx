import { drawnLength } from "@/lib/takeScale"
import { cn } from "@/lib/utils"

/*
  A song's takes as columns (C8), each as tall as it ran, in one scale: by
  default the longest of these columns fills the height. Last time draws them
  small beside a song (24 px); Review's header draws them as small, each with
  its number under it.

  The lit column is the take the screen is about: the one Review has just
  recorded, the one Last time's play button plays. It is in the text's colour,
  or the star's green when it is starred. A starred take that is not lit is a
  paler green, the rest grey. A column's width follows its height: 6 px at 24,
  8 px at 36.

  It is a picture of figures that the caller says in words, so a screen
  reader skips it: the caller names it, and Review also puts the tip on it.
*/
/** How tall the 24 px columns are with their numbers: the bars, the gap
 *  and a line of 12 px numbers. A box beside them that must not grow when
 *  they come or go holds this as its least height (Review's header). */
const SMALL_WITH_NUMBERS = "min-h-[calc(24px+1rem)]"

type TakeColumn = {
  /** The take's number in the rehearsal, to tell the columns apart. */
  key: number
  /** How long it ran, in seconds. */
  sec: number
  starred: boolean
  lit: boolean
  /** The number written under it, with `numbers`: the take's own, or none. */
  label?: number | null
}

function TakeColumns({
  columns,
  height,
  numbers = false,
  longest,
  className,
}: {
  columns: TakeColumn[]
  /** How tall the longest column is, in px. */
  height: 24 | 36
  /** A take's number under its column. */
  numbers?: boolean
  /** The length that fills `height`, where it is not the longest of these
   *  columns: Last time draws every song to the scale of its longest take. */
  longest?: number
  className?: string
}) {
  if (columns.length === 0) return null
  const full = longest ?? Math.max(...columns.map((c) => c.sec), 1)
  return (
    <div aria-hidden data-columns className={cn("flex shrink-0 items-end gap-1", className)}>
      {columns.map((c) => (
        <span
          key={c.key}
          data-column
          data-lit={c.lit || undefined}
          data-starred={c.starred || undefined}
          className={cn("flex flex-col items-center gap-1", numbers && "w-4")}
        >
          <span className="flex items-end" style={{ height }}>
            <span
              data-bar
              className={cn(
                "rounded-sm",
                height === 24 ? "w-1.5" : "w-2",
                c.lit
                  ? c.starred
                    ? "bg-signal"
                    : "bg-foreground"
                  : c.starred
                    ? "bg-signal/45"
                    : "bg-muted-foreground/35"
              )}
              style={{ height: drawnLength(c.sec, full, height) }}
            />
          </span>
          {numbers && (
            <span
              data-label
              className={cn(
                "h-lh text-xs leading-none tnum",
                c.lit ? "font-semibold text-foreground" : "text-muted-foreground"
              )}
            >
              {c.label}
            </span>
          )}
        </span>
      ))}
    </div>
  )
}

export { SMALL_WITH_NUMBERS, TakeColumns, type TakeColumn }
