import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"

/*
  A recording tile's name, up the tile from its bottom left corner as on the
  spine of a book, with what stands for its input beside it ("Input 3",
  "MIDI"). It takes up to two lines at 2.25rem; a name still too long gets
  smaller, down to 1.5rem, and past that it is cut («В две строки и мельче»).
  Short names keep 2.25rem. A cut name is whole in the tile's tooltip. Where
  a name's second line needs the width, the input line beside it goes first,
  and the tooltip says it then.

  The size, the lines and the cut are fitted from the room the name has,
  measured on an unseen copy, and fitted again only when that room changes
  size: the window or the scale. Nothing that comes during a take changes the
  room (a tile's header keeps the room of its status line from the start), so
  a clip, a silence, a port that goes or the clock passing 10:00 never changes
  a name's size or where it is cut.
*/

/** A name's size, where it fits whole. */
const NAME_REM = 2.25
/** The smallest a name gets before it is cut. */
const NAME_FLOOR_REM = 1.5

type Fit = {
  /** What is drawn: the name, or for two lines cut, its start and "…". */
  text: string
  px: number
  lines: 1 | 2
  cut: boolean
  /** The input line keeps its place beside the name. */
  side: boolean
}

/** Two lines get a little more than the font's height each, so one line's
 *  descenders clear the next line's capitals; one line is as tall as the
 *  font. */
const LEAD_TWO = 1.1

