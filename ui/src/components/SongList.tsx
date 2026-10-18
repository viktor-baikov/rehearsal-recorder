import { HistoryRow } from "@/components/HistoryRow"
import type { SongIndex } from "@/lib/api"
import { inSongOrder, notNamedLine, songLine, type SongRef } from "@/lib/songs"

/**
 * History's Songs view, down the left: every song with a take, in
 * alphabetical order, and the takes nobody named last. A song is where it
 * was last time whatever the band played since, which a list by date could
 * not promise.
 */
export function SongList({
  index,
  current,
  onChoose,
}: {
  index: SongIndex
  current: SongRef | null
  onChoose: (ref: SongRef) => void
}) {
  const byId = new Map(index.songs.map((s) => [s.id, s]))
  return (
    <div className="flex flex-col gap-1">
      {inSongOrder(index).map((ref) => {
        const song = ref === "not_named" ? null : byId.get(ref)
        const title = song ? song.title : "Not named"
        const line = song ? songLine(song) : index.not_named ? notNamedLine(index.not_named) : ""
        return (
          <HistoryRow
            key={ref}
            data-song={title}
            data-song-ref={ref}
            name={title}
            nameClassName={song ? "text-base font-semibold" : "text-sm text-muted-foreground"}
            figures={
              song && song.starred > 0
                ? [
                    {
                      text: `${song.starred} starred`,
                      keep: 0,
                      node: <span className="text-signal">★ {song.starred}</span>,
                    },
                  ]
                : []
            }
            current={ref === current}
            onClick={() => onChoose(ref)}
            // Set apart from the songs by the air over it and its grey words.
            className={song ? undefined : "mt-2"}
          >
            <span className="truncate text-xs text-muted-foreground">{line}</span>
          </HistoryRow>
        )
      })}
    </div>
  )
}
