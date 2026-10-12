import * as React from "react"
import { Tooltip as TooltipPrimitive } from "radix-ui"

import { focusIsLeftover, watchInput } from "@/hooks/useSpacebar"
import { cn } from "@/lib/utils"

/*
  The tooltip (C8), from shadcn's, in the theme: the text's colour as its
  ground, 12 px text, and 220 ms in and out (the animate-in and animate-out
  tokens, so it is there at once under Reduce motion). It is for a name a
  row had to cut, shown whole (B6), for what an icon button does, and for a
  word on a button that needs a line to say what it does (Stereo).

  Every Tooltip has a provider of its own, so one needs nothing round it. It
  waits 400 ms for a pointer, which on its way across the screen is not
  asking; keyboard focus opens it at once. Focus the mouse put there opens
  nothing: a click, or a menu or a popover shut with a click handing focus
  back to its button (an icon picked from a grid), would leave a tip open
  with no pointer over it, until focus moved on.
*/

function TooltipProvider({
  delayDuration = 400,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  )
}

function Tooltip(props: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return (
    <TooltipProvider>
      <TooltipPrimitive.Root data-slot="tooltip" {...props} />
    </TooltipProvider>
  )
}

/** What the tip is for. Its `onFocus` hears every focus; one the mouse left
 *  comes with its default prevented, which is what keeps Radix from opening
 *  the tip, and a caller that opens it itself (WholeTip) leaves it shut too. */
function TooltipTrigger({
  onFocus,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  React.useEffect(() => watchInput(), [])
  return (
    <TooltipPrimitive.Trigger
      data-slot="tooltip-trigger"
      onFocus={(e) => {
        if (focusIsLeftover(e.target)) e.preventDefault()
        onFocus?.(e)
      }}
      {...props}
    />
  )
}

function TooltipContent({
  className,
  sideOffset = 4,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          "z-50 w-fit max-w-xs origin-(--radix-tooltip-content-transform-origin) animate-in rounded-md bg-foreground px-3 py-1.5 text-xs text-balance text-background fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          className
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow
          // design-ok(radius): the arrow is a rotated square, a graphic that keeps its own corner
          className="z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px] bg-foreground fill-foreground"
        />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger }
