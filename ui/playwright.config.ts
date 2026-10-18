import { defineConfig, devices } from "@playwright/test"

// The interface in a real browser, against the faked Python side in
// e2e/fake-bridge.js. For what needs a page laid out and a mouse: the
// recording screen's tiles, the timeline, the keys. What can be checked
// without a browser is in the Vitest files beside the code.
//
// It drives ui/dist, so build first: npm run build && npm run test:e2e.

const PORT = 4178

export default defineConfig({
  testDir: "./e2e",
  // Each test sets up the state it needs, so they run side by side — four at
  // a time. Eight browsers at once on an eight-core laptop starved each
  // other, and a player test that takes a few seconds on its own ran past
  // its time; CI's Linux runner has four cores.
  fullyParallel: true,
  workers: 4,
  timeout: 60_000,
  forbidOnly: !!process.env.CI,
  // A test that passes on its second go is a test that fails sometimes; that
  // is worth seeing, not hiding.
  retries: 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    // Every test records a trace, kept when it fails: each step, the page as
    // it stood at that step, the console. Not the film of screenshots a trace
    // takes by default: in a four-core cloud container, where Claude runs the
    // suite, encoding it was a third of the time, for every test, passed or
    // not; on CI's runner it costs little. A failed test still leaves a
    // picture of where it stopped.
    trace: { mode: "retain-on-failure", screenshots: false },
    screenshot: "only-on-failure",
    // The browser asks for less motion, so the app leaves its animations out
    // (index.css). Nearly every test waits for the screen to rise into place
    // before it clicks anything (settled, in e2e/app.ts), so the animations
    // only cost waiting: without them the whole suite took a fifth less time.
    // A test of the motion itself says reducedMotion: "no-preference".
    reducedMotion: "reduce",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1180, height: 820 } },
    },
  ],
  webServer: {
    command: `node e2e/serve.mjs ${PORT}`,
    url: `http://127.0.0.1:${PORT}/index.html`,
    reuseExistingServer: !process.env.CI,
  },
})
