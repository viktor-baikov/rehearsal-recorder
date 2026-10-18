import { X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Whole } from "@/components/ui/whole"

/**
 * A song's old names, under its title: the titles it had and the songs
 * merged into it, which typed in a name field are this song (rename and
 * merge songs spec, D6-D8). Each is a badge with ✕ to forget it: typed
 * again, it is a new song, which the ✕'s tip says. A name too long for the
 * line is cut, whole on hover. Nothing with none.
 */
export function OldNames({
  names,
  onForget,
}: {
  names: string[]
  onForget: (name: string) => void
}) {
  if (names.length === 0) return null
  return (
    <div
      data-old-names
      className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-muted-foreground"
    >
      <span>Also typed as</span>
      {names.map((name) => (
        // The ✕ fills the badge's height at its end. The name is cut on its
        // own, so the badge cuts nothing and the ✕'s focus ring shows whole.
        <Badge
          key={name}
          variant="outline"
          className="max-w-full min-w-0 gap-0.5 overflow-visible py-0 pr-0 pl-2.5 font-normal"
        >
          <Whole text={name} className="min-w-0 truncate" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-tiny"
                aria-label={`Forget ${name}`}
                onClick={() => onForget(name)}
                className="rounded-full text-muted-foreground hover:text-foreground"
              >
                <X />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Forget {name}: typed again, it is a new song</TooltipContent>
          </Tooltip>
        </Badge>
      ))}
    </div>
  )
}
