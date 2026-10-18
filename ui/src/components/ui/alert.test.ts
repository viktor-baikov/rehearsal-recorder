import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { Alert, AlertTitle, Warning } from "@/components/ui/alert"

const html = (variant?: "default" | "warning" | "destructive", size?: "box" | "line") =>
  renderToStaticMarkup(
    createElement(Alert, { variant, size }, createElement(AlertTitle, null, "Title"))
  )

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

  it("has a Warning for a line that stays: the warning alert, a triangle and one paragraph, a status", () => {
    const note = renderToStaticMarkup(createElement(Warning, null, "Words"))
    expect(note).toContain('role="status"')
    expect(note).toContain("bg-warn/10")
    expect(note).toContain("lucide-triangle-alert")
    expect(note).toContain("<p>Words</p>")
  })

  it("is a role of its own, and a title at 600", () => {
    expect(html()).toContain('role="alert"')
    expect(html()).toContain("font-semibold")
  })

  it("is a box unless it is asked to be a line", () => {
    expect(html()).toContain('data-size="box"')
    expect(html()).toContain("border")
  })

  it("as a line has no box, is one line of 12 px words cut at its end, and keeps its role", () => {
    const line = html("warning", "line")
    expect(line).toContain('data-size="line"')
    expect(line).toContain('role="alert"')
    // 24 px tall, the words 12 px, and the wash of the box is gone.
    expect(line).toContain("h-6")
    expect(line).toContain("text-xs")
    expect(line).toContain("bg-transparent")
    // The icon keeps the variant's colour; a box's room round the words and
    // its frame are not on it.
    expect(line).toContain("[&amp;&gt;svg]:text-warn")
    expect(line).not.toMatch(/(?:^|[\s"])(?:px-4|py-3|rounded-lg)(?=[\s"])/)
    expect(line).not.toMatch(/(?:^|[\s"])border(?=[\s"])/)
  })

  it("as a line cuts its words with an ellipsis", () => {
    expect(html("destructive", "line")).toContain("truncate")
  })
})
