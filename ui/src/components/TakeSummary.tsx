import { useEffect, useRef, useState } from "react"
import { Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TakeColumns, type TakeColumn } from "@/components/ui/take-columns"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useFitted } from "@/components/ui/whole"
import { RenameTakeDialog } from "@/components/ConfirmDialog"
import { GoTitle } from "@/components/TakeTitle"
import type { SongChoices, Take } from "@/lib/api"
import { formatMMSS } from "@/lib/format"
import { UNNAMED, goFor, songFor } from "@/lib/goes"
import { cn } from "@/lib/utils"

/** The most columns shown: the last takes, this one last, so a song played
 *  all evening still leaves its title the room. */
const MOST_COLUMNS = 10

/**
 * What the screen after a take says about it (issue #12 step 8, Q1 "the name
 * in the header"): its song and the number it will be, or the name as typed
 * for a take nobody named ("Take 7"); and the song's takes tonight as
 * columns, the last ten, this one lit. A song's first take tonight has no
 * columns, nor does a take nobody named. The length is the transport's to
 * say, under the header.
 */
// oxlint-disable-next-line react/only-export-components -- the screen reads the take's facts once, for its title and for the figures beside it
export function takeFacts({
  name,
  takeNumber,
  durationSec,
  takes,
  choices,
}: {
  name: string
  takeNumber: number
  durationSec: number
  /** Tonight's takes kept so far. */
  takes: Take[]
  choices: SongChoices | null
}) {
  // A title no song has yet is a new song, at its first take; "Take 7" is a
  // take nobody named.
  const typed = name.trim()
  const unnamed = typed === "" || UNNAMED.test(typed)
  const song = unnamed ? null : (songFor(typed, choices)?.choice.song ?? typed)
  // Until the songs are in, the number is not guessed.
  const go = song ? goFor(typed, choices) : null
  const before = song
    ? takes.filter((t) => t.song === song && t.take_number !== takeNumber)
    : []
  const columns: TakeColumn[] =
    before.length === 0
      ? []
      : [
          ...before.map((t) => ({
            key: t.take_number,
            sec: t.duration_sec,
            starred: Boolean(t.starred),
            lit: false,
            label: t.go ?? null,
          })),
          { key: takeNumber, sec: durationSec, starred: false, lit: true, label: go },
        ].slice(-MOST_COLUMNS)
  return {
    song,
    go,
    unnamed: !song,
    /** What the title says: the song, or the name as typed. */
    shown: song ?? name,
    columns,
    /** The columns in words, each by the take's own name, for their tip and
     *  for the title's once they have given way. */
    columnsText: columns
      .map((c) => `${song} ${c.label ?? "?"}: ${formatMMSS(c.sec)}`)
      .join(", "),
  }
}

export type TakeFacts = ReturnType<typeof takeFacts>

/**
 * The take as the header's title: its song and number on up to two lines,
 * then cut with the number kept, whole in the shared tooltip; grey for a
 * take nobody named. The pencil after the last word opens Rename take.
 * `figures` is the columns in words once they have given way to the title:
 * the title's tip says them then.
 */
export function TakeName({
  facts,
  name,
  fallback,
  choices,
  onRename,
  figures,
}: {
  facts: TakeFacts
  name: string
  /** What ✕ in Rename take puts back: the name it would have had. */
  fallback: string
  choices: SongChoices | null
  onRename: (name: string) => void
  figures?: string
}) {
  const [renaming, setRenaming] = useState(false)
  return (
    <span
      data-take-summary
      className={cn("flex min-w-0", facts.unnamed && "text-muted-foreground")}
    >
      <GoTitle
        title={facts.shown}
        go={facts.go}
        cut
        lines={2}
        start
        figures={figures}
        after={
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-row"
                aria-label="Rename take"
                onClick={() => setRenaming(true)}
                className="text-muted-foreground hover:text-foreground"
              >
                <Pencil />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <span aria-hidden>Rename take</span>
            </TooltipContent>
          </Tooltip>
        }
      />
      <RenameTakeDialog
        draft={renaming ? { name, fallback } : null}
        choices={choices}
        onOpenChange={setRenaming}
        onSubmit={onRename}
      />
    </span>
  )
}

/**
 * The song's takes tonight as columns at the header's right, where the
 * rehearsal screen has its figures, each as tall as it ran with its number
 * under it, said in words on hover and to a screen reader. They take only
 * the room the title leaves and give way to it whole: `onGone` hears when
 * they have, so the title's tip, which still has room to hover, says them.
 */
export function TakeFigures({
  facts,
  onGone,
}: {
  facts: TakeFacts
  /** Told true while the columns have given way; a state setter, or
   *  anything that keeps its identity. */
  onGone?: (gone: boolean) => void
}) {
  const box = useRef<HTMLDivElement>(null)
  const ruler = useRef<HTMLSpanElement>(null)
  const [room] = useFitted(
    1,
    facts.columnsText,
    () => {
      const b = box.current
      const r = ruler.current
      if (!b || !r) return null
      const free = b.clientWidth - parseFloat(getComputedStyle(b).paddingLeft)
      return [free >= r.getBoundingClientRect().width]
    },
    [box, ruler]
  )
  const gone = facts.columns.length > 0 && !room
  useEffect(() => {
    onGone?.(gone)
  }, [gone, onGone])
  // Gone with them when they go: a song's first take tonight has none.
  useEffect(() => () => onGone?.(false), [onGone])
  const said = `Takes of ${facts.song} tonight: ${facts.columnsText}`
  return (
    <div
      ref={box}
      data-take-figures
      data-columns-gone={gone || undefined}
      // Contained, so the figures ask for no room of their own: the title
      // takes what it needs first and they have what is left. The columns
      // with their numbers are taller than a title of one line with the line
      // over it (52 px to 38 at 100 %), so they reach into the header's
      // padding rather than make it taller: the header is as tall with them
      // as without, and a rename that brings them or takes them away moves
      // nothing under it (B4).
      className="relative -my-2.5 flex min-w-0 flex-1 items-center justify-end self-stretch overflow-hidden pl-6 [contain:inline-size]"
    >
      {gone ? (
        <span className="sr-only">{said}</span>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <div role="img" aria-label={said}>
              <TakeColumns columns={facts.columns} height={36} numbers />
            </div>
          </TooltipTrigger>
          <TooltipContent className="tnum">
            <span aria-hidden>{facts.columnsText}</span>
          </TooltipContent>
        </Tooltip>
      )}
      {/* The columns as drawn, out of sight, to measure. */}
      <div
        aria-hidden
        className="pointer-events-none invisible absolute top-0 right-0 h-0 overflow-hidden"
      >
        <span ref={ruler} className="block w-max">
          <TakeColumns columns={facts.columns} height={36} numbers />
        </span>
      </div>
    </div>
  )
}
