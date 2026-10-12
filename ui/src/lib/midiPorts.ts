/**
 * Which listed port a saved one is: the interface's side of
 * src/rehearsal_recorder/midi/identity.py find_port.
 *
 * The setup screen says a track's port is there, or not connected, from the
 * list Python sends every second. It has to find ports exactly as Python
 * does, or a card says "not connected" over a port the rehearsal would open,
 * or the other way round.
 */

import type { MidiPort, MidiPortRef } from "@/lib/api"

// What Windows adds to a port's name: "2- " in front of a second device of
// the same kind, and a number at the end ("TD-17 1").
const NUMBER_IN_FRONT = /^\d+-\s*/
const NUMBER_AT_END = /\s+\d+$/

/** A port's name without what Windows adds to it, which can change when a
 *  device is plugged in again (identity.bare_name). */
export function bareName(name: string): string {
  return name.trim().replace(NUMBER_IN_FRONT, "").replace(NUMBER_AT_END, "")
}

/** A field that says something: text that is not only space. */
function said(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== ""
}

/**
 * The port in `ports` that `saved` is, tried in Python's order: the same id
 * where both have one, then the same name, then the same bare name on the
 * same device where both name one. The first way that finds any decides.
 * Two or more alike are not guessed between: `alike` is true and `port`
 * null, and the track shows its port as not connected.
 */
export function findPort(
  saved: MidiPortRef,
  ports: MidiPort[]
): { port: MidiPort | null; alike: boolean } {
  const decide = (found: MidiPort[]) =>
    found.length === 1 ? { port: found[0], alike: false } : { port: null, alike: true }

  if (said(saved.id)) {
    const found = ports.filter((p) => p.id === saved.id)
    if (found.length) return decide(found)
  }
  if (said(saved.name)) {
    const named = ports.filter((p) => p.name === saved.name)
    if (named.length) return decide(named)
    const bare = bareName(saved.name)
    // An empty bare name would match every port that is only Windows' numbers.
    if (bare) {
      const device = said(saved.device) ? saved.device : ""
      const found = ports.filter(
        (p) => bareName(p.name) === bare && (!said(p.device) || !device || p.device === device)
      )
      if (found.length) return decide(found)
    }
  }
  return { port: null, alike: false }
}

/** A listed port as a band keeps it (rules.port_ref): what the system said of
 *  it, without the check's count or a field that says nothing. */
export function portRef(port: MidiPort | MidiPortRef): MidiPortRef {
  const kept: MidiPortRef = { name: port.name }
  for (const key of ["device", "maker", "id"] as const) {
    const value = port[key]
    if (said(value)) kept[key] = value
  }
  return kept
}

/** A track's port line when another app holds the port. Plugging it in
 *  again will not help, so this line makes no promise about the notes. */
export function portBusyText(port: string): string {
  return `“${port}” is in use by another app.`
}

/** A track's port line when the port is not connected: the track takes its
 *  notes again from the moment the port is plugged in. */
export function portGoneText(port: string, track: string): string {
  return `“${port}” is not connected. ${track} records its notes from the moment it is plugged in.`
}

/** How a track's port stands, for the line beside its picker: null for a
 *  track that takes no notes, "none" while none is picked (P3), "missing"
 *  for one not there (P1, D7) and "in_use" for one another app holds (P5). */
export type PortStanding = "none" | "ok" | "missing" | "in_use" | null

/**
 * A port line, in its parts: `who` is the other track's name when the line
 * names one ("" when it does not), between the words before and after it.
 * The name can be cut to fit, and the words round it never are (B4, B6).
 */
export type PortLine = { before: string; who: string; after: string }

const says = (before: string, who = "", after = ""): PortLine => ({ before, who, after })

/** A port line's sentence, whole. */
export const lineText = (line: PortLine): string => line.before + line.who + line.after

/**
 * What a track's own port line says beside its picker (D7, P2, P3, P5, P8),
 * or null when there is nothing to say: the first of these that holds. No
 * port picked; another track on the same port (`sharing`); the port held by
 * another app; the port not connected; the same notes heard as from another
 * track (`echo`). The other track is named as the line is to say it now.
 */
export function portLine(
  standing: PortStanding,
  { sharing, echo }: { sharing?: string; echo?: string } = {}
): PortLine | null {
  if (standing === null) return null
  if (standing === "none") return says("Pick a port, or set it to Audio.")
  if (sharing !== undefined) return says("", sharing, " takes notes from this port too.")
  if (standing === "in_use") return says("In use by another app. Records its notes from the moment it is free.")
  if (standing === "missing") return says("Not connected. Records its notes from the moment it is plugged in.")
  if (echo !== undefined) return says("Same notes as ", echo, ". Plugged in twice?")
  return null
}
