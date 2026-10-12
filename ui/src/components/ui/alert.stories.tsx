import type { Meta, StoryObj } from "@storybook/react-vite"
import { CircleAlert, Info, TriangleAlert } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "./alert"

const meta = {
  title: "UI/Alert",
  component: Alert,
  decorators: [
    (Story) => (
      <div className="w-96 max-w-full">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Alert>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => (
    <Alert {...args}>
      <Info />
      <AlertTitle>The check is off</AlertTitle>
      <AlertDescription>Press Check signal to see each input’s level.</AlertDescription>
    </Alert>
  ),
}

/** What is true but not as it should be: the theme’s warning colour on the
 *  icon and the edge, and a faint wash. */
export const Warning: Story = {
  render: (args) => (
    <Alert {...args} variant="warning">
      <TriangleAlert />
      <AlertTitle>No input picked</AlertTitle>
      <AlertDescription>Pick the input this track plugs into, or set it to MIDI.</AlertDescription>
    </Alert>
  ),
}

export const Destructive: Story = {
  render: (args) => (
    <Alert {...args} variant="destructive">
      <CircleAlert />
      <AlertTitle>Could not start</AlertTitle>
      <AlertDescription>The audio device is in use by another app.</AlertDescription>
    </Alert>
  ),
}

/** The words alone, as the start screen's notes about a track: no icon, no
 *  title. */
export const WordsOnly: Story = {
  render: (args) => (
    <div className="flex flex-col gap-3">
      <Alert {...args} variant="warning">
        <AlertDescription>Not connected. Records its notes from the moment it is plugged in.</AlertDescription>
      </Alert>
      <Alert {...args}>
        <AlertDescription>Same notes as Keys. Plugged in twice?</AlertDescription>
      </Alert>
    </div>
  ),
}

/** The icon and one line of title. */
export const TitleOnly: Story = {
  render: (args) => (
    <Alert {...args} variant="warning">
      <TriangleAlert />
      <AlertTitle>Nothing is coming in</AlertTitle>
    </Alert>
  ),
}

/** Long words wrap under the title, and the icon keeps its place. */
export const Long: Story = {
  render: (args) => (
    <Alert {...args} variant="warning">
      <TriangleAlert />
      <AlertTitle>In use by another app</AlertTitle>
      <AlertDescription>
        <p>
          Records its notes from the moment it is free. Close the other app, or pick another port
          for this track, and the notes start coming in at once.
        </p>
      </AlertDescription>
    </Alert>
  ),
}