export function TileName({
  name,
  side,
  sideClassName,
  onFit,
}: {
  name: string
  /** What stands beside the name for its input: "Input 3", "MIDI". */
  side: ReactNode
  sideClassName?: string
  /** Told whether the name is cut, and whether the input line has given way
   *  to it, whenever either changes: for the tile's tooltip. */
  onFit?: (fit: { cut: boolean; sideGone: boolean }) => void
}) {
  const row = useRef<HTMLDivElement>(null)
  const probe = useRef<HTMLSpanElement>(null)
  const sideBox = useRef<HTMLDivElement>(null)
  const [fit, setFit] = useState<Fit>({ text: name, px: 0, lines: 1, cut: false, side: true })

  const measure = useCallback(() => {
    const box = row.current
    const p = probe.current
    const s = sideBox.current
    if (!box || !p || !s) return
    // Unrounded: a name a fraction of a pixel longer than its room gets the
    // browser's ellipsis.
    const room = box.getBoundingClientRect().height
    const wide = box.clientWidth
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize)
    // The input line takes its own line's width and the gap, where the tile
    // is wide enough to show it at all (over 7rem).
    const sideShows = getComputedStyle(s).display !== "none"
    const sideNeeds = sideShows
      ? parseFloat(getComputedStyle(s.firstElementChild ?? s).fontSize) +
        parseFloat(getComputedStyle(box).columnGap || "0")
      : 0
    const top = NAME_REM * rem
    const floor = NAME_FLOOR_REM * rem
    p.style.height = `${room}px`

    // The copy laid out at a size on one line or on as many as it takes:
    // how wide its lines are together, how many there are, and whether a
    // line runs past the room (the words' own box, unrounded, against it).
    const words = document.createElement("span")
    const lay = (text: string, px: number, wrap: boolean) => {
      p.style.fontSize = `${px}px`
      p.style.lineHeight = wrap ? String(LEAD_TWO) : "1"
      p.style.whiteSpace = wrap ? "normal" : "nowrap"
      words.textContent = text
      if (words.parentNode !== p) p.replaceChildren(words)
      const across = p.getBoundingClientRect().width
      return {
        across,
        lines: Math.round(across / (px * (wrap ? LEAD_TWO : 1))),
        over: words.getBoundingClientRect().height > room + 0.01,
      }
    }
    // Whether the name is whole at a size, in a width: on one line, or on
    // two.
    const whole = (px: number, width: number): 1 | 2 | 0 => {
      const one = lay(name, px, false)
      if (!one.over && one.across <= width + 0.5) return 1
      const both = lay(name, px, true)
      return !both.over && both.lines <= 2 && both.across <= width + 0.5 ? 2 : 0
    }
    // The name at a size, whole if it can be, the input line giving way
    // first where the second line needs its width.
    const at = (px: number): Fit | null => {
      const withSide = whole(px, wide - sideNeeds)
      if (withSide) return { text: name, px, lines: withSide, cut: false, side: true }
      if (!sideShows) return null
      const alone = whole(px, wide)
      return alone ? { text: name, px, lines: alone, cut: false, side: false } : null
    }
    // Cut at a size: on two lines where two fit across (the input line
    // giving way if they need it), as much of the name as they hold and "…",
    // the second line cut inside a word as the browser's ellipsis cuts one;
    // else on one line, with the ellipsis the browser draws.
    const cutAt = (px: number): Fit => {
      const twoAcross = px * LEAD_TWO * 2
      if (twoAcross <= wide + 0.5) {
        const keep = twoAcross <= wide - sideNeeds + 0.5
        let lo = 0
        let hi = name.length
        while (lo < hi) {
          const mid = Math.ceil((lo + hi) / 2)
          const r = lay(`${name.slice(0, mid).trimEnd()}…`, px, true)
          if (!r.over && r.lines <= 2) lo = mid
          else hi = mid - 1
        }
        const text = `${name.slice(0, lo).trimEnd()}…`
        // A first word too long for the room leaves one line all the same:
        // drawn then as one line is, with the browser's ellipsis.
        if (lay(text, px, true).lines >= 2) return { text, px, lines: 2, cut: true, side: keep }
      }
      return { text: name, px, lines: 1, cut: true, side: true }
    }

    // Whole at the top size, else at the largest size it is whole at, to a
    // tenth of a pixel, down to the floor; else cut at the floor.
    const next =
      at(top) ??
      (() => {
        if (!at(floor)) return cutAt(floor)
        let lo = floor
        let hi = top
        while (hi - lo > 0.1) {
          const mid = (lo + hi) / 2
          if (at(mid)) lo = mid
          else hi = mid
        }
        return at(Math.floor(lo * 10) / 10) ?? cutAt(floor)
      })()
    // The copy holds no words between fits: what it last tried is nothing
    // the tile says.
    p.replaceChildren()
    setFit((was) =>
      was.text === next.text &&
      was.px === next.px &&
      was.lines === next.lines &&
      was.cut === next.cut &&
      was.side === next.side
        ? was
        : next
    )
  }, [name])

  useLayoutEffect(measure, [measure])
  useEffect(() => {
    const box = row.current
    if (!box) return
    const watch = new ResizeObserver(measure)
    watch.observe(box)
    return () => watch.disconnect()
  }, [measure])
  useEffect(() => {
    onFit?.({ cut: fit.cut, sideGone: !fit.side })
  }, [fit.cut, fit.side, onFit])

  return (
    // No wider than the tile gives it (min-w-0): grown to what it holds, the
    // room measured would be the name's own, and a fit too wide would keep
    // itself.
    <div ref={row} className="relative flex min-h-0 min-w-0 items-end gap-1.5">
      <span
        ref={probe}
        aria-hidden
        className="pointer-events-none invisible absolute top-0 left-0 overflow-hidden font-semibold"
        style={{ writingMode: "vertical-rl" }}
      />
      <div
        data-name
        data-name-px={fit.px ? fit.px.toFixed(1) : undefined}
        data-lines={fit.lines}
        data-cut={fit.cut || undefined}
        className={cn(
          "max-h-full overflow-hidden font-semibold",
          fit.lines === 1 && "text-ellipsis whitespace-nowrap"
        )}
        style={{
          writingMode: "vertical-rl",
          transform: "rotate(180deg)",
          // design-ok(px-text): fitted to its room, from 2.25rem down to 1.5rem
          fontSize: fit.px ? `${fit.px}px` : `${NAME_REM}rem`,
          lineHeight: fit.lines === 2 ? LEAD_TWO : 1,
        }}
      >
        {fit.text}
      </div>
      {/* Shown where the tile is over 7rem wide, unless the name's second
          line has taken its width. */}
      <div ref={sideBox} className="flex h-full min-h-0 items-end @max-[7rem]:hidden">
        <div
          data-side-line
          className={cn(
            "max-h-full overflow-hidden text-xs leading-none text-ellipsis whitespace-nowrap text-muted-foreground",
            !fit.side && "hidden",
            sideClassName
          )}
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          {side}
        </div>
      </div>
    </div>
  )
}
