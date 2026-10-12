import { test as base, expect, type Locator, type Page } from "@playwright/test"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

export { expect }

/** How long the fake's own takes are: TAKE in fake-bridge.js. */
export const TAKE_SECONDS = 6

const FAKE = fileURLToPath(new URL("./fake-bridge.js", import.meta.url))
const BAND = fileURLToPath(new URL("./band.js", import.meta.url))
const STRESS = fileURLToPath(new URL("./stress.js", import.meta.url))
const STRESS_REHEARSAL = fileURLToPath(new URL("./stress-rehearsal.js", import.meta.url))

/**
 * Every test fails on an error in the page: an exception, or anything the
 * app writes to the console as an error. /api/... is not served here, on
 * purpose — the interface polls over the bridge then — so the browser's own
 * complaint about that is not one.
 */
export const test = base.extend<{ pageErrors: string[] }>({
  pageErrors: [
    async ({ context }, use) => {
      const errors: string[] = []
      const watch = (page: Page) => {
        page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`))
        page.on("console", (m) => {
          if (
            m.type() === "error" &&
            !m.location().url.includes("/api/") &&
            !m.text().includes("Failed to load resource")
          ) {
            errors.push(`console.error: ${m.text()}`)
          }
        })
      }
      context.pages().forEach(watch)
      context.on("page", watch)
      await use(errors)
      expect(errors, "errors in the page").toEqual([])
    },
    { auto: true },
  ],
})

/**
 * For a test where an error in the console is the point: a call into Python
 * that fails is written there by the bridge. Checks it was, and takes it off
 * the list the test fails on.
 */
export function expectedError(errors: string[], pattern: RegExp) {
  expect(errors.some((e) => pattern.test(e)), `an error like ${pattern}`).toBe(true)
  for (let i = errors.length - 1; i >= 0; i--) if (pattern.test(errors[i])) errors.splice(i, 1)
}

/**
 * Opens the app against the fake Python side.
 *
 * `before` runs ahead of the fake, to set it up: window.__LEVELS__,
 * window.__DRAFTS__ and the rest that fake-bridge.js reads. `after` runs once
 * the fake is in place, to change one of its answers.
 */
export async function openApp(
  page: Page,
  {
    before,
    after,
    waitUntil = "load",
  }: {
    before?: string
    after?: string
    waitUntil?: "load" | "domcontentloaded" | "networkidle"
  } = {}
) {
  if (before) await page.addInitScript(before)
  await page.addInitScript({ path: FAKE })
  if (after) await page.addInitScript(after)
  await page.goto("/", { waitUntil })
}

/**
 * Opens the app with the band laid over the fake: four musicians, their
 * song and their past rehearsals, as the docs' pictures and the site show
 * them. See band.js. With `stress: true`, stress.js is laid over the band:
 * long names, thirteen songs last time, seven not played, five tracks. With
 * `stress: "rehearsal"`, stress-rehearsal.js is: a rehearsal of 32 takes,
 * eight tracks with one on MIDI alone, and a set of ten songs.
 */
export async function openBandApp(
  page: Page,
  { stress = false }: { stress?: boolean | "rehearsal" } = {}
) {
  // One script, not two: the band sets the fake's top-level `let`s, which a
  // second init script would not see.
  const laid = stress === "rehearsal" ? [STRESS_REHEARSAL] : stress ? [STRESS] : []
  const source = [FAKE, BAND, ...laid].map((f) => readFileSync(f, "utf-8")).join("\n")
  await page.addInitScript(source)
  await page.goto("/")
}

type Call = { name: string; args: unknown[] }

/** The calls the interface made into the fake Python side, by name. */
export function calls(page: Page, name: string): Promise<Call[]> {
  return page.evaluate(
    (n) => (window as unknown as { __CALLS__: Call[] }).__CALLS__.filter((c) => c.name === n),
    name
  )
}

/** How many times the interface has called that, for expect.poll. */
export async function callCount(page: Page, name: string): Promise<number> {
  return (await calls(page, name)).length
}

/**
 * Holds the fake's answer to `name` where it is until `letGo` lets it
 * through: the call is made, and counted, and waits (window.__HOLD__, which
 * fake-bridge.js reads). Anything else held stays held.
 */
export async function hold(page: Page, name: string) {
  await page.evaluate((n) => {
    const w = window as unknown as {
      __HOLD__?: Record<string, Promise<void>>
      __RELEASE__?: Record<string, () => void>
    }
    w.__HOLD__ = w.__HOLD__ || {}
    w.__RELEASE__ = w.__RELEASE__ || {}
    w.__HOLD__[n] = new Promise<void>((r) => (w.__RELEASE__![n] = r))
  }, name)
}

/** Lets the calls to `name` that `hold` held through, and the next ones. */
export async function letGo(page: Page, name: string) {
  await page.evaluate((n) => {
    const w = window as unknown as {
      __HOLD__: Record<string, Promise<void>>
      __RELEASE__: Record<string, () => void>
    }
    delete w.__HOLD__[n]
    w.__RELEASE__[n]()
  }, name)
}

/** The key a button shows it answers to, or null when it shows none: a chip
 *  kept unseen, holding the button's width, shows none. */
export async function keyOn(button: Locator): Promise<string | null> {
  const key = button.locator(":is(kbd, [data-key])").filter({ visible: true })
  return (await key.count()) ? (await key.first().innerText()).trim() : null
}

/** The setup screen, as the app opens on it. */
export function startButton(page: Page): Locator {
  return page.getByRole("button", { name: /Start rehearsal/ })
}

/**
 * The setup screen's Last time button, in the header of a window too narrow
 * for Last time beside the setup. Hidden from a screen reader with the rest
 * of the page while its panel is open, as a modal hides it.
 */
export function lastTimeButton(page: Page): Locator {
  return page.locator("header").getByRole("button", { name: /^Last time/, includeHidden: true })
}

/**
 * History, from the setup screen. It opens on the newest rehearsal, beside
 * the list; `name` chooses another from the list. Returns the list.
 */
export async function openHistory(page: Page, name?: string): Promise<Locator> {
  await page.getByRole("button", { name: "History", exact: true }).click()
  const list = page.getByRole("navigation", { name: "Rehearsals" })
  await expect(list).toBeVisible()
  if (name) await list.getByRole("button", { name: new RegExp(`^${name}`) }).click()
  return list
}

/** From the setup screen into a rehearsal, ready to record take `n`. */
export async function startRehearsal(page: Page, n = 1) {
  await startButton(page).click()
  await expect(page.getByRole("button", { name: new RegExp(`Record take ${n}`) })).toBeVisible()
}

/** Records take `n` and stops it, leaving it up for review. */
export async function recordTake(page: Page, n = 1) {
  await page.getByRole("button", { name: new RegExp(`Record take ${n}`) }).click()
  await page.getByRole("button", { name: /^Stop/ }).click()
  await expect(page.locator("[data-take-summary]")).toBeVisible()
}

/** Names the take on the screen after it, through its pencil and Rename
 *  take, and leaves it up for review. */
export async function nameTake(page: Page, name: string) {
  await page.locator("[data-take-summary]").getByRole("button", { name: "Rename take" }).click()
  const dialog = page.getByRole("dialog", { name: "Rename take" })
  await dialog.locator("#take-name").fill(name)
  await page.keyboard.press("Enter")
  await expect(dialog).toHaveCount(0)
}

/** Draws a region across the timeline, the way a person does: pressed,
 *  dragged and let go, between two fractions of its width. */
export async function dragRegion(page: Page, from: number, to: number) {
  const box = (await page.getByRole("group", { name: "Take timeline" }).boundingBox())!
  const y = box.y + box.height / 2
  await page.mouse.move(box.x + box.width * from, y)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * to, y, { steps: 10 })
  await page.mouse.up()
}

/** The bar across the top that says something failed in Python. */
export function problemBar(page: Page): Locator {
  return page.locator("[role='alert'][aria-label='Something went wrong']")
}

/** The notices in the corner, or those of one kind. */
export function notices(page: Page, kind?: string): Locator {
  return page.locator(
    kind
      ? `section[aria-label='Notifications'] [data-notice='${kind}']`
      : "section[aria-label='Notifications'] [data-notice]"
  )
}

/** `text` as a regular expression that matches it literally. */
export function literally(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** Sets something on the fake while the page runs: window.__IFACE_GONE__
 *  and the rest in fake-bridge.js. */
export async function setFake(page: Page, name: string, value: unknown) {
  await page.evaluate(
    ([n, v]) => {
      ;(window as unknown as Record<string, unknown>)[n as string] = v
    },
    [name, value] as const
  )
}

/**
 * Tonight is ten takes, the rehearsal started with them already in it:
 *   1 Pałyn 3:20 ★          2 Pałyn 0:12 ★         3 Viasna 0:12, a mark
 *   4 Pałyn 0:12            5 Viasna 3:00 ★ mix    6 Take 6 2:30
 *   7 Viasna 3:10           8 Pałyn 3:30           9 Sonca 2:50 ★ tracks
 *  10 Take 10 0:08
 * So with the 30 s default 4 and 10 are false starts, and 1 and 2 are the
 * ★ takes with nothing in the cloud folder.
 */
export const TONIGHT = [
  { name: "Pałyn", duration_sec: 200, starred: true },
  { name: "Pałyn", duration_sec: 12, starred: true },
  { name: "Viasna", duration_sec: 12, markers: [{ at: 4, note: "", label_id: 1 }] },
  { name: "Pałyn", duration_sec: 12 },
  { name: "Viasna", duration_sec: 180, starred: true, cloud: { mix: "/cloud/Viasna 2.mp3" } },
  { name: "Take 6", duration_sec: 150 },
  { name: "Viasna", duration_sec: 190 },
  { name: "Pałyn", duration_sec: 210 },
  { name: "Sonca", duration_sec: 170, starred: true, cloud: { tracks: "/cloud/Sonca 1" } },
  { name: "Take 10", duration_sec: 8 },
]

/** Opens a rehearsal with `tonight`'s takes in it and a cloud folder set, and
 *  returns the overview of the evening. `before` runs ahead of the fake. */
export async function openEvening(page: Page, before = "", tonight: object[] = TONIGHT) {
  await openApp(page, {
    before: `window.__TONIGHT__ = ${JSON.stringify(tonight)};
             window.__CLOUD_DIR__ = '/cloud'; ${before}`,
  })
  await startRehearsal(page, tonight.length + 1)
  const overview = page.locator("[aria-label='Rehearsal overview']")
  await expect(overview).toBeVisible()
  return overview
}

/** Until the screen's groups have risen into place: a box measured while one
 *  rises is up to 12 px off. */
export const settled = (page: Page) =>
  page.waitForFunction(() =>
    document
      .getAnimations()
      .every((a) => (a as CSSAnimation).animationName !== "rise" || a.playState === "finished")
  )

/** The Appearance scale, as Settings stores it: the root font size follows. */
export const scaled = (scale: number) =>
  `window.localStorage.setItem('mock-python-config', JSON.stringify({theme:'dark', ui_scale:${scale}}));`

/** A colour the theme defines, as the browser computes it. */
export const colour = (page: Page, token: string) =>
  page.evaluate((t) => {
    const probe = document.createElement("div")
    probe.style.backgroundColor = `var(${t})`
    document.body.append(probe)
    const value = getComputedStyle(probe).backgroundColor
    probe.remove()
    return value
  }, token)

export const style = (el: Locator, ...props: string[]) =>
  el.evaluate((e, ps) => {
    const cs = getComputedStyle(e)
    return Object.fromEntries(ps.map((p) => [p, cs.getPropertyValue(p)]))
  }, props)
