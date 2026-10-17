import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ComponentProps, type ReactNode } from "react"
import { InstrumentIcon } from "@/components/InstrumentIcon"
import { MidiGlyph } from "@/components/midi/MidiGlyph"
import { Meter } from "@/components/ui/meter"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { peakToDb } from "@/lib/format"
import { CLIP_THRESHOLD, QUIET_THRESHOLD, meterReach } from "@/lib/levels"

/** How high the fill reaches, 0..1, in dB as on the desk (see meterReach),
 *  and nothing at all for silence. */
const reach = (peak: number) => (peak < QUIET_THRESHOLD ? 0 : meterReach(peak))
/** How high a note at full velocity stands, 0..1: the rest is the header's
 *  room, which the fill would run through. */
const NOTES_REACH = 0.88
/** Below this nothing is drawn: a lit line along the bottom would read as a
 *  note still sounding, as it would for a dead input. */
const QUIET_VEL = 0.02
const notesReach = (vel: number) => (vel >= QUIET_VEL ? Math.min(1, vel) * NOTES_REACH : 0)

/**
 * One track while it records, as a tile that fills from the bottom with its
 * level — read from behind the kit, not from the laptop.
 *
 * Every tile is one width whatever it carries, so sixteen tracks still fit in
 * one row. A stereo track is split down the middle, left and right each
 * filling on its own: one fill for the louder side would hide an overhead
 * that stopped arriving, which is the thing this exists to catch.
 *
 * The writing on it shrinks with the tile rather than with the track count,
 * and what does not fit at that size — the input, the words — goes, leaving
 * the colour to say it: a red edge for a clip, to the end of the take, dimmed
 * for silence. The latest peak in dB sits at the top, out of the name's way,
 * and the fill is in dB too, from −60 at the bottom to full scale at the top,
 * as on the desk the band sets its gain on. The track's icon stands in the
 * corner opposite the figure, as a second way to find your own tile.
 *
 * A track on Both keeps all of this and gains a narrow column on the right,
 * split from the levels by a line and labelled MIDI, whose fill jumps with
 * each note's velocity; its header adds how many notes it has had. A track
 * on MIDI alone is the notes kind (`kind="notes"`): the notes fill the tile.
 *
 * The tile is set apart by its fill alone, with no frame (F4): a card of its
 * own, or a well on the tiles' one group (`surface="well"`, «Волна на
 * подложке»). A clip or a port that is gone draws an edge inside it, so
 * nothing moves when it comes; what it has no room to say is in the shared
 * tooltip on hover. It is not a Tab stop: Tab on this screen is for Stop.
 */
export function TrackTile(props: LevelsTileProps | NotesTileProps) {
  return props.kind === "notes" ? <NotesTile {...props} /> : <LevelsTile {...props} />
}

export type TileSurface = "card" | "well"

type TileCommon = {
  name: string
  icon?: string
  /** A card of its own (the default), or a well on the tiles' one group. */
  surface?: TileSurface
}

type LevelsTileProps = TileCommon & {
  kind?: "levels"
  channel: number | null
  stereo?: boolean
  /** One figure per side, 0..1. */
  peaks: number[]
  /** Where each side's meter stands, falling back from its peaks, 0..1. */
  shown: number[]
  /** The highest each side reached lately, 0..1. */
  held: number[]
  /** Clips since the take began. */
  clips: number
  silent: boolean
  /** The notes this track takes, when it records them too (Both): where the
   *  fill stands, 0..1, how many notes this take, and whether its port is
   *  plugged in. `tip` is what the tooltip says, when its port has something
   *  to say for itself. */
  midi?: { vel: number; notes: number; connected: boolean; tip?: string }
}

type NotesTileProps = TileCommon & {
  kind: "notes"
  /** The name of the port its notes come from. */
  port: string
  /** Where the fill stands, 0..1. */
  vel: number
  /** Notes played this take. */
  notes: number
  connected: boolean
  /** What the tooltip says under the port's name, when there is more to say
   *  of it: that it is not there, or another app holds it. */
  tip?: string
}

/** The backing of the icon and the figures, so a fill under them never runs
 *  through the writing: the surface's own colour. */
const BACKING = { card: "bg-card/85", well: "bg-well/85" } as const
const FIGURES = { card: "[&>span]:bg-card/85", well: "[&>span]:bg-well/85" } as const

/**
 * The box a tile is drawn in. Silence dims what is drawn at once, with no
 * fade (F11); on a well, the well keeps its own colour and dims what is on
 * it, so the row keeps its shape. A clip or a port that is gone is a 2 px
 * edge inside the box, over everything in it. `tip` is the tooltip's lines;
 * with none, none opens, so nothing points at one that is not there. It
 * stays wrapped in the tooltip either way: unwrapped, the box would be a new
 * one, and what watches its size would be watching the old.
 */
