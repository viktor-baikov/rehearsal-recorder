import { describe, expect, it } from "vitest"
import { checkText, judge, missingStories, RULES } from "./design-rules.mjs"

const SCREEN = "src/screens/Example.tsx"
const SHARED = "src/components/ui/example.tsx"

// The rules a piece of source breaks, as names, in the order they were found.
const broken = (text, path = SCREEN) => checkText(path, text).map((f) => f.rule)
// The same, for a className made of the given classes.
const classes = (list, path = SCREEN) => broken(`<div className="${list}" />`, path)

describe("the rule list", () => {
  it("names the nine rules the design check knows", () => {
    expect(RULES.map((r) => r.name)).toEqual([
      "px-text",
      "text-size",
      "raw-colour",
      "radius",
      "uppercase",
      "raw-button",
      "radix",
      "dialog",
      "story",
    ])
  })
})

describe("px-text", () => {
  it("catches a pixel size in brackets, on any variant", () => {
    expect(classes("text-[11px]")).toEqual(["px-text"])
    expect(classes("md:hover:text-[10.5px] flex")).toEqual(["px-text"])
  })

  it("catches a fontSize in a style", () => {
    expect(broken(`<p style={{ fontSize: 12 }} />`)).toEqual(["px-text"])
    expect(broken(`<p style={{ fontSize: "clamp(1rem, 8cqi, 2rem)" }} />`)).toEqual(["px-text"])
  })

  it("lets the named sizes through, and padding that merely ends in px", () => {
    expect(classes("px-3 py-2 text-sm")).toEqual([])
    expect(classes("text-xs text-base text-[var(--clock)]")).toEqual([])
  })
})

describe("text-size", () => {
  it("catches text-lg and everything from text-3xl up", () => {
    expect(classes("text-lg")).toEqual(["text-size"])
    expect(classes("sm:text-3xl")).toEqual(["text-size"])
    expect(classes("text-4xl text-9xl")).toEqual(["text-size", "text-size"])
  })

  it("catches a size given in rem or em", () => {
    expect(classes("text-[1.25rem]")).toEqual(["text-size"])
    expect(classes("text-[2em]")).toEqual(["text-size"])
  })

  it("lets the five sizes through, and other text- classes", () => {
    expect(classes("text-xs text-sm text-base text-xl text-2xl")).toEqual([])
    expect(classes("text-left text-foreground text-muted-foreground text-balance")).toEqual([])
    expect(classes("text-large")).toEqual([])
  })
})

describe("raw-colour", () => {
  it("catches a palette colour with a shade after a colour utility", () => {
    expect(classes("bg-red-500")).toEqual(["raw-colour"])
    expect(classes("border-zinc-200 text-amber-600")).toEqual(["raw-colour", "raw-colour"])
    expect(classes("dark:hover:bg-slate-900/50")).toEqual(["raw-colour"])
    expect(classes("ring-offset-neutral-950")).toEqual(["raw-colour"])
    expect(classes("from-sky-400 via-indigo-500 to-pink-600")).toEqual(["raw-colour", "raw-colour", "raw-colour"])
  })

  it("catches white and black, with or without an opacity", () => {
    expect(classes("text-white")).toEqual(["raw-colour"])
    expect(classes("bg-black/60")).toEqual(["raw-colour"])
    expect(classes("shadow-white fill-black stroke-white")).toEqual(["raw-colour", "raw-colour", "raw-colour"])
  })

  it("catches an arbitrary colour in brackets", () => {
    expect(classes("bg-[#1a1a1a]")).toEqual(["raw-colour"])
    expect(classes("text-[rgb(10,20,30)]")).toEqual(["raw-colour"])
    expect(classes("border-[hsl(210_40%_96%)]")).toEqual(["raw-colour"])
    expect(classes("fill-[oklch(0.5_0.2_30)]")).toEqual(["raw-colour"])
  })

  it("catches a hex or a colour function written in the code", () => {
    expect(broken(`const stroke = "#1a1a1a"`)).toEqual(["raw-colour"])
    expect(broken(`ctx.fillStyle = '#fff'`)).toEqual(["raw-colour"])
    expect(broken(`<i style={{ color: "oklch(0.7 0.1 50)" }} />`)).toEqual(["raw-colour"])
    expect(broken(`<i style={{ background: "rgb(0, 0, 0)" }} />`)).toEqual(["raw-colour"])
  })

  it("lets the theme's colours through", () => {
    expect(classes("bg-primary/20 text-foreground border-border")).toEqual([])
    expect(classes("bg-signal/15 text-warn ring-ring/50 bg-transparent border-current")).toEqual([])
    expect(classes("from-primary to-transparent")).toEqual([])
  })

  it("lets through a utility that only looks like a colour", () => {
    expect(classes("shadow-md ring-2 ring-offset-2 border-2 text-balance outline-hidden")).toEqual([])
    expect(classes("bg-red")).toEqual([])
    expect(broken(`color-mix(in oklab, var(--primary) 20%, transparent)`)).toEqual([])
  })

  it("does not take a number in running text or an entity for a hex", () => {
    expect(broken(`<p>Take #123 of 4</p>`)).toEqual([])
    expect(broken(`<p>It&#39;s here</p>`)).toEqual([])
    expect(broken(`<a href="#main">skip</a>`)).toEqual([])
  })
})

