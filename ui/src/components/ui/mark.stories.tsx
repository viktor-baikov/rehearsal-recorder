import type { Meta, StoryObj } from "@storybook/react-vite"
import { LabelDot, MarkLine } from "./mark"
import { LABEL_COLOURS } from "@/lib/labels"
import type { Label } from "@/lib/api"

const issue: Label = { id: 3, name: "Issue", colour: "red", marks: 12 }
const idea: Label = { id: 4, name: "Idea", colour: "blue", marks: 5 }
const keep: Label = { id: 2, name: "Keep", colour: "green", marks: 3 }

const meta = {
  title: "UI/Mark",
  component: MarkLine,
  args: { label: issue, at: 58, note: "chorus came in early", className: "text-xs" },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MarkLine>

export default meta
type Story = StoryObj<typeof meta>

/** Under its take: the dot, the time, the label and the words. */
export const UnderItsTake: Story = {}

/** Away from its take, as Last time lists a song's marks: the take before the
 *  words. */
export const WithItsTake: Story = { args: { take: "Pałyn 5" } }

/** Nothing written: the label says what the mark is. */
export const NothingWritten: Story = { args: { label: idea, note: "", take: "Sonca" } }

/** Long words are cut at the end of the room; the dot and the time stay. */
export const LongWords: Story = {
  args: {
    label: idea,
    at: 80,
    note: "the second verse drags, count it in faster next time, and the bridge is too long",
    take: "Dancing barefoot on the roof of the old brewery",
  },
}

/** At the size a page's own lines are. */
export const AtTheBodySize: Story = { args: { label: keep, at: 158, note: "this one is the take", className: "text-sm" } }

/** The one dot, in every colour a label can have ("blue" is drawn orange). */
export const Dots: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      {LABEL_COLOURS.map((colour) => (
        <LabelDot key={colour} colour={colour} />
      ))}
    </div>
  ),
}
