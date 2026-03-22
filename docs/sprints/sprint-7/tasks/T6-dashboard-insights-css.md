# T6 — Color Migration: dashboard-insights.module.css

> **Status:** TODO
> **Branch:** `design/sprint-7-t6-dashboard-css`
> **Depends on:** T1 (merged)
> **Parallel with:** T3, T4, T5

---

## Context

You are working on **Fyrk**, a household finance app built with Next.js 15 + TypeScript. The project recently migrated its CSS variable palette from warm earth tones ("Warm Authority") to a high-contrast modern blue system ("10x Financial Copilot"). The CSS variables in `globals.css` have already been updated (Sprint 7, Task 1).

However, several component CSS module files still contain **hardcoded old-palette `rgb()` values** that bypass the CSS variables. These render as warm navy tints that clash with the new blue/neutral system.

Your job: replace all old-palette color references in **one specific file** so it matches the new design system. This is the smallest migration — only 1 occurrence.

---

## Prerequisites

Verify that T1 (foundation) is merged to main:

```bash
git fetch origin main
git log --oneline -3 origin/main
# Should show a commit referencing "design(S7-P1)" or "new color palette"
```

---

## Owned Files

You may ONLY modify this file:

```
src/components/dashboard/dashboard-insights.module.css
```

Do NOT touch any other file in the repository.

---

## Instructions

There is exactly **1 occurrence** of old-palette colors in this file.

### Occurrence 1 — Line 45 (card background gradient)

```css
/* BEFORE */
    radial-gradient(circle at 0% 0%, rgb(34 55 74 / 0.12) 0%, rgb(34 55 74 / 0) 32%),

/* AFTER */
    radial-gradient(circle at 0% 0%, rgb(0 102 255 / 0.12) 0%, rgb(0 102 255 / 0) 32%),
```

### Color mapping reference

| Find | Replace | Meaning |
|------|---------|---------|
| `rgb(34 55 74 / ...)` | `rgb(0 102 255 / ...)` | Brand navy -> brand blue (keep alpha) |

### Additional sweep

After the primary replacement, scan the entire file for any other warm-tinted values that may not match the grep pattern but still reference the old palette visually. Look for:

- Any hex codes like `#22374a`, `#9f7e4a`, `#4b725c`, `#b55d53` -> replace with CSS variable equivalents
- Any `rgb(23 32 42 / ...)` -> `rgb(0 0 0 / ...)`
- Any warm off-white text colors like `#f5efe6`, `#f8f6f1` -> `#f0f0f0`

If none are found, the single replacement above is sufficient.

---

## Verification

Run these commands and confirm they pass:

```bash
# Build must succeed
npm run build

# Lint must pass
npm run lint

# This grep MUST return 0 matches
grep -n "rgb(34 55 74\|rgb(159 126 74\|rgb(23 32 42\|#22374a\|#9f7e4a" src/components/dashboard/dashboard-insights.module.css

# Count check: should show 0
grep -c "rgb(34 55 74" src/components/dashboard/dashboard-insights.module.css
```

---

## PR Spec

```bash
# Branch
git checkout -b design/sprint-7-t6-dashboard-css origin/main

# After completing work
git add src/components/dashboard/dashboard-insights.module.css
git commit -m "design(S7-T6): migrate dashboard-insights.module.css to new palette

Replace 1 hardcoded old-palette color value:
- Navy brand gradient (rgb(34 55 74)) -> blue (rgb(0 102 255))

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"

git push -u origin design/sprint-7-t6-dashboard-css

gh pr create --title "design(S7-T6): migrate dashboard-insights.module.css to new palette" \
  --body "$(cat <<'EOF'
## Summary
- Replace 1 hardcoded old-palette color value in dashboard-insights.module.css
- Navy brand gradient (rgb(34 55 74)) -> blue (rgb(0 102 255))

## Test plan
- [ ] npm run build passes
- [ ] npm run lint passes
- [ ] `grep -c "rgb(34 55 74" src/components/dashboard/dashboard-insights.module.css` returns 0
- [ ] Visual: dashboard insight cards have no warm navy tint
- [ ] Dark mode renders correctly

Part of Sprint 7 — Design System Migration. See docs/sprints/sprint-7/SPRINT.md
EOF
)"
```

---

## Guardrails

- ONLY touch `src/components/dashboard/dashboard-insights.module.css`
- Do NOT change any class names, selectors, or CSS properties
- Do NOT change layout, sizing, spacing, or positioning values
- Do NOT change any `rgb(255 255 255 / ...)` values (white overlays are fine)
- ONLY change the RGB color channels — keep all alpha/opacity values identical
- Do NOT add new CSS rules or remove existing ones
