import { afterEach, describe, expect, it, vi } from "vitest"
import { dismiss, getNotices } from "@/lib/notices"
import { keysOn, loadKeys, switchKeys } from "@/lib/keys"

// Python, as far as a switch reaches it: what save_keys answers is set by the
// test.
const bridge = vi.hoisted(() => ({ save_keys: vi.fn() }))
vi.mock("@/lib/api", () => ({ api: () => bridge }))

const said = () => getNotices().find((n) => n.key === "keys")

afterEach(() => {
  loadKeys({})
  dismiss("keys")
  bridge.save_keys.mockReset()
})

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

describe("switchKeys", () => {
  it("is in force at once, and stays once Python has kept it", async () => {
    bridge.save_keys.mockResolvedValue({ ok: true })
    const saving = switchKeys("player", false)
    expect(keysOn("player")).toBe(false)
    await saving
    expect(bridge.save_keys).toHaveBeenCalledWith("player", false)
    expect(keysOn("player")).toBe(false)
    expect(keysOn("space")).toBe(true)
    expect(said()).toBeUndefined()
  })

  it("puts the keys back when Python refuses, and says why in an error notice", async () => {
    bridge.save_keys.mockResolvedValue({ ok: false, error: "Could not write the settings" })
    await switchKeys("space", false)
    expect(keysOn("space")).toBe(true)
    expect(said()).toMatchObject({ kind: "error", text: "Could not write the settings" })
  })
})
