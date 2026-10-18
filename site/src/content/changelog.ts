// The version the page shows, and its news, from CHANGELOG.md: the same
// file a release's notes are written in.

const VERSION_HEADING = /^## (\S+)\s*$/gm

/** The newest version with a section of its own: not *Unreleased*. */
export function latestVersion(changelog: string): string {
  for (const m of changelog.matchAll(VERSION_HEADING))
    if (m[1].toLowerCase() !== "unreleased") return m[1]
  throw new Error("CHANGELOG.md has no version heading")
}

/**
 * The bold lead of the first item under a version's heading, without its
 * asterisks: "The app says when a newer version is out." Null when the
 * version has no section or its first item does not open in bold.
 *
 * A lead may be wrapped over several lines, as CHANGELOG.md is: the item is
 * read up to the next item, a blank line or a heading, its lines joined with
 * one space, and the lead found in that.
 */
export function newsLead(changelog: string, version: string): string | null {
  const lines = changelog.replace(/\r\n/g, "\n").split("\n")
  const start = lines.findIndex((l) => l.trim() === `## ${version}`)
  if (start < 0) return null
  const rest = lines.slice(start + 1)
  const first = rest.findIndex((l) => l.startsWith("## ") || /^- /.test(l))
  if (first < 0 || rest[first].startsWith("## ")) return null
  const item = [rest[first].trim()]
  for (const line of rest.slice(first + 1)) {
    if (line.trim() === "" || line.startsWith("#") || /^- /.test(line)) break
    item.push(line.trim())
  }
  const lead = /^- \*\*(.+?)\*\*/.exec(item.join(" "))
  return lead ? lead[1].trim() : null
}

/**
 * The newest version whose first item opens in bold, and that lead. A
 * release with nothing new in the app (0.11.1, which changed only the site)
 * has none, and the news is the one before it.
 */
export function latestNews(changelog: string): { version: string; lead: string } | null {
  for (const m of changelog.matchAll(VERSION_HEADING)) {
    if (m[1].toLowerCase() === "unreleased") continue
    const lead = newsLead(changelog, m[1])
    if (lead) return { version: m[1], lead }
  }
  return null
}

/** A release's tag as people read it: tags are bare (0.9.0), a v is dropped. */
export function displayVersion(tag: string): string {
  return tag.replace(/^v(?=\d)/, "")
}

/**
 * The part of CHANGELOG.md the page reads from: the release's version's
 * section, or the newest one's, and when it has no news, on down to the
 * section that has. The page needs one line of it; the rest of the file
 * stays out of the build.
 */
export function changelogHead(changelog: string, tag?: string): string {
  const version = tag ? displayVersion(tag) : latestVersion(changelog)
  const lines = changelog.replace(/\r\n/g, "\n").split("\n")
  const start = lines.findIndex((l) => l.trim() === `## ${version}`)
  if (start < 0) return tag ? changelogHead(changelog) : changelog
  const nextHeading = (after: number) => lines.findIndex((l, i) => i > after && l.startsWith("## "))
  const upTo = (end: number) => lines.slice(start, end < 0 ? undefined : end).join("\n")
  let end = nextHeading(start)
  while (end >= 0 && !latestNews(upTo(end))) end = nextHeading(end)
  return latestNews(upTo(end)) ? upTo(end) : upTo(nextHeading(start))
}