function TileBox({
  surface,
  edge,
  dim = false,
  tip,
  className,
  children,
  ...rest
}: Omit<ComponentProps<"div">, "children"> & {
  surface: TileSurface
  edge: "clip" | "port" | null
  dim?: boolean
  tip: string[]
  children: ReactNode
}) {
  const well = surface === "well"
  const corners = well ? "rounded-md" : "rounded-xl"
  // Held here the whole time, as WholeTip's is: left to Radix only while
  // there is something to say, it would switch between held and not, which
  // Radix warns of.
  const says = tip.length > 0
  const [open, setOpen] = useState(false)
  return (
    <Tooltip open={says && open} onOpenChange={(next) => setOpen(says && next)}>
      <TooltipTrigger asChild>
        <div
          data-surface={surface}
          {...rest}
          className={cn(
            // The least height is the screen's to set (--tile-min); 6rem
            // where it sets none.
            "@container relative min-h-[var(--tile-min,6rem)] min-w-0 overflow-hidden",
            corners,
            well ? "bg-well" : "bg-card",
            dim && !well && "opacity-45",
            className
          )}
        >
          <div data-face className={cn("absolute inset-0", dim && well && "opacity-45")}>
            {children}
          </div>
          {edge && (
            <div
              aria-hidden
              data-edge={edge}
              className={cn(
                "pointer-events-none absolute inset-0 border-2",
                corners,
                edge === "clip" ? "border-destructive/70" : "border-warn"
              )}
            />
          )}
        </div>
      </TooltipTrigger>
      {says && (
        <TooltipContent>
          {tip.map((line) => (
            <div key={line}>{line}</div>
          ))}
        </TooltipContent>
      )}
    </Tooltip>
  )
}

/** Whether a figure fits inside its tile, measured whenever the tile changes
 *  size or `watch` does. One that does not is hidden, never shown cut:
 *  "12,345" with its end clipped reads as "12". It keeps its place, and the
 *  tooltip says it. */
function useFits(watch: unknown) {
  const tile = useRef<HTMLDivElement>(null)
  const figure = useRef<HTMLSpanElement>(null)
  const [fits, setFits] = useState(true)
  const measure = useCallback(() => {
    const box = tile.current
    const chip = figure.current
    if (box && chip)
      setFits(
        chip.getBoundingClientRect().right <=
          box.getBoundingClientRect().left + box.clientLeft + box.clientWidth
      )
  }, [])
  useLayoutEffect(measure, [measure, watch])
  useEffect(() => {
    const watcher = new ResizeObserver(measure)
    if (tile.current) watcher.observe(tile.current)
    return () => watcher.disconnect()
  }, [measure])
  return { tile, figure, fits }
}

/** "12 notes", "1 note". The figure comes first so that a narrow tile can
 *  drop the word and keep the number. The word goes under 10 rem, where
 *  "12,345 notes" would not fit on the line: the header must never grow a
 *  second one when the count gets longer. */
function NoteCount({ notes }: { notes: number }) {
  return (
    <>
      <span className="tnum">{notes.toLocaleString("en-US")}</span>
      <span className="@max-[10rem]:hidden"> {notes === 1 ? "note" : "notes"}</span>
    </>
  )
}

/** The notes as they come: a fill that jumps with each note's velocity, from
 *  the bottom of a notes tile or of a Both tile's column. Grey, in the text's
 *  colour, not the green of the levels: it is not a sound and has no level
 *  to set. The screen lets `vel` fall back between notes as a meter does. */
function NotesMeter({ vel }: { vel: number }) {
  return (
    <Meter
      direction="up"
      tone="notes"
      sides={[notesReach(vel)]}
      levels={[vel]}
      className="absolute inset-0"
    />
  )
}

/** The icon in the corner, on the surface's colour. */
function TileIcon({ icon, surface }: { icon?: string; surface: TileSurface }) {
  return (
    <span className={cn("shrink-0 rounded p-0.5", BACKING[surface])}>
      <InstrumentIcon icon={icon} className="size-[clamp(1rem,14cqi,1.75rem)]" />
    </span>
  )
}

/** The size of the figure at the top of the header, the dB or the count. */
// design-ok(px-text): sized from the tile's width (8cqi), so the readout fits at any window size
const READOUT = { fontSize: "clamp(0.6875rem, 8cqi, 1.125rem)" }

/**
 * What both kinds lay out over their fill: the header across the top, with
 * the icon in its corner and, opposite it, `children`, the figures, each a
 * span on the surface's colour, the readout (sized `READOUT`) first; and
 * under it `name`, the name and what stands beside it.
 */
