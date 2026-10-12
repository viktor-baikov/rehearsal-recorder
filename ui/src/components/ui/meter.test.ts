import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { Meter } from "@/components/ui/meter"

const html = (props: Parameters<typeof Meter>[0]) => renderToStaticMarkup(createElement(Meter, props))

describe("Meter", () => {
  it("is the check bar of today: thin, round, framed, on the page's colour", () => {
    const out = html({ sides: [0.5], tone: "signal" })
    for (const css of ["h-2", "rounded-full", "border", "bg-background", "overflow-hidden"]) {
      expect(out, css).toContain(css)
    }
  })

  it("fills in the level's green for a signal and in grey for notes, never the accent", () => {
    expect(html({ sides: [0.5], tone: "signal" })).toContain("bg-signal")
    const notes = html({ sides: [0.5], tone: "notes" })
    expect(notes).toContain("bg-foreground/60")
    expect(notes).not.toMatch(/bg-(primary|signal)/)
  })

  it("follows its value over 75 ms, as the hand-made bars do", () => {
    expect(html({ sides: [0.5], tone: "signal" })).toContain("transition-[width] duration-75")
  })

  it("is as tall as the bar for one side, and splits it for two: the first above, the second below", () => {
    const one = html({ sides: [0.5], tone: "signal" })
    expect(one).toContain("top:0%;bottom:0%")
    const two = html({ sides: [0.2, 0.8], tone: "signal" })
    expect(two).toContain("width:20%;top:0%;bottom:50%")
    expect(two).toContain("width:80%;top:50%;bottom:0%")
  })

  it("keeps a value between empty and full", () => {
    const out = html({ sides: [1.4, -1, Number.NaN], tone: "signal" })
    expect(out).toContain("width:100%")
    expect(out.match(/width:0%/g)).toHaveLength(2)
  })

  it("is a picture, hidden from a screen reader, unless it is given a label", () => {
    const out = html({ sides: [0.5], tone: "signal" })
    expect(out).toContain('aria-hidden="true"')
    expect(out).not.toContain("role=")
  })

  it("with a label is a meter, from 0 to 100, at its largest side", () => {
    const out = html({ sides: [0.2, 0.756], tone: "signal", label: "Drums level" })
    expect(out).toContain('role="meter"')
    expect(out).toContain('aria-label="Drums level"')
    expect(out).toContain('aria-valuemin="0"')
    expect(out).toContain('aria-valuemax="100"')
    expect(out).toContain('aria-valuenow="76"')
    expect(out).not.toContain("aria-hidden")
  })

  it("reads 0 with no sides at all", () => {
    expect(html({ sides: [], tone: "notes", label: "Notes" })).toContain('aria-valuenow="0"')
  })

  it("hands any other prop to the bar, so a screen can find it", () => {
    const out = html({ sides: [0], tone: "signal", className: "flex-1", "data-meter": "Drums" } as never)
    expect(out).toContain('data-meter="Drums"')
    expect(out).toContain("flex-1")
  })
})
