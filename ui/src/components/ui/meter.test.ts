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

/** The classes of the meter's own box, the outermost element. */
const rootClasses = (out: string) => (/^<div[^>]*\bclass="([^"]*)"/.exec(out)?.[1] ?? "").split(" ")

describe("Meter, upright", () => {
  const up = (props: Partial<Parameters<typeof Meter>[0]>) =>
    html({ sides: [0.5], tone: "signal", direction: "up", ...props } as Parameters<typeof Meter>[0])

  it("fills the box it is given, with no frame, corners or ground of its own", () => {
    const root = rootClasses(up({}))
    for (const css of ["flex", "size-full", "gap-0.5"]) expect(root, css).toContain(css)
    for (const css of ["border", "rounded-full", "bg-background", "h-2", "overflow-hidden"])
      expect(root, css).not.toContain(css)
  })

  it("draws each side up from the bottom, numbered from 1, side by side", () => {
    const out = up({ sides: [0.2, 0.8] })
    expect(out).toContain('data-side="1" data-level="20"')
    expect(out).toContain('data-side="2" data-level="80"')
    expect(out.match(/data-fill/g)).toHaveLength(2)
    expect(out).toContain("absolute inset-x-0 bottom-0 border-t-2")
    expect(out).toContain("height:20%")
    expect(out).toContain("height:80%")
  })

  it("says what each side reads as its level, where its fill stands on another scale", () => {
    // A tile's fill is in dB; what it reads is the peak.
    const out = up({ sides: [0.9, 0.7], levels: [0.5, 0.126] })
    expect(out).toContain('data-side="1" data-level="50"')
    expect(out).toContain('data-side="2" data-level="13"')
    expect(out).toContain("height:90%")
    expect(out).toContain("height:70%")
  })

  it("fills in the level's green on a tint of it, as the tile did", () => {
    expect(up({})).toContain("border-signal bg-signal/15")
  })

  it("draws a clipped side in destructive on a stronger tint, and only that side", () => {
    const out = up({ sides: [0.5, 0.99], clipped: [false, true] })
    expect(out.match(/border-destructive bg-destructive\/25/g)).toHaveLength(1)
    expect(out.match(/border-signal bg-signal\/15/g)).toHaveLength(1)
    expect(out.indexOf("border-signal")).toBeLessThan(out.indexOf("border-destructive"))
  })

  it("draws notes in grey, in the text's colour, never the accent", () => {
    const out = up({ tone: "notes", sides: [0.6] })
    expect(out).toContain("border-foreground/60 bg-foreground/15")
    expect(out).not.toMatch(/(bg|border)-(primary|signal)/)
  })

  it("draws no fill at all for a side at 0, and keeps a value between empty and full", () => {
    const out = up({ sides: [0, 1.4, -1, Number.NaN] })
    expect(out.match(/data-side=/g)).toHaveLength(4)
    expect(out.match(/data-fill/g)).toHaveLength(1)
    expect(out).toContain("height:100%")
  })

  it("draws a held line, 2 px of the text at 35 %, for a held value over 0", () => {
    const out = up({ sides: [0.5, 0.5], held: [0.7, 0] })
    expect(out.match(/data-held/g)).toHaveLength(1)
    expect(out).toContain("absolute inset-x-0 h-0.5 bg-foreground/35")
    expect(out).toContain("bottom:calc(70% - 1.4px)")
    expect(up({ sides: [0.5] })).not.toContain("data-held")
  })

  it("keeps a held line at full scale inside its box, as the top 2 px of it", () => {
    // At 100 % the line would stand on the box's top, all of it outside.
    const out = up({ sides: [1], held: [1] })
    expect(out).toContain("bottom:calc(100% - 2px)")
    expect(out).not.toMatch(/bottom:100%/)
  })

  it("follows its value over 75 ms, as across does", () => {
    expect(up({})).toContain("transition-[height] duration-75")
  })

  it("is a picture unless it is given a label, as across is", () => {
    expect(up({})).toContain('aria-hidden="true"')
    expect(up({ label: "Drums level", sides: [0.2, 0.6] })).toContain('aria-valuenow="60"')
  })

  it("leaves across as it was when no direction is given", () => {
    const out = html({ sides: [0.5], tone: "signal" })
    expect(out).not.toContain("data-side")
    expect(out).toContain("transition-[width] duration-75")
  })
})
