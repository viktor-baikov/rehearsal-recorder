import { useLayoutEffect, useRef, useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { ITEM_CHOSEN, Item } from "@/components/ui/item"
import { Label } from "@/components/ui/label"
import { Whole, WholeTip, useCut } from "@/components/ui/whole"
import { ConfirmDialog } from "@/components/ConfirmDialog"
import { SetSongsEditor, type SongOut } from "@/components/SetEditor"
import { SettingsGroup } from "@/components/SettingsGroup"
import { putSongBack, useSets } from "@/hooks/useSets"
import { useSongChoices } from "@/hooks/useSongChoices"
import { api, type SetsAnswer, type SongChoices, type SongSet } from "@/lib/api"
import { reportPageError } from "@/lib/bridgeErrors"
import { songsLabel } from "@/lib/format"
import { rise } from "@/lib/motion"
import { dismiss, notify } from "@/lib/notices"
import { asSetSongs } from "@/lib/setSongs"
import { cn } from "@/lib/utils"

// What a change here said: one slot, so each says over the last.
const SAID = "sets"

/** A set's row in the list, given to its Button through Item, as History's
 *  rows are (components/HistoryRow): the name over its count. */
const ROW =
  "h-auto w-full flex-col flex-nowrap items-stretch gap-0.5 px-3 py-2 text-left whitespace-normal"

// The songs taken out so far: each has a notice of its own, and its Undo,
// whatever screen is open by the time it is pressed.
let songsOut = 0

/** Says a song is out of its set, with an Undo that puts it back before
 *  `next`, the song that came after it (hooks/useSets putSongBack). */
function offerSongBack(setId: number, title: string, at: number, next: string | null) {
  notify({
    key: `set-song:${++songsOut}`,
    kind: "done",
    text: `“${title}” was taken out of the set.`,
    action: {
      label: "Undo",
      run: () =>
        void putSongBack(setId, title, at, next)
          .then((error) => {
            if (error === null) dismiss(SAID)
            else notify({ key: SAID, kind: "error", text: `Could not put “${title}” back: ${error}` })
          })
          .catch((e) => reportPageError("Undo", e)),
    },
  })
}

/** A name no set has yet: "New set", then "New set 2", and on. */
function freeName(sets: SongSet[]) {
  const taken = new Set(sets.map((s) => s.name.toLocaleLowerCase()))
  if (!taken.has("new set")) return "New set"
  for (let i = 2; ; i++) if (!taken.has(`new set ${i}`)) return `New set ${i}`
}

/**
 * Settings › Sets (issue #12 step 8, T1–T5): the sets down the left, each
 * with its songs counted, and *New set* under them; the one picked in the
 * list beside them, its name and its songs changed in place and saved at
 * once, as the rest of Settings is. The two columns stay at every size,
 * and each scrolls on its own. A song taken out goes at once, with Undo.
 * Which set Start plays by is chosen beside Start rehearsal, not here.
 */
export function SetsSettings() {
  const { sets, chosen, replace } = useSets()
  const [picked, setPicked] = useState<number | null>(null)
  // The set just made: its name is selected, to be typed over.
  const [fresh, setFresh] = useState<number | null>(null)
  const [deleting, setDeleting] = useState<SongSet | null>(null)
  const choices = useSongChoices(true, null, null)
  const setColumn = useRef<HTMLDivElement>(null)

  const set =
    sets.find((s) => s.id === picked) ?? sets.find((s) => s.id === chosen) ?? sets[0] ?? null

  // Another set shows from its top, wherever the last one was scrolled to.
  useLayoutEffect(() => {
    setColumn.current?.scrollTo({ top: 0 })
  }, [set?.id])

  /** Applies what a change answered; says why when it was refused.
   *  Returns the error, or null when it went through. */
  const answered = (res: SetsAnswer): string | null => {
    if (!res.ok) return res.error ?? "Could not change the set"
    dismiss(SAID)
    if (res.sets) replace(res.sets)
    return null
  }

  const add = async () => {
    const res = await api().add_set(freeName(sets), [])
    const error = answered(res)
    if (error) {
      notify({ key: SAID, kind: "error", text: error })
      return
    }
    // A new set has the highest id there is (SetPicker's NewSetDialog).
    const id = Math.max(...(res.sets ?? []).map((s) => s.id))
    setPicked(id)
    setFresh(id)
  }

  const saveSongs = async (of: SongSet, titles: string[], out?: SongOut) => {
    // In place at once, so a dragged row stays where it was dropped.
    const kept = new Map(of.songs.map((s) => [s.title, s]))
    const songs = asSetSongs(titles, choices).map((s) => kept.get(s.title) ?? s)
    replace(sets.map((s) => (s.id === of.id ? { ...s, songs } : s)))
    const error = answered(await api().update_set(of.id, null, titles))
    if (error) {
      notify({ key: SAID, kind: "error", text: error })
      replace(await api().list_sets())
      return
    }
    // Said once Python has it out.
    if (out) offerSongBack(of.id, out.title, out.at, of.songs[out.at + 1]?.title ?? null)
  }

  const remove = async (of: SongSet) => {
    const error = answered(await api().delete_set(of.id))
    if (error) notify({ key: SAID, kind: "error", text: error })
    else setPicked(null)
  }

  return (
    <div className="flex min-h-0 flex-1 gap-6">
      {sets.length === 0 ? (
        // Across both columns: what a set is, and how one is made (B7).
        <Empty className="animate-rise" style={rise(1)}>
          <EmptyHeader>
            <EmptyTitle>No sets yet</EmptyTitle>
            <EmptyDescription>
              A set is the songs a rehearsal goes through, in order. Make one with New set, then
              pick it beside Start rehearsal.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" onClick={() => void add()}>
              <Plus />
              New set
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <>
          {/* 13 rem, and a quarter rem more each side for the focus ring,
              which the scroll would cut. Each column keeps its scrollbar's
              room, so nothing moves sideways when it grows past the window. */}
          <div
            data-column="list"
            className="-m-1 flex w-54 shrink-0 animate-rise flex-col gap-2 overflow-y-auto p-1 [scrollbar-gutter:stable]"
            style={rise(1)}
          >
            <ul aria-label="Sets" className="flex flex-col gap-1">
              {sets.map((s) => (
                <SetRow
                  key={s.id}
                  set={s}
                  picked={s.id === set?.id}
                  onPick={() => setPicked(s.id)}
                />
              ))}
            </ul>
            <Button variant="ghost" size="row" className="self-start" onClick={() => void add()}>
              <Plus />
              New set
            </Button>
          </div>

          <div
            ref={setColumn}
            data-column="set"
            className="-m-1 min-w-0 flex-1 overflow-y-auto p-1 [scrollbar-gutter:stable]"
          >
            {set && (
              <SettingsGroup rise={2} data-set-detail>
                <SetDetail
                  // Another set, another name being typed.
                  key={set.id}
                  set={set}
                  fresh={fresh === set.id}
                  choices={choices}
                  onRename={async (name) => {
                    const error = answered(await api().update_set(set.id, name, null))
                    if (!error) setFresh(null)
                    return error
                  }}
                  onSongs={(titles, out) => void saveSongs(set, titles, out)}
                  onDelete={() => setDeleting(set)}
                />
              </SettingsGroup>
            )}
          </div>
        </>
      )}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={deleting && `Delete “${deleting.name}”?`}
        description="Rehearsals played by it keep their takes and their names."
        actionLabel="Delete"
        onConfirm={() => deleting && void remove(deleting)}
      />
    </div>
  )
}

/**
 * A set in the list: its name over its songs counted, the whole row one
 * button, grey while it is the one picked. The name is cut at the row's end,
 * and whole in the shared tip on hover and on keyboard focus (B6).
 */
function SetRow({ set, picked, onPick }: { set: SongSet; picked: boolean; onPick: () => void }) {
  const [nameRef, cut] = useCut<HTMLSpanElement>()
  return (
    <li>
      <WholeTip cut={cut} text={set.name}>
        <Item asChild size="sm">
          <Button
            variant="ghost"
            data-set-item={set.name}
            aria-current={picked ? "true" : undefined}
            onClick={onPick}
            className={cn(ROW, picked && ITEM_CHOSEN)}
          >
            <span ref={nameRef} data-name className="truncate font-semibold">
              {set.name}
            </span>
            <span className="text-xs text-muted-foreground">{songsLabel(set.songs.length)}</span>
          </Button>
        </Item>
      </WholeTip>
    </li>
  )
}

/**
 * The set picked in the list. Its name is saved on Enter or on leaving the
 * field; a name another set has is refused, and the field says why until
 * it is changed.
 */
function SetDetail({
  set,
  fresh,
  choices,
  onRename,
  onSongs,
  onDelete,
}: {
  set: SongSet
  fresh: boolean
  choices: SongChoices | null
  /** The error, or null once saved. */
  onRename: (name: string) => Promise<string | null>
  onSongs: (titles: string[], out?: SongOut) => void
  onDelete: () => void
}) {
  const [name, setName] = useState(set.name)
  const [error, setError] = useState<string | null>(null)
  // The name last saved: Enter saves and leaves the field, and leaving it
  // would save the same name again before the list has it.
  const saved = useRef(set.name)

  const save = async () => {
    const typed = name.trim()
    if (typed === set.name || typed === saved.current) {
      setName(typed || set.name)
      return true
    }
    const refused = await onRename(typed)
    setError(refused)
    if (refused === null) {
      saved.current = typed
      setName(typed)
    }
    return refused === null
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        {/* What is wrong with the name is said beside it, a row no taller
            than the label's, so the songs under it never move. */}
        <div className="flex h-3.5 min-w-0 items-center gap-2">
          <Label htmlFor="set-name" className="shrink-0">
            Name
          </Label>
          {error && (
            <p className="flex min-w-0 text-sm text-destructive">
              <span className="shrink-0 whitespace-pre">· </span>
              <Whole text={error} className="min-w-0 truncate" />
            </p>
          )}
        </div>
        <Input
          id="set-name"
          value={name}
          maxLength={40}
          autoFocus={fresh}
          onFocus={(e) => fresh && e.currentTarget.select()}
          aria-invalid={error !== null}
          onChange={(e) => {
            setName(e.target.value)
            setError(null)
          }}
          onKeyDown={async (e) => {
            if (e.key !== "Enter") return
            e.preventDefault()
            const field = e.currentTarget
            if (await save()) field.blur()
          }}
          onBlur={() => void save()}
          className="max-w-sm"
        />
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Songs, in the order you play them</span>
        <SetSongsEditor songs={set.songs} choices={choices} onChange={onSongs} />
      </div>
      <Button
        variant="ghost"
        size="row"
        onClick={onDelete}
        className="self-start text-muted-foreground hover:text-destructive"
      >
        <Trash2 />
        Delete set
      </Button>
    </>
  )
}
