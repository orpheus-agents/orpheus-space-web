# Orpheus interface

How the web UI looks. The sessions screen in `interface/` follows these rules:

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="interface/sessions-dark.png">
  <img src="interface/sessions-light.png" alt="Sessions screen" width="640">
</picture>

References: agentbox.ru and e2b.dev. Near-black and off-white, one accent, mono
captions, sharp corners, 1 px lines, dot matrices.

## Principles

- One accent. Everything else is ink, paper and greys; colour means state.
- Sharp. No rounded corners, except console windows.
- Lines, not shadows. Surfaces are separated by 1 px rules and `bg-raised`.
- Type does the styling: display face for titles, mono for data, system sans
  for reading.
- Both themes, always. Every screen is designed in light and dark; tokens
  switch, the layout does not.

## Type

Fonts are in `fonts/`; body text uses the system sans and loads nothing.

| Role | Face | Size | Notes |
|---|---|---|---|
| Product word (`Space`) | Besley Italic 500 | 21 px | next to the logo only; sized to the wordmark's cap height; Latin subset in `fonts/` |
| Page title | Martian Grotesk SemiExpanded ExtraBold | 40 px | tracking −0.035 em |
| Panel title | Martian Grotesk SemiExpanded Bold | 22 px | tracking −0.025 em |
| Navigation, buttons | Martian Mono Condensed | 12 px | uppercase, tracking 0.08 em; active item SemiBold |
| Table header | Martian Mono Condensed | 11 px | uppercase, `muted` |
| Data: ids, versions, times | Martian Mono Condensed | 13 px | |
| Code, commands, tool output, front matter | JetBrains Mono | 12 px | content, not UI; loaded from npm (`@fontsource/jetbrains-mono`) |
| Names, descriptions | system sans | 13–14 px | |
| Body copy | system sans | 16 px | line height 1.6 |

## Layout

- Page gutter 32 px, content up to 1536 px, 8 px rhythm.
- Header 56 px: logo 22 px tall, mono navigation, 1 px rule below. The active
  item has a 2 px accent underline. A section that is not built yet stays in the
  navigation as muted text with `· soon`, not a link. On the right: settings as
  icon menus (language, time zone, theme), then a 1 px divider, the account name
  in mono and the sign-out icon.
- Product lockup: the Orpheus logo, then the product word in the italic serif,
  in `ink` and sentence case, so it reads as a name rather than a menu item.
  The word stands on the wordmark's baseline and its capital is as tall as the
  wordmark's letters: in the logo's 112-unit box the letters run from y=16 to
  y=96, so the baseline is 16/112 of the logo height above its bottom edge and
  the cap height is 80/112. Narrow screens keep the mark and the word, with the
  capital centred on the mark.
- Page order: title → content, with a one-line description under the title
  only where the screen needs one. No captions or eyebrows above titles.
- Tables: header row, 44 px rows, 1 px rules, selected row on `bg-subtle`,
  no zebra stripes.
- Panels: `bg-raised` with a 1 px `line` border, 20 px padding.
- Buttons: 40 px tall, square. Primary is `ink` with `bg` text; secondary is
  a 1 px `ink` border.
- Forms: a schedule's repeat rule is a plain choice (every day, weekdays, chosen
  days, monthly, every few hours or minutes) with a sentence under it; the raw
  cron stays visible in mono and editable in the last option. Validation from
  the API is a `danger-ink` line under its field, not only a toast.

## Components

- Status: an 8 px square in the state colour before a mono label; `running` is
  SemiBold in `accent-ink`.
- Console: `term-bg`, radius 10 px, a 30 px title bar with a mono caption
  (`codex · sbx_2a71 · live`), no traffic lights. Prompts in `term-ok`,
  output in `term-fg`, paths in `term-dim`. A tool call shows its command as a
  `$` prompt line at once; the output is collapsed under an `OUTPUT · EXIT CODE`
  caption.
- Front matter: YAML at the top of a message sits in its own bordered block,
  keys in `accent-ink`, values in `ink`, smaller than the body.
- Matrix: 10 px squares on a 14 px pitch; `bg-subtle` empty, `line` idle,
  `accent` busy. For pools and activity at a glance, not for exact numbers.
- Bars: a stacked bar 8 px tall, square, on `bg-subtle`, segments without
  gaps in `ink`, `accent`, `muted` and `danger`. A share nested in a segment
  (cached input inside input) is the same colour hatched: 2 px stripes on a
  5 px pitch over `bg-raised`. A mono legend with markers follows the bar,
  hatched markers for nested shares; the numbers live in the legend, and no
  percentages are shown. A ranked list (namespaces) puts the name and value
  on one mono line above a full-width bar scaled to the largest row, without
  a legend; the breakdown is a tooltip.
- Quota window: the window name and the reset countdown on one line, then
  what is left as the number and as the bar fill (`ink`, `danger` under 10 %,
  `muted` when stale). Usage above 100 % is spelled out next to the number.
  The account's freshness is one marker with the observation time in the
  card corner, not a sentence. The count of available resets is the line
  right under it: `ink` when fresh, `muted` with the marker when stale,
  absent when unknown; zero is shown.
- Dither: Bayer fields for hero areas and empty states, as on agentbox.ru;
  ink or accent on `bg` at low density.

## Logo in the interface

- Header: `logo/orpheus-logo.svg` on dark, `orpheus-logo-light.svg` on light,
  22–24 px tall.
- Narrow screens: the mark alone, 24 px.
- Favicon and app icons: `web/`.
- The mark is never recoloured. The mono logo is for one-colour contexts, not
  for the app header.

## Don't

- No pill-shaped chips: tags are square, or plain text with a marker.
- No fake browser chrome with three dots.
- No monospace for body copy.
- No gradients in the UI; the mark is the only one.
- No third colour: errors use `danger`, everything else is ink, greys and the
  accent.
