import type { Meta, StoryObj } from "@storybook/react-vite"
import { Meter } from "./meter"

const meta = {
  title: "UI/Meter",
  component: Meter,
  args: { sides: [0.5], tone: "signal" },
  decorators: [
    (Story) => (
      <div className="w-72">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Meter>

export default meta
type Story = StoryObj<typeof meta>

/** The level the signal check shows, in the level's green. */
export const Signal: Story = {}

export const Silent: Story = { args: { sides: [0] } }

export const Full: Story = { args: { sides: [1] } }

/** A stereo track: the first side above, the second below. */
export const Stereo: Story = { args: { sides: [0.8, 0.35] } }

/** A dead half of a pair has to be seen, or the check has not done its job. */
export const OneSideDead: Story = { args: { sides: [0.7, 0] } }

/** Notes coming in are grey, in the text's colour, in both themes: they are
 *  not a sound and have no level to set. */
export const Notes: Story = { args: { tone: "notes", sides: [0.6] } }

/** Both tones at the same readings. */
export const Readings: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      {(["signal", "notes"] as const).map((tone) => (
        <div key={tone} className="flex flex-col gap-2">
          <span className="text-xs text-muted-foreground">{tone}</span>
          {[0, 0.25, 0.5, 0.75, 1].map((v) => (
            <Meter key={v} tone={tone} sides={[v]} />
          ))}
        </div>
      ))}
    </div>
  ),
}

/** Given a `label` it is a `meter` a screen reader can read, at its largest
 *  side as a percent; without one it is a picture, hidden from it. */
export const Labelled: Story = { args: { sides: [0.4, 0.6], label: "Drums level" } }

/** As wide as the place it is given: here a bar beside its word, as the
 *  check shows it. */
export const BesideItsWord: Story = {
  render: (args) => (
    <div className="flex items-center gap-2">
      <Meter {...args} className="flex-1" />
      <span className="w-12 text-xs text-signal">signal</span>
    </div>
  ),
}
