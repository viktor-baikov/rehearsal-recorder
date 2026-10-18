import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { HistoryView } from "@/lib/api"

const VIEWS: { view: HistoryView; label: string }[] = [
  { view: "rehearsals", label: "Rehearsals" },
  { view: "songs", label: "Songs" },
  { view: "marks", label: "Marks" },
]

/**
 * The top of History's list: evening by evening, song by song, or mark by
 * mark. They answer different questions — "what did we do on Tuesday",
 * "where is the good Viasna" and "where was that riff" — over the same takes.
 *
 * It lies across the list, so ← and → move along it and ↑ and ↓ are left to
 * the list under it, wherever the focus is.
 */
export function HistorySwitch({
  view,
  onChange,
}: {
  view: HistoryView
  onChange: (view: HistoryView) => void
}) {
  return (
    <ToggleGroup
      type="single"
      variant="switch"
      orientation="horizontal"
      aria-label="History view"
      value={view}
      // The view that is on, pressed again, would leave none on.
      onValueChange={(next) => {
        if (next && next !== view) onChange(next as HistoryView)
      }}
      className="w-full"
    >
      {VIEWS.map((v) => (
        <ToggleGroupItem key={v.view} value={v.view}>
          {v.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
