import { useSyncExternalStore } from "react"

/**
 * Calls into Python that raised instead of answering.
 *
 * pywebview turns an exception in a Python method into a rejected promise,
 * and no screen was written to expect one: Save take and renaming both
 * failed on Windows by the button dimming and nothing else happening. `api()`
 * now reports every such failure here, and so does the start, one report per
 * problem it met; `ErrorBar` shows them all.
 *
 * Every report stays until the person puts them away, newest last. Keeping
 * only the latest let a second problem at start hide the first. One that is
 * already there word for word (same call, same exception, same message) is
 * not listed twice: a call that fails each time it is made says so once.
 *
 * The list holds the first `KEPT` and counts the rest, each one once. The
 * first is the one to keep in view: in a cascade it is the cause and the
 * rest are echoes, and a problem at start must not be pushed out by what
 * follows. A list that is full stops changing, and only the count moves, so
 * a call that keeps failing in new words (the recording screen asks for the
 * levels every 70 ms) does not keep drawing a longer list there.
 */
export type BridgeError = {
  method: string
  /** The Python exception's class, e.g. "UnicodeEncodeError". */
  name: string
  message: string
}

/** How many reports the bar lists; the rest it counts. */
export const KEPT = 20

/**
 * How many of the uncounted ones are told apart by their words. Past this,
 * each further report counts, repeat or not, so a call failing in new words
 * for hours does not keep every one of them in memory.
 */
export const TOLD_APART = 1000

// Replaced, never changed in place: useSyncExternalStore compares snapshots
// by identity, and the bar draws again only when this is a new list.
let errors: readonly BridgeError[] = []
// The reports past the first KEPT: how many, and the words of each.
let more = 0
const counted = new Set<string>()
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

/** Same call, same exception, same message. */
export const keyOf = (e: BridgeError) => `${e.method}\n${e.name}\n${e.message}`

export function reportBridgeError(method: string, error: unknown) {
  const e = error instanceof Error ? error : new Error(String(error))
  const report = { method, name: e.name || "Error", message: e.message }
  console.error(`[bridge] ${method} failed:`, e)
  const key = keyOf(report)
  if (errors.some((had) => keyOf(had) === key)) return
  if (errors.length < KEPT) {
    errors = [...errors, report]
  } else {
    if (counted.has(key)) return
    if (counted.size < TOLD_APART) counted.add(key)
    more += 1
  }
  emit()
}

export function dismissBridgeErrors() {
  if (errors.length === 0) return
  errors = []
  more = 0
  counted.clear()
  emit()
}

/** The first `KEPT` reports, oldest first. */
export function getBridgeErrors(): readonly BridgeError[] {
  return errors
}

/** How many more were said after the list was full, each once. */
export function getMoreBridgeErrors(): number {
  return more
}

/** The line under the list: where the whole of each problem is written. */
export function whereTheRestIs(more: number): string {
  return more > 0
    ? `and ${more} more; all of them are in ~/.rehearsal-recorder/crash.log.`
    : "The full error is in ~/.rehearsal-recorder/crash.log."
}

export function subscribeBridgeErrors(onChange: () => void): () => void {
  listeners.add(onChange)
  return () => listeners.delete(onChange)
}

export function useBridgeErrors(): readonly BridgeError[] {
  return useSyncExternalStore(subscribeBridgeErrors, getBridgeErrors)
}

export function useMoreBridgeErrors(): number {
  return useSyncExternalStore(subscribeBridgeErrors, getMoreBridgeErrors)
}
