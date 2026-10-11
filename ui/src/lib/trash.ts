import { api, type UndoResult } from "@/lib/api"
import { reportBridgeError } from "@/lib/bridgeErrors"
import { croppedText, trashName } from "@/lib/deletion"
import { dismiss, notify } from "@/lib/notices"

/**
 * Removing something happens at once, and can be taken back (spec B1).
 *
 * Deleting a take or a rehearsal, clearing false starts, discarding a take
 * and cropping one used to ask first, and the question was answered without
 * reading it. Now they are done when clicked, and a notice says what went,
 * with Undo, for ten seconds (lib/notices.ts); ⌘Z or Ctrl+Z is the same
 * Undo. Python keeps what went in its holding folder until then: its Undo
 * (undo_trash) puts it back whole, and the notice ending (end_trash) sends
 * it on to the Trash. Nothing is destroyed either way.
 */

/** What an Undo answers when what went has gone on to the Trash already,
 *  as Python says it (holding.py, GONE_TO_TRASH): nothing is left to take
 *  back, so nothing is offered again. */
export const GONE_TO_TRASH = "It has already gone to the Trash."

/**
 * What an offer took away, as far as another removal can end it: the
 * folder of a rehearsal, or of a draft; the takes of it, when it was takes;
 * and whether it is a crop, whose entry holds the take as it was.
 */
export type Removed = { folder: string; takes?: number[]; crop?: boolean }

// The offers on screen, by token, with what each took away: for the ends
// Python makes on its own (endOffersFor). An offer leaves this when its
// removal ends or is undone.
const offers = new Map<string, Removed>()

/**
 * Says what went, under a key of its own (`undo:{token}`), with Undo.
 * `item` is what went, for the ends another removal makes (endOffersFor).
 *
 * Undo asks Python for it back and hands the answer to `onUndone`, which
 * puts the screen back as it was. An Undo refused for now (a crop of the
 * take still running, its place or number taken since) is offered again with
 * why, as an error, and its removal still ends when that notice goes. One
 * too late is said, with nothing to offer. One a crop's Undo could not
 * finish (`finishing`) is finished by ending it at once.
 *
 * Returns the offer's end: what the screen calls when the moment for Undo
 * has passed (another take started, the take saved). The notice goes, and
 * what went goes on to the Trash.
 */
export function offerUndo({
  text,
  token,
  item,
  onUndone,
}: {
  text: string
  token: string
  item: Removed
  onUndone: (r: UndoResult) => unknown
}): () => void {
  const key = `undo:${token}`
  offers.set(token, item)

  async function end() {
    offers.delete(token)
    const r = await api().end_trash(token)
    if (!r.ok) {
      notify({ key, kind: "error", text: r.error ?? `Could not move it to ${trashName()}` })
    }
  }

  async function undo() {
    const r = await api().undo_trash(token)
    if (r.ok) {
      offers.delete(token)
      await onUndone(r)
      return
    }
    if (r.finishing) {
      offers.delete(token)
      // Part of it is back and the rest would not follow: the end finishes
      // the Undo, as it would at the next start.
      const f = await api().end_trash(token)
      if (f.ok) await onUndone({ ok: true, kind: r.kind })
      else notify({ key, kind: "error", text: f.error ?? "Could not put it back" })
      return
    }
    if (r.error === GONE_TO_TRASH) {
      offers.delete(token)
      notify({ key, kind: "error", text: r.error })
      return
    }
    offer("error", r.error ?? "Could not put it back")
  }

  // Both run from a notice, which calls them and goes on: what fails on the
  // way is said on the error bar, as any bridge failure is.
  function offer(kind: "done" | "error", said: string) {
    notify({
      key,
      kind,
      text: said,
      action: { label: "Undo", run: () => void undo().catch((e) => reportBridgeError("Undo", e)) },
      onGone: () => void end().catch((e) => reportBridgeError("end_trash", e)),
    })
  }

  offer("done", text)
  return () => dismiss(key)
}

/**
 * Ends the offers whose removal Python has just ended on its own, which an
 * Undo would only be told has gone (api.py _ends): removing a take ends the
 * offers of that take, a crop of it included; a crop, the take's earlier
 * crops (`cropsOnly`, `except` its own); a rehearsal, all of it, takes and
 * drafts. Called once the removal that ends them went through, as Python
 * ends them then. Their end_trash finds nothing left, and answers ok.
 */
export function endOffersFor(
  folder: string,
  takes?: number[],
  { cropsOnly = false, except }: { cropsOnly?: boolean; except?: string | null } = {}
) {
  for (const [token, item] of [...offers]) {
    if (token === except || (cropsOnly && !item.crop)) continue
    const same = takes
      ? item.folder === folder && (item.takes ?? []).some((n) => takes.includes(n))
      : item.folder === folder || item.folder.startsWith(`${folder}/`)
    if (same) dismiss(`undo:${token}`)
  }
}

/** Ends every offer: a switch of the recordings folder ended them all
 *  before it switched. */
export function endEveryOffer() {
  for (const token of [...offers.keys()]) dismiss(`undo:${token}`)
}

/**
 * What a crop says once it went through: its Undo, which `onUndone` answers
 * by putting the take back as it was; or, when the uncut take could not wait
 * for one, a warning under the screen's `key` that says where it is. The
 * take's earlier crops end either way, as Python ends them (`item` is the
 * take, or the draft); this one ends when the take is saved, discarded,
 * deleted or cropped again (endOffersFor).
 */
export function offerCropUndo(
  name: string,
  res: { undo?: string | null; error?: string },
  item: Omit<Removed, "crop">,
  onUndone: (r: UndoResult) => unknown,
  key: string
) {
  endOffersFor(item.folder, item.takes, { cropsOnly: true, except: res.undo })
  if (res.undo) {
    offerUndo({
      text: croppedText(name),
      token: res.undo,
      item: { ...item, crop: true },
      onUndone,
    })
    return
  }
  if (res.error) {
    // Python's words after a colon: they can end in a folder named
    // "… (before crop)", which brackets of our own would run into.
    notify({
      key,
      kind: "warning",
      text: `“${name}” is cropped, but the uncut take could not be moved out of the way, so the crop cannot be undone: ${res.error}.`,
    })
  }
}

/**
 * What a switch of the recordings folder says about removals it could not
 * end in the old folder (set_recordings_dir's `kept`): they stay there, and
 * no start of the app will look there again, so this is the one time they
 * are named.
 */
export function keptText(folders: string[]): string {
  const end = `put back or moved to ${trashName()}.`
  if (folders.length === 1) {
    return `Something that was being removed stays in “${folders[0]}”: it could not be ${end}`
  }
  const named = folders.map((f) => `“${f}”`).join(", ")
  return `${folders.length} things that were being removed stay where they were: ${named}. They could not be ${end}`
}
