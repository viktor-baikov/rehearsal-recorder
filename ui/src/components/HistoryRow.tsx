import { useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Item } from "@/components/ui/item"
import { FigureLine, Figures, WholeTip, useCut, type FigurePart } from "@/components/ui/whole"
import { cn } from "@/lib/utils"

/** The row's look, given to the Button. Item and its Button are one
 *  element: Item's Slot passes its classes on to the Button, and the
 *  Button's `cn` merges them after its own defaults and before the classes
 *  given here. So these win over both: Item's `sm` padding, gap and
 *  centring, and the Button's. `flex-nowrap` undoes Item's wrapping, which
 *  a column has no use for. */
const ROW =
  "h-auto w-full flex-col flex-nowrap items-stretch gap-1.5 px-3 py-2.5 text-left whitespace-normal"
/** The chosen row: grey, with no frame (F2, F4). */
const CHOSEN = "bg-selected hover:bg-selected dark:bg-selected dark:hover:bg-selected"

/**
 * A row of History's lists, the rehearsals, the songs and the labels: the
 * name and its figures on the first line, what the list says of it under
 * them. The whole row is one button, which Tab reaches and Enter presses.
 *
 * The name keeps its width: it takes a second line only when it is longer
 * than its whole row, and is cut after two, while the figures beside it give
 * way to it first, whole figure by whole figure (B6, as Earlier's rows on
 * the start screen). The row's one tip says what it could not show: the name
 * whole, and the figures once any has gone, since the keys reach the row and
 * not its figures.
 */
export function HistoryRow({
  name,
  nameClassName,
  lead,
  figures,
  current,
  onClick,
  className,
  children,
  ...data
}: {
  name: string
  /** The name's size, weight and colour. */
  nameClassName: string
  /** Before the name on its line: a label's dot. */
  lead?: ReactNode
  figures: FigurePart[]
  current: boolean
  onClick: () => void
  className?: string
  /** The lines under the name. */
  children?: ReactNode
} & { [data: `data-${string}`]: string | number | boolean | undefined }) {
  const [nameRef, cut] = useCut<HTMLSpanElement>()
  const [dropped, setDropped] = useState(false)
  return (
    <WholeTip cut={cut} text={name} figures={dropped ? <FigureLine parts={figures} /> : null}>
      <Item asChild size="sm">
        <Button
          variant="ghost"
          {...data}
          aria-current={current ? "true" : undefined}
          onClick={onClick}
          className={cn(ROW, current && CHOSEN, className)}
        >
          <span className="flex min-w-0 items-baseline gap-2">
            {lead}
            <span
              ref={nameRef}
              data-name
              className={cn("line-clamp-2 min-w-0 flex-[0_1_auto] break-words", nameClassName)}
            >
              {name}
            </span>
            <Figures
              parts={figures}
              tip={false}
              onDropped={setDropped}
              className="tnum text-right text-xs text-muted-foreground"
            />
          </span>
          {children}
        </Button>
      </Item>
    </WholeTip>
  )
}
