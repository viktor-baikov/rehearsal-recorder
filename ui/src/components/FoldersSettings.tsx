import { useEffect, useState } from "react"
import { CloudUpload, FolderOpen, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SAID } from "@/components/SettingsGroup"
import { dismiss, notify } from "@/lib/notices"
import { loadLabels } from "@/lib/labels"
import { endEveryOffer, endedByPython, keptText } from "@/lib/trash"
import { api, type CloudFormat, type Settings, type ShareWhat } from "@/lib/api"

// Wording matches ShareDialog's manual share options, since the two places
// talk about the same three choices.
const AUTO_PUBLISH_OPTIONS: { id: ShareWhat; label: string; hint: string }[] = [
  {
    id: "mix",
    label: "The mix",
    hint: "One stereo file with the balance you set here. This is what you send people.",
  },
  {
    id: "tracks",
    label: "The original tracks",
    hint: "Every track as recorded, untouched, and the notes as .mid — for opening in a DAW later.",
  },
  {
    id: "both",
    label: "Both",
    hint: "The mix to listen to, the tracks to work from.",
  },
]

/**
 * Settings › Folders: where rehearsals are kept, how short a false start is,
 * and the cloud folder with what goes to it. It reads the settings when it
 * opens.
 */
export function FoldersSettings() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [dir, setDir] = useState("")
  const [cloudDir, setCloudDir] = useState("")
  const [falseStart, setFalseStart] = useState("")

  useEffect(() => {
    ;(async () => {
      const s = await api().get_settings()
      setSettings(s)
      setDir(s.recordings_dir)
      setCloudDir(s.cloud_dir ?? "")
      setFalseStart(String(s.false_start_sec))
    })()
  }, [])

  // Saved when the field is left. Python keeps it within 5 to 120, and the
  // field then says what was kept; left empty or not a number, it goes back.
  const applyFalseStart = async () => {
    if (!settings) return
    const seconds = Math.round(Number(falseStart))
    if (falseStart.trim() === "" || !Number.isFinite(seconds)) {
      setFalseStart(String(settings.false_start_sec))
      return
    }
    if (seconds === settings.false_start_sec) {
      setFalseStart(String(seconds))
      return
    }
    dismiss(SAID)
    const res = await api().set_false_start(seconds)
    if (!res.ok || res.false_start_sec === undefined) {
      notify({ key: SAID, kind: "error", text: res.error ?? "Could not save that" })
      setFalseStart(String(settings.false_start_sec))
      return
    }
    setFalseStart(String(res.false_start_sec))
    setSettings({ ...settings, false_start_sec: res.false_start_sec })
  }

  const applyDir = async (path: string) => {
    dismiss(SAID)
    const res = await api().set_recordings_dir(path)
    if (!res.ok) {
      notify({ key: SAID, kind: "error", text: res.error ?? "Could not use that folder" })
      return
    }
    setDir(res.recordings_dir ?? path)
    // Another library: other labels.
    void loadLabels()
    notify({ key: SAID, kind: "done", text: "Folder saved" })
    switched(res)
  }

  // Removals waiting for their Undo in the old folder were ended before the
  // switch (`ended`), so their notices go, and so do the offers of any that
  // could not end: their Undo would ask the new folder. Those stay in the
  // old one, where nothing will look again, so they are named now, and the
  // warning stays until it is closed. The folder in use chosen again is no
  // switch (`same`): its offers stay.
  const switched = ({
    kept,
    ended,
    same,
  }: {
    kept?: string[]
    ended?: string[]
    same?: boolean
  }) => {
    if (same) return
    endedByPython(ended)
    endEveryOffer()
    if (kept?.length) notify({ key: "kept", kind: "warning", text: keptText(kept) })
  }

  const applyCloudDir = async (path: string) => {
    dismiss(SAID)
    const res = await api().set_cloud_dir(path)
    if (!res.ok) {
      notify({ key: SAID, kind: "error", text: res.error ?? "Could not use that folder" })
      return
    }
    setCloudDir(res.cloud_dir ?? path)
    setSettings(await api().get_settings())
    notify({ key: SAID, kind: "done", text: "Cloud folder saved" })
  }

  const browseCloud = async () => {
    dismiss(SAID)
    const res = await api().choose_cloud_dir()
    if (res.cancelled) return
    if (!res.ok) {
      notify({
        key: SAID,
        kind: "error",
        text: res.error ?? "Could not open the folder picker",
      })
      return
    }
    setCloudDir(res.cloud_dir ?? cloudDir)
    setSettings(await api().get_settings())
    notify({ key: SAID, kind: "done", text: "Cloud folder saved" })
  }

  const browse = async () => {
    dismiss(SAID)
    const res = await api().choose_recordings_dir()
    if (res.cancelled) return
    if (!res.ok) {
      notify({
        key: SAID,
        kind: "error",
        text: res.error ?? "Could not open the folder picker",
      })
      return
    }
    setDir(res.recordings_dir ?? dir)
    // Another library: other labels.
    void loadLabels()
    notify({ key: SAID, kind: "done", text: "Folder saved" })
    switched(res)
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <div>
          <Label htmlFor="recordings-dir">Recordings folder</Label>
          <p className="mt-1 text-xs text-muted-foreground">
            Where everything is recorded to.
          </p>
        </div>

        <div className="flex gap-2">
          <Input
            id="recordings-dir"
            value={dir}
            onChange={(e) => setDir(e.target.value)}
            onBlur={() => {
              if (settings && dir !== settings.recordings_dir) applyDir(dir)
            }}
            spellCheck={false}
            className="font-mono text-xs"
          />
          <Button
            variant="outline"
            onClick={browse}
            aria-label="Choose recordings folder"
            className="shrink-0"
          >
            <FolderOpen />
            Browse
          </Button>
        </div>

        {settings?.path_warning && (
          <p className="text-xs text-warn">{settings.path_warning}</p>
        )}

        {settings && dir !== settings.default_recordings_dir && (
          <Button
            variant="ghost"
            size="row"
            className="self-start text-muted-foreground"
            onClick={() => applyDir(settings.default_recordings_dir)}
          >
            <RotateCcw />
            Back to the default folder
          </Button>
        )}
      </section>

      <section className="flex flex-col gap-3 border-t pt-6">
        <div>
          <Label htmlFor="false-start">False starts</Label>
          <p className="mt-1 text-xs text-muted-foreground">
            A take this short, with no ★ and no marks, is shown as a false
            start on the rehearsal screen and in History, where Clear false
            starts clears them all at once, after asking.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span>Shorter than</span>
          <Input
            id="false-start"
            type="number"
            min={5}
            max={120}
            step={1}
            value={falseStart}
            onChange={(e) => setFalseStart(e.target.value)}
            onBlur={() => void applyFalseStart()}
            onKeyDown={(e) => {
              if (e.key === "Enter") void applyFalseStart()
            }}
            className="tnum w-20"
          />
          <span>seconds</span>
        </div>
      </section>

      <section className="flex flex-col gap-3 border-t pt-6">
        <div>
          <Label htmlFor="cloud-dir">Cloud folder</Label>
          <p className="mt-1 text-xs text-muted-foreground">
            Where the takes you pick out are copied. Point it at a Drive or
            Dropbox folder — deliberately not the recordings folder, so only
            the takes worth keeping go up, one at a time.
          </p>
        </div>

        <div className="flex gap-2">
          <Input
            id="cloud-dir"
            value={cloudDir}
            onChange={(e) => setCloudDir(e.target.value)}
            onBlur={() => {
              if (settings && cloudDir !== (settings.cloud_dir ?? ""))
                applyCloudDir(cloudDir)
            }}
            placeholder="Not set — nothing is copied anywhere"
            spellCheck={false}
            className="font-mono text-xs"
          />
          <Button
            variant="outline"
            onClick={browseCloud}
            aria-label="Choose cloud folder"
            className="shrink-0"
          >
            <CloudUpload />
            Browse
          </Button>
        </div>

        {settings?.cloud_dir && (
          <Button
            variant="ghost"
            size="row"
            className="self-start text-muted-foreground"
            onClick={async () => {
              await api().clear_cloud_dir()
              setCloudDir("")
              setSettings(await api().get_settings())
            }}
          >
            <RotateCcw />
            Forget the cloud folder
          </Button>
        )}

        {/* The cloud folder is the gate. Without one there are no copies,
            so none of the questions below have a subject: what a copy is
            written as, whether it goes on its own, what of it goes. They
            are not greyed out but absent — the field above says the whole
            of it, "Not set, nothing is copied anywhere", with its own
            Browse beside it. Greyed out they were five dead rows and three
            sentences explaining copies that cannot happen, which is not
            what "say why it will not work" is for: that is for a control
            somebody is reaching for, not for a subject that does not exist
            yet. */}
        {settings?.cloud_dir && (
          <>
            {/* What a copy is written as comes first, right under the folder:
                it is the one setting here that holds whether or not anything is
                sent automatically, since it governs the takes sent by hand too.
                Sending on its own, and what it sends, follow.

                Both questions are a heading, their choices, and the word on the
                choice in force — the heading carrying the weight of one, the
                line under the row reading as its answer. All in the same muted
                grey with the same gap above and below, the lines ran together
                into one block nobody could parse.

                Neither is hidden when it stops applying: a block that comes and
                goes moves everything under it out from beneath the pointer, and
                says nothing about what would happen if the switch above went
                back on. They grey out, the way the checkbox between them
                already does. */}
            <div className="mt-5 flex flex-col gap-1.5">
              <span className="text-sm font-medium">
                What the copies are written as
              </span>
              <div
                role="group"
                aria-label="What the copies are written as"
                className="flex flex-wrap items-center gap-2"
              >
                {(settings?.cloud_formats ?? []).map((f) => (
                  <Button
                    key={f.id}
                    variant={settings?.cloud_format === f.id ? "default" : "outline"}
                    size="row"
                    aria-label={f.label}
                    aria-pressed={settings?.cloud_format === f.id}
                    // Only copies are written in these; with no cloud folder
                    // there are none, and this was a live choice about files
                    // nothing was going to write.
                    onClick={async () => {
                      dismiss(SAID)
                      const res = await api().set_cloud_format(f.id as CloudFormat)
                      if (!res.ok) {
                        notify({ key: SAID, kind: "error", text: res.error ?? "Could not save that" })
                        return
                      }
                      setSettings(await api().get_settings())
                    }}
                  >
                    {f.label}
                  </Button>
                ))}
              </div>
              {(settings?.cloud_formats ?? []).find(
                (f) => f.id === settings?.cloud_format
              ) && (
                <p className="text-xs text-muted-foreground">
                  {
                    (settings?.cloud_formats ?? []).find(
                      (f) => f.id === settings?.cloud_format
                    )?.hint
                  }
                </p>
              )}

              {settings?.encoder_hint && settings.cloud_format !== "wav" && (
                <p className="text-xs text-warn">{settings.encoder_hint}</p>
              )}
              {/* Not about the choice above but about all of them, so it is set
                  apart rather than stacked under the answer as a second
                  sentence of it. */}
              <p className="mt-3 text-xs text-muted-foreground">
                Only the copies are affected. What was recorded stays untouched
                WAV on disk: it is the one thing here that cannot be made again.
              </p>
            </div>

            <div className="mt-4 flex items-start gap-3">
              <input
                id="auto-publish"
                type="checkbox"
                className="mt-1 size-4"
                checked={settings?.auto_publish ?? false}
                onChange={async (e) => {
                  const on = e.target.checked
                  await api().set_auto_publish(on, settings?.auto_publish_what)
                  setSettings(await api().get_settings())
                }}
              />
              <div className="flex flex-col gap-1">
                <Label htmlFor="auto-publish">Send saved takes automatically</Label>
                <p className="text-xs text-muted-foreground">
                  Every take you keep is copied to the cloud folder on its own,
                  between takes rather than while one is recording.
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-1.5">
              <span className="text-sm font-medium">What gets published</span>
              {/* A row of choices rather than a stack of cards, the way the
                  theme and the scale are chosen: three of these with their
                  explanations under each took most of the screen, and this
                  is a decision made once. The explanation that is worth
                  reading is the one belonging to the choice in force, so
                  that is the one kept. */}
              <div
                role="group"
                aria-label="What gets published"
                className="flex flex-wrap items-center gap-2"
              >
                {AUTO_PUBLISH_OPTIONS.map((o) => (
                  <Button
                    key={o.id}
                    variant={
                      settings?.auto_publish_what === o.id ? "default" : "outline"
                    }
                    size="row"
                    aria-label={o.label}
                    aria-pressed={settings?.auto_publish_what === o.id}
                    // What automatic sending sends, and what Send starred
                    // sends: live whenever there is a cloud folder (with none
                    // this is not drawn at all), and choosing it leaves
                    // automatic sending as it was.
                    onClick={async () => {
                      if (!settings) return
                      dismiss(SAID)
                      const res = await api().set_auto_publish(settings.auto_publish, o.id)
                      if (!res.ok) {
                        notify({ key: SAID, kind: "error", text: res.error ?? "Could not save that" })
                        return
                      }
                      setSettings(await api().get_settings())
                    }}
                  >
                    {o.label}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {AUTO_PUBLISH_OPTIONS.find((o) => o.id === settings?.auto_publish_what)?.hint}
              </p>
              {/* Send starred, over a rehearsal's takes, sends by hand what
                  this says; its tooltip sends people here, and this says so
                  back. */}
              <p className="text-xs text-muted-foreground">This is also what Send starred sends.</p>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
