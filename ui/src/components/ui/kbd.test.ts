import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { Kbd } from "@/components/ui/kbd"

describe("Kbd", () => {
  it("is in the weight and the colour of the text around it", () => {
    const chip = renderToStaticMarkup(createElement(Kbd, null, "Space"))
    expect(chip).toContain("font-normal")
    expect(chip).toContain("border-current/30")
  })

  it("keeps nothing for an icon, which no key chip holds", () => {
    const chip = renderToStaticMarkup(createElement(Kbd, null, "Space"))
    expect(chip).not.toContain("gap-1")
    expect(chip).not.toContain("svg")
  })
})
