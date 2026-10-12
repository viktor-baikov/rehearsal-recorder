import * as React from "react"
import { cn } from "@/lib/utils"

/*
  The plate beside a track's lane (C6): the audio track's, the notes' and the
  master's are this one box. It is the card's fill with no frame, 12 px across
  and 8 above and below; what it holds, and the gap between, is the caller's.
  At 56 px a plate has room for a name of 16 px and under it a row of 20 (the
  fader, with M and S after it), 4 apart, so a lane's plate is exactly as tall
  as its lane.

  `grouped` is a plate in a row of the player's lanes group (Timeline): the
  group's fill is its fill, so it has no fill and no corners of its own. The
  master's plate is not in that group and keeps its box.
*/
function LanePlate({
  grouped = false,
  className,
  children,
  ...div
}: React.ComponentProps<"div"> & { grouped?: boolean }) {
  return (
    <div
      data-slot="lane-plate"
      className={cn(
        "flex h-full flex-col justify-center px-3 py-2",
        !grouped && "rounded-lg bg-card",
        className
      )}
      {...div}
    >
      {children}
    </div>
  )
}

export { LanePlate }
