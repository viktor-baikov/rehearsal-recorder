import { describe, expect, it } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"

describe("Tooltip", () => {
  it("waits 400 ms before it shows", () => {
    const provider = TooltipProvider({ children: null })
    expect(provider.props.delayDuration).toBe(400)
  })
})
