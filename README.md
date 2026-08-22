# color-mix

Two browser tools for the CSS `color-mix()` function.

No build step, no dependencies, no network requests. Open `index.html` in a
browser.

## Mixer

Mix two colors in any of the 15 CSS interpolation spaces. The page shows the
resolved value, a step ramp, and the CSS for both.

- Inputs accept any CSS color notation, and `transparent`.
- Output converts to 16 formats, from `hex` to `color(display-p3 …)`.
- The step count is configurable.

## Scale

Build a design-system palette from one color. The color becomes the `500`.
Lighter steps go toward white and darker steps go toward black.

Three gradings are available:

- **Linear** — even mix increments outward from the base color.
- **L-shaped** — each step sits at a target lightness. The tints ease out and
  the shades ease in. This grading matches a hand-tuned palette to about one
  percentage point per step.
- **Custom** — no mix at all. Each step reads the base color with relative
  color syntax and rewrites the three `oklch()` channels.

The page names the palette from the color, such as `mint` or `terracotta`. You
can override the name.

## The custom rail

Pick `Custom` as the interpolation space. The curve reads `Custom` and locks,
and hue interpolation turns off, because the rail sets every channel itself.

```css
:root {
  --mint:     #3eb489;
  --mint-300: oklch(from var(--mint) 0.81 calc(c * 0.49) h);
  --mint-500: oklch(from var(--mint) 0.62 c              h);
  --mint-700: oklch(from var(--mint) 0.49 calc(c * 1.14) h);
}
```

Each channel plays a different part:

- **L** is an absolute rail. Every palette puts its 300 at the same lightness,
  so a generated 300 contrast-matches Tailwind's 300 whatever the base color
  is.
- **C** is a relative bell, scaled from the base color's own chroma. A muted
  base gives a muted ramp instead of one that blows out around 600.
- **H** is constant. Hue is linear enough in `oklch` that a drift buys little.

The 500 keeps the base color's hue and chroma but not its lightness. That is
the point of the mode: the rail stays intact.

The table holds eleven anchors, from 50 to 950. Between the anchors the rail
interpolates. Past the ends it extends the last segment, so a 20-step scale
still separates its outermost steps.

The mode needs relative color syntax. Chrome 119, Safari 16.4 and Firefox 128
support it. Older browsers get a banner.

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
