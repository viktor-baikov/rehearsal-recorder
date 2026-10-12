import { Children, isValidElement, useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { Check, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader } from "@/components/ui/empty"
import { WholeTip, useCut } from "@/components/ui/whole"
import type { RehearsalSet } from "@/lib/api"
import { takesLabel } from "@/lib/format"
import { SHORT, rowsFor, shortList } from "@/lib/setSongs"
import { cn } from "@/lib/utils"

// The songs on the rehearsal screen's panel, under the Next take field, in
// place of the pills the other name fields have (issue #12 step 8, R1–R7):
// the set the rehearsal plays by, then the band's other songs, as rows like
// the set's. A click on a row names the next take after it. Each is a part
// of the panel's one group, under a line the screen draws; neither has a
// frame of its own.

// A row is the shared Button (C1); the row the field names is selected, grey
// (F2), and the ↑ ↓ row while typing shows the focus ring rather than a ring
// of its own.
const ROW = "h-9 w-full justify-start gap-3 px-2 text-left text-sm font-normal"

/** One song: its number in the set (none in the other songs, whose names
 *  still line up with the set's), the title, and its goes tonight. */
function SongRow({
  title,
  number,
  goes,
  lit,
  next = false,
  highlighted,
  onPick,
  data,
}: {
  title: string
  number: number | null
  goes: number
  lit: boolean
  next?: boolean
  highlighted: boolean
  onPick: (title: string) => void
  data: Record<string, string>
}) {
  const [titleRef, cut] = useCut<HTMLSpanElement>()
  return (
    <li>
      <WholeTip cut={cut} text={title}>
        <Button
          type="button"
          variant="ghost"
          {...data}
          aria-current={lit ? "true" : undefined}
          data-highlighted={highlighted ? "" : undefined}
          // The field keeps focus until the row says what it names: what was
          // half typed in it is dropped, not sent (TakeNameField's `put`).
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onPick(title)}
          className={cn(
            ROW,
            lit && "bg-selected hover:bg-selected dark:bg-selected dark:hover:bg-selected",
            highlighted && "border-ring ring-[3px] ring-ring/50"
          )}
        >
          <span className="tnum w-4 shrink-0 text-right text-xs text-muted-foreground">
            {number}
          </span>
          <span
            ref={titleRef}
            data-row-title
            className={cn("min-w-0 flex-1 truncate", lit && "font-semibold")}
          >
            {title}
          </span>
          {next && <span className="shrink-0 text-xs text-foreground">next</span>}
          {goes > 0 && (
            <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
              {!lit && <Check data-played-check aria-hidden className="size-3.5 text-foreground" />}
              {takesLabel(goes)}
            </span>
          )}
        </Button>
      </WholeTip>
    </li>
  )
}

/**
 * The panel's parts as one group: the field, the set and the other songs,
 * each after the first under a 1 px line across the panel, with 24 px either
 * side of the line. A part that is null, undefined or false is not drawn, and
 * leaves no line. `bleed` is how far the line runs past the padding the parts
 * sit in, in spacing steps: 8 (32 px) in the rehearsal screen's panel, whose
 * padding it takes back; none, the default, where the parts have the room to
 * themselves (reha.stream's tiles).
 */
export function PanelParts({ children, bleed = 0 }: { children: ReactNode; bleed?: 0 | 8 }) {
  const parts = Children.toArray(children)
  return parts.map((part, i) => (
    <div
      // A part keeps its own box as the others come and go.
      key={isValidElement(part) ? part.key : i}
      className={cn(
        bleed === 8 && "-mx-8 px-8",
        i > 0 && "border-t pt-6",
        i < parts.length - 1 && "pb-6"
      )}
    >
      {part}
    </div>
  ))
}

/**
 * The set (R1): "Gig on the 25th — 2 of 6 played", then its songs in
 * order, numbered. The song the field names is lit and the row after it
 * says *next*; with the field naming a song outside the set, *next* is on
 * the first one not played yet. Rows never move: the set is as tall all
 * evening as it is long.
 */
