// The design rules, as code (K3). `design-check.mjs` walks src/ and runs these;
// everything here is pure, so design-rules.test.mjs can feed it strings.
//
// It reads source as text, with regular expressions, on purpose: the rules are
// about class names and a handful of literals, a real parser would need the
// TypeScript compiler API (which TS 7 does not ship), and a line-by-line match
// is what lets a finding say `path:line`.
//
// A rule can be waived on one line with a comment saying why, on that line or
// the one above:
//
//   // design-ok(radius): a 2 px tick
//   {/* design-ok(px-text): sized from the window, not from the scale */}
//
// That is for what the rules cannot mean: graphics 1-2 px thick, and text whose
// size is taken from the window (the recording clock, the tiles). A comment
// with no reason waives nothing.

// What lives in here may build its own: it is where Radix, the raw <button>
// and the dialog are wrapped for everybody else.
const SHARED_DIR = "src/components/ui/"

// Tailwind's palette. A theme colour (bg-primary, text-warn) is never one of
// these, so a hit here is a colour that goes round the theme.
const PALETTE =
  "red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone|taupe|mauve|mist|olive"
const SHADES = "50|100|200|300|400|500|600|700|800|900|950"

// The utilities that take a colour. `border-t-` and its kin are in, and so are
// `ring-offset-`, `inset-ring-` and `drop-shadow-`.
const COLOUR_UTILITIES =
  "bg|text|border(?:-[trblxyse])?|ring(?:-offset)?|inset-ring|fill|stroke|from|to|via|outline|decoration|(?:inset-|drop-)?shadow|divide|caret|accent|placeholder"

// A class starts after a space, a quote, a colon (a variant) or a bracket,
// never in the middle of a word or after a hyphen, and ends before one.
const START = String.raw`(?<![\w-])`
const END = String.raw`(?![\w-])`

const re = (source) => new RegExp(source, "g")

// Every match of `pattern` in `code`, as the text it matched.
function hits(pattern, code) {
  return [...code.matchAll(pattern)].map((m) => m[0])
}

// `#fff`, `#1a1a1a`: 3, 4, 6 or 8 hex digits. Only counted inside a string,
// because "Take #123" in running text is a number, not a colour; and not after
// `&` (an entity) or a word character.
const HEX = re(String.raw`(?<![\w&#/.-])#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})${END}`)
const COLOUR_FUNCTION = re(START + String.raw`(?:oklch|oklab|rgba?|hsla?|lab|lch|hwb)\([^)\n]*\)?`)
const PALETTE_COLOUR = re(
  START + `(?:${COLOUR_UTILITIES})-(?:white|black|(?:${PALETTE})-(?:${SHADES}))` + END,
)

// Rounded, on a side or a corner. 4, 8, 12 and full are the rest of the family
// (`rounded`, -sm, -md, -lg, -xl, -full, -none); what is caught is xs, 2xl and
// up, and a value of one's own in brackets or parentheses.
const RADIUS = re(
  START +
    String.raw`rounded(?:-(?:t|r|b|l|s|e|tl|tr|br|bl|ss|se|ee|es))?-(?:xs|[2-9]xl|\[[^\]\s]*\]|\(--[^)\s]*\))` +
    END,
)

/** The rules, in the order findings are listed. `find(code, quoted)` gets one
 *  line of code (comments blanked out) and, per character, whether it sits
 *  inside a string; it returns what broke the rule. `outsideUi` rules do not
 *  apply to the files of components/ui. `story` needs the list of files, so it
 *  is `missingStories`, not `find`. */
