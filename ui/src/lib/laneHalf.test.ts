import { describe, expect, it } from "vitest"
import { laneHalf } from "@/lib/laneHalf"

const classes = (half?: "top" | "bottom") => laneHalf(half).split(" ")

describe("laneHalf: the box of a track's plate or lane", () => {
  it("is a card with round corners and no frame", () => {
    expect(classes()).toEqual(expect.arrayContaining(["rounded-lg", "bg-card"]))
    expect(classes().filter((c) => /^border/.test(c))).toEqual([])
  })

  it("squares the lower corners of the upper half and leaves it without a line", () => {
    expect(classes("top")).toEqual(expect.arrayContaining(["rounded-lg", "rounded-b-none", "bg-card"]))
    expect(classes("top").filter((c) => /^border/.test(c))).toEqual([])
  })

  it("squares the upper corners of the lower half and draws a 1 px top line in the border colour", () => {
    expect(classes("bottom")).toEqual(
      expect.arrayContaining(["rounded-lg", "rounded-t-none", "bg-card", "border-t", "border-border"])
    )
  })

  it("never draws a dashed line, the way a notes plate used to", () => {
    for (const half of [undefined, "top", "bottom"] as const) expect(laneHalf(half)).not.toMatch(/dashed/)
  })
})
