import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { LabelDot, MarkLine } from "@/components/ui/mark"
import type { LabelColour } from "@/lib/api"
import { LABEL_COLOURS, labelLook } from "@/lib/labels"

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
  it("is an empty mark a screen reader skips: the line says the label in words", () => {
    const out = renderToStaticMarkup(createElement(LabelDot, { colour: "teal" }))
    // One element with nothing in it, out of the accessibility tree, and
    // nothing that would put it back (a role or a name).
    expect(out).toMatch(/^<span [^>]*><\/span>$/)
    expect(out).toContain('aria-hidden="true"')
    expect(out).not.toMatch(/\brole=|aria-label|title=|tabindex/)
  })

  it("is drawn in its label's colour, the one colour labelLook gives it", () => {
    const dot = (colour: LabelColour) => renderToStaticMarkup(createElement(LabelDot, { colour }))
    for (const colour of LABEL_COLOURS) expect(dot(colour)).toContain(labelLook(colour).dot)
    // Two labels' dots are told apart by colour alone.
    expect(dot("teal")).not.toEqual(dot("red"))
    // A colour from a newer version's library is grey, as everywhere.
    expect(dot("indigo" as LabelColour)).toEqual(dot("grey"))
  })

  it("is the one dot of a note line, before its time", () => {
    const out = renderToStaticMarkup(createElement(MarkLine, { label: issue, at: 58, note: "" }))
    expect(out.match(/data-slot="label-dot"/g)).toHaveLength(1)
    expect(out).toMatch(/^<span data-note="true"[^>]*><span aria-hidden="true" data-slot="label-dot"[^>]*><\/span><span[^>]*>0:58<\/span>/)
  })
})
