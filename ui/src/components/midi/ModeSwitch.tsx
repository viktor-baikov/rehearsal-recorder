import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { RecordMode } from "@/lib/api"
import { cn } from "@/lib/utils"

/**
 * The width of a track row's end column: this switch on the top line, and
 * under it, one under the other, the check's meters (an input's level, a
 * port's notes), so they line up with it.
 */
export const END_COLUMN = "w-40"

/** The width of the word after each of those meters ("signal", "silent",
 *  "notes", "no notes"): one width for all, so the bars line up. */
export const END_WORD = "w-14"

const MODES: { mode: RecordMode; label: string }[] = [
  { mode: "audio", label: "Audio" },
  { mode: "both", label: "Both" },
  { mode: "midi", label: "MIDI" },
]

/**
 * What a track records, at the end of its row's top line: its sound, its
 * notes, or both. The shared switch (History's look), as tall as the row's
 * other controls and one width whatever is chosen, so the name beside it
 * never moves. The arrow keys move along it and Space chooses; Tab leaves
 * it. One is always chosen: pressing the chosen one again changes nothing.
 */
export function ModeSwitch({
  label,
  value,
  onChange,
}: {
  /** What the group is called: "Track 1 records". */
  label: string
  value: RecordMode
  onChange: (mode: RecordMode) => void
}) {
  return (
    <ToggleGroup
      type="single"
      variant="switch"
      aria-label={label}
      value={value}
      // Pressing the chosen one again would leave none chosen: it says "".
      onValueChange={(mode) => mode && mode !== value && onChange(mode as RecordMode)}
      className={cn("grid h-8 shrink-0 grid-cols-3 items-stretch gap-0.5 p-0.5", END_COLUMN)}
    >
      {MODES.map((m) => (
        <ToggleGroupItem key={m.mode} value={m.mode} className="px-1 py-0">
          {m.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
