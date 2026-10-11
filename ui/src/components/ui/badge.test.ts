import { describe, expect, it } from "vitest"
import { badgeVariants } from "@/components/ui/badge"

describe("Badge", () => {
  it("is destructive in full colour in both themes, as the Button is", () => {
    expect(badgeVariants({ variant: "destructive" })).not.toContain("dark:bg-destructive")
  })

  it("is set at 600, one of the two weights (F5), in every variant", () => {
    for (const variant of ["default", "secondary", "destructive", "outline", "signal", "warn"] as const) {
      const css = badgeVariants({ variant })
      expect(css, variant).toContain("font-semibold")
      expect(css, variant).not.toContain("font-medium")
    }
  })
})