describe("radius", () => {
  it("catches rounded-xs, rounded-2xl and up, and brackets", () => {
    expect(classes("rounded-xs")).toEqual(["radius"])
    expect(classes("rounded-2xl")).toEqual(["radius"])
    expect(classes("rounded-4xl")).toEqual(["radius"])
    expect(classes("rounded-[3px]")).toEqual(["radius"])
    expect(classes("rounded-[calc(var(--radius)-2px)]")).toEqual(["radius"])
  })

  it("catches them on any side or corner", () => {
    expect(classes("rounded-t-3xl")).toEqual(["radius"])
    expect(classes("rounded-bl-xs")).toEqual(["radius"])
    expect(classes("rounded-s-[6px] rounded-tr-2xl")).toEqual(["radius", "radius"])
    expect(classes("hover:rounded-e-[1px]")).toEqual(["radius"])
  })

  it("lets 4, 8, 12 and full through, on any side", () => {
    expect(classes("rounded rounded-sm rounded-md rounded-lg rounded-xl rounded-full rounded-none")).toEqual([])
    expect(classes("rounded-t-lg rounded-b-none rounded-tl-md rounded-r-full rounded-l")).toEqual([])
  })

  it("leaves other classes with a rounded in them alone", () => {
    expect(classes("not-rounded flex")).toEqual([])
  })
})

describe("uppercase", () => {
  it("catches the uppercase class, on any variant", () => {
    expect(classes("uppercase")).toEqual(["uppercase"])
    expect(classes("flex md:uppercase tracking-wide")).toEqual(["uppercase"])
    expect(broken(`<p style={{ textTransform: "uppercase" }} />`)).toEqual(["uppercase"])
  })

  it("lets capitalize, normal-case and toUpperCase through", () => {
    expect(classes("capitalize normal-case lowercase")).toEqual([])
    expect(broken(`const key = name.toUpperCase()`)).toEqual([])
  })
})

describe("raw-button", () => {
  it("catches a <button outside components/ui", () => {
    expect(broken(`<button type="button" onClick={go}>Go</button>`)).toEqual(["raw-button"])
    expect(broken(`return <button`)).toEqual(["raw-button"])
  })

  it("lets <Button and friends through", () => {
    expect(broken(`<Button onClick={go}>Go</Button>`)).toEqual([])
    expect(broken(`<ButtonGroup><PlayButton /></ButtonGroup>`)).toEqual([])
  })

  it("lets components/ui build its own", () => {
    expect(broken(`<button type="button" />`, SHARED)).toEqual([])
  })
})

describe("radix", () => {
  it("catches an import from radix-ui or @radix-ui outside components/ui", () => {
    expect(broken(`import { Dialog } from "radix-ui"`)).toEqual(["radix"])
    expect(broken(`import * as Popover from '@radix-ui/react-popover'`)).toEqual(["radix"])
    expect(broken(`} from "@radix-ui/react-slot"`)).toEqual(["radix"])
    expect(broken(`const m = await import("radix-ui")`)).toEqual(["radix"])
    expect(broken(`import "radix-ui"`)).toEqual(["radix"])
  })

  it("lets our own wrappers through", () => {
    expect(broken(`import { Dialog } from "@/components/ui/dialog"`)).toEqual([])
    expect(broken(`import { cn } from "@/lib/radix-ui-helpers"`)).toEqual([])
  })

  it("lets components/ui import it", () => {
    expect(broken(`import { Slot } from "radix-ui"`, SHARED)).toEqual([])
  })
})

