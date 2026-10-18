import { Fragment, useEffect, useRef, useState } from "react"
import { Save, Trash2 } from "lucide-react"
import { Warning } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemSeparator,
  ItemTitle,
} from "@/components/ui/item"
import { Whole } from "@/components/ui/whole"
import { FooterRow } from "@/components/FooterRow"
import { Shell } from "@/components/Shell"
import { RunningLine } from "@/components/RunningLine"
import { api, type Draft } from "@/lib/api"
import { countOf, formatMMSS, formatWhen } from "@/lib/format"
import { wentTo } from "@/lib/deletion"
import { useActivity, watching } from "@/lib/activity"
import { rise } from "@/lib/motion"
import { dismiss, notify } from "@/lib/notices"
import { endedByPython, offerUndo } from "@/lib/trash"

/**
 * Takes that were recorded but never saved — the app was closed or died
 * mid-take. Their audio is on disk as raw PCM, so nothing plays it yet; here
 * it can be turned into a normal take or thrown away.
 *
 * Shown on startup, before anything else, because ignoring it silently is how
 * a rehearsal gets lost.
 */
// What an action here said — one slot, so each says over the last.
const SAID = "drafts"

export function DraftsScreen({
  drafts,
  onDone,
  onReopen,
}: {
  drafts: Draft[]
  onDone: () => void
  /** The list again, after it closed: an Undo brought back a take that
   *  was discarded from it. */
  onReopen: () => void
}) {
  const [remaining, setRemaining] = useState(drafts)
  const [busy, setBusy] = useState<string | null>(null)
  // Whether this list is still the one on screen: an Undo can come after it
  // closed, its last take discarded since.
  const shown = useRef(true)
  useEffect(() => {
    shown.current = true
    return () => {
      shown.current = false
    }
  }, [])
  // Turning a long take's raw tracks into .wav takes real seconds.
  const { entries: work } = useActivity()

  const finish = (rest: Draft[]) => {
    setRemaining(rest)
    if (rest.length === 0) onDone()
  }

  const recover = async (draft: Draft) => {
    setBusy(draft.dir)
    dismiss(SAID)
    const res = await watching(api().recover_draft(draft.dir))
    setBusy(null)
    // A crop's Undo of it that was waiting, Python has ended, however the
    // recovery went.
    endedByPython(res.ended)
    if (!res.ok) {
      notify({ key: SAID, kind: "error", text: res.error ?? "Could not recover the take" })
      return
    }
    finish(remaining.filter((d) => d.dir !== draft.dir))
  }

  // Asks nothing: Undo brings the take back, into this list while it is on
  // screen, or with the list again once it has closed. Which, is decided
  // when the Undo comes, not when the take went. Named as the list names
  // it, by its rehearsal.
  const discard = async (draft: Draft) => {
    setBusy(draft.dir)
    dismiss(SAID)
    const res = await api().discard_draft(draft.dir)
    setBusy(null)
    endedByPython(res.ended)
    if (!res.ok) {
      notify({ key: SAID, kind: "error", text: res.error ?? "Could not discard the take" })
      return
    }
    finish(remaining.filter((d) => d.dir !== draft.dir))
    if (!res.undo) return
    offerUndo({
      text: wentTo(`“${draft.rehearsal_name}”`),
      token: res.undo,
      onUndone: async () => {
        if (!shown.current) {
          onReopen()
          return
        }
        const now = await api().list_drafts()
        if (shown.current) setRemaining(now)
        else onReopen()
      },
    })
  }

  return (
    <Shell
      air
      className="px-8 [--screen-pad-y:2rem]"
      title="Unsaved takes found"
      footer={
        <div className="animate-rise" style={rise(1)}>
          <FooterRow
            left={
              <p className="text-xs text-muted-foreground">
                They stay on disk and will be offered again next time.
              </p>
            }
          >
            <Button variant="outline" size="footer-aside" onClick={onDone}>
              Decide later
            </Button>
          </FooterRow>
        </div>
      }
    >
      <div className="mx-auto max-w-3xl">
        {/* The takes are one group, the warning at its head and a row to a
            take under it, split by 1 px lines. */}
        <Card data-drafts className="animate-rise gap-0 p-0" style={rise(0)}>
          <div className="p-6">
            <Warning>
              Recover a take to add it to its rehearsal. The app closed while these takes were
              recording, so they were never saved. The audio is intact.
            </Warning>
          </div>
          <ItemGroup>
            {remaining.map((draft) => {
              // The journal's progress for this take, if it is being recovered.
              const running =
                work.find(
                  (e) => e.kind === "recover" && e.state === "running" && e.folder === draft.dir
                ) ?? null
              const length = formatMMSS(draft.duration_sec)
              return (
                <Fragment key={draft.dir}>
                  <ItemSeparator />
                  {/* A row goes nowhere, so it is a plain box. No border: Item's
                      transparent one would put the title 25 px in, not the 24 of
                      the warning's box. */}
                  <Item
                    size="sm"
                    role="listitem"
                    data-draft={draft.dir}
                    className="flex-nowrap gap-4 border-0 px-6 py-4"
                  >
                    <ItemContent className="min-w-0 gap-0.5">
                      {/* Two lines, then cut and whole in the tip; a Tab stop
                          while it is cut, since nothing else here says it. */}
                      <ItemTitle className="w-full">
                        <Whole
                          text={draft.rehearsal_name}
                          reach
                          className="line-clamp-2 min-w-0 break-words"
                        />
                      </ItemTitle>
                      {/* While it recovers, the progress takes the line's
                          place. Both are 16 px tall, so the row keeps its
                          height (B4). */}
                      {running ? (
                        <RunningLine entry={running} label="Recovering" />
                      ) : (
                        <ItemDescription className="text-xs leading-4">
                          {formatWhen(draft.created_at)} · {countOf(draft.tracks.length, "track")} ·{" "}
                          <span className="tnum">{length}</span>
                        </ItemDescription>
                      )}
                    </ItemContent>
                    <ItemActions>
                      {/* Named by their take, and by its length: two takes of
                          one rehearsal differ only by that. */}
                      <Button
                        variant="ghost"
                        size="row"
                        aria-label={`Discard ${draft.rehearsal_name}, ${length}`}
                        onClick={() => void discard(draft)}
                        disabled={busy !== null}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 />
                        Discard
                      </Button>
                      <Button
                        size="row"
                        aria-label={`Recover ${draft.rehearsal_name}, ${length}`}
                        onClick={() => recover(draft)}
                        disabled={busy !== null}
                      >
                        <Save />
                        Recover
                      </Button>
                    </ItemActions>
                  </Item>
                </Fragment>
              )
            })}
          </ItemGroup>
        </Card>
      </div>
    </Shell>
  )
}
