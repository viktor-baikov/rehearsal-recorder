import * as React from "react"
import { CircleAlert, LoaderCircle, Pause, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { playLabel, SPINNER_AFTER_MS, type PlayLook } from "@/lib/playLook"
import { cn } from "@/lib/utils"

/*
  The one small player (C2): a round ▶ for a take in a list or on a page. It
  replaces the four hand-made ones (28, 32, 32 and 52 px) and is built on
  Button, so its focus ring, its hover colour and its disabled look are the
  shared ones; only the shape, the border and the icon are its own.

  `look` says everything (lib/playLook.ts works it out from what the screen
  knows): which icon, which fill, what is read out.
    idle      a thin border, a fill under the pointer
    loading   the same, and from the second second a spinner in the ▶'s place
    playing   the accent, with Pause
    paused    the accent, with ▶ (the take is open, nothing sounds)
    failed    an alert in the danger colour; pressing tries again
    missing   a ▶ that cannot be pressed: the take is not on disk

  `row` is 32 px with a 14 px icon, for lists; `head` is 48 px with a 20 px
  icon, for the song page. The round shape is a round thing's, so
  `rounded-full`, not the control radius.
*/
const SIZES = {
  row: { box: "size-8", icon: "size-3.5" },
  head: { box: "size-12", icon: "size-5" },
} as const

// Idle and its kin are a ghost Button with a frame; the accent looks are the
// default one. The dark theme's half-strength hover is put back to full here:
// the frame is thin, so the fill has to show.
const FRAME = "border-border dark:hover:bg-accent"
const LOOKS: Record<PlayLook, { variant: "ghost" | "default"; className: string }> = {
  idle: { variant: "ghost", className: FRAME },
  loading: { variant: "ghost", className: FRAME },
  playing: { variant: "default", className: "border-primary" },
  paused: { variant: "default", className: "border-primary" },
  failed: { variant: "ghost", className: cn(FRAME, "text-destructive hover:text-destructive") },
  missing: { variant: "ghost", className: FRAME },
}

/** True once `on` has been true for `ms` and for as long as it stays so; turns
 *  false, and starts counting afresh, whenever `on` does. */
function useAfter(on: boolean, ms: number): boolean {
  const [late, setLate] = React.useState(false)
  React.useEffect(() => {
    if (!on) return
    const timer = setTimeout(() => setLate(true), ms)
    return () => {
      clearTimeout(timer)
      setLate(false)
    }
  }, [on, ms])
  return on && late
}

function PlayButton({
  look,
  size = "row",
  name,
  onClick,
  className,
  ...button
}: Omit<React.ComponentProps<"button">, "children" | "aria-label"> & {
  look: PlayLook
  size?: keyof typeof SIZES
  /** The take's name; it goes into the label a screen reader reads. */
  name: string
}) {
  const { box, icon } = SIZES[size]
  const { variant, className: looks } = LOOKS[look]
  const spinning = useAfter(look === "loading", SPINNER_AFTER_MS)

  return (
    <Button
      type="button"
      {...button}
      variant={variant}
      size="icon-row"
      data-look={look}
      aria-label={playLabel(look, name)}
      aria-busy={look === "loading" || undefined}
      disabled={look === "missing" || button.disabled}
      onClick={onClick}
      className={cn("rounded-full", box, looks, className)}
    >
      {look === "failed" ? (
        <CircleAlert className={icon} />
      ) : spinning ? (
        // The spinner stands still where motion is off (F11): under Reduce
        // motion, and while a take is recorded. Still, it is an arc, which
        // reads as "working" without moving.
        <LoaderCircle
          className={cn(icon, "motion-safe:animate-spin [html[data-recording]_&]:animate-none")}
        />
      ) : look === "playing" ? (
        <Pause className={cn(icon, "fill-current")} />
      ) : (
        <Play className={cn(icon, "fill-current")} />
      )}
    </Button>
  )
}

export { PlayButton }
