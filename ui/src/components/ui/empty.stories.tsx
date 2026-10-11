import type { Meta, StoryObj } from "@storybook/react-vite"
import { Plus, SlidersHorizontal } from "lucide-react"
import { Button } from "./button"
import { Card } from "./card"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "./empty"

const meta = {
  title: "UI/Empty",
  component: Empty,
  decorators: [
    (Story) => (
      <div className="w-[28rem] max-w-full">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Empty>

export default meta
type Story = StoryObj<typeof meta>

/** What will be here, and how it gets here (B7). */
export const Default: Story = {
  render: (args) => (
    <Empty {...args}>
      <EmptyHeader>
        <EmptyTitle>No tracks yet</EmptyTitle>
        <EmptyDescription>
          Add one per musician, then pick the input they plug into.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" size="row">
          <Plus />
          Add track
        </Button>
      </EmptyContent>
    </Empty>
  ),
}

export const WithAnIcon: Story = {
  render: (args) => (
    <Empty {...args}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SlidersHorizontal />
        </EmptyMedia>
        <EmptyTitle>No tracks yet</EmptyTitle>
        <EmptyDescription>
          Add one per musician, then pick the input they plug into.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  ),
}

export const WithoutAButton: Story = {
  render: (args) => (
    <Empty {...args}>
      <EmptyHeader>
        <EmptyTitle>This set has no songs</EmptyTitle>
        <EmptyDescription>Songs you play are added to it as you record.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  ),
}

/** On a dashed frame, for an empty place that is meant to be filled. */
export const Dashed: Story = {
  render: (args) => (
    <Empty {...args} className="border">
      <EmptyHeader>
        <EmptyTitle>No tracks yet</EmptyTitle>
        <EmptyDescription>
          Add one per musician, then pick the input they plug into.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" size="row">
          <Plus />
          Add track
        </Button>
      </EmptyContent>
    </Empty>
  ),
}

/** In a group of the screen, between its head and its foot. */
export const InAGroup: Story = {
  render: (args) => (
    <Card>
      <div className="text-base font-semibold">Tracks</div>
      <Empty {...args}>
        <EmptyHeader>
          <EmptyTitle>No tracks yet</EmptyTitle>
          <EmptyDescription>
            Add one per musician, then pick the input they plug into.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </Card>
  ),
}