function TileLayout({
  icon,
  surface,
  name,
  children,
}: {
  icon?: string
  surface: TileSurface
  name: ReactNode
  children: ReactNode
}) {
  return (
    <div className="relative grid h-full grid-rows-[auto_minmax(0,1fr)] gap-2 p-[clamp(0.375rem,7cqi,1.25rem)]">
      {/* On the surface's colour, the icon and the figures alike: in dB a
          level that is set well stands near the top, and the fill and its
          line ran through the figure. */}
      <div data-header className="flex items-start justify-between gap-1">
        <TileIcon icon={icon} surface={surface} />
        <div
          className={cn(
            "flex min-w-0 flex-col items-end gap-1 text-right [&>span]:rounded [&>span]:px-1",
            FIGURES[surface]
          )}
        >
          {children}
        </div>
      </div>
      {name}
    </div>
  )
}

function LevelsTile({
  name,
  icon,
  channel,
  stereo,
  peaks,
  shown,
  held,
  clips,
  silent,
  midi,
  surface = "card",
}: LevelsTileProps) {
  const sides = peaks.length ? peaks : [0]
  // The figure is the peak the line holds, not the last poll's: that
  // changed fourteen times a second, and what the eye kept of it was the
  // troughs between the hits.
  const peak = Math.max(...sides, ...held)
  const db = `${peakToDb(peak)} dB`
  // The figure holds the room of "-60.0 dB" whatever it reads, so a louder
  // reading never moves it; where even that has no room it hides, and the
  // tooltip says it.
  const { tile, figure, fits } = useFits(db)
  // The status line keeps its room from the start, so a clip or a silence
  // coming moves nothing in the header.
  const status = clips > 0 ? (clips > 1 ? `clipped ${clips}×` : "clipped") : silent ? "silent" : null
  const tip = [fits ? "" : db, midi?.tip ?? ""].filter(Boolean)

  return (
    <TileBox
      ref={tile}
      surface={surface}
      role="group"
      aria-label={name}
      tip={tip}
      // The port first, so that a clip, which cannot wait, is the edge
      // that shows when both are so.
      edge={clips > 0 ? "clip" : midi && !midi.connected ? "port" : null}
      dim={silent}
      data-clipped={clips > 0 || undefined}
      data-silent={silent || undefined}
      data-not-connected={(midi && !midi.connected) || undefined}
      data-channels={sides.length}
    >
      <div className="absolute inset-0 flex gap-0.5">
        {/* The fill stands where the meter has fallen back to, not at the
            last poll; what it reads is the last poll's peak. */}
        <Meter
          direction="up"
          tone="signal"
          data-levels
          className="flex-1"
          sides={sides.map((side, i) => reach(shown[i] ?? side))}
          levels={sides}
          held={held.map(reach)}
          clipped={sides.map((side) => side > CLIP_THRESHOLD)}
        />
        {midi && (
          <div
            data-midi-column
            data-level={Math.round(midi.vel * 100)}
            className="relative w-[22%] min-w-3.5 shrink-0 border-l"
          >
            <NotesMeter vel={midi.vel} />
            <span
              className="absolute bottom-[clamp(0.375rem,7cqi,1.25rem)] left-1/2 text-xs leading-none font-semibold text-muted-foreground @max-[7rem]:hidden"
              style={{ writingMode: "vertical-rl", transform: "translateX(-50%) rotate(180deg)" }}
            >
              MIDI
            </span>
          </div>
        )}
      </div>

      <TileLayout
        icon={icon}
        surface={surface}
        name={
          // The name runs up the tile from its bottom left corner, as on the
          // spine of a book: a tile is tall and, sixteen to a row, narrow,
          // and "Overheads" across one came out as "Overhea / ds". Written
          // the same way on a wide tile, so there is one way to read them.
          <div className="flex min-h-0 items-end gap-1.5">
            <div
              data-name
              className="max-h-full overflow-hidden leading-none font-semibold text-ellipsis whitespace-nowrap"
              style={{
                writingMode: "vertical-rl",
                transform: "rotate(180deg)",
                // design-ok(px-text): sized from the tile's width (18cqi), so the name fits at any window size
                fontSize: "clamp(0.875rem, 18cqi, 2.25rem)",
              }}
            >
              {name}
            </div>
            <div
              className="tnum max-h-full overflow-hidden text-xs leading-none text-ellipsis whitespace-nowrap text-muted-foreground @max-[7rem]:hidden"
              style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
            >
              {channel === null
                ? "No input"
                : stereo
                  ? `Inputs ${channel}–${channel + 1}`
                  : `Input ${channel}`}
            </div>
          </div>
        }
      >
        <span
          ref={figure}
          data-db
          className={cn(
            "tnum grid justify-items-end",
            peak > CLIP_THRESHOLD ? "text-destructive" : "text-muted-foreground",
            !fits && "invisible"
          )}
          style={READOUT}
        >
          <span aria-hidden className="invisible col-start-1 row-start-1">
            -60.0<span className="@max-[7rem]:hidden"> dB</span>
          </span>
          <span className="col-start-1 row-start-1">
            {peakToDb(peak)}
            <span className="@max-[7rem]:hidden"> dB</span>
          </span>
        </span>
        {/* One line for both, which does not wrap: the count, or that there
            is no port to count from where that fits, so nothing under it
            moves when the port comes and goes. */}
        {midi && (
          <span
            data-notes
            className="flex items-center gap-1 text-xs whitespace-nowrap text-muted-foreground @max-[7rem]:hidden"
          >
            <span className={cn("flex items-center gap-1", !midi.connected && "@min-[9.5rem]:hidden")}>
              <MidiGlyph className="size-3 shrink-0" />
              <span>
                <NoteCount notes={midi.notes} />
              </span>
            </span>
            {!midi.connected && <span className="hidden @min-[9.5rem]:inline">not connected</span>}
          </span>
        )}
        {/* With nothing to say, an unseen space keeps its line: there is no
            word in it that is not so, for a test or a screen reader. */}
        <span
          data-status
          className={cn(
            "text-xs whitespace-nowrap @max-[7rem]:hidden",
            clips > 0 ? "font-semibold text-destructive" : "text-muted-foreground",
            !status && "invisible"
          )}
        >
          {status ?? " "}
        </span>
      </TileLayout>
    </TileBox>
  )
}

