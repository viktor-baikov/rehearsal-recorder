import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

// The theme file as text: what it decides is in its values, and a browser is
// not needed to read those. The page it makes is checked in e2e/theme.spec.ts.
const css = readFileSync(new URL("../index.css", import.meta.url), "utf-8")

/** The rule that starts at `start` in the file, to its own closing brace:
 *  the braces are counted, so one nested inside (a block in @media, a
 *  keyframe) and any formatting leave it whole. */
function ruleAt(start: number): string {
  const open = css.indexOf("{", start)
  if (start < 0 || open < 0) throw new Error("no such rule in index.css")
  let depth = 0
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++
    else if (css[i] === "}" && --depth === 0) return css.slice(start, i + 1)
  }
  throw new Error("a rule in index.css is not closed")
}

/** What a rule sets between its braces. */
function block(selector: string): string {
  const start = css.indexOf(`\n${selector} {`)
  if (start < 0) throw new Error(`no ${selector} block in index.css`)
  return ruleAt(start)
}

const light = block(":root")
const dark = block(".dark")

/** The value a block gives a variable, as written. */
function value(blockText: string, name: string): string | undefined {
  return new RegExp(`^\\s*${name}:\\s*([^;]+);`, "m").exec(blockText)?.[1].trim()
}

/** An oklch's first number, its lightness. */
function lightness(blockText: string, name: string): number {
  const v = value(blockText, name)
  const m = v && /^oklch\(\s*([\d.]+)/.exec(v)
  if (!m) throw new Error(`${name} is not an oklch colour: ${v}`)
  return Number(m[1])
}

const COBALT = "oklch(0.56 0.24 266)"
const WHITE = "oklch(0.985 0 0)"

describe("the accent", () => {
  it("is cobalt in both themes, for the button, the ring and the plays", () => {
    for (const theme of [light, dark]) {
      expect(value(theme, "--primary")).toBe(COBALT)
      expect(value(theme, "--ring")).toBe(COBALT)
      expect(value(theme, "--primary-foreground")).toBe(WHITE)
    }
  })

  it("leaves what is selected, and Stop, neutral", () => {
    expect(value(light, "--selected")).toBe("oklch(0.92 0.004 286.3)")
    expect(value(dark, "--selected")).toBe("oklch(0.31 0.009 286.3)")
    expect(value(light, "--strong")).toBe("oklch(0.21 0.006 285.9)")
    expect(value(light, "--strong-foreground")).toBe(WHITE)
    expect(value(dark, "--strong")).toBe("oklch(0.93 0.003 286.3)")
    expect(value(dark, "--strong-foreground")).toBe("oklch(0.18 0.006 285.9)")
  })

  it("has the text on danger, and the veil behind a dialog, in both themes", () => {
    for (const theme of [light, dark]) {
      expect(value(theme, "--destructive-foreground")).toBe(WHITE)
      expect(value(theme, "--overlay")).toBe("oklch(0 0 0 / 0.6)")
    }
  })

  it("is offered to Tailwind as colours, the new ones included", () => {
    for (const name of ["selected", "strong", "strong-foreground", "destructive-foreground", "overlay", "label-orange"]) {
      expect(css).toContain(`--color-${name}: var(--${name});`)
    }
  })
})

describe("the labels", () => {
  it("have no blue: cobalt is the only one, and orange takes its place", () => {
    expect(css).not.toMatch(/label-blue/)
    expect(value(light, "--label-orange")).toBe("oklch(0.68 0.17 48)")
    expect(value(dark, "--label-orange")).toBe("oklch(0.7 0.17 45)")
  })
})

describe("a group", () => {
  it("shows against the page in both themes: the card is at least 0.03 lighter than the background", () => {
    for (const theme of [light, dark]) {
      expect(lightness(theme, "--card") - lightness(theme, "--background")).toBeGreaterThanOrEqual(0.03 - 1e-9)
    }
  })
})

describe("the corners", () => {
  it("are 4, 8 and 12 by role, in px, so the Appearance scale leaves them be", () => {
    expect(css).toMatch(/--radius-sm:\s*4px;/)
    expect(css).toMatch(/--radius-md:\s*8px;/)
    expect(css).toMatch(/--radius-lg:\s*12px;/)
    expect(css).toMatch(/--radius-xl:\s*12px;/)
  })

  it("make the bare rounded 4 px too, the same as rounded-sm (F9)", () => {
    // Tailwind's own is 0.25rem, which grows and shrinks with the scale.
    expect([...css.matchAll(/--radius:\s*([^;]+);/g)].map((m) => m[1])).toEqual(["4px"])
  })
})

describe("the type", () => {
  it("is 14 on the body, and figures stay in the system font", () => {
    expect(/body\s*\{[^}]*\btext-sm\b/.test(css)).toBe(true)
    const tnum = /\.tnum\s*\{([^}]*)\}/.exec(css)?.[1] ?? ""
    expect(tnum).toContain("tabular-nums")
    expect(tnum).not.toContain("font-mono")
  })
})

describe("the motion", () => {
  it("is smooth: one curve, hovers at 200 ms, dialogs at 220 and entrances at 250", () => {
    expect(css).toMatch(/--ease-smooth:\s*cubic-bezier\(\.2,\s*\.8,\s*\.2,\s*1\);/)
    expect(css).toMatch(/--default-transition-duration:\s*200ms;/)
    expect(css).toMatch(/--default-transition-timing-function:\s*var\(--ease-smooth\);/)
    expect(css).toMatch(/--animate-rise:[^;]*250ms[^;]*var\(--ease-smooth\)[^;]*\*\s*40ms[^;]*both;/)
    expect(css).toMatch(/--animate-in:[^;]*220ms/)
    expect(css).toMatch(/--animate-out:[^;]*220ms/)
  })

  it("gives way: off under Reduce motion and while recording, prefixed classes too", () => {
    const from = (start: string) => ruleAt(css.indexOf(start))
    const rules = [from("@media (prefers-reduced-motion: reduce)"), from("html[data-recording]")]
    for (const rule of rules) {
      expect(rule).toMatch(/animation:\s*none;/)
      for (const name of ["rise", "in", "out"]) {
        // The class, and the same class behind a variant (data-[state=open]:animate-in).
        expect(rule).toContain(`.animate-${name}`)
        expect(rule).toContain(`[class*=":animate-${name}"]`)
      }
    }
    // The two lists are one list written twice: what one stops, the other does.
    const listed = (rule: string) => /:is\(([^)]*)\)/.exec(rule)?.[1].replace(/\s+/g, "")
    expect(listed(rules[0])).toBeDefined()
    expect(listed(rules[0])).toBe(listed(rules[1]))
  })

  it("rises from below to where the element is, leaving it its own opacity and transform", () => {
    // With fill-mode both, a `to` frame would hold after the animation, over
    // an opacity-* or a translate the element sets for itself.
    const rise = ruleAt(css.indexOf("@keyframes rise"))
    expect(rise).toMatch(/from\s*\{/)
    expect(rise).not.toMatch(/\bto\s*\{/)
  })

  it("takes nothing over 400 ms", () => {
    const times = [...css.matchAll(/(?<![\w.-])(\d*\.?\d+)(ms|s)\b/g)].map(
      (m) => Number(m[1]) * (m[2] === "s" ? 1000 : 1)
    )
    expect(times.length).toBeGreaterThan(0)
    for (const t of times) expect(t).toBeLessThanOrEqual(400)
  })
})
