# Notes for Claude

## Writing

Two rules hold for every text in this repository: the app's own words,
README.md, `docs/`, the site's words in `site/content/`, CHANGELOG.md,
code comments, commit messages and pull request descriptions. Rule 1 also
holds for prose written outside it, such as messages to the project's owner.

### 1. No AI tells

Write about the thing itself, as a careful person would. Leave out:

- a contrast with something nobody said: "not X but Y", "it's not just X";
- a closing line that repeats its paragraph: "That is the real win.";
- a run-up before the point: "Here's the thing", "Let's dive in";
- a list of three where the meaning has fewer parts;
- a dash between every pair of clauses;
- words that inflate: crucial, robust, seamless, pivotal, key, showcase,
  delve, enhance;
- chat leftovers: "Great question", "I hope this helps", "Let me know";
- sentences about the text instead of its subject: "The table below
  compares…".

For anything longer than a few sentences, such as a section of the guide, a
part of the site, a CHANGELOG entry or a pull request description, read the
humanizer skill (`.claude/skills/humanizer/`) and go through its checks before
you finish. Prose in Russian goes through the sokrati skill
(`.claude/skills/sokrati/`) in the same way.

### 2. Plain, with explanations

Whoever reads the app's words, the guide, README or the site is a musician
at a rehearsal or getting ready for one, and is reading to get something
done. They are not a programmer.

- Put what to do first, and the detail after it.
- Explain a term the first time a page uses it: ASIO, sample rate, bit
  depth, mono and stereo. Say what it means for the band, not how it works
  inside.
- Give the reason wherever the reader could go wrong or be surprised: why to
  unblock the zip on Windows, why ASIO shows more inputs.
- Call one thing by one word everywhere. The app's words are take, rehearsal,
  song, set, track, mark and label. A take is never a "go" outside the code
  (`docs/design-notes.md`, "The interface says take"). A second word for the
  same thing makes the reader wonder whether it is a second thing.
- Use short sentences and everyday words: use, start, before, rather than
  utilise, commence, prior to.
- Show an example from the app instead of describing it in general:
  "Pałyn 3", "Room for about 29 h 25 min of recording".

### Where this repository's rules come first

The two skills are general. Where they disagree with the rules below, the
rules below win.

- The app's wording follows `docs/design-system.md`: sentence case and no
  capitals made by CSS (F7), the system's words for keys and the Trash (P2),
  "Cancel" and a verb in a dialog (C3), and a name in a title in curly quotes,
  *Delete “Fix”?* (B8). In the docs, keep the quote marks of the file you
  are in.
- In the guide and in CHANGELOG a button or menu is written in bold,
  **Settings**, so the reader can find it on screen. That bold is not
  decoration. Each CHANGELOG item starts with a bold sentence, because the
  site shows the first one as its news line (CONTRIBUTING.md, Releasing).
- Everything a user reads is in English, with British spelling: colour.
- Test labels and CI check names use only characters cp1252 can print,
  because Windows CI prints in it (`tests/test_engine.py`, `ok()`).

The texts written before these rules have not been checked against them yet,
so do not copy their style without looking. That check comes after the
design system's release (#51).

### The skills

Both are copied unchanged, with their licences, so that every session gets
the same version:

- humanizer, from https://github.com/blader/humanizer at
  `8c307f367c91bd974002f10f2be2965d642c13df`, MIT;
- sokrati, from https://github.com/iamursky/sokrati at
  `6255b82d5f25de5e8ef8ebd4bbe1fbeded0a1865`, MIT.

To update one, copy the newer files over it and change its commit here.
