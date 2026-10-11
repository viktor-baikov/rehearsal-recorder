import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { LabelDot, MarkLine } from "@/components/ui/mark"

const issue = { id: 3, name: "Issue", colour: "red" as const, marks: 4 }

describe("MarkLine", () => {
  it("is the label's dot, the time, the take and the words, in that order", () => {
    const out = renderToStaticMarkup(
      createElement(MarkLine, { label: issue, at: 58, note: "chorus came in early", take: "Pałyn 5" }),
    )
    const order = ["bg-label-red", ">0:58<", "Pałyn 5 · ", "Issue · chorus came in early"].map((s) =>
      out.indexOf(s),
    )
    expect(order.every((at) => at >= 0)).toBe(true)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
  })

  it("says only its label when nothing is written, and no take when given none", () => {
    const out = renderToStaticMarkup(createElement(MarkLine, { label: issue, at: 5, note: " " }))
    expect(out).toMatch(/>Issue<\/span><\/span>$/)
    expect(out).not.toContain(" · ")
  })

  it("is a note line wherever it is, for the pages that count them", () => {
    const out = renderToStaticMarkup(createElement(MarkLine, { label: issue, at: 5, note: "" }))
    expect(out).toMatch(/^<span data-note="true"/)
  })
})

describe("LabelDot", () => {
  it("is one size, round, in its label's colour, and not read out", () => {
    const out = renderToStaticMarkup(createElement(LabelDot, { colour: "teal" }))
    expect(out).toContain('aria-hidden="true"')
    expect(out).toMatch(/class="[^"]*\bsize-2\b[^"]*\brounded-full\b[^"]*\bbg-label-teal\b/)
  })
})
