# color-mix

Two browser tools for the CSS `color-mix()` function.

No build step, no dependencies, no network requests. Open `index.html` in a
browser.

## Mixer — `index.html`

Mix two colors in any of the 15 CSS interpolation spaces. The page shows the
resolved value, a step ramp, and the CSS for both.

- Inputs accept any CSS color notation, and `transparent`.
- Output converts to 16 formats, from `hex` to `color(display-p3 …)`.
- The step count is configurable.

## Scale — `scale.html`

Build a design-system palette from one color. The color becomes the `500`.
Lighter steps go toward white and darker steps go toward black.

Two gradings are available:

- **Linear** — even mix increments outward from the base color.
- **L-shaped** — each step sits at a target lightness. The tints ease out and
  the shades ease in. This grading matches a hand-tuned palette to about one
  percentage point per step.

The page names the palette from the color, such as `mint` or `terracotta`. You
can override the name.

## How it works

The browser resolves every `color-mix()` expression. The pages report what the
browser does, so the values are the real ones.

`color-engine.js` converts notation only. It converts through XYZ D65 and
follows CSS Color Module Level 4 for the matrices, the transfer functions, and
the gamut mapping.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | The mixer page and its app code |
| `scale.html` | The scale page and its app code |
| `color-engine.js` | Color science: parse, convert, format, gamut map, name |
| `ui-common.js` | Clipboard, toast, theme, and the browser color probe |
| `styles.css` | Shared styles for both pages |
