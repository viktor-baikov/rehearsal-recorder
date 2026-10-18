import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { Checkbox } from "@/components/ui/checkbox"

describe("Checkbox", () => {
  it("is a checkbox that says whether it is ticked", () => {
    const off = renderToStaticMarkup(createElement(Checkbox, { "aria-label": "Send" }))
    expect(off).toContain('role="checkbox"')
    expect(off).toContain('aria-checked="false"')
    const on = renderToStaticMarkup(createElement(Checkbox, { "aria-label": "Send", defaultChecked: true }))
    expect(on).toContain('aria-checked="true"')
    expect(on).toContain('data-state="checked"')
  })

  it("is ticked in the text's colour and never the accent (F2)", () => {
    const html = renderToStaticMarkup(createElement(Checkbox, { "aria-label": "Send" }))
    expect(html).toContain("data-[state=checked]:bg-foreground")
    expect(html).toContain("data-[state=checked]:text-background")
    expect(html).not.toMatch(/bg-primary|bg-signal/)
  })

  it("has the 4 px corner of a small thing (F9)", () => {
    const html = renderToStaticMarkup(createElement(Checkbox, { "aria-label": "Send" }))
    expect(html).toContain("rounded-sm")
    expect(html).not.toMatch(/rounded-\[|rounded-xs/)
  })

  it("keeps the caller's classes", () => {
    const html = renderToStaticMarkup(createElement(Checkbox, { "aria-label": "Send", className: "mt-1" }))
    expect(html).toContain("mt-1")
  })
})
