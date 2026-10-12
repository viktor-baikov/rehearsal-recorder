import type { Meta, StoryObj } from "@storybook/react-vite"
import { Button } from "./button"
import { Input } from "./input"
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "./popover"

const meta = {
  title: "UI/Popover",
  component: Popover,
} satisfies Meta<typeof Popover>

export default meta
type Story = StoryObj<typeof meta>

const trigger = (
  <PopoverTrigger asChild>
    <Button variant="outline">Open</Button>
  </PopoverTrigger>
)

export const Closed: Story = {
  render: (args) => (
    <Popover {...args}>
      {trigger}
      <PopoverContent>Click the button again to close.</PopoverContent>
    </Popover>
  ),
}

export const Open: Story = {
  render: (args) => (
    <Popover {...args} defaultOpen>
      {trigger}
      <PopoverContent>Click the button again to close.</PopoverContent>
    </Popover>
  ),
  // The panel opens beside the button, outside the story's own box.
  decorators: [(Story) => <div className="h-24"><Story /></div>],
}

// Hung on a box that is not its button: a line under a field, as wide as the
// field, open while it has something to say. It is not modal and takes no
// focus, so the field keeps the keys.
export const Anchored: Story = {
  render: (args) => (
    <Popover {...args} open modal={false}>
      <PopoverAnchor asChild>
        <div className="w-72">
          <Input defaultValue="Palyn" />
        </div>
      </PopoverAnchor>
      <PopoverContent
        className="w-(--radix-popover-trigger-width) px-3 py-2 text-xs"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        Palyn is Pałyn now.
      </PopoverContent>
    </Popover>
  ),
  decorators: [(Story) => <div className="h-32"><Story /></div>],
}
