import { useState } from "react"
import { GripVertical, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Figures, Whole } from "@/components/ui/whole"
import { SongPills } from "@/components/SongPills"
import { SortableList } from "@/components/SortableList"
import type { SetSong, SongChoices } from "@/lib/api"
import { songNamed } from "@/lib/goes"
import { notInSet } from "@/lib/setSongs"

/** A song taken out with its ✕: its title, and where it was. */
export type SongOut = { title: string; at: number }

/**
 * A set's songs (issue #12 step 8, S3 and T3): numbered in the order they
 * are played, dragged into another by their handles, and ✕ to take one out.
 * Under them, *Add*: *Another song…*, a field for a song not played yet,
 * and the band's other songs as pills, as under a take's name, which
 * typing in the field narrows. A song the band has not played says so,
 * where its name leaves room.
 *
 * `onChange` hears the titles in their new order, and `out`, the song taken
 * out, when it was a ✕; the caller puts them in place at once.
 */
export function SetSongsEditor({
  songs,
  choices,
  onChange,
}: {
  songs: SetSong[]
  choices: SongChoices | null
  onChange: (titles: string[], out?: SongOut) => void
}) {
  const [typed, setTyped] = useState("")
  const titles = songs.map((s) => s.title)
  const left = notInSet(choices, titles)

  const add = (text: string) => {
    // An old name, or a title in other letters, is the song as it is now.
    const title = songNamed(text, choices)?.choice.song ?? text.trim()
    if (title === "") return
    if (!titles.some((t) => t.toLocaleLowerCase() === title.toLocaleLowerCase()))
      onChange([...titles, title])
    setTyped("")
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {songs.length === 0 ? (
        <Empty className="items-start p-0 text-left md:p-0">
          <EmptyHeader className="items-start text-left">
            <EmptyTitle className="text-sm">No songs yet</EmptyTitle>
            <EmptyDescription>Add them below, in the order you play them.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <SortableList
          items={songs.map((s) => ({ id: s.title, song: s }))}
          label="Songs of the set"
          onMove={(id, to) => {
            const next = titles.filter((t) => t !== id)
            next.splice(to, 0, id)
            onChange(next)
          }}
        >
          {({ song }, handleRef) => {
            const at = titles.indexOf(song.title)
            return (
              <div data-set-editor-song={song.title} className="flex h-9 items-center gap-3">
                <Button
                  ref={handleRef}
                  variant="ghost"
                  size="icon-tiny"
                  aria-label={`Move ${song.title}`}
                  className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
                >
                  <GripVertical className="size-4" />
                </Button>
                <span className="tnum w-5 shrink-0 text-right text-xs text-muted-foreground">
                  {at + 1}
                </span>
                {/* The name has the room first: "not played yet" gives way
                    to it, whole (B6). */}
                <Whole text={song.title} className="min-w-0 flex-[0_1_auto] truncate text-sm" />
                {song.new ? (
                  <Figures
                    parts={[{ text: "not played yet", keep: 0 }]}
                    className="text-right text-xs text-muted-foreground"
                  />
                ) : (
                  <span className="flex-1" />
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-tiny"
                      aria-label={`Take ${song.title} out`}
                      onClick={() =>
                        onChange(titles.filter((t) => t !== song.title), { title: song.title, at })
                      }
                      className="rounded-full text-muted-foreground hover:text-foreground"
                    >
                      <X />
                    </Button>
                  </TooltipTrigger>
                  {/* Near enough the button's own name: for the eyes, not
                      read out twice. */}
                  <TooltipContent>
                    <span aria-hidden>Take it out of the set</span>
                  </TooltipContent>
                </Tooltip>
              </div>
            )
          }}
        </SortableList>
      )}

      <div data-set-add className="flex flex-col gap-2">
        <span className="text-xs font-medium text-muted-foreground">Add</span>
        <Input
          aria-label="Another song"
          value={typed}
          placeholder="Another song…"
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return
            e.preventDefault()
            add(typed)
          }}
          className="h-8 max-w-64"
        />
        <SongPills
          choices={left}
          value={typed}
          initial=""
          onPick={add}
          goes={false}
        />
      </div>
    </div>
  )
}
