# T3 — Color Migration: theme.module.css

> **Status:** TODO
> **Branch:** `design/sprint-7-t3-theme-css`
> **Depends on:** T1 (merged)
> **Parallel with:** T4, T5, T6

---

## Context

You are working on **Fyrk**, a household finance app built with Next.js 15 + TypeScript. The project recently migrated its CSS variable palette from warm earth tones ("Warm Authority") to a high-contrast modern blue system ("10x Financial Copilot"). The CSS variables in `globals.css` have already been updated (Sprint 7, Task 1).

However, several component CSS module files still contain **hardcoded old-palette `rgb()` values** that bypass the CSS variables. These render as warm navy/gold tints that clash with the new blue/neutral system.

Your job: replace all old-palette color references in **one specific file** so it matches the new design system.

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
src/components/theme/theme.module.css
```

Do NOT touch any other file in the repository.

---

## Instructions

There are exactly **5 occurrences** of old-palette colors in this file. Replace each one using the mapping below.

### Occurrence 1 — Line 237 (button shadow)

```css
/* BEFORE */
    0 14px 28px rgb(34 55 74 / 16%);

/* AFTER */
    0 14px 28px rgb(0 102 255 / 16%);
```

### Occurrence 2 — Line 249 (button hover shadow)

```css
/* BEFORE */
    0 18px 30px rgb(34 55 74 / 20%);

/* AFTER */
    0 18px 30px rgb(0 102 255 / 20%);
```

### Occurrence 3 — Line 664 (card shadow)

```css
/* BEFORE */
    0 10px 18px rgb(23 32 42 / 6%);

/* AFTER */
    0 10px 18px rgb(0 0 0 / 6%);
```

### Occurrence 4 — Line 773 (card shadow)

```css
/* BEFORE */
    0 10px 18px rgb(23 32 42 / 6%);

/* AFTER */
    0 10px 18px rgb(0 0 0 / 6%);
```

### Occurrence 5 — Line 1010 (card shadow)

```css
/* BEFORE */
    0 14px 24px rgb(23 32 42 / 6%);

/* AFTER */
    0 14px 24px rgb(0 0 0 / 6%);
```

### Color mapping reference

| Find | Replace | Meaning |
|------|---------|---------|
| `rgb(34 55 74 / ...)` | `rgb(0 102 255 / ...)` | Brand navy -> brand blue (keep alpha) |
| `rgb(23 32 42 / ...)` | `rgb(0 0 0 / ...)` | Warm black shadow -> neutral black (keep alpha) |

### Additional cleanup

After making the 5 replacements, also check for any remaining warm-tinted text colors that reference old values. Specifically, the line after occurrence 1 has:

```css
/* Line 238 — check this */
  color: #f8f6f1;
```

This is a warm off-white. Replace with a clean white:

```css
  color: #f0f0f0;
```

---

## Verification

Run these commands and confirm they pass:

```bash
# Build must succeed
npm run build

# Lint must pass
npm run lint

# This grep MUST return 0 matches
grep -n "rgb(34 55 74\|rgb(159 126 74\|rgb(23 32 42\|#22374a\|#9f7e4a" src/components/theme/theme.module.css

# Count check: should show 0
grep -c "rgb(34 55 74\|rgb(23 32 42" src/components/theme/theme.module.css
```

---

## PR Spec

```bash
# Branch
git checkout -b design/sprint-7-t3-theme-css origin/main

# After completing work
git add src/components/theme/theme.module.css
git commit -m "design(S7-T3): migrate theme.module.css to new palette

Replace 5 hardcoded old-palette color values:
- Navy brand shadows -> blue brand shadows
- Warm-black card shadows -> neutral black
- Warm off-white text -> clean white

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"

git push -u origin design/sprint-7-t3-theme-css

gh pr create --title "design(S7-T3): migrate theme.module.css to new palette" \
  --body "$(cat <<'EOF'
## Summary
- Replace 5 hardcoded old-palette color values in theme.module.css
- Navy brand shadows (rgb(34 55 74)) -> blue (rgb(0 102 255))
- Warm-black card shadows (rgb(23 32 42)) -> neutral (rgb(0 0 0))
- Warm off-white text (#f8f6f1) -> clean (#f0f0f0)

## Test plan
- [ ] npm run build passes
- [ ] npm run lint passes
- [ ] `grep -c "rgb(34 55 74\|rgb(23 32 42" src/components/theme/theme.module.css` returns 0
- [ ] Visual: no warm navy tints in themed components
- [ ] Dark mode renders correctly

Part of Sprint 7 — Design System Migration. See docs/sprints/sprint-7/SPRINT.md
EOF
)"
```

---

## Guardrails

- ONLY touch `src/components/theme/theme.module.css`
- Do NOT change any class names, selectors, or CSS properties
- Do NOT change layout, sizing, spacing, or positioning values
- Do NOT change any `rgb(255 255 255 / ...)` values (white overlays are fine)
- ONLY change the RGB color channels — keep all alpha/opacity values identical
- Do NOT add new CSS rules or remove existing ones
