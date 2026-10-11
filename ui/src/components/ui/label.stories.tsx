import type { Meta, StoryObj } from "@storybook/react-vite"
import { Input } from "./input"
import { Label } from "./label"

const meta = {
  title: "UI/Label",
  component: Label,
  args: { children: "Song name" },
} satisfies Meta<typeof Label>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** The label beside the field it names; clicking it focuses the field. */
export const WithInput: Story = {
  render: (args) => (
    <div className="flex w-72 flex-col gap-2">
      <Label {...args} htmlFor="song" />
      <Input id="song" placeholder="Blue in Green" />
    </div>
  ),
}

/** The label of a field that cannot be used: dimmed with it, by the group
 *  they are in saying so (`data-disabled`). */
export const Disabled: Story = {
  render: (args) => (
    <div data-disabled="true" className="group flex w-72 flex-col gap-2">
      <Label {...args} htmlFor="song-off" />
      <Input id="song-off" placeholder="Blue in Green" disabled />
    </div>
  ),
}

/** The same, for a label after its field (`peer-disabled`), as beside a
 *  checkbox. */
export const AfterADisabledField: Story = {
  render: (args) => (
    <div className="flex w-72 items-center gap-2">
      <Input id="tempo-off" className="peer w-20" defaultValue="120" disabled />
      <Label {...args} htmlFor="tempo-off">
        bpm
      </Label>
    </div>
  ),
}
