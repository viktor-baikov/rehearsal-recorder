import { Square } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { RunningLine } from "@/components/RunningLine"
import type { ActivityEntry } from "@/lib/api"
import { useKeysOn } from "@/lib/keys"

/**
 * The recording screen's Stop, and the line under it: the take being saved
 * once it is pressed, and until then that nothing is lost if the power goes.
 * The website shows it too, in a tile.
 *
 * It binds no key: the screen's Space does that, as it does everywhere, and
 * says Space only while Settings › Keys has it on.
 */
export function StopTake({
  onStop,
  stopping,
  saving,
}: {
  onStop: () => void
  stopping: boolean
  saving: ActivityEntry | null
}) {
  const spaceKeys = useKeysOn("space")
  return (
    <>
      <Button
        variant="strong"
        size="footer"
        onClick={onStop}
        disabled={stopping}
        aria-keyshortcuts={spaceKeys ? "Space" : undefined}
      >
        <Square className="fill-current" />
        Stop
        {spaceKeys && <Kbd aria-hidden>Space</Kbd>}
      </Button>
      {stopping ? (
        <RunningLine entry={saving} label="Saving the take" active />
      ) : (
        <p className="text-xs text-muted-foreground">autosaved every 30 s</p>
      )}
    </>
  )
}
