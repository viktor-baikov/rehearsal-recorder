import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { useCut, WholeTip } from "@/components/ui/whole"
import { cn } from "@/lib/utils"

/**
 * A song's title where a rehearsal is gone over — its overview, Last time —
 * that opens the song's page in History when there is somewhere to open it;
 * null is the takes nobody named, which have a page too. Without `onOpen` it
 * is the title and nothing more.
 *
 * It is the one link look (C8): bare words with a thin underline, in the
 * colour, size and weight of the heading or row it sits in. The title is a
 * block inside it, so it can wrap (`textClassName`, such as line-clamp-2)
 * and be cut past that: a cut title shows whole on hover and on keyboard
 * focus (B6), and its tip says the row's figures as well when none of them
 * has room beside it (`figures`, see Figures' onBare).
 */
export function SongName({
  title,
  onOpen,
  className,
  textClassName,
  figures,
}: {
  title: string | null
  onOpen?: (title: string | null) => void
  className?: string
  textClassName?: string
  figures?: ReactNode
}) {
  const text = title ?? "Not named"
  const [ref, cut] = useCut<HTMLSpanElement>()
  const inner = (
    <span ref={ref} data-name data-cut={cut || undefined} className={cn("block", textClassName)}>
      {text}
    </span>
  )
  if (!onOpen)
    return (
      <WholeTip cut={cut} text={text} figures={figures}>
        <span className={cn("block min-w-0", className)}>{inner}</span>
      </WholeTip>
    )
  return (
    <WholeTip cut={cut} text={text} figures={figures}>
      <Button
        variant="link"
        aria-label={title === null ? "Open Not named" : `Open the song ${title}`}
        onClick={() => onOpen(title)}
        // Words in a line or a heading, not a control of its own: no height
        // or padding, and the colour, size and weight round it.
        className={cn(
          "block h-auto min-w-0 shrink rounded-sm p-0 text-left text-inherit text-[length:inherit] font-[number:inherit] whitespace-normal",
          className
        )}
      >
        {inner}
      </Button>
    </WholeTip>
  )
}
