import { describe, expect, it } from "vitest"
import { isWide } from "@/lib/wide"

describe("isWide: room for the start screen's left part beside the setup", () => {
  it("1100 px at 100 %", () => expect(isWide(1100, 16)).toBe(true))
  it("not a pixel less", () => expect(isWide(1099, 16)).toBe(false))
  it("not 1100 px at 130 %", () => expect(isWide(1100, 20.8)).toBe(false))
  it("1430 px at 130 %", () => expect(isWide(1430, 20.8)).toBe(true))
})
