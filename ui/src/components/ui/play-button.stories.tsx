import type { Meta, StoryObj } from "@storybook/react-vite"
import { Fragment, useState } from "react"
import { Button } from "./button"
import { Card } from "./card"
import { PlayButton } from "./play-button"
import type { PlayLook } from "@/lib/playLook"

const meta = {
  title: "UI/PlayButton",
  component: PlayButton,
  args: { look: "idle", size: "row", name: "Take 3" },
  argTypes: {
    look: {
      control: "select",
      options: ["idle", "loading", "playing", "paused", "failed", "missing"],
    },
    size: { control: "inline-radio", options: ["row", "head"] },
  },
} satisfies Meta<typeof PlayButton>

export default meta
type Story = StoryObj<typeof meta>

const LOOKS: PlayLook[] = ["idle", "loading", "playing", "paused", "failed", "missing"]
const SIZES = ["row", "head"] as const

/** A thin border and a fill under the pointer: a take nobody has opened. */
export const Idle: Story = {}
/** Open and silent, in the accent. */
export const Paused: Story = { args: { look: "paused" } }
/** The accent, with Pause. */
export const Playing: Story = { args: { look: "playing" } }
/** Pressing it tries again; the label says so. */
export const Failed: Story = { args: { look: "failed" } }
/** Not on disk: switched off, in every list alike. */
export const Missing: Story = { args: { look: "missing" } }
/** The song page's size: 48 px with a 20 px icon. */
export const Head: Story = { args: { size: "head", look: "playing" } }

/** Shows ▶ for the first second, then a spinner in its place (B5): a take that
 *  opens at once never flashes one. Start it again as often as you like. The
 *  spinner stands still under Reduce motion and while a take is recorded. */
function LoadingDemo() {
  const [loading, setLoading] = useState(false)
  return (
    <div className="flex items-center gap-4">
      <PlayButton look={loading ? "loading" : "idle"} name="Take 3" />
      <Button variant="outline" size="row" onClick={() => setLoading((on) => !on)}>
        {loading ? "Stop loading" : "Start loading"}
      </Button>
    </div>
  )
}
export const Loading: Story = { render: () => <LoadingDemo /> }

/* Hover and focus cannot be switched on for six buttons at once, so each
   button here wears what its state adds, the same classes Button and the look
   give it (hover: a fill; focus: the shared ring). Move the pointer over the
   ones in "Looks", or press Tab, for the real thing. */
type Shown = "rest" | "hover" | "focus"
const FORCED: Record<Shown, (look: PlayLook) => string> = {
  rest: () => "",
  hover: (look) =>
    look === "missing"
      ? ""
      : look === "playing" || look === "paused"
        ? "bg-primary/90"
        : "bg-accent dark:bg-accent",
  focus: (look) => (look === "missing" ? "" : "border-ring ring-[3px] ring-ring/50"),
}

/** Every look at both sizes, on a card, where a small player lives. */
function Matrix({ shown }: { shown: Shown }) {
  return (
    <Card className="w-fit gap-0 p-8">
      <div className="grid grid-cols-[auto_auto_auto] items-center justify-items-start gap-x-8 gap-y-4">
        <span />
        <span className="text-xs text-muted-foreground">row, 32 px</span>
        <span className="text-xs text-muted-foreground">head, 48 px</span>
        {LOOKS.map((look) => (
          <Fragment key={look}>
            <span className="text-sm text-muted-foreground">{look}</span>
            {SIZES.map((size) => (
              <PlayButton
                key={size}
                look={look}
                size={size}
                name="Take 3"
                className={FORCED[shown](look)}
              />
            ))}
          </Fragment>
        ))}
      </div>
    </Card>
  )
}

/** All six looks at both sizes, in the toolbar's theme (dark to begin with);
 *  the ones ending in Light are the same on the light theme, whatever the
 *  toolbar says. The first second of "loading" is the ▶; then the spinner. */
export const Looks: Story = { render: () => <Matrix shown="rest" /> }
export const LooksLight: Story = { ...Looks, globals: { theme: "light" } }

/** The same, with the pointer over each. A take that is not on disk does not
 *  react. */
export const Hovered: Story = { render: () => <Matrix shown="hover" /> }
export const HoveredLight: Story = { ...Hovered, globals: { theme: "light" } }

/** The same, with the keyboard on each: the ring every other control has. A
 *  take that is not on disk cannot be reached by Tab. */
export const Focused: Story = { render: () => <Matrix shown="focus" /> }
export const FocusedLight: Story = { ...Focused, globals: { theme: "light" } }
