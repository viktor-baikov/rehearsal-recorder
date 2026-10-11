import { readFileSync } from "node:fs"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  ACTION_MS,
  dismiss,
  dismissNotice,
  getNotices,
  lifetime,
  runAction,
  undoLatest,
} from "@/lib/notices"
import { setDeletionKind } from "@/lib/deletion"
import { setSystem } from "@/lib/platform"
import {
  GONE_TO_TRASH,
  endEveryOffer,
  endOffersFor,
  keptText,
  offerCropUndo,
  offerUndo,
} from "@/lib/trash"

// Python, as far as an Undo reaches it: what each call answers is set by
// the test.
const bridge = vi.hoisted(() => ({ undo_trash: vi.fn(), end_trash: vi.fn() }))
vi.mock("@/lib/api", () => ({ api: () => bridge }))

/** Every answer on its way back has arrived: they are promises already
 *  settled, so one turn of the event loop sees them all through. */
const settle = () => new Promise((done) => setTimeout(done, 0))

const notice = (token: string) => getNotices().find((n) => n.key === `undo:${token}`)

/** Take 5 of Tuesday jam, as an offer names what it took. */
const TAKE = { folder: "/rec/old", takes: [5] }

beforeEach(() => {
  for (const n of getNotices()) dismissNotice(n.id)
  bridge.undo_trash.mockReset()
  bridge.end_trash.mockReset()
  bridge.end_trash.mockResolvedValue({ ok: true })
  setSystem("mac")
  setDeletionKind({ kind: "system", folder: "_deleted" })
})

afterEach(() => {
  for (const n of getNotices()) dismissNotice(n.id)
  setSystem(null)
  setDeletionKind(null)
  vi.restoreAllMocks()
})

