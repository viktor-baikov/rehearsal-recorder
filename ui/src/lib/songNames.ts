import { useSyncExternalStore } from "react"
import { api } from "@/lib/api"
import { reportPageError } from "@/lib/bridgeErrors"
import { dismiss, notify } from "@/lib/notices"

/**
 * Songs' old names forgotten, counted, so every list of songs on screen
 * (useSongChoices) is read again: a name forgotten from a name field must
 * stop leading to its song in that very field. A name brought back by Undo
 * is counted too, for the same reason.
 */
let version = 0
const listeners = new Set<() => void>()

/** The slot of the notices about an old name. */
const SAID = "song-names"

/** What Python refused to do with an old name, and why when it said:
 *  "Could not forget Palyn: …", "Could not bring back Palyn: …". */
function refused(what: string, name: string, error?: string) {
  notify({
    key: SAID,
    kind: "error",
    text: error ? `Could not ${what} ${name}: ${error}` : `Could not ${what} ${name}`,
  })
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function changed() {
  version++
  for (const l of listeners) l()
}

/** How many times an old name has been forgotten or brought back since the
 *  app started. */
export function useSongNamesVersion(): number {
  return useSyncExternalStore(subscribe, () => version)
}

/** Forgets an old name of a song (api.forget_song_name): typed again, it is
 *  a new song. Whether it was forgotten; if not, a notice says so and
 *  nothing changes.
 *
 *  With `onUndone`, a notice says it was forgotten, with Undo. Undo brings
 *  the name back (api.remember_song_name) and calls `onUndone`, for the
 *  screen to read the song again. If Python refuses, because the name has
 *  become another song's since, an error notice says why. */
export async function forgetSongName(name: string, onUndone?: () => unknown): Promise<boolean> {
  dismiss(SAID)
  const res = await api().forget_song_name(name)
  if (!res.ok) {
    refused("forget", name, res.error)
    return false
  }
  changed()
  if (onUndone && res.song_id !== undefined) {
    const songId = res.song_id
    const spelt = res.name ?? name
    notify({
      key: SAID,
      kind: "done",
      text: `“${spelt}” was forgotten.`,
      action: {
        label: "Undo",
        run: () =>
          void bringBack(songId, spelt, onUndone).catch((e) => reportPageError("Undo", e)),
      },
    })
  }
  return true
}

/** The notice's Undo: puts the name back on the song that had it, spelt as
 *  it was, and has the screen read the song again. Refused, it says why and
 *  nothing changes. */
async function bringBack(songId: number, name: string, onUndone: () => unknown) {
  const res = await api().remember_song_name(songId, name)
  if (!res.ok) {
    refused("bring back", name, res.error)
    return
  }
  changed()
  await onUndone()
}
