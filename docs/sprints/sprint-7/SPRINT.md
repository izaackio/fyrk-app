# Sprint 7 — Design System Migration: "10x Financial Copilot"

> **Goal:** Migrate the entire codebase from "Warm Authority" to the approved "10x Financial Copilot" design system — new fonts, new colors, new logo, zero old-palette remnants.

> **Design concept:** [design-10x.html](../../design-10x.html)
> **Brand guidelines:** [BRAND_GUIDELINES.md](../../BRAND_GUIDELINES.md) (v1.0)
> **Logo decision:** Proposal 3 — The Pure Typeset f (Instrument Serif italic)

---

## Task Index

| Task | Description | Files | Status | PR |
|------|------------|-------|--------|-----|
| **T1** | Foundation: fonts + colors + brand doc | `layout.tsx`, `globals.css`, `BRAND_GUIDELINES.md` | COMPLETE | #51 merged |
| **T2** | Logo: f mark in icons | `icons.tsx` | COMPLETE | #52 merged |
| **T3** | Color migration: theme.module.css | `theme.module.css` | TODO | — |
| **T4** | Color migration: shell.module.css | `shell.module.css` | TODO | — |
| **T5** | Color migration: landing.module.css | `landing.module.css` | TODO | — |
| **T6** | Color migration: dashboard-insights.module.css | `dashboard-insights.module.css` | TODO | — |

---

## Dependency Graph

```
T1 --> COMPLETE (merged)
T2 --> COMPLETE (merged)

Remaining (all parallel — zero shared files):

T3 (theme.module.css)     -+
T4 (shell.module.css)     -+--> ALL merge --> Sprint 7 DONE
T5 (landing.module.css)   -+
T6 (dashboard-insights)   -+
```

**T3, T4, T5, T6 can ALL run simultaneously.** They touch completely different files.

---

## Definition of Done

After all task PRs are merged to main, verify:

```
AUTOMATED:
  [ ] npm run build — zero errors
  [ ] npm run lint — zero violations

ZERO OLD-PALETTE (this grep MUST return 0 results):
  grep -rn "rgb(34 55 74\|rgb(159 126 74\|rgb(23 32 42\|rgb(21 34 46\|rgb(25 38 50\|rgb(48 65 79\|rgb(71 89 104\|#22374a\|#9f7e4a" src/ --include="*.css" --include="*.tsx"

VISUAL:
  [ ] App renders with DM Sans body text
  [ ] Editorial text renders in Instrument Serif italic
  [ ] Logo shows f glyph in sidebar
  [ ] Page background is neutral #fafafa, not warm cream
  [ ] Primary brand color is #0066ff blue throughout
  [ ] Status colors (green/red) are vibrant, not muted
  [ ] No warm navy/gold tints visible anywhere in the UI
  [ ] Dark mode fully functional — no white-on-white or black-on-black

BRAND CONSISTENCY:
  [ ] All hex values in BRAND_GUIDELINES.md match globals.css
  [ ] All font names in BRAND_GUIDELINES.md match layout.tsx
  [ ] Zero references to old names in docs/BRAND_GUIDELINES.md:
      grep "Playfair\|JetBrains\|Forest Navy\|Terracotta\|Sage Green\|Warm Authority" docs/BRAND_GUIDELINES.md
```

---

## Color Migration Cheat Sheet

All T3-T6 agents use these exact replacements:

```
FIND                              -> REPLACE WITH
rgb(34 55 74 / ...)               -> rgb(0 102 255 / ...)      [keep same alpha]
rgb(159 126 74 / ...)             -> rgb(245 166 35 / ...)     [keep same alpha]
rgb(23 32 42 / ...)               -> rgb(0 0 0 / ...)          [keep same alpha]
rgb(75 114 92 / ...)              -> rgb(0 168 102 / ...)      [keep same alpha]
rgb(181 93 83 / ...)              -> rgb(224 62 62 / ...)      [keep same alpha]
rgb(21 34 46 / ...)               -> rgb(0 40 120 / ...)       [keep same alpha]
rgb(71 89 104 / ...)              -> rgb(40 100 200 / ...)     [keep same alpha]
rgb(48 65 79 / ...)               -> rgb(20 70 160 / ...)      [keep same alpha]
rgb(25 38 50 / ...)               -> rgb(0 50 140 / ...)       [keep same alpha]
#22374a                           -> var(--co-brand-primary)   [or #0066ff in gradients]
#9f7e4a                           -> var(--co-brand-accent)    [or #f5a623 in gradients]
#4b725c                           -> var(--co-status-up)       [or #00a866]
#b55d53                           -> var(--co-status-down)     [or #e03e3e]
```

**Rule:** Prefer `var(--co-*)` over hardcoded hex where CSS syntax allows. Use raw hex only inside gradient color stops or shadow definitions that require literal values.
