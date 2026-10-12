/**
 * The arithmetic behind a figure line beside a name (B6): which figures fit
 * in the room the name leaves, and the line they make. Pure, so the
 * measuring (components/ui/whole.tsx) is the only part that needs a browser.
 */

/** One figure of a figure line: `keep` orders what goes first (lowest
 *  first); `join` is a comma joining it to the figure before it while that
 *  one shows (" · " otherwise). The comma is the one other join there is:
 *  Figures measures the dot and the comma alone. */
export type Part = { text: string; keep: number; join?: ", " }

/** The join between two figures, unless a part says otherwise. */
const DOT = " · "

/** What sits between two shown figures when the one after is `part` and the
 *  one before it, in the list, is shown or not. */
const joinBefore = (part: Part, beforeShown: boolean) =>
  part.join && beforeShown ? part.join : DOT

/** What goes before each figure in the line the shown ones make: nothing
 *  before the first shown, and null for one that is not shown. The line is
 *  written from these (joinFigures) and drawn from them (whole.tsx). */
export function joinsOf(parts: Part[], shown: boolean[]): (string | null)[] {
  let any = false
  return parts.map((p, i) => {
    if (!shown[i]) return null
    const join = any ? joinBefore(p, shown[i - 1]) : ""
    any = true
    return join
  })
}

/** The line the shown figures make. */
export function joinFigures(parts: Part[], shown: boolean[]): string {
  const joins = joinsOf(parts, shown)
  return parts.map((p, i) => (joins[i] === null ? "" : joins[i] + p.text)).join("")
}

/**
 * Which figures show in `room` px. `widths` are the parts measured alone;
 * `dot` and `comma` are the widths of " · " and of ", ". Parts drop lowest
 * `keep` first (the first of equals first) until what is left is at most half
 * a pixel wider than the room: a measured width is never exact. The line is
 * measured as joinsOf joins it, so what is fitted is what is drawn.
 */
export function fitFigures(
  parts: Part[],
  widths: number[],
  dot: number,
  comma: number,
  room: number,
): boolean[] {
  const shown = parts.map(() => true)
  const joinWidth = (join: string) => (join === "" ? 0 : join === DOT ? dot : comma)
  const width = () =>
    joinsOf(parts, shown).reduce<number>(
      (sum, join, i) => (join === null ? sum : sum + joinWidth(join) + widths[i]),
      0,
    )
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
