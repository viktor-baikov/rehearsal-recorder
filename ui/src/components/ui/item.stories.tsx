import type { Meta, StoryObj } from "@storybook/react-vite"
import { CalendarDays, ChevronRight, Star } from "lucide-react"
import { Button } from "./button"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "./item"

const meta = {
  title: "UI/Item",
  component: Item,
  decorators: [
    (Story) => (
      <div className="w-[28rem] max-w-full">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Item>

export default meta
type Story = StoryObj<typeof meta>

const row = (
  <>
    <ItemContent>
      <ItemTitle>Tuesday jam</ItemTitle>
      <ItemDescription>Tue 22 Sep · 14 takes, 1 h 12 min</ItemDescription>
    </ItemContent>
    <ItemActions>
      <ChevronRight className="size-4 text-muted-foreground" />
    </ItemActions>
  </>
)

export const Default: Story = { render: (args) => <Item {...args}>{row}</Item> }
export const Outline: Story = { render: (args) => <Item {...args} variant="outline">{row}</Item> }
export const Muted: Story = { render: (args) => <Item {...args} variant="muted">{row}</Item> }

/** The tighter row, for a long list. */
export const Small: Story = { render: (args) => <Item {...args} size="sm">{row}</Item> }

export const WithMedia: Story = {
  render: (args) => (
    <Item {...args} variant="outline">
      <ItemMedia variant="icon">
        <CalendarDays />
      </ItemMedia>
      {row}
    </Item>
  ),
}

export const WithActions: Story = {
  render: (args) => (
    <Item {...args} variant="outline">
      <ItemContent>
        <ItemTitle>Viasna</ItemTitle>
        <ItemDescription>3 takes · best 4:12</ItemDescription>
      </ItemContent>
      <ItemActions>
        <Button variant="ghost" size="icon-row" aria-label="Star Viasna">
          <Star />
        </Button>
        <Button variant="outline" size="row">
          Open
        </Button>
      </ItemActions>
    </Item>
  ),
}

/** A row that goes somewhere is a link: Tab reaches it, Enter follows it,
 *  and it has the shared focus ring. */
export const AsALink: Story = {
  render: (args) => (
    <Item {...args} asChild>
      <a href="#tuesday-jam">{row}</a>
    </Item>
  ),
}

/** Rows in a list (it says so to a screen reader), set apart by a line. */
export const Group: Story = {
  render: (args) => (
    <ItemGroup>
      {["Tuesday jam", "Sunday, the big room", "Soundcheck"].map((name, i) => (
        <div key={name} className="contents">
          {i > 0 && <ItemSeparator />}
          <Item {...args} asChild role="listitem">
            <a href={`#${i}`}>
              <ItemContent>
                <ItemTitle>{name}</ItemTitle>
                <ItemDescription>{`${22 - i * 7} Sep · ${14 - i * 4} takes`}</ItemDescription>
              </ItemContent>
              <ItemActions>
                <ChevronRight className="size-4 text-muted-foreground" />
              </ItemActions>
            </a>
          </Item>
        </div>
      ))}
    </ItemGroup>
  ),
}

/** A long title wraps and the description stops at two lines (B6): the row
 *  grows to fit it. */
export const LongTitle: Story = {
  render: (args) => (
    <Item {...args} variant="outline">
      <ItemContent>
        <ItemTitle>
          Kalychanka (the long one, with the bridge in G, as we played it after the break)
        </ItemTitle>
        <ItemDescription>
          Played twice, and the second take is the one we kept. The first one had a drum fill we
          would rather forget, and the third was cut short when the amp went.
        </ItemDescription>
      </ItemContent>
    </Item>
  ),
}
