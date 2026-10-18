import { Component, type ErrorInfo, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { reportPageError } from "@/lib/bridgeErrors"

/**
 * A screen that throws while it is drawn would take the whole window with
 * it: React takes down everything in the page, the problem bar included,
 * and the band is left with an empty window and no way on. This keeps the
 * window. The error goes on the problem bar and into crash.log, like any
 * other problem raised in the page (reportPageError), and the screen's place
 * says so, with Try again, which draws the app anew.
 */
export class CrashGuard extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    // The component stack says which screen and which part of it.
    const e = error instanceof Error ? error : new Error(String(error))
    if (info.componentStack) e.stack = `${e.stack ?? ""}\n${info.componentStack}`
    reportPageError("this screen", e)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main
        data-crash-guard
        className="flex h-screen flex-col items-center justify-center gap-4 p-8 text-center"
      >
        <p className="text-base font-medium">This screen could not open.</p>
        <p className="max-w-md text-sm text-muted-foreground">
          What went wrong is in the bar at the top.
        </p>
        <Button variant="outline" onClick={() => this.setState({ failed: false })}>
          Try again
        </Button>
      </main>
    )
  }
}
