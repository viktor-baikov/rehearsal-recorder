import type { Meta, StoryObj } from "@storybook/react-vite"
import { ChevronsUpDown } from "lucide-react"
import { Button } from "./button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./collapsible"

const meta = {
  title: "UI/Collapsible",
  component: Collapsible,
} satisfies Meta<typeof Collapsible>

export default meta
type Story = StoryObj<typeof meta>

const REST = (
  <CollapsibleContent className="mt-2 text-sm text-muted-foreground">
    Three takes of Viasna, the last with the new ending.
  </CollapsibleContent>
)

/** Closed: the trigger alone, with its `aria-expanded` false. The trigger is
 *  a bare button as it comes, with nothing of the theme on it. */
export const Closed: Story = {
  render: (args) => (
    <Collapsible {...args} className="w-72 text-sm">
      <CollapsibleTrigger>Viasna</CollapsibleTrigger>
      {REST}
    </Collapsible>
  ),
}

/** Open: the content under the trigger. */
export const Open: Story = {
  render: (args) => (
    <Collapsible {...args} defaultOpen className="w-72 text-sm">
      <CollapsibleTrigger>Viasna</CollapsibleTrigger>
      {REST}
    </Collapsible>
  ),
}

/** The trigger a screen uses: a `Button`, which takes the trigger's place
 *  (`asChild`) and keeps its look, focus ring and keys. */
export const WithButtonTrigger: Story = {
  render: (args) => (
    <Collapsible {...args} className="w-72">
      <CollapsibleTrigger asChild>
        <Button variant="outline" size="row">
          Viasna
          <ChevronsUpDown />
        </Button>
      </CollapsibleTrigger>
      {REST}
    </Collapsible>
  ),
}
