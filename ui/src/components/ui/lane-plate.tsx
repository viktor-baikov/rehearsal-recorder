import * as React from "react"
import { cn } from "@/lib/utils"
import { laneHalf, type LaneHalf } from "@/lib/laneHalf"

/*
  The plate beside a track's lane (C6): the audio track's, the notes' and the
  master's are this one box. It is the card's fill with no frame, 12 px across
  and 8 above and below; what it holds, and the gap between, is the caller's.
  At 56 px a plate has room for one row of 20 px and a fader of 16 under it,
  4 apart, so a lane's plate is exactly as tall as its lane.

  `half` makes it one of the two halves of a track that records both (laneHalf).
*/
function LanePlate({
  half,
  className,
  children,
  ...div
}: React.ComponentProps<"div"> & { half?: LaneHalf }) {
  return (
    <div
      data-slot="lane-plate"
      className={cn("flex h-full flex-col justify-center px-3 py-2", laneHalf(half), className)}
      {...div}
    >
      {children}
    </div>
  )
}

export { LanePlate }
