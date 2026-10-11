import type { Meta, StoryObj } from "@storybook/react-vite"
import { LaneControls, MasterControls } from "@/components/LaneControls"
import { NotesLane } from "@/components/midi/NotesLane"
import { NotesPlate } from "@/components/midi/NotesPlate"
import { Waveform } from "@/components/Waveform"
import { laneHalf } from "@/lib/laneHalf"
import { cn } from "@/lib/utils"
import type { TakeNotes } from "@/lib/api"
import { LanePlate } from "./lane-plate"

const meta = {
  title: "UI/LanePlate",
  component: LanePlate,
  // The width of the player's column of plates.
  decorators: [
    (Story) => (
      <div className="w-50">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof LanePlate>

export default meta
type Story = StoryObj<typeof meta>

const noop = () => {}

/* The audio plate and the master are LanePlate with their things in it; the
   stories show them as the player does, an audio plate in its 56 px row. */
function Audio({ paired = false }: { paired?: boolean }) {
  return (
    <div className="h-14">
      <LaneControls
        name="Guitar"
        icon="guitar-electric"
        paired={paired}
        channels={1}
        muted={false}
        soloed={false}
        dimmed={false}
        volume={0.8}
        levels={[0.45]}
        onToggleMute={noop}
        onToggleSolo={noop}
        onVolume={noop}
        onVolumeCommit={noop}
      />
    </div>
  )
}

/** A track's plate in its row of 56 px: the card's fill with no frame, the
 *  name with M and S on one row and the fader under it. */
export const Single: Story = { render: () => <Audio /> }
/** The same on the light theme, whatever the toolbar says. */
export const SingleLight: Story = { ...Single, globals: { theme: "light" } }

/** A track that records notes too is one card of two halves: the audio plate
 *  above, with its lower corners square, and the notes' plate below, with its
 *  upper corners square and a 1 px line on top in the border colour. */
export const Halves: Story = {
  render: () => (
    <div className="flex flex-col">
      <Audio paired />
      <NotesPlate name="Guitar" port="Launchkey Mini MK3" paired />
    </div>
  ),
}
export const HalvesLight: Story = { ...Halves, globals: { theme: "light" } }

/** The notes' plate is a variant of the same one: on its own for a track that
 *  records MIDI only, and the same for a port that was not there. It is as tall
 *  as what it holds, and no less than its lane needs to name a kit's rows. */
export const Notes: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <NotesPlate name="Keys" icon="keys" port="Launchkey Mini MK3" />
      <NotesPlate name="Pads" icon="keys" port="Pad box" missing />
    </div>
  ),
}
export const NotesLight: Story = { ...Notes, globals: { theme: "light" } }

/** The master's plate, under the tracks, is the third use of it. */
export const Master: Story = {
  render: () => (
    <MasterControls volume={0.8} level={0.5} onVolume={noop} onVolumeCommit={noop} />
  ),
}
export const MasterLight: Story = { ...Master, globals: { theme: "light" } }

const PEAKS = [Array.from({ length: 160 }, (_, i) => Math.abs(Math.sin(i / 7)) * 0.85)]

const KIT: TakeNotes = {
  name: "Drums",
  drums: true,
  rows: ["Crash", "Ride", "Hi-hat", "Toms", "Snare", "Kick"],
  notes: [
    [0.4, 0.1, 0, 100],
    ...Array.from({ length: 20 }, (_, i): [number, number, number, number] => [i * 0.5, 0.1, 2, 80]),
    ...Array.from({ length: 10 }, (_, i): [number, number, number, number] => [i, 0.1, i % 2 ? 4 : 5, 110]),
  ],
}

/** A plate and its lane are one box, cut by the same function (laneHalf): a
 *  Both track's two lanes meet as its two plates do. */
export const Both: Story = {
  decorators: [
    (Story) => (
      <div className="w-3xl">
        <Story />
      </div>
    ),
  ],
  render: () => (
    <div className="grid grid-cols-[12.5rem_1fr] gap-x-3">
      <div className="h-14">
        <LaneControls
          name="Drums"
          icon="drums"
          paired
          channels={1}
          muted={false}
          soloed={false}
          dimmed={false}
          volume={0.8}
          levels={[0.45]}
          onToggleMute={noop}
          onToggleSolo={noop}
          onVolume={noop}
          onVolumeCommit={noop}
        />
      </div>
      <Waveform
        peaks={PEAKS}
        peaksFrom={0}
        peaksTo={10}
        viewFrom={0}
        viewTo={10}
        position={3}
        className={cn("h-14", laneHalf("top"))}
      />
      <NotesPlate name="Drums" port="TD-17" paired />
      <NotesLane
        name="Drums"
        data={KIT}
        duration={10}
        playhead={3}
        className={cn("h-full", laneHalf("bottom"))}
      />
    </div>
  ),
}
export const BothLight: Story = { ...Both, globals: { theme: "light" } }