describe("offerUndo", () => {
  it("says what went, with Undo, for ten seconds, under a key of its own", () => {
    offerUndo({ text: "“Pałyn 5” went to the Trash.", token: "t1", item: TAKE, onUndone: vi.fn() })
    const n = notice("t1")!
    expect(n.kind).toBe("done")
    expect(n.text).toBe("“Pałyn 5” went to the Trash.")
    expect(n.action?.label).toBe("Undo")
    expect(lifetime(n)).toBe(ACTION_MS)
  })

  it("Undo puts it back and hands the answer on, and ends nothing", async () => {
    const back = { ok: true, kind: "take", folder: "/rec/old", take_numbers: [5] }
    bridge.undo_trash.mockResolvedValue(back)
    const onUndone = vi.fn()
    offerUndo({ text: "gone", token: "t1", item: TAKE, onUndone })
    runAction(notice("t1")!.id)
    await settle()
    expect(bridge.undo_trash).toHaveBeenCalledWith("t1")
    expect(onUndone).toHaveBeenCalledWith(back)
    expect(bridge.end_trash).not.toHaveBeenCalled()
    expect(getNotices()).toHaveLength(0)
  })

  it("is what ⌘Z or Ctrl+Z takes back", async () => {
    bridge.undo_trash.mockResolvedValue({ ok: true, kind: "take" })
    offerUndo({ text: "gone", token: "t1", item: TAKE, onUndone: vi.fn() })
    expect(undoLatest()).toBe(true)
    await settle()
    expect(bridge.undo_trash).toHaveBeenCalledWith("t1")
  })

  it("ends the removal when its notice goes, once", async () => {
    offerUndo({ text: "gone", token: "t1", item: TAKE, onUndone: vi.fn() })
    dismiss("undo:t1")
    dismiss("undo:t1")
    await settle()
    expect(bridge.end_trash).toHaveBeenCalledTimes(1)
    expect(bridge.end_trash).toHaveBeenCalledWith("t1")
    expect(getNotices()).toHaveLength(0)
  })

  it("hands back a way to end the offer early", async () => {
    const end = offerUndo({ text: "gone", token: "t1", item: TAKE, onUndone: vi.fn() })
    end()
    await settle()
    expect(notice("t1")).toBeUndefined()
    expect(bridge.end_trash).toHaveBeenCalledWith("t1")
  })

  it("says so when the Trash refused it at the end", async () => {
    bridge.end_trash.mockResolvedValue({ ok: false, error: "Permission denied" })
    offerUndo({ text: "gone", token: "t1", item: TAKE, onUndone: vi.fn() })
    dismiss("undo:t1")
    await settle()
    const n = notice("t1")!
    expect(n.kind).toBe("error")
    expect(n.text).toBe("Permission denied")
    expect(n.action).toBeUndefined()
  })

  it("offers a refused Undo again, which can be retried, and still ends when it goes", async () => {
    bridge.undo_trash.mockResolvedValueOnce({ ok: false, error: "Wait until the crop is done." })
    const onUndone = vi.fn()
    offerUndo({ text: "gone", token: "t1", item: TAKE, onUndone })
    runAction(notice("t1")!.id)
    await settle()
    const again = notice("t1")!
    expect(again.kind).toBe("error")
    expect(again.text).toBe("Wait until the crop is done.")
    expect(again.action?.label).toBe("Undo")
    expect(lifetime(again)).toBe(ACTION_MS)
    expect(onUndone).not.toHaveBeenCalled()
    expect(bridge.end_trash).not.toHaveBeenCalled()

    // Retried, once the crop is done.
    bridge.undo_trash.mockResolvedValueOnce({ ok: true, kind: "take" })
    runAction(again.id)
    await settle()
    expect(onUndone).toHaveBeenCalledWith({ ok: true, kind: "take" })
    expect(bridge.end_trash).not.toHaveBeenCalled()
  })

  it("ends a refused Undo's removal when the offer made again goes", async () => {
    bridge.undo_trash.mockResolvedValue({ ok: false, error: "Take 5 is taken by another take now." })
    offerUndo({ text: "gone", token: "t1", item: TAKE, onUndone: vi.fn() })
    runAction(notice("t1")!.id)
    await settle()
    dismiss("undo:t1")
    await settle()
    expect(bridge.end_trash).toHaveBeenCalledTimes(1)
    expect(bridge.end_trash).toHaveBeenCalledWith("t1")
  })

  it("says an Undo too late as it is, with nothing left to offer or end", async () => {
    bridge.undo_trash.mockResolvedValue({ ok: false, error: GONE_TO_TRASH })
    offerUndo({ text: "gone", token: "t1", item: TAKE, onUndone: vi.fn() })
    runAction(notice("t1")!.id)
    await settle()
    const n = notice("t1")!
    expect(n.kind).toBe("error")
    expect(n.text).toBe("It has already gone to the Trash.")
    expect(n.action).toBeUndefined()
    dismiss("undo:t1")
    await settle()
    expect(bridge.end_trash).not.toHaveBeenCalled()
  })

  it("finishes an Undo that got stuck by ending it at once, then puts the screen back", async () => {
    bridge.undo_trash.mockResolvedValue({
      ok: false,
      error: "It is being put back; it will be finished when the notice goes.",
      finishing: true,
    })
    const onUndone = vi.fn()
    offerUndo({ text: "gone", token: "t1", item: TAKE, onUndone })
    runAction(notice("t1")!.id)
    await settle()
    expect(bridge.end_trash).toHaveBeenCalledWith("t1")
    expect(onUndone).toHaveBeenCalledTimes(1)
    expect(getNotices()).toHaveLength(0)
  })

  it("says why when an Undo that got stuck will not finish either", async () => {
    bridge.undo_trash.mockResolvedValue({ ok: false, error: "stuck", finishing: true })
    bridge.end_trash.mockResolvedValue({ ok: false, error: "The drive is not there" })
    const onUndone = vi.fn()
    offerUndo({ text: "gone", token: "t1", item: TAKE, onUndone })
    runAction(notice("t1")!.id)
    await settle()
    expect(onUndone).not.toHaveBeenCalled()
    const n = notice("t1")!
    expect(n.kind).toBe("error")
    expect(n.text).toBe("The drive is not there")
    expect(n.action).toBeUndefined()
  })

  it("reports a screen that fails to put itself back, rather than throwing", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    bridge.undo_trash.mockResolvedValue({ ok: true, kind: "take" })
    offerUndo({
      text: "gone",
      token: "t1",
      item: TAKE,
      onUndone: async () => {
        throw new Error("the bridge blinked")
      },
    })
    runAction(notice("t1")!.id)
    await settle()
    expect(log).toHaveBeenCalledTimes(1)
  })

  it("knows the gone text as Python says it", () => {
    const holding = readFileSync(
      new URL("../../../src/rehearsal_recorder/holding.py", import.meta.url),
      "utf-8"
    )
    expect(holding).toContain(`GONE_TO_TRASH = "${GONE_TO_TRASH}"`)
  })
})

describe("offerCropUndo", () => {
  it("offers the crop's Undo, saying the uncut take went", () => {
    offerCropUndo("Pałyn 5", { undo: "t1" }, TAKE, vi.fn(), "rehearsal")
    expect(notice("t1")?.text).toBe("“Pałyn 5” is cropped. The uncut take went to the Trash.")
    expect(notice("t1")?.action?.label).toBe("Undo")
  })

  it("warns, with no Undo, when the uncut take could not wait for one", () => {
    offerCropUndo(
      "Pałyn 5",
      { undo: null, error: "No space left on device, and is still at /rec/old/05 (before crop)" },
      TAKE,
      vi.fn(),
      "rehearsal"
    )
    const n = getNotices().find((x) => x.key === "rehearsal")!
    expect(n.kind).toBe("warning")
    // Python's words after a colon: a folder named "(before crop)" inside
    // brackets of our own would read as one.
    expect(n.text).toBe(
      "“Pałyn 5” is cropped, but the uncut take could not be moved out of the way, so the crop cannot be undone: No space left on device, and is still at /rec/old/05 (before crop)."
    )
    expect(n.action).toBeUndefined()
    // A warning: it stays until it is closed.
    expect(lifetime(n)).toBeNull()
  })
})

