import { createElement, useState } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { useAfter } from "@/hooks/useAfter"

/** What useAfter says as a component is first drawn, before any time has
 *  passed: no timer has run yet. */
function atFirst(on: boolean, ms: number) {
  function Probe() {
    return String(useAfter(on, ms))
  }
  return renderToStaticMarkup(createElement(Probe))
}

describe("useAfter: true once something has been so for a while (B5)", () => {
  it("is false while it waits", () => {
    expect(atFirst(true, 1000)).toBe("false")
  })

  it("is false while what it waits on is not so", () => {
    expect(atFirst(false, 1000)).toBe("false")
    expect(atFirst(false, 0)).toBe("false")
  })

  it("is true at once with nothing to wait for", () => {
    expect(atFirst(true, 0)).toBe("true")
  })

  it("is true at once when drawn again with no wait, after it was drawn waiting", () => {
    // Drawn first with a wait, then at once again with none, its own state
    // kept from the first time (no timer or effect runs on the server): a
    // spinner told to wait for nothing shows, whatever it was waiting for.
    function Probe() {
      const [ms, setMs] = useState(1000)
      const late = useAfter(true, ms)
      if (ms > 0) setMs(0)
      return String(late)
    }
    expect(renderToStaticMarkup(createElement(Probe))).toBe("true")
  })
})
