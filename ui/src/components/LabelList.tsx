import { HistoryRow } from "@/components/HistoryRow"
import { LabelDot } from "@/components/ui/mark"
import type { Label } from "@/lib/api"
import { labelLine } from "@/lib/marks"

/**
 * History's Marks view, down the left: every label, in the order the band
 * gave them in Settings › Marks, with how many marks have it and since
 * when. A label nothing has yet is listed too, dimmed, so the list is the
 * same whatever was marked.
 */
export function LabelList({
  labels,
  current,
  onChoose,
}: {
  labels: Label[]
  current: number | null
  onChoose: (id: number) => void
}) {
  return (
    <div className="flex flex-col gap-1">
      {labels.map((label) => {
        const empty = !label.marks
        return (
          <HistoryRow
            key={label.id}
            data-label={label.id}
            data-empty={empty || undefined}
            data-count={label.marks || undefined}
            lead={<LabelDot colour={label.colour} className={empty ? "opacity-45" : undefined} />}
            name={label.name}
            nameClassName={
              empty ? "text-base font-normal text-muted-foreground" : "text-base font-semibold"
            }
            figures={empty ? [] : [{ text: String(label.marks), keep: 0 }]}
            current={label.id === current}
            onClick={() => onChoose(label.id)}
          >
            {/* Under the name, past the dot. */}
            <span className="truncate pl-4 text-xs text-muted-foreground">{labelLine(label)}</span>
          </HistoryRow>
        )
      })}
    </div>
  )
}