describe("endOffersFor", () => {
  // What Python ends on its own when something of the same item is removed
  // (api.py _ends): the notices that would offer an Undo it has no entry
  // for any more go with it. Three at a time, as the corner holds them.
  type Item = { folder: string; takes?: number[]; crop?: boolean }
  const offer = (token: string, item: Item) =>
    offerUndo({ text: token, token, item, onUndone: vi.fn() })
  const offered = () =>
    getNotices()
      .map((n) => n.key)
      .sort()
  const ended = () => bridge.end_trash.mock.calls.map((c) => c[0]).sort()

  it("ends every offer of those takes, a crop of them included", async () => {
    offer("take-5", { folder: "/rec/old", takes: [5] })
    offer("crop-5", { folder: "/rec/old", takes: [5], crop: true })
    offer("crop-7", { folder: "/rec/old", takes: [7], crop: true })
    endOffersFor("/rec/old", [5])
    await settle()
    expect(offered()).toEqual(["undo:crop-7"])
    expect(ended()).toEqual(["crop-5", "take-5"])
  })

  it("ends takes cleared together by any one of them, in that rehearsal only", () => {
    offer("starts", { folder: "/rec/old", takes: [2, 3] })
    offer("other", { folder: "/rec/older", takes: [3] })
    offer("take-5", { folder: "/rec/old", takes: [5] })
    endOffersFor("/rec/old", [3])
    expect(offered()).toEqual(["undo:other", "undo:take-5"])
  })

  it("ends only the crops of a take after a crop, never the new one", () => {
    offer("take-5", { folder: "/rec/old", takes: [5] })
    offer("crop-5", { folder: "/rec/old", takes: [5], crop: true })
    offer("crop-5b", { folder: "/rec/old", takes: [5], crop: true })
    endOffersFor("/rec/old", [5], { cropsOnly: true, except: "crop-5b" })
    expect(offered()).toEqual(["undo:crop-5b", "undo:take-5"])
  })

  it("ends everything of a rehearsal, its drafts too, and nothing of another", () => {
    offer("take-5", { folder: "/rec/old", takes: [5] })
    offer("draft", { folder: "/rec/old/_drafts/take 9" })
    offer("other", { folder: "/rec/older", takes: [5] })
    endOffersFor("/rec/old")
    expect(offered()).toEqual(["undo:other"])
  })

  it("ends a draft's crops by the draft's folder, and not the draft", () => {
    offer("draft", { folder: "/rec/old/_drafts/take 9" })
    offer("draft-crop", { folder: "/rec/old/_drafts/take 9", crop: true })
    endOffersFor("/rec/old/_drafts/take 9", undefined, { cropsOnly: true })
    expect(offered()).toEqual(["undo:draft"])
  })

  it("forgets an offer once it is undone", async () => {
    bridge.undo_trash.mockResolvedValue({ ok: true, kind: "take" })
    offer("take-5", { folder: "/rec/old", takes: [5] })
    runAction(notice("take-5")!.id)
    await settle()
    // Brought back, and removed again: the new removal's own notice.
    offer("take-5-again", { folder: "/rec/old", takes: [5] })
    endOffersFor("/rec/old", [5])
    await settle()
    expect(ended()).toEqual(["take-5-again"])
  })

  it("is what a crop does for the take's earlier crops", () => {
    offer("take-5", { folder: "/rec/old", takes: [5] })
    offer("crop-5", { folder: "/rec/old", takes: [5], crop: true })
    offerCropUndo("Pałyn 5", { undo: "crop-5b" }, { folder: "/rec/old", takes: [5] }, vi.fn(), "r")
    expect(offered()).toEqual(["undo:crop-5b", "undo:take-5"])
  })

  it("is what a crop does even when its own uncut take could not wait", () => {
    offer("crop-7", { folder: "/rec/old", takes: [7], crop: true })
    offerCropUndo(
      "Pałyn 7",
      { undo: null, error: "Disk full" },
      { folder: "/rec/old", takes: [7] },
      vi.fn(),
      "r"
    )
    expect(offered()).toEqual(["r"])
  })

  it("ends them all at once, as a switch of the recordings folder does", async () => {
    offer("take-5", { folder: "/rec/old", takes: [5] })
    offer("other", { folder: "/rec/older" })
    endEveryOffer()
    await settle()
    expect(offered()).toEqual([])
    expect(ended()).toEqual(["other", "take-5"])
  })
})

describe("keptText", () => {
  it("names the one folder left where it was", () => {
    expect(keptText(["/old/_deleting/3"])).toBe(
      "Something that was being removed stays in “/old/_deleting/3”: it could not be put back or moved to the Trash."
    )
  })

  it("counts several, and names each", () => {
    expect(keptText(["/old/_deleting/3", "/old/_deleting/4"])).toBe(
      "2 things that were being removed stay where they were: “/old/_deleting/3”, “/old/_deleting/4”. They could not be put back or moved to the Trash."
    )
  })

  it("says the system's Trash, or the folder where there is none", () => {
    setSystem("windows")
    expect(keptText(["/a"])).toContain("moved to the Recycle Bin.")
    setDeletionKind({ kind: "folder", folder: "_deleted" })
    expect(keptText(["/a"])).toContain("moved to the _deleted folder.")
  })
})