describe("dialog", () => {
  it("catches role=dialog and <dialog outside components/ui", () => {
    expect(broken(`<div role="dialog" aria-modal="true">`)).toEqual(["dialog"])
    expect(broken(`<div role='alertdialog'>`)).toEqual(["dialog"])
    expect(broken(`<dialog open>`)).toEqual(["dialog"])
  })

  it("lets the shared Dialog through", () => {
    expect(broken(`<Dialog open={open}><DialogContent>x</DialogContent></Dialog>`)).toEqual([])
    expect(broken(`<div role="group">`)).toEqual([])
  })

  it("lets components/ui build its own", () => {
    expect(broken(`<dialog open>`, SHARED)).toEqual([])
  })
})

describe("story", () => {
  it("asks for a stories file beside every component in components/ui", () => {
    const found = missingStories([
      "src/components/ui/button.tsx",
      "src/components/ui/button.stories.tsx",
      "src/components/ui/card.tsx",
      "src/screens/Example.tsx",
    ])
    expect(found.map((f) => [f.path, f.rule])).toEqual([["src/components/ui/card.tsx", "story"]])
    expect(found[0].line).toBe(1)
  })

  it("leaves stories, tests and files elsewhere alone", () => {
    expect(
      missingStories([
        "src/components/ui/badge.stories.tsx",
        "src/components/ui/button.test.ts",
        "src/components/ui/button.stories.tsx",
        "src/components/Other.tsx",
        "src/components/ui/nested/thing.tsx",
      ]),
    ).toEqual([])
  })
})

describe("design-ok", () => {
  it("exempts a line whose own comment gives a reason", () => {
    expect(broken(`<i className="rounded-[1px]" /> {/* design-ok(radius): a 2 px tick */}`)).toEqual([])
    expect(broken(`<i className="rounded-[1px]" /> // design-ok(radius): a 2 px tick`)).toEqual([])
  })

  it("exempts the line below a comment", () => {
    const text = [`// design-ok(radius): graphic`, `<i className="rounded-[1px]" />`].join("\n")
    expect(broken(text)).toEqual([])
    expect(broken(`{/* design-ok(radius): graphic */}\n<i className="rounded-[1px]" />`)).toEqual([])
    expect(broken(`/* design-ok(radius): graphic */\n<i className="rounded-[1px]" />`)).toEqual([])
  })

  it("does not reach further than the next line", () => {
    const text = [`// design-ok(radius): graphic`, `const a = 1`, `<i className="rounded-[1px]" />`].join("\n")
    expect(checkText(SCREEN, text)).toEqual([{ rule: "radius", line: 3, text: "rounded-[1px]" }])
  })

  it("needs a reason", () => {
    expect(broken(`// design-ok(radius):\n<i className="rounded-[1px]" />`)).toEqual(["radius"])
    expect(broken(`// design-ok(radius):   \n<i className="rounded-[1px]" />`)).toEqual(["radius"])
    expect(broken(`{/* design-ok(radius): */}\n<i className="rounded-[1px]" />`)).toEqual(["radius"])
    expect(broken(`// design-ok(radius)\n<i className="rounded-[1px]" />`)).toEqual(["radius"])
  })

  it("exempts only the rule it names", () => {
    const text = [`// design-ok(radius): graphic`, `<i className="rounded-[1px] bg-red-500" />`].join("\n")
    expect(broken(text)).toEqual(["raw-colour"])
    expect(broken(`// design-ok(raw-colour): graphic\n<i className="rounded-[1px]" />`)).toEqual(["radius"])
  })

  it("can name two rules in one comment", () => {
    const text = `// design-ok(radius): a tick design-ok(raw-colour): the lane's own paint\n<i className="rounded-[1px] bg-red-500" />`
    expect(broken(text)).toEqual([])
  })
})

