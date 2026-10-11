import { ChevronRight, History, Star } from "lucide-react"
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Item } from "@/components/ui/item"
import { MarkLine } from "@/components/ui/mark"
import { PlayButton } from "@/components/ui/play-button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { FigureLine, Figures, WholeTip, useCut, type FigurePart } from "@/components/ui/whole"
import { EveningStrip } from "@/components/EveningStrip"
import { SongName } from "@/components/SongName"
import { TakeTitle } from "@/components/TakeTitle"
import {
  daysAgo,
  formatDay,
  formatDuration,
  formatMMSS,
  goesLabel,
  inCloudLabel,
  longAgo,
  rehearsalsLabel,
  takesLabel,
} from "@/lib/format"
import { labelOf, useLabels } from "@/lib/labels"
import { playLook } from "@/lib/playLook"
import { drawnLength } from "@/lib/takeScale"
import { cn } from "@/lib/utils"
import type { LastTime as LastTimeData, SongPlays, Take } from "@/lib/api"

/** What is playing from here, and where it has got to. */
export type LastTimePlayback = {
  take: Take
  playing: boolean
  loading: boolean
  position: number
}

/** How many notes a song shows here before it says how many more there are:
 *  this is a glance before playing, not the rehearsal itself. */
const NOTES_SHOWN = 2
/** And how many of the songs left out. */
const LEFT_OUT_SHOWN = 5

/**
 * Last time, beside the setup: the rehearsal before this one, song by song,
 * so the band can hear where they left off before they start.
 *
 * Built on what every take has — its song, how many goes it got, how long
 * each ran — and not on marks, which are few: a song's row plays its newest
 * ★ go, wherever it was played, or with none its last go, which is usually
 * the one they settled on. The notes left while listening are added under
 * their song where there are any. Under it, the songs that were not played
 * last time, each with its own newest ★ go or last go, and the other
 * rehearsals, which open in history.
 *
 * Every name here keeps its width (Q3): it wraps to a second line only when
 * it is longer than its whole row, and the figures beside it drop whole, the
 * least needed first. What is cut or dropped shows whole on hover and on
 * keyboard focus.
 */
export function LastTime({
  data,
  playback,
  problem,
  onPlay,
  onOpen,
  onAll,
  onOpenSong,
}: {
  data: LastTimeData
  playback: LastTimePlayback | null
  /** Why what was asked for does not play. */
  problem?: string | null
  onPlay: (take: Take) => void
  onOpen: (folder: string) => void
  onAll: () => void
  /** Opens a song's page in History's Songs view; null is Not named's. */
  onOpenSong?: (title: string | null) => void
}) {
  const last = data.last
  if (!last) return null

  const byNumber = new Map(last.takes.map((t) => [t.take_number, t]))
  const songs = last.songs
    .map((s) => ({
      name: s.name,
      plays: s.plays,
      takes: (s.take_numbers ?? [])
        .map((n) => byNumber.get(n))
        .filter((t): t is Take => t !== undefined),
    }))
    .filter((s) => s.takes.length > 0)
  const grouped = new Set(songs.flatMap((s) => s.takes.map((t) => t.take_number)))
  const unnamed = last.takes.filter((t) => !grouped.has(t.take_number))
  const longest = Math.max(1, ...last.takes.map((t) => t.duration_sec || 0))
  const total = last.takes.reduce((sum, t) => sum + (t.duration_sec || 0), 0)

  const meta = [
    total >= 30 ? formatDuration(total / 60) : null,
    takesLabel(last.takes.length),
    last.in_cloud > 0 ? inCloudLabel(last.in_cloud) : null,
  ]
    .filter(Boolean)
    .join(" · ")
  const leftOut = data.not_played.slice(0, LEFT_OUT_SHOWN)

  return (
    <aside aria-label="Last time" className="flex min-w-0 flex-col gap-8">
      <Card className="px-6 pt-6 pb-3">
        <CardHead
          day={`Last time · ${formatDay(last.created_at)}, ${daysAgo(last.created_at)}`}
          name={last.name}
          meta={meta}
          onOpen={() => onOpen(last.folder)}
        />

        <EveningStrip runs={last.runs} />

        {problem && (
          <p role="status" className="text-xs text-destructive">
            {problem}
          </p>
        )}

        <div className="flex flex-col">
          {songs.map((s) => (
            <SongRow
              key={s.name}
              name={s.name}
              takes={s.takes}
              plays={s.plays}
              folder={last.folder}
              longest={longest}
              playback={playback}
              problem={problem}
              onPlay={onPlay}
              onOpenSong={onOpenSong}
            />
          ))}
          {unnamed.length > 0 && (
            <SongRow
              name="Not named"
              unnamed
              takes={unnamed}
              plays={null}
              folder={last.folder}
              longest={longest}
              playback={playback}
              problem={problem}
              onPlay={onPlay}
              onOpenSong={onOpenSong}
            />
          )}
        </div>
      </Card>

      {leftOut.length > 0 && (
        <section aria-label="Not played last time" className="flex flex-col gap-0.5">
          <h2 className="px-1 pb-1.5 text-xs font-semibold text-muted-foreground">
            Not played last time
          </h2>
          {leftOut.map((s) => (
            <NotPlayedRow
              key={s.name}
              song={s}
              playback={playback}
              problem={problem}
              onPlay={onPlay}
              onOpenSong={onOpenSong}
            />
          ))}
          {data.not_played.length > leftOut.length && (
            <p className="px-1 pt-1 text-xs text-muted-foreground">
              and {data.not_played.length - leftOut.length} more in history
            </p>
          )}
        </section>
      )}

      <section aria-label="Earlier" className="flex flex-col gap-0.5">
        {data.earlier.length > 0 && (
          <h2 className="px-1 pb-1.5 text-xs font-semibold text-muted-foreground">Earlier</h2>
        )}
        {data.earlier.map((r) => (
          <EarlierRow key={r.folder} rehearsal={r} onOpen={onOpen} />
        ))}
        {/* Called what the button in the header is called, since it goes
            to the same place: two names would read as two screens. */}
        <Button
          variant="ghost"
          size="row"
          onClick={onAll}
          className="gap-1.5 self-start px-2 font-semibold has-[>svg]:px-2"
        >
          <History className="size-3.5" />
          History
          <span className="font-normal text-muted-foreground">
            · {rehearsalsLabel(data.count)}
          </span>
        </Button>
      </section>
    </aside>
  )
}

