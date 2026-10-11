import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { Label } from "@/components/ui/label"

describe("Label", () => {
  it("is regular weight, as the system's own form labels are", () => {
    const label = renderToStaticMarkup(createElement(Label, null, "Song name"))
    expect(label).toContain("font-normal")
    expect(label).not.toContain("font-medium")
  })
})
