import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { fitFigures, joinFigures, type Part } from "@/lib/figures"
import { cn } from "@/lib/utils"

/*
  B6's pieces for a long name: a cut name shows whole on hover and on
  keyboard focus (`useCut` and `WholeTip`; `Whole` is both for a plain text),
  and the figures beside a name give way to it, whole figure by whole figure
  (`Figures`, the arithmetic in lib/figures.ts).
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
 */
export function WholeTip({
  cut,
  text,
  children,
}: {
  cut: boolean
  text: ReactNode
  children: ReactElement
}) {
  // Radix's: the pointer, a key, and the closing it does on its own.
  const [open, setOpen] = useState(false)
  // Focus is inside the child, and did not come with a press.
  const [focused, setFocused] = useState(false)
  const pressed = useRef(false)
  return (
    <Tooltip open={cut && (open || focused)} onOpenChange={setOpen}>
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
      <TooltipContent data-whole onEscapeKeyDown={() => setFocused(false)}>
        {text}
      </TooltipContent>
    </Tooltip>
  )
}

/** A text that may be cut, shown whole on hover when it is. */
export function Whole({ text, className }: { text: string; className?: string }) {
  const [ref, cut] = useCut<HTMLSpanElement>()
  return (
    <WholeTip cut={cut} text={text}>
      <span ref={ref} data-cut={cut || undefined} className={cn("block", className)}>
        {text}
      </span>
    </WholeTip>
  )
}

/**
 * A figure line that gives way to the name beside it: it takes the room the
 * name leaves (flex 1 1 0), drops whole figures in the order of `keep` until
 * the rest fits, and shows the whole line on hover when it has dropped any.
 */
export function Figures({ parts, className }: { parts: Part[]; className?: string }) {
  const box = useRef<HTMLSpanElement>(null)
  const measure = useRef<HTMLSpanElement>(null)
  const all = joinFigures(parts, parts.map(() => true))
  const [line, setLine] = useState(all)
  // The figures are read through their key, so a caller can build the array
  // anew on every render without the measuring starting over.
  const key = JSON.stringify(parts)
  const fit = useCallback(() => {
    const b = box.current
    const m = measure.current
    if (!b || !m) return
    // Each figure alone, then " · " and ", " (the last two children).
    const w = [...m.children].map((c) => c.getBoundingClientRect().width)
    const shown = fitFigures(parts, w, w[parts.length], w[parts.length + 1], b.clientWidth)
    const next = joinFigures(parts, shown)
    setLine((was) => (was === next ? was : next))
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
  const dropped = line !== all
  return (
    <WholeTip cut={dropped} text={all}>
      <span
        ref={box}
        data-figures
        data-dropped={dropped || undefined}
        className={cn("relative block min-w-0 flex-[1_1_0%] truncate", className)}
      >
        {/* Read whole, whatever shows: the tip is for the pointer only. */}
        <span className="sr-only">{all}</span>
        <span aria-hidden data-shown>
          {line}
        </span>
        <span ref={measure} aria-hidden className="invisible absolute top-0 left-0 whitespace-pre">
          {parts.map((p, i) => (
            <span key={i}>{p.text}</span>
          ))}
          <span>{" · "}</span>
          <span>{", "}</span>
        </span>
      </span>
    </WholeTip>
  )
}
