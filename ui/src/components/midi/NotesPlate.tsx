import { InstrumentIcon } from "@/components/InstrumentIcon"
import { MidiGlyph } from "@/components/midi/MidiGlyph"
import { LanePlate } from "@/components/ui/lane-plate"

/** The least a notes plate is tall at the Appearance scale of 1, and so the
 *  lane beside it: room to name six drum rows, 11 px each (NotesLane's
 *  LABEL_MIN_PX) between 3 px above and below, and under the 1 px line a lower
 *  half has. Its own text takes 69, which left the drums' rows unnamed; a lane
 *  of notes is not so short that a kit cannot be read.
 *
 *  It grows with the scale, as the plate's text does. It does not shrink with
 *  it: the row names are 9 px whatever the scale, so six of them need these
 *  pixels on a smaller one too. */
const MIN_PX = 73
const MIN_HEIGHT = `max(${MIN_PX}px, ${MIN_PX / 16}rem)`

/**
 * The plate beside a lane of notes: what the notes are, the port they came
 * from, and that they are for a DAW. Nothing to mute, solo or turn up: the
 * app never plays them.
 *
 * It is the audio plate's own box (ui/lane-plate) with other things in it.
 * Paired, it is the lower half of a Both track's card, under its audio plate
 * and a line, and says MIDI with the MIDI sign: the name and the icon are on
 * the half above. On its own, for a track that records MIDI only, it has the
 * track's icon and name.
 *
 * Its height is what it holds, and no less than MIN_HEIGHT: the lane beside it
 * grows to it. A long name or port goes onto more lines rather than losing
 * its end.
 */
export function NotesPlate({
  name,
  icon,
  port,
  paired = false,
  missing = false,
}: {
  name: string
  /** The band's icon for the track; none draws the neutral one. */
  icon?: string
  /** The name of the port the notes came from, or were to come from. */
  port: string
  /** The lower half of the track's card, under its audio. */
  paired?: boolean
  /** The port was not there the whole take, and no .mid was saved. */
  missing?: boolean
}) {
  return (
    <LanePlate
      data-notes-plate={name}
      data-paired={paired || undefined}
      data-missing={missing || undefined}
      half={paired ? "bottom" : undefined}
      className="gap-2"
      style={{ minHeight: MIN_HEIGHT }}
    >
      <div className="flex items-center gap-2">
        {paired ? (
          <MidiGlyph className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <InstrumentIcon icon={icon} className="size-4 shrink-0 text-muted-foreground" />
        )}
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm leading-4 [overflow-wrap:anywhere]">
            {paired ? "MIDI" : name}
          </span>
          {port && (
            <span className="text-[11px] leading-3.5 text-muted-foreground [overflow-wrap:anywhere]">
              {port}
            </span>
          )}
        </span>
      </div>
      <span className="text-[11px] leading-3.5 text-muted-foreground">
        {missing ? "Not connected, no .mid saved" : "Saved as .mid, not played here"}
      </span>
    </LanePlate>
  )
}