export function SetCard({
  set,
  goes,
  current,
  onPick,
  highlighted,
}: {
  set: RehearsalSet
  /** Goes tonight by song. */
  goes: Map<string, number>
  /** The song the field names. */
  current: string | null
  onPick: (title: string) => void
  /** The row the arrow keys are on while the field is typed in. */
  highlighted: string | null
}) {
  const titles = set.songs.map((s) => s.title)
  const played = titles.filter((t) => (goes.get(t) ?? 0) > 0).length
  const at = current === null ? -1 : titles.indexOf(current)
  const next =
    at >= 0 ? (titles[at + 1] ?? null) : (titles.find((t) => (goes.get(t) ?? 0) === 0) ?? null)
  return (
    <section aria-label={`Set ${set.name}`} data-set-card className="flex flex-col gap-2">
      {/* The set's name keeps its width before its figure (B6): a long one
          wraps, and "N of M played" goes under it when there is no room. */}
      <h2 className="flex min-h-8 min-w-0 flex-wrap items-baseline gap-x-1.5 px-2 pt-1.5 text-sm font-semibold">
        <span className="min-w-0 break-words">{set.name}</span>{" "}
        <span className="shrink-0 text-sm font-normal text-muted-foreground">
          — {played} of {titles.length} played
        </span>
      </h2>
      {/* Tonight's copy of the set: songs added in Settings › Sets now are
          for the next rehearsal, so this does not send anyone there. */}
      {titles.length === 0 ? (
        <Empty className="items-start justify-start p-0 md:p-0">
          <EmptyHeader className="max-w-none items-start px-2 text-left">
            <EmptyDescription>
              This set has no songs yet. Add them in Settings › Sets.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ol className="flex flex-col">
          {titles.map((title, i) => (
            <SongRow
              key={title}
              title={title}
              number={i + 1}
              goes={goes.get(title) ?? 0}
              lit={i === at}
              next={i !== at && title === next}
              highlighted={highlighted === title}
              onPick={onPick}
              data={{ "data-set-song": title }}
            />
          ))}
        </ol>
      )}
    </section>
  )
}

/**
 * The band's songs as rows (R4–R6): under the set, the ones outside it
 * (*Other songs*); with no set, every song (*Songs*). Five show, and with
 * more than six *All N songs* opens the rest, *Fewer* folds them; the song
 * the field names shows even past the five. Typing narrows them over all
 * of them; while the field has focus the list keeps the height it had,
 * so nothing under it moves.
 */
export function SongRows({
  titles,
  lastTake,
  goes,
  current,
  typed,
  typing,
  inSet,
  title,
  onPick,
  highlighted,
  open,
  onOpen,
}: {
  /** The songs, in order (otherSongs). */
  titles: string[]
  /** Tonight's songs' latest takes: the five folded keep the latest. */
  lastTake: Map<string, number>
  goes: Map<string, number>
  /** The song the field names. */
  current: string | null
  /** What the list narrows by; null while nothing does (rowsFor). */
  typed: string | null
  /** Whether the field has focus: the list's height is held. */
  typing: boolean
  /** The set's songs, for "No other song has…" when only they match. */
  inSet: string[]
  title: string
  onPick: (title: string) => void
  highlighted: string | null
  open: boolean
  onOpen: (open: boolean) => void
}) {
  const box = useRef<HTMLElement>(null)
  const [held, setHeld] = useState<number | null>(null)
  // Measured as focus arrives, before any key narrows the list.
  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHeld(typing ? (box.current?.offsetHeight ?? null) : null)
  }, [typing])

  if (titles.length === 0) return null
  const shown = rowsFor(titles, typed, current)
  const folds = typed === null && titles.length > SHORT + 1
  // The song the field names shows after the five when it is not one.
  const short = shortList(titles, lastTake)
  const rows =
    folds && !open
      ? [
          ...short,
          ...(current !== null && titles.includes(current) && !short.includes(current)
            ? [current]
            : []),
        ]
      : shown
  const text = (typed ?? "").trim()
  // What is typed is one of the set's songs, or in one of their titles: the
  // card above has it.
  const setHasIt =
    typed !== null &&
    ((current !== null && inSet.includes(current)) ||
      inSet.some((t) => t.toLocaleLowerCase().includes(text.toLocaleLowerCase())))
  return (
    <section
      ref={box}
      aria-label={title}
      data-song-list
      style={{ minHeight: held ?? undefined }}
      className="flex flex-col gap-2"
    >
      <h2 className="flex min-h-8 items-center px-2 text-sm font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="px-2 text-sm text-muted-foreground">
          {setHasIt
            ? `No other song has “${text}” in it.`
            : `No song has “${text}” in it. The take makes it a new one.`}
        </p>
      ) : (
        <ul className="flex flex-col">
          {rows.map((t) => (
            <SongRow
              key={t}
              title={t}
              number={null}
              goes={goes.get(t) ?? 0}
              lit={t === current}
              highlighted={highlighted === t}
              onPick={onPick}
              data={{ "data-song-row": t }}
            />
          ))}
        </ul>
      )}
      {folds && (
        <Button
          type="button"
          variant="ghost"
          data-songs-more
          aria-expanded={open}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onOpen(!open)}
          className={cn(ROW, "text-muted-foreground hover:text-foreground")}
        >
          <span className="w-4 shrink-0" />
          <span className="flex-1">{open ? "Fewer" : `All ${titles.length} songs`}</span>
          {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </Button>
      )}
    </section>
  )
}