/**
 * One song of last time: its goes as columns as tall as they ran (Q2), the
 * starred ones green, and the one its button plays at full strength while
 * the others are dimmed, when it is one of them.
 */
function SongRow({
  name,
  takes,
  plays,
  folder,
  longest,
  unnamed = false,
  playback,
  problem,
  onPlay,
  onOpenSong,
}: {
  name: string
  takes: Take[]
  /** What ▶ plays: the song's newest ★ go, or its last go here. null for
   *  the takes nobody named, which have no song and play their last take. */
  plays: SongPlays | null
  /** Last time's folder, to tell its own takes from another rehearsal's. */
  folder: string
  longest: number
  unnamed?: boolean
  playback: LastTimePlayback | null
  problem?: string | null
  onPlay: (take: Take) => void
  onOpenSong?: (title: string | null) => void
}) {
  const labels = useLabels()
  const lastGo = takes[takes.length - 1]
  const target = plays?.take ?? lastGo
  const isTarget = (t: Take) =>
    plays ? plays.folder === folder && plays.take.take_number === t.take_number : t === lastGo
  // Said in words only when ▶ plays something the columns do not end on.
  const elsewhere = plays !== null && !isTarget(lastGo)
  const here = playback?.take === target ? playback : null
  const total = takes.reduce((sum, t) => sum + (t.duration_sec || 0), 0)
  // Every mark is listed, a plain one with nothing written included (spec D2).
  const notes = takes.flatMap((t) => (t.markers ?? []).map((m) => ({ take: t, marker: m })))
  // The goes go first, then how long they ran: the columns show both.
  const parts: FigurePart[] = here
    ? [{ text: `${formatMMSS(here.position)} / ${formatMMSS(target.duration_sec)}`, keep: 9 }]
    : [
        { text: unnamed ? takesLabel(takes.length) : goesLabel(takes.length), keep: 1 },
        { text: formatMMSS(total), keep: 0 },
      ]

  return (
    <div
      data-song={name}
      className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-x-3 border-t py-3"
    >
      <RowPlay
        take={target}
        here={here}
        problem={problem}
        label={
          unnamed ? target.name : `${target.name}, the ${target.starred ? "starred" : "last"} go at ${name}`
        }
        onPlay={onPlay}
      />
      <div className="flex min-w-0 flex-col gap-0.5">
        <NameAndFigures
          parts={parts}
          name={(figures) => (
            <SongName
              title={unnamed ? null : name}
              onOpen={onOpenSong}
              className={cn("flex-[0_1_auto] text-sm", unnamed ? "text-muted-foreground" : "font-semibold")}
              textClassName="line-clamp-2 break-words"
              figures={figures}
            />
          )}
        />
        {elsewhere && plays && (
          <span data-plays className="text-xs break-words text-muted-foreground">
            <StarMark /> <TakeTitle take={plays.take} /> · {formatDay(plays.created_at)}
          </span>
        )}
        {notes.slice(0, NOTES_SHOWN).map(({ take, marker }) => (
          <MarkLine
            key={`${take.take_number}-${marker.at}`}
            label={labelOf(labels, marker.label_id)}
            at={marker.at}
            note={marker.note}
            take={<TakeTitle take={take} />}
            className="text-xs"
          />
        ))}
        {notes.length > NOTES_SHOWN && (
          <span className="text-xs text-muted-foreground">
            and {notes.length - NOTES_SHOWN} more
          </span>
        )}
      </div>
      <div aria-hidden data-goes className="flex h-6 items-end gap-[3px]">
        {takes.map((t) => (
          <span
            key={t.take_number}
            data-starred={t.starred || undefined}
            data-lit={isTarget(t) || undefined}
            className={cn(
              "w-1.5 rounded-sm",
              isTarget(t)
                ? t.starred
                  ? "bg-signal"
                  : "bg-muted-foreground"
                : t.starred
                  ? "bg-signal/45"
                  : "bg-muted-foreground/35"
            )}
            style={{ height: drawnLength(t.duration_sec, longest, 24) }}
          />
        ))}
      </div>
    </div>
  )
}

