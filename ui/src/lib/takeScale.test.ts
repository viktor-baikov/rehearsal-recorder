import { describe, expect, it } from "vitest"
import { drawnLength } from "@/lib/takeScale"

describe("drawnLength: how tall a go is drawn", () => {
  it("half as long, half as tall", () => expect(drawnLength(30, 60, 24)).toBe(12))
  it("never under the least", () => expect(drawnLength(1, 600, 24)).toBe(4))
  it("no length is the least", () => expect(drawnLength(0, 0, 24, 5)).toBe(5))

  it("the longest is the full height", () => expect(drawnLength(60, 60, 24)).toBe(24))

  it("is not rounded: the bars of today's callers are not", () =>
    expect(drawnLength(10, 60, 36, 5)).toBe(6))

  it("is the least for a length that is not a positive number", () => {
    expect(drawnLength(-3, 60, 24)).toBe(4)
    expect(drawnLength(Number.NaN, 60, 24, 5)).toBe(5)
  })

  it("is the least when nothing is longer than nothing", () => {
    expect(drawnLength(30, -1, 24)).toBe(4)
    expect(drawnLength(30, Number.NaN, 24)).toBe(4)
  })
})
