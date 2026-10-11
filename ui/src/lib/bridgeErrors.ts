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
 */
export type BridgeError = {
  method: string
  /** The Python exception's class, e.g. "UnicodeEncodeError". */
  name: string
  message: string
}

// Replaced, never changed in place: useSyncExternalStore compares snapshots
// by identity, and the bar draws again only when this is a new list.
let errors: readonly BridgeError[] = []
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

const same = (a: BridgeError, b: BridgeError) =>
  a.method === b.method && a.name === b.name && a.message === b.message

export function reportBridgeError(method: string, error: unknown) {
  const e = error instanceof Error ? error : new Error(String(error))
  const report = { method, name: e.name || "Error", message: e.message }
  console.error(`[bridge] ${method} failed:`, e)
  if (errors.some((had) => same(had, report))) return
  errors = [...errors, report]
  emit()
}

export function dismissBridgeErrors() {
  if (errors.length === 0) return
  errors = []
  emit()
}

export function getBridgeErrors(): readonly BridgeError[] {
  return errors
}

export function subscribeBridgeErrors(onChange: () => void): () => void {
  listeners.add(onChange)
  return () => listeners.delete(onChange)
}

export function useBridgeErrors(): readonly BridgeError[] {
  return useSyncExternalStore(subscribeBridgeErrors, getBridgeErrors)
}
