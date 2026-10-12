import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { FigureLine, Figures, Whole, type FigurePart } from "@/components/ui/whole"

const parts = [
  { text: "18 inputs", keep: 2 },
  { text: "48 kHz", keep: 1 },
  { text: "24 bit", keep: 0 },
]

describe("Figures", () => {
  const out = renderToStaticMarkup(createElement(Figures, { parts, className: "text-xs" }))

  it("keeps the whole line for a screen reader, whatever shows", () => {
    expect(out).toContain('<span class="sr-only">18 inputs · 48 kHz · 24 bit</span>')
  })

  it("shows its line to the eye only, so it is not read twice", () => {
    expect(out).toMatch(/<span aria-hidden="true" data-shown="true">18 inputs · 48 kHz · 24 bit<\/span>/)
  })

  it("takes the room the name leaves and cuts what is left over", () => {
    expect(out).toContain("flex-[1_1_0%]")
    expect(out).toContain("truncate")
  })

  it("keeps one line of height even when every figure has dropped, so it can still be hovered", () => {
    expect(out).toContain("min-h-lh")
  })

  it("is its own tip's trigger, unless the row round it says the line in its tip", () => {
    const box = (markup: string) => markup.slice(0, markup.indexOf(">") + 1)
    expect(box(out)).toContain("data-figures")
    expect(box(out)).toContain('data-slot="tooltip-trigger"')
    const bare = renderToStaticMarkup(createElement(Figures, { parts, tip: false }))
    expect(box(bare)).toContain("data-figures")
    expect(bare).not.toContain("tooltip-trigger")
  })

  it("can be what a control is described by: its box, which reads as the whole line", () => {
    const described = renderToStaticMarkup(createElement(Figures, { parts, id: "figs", tip: false }))
    expect(described).toMatch(/^<span id="figs" data-figures="true"/)
  })
})

describe("Whole", () => {
  it("is its text in a block, which is what can be cut", () => {
    const out = renderToStaticMarkup(createElement(Whole, { text: "A long name", className: "truncate" }))
    expect(out).toMatch(/<span class="block truncate"[^>]*>A long name<\/span>/)
  })

  it("is its own tip's trigger, so the pointer on the text is what asks for it", () => {
    const out = renderToStaticMarkup(createElement(Whole, { text: "A long name" }))
    expect(out).toMatch(/<span[^>]*data-slot="tooltip-trigger"[^>]*>A long name<\/span>/)
  })

  it("takes no Tab stop and no ring of its own unless it is asked to reach", () => {
    const out = renderToStaticMarkup(createElement(Whole, { text: "A long name" }))
    expect(out).not.toContain("tabindex")
    expect(out).not.toContain("focus-visible")
  })

  it("with reach has the shared focus ring, and a Tab stop only once it is cut", () => {
    // Rendered on the server nothing is measured, so nothing is cut yet.
    const out = renderToStaticMarkup(createElement(Whole, { text: "A long name", reach: true }))
    expect(out).toContain("focus-visible:ring-[3px]")
    expect(out).toContain("focus-visible:ring-ring/50")
    expect(out).not.toContain("tabindex")
  })

  it("puts what else it is given on its text's box", () => {
    // A variable, not a literal: only JSX lets a data- attribute through.
    const props = { text: "Drums", reach: true, className: "truncate", "data-plate-name": "Drums" }
    const out = renderToStaticMarkup(createElement(Whole, props))
    expect(out).toMatch(/<span[^>]*data-plate-name="Drums"[^>]*class="[^"]*truncate[^"]*"[^>]*>Drums<\/span>/)
  })
})

describe("a figure drawn as more than its text", () => {
  // A ★ go: drawn with the star icon, measured as drawn, read as its words.
  const drawn: FigurePart[] = [
    { text: "★ Dym 2", keep: 3, node: createElement("b", null, "Dym 2") },
    { text: "Sat 19 Sep", keep: 1 },
    { text: "3 weeks ago", keep: 0, join: ", " },
  ]

  it("shows its drawing, and is read as its words", () => {
    const out = renderToStaticMarkup(createElement(Figures, { parts: drawn }))
    expect(out).toContain('<span class="sr-only">★ Dym 2 · Sat 19 Sep, 3 weeks ago</span>')
    expect(out).toMatch(/data-shown="true"><b>Dym 2<\/b> · Sat 19 Sep, 3 weeks ago<\/span>/)
    // The unseen copy each figure is measured by is the drawing.
    expect(out).toContain('whitespace-pre"><span><b>Dym 2</b></span><span>Sat 19 Sep</span>')
  })

  it("is drawn the same in the line a tip carries", () => {
    const out = renderToStaticMarkup(createElement(FigureLine, { parts: drawn }))
    expect(out).toBe("<b>Dym 2</b> · Sat 19 Sep, 3 weeks ago")
  })
})
