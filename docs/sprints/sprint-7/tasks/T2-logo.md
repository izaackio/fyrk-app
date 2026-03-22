# T2 — Logo: Instrument Serif f Mark

> **Status:** COMPLETE
> **PR:** #52 (merged to main)

## Summary of what was done

1. **icons.tsx** — Replaced `FyrkMark` SVG rectangle icon with an SVG `<text>` element rendering the Instrument Serif italic `f` character. Uses `currentColor` fill for light/dark mode compatibility.

This task depends on T1 (Instrument Serif font must be loaded via layout.tsx).
