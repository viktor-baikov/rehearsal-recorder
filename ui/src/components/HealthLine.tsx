import { BatteryLow, HardDrive } from "lucide-react"
import type { RecordingHealth } from "@/lib/api"
import { diskLine } from "@/lib/format"
import { cn } from "@/lib/utils"

/** At or under this charge, on battery, the line asks for the charger. 20%
 *  is where Windows turns its own battery saver on. */
export const LOW_BATTERY = 20

/** Python calls the space low under this many minutes (api.py
 *  LOW_SPACE_MINUTES), so a low line never says more than 14. */
const LOW_SPACE_MINUTES = 15

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)
/** The free space while the interface sends: the start screen's sentence,
 *  led by the interface. */
const connected = (minutes: number) => `Interface connected · ${lower(diskLine(minutes, false))}`
const lowSpace = (minutes: number) =>
  `${diskLine(minutes, true)}. Free some up or finish the rehearsal.`

/** The longest the line can say while a take records, held unseen under it
 *  from the start, so the room it takes never changes during the take (B4).
 *  Past 48 h the estimate is "many hours", so 48 h 59 min is the longest it
 *  writes. An error is not held: it ends the take, and its words are
 *  Python's, as long as they are. */
const LONGEST = [connected(48 * 60 + 59), lowSpace(LOW_SPACE_MINUTES - 1)]

function Line({
  icon,
  text,
  warn,
  unseen,
}: {
  icon: "disk" | "battery"
  text: string
  warn?: boolean
  unseen?: boolean
}) {
  const Icon = icon === "battery" ? BatteryLow : HardDrive
  return (
    <div
      aria-hidden={unseen || undefined}
      className={cn("col-start-1 row-start-1 flex items-start gap-2", unseen && "invisible")}
    >
      <Icon className={cn("mt-px size-3.5 shrink-0", warn && "text-warn")} />
      {unseen ? (
        // Drawn from an attribute, not written in the page: a copy that only
        // holds room is not a second line of text to find, read or select.
        <span data-text={text} className="before:content-[attr(data-text)]" />
      ) : (
        <span>{text}</span>
      )}
    </div>
  )
}

/**
 * The recording screen's status line: room left on the drive and whether
 * the interface is still sending, or what is wrong, or a battery about to
 * end the take. The website shows it too, in a tile.
 *
 * Always there, not only when something is wrong: you should be able to
 * see at a glance that the recording is healthy. The free space is said in
 * the start screen's words (diskLine), and running low is a warning on both
 * screens: the icon in warn and the words in the text's colour, as Alert
 * draws it.
 *
 * It holds the room of the longest thing it can say during a take, so it
 * never moves what is beside it.
 */
export function HealthLine({
  health,
  align = "end",
  hold = true,
}: {
  health: RecordingHealth | null
  /** Where the line stands in the room it holds: flush right at the top of
   *  the screen, flush left in the footer. */
  align?: "start" | "end"
  /** Keeps the room of the longest sentence, unseen. A still picture of the
   *  line, which nothing moves beside, passes false: its box is as wide as
   *  its words. */
  hold?: boolean
}) {
  const battery = health?.battery_percent
  const lowBattery = battery != null && battery <= LOW_BATTERY
  const warn = !health?.error && (!!health?.low_space || lowBattery)
  const text = health?.error
    ? health.error
    : health === null
      ? "Checking free space…"
      : health.low_space
        ? lowSpace(health.minutes_left ?? 0)
        : lowBattery
          ? `Battery ${battery}%: plug the laptop in`
          : connected(health.minutes_left ?? 0)
  return (
    <div
      data-health
      className={cn(
        // Tabular figures: every digit as wide as the next, so the longest
        // sentence is the longest whatever the minutes are.
        "tnum grid text-xs",
        align === "end" ? "justify-items-end text-right" : "justify-items-start",
        health?.error ? "text-destructive" : warn ? "text-foreground" : "text-muted-foreground"
      )}
    >
      {hold &&
        LONGEST.map((t) => <Line key={t} icon="disk" text={t} unseen />)}
      <Line
        icon={lowBattery && !health?.error && !health?.low_space ? "battery" : "disk"}
        text={text}
        warn={warn}
      />
    </div>
  )
}
