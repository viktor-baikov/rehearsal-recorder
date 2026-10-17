import { useCallback, useLayoutEffect, useRef, useState } from "react"
import { WholeTip } from "@/components/ui/whole"
import type { Take } from "@/lib/api"
import { cn } from "@/lib/utils"

/**
 * A title on up to two lines, centred, the go right after its last word. One
 * longer than two lines is cut at a word, with the go kept after the "…", and
 * is whole in the shared tooltip on hover and whole to a screen reader. It is
 * fitted on an unseen copy from the room it has, so it is fitted again only
 * when that room changes size (the window, the scale, the size it is drawn
 * at), never while a take records.
 *
 * Every line is 1.1 tall, so a second line's capitals clear the first's
 * tails. One line has that leading too: then how tall the title is depends
 * only on the lines drawn, never on what it was last fitted to, and the
 * screen round it, which is fitted to it in turn, comes to rest (Recording).
 */
function TwoLines({ title, go }: { title: string; go: number | null | undefined }) {
  const probe = useRef<HTMLSpanElement>(null)
  const box = useRef<HTMLSpanElement>(null)
  // A no-break space: the go never starts a line of its own.
  const suffix = go != null ? `\u00a0${go}` : ""
  const [fit, setFit] = useState({ text: title, cut: false, lines: 1 })
  const measure = useCallback(() => {
    const el = probe.current
    if (!el) return
    const line = parseFloat(getComputedStyle(el).fontSize) * 1.1
    // The same markup as the title drawn, the go in its own figures: a
    // tabular 2 is wider than a plain one, and a line that only just fits in
    // plain text does not with it.
    const lines = (t: string) => {
      el.textContent = t
      if (suffix) {
        const number = document.createElement("span")
        number.className = "tnum"
        number.textContent = suffix
        el.appendChild(number)
      }
      return Math.round(el.getBoundingClientRect().height / line)
    }
    let next = { text: title, cut: false, lines: lines(title) }
    if (next.lines > 2) {
      let lo = 0
      let hi = title.length
      while (lo < hi) {
        const mid = Math.ceil((lo + hi) / 2)
        if (lines(`${title.slice(0, mid).trimEnd()}…`) <= 2) lo = mid
        else hi = mid - 1
      }
      // At the end of a word, where one ends a little before the room does,
      // as a person would cut it.
      const space = title.lastIndexOf(" ", lo)
      const at = space > 0 && lo - space <= 12 ? space : lo
      next = { text: `${title.slice(0, at).trimEnd()}…`, cut: true, lines: 2 }
    }
    // The copy holds no words between fits: the heading's are the title's.
    el.textContent = ""
    setFit((was) =>
      was.text === next.text && was.cut === next.cut && was.lines === next.lines ? was : next
    )
  }, [title, suffix])
  useLayoutEffect(() => {
    measure()
    const el = box.current
    if (!el) return
    const watch = new ResizeObserver(measure)
    watch.observe(el)
    return () => watch.disconnect()
  }, [measure])
  return (
    <span ref={box} className="relative flex w-full min-w-0 justify-center">
      <span
        ref={probe}
        aria-hidden
        className="invisible absolute inset-x-0 top-0 text-center leading-[1.1] break-words"
      />
      {fit.cut && (
        <span className="sr-only">
          {title}
          {suffix}
        </span>
      )}
      <WholeTip cut={fit.cut} text={title}>
        <span
          data-go-title
          data-lines={fit.lines}
          data-cut={fit.cut || undefined}
          aria-hidden={fit.cut || undefined}
          className="line-clamp-2 min-w-0 text-center leading-[1.1] break-words"
        >
          {fit.text}
          {suffix && <span data-go className="tnum text-muted-foreground">{suffix}</span>}
        </span>
      </WholeTip>
    </span>
  )
}

/**
 * A song's title with a go beside it, in the muted colour the song pills
 * have always given the number: "Polyn 3". The go is a number of its own,
 * never typed (songs in the store, D2–D3), so it is drawn apart from the
 * title rather than as part of it.
 *
 * With `cut`, the title alone is cut short when the room runs out and the
 * go stays whole: it is what tells goes at a song apart. The wrapper is a
 * flex box that takes the room it is given, so give it a width to cut at.
 * With `lines={2}` as well, the title wraps to a second line before it is
 * cut (TwoLines).
 */
export function GoTitle({
  title,
  go,
  cut = false,
  lines = 1,
}: {
  title: string
  go: number | null | undefined
  cut?: boolean
  /** With `cut`, how many lines the title may take before it is cut. */
  lines?: 1 | 2
}) {
  const number =
    go != null ? (
      <span data-go className={cn("tnum text-muted-foreground", cut && "shrink-0 whitespace-pre")}>
        {" "}
        {go}
      </span>
    ) : null
  if (!cut)
    return (
      <>
        {title}
        {number}
      </>
    )
  if (lines === 2) return <TwoLines title={title} go={go} />
  return (
    <span className="flex max-w-full min-w-0">
      <span data-go-title className="truncate">{title}</span>
      {number}
    </span>
  )
}

/** A take as it is shown: its song and go, or "Take 3" for a take nobody
 *  named. Plain text — a dialog's title, a label — uses take.name. With
 *  `cut`, see GoTitle; a name with no song is cut as a whole. */
export function TakeTitle({
  take,
  cut = false,
}: {
  take: Pick<Take, "name" | "song" | "go">
  cut?: boolean
}) {
  if (take.song) return <GoTitle title={take.song} go={take.go} cut={cut} />
  return cut ? <span className="block truncate">{take.name}</span> : <>{take.name}</>
}
