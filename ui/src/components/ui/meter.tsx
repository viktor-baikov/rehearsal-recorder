import * as React from "react"

import { cn } from "@/lib/utils"

/*
  The meter (C8): one reading that moves, the signal check's level and the
  notes check's velocity, and a recording tile's level and notes.

  Across (the checks) it is one thin bar. A stereo track's two sides share
  the one bar, split along its length (the first above, the second below), so
  a dead half of a pair shows. It is as wide as the place it is given.

  Up (a recording tile) it fills the box it is given, with no frame, corners
  or ground of its own: the tile is its ground. Each side rises from the
  bottom, side by side 2 px apart, with a 2 px line on top of its fill; a
  side at 0 draws nothing, as a lit line along the bottom of a dead input
  would read as a little signal. A held value draws a 2 px line where it
  stands, and a clipped side is drawn in destructive.

  The signal is the level's green. Notes are grey, in the text's colour: they
  are not a sound and have no level to set. A fill follows its value over
  75 ms, also under Reduce motion and while a take records: a meter is a
  reading, not motion (F11).
*/

const FILL = {
  signal: "bg-signal",
  notes: "bg-foreground/60",
} as const

/** Upright, a fill is a line on a tint of it. */
const RISE = {
  signal: "border-signal bg-signal/15",
  notes: "border-foreground/60 bg-foreground/15",
  clipped: "border-destructive bg-destructive/25",
} as const

/** 0..1, and 0 for what is not a number. */
const reach = (value: number) => (value > 0 ? Math.min(1, value) : 0)

type MeterProps = Omit<React.ComponentProps<"div">, "children"> & {
  /** One value, 0..1, for each side of the track: where its fill stands. */
  sides: number[]
  tone: keyof typeof FILL
  /** Across, a bar (the default); up, a column for each side. */
  direction?: "across" | "up"
  /** Up: each side's held line, 0..1; none for 0. */
  held?: number[]
  /** Up: the sides drawn in destructive, a clip. */
  clipped?: boolean[]
  /**
   * Up: what each side reads, 0..1, as its `data-level`, where its fill
   * stands on another scale (a tile's fill is in dB, what it reads is the
   * peak). The fill's own value where it is not given.
   */
  levels?: number[]
  /**
   * What it measures. With it the meter is a `meter` that a screen reader can
   * read (its largest side, as a percent); without it the meter is a picture,
   * and the words beside it say what it shows.
   */
  label?: string
}

function Meter({
  sides,
  tone,
  direction = "across",
  held = [],
  clipped = [],
  levels,
  label,
  className,
  ...props
}: MeterProps) {
  const reached = sides.map(reach)
  const named = label
    ? {
        role: "meter",
        "aria-label": label,
        "aria-valuemin": 0,
        "aria-valuemax": 100,
        "aria-valuenow": Math.round(Math.max(0, ...reached) * 100),
      }
    : { "aria-hidden": true }

  if (direction === "up")
    return (
      <div data-slot="meter" className={cn("relative flex size-full gap-0.5", className)} {...named} {...props}>
        {reached.map((side, k) => {
          const line = reach(held[k] ?? 0)
          return (
            <div
              key={k}
              data-side={k + 1}
              data-level={Math.round(reach(levels?.[k] ?? side) * 100)}
              className="relative flex-1"
            >
              {side > 0 && (
                <div
                  data-fill
                  className={cn(
                    "absolute inset-x-0 bottom-0 border-t-2 transition-[height] duration-75",
                    RISE[clipped[k] ? "clipped" : tone]
                  )}
                  style={{ height: `${side * 100}%` }}
                />
              )}
              {line > 0 && (
                <div
                  data-held
                  className="absolute inset-x-0 h-0.5 bg-foreground/35"
                  style={{ bottom: `${line * 100}%` }}
                />
              )}
            </div>
          )
        })}
      </div>
    )

  return (
    <div
      data-slot="meter"
      className={cn("relative h-2 overflow-hidden rounded-full border bg-background", className)}
      {...named}
      {...props}
    >
      {reached.map((side, k) => (
        <div
          key={k}
          className={cn("absolute left-0 transition-[width] duration-75", FILL[tone])}
          style={{
            width: `${side * 100}%`,
            top: `${(k / reached.length) * 100}%`,
            bottom: `${((reached.length - 1 - k) / reached.length) * 100}%`,
          }}
        />
      ))}
    </div>
  )
}

export { Meter }
