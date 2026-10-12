import { cn } from "@/lib/utils"

/**
 * A name that goes onto a second line when it is longer than its place is
 * wide, rather than losing its end (spec D5): a track's in its row.
 * One line all the same: Enter does what it did in the one-line field this
 * replaced, nothing (focus stays, so a Space after it is typed, and does not
 * start the rehearsal), and a line break pasted into it becomes a space.
 *
 * The field takes its height from a copy of its text laid out the same way
 * beside it, unseen, so the browser grows it as it wraps: nothing is measured
 * by a script, and nothing jumps when it is first drawn.
 *
 * Bare at rest: a frame round every name in a band's rows would read as a
 * form. A light fill shows under the pointer, and the shared focus ring while
 * it is typed in. Both reach 8 px past the words on each side, so the words
 * stay where a bare name's are.
 */
export function NameField({
  label,
  value,
  onChange,
  placeholder,
  className,
}: {
  /** What the field is called: "Track 1 name". */
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}) {
  // The same box for both: padding, size, line height and where lines break.
  const text = "px-0 py-1.5 text-sm leading-5 break-words whitespace-pre-wrap"
  return (
    <div
      className={cn(
        "-mx-2 grid min-w-0 flex-1 rounded-md px-2 transition-colors hover:bg-accent/60",
        "focus-within:bg-transparent focus-within:ring-[3px] focus-within:ring-ring/50",
        className
      )}
    >
      {/* The space after it keeps an empty field one line tall. */}
      <span aria-hidden className={cn("invisible col-start-1 row-start-1", text)}>
        {value + " "}
      </span>
      <textarea
        rows={1}
        value={value}
        aria-label={label}
        placeholder={placeholder}
        spellCheck={false}
        onChange={(e) => onChange(e.target.value.replace(/\s*[\r\n]+\s*/g, " "))}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.preventDefault()
        }}
        className={cn(
          "col-start-1 row-start-1 block size-full min-w-0 resize-none overflow-hidden border-0 bg-transparent outline-none",
          "selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground",
          text
        )}
      />
    </div>
  )
}
