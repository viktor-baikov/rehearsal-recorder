import { describe, expect, it } from "vitest"
import type { MidiPort } from "@/lib/api"
import { bareName, findPort, portBusyText, portGoneText, portLine, portRef } from "@/lib/midiPorts"

// The same cases as tests/test_midi.py section [2]: the picker says a saved
// port is there, or not connected, exactly when Python finds it or does not.
const P = (name: string, device?: string, maker?: string, id?: string): MidiPort => ({
  name,
  ...(device ? { device } : {}),
  ...(maker ? { maker } : {}),
  ...(id ? { id } : {}),
  notes: 0,
})
const here = [
  P("TD-17", "TD-17", "Roland", "1001"),
  P("Launchkey Mini MK3 MIDI Port", "Launchkey Mini MK3", "Novation"),
]

describe("findPort: a saved port found again among the ports there (P1)", () => {
  it("finds it by its id first, then by its name", () => {
    expect(findPort({ name: "renamed", id: "1001" }, here)).toEqual({ port: here[0], alike: false })
    expect(findPort({ name: "TD-17" }, here)).toEqual({ port: here[0], alike: false })
  })

  it("then by its name as Windows renumbers it", () => {
    expect(findPort({ name: "TD-17 1" }, [P("TD-17 2")]).port?.name).toBe("TD-17 2")
    expect(findPort({ name: "2- TD-17" }, [P("TD-17")]).port?.name).toBe("TD-17")
    expect(findPort({ name: "TD-17 1", device: "TD-17" }, [P("TD-17 2", "TD-17")]).port?.name).toBe(
      "TD-17 2"
    )
  })

  it("does not guess between two alike", () => {
    expect(findPort({ name: "TD-17" }, [P("TD-17"), P("TD-17")])).toEqual({ port: null, alike: true })
    expect(findPort({ name: "TD-17" }, [P("TD-17 1"), P("2- TD-17 2")])).toEqual({
      port: null,
      alike: true,
    })
    expect(
      findPort({ name: "renamed", id: "1001" }, [P("TD-17", "", "", "1001"), P("Keys", "", "", "1001")])
    ).toEqual({ port: null, alike: true })
  })

  it("says one not there is just missing", () => {
    expect(findPort({ name: "TD-17" }, [])).toEqual({ port: null, alike: false })
    expect(findPort({ name: "renamed", id: "1001" }, [P("TD-17")])).toEqual({ port: null, alike: false })
    expect(findPort({ name: "  " }, here)).toEqual({ port: null, alike: false })
    expect(findPort({ name: "2- " }, [P("3-")])).toEqual({ port: null, alike: false })
  })

  it("takes the exact name before the bare one", () => {
    expect(findPort({ name: "TD-17 1" }, [P("TD-17 1"), P("TD-17 2")]).port?.name).toBe("TD-17 1")
  })

  it("does not bind a KeyLab 49 to a KeyLab 61 by the name they share", () => {
    expect(
      findPort({ name: "KeyLab 49", device: "KeyLab 49" }, [P("KeyLab 61", "KeyLab 61")]).port
    ).toBeNull()
  })

  it("bareName takes off Windows' numbers and the space around", () => {
    expect(bareName("2- TD-17 1")).toBe("TD-17")
    expect(bareName("  2- TD-17 1 ")).toBe("TD-17")
  })
})

describe("the sentences a track's port line says (B8)", () => {
  it("says a port is in use by another app", () => {
    expect(portBusyText("TD-17")).toBe("“TD-17” is in use by another app.")
  })

  it("says a port is not connected, and that the track picks its notes up when it is plugged in", () => {
    expect(portGoneText("TD-17", "Drums")).toBe(
      "“TD-17” is not connected. Drums records its notes from the moment it is plugged in."
    )
  })
})

describe("portRef: a listed port as a band keeps it", () => {
  it("keeps what the system said of it, and not the check's count", () => {
    expect(portRef({ name: "TD-17", device: "TD-17", maker: "Roland", id: "1001", notes: 12 })).toEqual({
      name: "TD-17",
      device: "TD-17",
      maker: "Roland",
      id: "1001",
    })
  })

  it("leaves out what says nothing", () => {
    expect(portRef({ name: "TD-17", device: "", maker: " ", notes: 0 })).toEqual({ name: "TD-17" })
  })
})

describe("portLine: what a track's own port line says (D7, P2, P3, P5, P8)", () => {
  it("asks for a port while none is picked", () => {
    expect(portLine("none")).toBe("Pick a port, or set it to Audio.")
    // Before anything else: a track with no port shares none.
    expect(portLine("none", { sharing: "Bass", echo: "Keys" })).toBe("Pick a port, or set it to Audio.")
  })

  it("names the other track on the same port", () => {
    expect(portLine("ok", { sharing: "Bass" })).toBe("Bass takes notes from this port too.")
    // Before the port's own state: two on one port stops Start.
    expect(portLine("in_use", { sharing: "Bass" })).toBe("Bass takes notes from this port too.")
    expect(portLine("missing", { sharing: "Bass", echo: "Keys" })).toBe("Bass takes notes from this port too.")
  })

  it("says another app holds it", () => {
    expect(portLine("in_use")).toBe("In use by another app. Records its notes from the moment it is free.")
    expect(portLine("in_use", { echo: "Keys" })).toBe(
      "In use by another app. Records its notes from the moment it is free."
    )
  })

  it("says it is not connected", () => {
    expect(portLine("missing")).toBe("Not connected. Records its notes from the moment it is plugged in.")
    expect(portLine("missing", { echo: "Keys" })).toBe(
      "Not connected. Records its notes from the moment it is plugged in."
    )
  })

  it("asks whether one instrument is plugged in twice", () => {
    expect(portLine("ok", { echo: "Synth" })).toBe("Same notes as Synth. Plugged in twice?")
  })

  it("says nothing of a port that is fine, or of a track that takes no notes", () => {
    expect(portLine("ok")).toBeNull()
    expect(portLine(null, { sharing: "Bass", echo: "Keys" })).toBeNull()
  })
})
