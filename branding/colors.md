# Orpheus colours

The neutrals are shared with AgentBox, so the products read as one family. The
accent is Orpheus's own. Values as CSS custom properties: [`interface/tokens.css`](interface/tokens.css).

## Neutrals

| Token | Light | Dark | Use |
|---|---|---|---|
| `bg` | `#F7F6F3` | `#0E0E10` | page background |
| `bg-raised` | `#FFFFFF` | `#17171A` | panels, cards |
| `bg-subtle` | `#F1EEE9` | `#1C1C1F` | selected rows, secondary surfaces |
| `ink` | `#0E0E10` | `#EDEDEB` | text, wordmark, primary buttons |
| `muted` | `#69635B` | `#A49D94` | secondary text, captions, table headers |
| `line` | `#E0DBD3` | `#2C2C30` | 1 px rules and borders |

Ink `#0E0E10` and Paper `#EDEDEB` are the AgentBox neutrals; they are also the
icon background and the mono logo colours.

## Accent

Flat green taken from the mark's gradient: terminal phosphor. One accent; colour
means state, nothing else.

| Token | Light | Dark | Use |
|---|---|---|---|
| `accent` | `#00AD71` | `#4EF2AA` | fills: markers, underlines, matrices |
| `accent-ink` | `#007E4F` | `#4EF2AA` | text on `bg` |

Contrast on `bg`: `#4EF2AA` on dark 13:1; `#007E4F` on light 4.7:1 (AA for
text); `#00AD71` on light 2.7:1, so it is for graphics, never for text.

The family orange (`#E8711A`, `#F28C28` in the dark theme) belongs to AgentBox;
Orpheus does not use it.

## Status

| State | Colour |
|---|---|
| running | `accent` marker, `accent-ink` label |
| paused | `muted` |
| done | `ink` |
| failed | `danger` marker, `danger-ink` label |

`danger` `#E75B61` is the only colour besides the accent. As text on the light
background it is 3.3:1, so labels use `danger-ink` `#B4373D` there (5.1:1); in
the dark theme `danger-ink` is `#E75B61` again.

## Console

The console is dark in both themes.

| Token | Value |
|---|---|
| `term-bg` | `#0B0B0D` |
| `term-fg` | `#D8D8D4` |
| `term-dim` | `#8B8B86` |
| `term-line` | `#26262B` |
| `term-ok` | `#4EF2AA` |
| `term-err` | `#E75B61` |

## Mark gradients

The mark is the only gradient in the system. Each ribbon has a linear gradient
with three stops; the lines are in [`scripts/build.py`](scripts/build.py).

| Ribbon | Start | Middle | End |
|---|---|---|---|
| Top-left | `#007B91` | `#09BBB4` | `#3FF1B6` |
| Right | `#03B399` | `#27DDA2` | `#43F59F` |
| Bottom | `#027281` | `#029B9D` | `#05BFAE` |
| Lower-left | `#008795` | `#06A8AB` | `#3AD2BC` |
