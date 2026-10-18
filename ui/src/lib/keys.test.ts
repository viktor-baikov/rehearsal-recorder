import { describe, expect, it } from "vitest"
import { keysOn, loadKeys } from "@/lib/keys"

describe("keys", () => {
  it("has Space and Esc, and the player's keys, on before the settings are read", () => {
    expect(keysOn("space")).toBe(true)
    expect(keysOn("player")).toBe(true)
  })

  it("reads a setting that is not there as on", () => {
    loadKeys({})
    expect(keysOn("space")).toBe(true)
    expect(keysOn("player")).toBe(true)
  })

  it("turns off only the keys the settings say are off", () => {
    loadKeys({ space_keys: false })
    expect(keysOn("space")).toBe(false)
    expect(keysOn("player")).toBe(true)
  })
})