/** A song the last rehearsal did not play: ▶ plays its newest ★ go or its
 *  last go, from whichever rehearsal that was. */
function NotPlayedRow({
  song: s,
  playback,
  problem,
  onPlay,
  onOpenSong,
}: {
  song: LastTimeData["not_played"][number]
  playback: LastTimePlayback | null
  problem?: string | null
  onPlay: (take: Take) => void
  onOpenSong?: (title: string | null) => void
}) {
  const target = s.plays.take
  const starred = target.starred ?? false
  const here = playback?.take === target ? playback : null
  const ago = longAgo(s.created_at)
  // A ★ go from another rehearsal than the one listed says its day.
  const day = s.plays.folder !== s.folder ? ` (${formatDay(s.plays.created_at)})` : ""
  // The ★ go stays longest, then the goes, then the day; how long ago goes
  // first.
  const parts: FigurePart[] = here
    ? [{ text: `${formatMMSS(here.position)} / ${formatMMSS(target.duration_sec)}`, keep: 9 }]
    : [
        ...(starred
          ? [
              {
                text: `★ ${target.name}${day}`,
                keep: 3,
                node: (
                  <>
                    <StarMark /> <TakeTitle take={target} />
                    {day}
                  </>
                ),
              },
            ]
          : []),
        { text: formatDay(s.created_at), keep: 1 },
        ...(ago ? [{ text: ago, keep: 0, join: ", " }] : []),
        { text: goesLabel(s.goes), keep: 2 },
      ]
  return (
    <div
      data-song={s.name}
      className="grid grid-cols-[2rem_minmax(0,1fr)] items-center gap-x-3 px-1 py-1.5"
    >
      <RowPlay
        take={target}
        here={here}
        problem={problem}
        label={`${target.name}, the ${starred ? "starred" : "last"} go at ${s.name}`}
        onPlay={onPlay}
      />
      <NameAndFigures
        parts={parts}
        name={(figures) => (
          <SongName
            title={s.name}
            onOpen={onOpenSong}
            className="flex-[0_1_auto] text-sm font-semibold"
            textClassName="line-clamp-2 break-words"
            figures={figures}
          />
        )}
      />
    </div>
  )
}

/** A rehearsal before last time, which opens in History: its day, its name,
 *  and how long it ran, or that its folder is gone. */
function EarlierRow({
  rehearsal: r,
  onOpen,
}: {
  rehearsal: LastTimeData["earlier"][number]
  onOpen: (folder: string) => void
}) {
  const [nameRef, cut] = useCut<HTMLSpanElement>()
  const [bare, setBare] = useState(false)
  const parts: FigurePart[] = [
    ...(r.total_duration_sec >= 30 ? [{ text: formatDuration(r.total_duration_sec / 60), keep: 0 }] : []),
    { text: takesLabel(r.take_count), keep: 1 },
  ]
  return (
    <WholeTip cut={cut} text={r.name} figures={bare && !r.missing ? <FigureLine parts={parts} /> : null}>
      <Item asChild size="sm" className="flex-nowrap items-baseline gap-3 px-2 py-2">
        <Button
          variant="ghost"
          data-earlier={r.folder}
          onClick={() => onOpen(r.folder)}
          className="h-auto w-full justify-start text-left whitespace-normal"
        >
          <span className="w-20 shrink-0 text-xs text-muted-foreground">{formatDay(r.created_at)}</span>
          <span ref={nameRef} className="line-clamp-2 min-w-0 flex-[0_1_auto] break-words">
            {r.name}
          </span>
          {r.missing ? (
            <span className="ml-auto shrink-0 text-xs text-muted-foreground">Not on disk</span>
          ) : (
            <Figures
              parts={parts}
              onBare={setBare}
              className="tnum text-right text-xs text-muted-foreground"
            />
          )}
        </Button>
      </Item>
    </WholeTip>
  )
}