describe("what counts as code", () => {
  it("reports the line number and the text that broke the rule", () => {
    const text = [`const a = 1`, ``, `<p className="flex text-lg" />`].join("\n")
    expect(checkText(SCREEN, text)).toEqual([{ rule: "text-size", line: 3, text: "text-lg" }])
  })

  it("counts lines the same with Windows line endings", () => {
    const text = `const a = 1\r\n\r\n<p className="uppercase" />\r\n`
    expect(checkText(SCREEN, text)).toEqual([{ rule: "uppercase", line: 3, text: "uppercase" }])
  })

  it("does not read comments as code", () => {
    expect(broken(`// no uppercase and no text-lg here, as <button> says`)).toEqual([])
    expect(broken(`/* text-3xl\n   rounded-2xl <button> */`)).toEqual([])
    expect(broken(`{/* a <button> that is gone: bg-red-500 */}`)).toEqual([])
    expect(broken(`const a = 1 // was uppercase`)).toEqual([])
  })

  it("does not take a // inside a string for a comment", () => {
    expect(broken(`const u = "https://reha.stream"; return <button />`)).toEqual(["raw-button"])
    expect(broken("const u = `http://x/${a}`; return <button />")).toEqual(["raw-button"])
  })

  it("reads class names inside template literals, over several lines", () => {
    const text = ["const c = `", "  flex", "  ${on ? `rounded-2xl` : `rounded-md`}", "`"].join("\n")
    expect(checkText(SCREEN, text)).toEqual([{ rule: "radius", line: 3, text: "rounded-2xl" }])
  })

  it("keeps going after an apostrophe in running text", () => {
    expect(broken(`<p>It's a take</p>\n<button />`)).toEqual(["raw-button"])
  })

  it("checks only src/**/*.tsx", () => {
    const bad = `<button className="uppercase text-lg" />`
    expect(checkText("e2e/example.tsx", bad)).toEqual([])
    expect(checkText("src/lib/example.ts", bad)).toEqual([])
    expect(checkText("src/index.css", bad)).toEqual([])
    expect(checkText("src/screens/Example.tsx", bad).length).toBeGreaterThan(0)
  })

  it("checks stories like any other file", () => {
    expect(broken(`<div className="text-lg" />`, "src/components/ui/card.stories.tsx")).toEqual(["text-size"])
  })
})

describe("the allow-list", () => {
  const found = [
    { path: "src/screens/A.tsx", rule: "radius", line: 4, text: "rounded-2xl" },
    { path: "src/screens/A.tsx", rule: "uppercase", line: 9, text: "uppercase" },
  ]

  it("passes when every finding's file and rule is listed", () => {
    expect(judge(found, { "src/screens/A.tsx": ["radius", "uppercase"] })).toEqual([])
  })

  it("reports a finding whose file or rule is not listed, with its line", () => {
    expect(judge(found, { "src/screens/A.tsx": ["radius"] })).toEqual([found[1]])
    expect(judge(found, { "src/screens/B.tsx": ["radius", "uppercase"] }).map((p) => p.path)).toContain(
      "src/screens/A.tsx",
    )
  })

  it("reports a listed pair with no finding left, so the list only shrinks", () => {
    const left = judge([found[0]], { "src/screens/A.tsx": ["radius", "uppercase"] })
    expect(left).toHaveLength(1)
    expect(left[0]).toMatchObject({ path: "src/screens/A.tsx", rule: "uppercase" })
    expect(left[0].text).toMatch(/allow-list/)
  })

  it("reports a listed file that is gone", () => {
    const left = judge([], { "src/screens/Gone.tsx": ["radius"] })
    expect(left).toHaveLength(1)
    expect(left[0]).toMatchObject({ path: "src/screens/Gone.tsx", rule: "radius" })
  })

  it("refuses a file of components/ui on the list, and a rule it does not know", () => {
    const ui = judge([], { "src/components/ui/card.tsx": ["radius"] })
    expect(ui.some((p) => /components\/ui/.test(p.text))).toBe(true)
    const odd = judge(found, { "src/screens/A.tsx": ["radius", "uppercase", "nonsense"] })
    expect(odd.some((p) => p.rule === "nonsense")).toBe(true)
  })
})