export const RULES = [
  {
    name: "px-text",
    why: "Text sizes come from the scale (text-xs, text-sm, text-base, text-xl, text-2xl), never in px.",
    find: (code) => [
      ...hits(re(START + String.raw`text-\[[^\]\s]*\dpx[^\]\s]*\]`), code),
      ...hits(re(String.raw`\bfontSize\s*:|(?<![\w-])font-size\s*:`), code).map((t) => t.replace(/\s*:$/, "")),
    ],
  },
  {
    name: "text-size",
    why: "Text is text-xs, text-sm, text-base, text-xl or text-2xl: no text-lg, nothing from text-3xl up, no rem or em in brackets.",
    find: (code) => [
      ...hits(re(START + String.raw`text-(?:lg|[3-9]xl)` + END), code),
      ...hits(re(START + String.raw`text-\[[^\]\s]*\d(?:rem|em)[^\]\s]*\]`), code),
    ],
  },
  {
    name: "raw-colour",
    why: "Colours come from the theme (bg-primary, text-muted-foreground, border-border ...), not the Tailwind palette, white, black or a literal.",
    find: (code, quoted) => [
      ...hits(PALETTE_COLOUR, code),
      ...hits(COLOUR_FUNCTION, code),
      ...[...code.matchAll(HEX)].filter((m) => quoted[m.index]).map((m) => m[0]),
    ],
  },
  {
    name: "radius",
    why: "Corners are 4, 8, 12 or full: rounded, rounded-sm, rounded-md, rounded-lg, rounded-xl, rounded-full.",
    find: (code) => hits(RADIUS, code),
  },
  {
    name: "uppercase",
    why: "No uppercase: a label is written the way it reads.",
    find: (code) => hits(re(START + "uppercase" + END), code),
  },
  {
    name: "raw-button",
    why: "A button is the shared Button (components/ui/button), not a hand-made <button>.",
    outsideUi: true,
    find: (code) => hits(re(String.raw`<button${END}`), code),
  },
  {
    name: "radix",
    why: "Radix is imported only inside components/ui; use the shared component built on it.",
    outsideUi: true,
    find: (code) =>
      hits(
        re(
          String.raw`(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)(["'])(?:radix-ui|@radix-ui\/[^"']+)\1`,
        ),
        code,
      ).map((t) => t.replace(/^\w+\s*\(?\s*/, "")),
  },
  {
    name: "dialog",
    why: "A dialog is the shared Dialog (components/ui/dialog), not role=\"dialog\" or <dialog>.",
    outsideUi: true,
    find: (code) => [
      ...hits(re(String.raw`\brole\s*[=:]\s*\{?\s*["'\x60](?:alert)?dialog["'\x60]`), code),
      ...hits(re(String.raw`<dialog${END}`), code),
    ],
  },
  {
    name: "story",
    why: "Every component in components/ui has a NAME.stories.tsx beside it.",
  },
]

const RULE_NAMES = new Set(RULES.map((r) => r.name))

/** Only the interface's components and screens are held to the rules. */
const isChecked = (path) => /^src\/.+\.tsx$/.test(path)
const isShared = (path) => path.startsWith(SHARED_DIR)

/** The source as the rules should see it: one string per line, with the
 *  comments blanked out (a note that says "no uppercase" is not a use of it),
 *  and for every character whether it sits inside a string.
 *
 *  A small scanner rather than a regex, because a `//` in "https://..." is not
 *  a comment and a `/*` in "src/**\/*.tsx" is not one either. A quote in running
 *  text ("it's") opens a string that ends with its line, which keeps the
 *  damage to that line. */
function readCode(text) {
  const lines = [""]
  const quoted = [[]]
  const put = (ch, inString = false) => {
    if (ch === "\r") return
    if (ch === "\n") {
      lines.push("")
      quoted.push([])
      return
    }
    lines[lines.length - 1] += ch
    quoted[quoted.length - 1].push(inString)
  }

  // What is open: code (the file itself, or inside `${ }`), a block comment,
  // a quoted string, a template.
  const stack = [{ mode: "code" }]
  for (let i = 0; i < text.length; i++) {
    const top = stack[stack.length - 1]
    const c = text[i]
    const next = text[i + 1]

    if (top.mode === "block") {
      if (c === "*" && next === "/") {
        put(" ")
        put(" ")
        i++
        stack.pop()
      } else {
        put(c === "\n" ? c : " ")
      }
    } else if (top.mode === '"' || top.mode === "'" || top.mode === "`") {
      if (c === "\\" && next !== undefined) {
        put(c, true)
        // A backslash before the end of the line is a continuation.
        put(next, true)
        i++
      } else if (c === top.mode) {
        put(c, true)
        stack.pop()
      } else if (c === "\n" && top.mode !== "`") {
        put(c)
        stack.pop()
      } else if (c === "$" && next === "{" && top.mode === "`") {
        put(c, true)
        put(next, true)
        i++
        stack.push({ mode: "code", braces: 0, interpolation: true })
      } else {
        put(c, true)
      }
    } else if (c === "/" && next === "*") {
      put(" ")
      put(" ")
      i++
      stack.push({ mode: "block" })
    } else if (c === "/" && next === "/" && text[i - 1] !== ":") {
      // A line comment: blank it up to the line's end (the newline itself is
      // handled by the next turn of the loop).
      while (i + 1 < text.length && text[i + 1] !== "\n") {
        put(" ")
        i++
      }
      put(" ")
    } else if (c === '"' || c === "'" || c === "`") {
      put(c, true)
      stack.push({ mode: c })
    } else if (top.interpolation && c === "}" && top.braces === 0) {
      put(c, true)
      stack.pop()
    } else {
      if (top.interpolation) {
        if (c === "{") top.braces++
        if (c === "}") top.braces--
      }
      put(c)
    }
  }
  return { lines, quoted }
}

// `design-ok(rule): reason`. The reason runs to the next marker or the line's
// end; a comment's own closer (`*/`, `}`) is not a reason.
const WAIVER = /design-ok\(([a-z-]+)\):((?:(?!design-ok\().)*)/g
const hasReason = (s) => /[\p{L}\p{N}]/u.test(s)

// The rules each line waives for itself and the line below it.
function waivers(rawLines) {
  return rawLines.map((line) => {
    const rules = new Set()
    for (const m of line.matchAll(WAIVER)) {
      if (RULE_NAMES.has(m[1]) && hasReason(m[2])) rules.add(m[1])
    }
    return rules
  })
}

/** What in one file breaks a rule. `path` is relative to ui/ (`src/...`);
 *  only src/**\/*.tsx is checked, stories included. Returns
 *  `{ rule, line, text }` per finding (line from 1, text the part of the line
 *  that broke the rule), minus what a `design-ok` waives. */
export function checkText(path, text) {
  if (!isChecked(path)) return []
  const { lines, quoted } = readCode(text)
  const waived = waivers(text.split(/\r?\n/))
  const shared = isShared(path)
  const found = []
  lines.forEach((code, i) => {
    if (!code.trim()) return
    for (const rule of RULES) {
      if (!rule.find || (rule.outsideUi && shared)) continue
      if (waived[i].has(rule.name) || waived[i - 1]?.has(rule.name)) continue
      for (const hit of rule.find(code, quoted[i])) {
        found.push({ rule: rule.name, line: i + 1, text: hit })
      }
    }
  })
  return found
}

/** The `story` rule: every `src/components/ui/X.tsx` has an
 *  `X.stories.tsx` beside it. `paths` is every file of src/ (relative to
 *  ui/). Returns findings with their `path`. */
export function missingStories(paths) {
  const have = new Set(paths)
  const found = []
  for (const path of paths) {
    const m = path.startsWith(SHARED_DIR) && /^([^/]+)\.tsx$/.exec(path.slice(SHARED_DIR.length))
    if (!m || /\.(stories|test)$/.test(m[1])) continue
    if (!have.has(`${SHARED_DIR}${m[1]}.stories.tsx`)) {
      found.push({ path, rule: "story", line: 1, text: `no ${m[1]}.stories.tsx beside it` })
    }
  }
  return found
}

/** Everything wrong once the allow-list is applied, as `{ path, line, rule,
 *  text }` (empty means the check passes).
 *
 *  `findings` carry their `path`. `allow` is `{ path: [rule, ...] }`, the
 *  screens not yet redone. A finding is wrong unless its file and rule are
 *  listed; a listed pair with nothing left to find is wrong too, so the list
 *  only ever gets shorter. Files of components/ui cannot be listed at all:
 *  they are where the rules are kept. */
export function judge(findings, allow) {
  const listed = (path, rule) => !isShared(path) && (allow[path] ?? []).includes(rule)
  const problems = findings.filter((f) => !listed(f.path, f.rule))

  for (const [path, rules] of Object.entries(allow)) {
    for (const rule of rules) {
      let text
      if (isShared(path)) text = "files in components/ui cannot be on the allow-list; fix the file"
      else if (!RULE_NAMES.has(rule)) text = `"${rule}" is not a rule; remove it from the allow-list`
      else if (!findings.some((f) => f.path === path && f.rule === rule)) {
        text = "on the allow-list, but nothing breaks it any more; remove the pair from design-check.allow.json"
      }
      if (text) problems.push({ path, line: 1, rule, text })
    }
  }
  return problems
}
