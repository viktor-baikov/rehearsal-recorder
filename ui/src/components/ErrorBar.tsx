import { TriangleAlert, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { dismissBridgeErrors, useBridgeErrors } from "@/lib/bridgeErrors"

/**
 * Says so when a call into Python raised, over whatever screen is open.
 *
 * The screen that made the call still gets an answer and shows its own
 * error where it would anyway (see `api()`); this bar is for the rest — the
 * exception's own words, for a bug report, and where the full traceback is.
 * It stays until put away, because the reason it exists is that the last
 * two such failures were silent.
 *
 * Every problem said since it was last put away is in it, oldest first, and
 * one Dismiss puts them all away. A long list scrolls inside the bar, which
 * stops at about 40% of the window, so the screen under it stays usable.
 */
export function ErrorBar() {
  const errors = useBridgeErrors()
  if (errors.length === 0) return null
  return (
    <div
      role="alert"
      aria-label="Something went wrong"
      className="fixed inset-x-0 top-0 z-40 flex items-start gap-3 border-b border-destructive/40 bg-destructive/15 px-6 py-3 text-sm backdrop-blur"
    >
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
      <div className="min-w-0 flex-1">
        <ul className="flex max-h-[40vh] flex-col gap-2 overflow-y-auto">
          {errors.map((error) => (
            <li key={`${error.method}\n${error.name}\n${error.message}`}>
              <p className="font-medium text-destructive">
                Something went wrong
                <span className="font-normal text-muted-foreground"> in {error.method}</span>
              </p>
              <p className="mt-0.5 font-mono text-xs break-words">
                {error.name}: {error.message}
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-1 text-xs text-muted-foreground">
          The full error is in ~/.rehearsal-recorder/crash.log.
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon-row"
        aria-label="Dismiss"
        onClick={dismissBridgeErrors}
      >
        <X />
      </Button>
    </div>
  )
}
