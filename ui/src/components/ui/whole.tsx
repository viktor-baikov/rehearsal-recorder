import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from "react"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { fitFigures, joinFigures, joinsOf, type Part } from "@/lib/figures"
import { cn } from "@/lib/utils"

/*
  B6's pieces for a long name: a cut name shows whole on hover and, when it
  is a button or a link, on keyboard focus (`useCut` and `WholeTip`; `Whole`
  puts both round a plain text, which only a pointer reaches unless it has
  `reach`: then it is a Tab stop while it is cut), and the
  figures beside a name give way to it, whole figure by whole figure
  (`Figures`, the arithmetic in lib/figures.ts). The figures' own tip is for
  the pointer; the name's tip, which a keyboard reaches too, says the line
  whole as well once any of it has given way (Q3).
*/

/** Whether an element's text is cut: wider or taller than its own box. The
 *  element must be a block (an inline one has no box to measure).
 *
 *  The ref is a function, so whichever element has it is the one watched:
 *  one drawn anew in another place (a tab's name, once the tab has shut) is
 *  watched in place of the one before, whether or not what holds the hook is
 *  drawn again. */
// oxlint-disable-next-line react/only-export-components -- the hook measures the name that WholeTip then shows whole, so they are used together
export function useCut<T extends HTMLElement>() {
  const el = useRef<T | null>(null)
  const [cut, setCut] = useState(false)
  const look = useCallback(() => {
    const at = el.current
    if (at) setCut(at.scrollWidth > at.clientWidth + 1 || at.scrollHeight > at.clientHeight + 1)
  }, [])
  const ref = useCallback(
    (node: T | null) => {
      el.current = node
      if (!node) return
      const watch = new ResizeObserver(look)
      watch.observe(node)
      return () => {
        watch.disconnect()
        if (el.current === node) el.current = null
      }
    },
    [look],
  )
  useLayoutEffect(() => look())
  return [ref, cut] as const
}

/**
 * Which of a line's parts have room, whole part by whole part, as Figures
 * and the header's facts (EveningFacts) both fit theirs. `measure` reads the
 * room and the parts as drawn and says which show (lib/figures.ts), or null
 * while what it reads is not there. It is asked after every render and
 * whenever one of `watch` changes size. It is taken anew only when `key`
 * does: the parts' words, so a caller can build its parts anew on every
 * render without the fitting starting over. Until the parts have been
 * fitted, all of them show.
 */
