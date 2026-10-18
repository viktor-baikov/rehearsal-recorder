import { describe, expect, it } from "vitest"
import { isWide, SETTINGS_WIDE_REM } from "@/lib/wide"

describe("isWide: room for the start screen's left part beside the setup", () => {
  it("1100 px at 100 %", () => expect(isWide(1100, 16)).toBe(true))
  it("not a pixel less", () => expect(isWide(1099, 16)).toBe(false))
  it("not 1100 px at 130 %", () => expect(isWide(1100, 20.8)).toBe(false))
  it("1430 px at 130 %", () => expect(isWide(1430, 20.8)).toBe(true))
})

describe("isWide at Settings' width: room for the sections' names beside the tab", () => {
  it("960 px at 100 %", () => expect(isWide(960, 16, SETTINGS_WIDE_REM)).toBe(true))
  it("not 1349 px at 150 %", () => expect(isWide(1349, 24, SETTINGS_WIDE_REM)).toBe(false))
  it("1350 px at 150 %", () => expect(isWide(1350, 24, SETTINGS_WIDE_REM)).toBe(true))
})
