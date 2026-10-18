import { Fragment, useCallback, useEffect, useRef, useState } from "react"
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
import { Spinner } from "@/components/ui/spinner"
import { Whole } from "@/components/ui/whole"
import { FooterRow } from "@/components/FooterRow"
import { Shell } from "@/components/Shell"
import { RunningLine } from "@/components/RunningLine"
import { useAfter } from "@/hooks/useAfter"
import { api, type Draft } from "@/lib/api"
import { countOf, formatMMSS, formatWhen } from "@/lib/format"
import { wentTo } from "@/lib/deletion"
import { useActivity, watching } from "@/lib/activity"
import { rise } from "@/lib/motion"
import { dismiss, notify } from "@/lib/notices"
import { SPINNER_AFTER_MS } from "@/lib/playLook"
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

/** What the screen is doing, to the take in `dir`: recovering it from its
 *  row or the footer, discarding it, or recovering it as one of Recover all.
 *  `many` is whether more than one take was listed when it was pressed: the
 *  footer's word and the rows' own Recover stay as they were until it ends. */
type Busy = { dir: string; job: "recover" | "discard" | "all"; many: boolean }

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
  // The list as it stands, for a call that answers late: Recover all, a
  // recovery and an Undo each change it while the others wait, and each goes
  // on from what the others left.
  const listed = useRef(drafts)
  const [busy, setBusy] = useState<Busy | null>(null)
  // Whether this list is still the one on screen: an Undo or a recovery can
  // answer after it closed, by its last take or by Decide later.
  const shown = useRef(true)
  useEffect(() => {
    shown.current = true
    return () => {
      shown.current = false
    }
  }, [])
  // Decide later was pressed: Recover all stops after the take in hand. The
  // screen goes only once Python has answered, and the run does not wait
  // for that.
  const leaving = useRef(false)
  // Turning a long take's raw tracks into .wav takes real seconds.
  const { entries: work } = useActivity()
  // The journal's progress for a take being recovered, by this list or by
  // the one before it: an Undo can open the list again while a take that
  // list was recovering still is.
  const recovering = (dir: string) =>
    work.find((e) => e.kind === "recover" && e.state === "running" && e.folder === dir) ?? null

  // More than one take: the footer's button is Recover all and each row has
  // its own Recover. While something is going on, as it was when pressed, so
  // the buttons do not change under it.
  const many = busy ? busy.many : remaining.length > 1
  // A recovery that takes a second turns a spinner in its button (B5).
  const slow = useAfter(busy?.job === "recover" || busy?.job === "all", SPINNER_AFTER_MS)
  // A take still recovering for the list before this one: until it is done,
  // nothing here recovers them all.
  const elsewhere = remaining.some((d) => recovering(d.dir) !== null)

  const put = useCallback((list: Draft[]) => {
    listed.current = list
    setRemaining(list)
  }, [])

  // A take recovered or discarded, if it is still listed: a recovery's answer
  // and the journal can both say so. With the last one the list closes,
  // unless it has closed already: after Decide later the app stays where it
  // is.
  const drop = useCallback(
    (dir: string) => {
      if (!listed.current.some((d) => d.dir === dir)) return
      const rest = listed.current.filter((d) => d.dir !== dir)
      put(rest)
      if (rest.length === 0 && shown.current) onDone()
    },
    [put, onDone]
  )

  // A take the journal says is recovered leaves the list, also when the list
  // before this one recovered it. One that failed stays.
  useEffect(() => {
    for (const e of work) {
      if (e.kind === "recover" && e.state === "done" && e.folder !== null) drop(e.folder)
    }
  }, [work, drop])

  // One take through Python: null once it is recovered, else the reason it
  // was not.
  const recoverOne = async (draft: Draft): Promise<string | null> => {
    dismiss(SAID)
    const res = await watching(api().recover_draft(draft.dir))
    // A crop's Undo of it that was waiting, Python has ended, however the
    // recovery went.
    endedByPython(res.ended)
    if (!res.ok) return res.error ?? "Could not recover the take"
    drop(draft.dir)
    return null
  }

  // Busy stays set once the list is empty: it is going, and the footer
  // keeps its word until it has gone.
  const recover = async (draft: Draft) => {
    setBusy({ dir: draft.dir, job: "recover", many })
    const error = await recoverOne(draft)
    if (listed.current.length) setBusy(null)
    if (error) notify({ key: SAID, kind: "error", text: error })
  }

  // The takes listed when it was pressed, one after another; one an Undo
  // brings back meanwhile joins the list, not the run. It stops at a take
  // that fails, and after the take in hand once Decide later is pressed: the
  // rest wait for next time. Pressed again after a Decide later that did not
  // close the list, it runs.
  const recoverAll = async () => {
    leaving.current = false
    const pressed = listed.current
    for (const draft of pressed) {
      if (!shown.current || leaving.current) break
      setBusy({ dir: draft.dir, job: "all", many: true })
      const error = await recoverOne(draft)
      if (error) {
        notify({
          key: SAID,
          kind: "error",
          text: `Recover all stopped at “${draft.rehearsal_name}”: ${error}`,
        })
        break
      }
    }
    if (listed.current.length) setBusy(null)
  }

  // Asks nothing: Undo brings the take back, into this list while it is on
  // screen, or with the list again once it has closed. Which, is decided
  // when the Undo comes, not when the take went. Named as the list names
  // it, by its rehearsal.
  const discard = async (draft: Draft) => {
    setBusy({ dir: draft.dir, job: "discard", many })
    dismiss(SAID)
    const res = await api().discard_draft(draft.dir)
    endedByPython(res.ended)
    if (res.ok) drop(draft.dir)
    if (listed.current.length) setBusy(null)
    if (!res.ok) {
      notify({ key: SAID, kind: "error", text: res.error ?? "Could not discard the take" })
      return
    }
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
        // This take back, and only it: one recovered or discarded while the
        // list was being read stays gone.
        if (shown.current) {
          put(now.filter((d) => d.dir === draft.dir || listed.current.some((l) => l.dir === d.dir)))
        } else onReopen()
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
            <div className="flex items-center gap-3">
              {/* Works while a take recovers, to leave the rest for next
                  time. */}
              <Button
                variant="outline"
                size="footer-aside"
                onClick={() => {
                  leaving.current = true
                  onDone()
                }}
              >
                Decide later
              </Button>
              {/* The screen's main button, rightmost: the one take, or all
                  of them one after another. With none left it waits for the
                  screen to go: the journal can empty the list while nothing
                  here is busy. */}
              <Button
                size="footer"
                onClick={() => void (many ? recoverAll() : recover(remaining[0]))}
                disabled={busy !== null || remaining.length === 0 || elsewhere}
              >
                {slow && busy?.job === (many ? "all" : "recover") ? (
                  <Spinner after={0} className="size-5" />
                ) : (
                  <Save />
                )}
                {many ? "Recover all" : "Recover"}
              </Button>
            </div>
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
              // The journal's progress for this take, if it is being
              // recovered; while it is, its buttons wait.
              const running = recovering(draft.dir)
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
                        disabled={busy !== null || running !== null}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 />
                        Discard
                      </Button>
                      {/* With more than one take a row has its own Recover,
                          for this take alone; in outline, since the
                          footer's is the main one. */}
                      {many && (
                        <Button
                          variant="outline"
                          size="row"
                          aria-label={`Recover ${draft.rehearsal_name}, ${length}`}
                          onClick={() => void recover(draft)}
                          disabled={busy !== null || running !== null}
                        >
                          {slow && busy?.job === "recover" && busy.dir === draft.dir ? (
                            <Spinner after={0} />
                          ) : (
                            <Save />
                          )}
                          Recover
                        </Button>
                      )}
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
