import type { Meta, StoryObj } from "@storybook/react-vite"
import { Checkbox } from "./checkbox"
import { Label } from "./label"

const meta = {
  title: "UI/Checkbox",
  component: Checkbox,
  args: { "aria-label": "Send to the cloud" },
} satisfies Meta<typeof Checkbox>

export default meta
type Story = StoryObj<typeof meta>

export const Unticked: Story = {}

/** Ticked in the text's colour, never the accent (F2). */
export const Ticked: Story = { args: { defaultChecked: true } }

/** Beside the words that name it; pressing the words ticks it. */
export const WithLabel: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Checkbox id="cloud" defaultChecked />
      <Label htmlFor="cloud">Send to the cloud: the mix, MP3</Label>
    </div>
  ),
}

/** Switched off: dimmed, and the words with it by the box saying so
 *  (`peer-disabled`). */
export const Disabled: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Checkbox id="cloud-off" disabled />
      <Label htmlFor="cloud-off">Send to the cloud: the mix, MP3</Label>
    </div>
  ),
}

/** Unticked, ticked and switched off, side by side. */
export const States: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Checkbox aria-label="Unticked" />
      <Checkbox aria-label="Ticked" defaultChecked />
      <Checkbox aria-label="Switched off" disabled />
      <Checkbox aria-label="Ticked and switched off" disabled defaultChecked />
      <Checkbox aria-label="Not valid" aria-invalid />
    </div>
  ),
}
