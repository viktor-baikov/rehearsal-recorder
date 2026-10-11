import * as React from "react"

import { cn } from "@/lib/utils"

/*
  The meter (C8): one thin bar for a reading that moves, the signal check's
  level and the notes check's velocity. A stereo track's two sides share the
  one bar, split along its length (the first above, the second below), so a
  dead half of a pair shows. It is as wide as the place it is given.

  The signal is the level's green. Notes are grey, in the text's colour: they
  are not a sound and have no level to set. A fill follows its value over
  75 ms, also under Reduce motion and while a take records: a meter is a
  reading, not motion (F11).
*/

const FILL = {
  signal: "bg-signal",
  notes: "bg-foreground/60",
} as const

/** 0..1, and 0 for what is not a number. */
const reach = (value: number) => (value > 0 ? Math.min(1, value) : 0)

type MeterProps = Omit<React.ComponentProps<"div">, "children"> & {
  /** One value, 0..1, for each side of the track. */
  sides: number[]
  tone: keyof typeof FILL
  /**
   * What it measures. With it the bar is a `meter` that a screen reader can
   * read (its largest side, as a percent); without it the bar is a picture,
   * and the words beside it say what it shows.
   */
  label?: string
}

function Meter({ sides, tone, label, className, ...props }: MeterProps) {
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
