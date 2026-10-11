import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { Alert, AlertTitle } from "@/components/ui/alert"

const html = (variant?: "default" | "warning" | "destructive") =>
  renderToStaticMarkup(createElement(Alert, { variant }, createElement(AlertTitle, null, "Title")))

describe("Alert", () => {
  it("warns in the theme's warning colour: its edge, a faint wash and its icon", () => {
    const warning = html("warning")
    expect(warning).toContain("border-warn")
    expect(warning).toContain("bg-warn/10")
    expect(warning).toContain("[&amp;&gt;svg]:text-warn")
  })

  it("keeps the warning colour out of the other two", () => {
    expect(html("default")).not.toContain("warn")
    expect(html("destructive")).not.toContain("warn")
  })

  it("is a role of its own, and a title at 600", () => {
    expect(html()).toContain('role="alert"')
    expect(html()).toContain("font-semibold")
  })
})
