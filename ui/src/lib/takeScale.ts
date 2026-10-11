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
