import type { Meta, StoryObj } from "@storybook/react-vite"
import { ChevronRight, Undo2 } from "lucide-react"
import { Button } from "./button"
import { Kbd } from "./kbd"
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip"
import { useSystem, words, type System } from "@/lib/platform"

const meta = {
  title: "UI/Tooltip",
  component: Tooltip,
  // The tip opens beside its trigger, outside the story's own box.
  decorators: [
    (Story) => (
      <div className="flex min-h-40 items-center justify-center">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Tooltip>

export default meta
type Story = StoryObj<typeof meta>

const open = (
  <Button variant="ghost" size="icon-row" aria-label="Open in History">
    <ChevronRight />
  </Button>
)

/** Hover the button, or Tab to it: the tip comes after 400 ms and goes with
 *  Esc or the pointer. */
export const Closed: Story = {
  render: (args) => (
    <Tooltip {...args}>
      <TooltipTrigger asChild>{open}</TooltipTrigger>
      <TooltipContent>Open in History</TooltipContent>
    </Tooltip>
  ),
}

/** The tip already showing. */
export const Open: Story = {
  render: (args) => (
    <Tooltip {...args} defaultOpen>
      <TooltipTrigger asChild>{open}</TooltipTrigger>
      <TooltipContent>Open in History</TooltipContent>
    </Tooltip>
  ),
}

/** It opens above by default and goes to the side with more room. */
export const Below: Story = {
  render: (args) => (
    <Tooltip {...args} defaultOpen>
      <TooltipTrigger asChild>{open}</TooltipTrigger>
      <TooltipContent side="bottom">Open in History</TooltipContent>
    </Tooltip>
  ),
}

/** A name that a row had to cut, shown whole (B6): the tip wraps at 20 rem
 *  rather than run off the window. */
export const LongName: Story = {
  render: (args) => (
    <Tooltip {...args} defaultOpen>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="block w-40 truncate rounded-sm text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
          Kalychanka (the long one, with the bridge in G, as we played it after the break)
        </span>
      </TooltipTrigger>
      <TooltipContent>
        Kalychanka (the long one, with the bridge in G, as we played it after the break)
      </TooltipContent>
    </Tooltip>
  ),
}

function Undo({ system }: { system: System }) {
  return (
    <Tooltip defaultOpen>
      <TooltipTrigger asChild>
        <Button variant="outline" size="icon-row" aria-label="Undo" aria-keyshortcuts="Meta+Z">
          <Undo2 />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="flex items-center gap-2">
        Undo
        <Kbd aria-hidden>{words(system).undoKey}</Kbd>
      </TooltipContent>
    </Tooltip>
  )
}

function Following() {
  return <Undo system={useSystem()} />
}

/** A key on the tip, in the tip's own colours, as it follows the toolbar's
 *  System switch... */
export const WithAKey: Story = { render: () => <Following /> }

/** ...and both systems, side by side. */
export const BothSystems: Story = {
  decorators: [
    (Story) => (
      <div className="flex min-h-40 items-start justify-center pt-4">
        <Story />
      </div>
    ),
  ],
  render: () => (
    <div className="flex gap-24">
      {(["mac", "windows"] as System[]).map((s) => (
        <div key={s} className="flex flex-col items-center gap-2">
          <span className="text-sm text-muted-foreground">{s}</span>
          <Undo system={s} />
        </div>
      ))}
    </div>
  ),
}