// oxlint-disable-next-line react/only-export-components -- the hook is what Figures fits its line with, and the header's facts fit theirs the same way
export function useFitted(
  count: number,
  key: string,
  measure: () => boolean[] | null,
  watch: RefObject<Element | null>[],
): boolean[] {
  const [fitted, setFitted] = useState(() => Array<boolean>(count).fill(true))
  const fit = useCallback(() => {
    const next = measure()
    if (!next) return
    setFitted((was) =>
      was.length === next.length && was.every((on, i) => on === next[i]) ? was : next,
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  useLayoutEffect(() => fit())
  useEffect(() => {
    const els = watch.map((w) => w.current)
    if (els.some((e) => !e)) return
    const watcher = new ResizeObserver(fit)
    for (const e of els) watcher.observe(e!)
    return () => watcher.disconnect()
    // The refs keep their identity; a new array of them each render is no
    // reason to watch anew.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fit])
  // Until the new parts have been fitted, all of them.
  return fitted.length === count ? fitted : Array<boolean>(count).fill(true)
}

/**
 * Its child, with the whole text beside it on hover and on keyboard focus
 * while `cut`. The child is what the pointer and the keys reach, so it is a
 * button, a link or something with a tabindex.
 *
 * Focus on a cut name may scroll the panel it is in (a Tab to a row below
 * the fold), and Radix closes a tip when anything round its trigger scrolls.
 * So the tip stays open while focus is inside, from the focus and blur as
 * well as from Radix: only Esc, a press or a click, or focus leaving, closes
 * it then. A focus the mouse left opens nothing (tooltip.tsx): one that
 * comes with a press, or that a menu shut with a click hands back.
 *
 * `figures` is the figure line beside the name when some of it has given
 * way (Figures' `onDropped`): the tip then says it whole under the name, cut
 * or not. The figures' own tip is on a box the keys never reach, and one
 * with nothing left in it has no width to hover.
 *
 * The tip is for the eyes. What it says is in the page already, the name in
 * full and the figures in their read-out line, so a screen reader is not
 * told it a second time as the child's description.
 */
export function WholeTip({
  cut,
  text,
  figures,
  children,
}: {
  cut: boolean
  text: ReactNode
  figures?: ReactNode
  children: ReactElement
}) {
  // The tip has something to show: the whole name, or the figures that had
  // no room beside it.
  const says = cut || !!figures
  // Radix's: the pointer, a key, and the closing it does on its own.
  const [open, setOpen] = useState(false)
  // Focus is inside the child, and came from the keys: one the mouse left,
  // with a press or as a menu shut with a click handed it back, comes with
  // its default prevented (the shared TooltipTrigger).
  const [focused, setFocused] = useState(false)
  // Radix says "open" or "closed" only when that differs from the `open` it was
  // given, and while the name fits it is given false. So a hover over a name
  // that fits would be remembered with its leave never heard, and the tip
  // would open on its own when the name was next cut; and a tip open on a
  // cut name that then fits would stay "open" past the leave. Radix's flag is
  // kept only while the tip has something to show, and let go when it stops.
  const [said, setSaid] = useState(says)
  if (said !== says) {
    setSaid(says)
    if (!says) setOpen(false)
  }
  return (
    <Tooltip open={says && (open || focused)} onOpenChange={(next) => setOpen(says && next)}>
      <TooltipTrigger
        asChild
        onPointerDown={() => setFocused(false)}
        onClick={() => setFocused(false)}
        onFocus={(e) => {
          if (!e.defaultPrevented) setFocused(true)
        }}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false)
        }}
      >
        {children}
      </TooltipTrigger>
      <TooltipContent
        data-whole
        onEscapeKeyDown={() => setFocused(false)}
        // A name drawn with a muted part (a go's number) is all one colour
        // in the tip: muted grey on the tip's ground does not read.
        className="[&_.text-muted-foreground]:text-inherit"
      >
        {/* Radix points the child's aria-describedby at this content; what
            is aria-hidden in it is left out of that description. */}
        <span aria-hidden className="block">
          {figures ? (
            <>
              <span className="block">{text}</span>
              <span className="tnum block">{figures}</span>
            </>
          ) : (
            text
          )}
        </span>
      </TooltipContent>
    </Tooltip>
  )
}

/**
 * A text that may be cut, shown whole on hover when it is.
 *
 * Plain, only a pointer reaches it. With `reach` the keys do too: while the
 * text is cut it is a Tab stop, with the shared focus ring, and its tip opens
 * on focus; once it fits, it takes no place in the Tab order and no ring. That
 * is for a name nothing else on the page says whole, such as a lane's plate.
 * Anything else given goes on the text's box (a `data-` mark for a test).
 */
export function Whole({
  text,
  className,
  reach = false,
  ...props
}: Omit<ComponentProps<"span">, "children" | "ref"> & {
  text: string
  /** A Tab stop while the text is cut. */
  reach?: boolean
}) {
  const [ref, cut] = useCut<HTMLSpanElement>()
  return (
    <WholeTip cut={cut} text={text}>
      <span
        {...props}
        ref={ref}
        data-cut={cut || undefined}
        tabIndex={reach && cut ? 0 : undefined}
        className={cn(
          "block",
          reach && "rounded-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
          className,
        )}
      >
        {text}
      </span>
    </WholeTip>
  )
}

/** A figure as Figures takes it: drawn as `node` where it is more than its
 *  words (an icon in it), and measured as drawn, but read out as `text`.
 *  Figures goes by `text` too to know when its line has changed. */
export type FigurePart = Part & { node?: ReactNode }

/** The figures, drawn and joined as the line beside a name draws them, the
 *  ones `shown` (all of them without it): for a tip that says them. */
export function FigureLine({ parts, shown }: { parts: FigurePart[]; shown?: boolean[] }) {
  const joins = joinsOf(parts, shown ?? parts.map(() => true))
  return parts.map((p, i) =>
    joins[i] === null ? null : (
      <Fragment key={i}>
        {joins[i]}
        {p.node ?? p.text}
      </Fragment>
    ),
  )
}

/**
 * A figure line that gives way to the name beside it: it takes the room the
 * name leaves (flex 1 1 0), drops whole figures in the order of `keep` until
 * the rest fits, and shows the whole line on hover when it has dropped some.
 * A screen reader reads the whole line, whatever shows.
 *
 * That tip is for the pointer only, and once every figure has dropped there
 * is no width left to hover. `onDropped` hears when figures start and stop
 * dropping, so the name beside it, which a keyboard reaches, can say the line
 * in its own tip (WholeTip's `figures`). Where that name's tip is the whole
 * row's, the line needs no tip of its own: `tip={false}`.
 */
export function Figures({
  parts,
  id,
  className,
  onDropped,
  tip = true,
}: {
  parts: FigurePart[]
  /** On the line's box, for a control that is described by the line: it
   *  reads as the whole line. */
  id?: string
  className?: string
  /** Told true while any figure has dropped, false otherwise; a state
   *  setter, or anything that keeps its identity. */
  onDropped?: (dropped: boolean) => void
  /** Its own tip on hover, with the whole line, when it has dropped some. */
  tip?: boolean
}) {
  const box = useRef<HTMLSpanElement>(null)
  const measure = useRef<HTMLSpanElement>(null)
  const all = joinFigures(parts, parts.map(() => true))
  // The figures are read through their words, so a caller can build the
  // array anew on every render, drawings and all, without the measuring
  // starting over.
  const key = JSON.stringify(parts.map((p) => [p.text, p.keep, p.join]))
  const shown = useFitted(
    parts.length,
    key,
    () => {
      const b = box.current
      const m = measure.current
      if (!b || !m) return null
      // Each figure alone, as drawn, then " · " and ", " (the last two children).
      const w = [...m.children].map((c) => c.getBoundingClientRect().width)
      return fitFigures(parts, w, w[parts.length], w[parts.length + 1], b.clientWidth)
    },
    [box],
  )
  const dropped = shown.some((on) => !on)
  useEffect(() => {
    onDropped?.(dropped)
  }, [dropped, onDropped])
  const line = (
    <span
      ref={box}
      id={id}
      data-figures
      data-dropped={dropped || undefined}
      // min-h-lh: a line tall even when every figure has dropped, so what
      // width the box has left can still be hovered.
      className={cn("relative block min-h-lh min-w-0 flex-[1_1_0%] truncate", className)}
    >
      {/* Read whole, whatever shows. */}
      <span className="sr-only">{all}</span>
      <span aria-hidden data-shown>
        <FigureLine parts={parts} shown={shown} />
      </span>
      <span ref={measure} aria-hidden className="invisible absolute top-0 left-0 whitespace-pre">
        {parts.map((p, i) => (
          <span key={i}>{p.node ?? p.text}</span>
        ))}
        <span>{" · "}</span>
        <span>{", "}</span>
      </span>
    </span>
  )
  if (!tip) return line
  return (
    <WholeTip cut={dropped} text={<FigureLine parts={parts} />}>
      {line}
    </WholeTip>
  )
}
