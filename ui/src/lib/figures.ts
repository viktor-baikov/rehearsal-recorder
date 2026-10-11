/**
 * The arithmetic behind a figure line beside a name (B6): which figures fit
 * in the room the name leaves, and the line they make. Pure, so the
 * measuring (components/ui/whole.tsx) is the only part that needs a browser.
 */

/** One figure of a figure line: `keep` orders what goes first (lowest
 *  first); `join` is what joins it to the figure before it while that one
 *  shows (" · " otherwise). */
export type Part = { text: string; keep: number; join?: string }

/** What sits between two shown figures when the one after is `part` and the
 *  one before it, in the list, is shown or not. */
const joinBefore = (part: Part, beforeShown: boolean) =>
  part.join && beforeShown ? part.join : " · "

/** The line the shown figures make. */
export function joinFigures(parts: Part[], shown: boolean[]): string {
  let out = ""
  parts.forEach((p, i) => {
    if (!shown[i]) return
    if (out) out += joinBefore(p, shown[i - 1])
    out += p.text
  })
  return out
}

/**
 * Which figures show in `room` px. `widths` are the parts measured alone;
 * `dot` and `comma` are the widths of " · " and of a part's own `join`. Parts
 * go lowest `keep` first (the first of equals first) until what is left is at
 * most half a pixel wider than the room: a measured width is never exact.
 */
export function fitFigures(
  parts: Part[],
  widths: number[],
  dot: number,
  comma: number,
  room: number,
): boolean[] {
  const shown = parts.map(() => true)
  const width = () => {
    let sum = 0
    let any = false
    parts.forEach((p, i) => {
      if (!shown[i]) return
      if (any) sum += p.join && shown[i - 1] ? comma : dot
      sum += widths[i]
      any = true
    })
    return sum
  }
  const order = parts
    .map((p, i) => ({ keep: p.keep, i }))
    .sort((a, b) => a.keep - b.keep)
    .map((x) => x.i)
  for (const i of order) {
    if (width() <= room + 0.5) break
    shown[i] = false
  }
  return shown
}
