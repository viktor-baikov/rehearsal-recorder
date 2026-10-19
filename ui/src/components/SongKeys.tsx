import { Kbd } from "@/components/ui/kbd"
import { useKeysOn } from "@/lib/keys"
import { cn } from "@/lib/utils"

/**
 * ↑ and ↓ at the right of the Next take label: they pick the song before
 * or after (issue #12 step 8, K5). Hidden while a take is open, when they
 * are the strip's; hidden, not taken away, so the field does not move.
 * With the player's keys off in Settings › Keys they are not there at all.
 */
export function SongKeys({ hidden = false }: { hidden?: boolean }) {
  const on = useKeysOn("player")
  if (!on) return null
  return (
    <span
      data-song-keys
      aria-hidden
      className={cn(
        "flex shrink-0 items-center gap-1 text-xs text-muted-foreground",
        hidden && "invisible"
      )}
    >
      <Kbd>↑</Kbd>
      <Kbd>↓</Kbd>
      <span>song</span>
    </span>
  )
}
