import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { fitFigures, joinFigures, joinsOf, type Part } from "@/lib/figures"
import { cn } from "@/lib/utils"

/*
  B6's pieces for a long name: a cut name shows whole on hover and on
  keyboard focus (`useCut` and `WholeTip`; `Whole` is both for a plain text),
  and the figures beside a name give way to it, whole figure by whole figure
  (`Figures`, the arithmetic in lib/figures.ts). Figures that have all given
  way have nothing left to hover, so the name's own tip says them (Q3).
*/

/** Whether an element's text is cut: wider or taller than its own box. The
 *  element must be a block (an inline one has no box to measure). */
// oxlint-disable-next-line react/only-export-components -- the hook measures the name that WholeTip then shows whole, so they are used together
export function useCut<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [cut, setCut] = useState(false)
  const look = useCallback(() => {
    const el = ref.current
    if (el) setCut(el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1)
  }, [])
  useLayoutEffect(() => look())
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const watch = new ResizeObserver(look)
    watch.observe(el)
    return () => watch.disconnect()
  }, [look])
  return [ref, cut] as const
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
 * it then. A focus that comes with a press opens nothing, as in Radix.
 *
 * `figures` is the figure line beside the name when none of it has room to
 * show there (Figures' `onBare`): the tip then says it under the name, cut
 * or not, since there is nothing else to hover for it.
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
  // Focus is inside the child, and did not come with a press.
  const [focused, setFocused] = useState(false)
  const pressed = useRef(false)
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
        onPointerDown={() => {
          pressed.current = true
          setFocused(false)
          document.addEventListener("pointerup", () => (pressed.current = false), { once: true })
        }}
        onClick={() => setFocused(false)}
        onFocus={() => {
          if (!pressed.current) setFocused(true)
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
        {figures ? (
          <>
            <span className="block">{text}</span>
            <span className="tnum block">{figures}</span>
          </>
        ) : (
          text
        )}
      </TooltipContent>
    </Tooltip>
  )
}

/** A text that may be cut, shown whole on hover when it is; `figures` as
 *  WholeTip's. */
export function Whole({
  text,
  figures,
  className,
}: {
  text: string
  figures?: ReactNode
  className?: string
}) {
  const [ref, cut] = useCut<HTMLSpanElement>()
  return (
    <WholeTip cut={cut} text={text} figures={figures}>
      <span ref={ref} data-cut={cut || undefined} className={cn("block", className)}>
        {text}
      </span>
    </WholeTip>
  )
}

/** A figure as Figures takes it: drawn as `node` where it is more than its
 *  words (an icon in it), and read, measured into the tip's words and kept
 *  apart by `text` all the same. */
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
 *
 * Once it has dropped them all there is nothing of it to hover: a name wider
 * than its row leaves it no width at all. `onBare` hears when that starts and
 * stops, so the name beside it can say the line in its own tip (WholeTip's
 * `figures`).
 */
export function Figures({
  parts,
  className,
  onBare,
}: {
  parts: FigurePart[]
  className?: string
  /** Told true while every figure has dropped, false otherwise; a state
   *  setter, or anything that keeps its identity. */
  onBare?: (bare: boolean) => void
}) {
  const box = useRef<HTMLSpanElement>(null)
  const measure = useRef<HTMLSpanElement>(null)
  const every = parts.map(() => true)
  const all = joinFigures(parts, every)
  const [fitted, setFitted] = useState(every)
  // The figures are read through their words, so a caller can build the
  // array anew on every render, drawings and all, without the measuring
  // starting over.
  const key = JSON.stringify(parts.map((p) => [p.text, p.keep, p.join]))
  const fit = useCallback(() => {
    const b = box.current
    const m = measure.current
    if (!b || !m) return
    // Each figure alone, as drawn, then " · " and ", " (the last two children).
    const w = [...m.children].map((c) => c.getBoundingClientRect().width)
    const next = fitFigures(parts, w, w[parts.length], w[parts.length + 1], b.clientWidth)
    setFitted((was) =>
      was.length === next.length && was.every((on, i) => on === next[i]) ? was : next,
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  useLayoutEffect(() => fit())
  useEffect(() => {
    const b = box.current
    if (!b) return
    const watch = new ResizeObserver(fit)
    watch.observe(b)
    return () => watch.disconnect()
  }, [fit])
  // Until the new figures have been fitted, all of them.
  const shown = fitted.length === parts.length ? fitted : every
  const dropped = shown.some((on) => !on)
  const bare = parts.length > 0 && !shown.some(Boolean)
  useEffect(() => {
    onBare?.(bare)
  }, [bare, onBare])
  return (
    <WholeTip cut={dropped} text={<FigureLine parts={parts} />}>
      <span
        ref={box}
        data-figures
        data-dropped={dropped || undefined}
        // min-h-lh: a line tall even when every figure has dropped, so what
        // width the box has left can still be hovered.
        className={cn("relative block min-h-lh min-w-0 flex-[1_1_0%] truncate", className)}
      >
        {/* Read whole, whatever shows: the tip is for the pointer only. */}
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
    </WholeTip>
  )
}
