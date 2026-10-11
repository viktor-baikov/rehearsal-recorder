import { useEffect, useRef } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { Button } from "./button"
import { Figures, Whole, WholeTip, useCut } from "./whole"
import type { Part } from "@/lib/figures"

const LONG = "Kalychanka (the long one, with the bridge in G, as we played it after the break)"

const meta = {
  title: "UI/Whole",
  component: Whole,
  args: { text: LONG },
  // The tip opens beside its trigger, outside the story's own box.
  decorators: [
    (Story) => (
      <div className="flex min-h-48 items-start justify-center pt-12">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Whole>

export default meta
type Story = StoryObj<typeof meta>

/** A name that fits has no tip. */
export const Fits: Story = {
  args: { text: "Kalychanka", className: "w-56 truncate text-sm" },
}

/** A name that is cut shows whole on hover, after 400 ms (B6). */
export const Cut: Story = {
  args: { text: LONG, className: "w-56 truncate text-sm" },
}

/** Where a name has room for a second line, it wraps. */
export const WrapsToTwoLines: Story = {
  args: { text: "Kalychanka, the long one, with the bridge", className: "w-56 line-clamp-2 text-sm" },
}

/** ...and past two lines it is cut and shows whole on hover. */
export const CutAtTwoLines: Story = {
  args: { text: LONG, className: "w-56 line-clamp-2 text-sm" },
}

// A cut name inside a button, as a song's name is in a list.
function NameButton({ text, focus }: { text: string; focus?: boolean }) {
  const [ref, cut] = useCut<HTMLSpanElement>()
  const button = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (focus) button.current?.focus()
  }, [focus])
  return (
    <WholeTip cut={cut} text={text}>
      <Button ref={button} variant="ghost" size="row" className="w-full justify-start">
        <span ref={ref} className="block min-w-0 truncate">
          {text}
        </span>
      </Button>
    </WholeTip>
  )
}

/** Tab to the button: the tip shows at once, as it does for the keyboard,
 *  and stays while focus is there. Esc or a click closes it. */
export const OnKeyboardFocus: Story = {
  render: () => (
    <div className="w-56">
      <NameButton text={LONG} />
    </div>
  ),
}

/** The same with focus already there. */
export const Focused: Story = {
  render: () => (
    <div className="w-56">
      <NameButton text={LONG} focus />
    </div>
  ),
}

/** Focusing a name below the fold scrolls the panel it is in, and a scroll
 *  closes a Radix tip. The tip stays: here the last name has focus from the
 *  start, and the panel has scrolled to it. */
export const FocusScrollsThePanel: Story = {
  render: () => (
    <div className="h-40 w-56 overflow-y-auto rounded-md border">
      {["Ahead of the others", "Second wind", "Waltz in D", "Waltz in D, again", "Slow one", LONG].map(
        (name, i, all) => (
          <NameButton key={name} text={name} focus={i === all.length - 1} />
        ),
      )}
    </div>
  ),
}

const p = (text: string, keep: number, join?: string): Part => ({ text, keep, join })
const FIGURES = [p("18 inputs", 2), p("48 kHz", 1), p("24 bit", 0)]
const DATED = [p("Sat 19 Sep", 1), p("3 weeks ago", 0, ", ")]

function Row({ width, name, parts }: { width: string; name: string; parts: Part[] }) {
  return (
    <div className="flex items-baseline gap-2 text-sm" style={{ width }}>
      <span className="shrink-0">{name}</span>
      <Figures parts={parts} className="tnum text-xs text-muted-foreground" />
    </div>
  )
}

/** The figures beside a name drop whole, the least needed first, as the row
 *  narrows; the name keeps its width. When any has gone, hovering the rest
 *  shows them all. */
export const FiguresGivingWay: Story = {
  decorators: [
    (Story) => (
      <div className="flex min-h-48 items-start justify-center pt-4">
        <Story />
      </div>
    ),
  ],
  render: () => (
    <div className="flex flex-col gap-4">
      {["20rem", "15rem", "12rem", "9rem"].map((w) => (
        <Row key={w} width={w} name="Scarlett 18i20" parts={FIGURES} />
      ))}
    </div>
  ),
}

/** A date and how long ago, joined by a comma while both show and by a dot
 *  otherwise. */
export const FiguresJoinedByAComma: Story = {
  decorators: FiguresGivingWay.decorators,
  render: () => (
    <div className="flex flex-col gap-4">
      {["20rem", "14rem", "10rem", "5rem"].map((w) => (
        <Row key={w} width={w} name="Tuesday" parts={DATED} />
      ))}
    </div>
  ),
}
