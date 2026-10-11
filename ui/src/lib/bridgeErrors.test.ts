import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  dismissBridgeErrors,
  getBridgeErrors,
  getMoreBridgeErrors,
  KEPT,
  reportBridgeError,
  reportPageError,
  subscribeBridgeErrors,
  TOLD_APART,
  whereTheRestIs,
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

  it("lists the first 20 and counts the rest", () => {
    for (let i = 1; i <= 25; i++) {
      reportBridgeError("startup", fail("OperationalError", `Could not read rehearsal ${i}.`))
    }
    expect(KEPT).toBe(20)
    const listed = getBridgeErrors()
    expect(listed).toHaveLength(20)
    // The first ones, which in a cascade are the cause.
    expect(listed[0].message).toBe("Could not read rehearsal 1.")
    expect(listed[19].message).toBe("Could not read rehearsal 20.")
    expect(getMoreBridgeErrors()).toBe(5)
    expect(whereTheRestIs(getMoreBridgeErrors())).toBe(
      "and 5 more; all of them are in ~/.rehearsal-recorder/crash.log."
    )
  })

  it("counts each of the rest once, and adds nothing for a listed one said again", () => {
    for (let i = 1; i <= 22; i++) {
      reportBridgeError("get_levels", fail("IndexError", `index ${i} out of range`))
    }
    const full = getBridgeErrors()
    reportBridgeError("get_levels", fail("IndexError", "index 3 out of range"))
    reportBridgeError("get_levels", fail("IndexError", "index 21 out of range"))
    reportBridgeError("get_levels", fail("IndexError", "index 22 out of range"))
    expect(getMoreBridgeErrors()).toBe(2)
    // A full list stays the same list: only the count moves.
    expect(getBridgeErrors()).toBe(full)
    reportBridgeError("get_levels", fail("IndexError", "index 23 out of range"))
    expect(getBridgeErrors()).toBe(full)
    expect(getMoreBridgeErrors()).toBe(3)
  })

  it("stops telling the rest apart past a thousand, so it does not keep them all", () => {
    const levels = (i: number) =>
      reportBridgeError("get_levels", fail("IndexError", `index ${i} out of range`))
    for (let i = 1; i <= KEPT + TOLD_APART; i++) levels(i)
    expect(getMoreBridgeErrors()).toBe(1000)
    // One it told apart, said again, still adds nothing.
    levels(KEPT + 1)
    expect(getMoreBridgeErrors()).toBe(1000)
    // Past that, each report counts, even a repeat.
    levels(KEPT + TOLD_APART + 1)
    levels(KEPT + TOLD_APART + 1)
    expect(getMoreBridgeErrors()).toBe(1002)
  })

  it("puts the count away with the list", () => {
    for (let i = 1; i <= 21; i++) {
      reportBridgeError("startup", fail("OperationalError", `Could not read rehearsal ${i}.`))
    }
    expect(getMoreBridgeErrors()).toBe(1)
    dismissBridgeErrors()
    expect(getBridgeErrors()).toEqual([])
    expect(getMoreBridgeErrors()).toBe(0)
    // The one that was counted, said again, is listed now.
    reportBridgeError("startup", fail("OperationalError", "Could not read rehearsal 21."))
    expect(getBridgeErrors().map((e) => e.message)).toEqual(["Could not read rehearsal 21."])
    expect(getMoreBridgeErrors()).toBe(0)
  })

  it("says where the whole error is when none are left out", () => {
    expect(whereTheRestIs(0)).toBe("The full error is in ~/.rehearsal-recorder/crash.log.")
    expect(whereTheRestIs(1)).toBe(
      "and 1 more; all of them are in ~/.rehearsal-recorder/crash.log."
    )
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

describe("a problem raised in the page itself", () => {
  // It never passed through Python, so nothing wrote it to crash.log: the
  // page sends it there, straight through the bridge.
  let sent: ReturnType<typeof vi.fn>
  beforeEach(() => {
    sent = vi.fn(async () => null)
    vi.stubGlobal("window", { pywebview: { api: { log_problem: sent } } })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("is listed like any other, and sent to Python's log once", () => {
    const e = fail("TypeError", "Cannot read properties of undefined")
    reportPageError("Undo", e)
    expect(getBridgeErrors()).toEqual([
      { method: "Undo", name: "TypeError", message: "Cannot read properties of undefined" },
    ])
    expect(sent).toHaveBeenCalledTimes(1)
    expect(sent).toHaveBeenCalledWith(
      "Undo",
      "TypeError",
      "Cannot read properties of undefined",
      e.stack
    )
  })

  it("is not sent again when said again", () => {
    reportPageError("Undo", fail("TypeError", "Cannot read properties of undefined"))
    reportPageError("Undo", fail("TypeError", "Cannot read properties of undefined"))
    reportPageError("end_trash", fail("TypeError", "Cannot read properties of undefined"))
    expect(sent.mock.calls.map((c) => c[0])).toEqual(["Undo", "end_trash"])
  })

  it("is sent when counted past the list, and not again once counted", () => {
    for (let i = 1; i <= KEPT; i++) reportBridgeError("startup", fail("OperationalError", `${i}`))
    reportPageError("Undo", fail("TypeError", "after the list"))
    reportPageError("Undo", fail("TypeError", "after the list"))
    expect(getMoreBridgeErrors()).toBe(1)
    expect(sent).toHaveBeenCalledTimes(1)
  })

  it("is not sent once the count no longer tells reports apart", () => {
    for (let i = 1; i <= KEPT + TOLD_APART; i++) {
      reportPageError("notice", fail("TypeError", `index ${i} out of range`))
    }
    expect(sent).toHaveBeenCalledTimes(KEPT + TOLD_APART)
    // Past the bound every report counts, and none is sent: a flood in the
    // page cannot flood the log.
    reportPageError("notice", fail("TypeError", "index 5000 out of range"))
    reportPageError("notice", fail("TypeError", "index 5001 out of range"))
    expect(getMoreBridgeErrors()).toBe(TOLD_APART + 2)
    expect(sent).toHaveBeenCalledTimes(KEPT + TOLD_APART)
  })

  it("is still listed when the bridge is not there, or its send fails", async () => {
    vi.stubGlobal("window", {})
    reportPageError("notice", fail("TypeError", "no bridge"))
    vi.stubGlobal("window", { pywebview: { api: { log_problem: vi.fn(async () => {
      throw new Error("the bridge went away")
    }) } } })
    reportPageError("notice", fail("TypeError", "a send that fails"))
    vi.stubGlobal("window", { pywebview: { api: { log_problem: () => {
      throw new Error("at once")
    } } } })
    reportPageError("notice", fail("TypeError", "a send that throws"))
    // Let a rejected send settle: nothing unhandled, nothing more listed.
    await Promise.resolve()
    expect(getBridgeErrors().map((e) => e.message)).toEqual([
      "no bridge",
      "a send that fails",
      "a send that throws",
    ])
  })

  it("comes only from reportPageError: a bridge call's own failure is never sent", () => {
    // Python has written those already.
    reportBridgeError("keep_take", fail("UnicodeEncodeError", "'charmap' codec"))
    expect(sent).not.toHaveBeenCalled()
  })
})
