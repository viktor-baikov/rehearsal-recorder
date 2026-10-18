import { useId, type ComponentProps, type ReactNode } from "react"
import { Card } from "@/components/ui/card"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { rise as riseAt } from "@/lib/motion"
import { cn } from "@/lib/utils"

/** The one slot for what an action in Settings said, so each says over the
 *  last, whichever tab it was on. */
export const SAID = "settings"

/** A titled group can have a hint under its heading and an action at its
 *  right. An untitled one has neither: it has no head to put them in. */
type GroupHead =
  | { title: string; hint?: ReactNode; action?: ReactNode }
  | { title?: undefined; hint?: never; action?: never }

/**
 * One group of a Settings tab: a group on the card's fill (C7), 24 px inside,
 * rising in at its place in the tab (F10; the tab's head is 0). With a title
 * it is a region named by its heading, with the hint under the heading and
 * `action` at its right. A tab with one group, as Appearance, leaves the
 * title out: the tab's head names it already.
 */
export function SettingsGroup({
  title,
  hint,
  action,
  rise,
  className,
  style,
  children,
  ...div
}: GroupHead & {
  /** Its place in the order the tab's groups rise in, from 1. */
  rise: number
} & Omit<ComponentProps<"div">, "title">) {
  const id = useId()
  return (
    <Card
      data-settings-group
      role={title ? "region" : undefined}
      aria-labelledby={title ? id : undefined}
      className={cn("animate-rise gap-6 p-6", className)}
      style={{ ...riseAt(rise), ...style }}
      {...div}
    >
      {title && (
        <div className="flex items-start gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h3 id={id} className="text-base font-semibold">
              {title}
            </h3>
            {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </Card>
  )
}

/**
 * Pick one of a few, in a group: the row's name at its left and the shared
 * switch beside it, named by it. Arrows move along the switch, and the
 * choice is made with a click, Space or Enter; the focus stays where it was,
 * so a choice that changes the screen round it, such as the scale, leaves
 * the keys where they were.
 *
 * `name` is an item's name where its words alone would not say it: "Scale
 * 150 percent" for "150%".
 */
export function PickRow<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: ReactNode; name?: string }[]
  onChange: (value: T) => void
}) {
  const id = useId()
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <span id={id} className="min-w-20 text-sm">
        {label}
      </span>
      <ToggleGroup
        type="single"
        variant="switch"
        aria-labelledby={id}
        value={String(value)}
        // The one that is on, pressed again, sends "", which is no choice:
        // one is always on.
        onValueChange={(next) => {
          const picked = options.find((o) => String(o.value) === next)
          if (picked) onChange(picked.value)
        }}
      >
        {options.map((o) => (
          <ToggleGroupItem key={String(o.value)} value={String(o.value)} aria-label={o.name}>
            {o.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  )
}
