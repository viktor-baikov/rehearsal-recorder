import { createElement, type ComponentProps } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { PanelParts } from "@/components/NextTakeSongs"

/** PanelParts' props with the parts left to createElement's arguments. */
type Bled = ComponentProps<typeof PanelParts>

/** The classes on each part's box, in order. */
const boxes = (markup: string) =>
  [...markup.matchAll(/<div class="([^"]*)">/g)].map((m) => m[1].split(" "))

describe("the Next take panel's parts", () => {
  const a = createElement("p", null, "the field")
  const b = createElement("p", null, "the songs")

  it("draws only the parts that are there, and no line for one that is not", () => {
    const out = renderToStaticMarkup(createElement(PanelParts, null, a, null, false, b))
    const [first, second, ...rest] = boxes(out)
    expect(rest).toEqual([])
    expect(out).toContain("the field")
    expect(out).toContain("the songs")
    // The line is over the second part only, and the room under it is the
    // first's alone.
    expect(first).not.toContain("border-t")
    expect(first).not.toContain("pt-6")
    expect(first).toContain("pb-6")
    expect(second).toContain("border-t")
    expect(second).toContain("pt-6")
    expect(second).not.toContain("pb-6")
  })

  it("runs the line past the panel's padding only when asked to", () => {
    const flush = boxes(renderToStaticMarkup(createElement(PanelParts, null, a, b)))
    expect(flush.flat()).not.toContain("-mx-8")
    const bled = boxes(renderToStaticMarkup(createElement(PanelParts, { bleed: 8 } as Bled, a, b)))
    expect(bled).toHaveLength(2)
    for (const box of bled) expect(box).toEqual(expect.arrayContaining(["-mx-8", "px-8"]))
  })
})
