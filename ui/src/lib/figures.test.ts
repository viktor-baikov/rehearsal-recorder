import { describe, expect, it } from "vitest"
import { fitFigures, joinFigures, type Part } from "@/lib/figures"

const p = (text: string, keep: number, join?: string): Part => ({ text, keep, join })
const parts = [p("18 inputs", 2), p("48 kHz", 1), p("24 bit", 0)]

describe("fitFigures: which figures show beside a name", () => {
  it("all fit", () => expect(fitFigures(parts, [60, 40, 40], 10, 6, 200)).toEqual([true, true, true]))
  it("the least needed goes first", () =>
    expect(fitFigures(parts, [60, 40, 40], 10, 6, 115)).toEqual([true, true, false]))
  it("then the next", () =>
    expect(fitFigures(parts, [60, 40, 40], 10, 6, 65)).toEqual([true, false, false]))
  it("none fit", () => expect(fitFigures(parts, [60, 40, 40], 10, 6, 20)).toEqual([false, false, false]))

  it("takes half a pixel of slack, as a measured width is never exact", () => {
    // 60 + 10 + 40 + 10 + 40 = 160.
    expect(fitFigures(parts, [60, 40, 40], 10, 6, 159.5)).toEqual([true, true, true])
    expect(fitFigures(parts, [60, 40, 40], 10, 6, 159.4)).toEqual([true, true, false])
  })

  it("counts a comma join, not the dot, between a part and the one before it", () => {
    const dated = [p("Sat 19 Sep", 1), p("3 weeks ago", 0, ", ")]
    // 50 + 6 + 70 = 126 with the comma, 130 with the dot.
    expect(fitFigures(dated, [50, 70], 10, 6, 126)).toEqual([true, true])
    expect(fitFigures(dated, [50, 70], 10, 6, 125)).toEqual([true, false])
  })

  it("counts the dot when the part before a comma join has gone", () => {
    const three = [p("a", 2), p("b", 0), p("c", 1, ", ")]
    // b goes first, and c is then joined to a by a dot: 20 + 10 + 40 = 70.
    expect(fitFigures(three, [20, 30, 40], 10, 6, 70)).toEqual([true, false, true])
    expect(fitFigures(three, [20, 30, 40], 10, 6, 66)).toEqual([true, false, false])
  })

  it("drops equal keeps from the first, and shows nothing for no parts", () => {
    const tied = [p("a", 0), p("b", 0)]
    expect(fitFigures(tied, [30, 30], 10, 6, 30)).toEqual([false, true])
    expect(fitFigures([], [], 10, 6, 0)).toEqual([])
  })
})

describe("joinFigures: the line the shown figures make", () => {
  it("a comma join only after a shown part", () =>
    expect(joinFigures([p("Sat 19 Sep", 1), p("3 weeks ago", 0, ", ")], [true, true])).toBe(
      "Sat 19 Sep, 3 weeks ago",
    ))

  it("is a dot between figures otherwise", () =>
    expect(joinFigures(parts, [true, true, true])).toBe("18 inputs · 48 kHz · 24 bit"))

  it("leaves the dropped ones out, and the join of a part whose neighbour went falls back to the dot", () => {
    const dated = [p("a", 2), p("b", 0), p("c", 1, ", ")]
    expect(joinFigures(dated, [true, false, true])).toBe("a · c")
    expect(joinFigures(dated, [false, true, true])).toBe("b, c")
  })

  it("is empty when nothing shows", () => expect(joinFigures(parts, [false, false, false])).toBe(""))
})
