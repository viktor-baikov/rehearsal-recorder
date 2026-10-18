/**
 * How tall a go is drawn, in the same scale wherever goes are shown as bars
 * (C8): the longest of them fills `full`, the others are as tall as they ran
 * long, and none is under `least`, so a short go can still be seen and
 * pressed. Not rounded: the browser draws the fraction.
 */
export function drawnLength(sec: number, longest: number, full: number, least = 4): number {
  if (!(longest > 0) || !(sec > 0)) return least
  return Math.max(least, (sec / longest) * full)
}

/**
 * What a take drawn as a bar is filled with, at rest: the same on the
 * rehearsal's page and on a song's. The fill is solid in every state: the
 * take's number and name sit on a backing that takes the bar's own fill
 * (`[background:inherit]`), and a see-through fill would show the marks'
 * ticks under it. What a bar does under the pointer is its place's own.
 *   rest     the muted fill
 *   starred  the card's, with the signal tint over it as a flat gradient
 *   quiet    the card's, with its dashed frame: a false start, or a take
 *            that is not on disk
 */
export const TAKE_FILLS = {
  rest: "border-transparent bg-muted",
  starred: "border-signal/50 bg-card bg-linear-to-r from-signal/10 to-signal/10",
  quiet: "border-dashed border-muted-foreground/45 bg-card",
} as const
