import type { Meta, StoryObj } from "@storybook/react-vite"
import { Button } from "./button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card"
import { PlayButton } from "./play-button"
import type { PlayLook } from "@/lib/playLook"

const meta = {
  title: "UI/Card",
  component: Card,
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => (
    <Card {...args}>
      <CardHeader>
        <CardTitle>Thursday rehearsal</CardTitle>
        <CardDescription>6 songs, 2 hours 10 minutes</CardDescription>
      </CardHeader>
      <CardContent>The room mic was on all evening.</CardContent>
      <CardFooter>
        <Button size="row">Open</Button>
      </CardFooter>
    </Card>
  ),
}

export const WithAction: Story = {
  render: (args) => (
    <Card {...args}>
      <CardHeader>
        <CardTitle>Thursday rehearsal</CardTitle>
        <CardDescription>6 songs, 2 hours 10 minutes</CardDescription>
        <CardAction>
          <Button variant="outline" size="row">Share</Button>
        </CardAction>
      </CardHeader>
    </Card>
  ),
}

const ROWS: { name: string; look: PlayLook; time: string }[] = [
  { name: "Blue in Green", look: "idle", time: "4:12" },
  { name: "Autumn Leaves", look: "playing", time: "5:30" },
  { name: "So What", look: "missing", time: "6:01" },
]

/** A group on its page: a heading and rows. It is set apart by its fill, with
 *  no border and no shadow; the page is the Storybook canvas, in the theme the
 *  toolbar says (dark to begin with). */
export const Group: Story = {
  render: (args) => (
    <Card {...args}>
      <CardHeader>
        <CardTitle>Last time</CardTitle>
        <CardDescription>Thursday, 6 songs</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {ROWS.map(({ name, look, time }) => (
          <div key={name} className="flex items-center gap-3">
            <PlayButton look={look} name={name} />
            <span className="min-w-0 flex-1 truncate">{name}</span>
            <span className="tnum text-muted-foreground">{time}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  ),
}
/** The same on the light theme, whatever the toolbar says. */
export const GroupLight: Story = { ...Group, globals: { theme: "light" } }
