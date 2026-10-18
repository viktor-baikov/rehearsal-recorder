import { useEffect, useRef, type ReactNode } from "react"
import { ChevronLeft } from "lucide-react"
import { ActivityButton } from "@/components/ActivityButton"
import { ListeningVolume } from "@/components/ListeningVolume"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { useKeysOn } from "@/lib/keys"
import { cn } from "@/lib/utils"

/**
 * One frame for every screen: a header (back + title + action), a scrollable
 * middle and a pinned area for the main action at the bottom. Each screen
 * used to draw this its own way, which is where the "assembled from
 * different pieces" feeling came from.
 */
export function Shell({
  title,
  titleFits = false,
  titleLeast,
  subtitle,
  onBack,
  backKey = false,
  headerAction,
  facts,
  factsGone = false,
  footer,
  aside,
  children,
  className,
  activity = true,
  playback = false,
  air = false,
}: {
  title?: ReactNode
  /** The title fits itself to its lines and cuts itself (Review's take,
   *  components/TakeTitle), so it is never cut here. */
  titleFits?: boolean
  /** How tall the subtitle and title are at least, as a class: Review's
   *  hold the room of the columns beside them, so a rename that brings them
   *  or takes them away moves nothing under the header (B4). */
  titleLeast?: string
  subtitle?: ReactNode
  onBack?: () => void
  /** Escape goes back right now, so the back button can say so, while
   *  Space and Esc are on in Settings › Keys. */
  backKey?: boolean
  headerAction?: ReactNode
  /** What there is to know about what is on screen, right of its title:
   *  the rehearsal's figures (components/EveningFacts), or Review's columns
   *  (components/TakeSummary). */
  facts?: ReactNode
  /** The facts have all given way to the title just now, so they show
   *  nothing, and the line after them is unseen too. */
  factsGone?: boolean
  footer?: ReactNode
  /** A panel right of the scrollable middle, from the header down to the
   *  footer, scrolling on its own: the rehearsal screen's Next take. */
  aside?: ReactNode
  children: ReactNode
  className?: string
  /** Show long work (components/ActivityButton) on a screen with no header,
   *  in its top corner. Off on Recording: copies wait while a take records,
   *  and the take's own saving is said under its Stop button. */
  activity?: boolean
  /** A take can be played on this screen, so the header has the speaker
   *  that sets how loud (components/ListeningVolume). */
  playback?: boolean
  /** The room a redone screen gives itself (F8): 32 px at the header's and
   *  the footer's sides, so they line up with a middle padded by as much; and
   *  a header as tall as the 36 px work button, so the button coming into it
   *  moves nothing. */
  air?: boolean
}) {
  const escBack = useKeysOn("space") && backKey

  // Notices stack above the footer, never on it: the footer holds Start, Stop
  // and Save take, and at a larger scale or in a narrow window its button
  // reaches the corner. So its height is published for components/Notices,
  // and taken back to nothing when this screen goes.
  const footerRef = useRef<HTMLElement>(null)
  const hasFooter = !!footer
  useEffect(() => {
    const root = document.documentElement
    const el = footerRef.current
    if (!hasFooter || !el) {
      root.style.setProperty("--footer-h", "0px")
      return
    }
    const publish = () => root.style.setProperty("--footer-h", `${el.offsetHeight}px`)
    publish()
    const watch = new ResizeObserver(publish)
    watch.observe(el)
    return () => {
      watch.disconnect()
      root.style.setProperty("--footer-h", "0px")
    }
  }, [hasFooter])

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      {!(title || onBack || headerAction) && activity && (
        // A screen with no header still shows long work, in its corner;
        // Recording turns it off.
        <div className="absolute top-3 right-4 z-10">
          <ActivityButton />
        </div>
      )}
      {(title || onBack || headerAction) && (
        <header
          className={cn("flex shrink-0 items-center gap-3 border-b py-4", air ? "px-8" : "px-6")}
        >
          {onBack && (
            <Button
              variant="ghost"
              size={escBack ? "row" : "icon"}
              onClick={onBack}
              aria-label="Back"
              aria-keyshortcuts={escBack ? "Escape" : undefined}
            >
              <ChevronLeft />
              {escBack && <Kbd aria-hidden>Esc</Kbd>}
            </Button>
          )}
          {/* With facts beside it the name keeps its width and the facts give
              way to it (components/EveningFacts); one longer than the whole
              row wraps to a second line rather than being cut. A title that
              fits itself to its lines, as Review's take does, is never cut
              here either. With a least height the words sit in its middle. */}
          <div
            className={cn(
              "min-w-0",
              facts ? "flex-[0_1_auto]" : "flex-1",
              (air || titleLeast) && "flex flex-col justify-center",
              // On a redone screen the header is as tall as a 36 px button,
              // so the work button coming into it moves nothing (B4).
              // Before titleLeast, so Review's taller box wins.
              air && "min-h-9",
              titleLeast
            )}
          >
            {subtitle && (
              <div className="text-xs text-muted-foreground">
                {subtitle}
              </div>
            )}
            {title && (
              <h1
                className={cn(
                  "text-xl leading-tight font-semibold",
                  facts || titleFits ? "break-words" : "truncate"
                )}
              >
                {title}
              </h1>
            )}
          </div>
          {facts}
          {/* Unseen rather than gone with the facts: its room stays, or the
              facts would get it back, fit again and loop. */}
          {facts && (
            <span
              aria-hidden
              className={cn("ml-2 h-8 w-px shrink-0 bg-border", factsGone && "invisible")}
            />
          )}
          <ActivityButton />
          {playback && <ListeningVolume />}
          {headerAction}
        </header>
      )}

      {aside ? (
        <div className="flex min-h-0 flex-1">
          <main
            className={cn("min-h-0 min-w-0 flex-1 overflow-y-auto px-6 py-(--screen-pad-y)", className)}
          >
            {children}
          </main>
          {aside}
        </div>
      ) : (
        <main
          className={cn("min-h-0 flex-1 overflow-y-auto px-6 py-(--screen-pad-y)", className)}
        >
          {children}
        </main>
      )}

      {footer && (
        <footer
          ref={footerRef}
          className={cn("shrink-0 border-t bg-card/40", air ? "px-8 py-6" : "px-6 py-5")}
        >
          {footer}
        </footer>
      )}
    </div>
  )
}
