import type { Meta, StoryObj } from "@storybook/react-vite"
import type { ComponentProps } from "react"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "./select"

/** A select of inputs: the list has a separator, and an input that is not
 *  connected, which cannot be picked. */
function Inputs({
  size,
  invalid,
  ...props
}: ComponentProps<typeof Select> & { size?: "sm" | "default"; invalid?: boolean }) {
  return (
    <Select {...props}>
      <SelectTrigger size={size} aria-invalid={invalid || undefined} className="w-56">
        <SelectValue placeholder="Input" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Inputs</SelectLabel>
          <SelectItem value="room">Room mic</SelectItem>
          <SelectItem value="desk">Desk mixer</SelectItem>
          <SelectItem value="usb">USB interface</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>Not connected</SelectLabel>
          <SelectItem value="xr18" disabled>
            X18/XR18
          </SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

const meta = {
  title: "UI/Select",
  component: Select,
  render: (args) => <Inputs {...args} />,
} satisfies Meta<typeof Select>

export default meta
type Story = StoryObj<typeof meta>

export const Placeholder: Story = {}
export const WithValue: Story = { args: { defaultValue: "desk" } }
export const Disabled: Story = { args: { disabled: true } }

/** The small trigger, 32 px, for a select in a row. */
export const Small: Story = {
  args: { defaultValue: "desk" },
  render: (args) => <Inputs {...args} size="sm" />,
}

/** A choice that cannot be used, as a field that is wrong shows it. */
export const Invalid: Story = {
  args: { defaultValue: "usb" },
  render: (args) => <Inputs {...args} invalid />,
}

/** Open: the separator, and the input that is not connected, dimmed. */
export const Open: Story = {
  args: { defaultOpen: true, defaultValue: "room" },
  // The list opens over the trigger, outside the story's own box.
  decorators: [(Story) => <div className="h-64"><Story /></div>],
}