/**
 * A name and its figure line (Q3): the name keeps its width, wrapping only
 * past its whole row, and the figures take what is left, dropping whole.
 * When none has room, there is nothing of them to hover, so the name's own
 * tip says them.
 */
function NameAndFigures({
  parts,
  name,
}: {
  parts: FigurePart[]
  /** The name, given the figures its tip is to say, or null. */
  name: (figures: ReactNode) => ReactNode
}) {
  const [bare, setBare] = useState(false)
  return (
    <div className="flex min-w-0 items-baseline gap-2">
      {name(bare ? <FigureLine parts={parts} /> : null)}
      <Figures parts={parts} onBare={setBare} className="tnum text-xs text-muted-foreground" />
    </div>
  )
}

/** ★: the one star (C8), filled in the starred green, in a line of text. */
function StarMark() {
  return (
    <Star
      role="img"
      aria-label="Starred"
      className="inline size-3 fill-current align-text-bottom text-signal"
    />
  )
}

/** The small player on a row (C2), its look worked out from what plays. */
function RowPlay({
  take,
  here,
  problem,
  label,
  onPlay,
}: {
  take: Take
  here: LastTimePlayback | null
  problem?: string | null
  label: string
  onPlay: (take: Take) => void
}) {
  const look = playLook({
    loaded: !!here,
    playing: here?.playing ?? false,
    loading: here?.loading ?? false,
    failed: !!here && !!problem,
    missing: false,
  })
  return (
    <PlayButton
      look={look}
      name={label}
      onClick={() => onPlay(take)}
      aria-keyshortcuts={here ? "Space" : undefined}
    />
  )
}

/**
 * Last time's head: the day, the rehearsal's name, its figures, and Open.
 * The name keeps its width (Q3): Open gives up its word first, becoming a
 * chevron with a tip, and only then does the name wrap, to two lines, cut
 * past that and whole on hover.
 */
function CardHead({
  day,
  name,
  meta,
  onOpen,
}: {
  day: string
  name: string
  meta: string
  onOpen: () => void
}) {
  const row = useRef<HTMLDivElement>(null)
  const open = useRef<HTMLButtonElement>(null)
  const openWide = useRef(0)
  const [iconOnly, setIconOnly] = useState(false)
  const [nameRef, cut] = useCut<HTMLDivElement>()
  // The name on one line, unseen, for how wide it wants to be.
  const natural = useRef<HTMLSpanElement>(null)
  // Open with its word is measured while it has it; the word goes when the
  // name is wider than the room Open with its word would leave.
  useLayoutEffect(() => {
    if (open.current && !iconOnly) openWide.current = open.current.offsetWidth
  })
  useEffect(() => {
    const r = row.current
    if (!r) return
    const look = () => {
      const n = natural.current
      if (!n) return
      const gap = parseFloat(getComputedStyle(r).columnGap) || 0
      setIconOnly(n.offsetWidth > r.clientWidth - openWide.current - gap)
    }
    look()
    const watch = new ResizeObserver(look)
    watch.observe(r)
    return () => watch.disconnect()
  }, [name])

  const label = `Open ${name} in history`
  return (
    <div ref={row} className="relative flex items-start gap-2">
      <span aria-hidden className="pointer-events-none absolute top-0 left-0 size-0 overflow-hidden">
        <span ref={natural} className="invisible absolute text-base font-semibold whitespace-nowrap">
          {name}
        </span>
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-xs font-semibold text-muted-foreground">{day}</h2>
        <WholeTip cut={cut} text={name}>
          <div
            ref={nameRef}
            data-card-name
            data-cut={cut || undefined}
            className="mt-1 line-clamp-2 text-base font-semibold break-words"
          >
            {name}
          </div>
        </WholeTip>
        <div className="tnum mt-0.5 text-xs text-muted-foreground">{meta}</div>
      </div>
      {iconOnly ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              ref={open}
              variant="outline"
              size="icon-row"
              onClick={onOpen}
              aria-label={label}
              className="shrink-0"
            >
              <ChevronRight />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Open in History</TooltipContent>
        </Tooltip>
      ) : (
        <Button ref={open} variant="outline" size="row" onClick={onOpen} aria-label={label} className="shrink-0">
          Open
          <ChevronRight />
        </Button>
      )}
    </div>
  )
}