/**
 * A track that records notes alone, while it records: a tile in its place in
 * the band, laid out as a levels tile is so that a row of both reads as one.
 * It has the icon, how many notes it has had, and a fill that jumps with each
 * note's velocity. Where a levels tile says "Input 3" it says "MIDI", with
 * the port in its tooltip.
 *
 * It never dims as silent: notes come and go, and a pause is not a fault.
 * What can be wrong is the port, and a port that is not plugged in draws the
 * warn edge, as a waiting input is on the setup screen. Its notes start the
 * moment the port appears.
 */
function NotesTile({ name, icon, port, vel, notes, connected, tip, surface = "card" }: NotesTileProps) {
  const { tile, figure, fits } = useFits(notes)
  // The tooltip: the port's name, and under it what there is no room to say
  // on the tile: its own sentence when it has one (not there, or held), else
  // the count that was hidden.
  const more =
    tip ?? (fits ? undefined : `${notes.toLocaleString("en-US")} ${notes === 1 ? "note" : "notes"}`)
  const lines = [port, more ?? ""].filter(Boolean)

  return (
    <TileBox
      ref={tile}
      surface={surface}
      role="group"
      aria-label={name}
      tip={lines}
      edge={connected ? null : "port"}
      data-midi-tile
      data-level={Math.round(vel * 100)}
      data-not-connected={!connected || undefined}
    >
      <NotesMeter vel={vel} />

      <TileLayout
        icon={icon}
        surface={surface}
        name={
          // The name as a levels tile writes it: up the tile from its bottom
          // left corner, with what stands in for the input beside it.
          <div className="flex min-h-0 items-end gap-1.5">
            <div
              data-name
              className="max-h-full overflow-hidden leading-none font-semibold text-ellipsis whitespace-nowrap"
              style={{
                writingMode: "vertical-rl",
                transform: "rotate(180deg)",
                // design-ok(px-text): sized from the tile's width (18cqi), so the name fits at any window size
                fontSize: "clamp(0.875rem, 18cqi, 2.25rem)",
              }}
            >
              {name}
            </div>
            <div
              className="max-h-full overflow-hidden text-xs leading-none text-ellipsis whitespace-nowrap text-muted-foreground @max-[7rem]:hidden"
              style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
            >
              MIDI
            </div>
          </div>
        }
      >
        <span
          ref={figure}
          data-notes
          className={cn(
            "flex items-center gap-1 whitespace-nowrap text-muted-foreground",
            !fits && "invisible"
          )}
          style={READOUT}
        >
          <MidiGlyph className="size-[0.9em] shrink-0 @max-[7rem]:hidden" />
          <span>
            <NoteCount notes={notes} />
          </span>
        </span>
        {/* Always there, only not seen while the port is: the header is
            the same height when it comes and goes. On one line, and gone
            altogether where the line would not fit: the edge says it
            then. */}
        <span
          data-status
          className={cn(
            "text-xs whitespace-nowrap text-muted-foreground @max-[9.5rem]:hidden",
            connected && "invisible"
          )}
        >
          not connected
        </span>
      </TileLayout>
    </TileBox>
  )
}
