import { cn } from "@/lib/utils"

/** Which half of a Both track's card a plate or lane is: the audio above, its
 *  notes below. Nothing says it is a whole card of its own. */
export type LaneHalf = "top" | "bottom"

/**
 * The box of a track's plate, and of its lane beside it (C6): a card of the
 * group's radius and fill, with no frame (F4). A track that records its notes
 * too is one card of two halves, so the upper drops its lower corners and the
 * lower drops its upper ones and draws the 1 px line between them, in the
 * border colour, which is the look of a Separator.
 *
 * One function for the audio plate, the notes plate and both lanes: they used
 * to say it three times, each with a different border, and one of them dashed.
 */
export function laneHalf(half?: LaneHalf): string {
  return cn(
    "rounded-lg bg-card",
    half === "top" && "rounded-b-none",
    half === "bottom" && "rounded-t-none border-t border-border"
  )
}
