import type { Meta, StoryObj } from "@storybook/react-vite"
import { Mic, Radio } from "lucide-react"
import { useState } from "react"
import { Toggle } from "./toggle"

const meta = {
  title: "UI/Toggle",
  component: Toggle,
  args: { children: "Stereo", "aria-label": "Stereo" },
} satisfies Meta<typeof Toggle>

export default meta
type Story = StoryObj<typeof meta>

const VARIANTS = ["default", "outline"] as const

/** Off: a bare button that stays pressed when it is pressed (`aria-pressed`). */
export const Default: Story = {}

/** On is a grey fill, never the accent (F2). */
export const On: Story = { args: { defaultPressed: true } }

export const Outline: Story = { args: { variant: "outline" } }
export const OutlineOn: Story = { args: { variant: "outline", defaultPressed: true } }

export const WithIcon: Story = {
  args: {
    variant: "outline",
    children: (
      <>
        <Mic /> Stereo
      </>
    ),
  },
}

/** A square one for an icon, with its name in `aria-label`. */
export const IconOnly: Story = {
  args: { size: "icon-row", variant: "outline", children: <Mic />, "aria-label": "Microphone" },
}

/** Off, on and switched off, in both variants. */
export const States: Story = {
  render: (args) => (
    <div className="grid grid-cols-[auto_auto_auto_auto] items-center justify-start gap-4">
      {VARIANTS.map((variant) => (
        <div key={variant} className="contents">
          <Toggle {...args} variant={variant}>
            {variant}
          </Toggle>
          <Toggle {...args} variant={variant} defaultPressed>
            {variant} on
          </Toggle>
          <Toggle {...args} variant={variant} disabled>
            {variant} off
          </Toggle>
          <Toggle {...args} variant={variant} defaultPressed disabled>
            {variant} on
          </Toggle>
        </div>
      ))}
    </div>
  ),
}

function Pressing() {
  const [on, setOn] = useState(false)
  return (
    <div className="flex items-center gap-4">
      <Toggle variant="outline" pressed={on} onPressedChange={setOn}>
        <Radio />
        {on ? "Stop checking" : "Check signal"}
      </Toggle>
      <span className="text-sm text-muted-foreground">{on ? "on" : "off"}</span>
    </div>
  )
}

/** Controlled, with its words changing as the Check signal button's do. */
export const Controlled: Story = { render: () => <Pressing /> }

/** Pressing one changes nothing beside it: both states have the same frame
 *  and weight, so the width is the same (as Button's variants are, C1). */
export const NothingMoves: Story = {
  render: (args) => (
    <div className="flex w-fit items-center gap-2 rounded-md border border-dashed p-2">
      <Toggle {...args}>Stereo</Toggle>
      <Toggle {...args} defaultPressed>
        Stereo
      </Toggle>
    </div>
  ),
}

/** `row` is 32 px, as Button's; `icon-row` is a 32 px square. */
export const Sizes: Story = {
  render: (args) => (
    <div className="flex items-center gap-4">
      <Toggle {...args} size="row" variant="outline">
        row
      </Toggle>
      <Toggle {...args} size="icon-row" variant="outline" aria-label="Microphone">
        <Mic />
      </Toggle>
    </div>
  ),
}
