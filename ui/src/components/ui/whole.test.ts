import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { FigureLine, Figures, Whole } from "@/components/ui/whole"

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
})

describe("a figure drawn as more than its text", () => {
  // A ★ go: drawn with the star icon, read and measured as its words.
  const drawn = [
    { text: "★ Dym 2", keep: 3, node: createElement("b", null, "Dym 2") },
    { text: "Sat 19 Sep", keep: 1 },
    { text: "3 weeks ago", keep: 0, join: ", " },
  ]

  it("shows its drawing, and is read as its words", () => {
    const out = renderToStaticMarkup(createElement(Figures, { parts: drawn }))
    expect(out).toContain('<span class="sr-only">★ Dym 2 · Sat 19 Sep, 3 weeks ago</span>')
    expect(out).toMatch(/data-shown="true"><b>Dym 2<\/b> · Sat 19 Sep, 3 weeks ago<\/span>/)
  })

  it("is drawn the same in the line a tip carries", () => {
    const out = renderToStaticMarkup(createElement(FigureLine, { parts: drawn }))
    expect(out).toBe("<b>Dym 2</b> · Sat 19 Sep, 3 weeks ago")
  })
})
