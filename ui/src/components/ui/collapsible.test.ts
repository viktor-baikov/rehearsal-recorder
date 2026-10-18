import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

const shown = (open: boolean) =>
  renderToStaticMarkup(
    createElement(
      Collapsible,
      { open },
      createElement(CollapsibleTrigger, null, "More"),
      createElement(CollapsibleContent, null, "The rest")
    )
  )

describe("Collapsible", () => {
  it("names its three parts, for a screen that reaches one by its slot", () => {
    const html = shown(true)
    expect(html).toContain('data-slot="collapsible"')
    expect(html).toContain('data-slot="collapsible-trigger"')
    expect(html).toContain('data-slot="collapsible-content"')
  })

  it("closed, the trigger says so and the content is not drawn", () => {
    const html = shown(false)
    expect(html).toContain('aria-expanded="false"')
    expect(html).not.toContain("The rest")
  })

  it("open, the trigger says so and the content is drawn", () => {
    const html = shown(true)
    expect(html).toContain('aria-expanded="true"')
    expect(html).toContain("The rest")
  })
})
