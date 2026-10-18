// `npm run design-check`: refuses source that breaks the design rules (K3).
// The rules themselves are in design-rules.mjs; this walks src/ and reports.
//
// design-check.allow.json let a screen not yet redone break a rule, as
// { "src/screens/X.tsx": ["radius", ...] }, while the screens were redone one
// PR at a time. Every screen is redone, and the list is empty for good, `{}`:
// design-rules.test.mjs fails when anything is put back on it. The check
// still reads it, and fails on an entry that matches nothing and on any entry
// in src/components/ui/.
//
// Prints one line per problem, `path:line rule text`, and exits 1 if there is
// any.

import { readdirSync, readFileSync } from "node:fs"
import { sep } from "node:path"
import { fileURLToPath } from "node:url"
import { checkText, isChecked, judge, missingStories, RULES } from "./design-rules.mjs"

// ui/, whatever directory the script is started from.
const root = fileURLToPath(new URL("..", import.meta.url))

// Every .tsx and .ts under src/ but the tests (isChecked), as `src/...` with
// forward slashes (the allow-list is the same on every system), in a fixed
// order.
const files = readdirSync(`${root}src`, { recursive: true })
  .map((p) => `src/${p.split(sep).join("/")}`)
  .filter(isChecked)
  .sort()

const findings = [
  ...files.flatMap((path) =>
    checkText(path, readFileSync(`${root}${path}`, "utf8")).map((f) => ({ path, ...f })),
  ),
  ...missingStories(files),
]

const allow = JSON.parse(readFileSync(`${root}design-check.allow.json`, "utf8"))
const problems = judge(findings, allow)

if (problems.length === 0) {
  const pairs = Object.values(allow).reduce((n, rules) => n + rules.length, 0)
  console.log(
    `design-check: ok, ${files.length} files checked; ${pairs} known cases in ` +
      `${Object.keys(allow).length} files are on the allow-list`,
  )
} else {
  for (const p of problems) console.log(`${p.path}:${p.line} ${p.rule} ${p.text}`)

  console.log("")
  for (const rule of RULES) {
    if (problems.some((p) => p.rule === rule.name)) console.log(`${rule.name}: ${rule.why}`)
  }
  console.log(
    "\nFix what is listed. Only a graphic 1-2 px thick, or text sized from the window, may be " +
      "waived, with a comment: design-ok(<rule>): <reason>.",
  )
  process.exitCode = 1
}
