# T2 — Logo: Replace FyrkMark with Instrument Serif ƒ

> **Status:** ✅ COMPLETE
> **Branch:** `codex/design/phase-2-logo`
> **Commit:** `fce266f design(S7-P2): replace logo with Instrument Serif ƒ mark`

## Summary of what was done

Replaced `FyrkMark` in `src/components/layout/icons.tsx` from an SVG rectangle-with-lines icon to an SVG `<text>` element rendering the Instrument Serif italic ƒ glyph.

The component remains an SVG element (preserving all existing call sites) while rendering the approved Pure Typeset ƒ brand mark.
