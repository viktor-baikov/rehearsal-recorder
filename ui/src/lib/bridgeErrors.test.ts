import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  dismissBridgeErrors,
  getBridgeErrors,
  reportBridgeError,
  subscribeBridgeErrors,
} from "@/lib/bridgeErrors"

// Every report is written to the console as an error, which is the point in
// the app and noise here.
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {})
})
afterEach(() => {
  dismissBridgeErrors()
  vi.restoreAllMocks()
})

const fail = (name: string, message: string) => Object.assign(new Error(message), { name })

describe("the bridge's errors", () => {
  it("keeps every report until put away, newest last", () => {
    reportBridgeError("startup", fail("RemovalKept", "Two folders were kept."))
    reportBridgeError("startup", fail("LibraryUnavailable", "The library is not open."))
    reportBridgeError("keep_take", fail("UnicodeEncodeError", "'charmap' codec"))
    expect(getBridgeErrors()).toEqual([
      { method: "startup", name: "RemovalKept", message: "Two folders were kept." },
      { method: "startup", name: "LibraryUnavailable", message: "The library is not open." },
      { method: "keep_take", name: "UnicodeEncodeError", message: "'charmap' codec" },
    ])
  })

  it("does not repeat a report it already has: same call, same exception, same words", () => {
    reportBridgeError("take_health", fail("OSError", "The card is gone."))
    reportBridgeError("rename_take", fail("OSError", "Access denied."))
    reportBridgeError("take_health", fail("OSError", "The card is gone."))
    expect(getBridgeErrors().map((e) => e.method)).toEqual(["take_health", "rename_take"])
    // Each one is still written to the console, as it happened.
    expect(console.error).toHaveBeenCalledTimes(3)
  })

  it("keeps reports that differ in any one of the three", () => {
    reportBridgeError("rename_take", fail("OSError", "Access denied."))
    reportBridgeError("rename_rehearsal", fail("OSError", "Access denied."))
    reportBridgeError("rename_take", fail("PermissionError", "Access denied."))
    reportBridgeError("rename_take", fail("OSError", "The disk is full."))
    expect(getBridgeErrors()).toHaveLength(4)
  })

  it("puts them all away at once", () => {
    reportBridgeError("startup", fail("RemovalKept", "Two folders were kept."))
    reportBridgeError("startup", fail("OperationalError", "Could not read Tuesday jam."))
    dismissBridgeErrors()
    expect(getBridgeErrors()).toEqual([])
    // And the same report, said again after that, shows again.
    reportBridgeError("startup", fail("RemovalKept", "Two folders were kept."))
    expect(getBridgeErrors()).toHaveLength(1)
  })

  it("names what was thrown when it is not an Error", () => {
    reportBridgeError("undo_trash", "the bridge went away")
    expect(getBridgeErrors()).toEqual([
      { method: "undo_trash", name: "Error", message: "the bridge went away" },
    ])
  })

  it("tells the bar of a change, and only of a change", () => {
    const heard = vi.fn()
    const stop = subscribeBridgeErrors(heard)
    reportBridgeError("startup", fail("RemovalKept", "Two folders were kept."))
    const once = getBridgeErrors()
    reportBridgeError("startup", fail("RemovalKept", "Two folders were kept."))
    // Nothing new: the same list, so React does not draw the bar again.
    expect(getBridgeErrors()).toBe(once)
    dismissBridgeErrors()
    expect(heard).toHaveBeenCalledTimes(2)
    stop()
    reportBridgeError("startup", fail("RemovalKept", "Two folders were kept."))
    expect(heard).toHaveBeenCalledTimes(2)
  })
})
