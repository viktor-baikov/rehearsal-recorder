import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { FolderOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { FigureLine, WholeTip } from "@/components/ui/whole"
import { api, type Take } from "@/lib/api"
import { eveningOf, lengthLabel, takesLine } from "@/lib/evening"
import { fitFigures, joinFigures } from "@/lib/figures"
import { formatBytes } from "@/lib/format"
import { notify } from "@/lib/notices"
import { useSystem, words } from "@/lib/platform"
import { cn } from "@/lib/utils"

function Fact({ label, value, hidden }: { label: string; value: string; hidden?: boolean }) {
  return (
    <div className={cn("flex-col gap-0.5 whitespace-nowrap", hidden ? "hidden" : "flex")}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-semibold">{value}</dd>
    </div>
  )
}

/**
 * What there is to know about a rehearsal, in the window's header beside
 * its name: how long its takes run, how many and of how many songs, how
 * many are in the cloud, how much of the disk it uses, and a button to its
 * folder. Counted from the takes on screen, so it follows a take kept,
 * deleted or copied at once; only the size on disk comes from Python.
 *
 * The facts take the room the name leaves (B6), and give way to it whole
 * fact by whole fact, least needed first: On disk, then In the cloud, then
 * Takes, and Length last, as it says how long the evening has run. Pointing
 * at them says all four, as one line, once any has given way; a screen
 * reader is read that line whatever shows. The folder button never gives
 * way.
 */
export function EveningFacts({
  takes,
  bytes,
  folder,
}: {
  takes: Take[]
  bytes: number | null
  folder: string
}) {
  const f = eveningOf(takes)
  const { folderButton } = words(useSystem())
  const show = async () => {
    const res = await api().show_rehearsal_folder(folder)
    if (!res.ok) notify({ key: "folder", kind: "error", text: res.error ?? "Could not open the folder" })
  }
  // In the order they stand; `keep` says which goes first (lowest first).
  const facts = [
    { label: "Length", value: lengthLabel(f.seconds), keep: 3 },
    { label: "Takes", value: takesLine(f), keep: 2 },
    { label: "In the cloud", value: `${f.inCloud} of ${f.takes}`, keep: 1 },
    ...(bytes !== null ? [{ label: "On disk", value: formatBytes(bytes), keep: 0 }] : []),
  ]
  const parts = facts.map((x) => ({ text: `${x.label} ${x.value}`, keep: x.keep }))
  const all = joinFigures(parts, parts.map(() => true))

  const box = useRef<HTMLDListElement>(null)
  const measure = useRef<HTMLDivElement>(null)
  const every = parts.map(() => true)
  const [fitted, setFitted] = useState(every)
  // The facts are fitted again when their words change, not when the array
  // that holds them is built anew.
  const key = parts.map((p) => p.text).join("|")
  const fit = useCallback(() => {
    const room = box.current
    const ruler = measure.current
    if (!room || !ruler) return
    // Each fact alone, as drawn, and the gap between two, which is in rem.
    const widths = [...ruler.children].map((c) => c.getBoundingClientRect().width)
    const gap = parseFloat(getComputedStyle(ruler).columnGap) || 0
    // The room is what the padding leaves.
    const own = getComputedStyle(room)
    const inside = room.clientWidth - parseFloat(own.paddingLeft) - parseFloat(own.paddingRight)
    const next = fitFigures(parts, widths, gap, 0, inside)
    setFitted((was) =>
      was.length === next.length && was.every((on, i) => on === next[i]) ? was : next,
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  useLayoutEffect(() => fit())
  useEffect(() => {
    const room = box.current
    const ruler = measure.current
    if (!room || !ruler) return
    const watch = new ResizeObserver(fit)
    watch.observe(room)
    watch.observe(ruler)
    return () => watch.disconnect()
  }, [fit])
  // Until the new facts have been fitted, all of them.
  const shown = fitted.length === parts.length ? fitted : every
  const dropped = shown.some((on) => !on)

  return (
    <div className="relative flex flex-1 items-center justify-end">
      <div role="group" aria-label="About this rehearsal" className="flex flex-1 items-center">
        {/* What is pointed at to see them all. It keeps 24 px of padding, the
            gap between the facts and the button, and the group's height,
            however few facts show, so that there is still something to
            point at when none does. */}
        <WholeTip cut={dropped} text={<FigureLine parts={parts} />}>
          <dl
            ref={box}
            // The screen reader has the line below instead.
            aria-hidden
            // Contained, so that the facts ask for no room of their own: the
            // name takes what it needs first and they have what is left.
            className="flex min-w-0 flex-1 items-center justify-end gap-6 self-stretch overflow-hidden pr-6 [contain:inline-size]"
          >
            {facts.map((x, i) => (
              <Fact key={x.label} label={x.label} value={x.value} hidden={!shown[i]} />
            ))}
          </dl>
        </WholeTip>
        <span className="sr-only">{all}</span>
        {/* The path is not shown (Alex, 2026-10-06): the button is enough, and
            it says where it goes when the mouse rests on it. */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="row" onClick={() => void show()}>
              <FolderOpen className="text-muted-foreground" />
              {folderButton}
            </Button>
          </TooltipTrigger>
          <TooltipContent className="break-words">{folder}</TooltipContent>
        </Tooltip>
      </div>
      {/* The same facts, out of sight and outside the group, to measure. */}
      <div
        aria-hidden
        className="pointer-events-none invisible absolute top-0 right-0 h-0 overflow-hidden"
      >
        <div ref={measure} className="flex w-max gap-6">
          {facts.map((x) => (
            <Fact key={x.label} label={x.label} value={x.value} />
          ))}
        </div>
      </div>
    </div>
  )
}
