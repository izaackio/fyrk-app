# T4 — Color Migration: shell.module.css

> **Status:** TODO
> **Branch:** `design/sprint-7-t4-shell-css`
> **Depends on:** T1 (merged)
> **Parallel with:** T3, T5, T6

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
src/components/layout/shell.module.css
```

Do NOT touch any other file in the repository.

---

## Instructions

There are exactly **12 occurrences** of old-palette colors in this file. Replace each one using the mappings below.

### Occurrence 1 — Line 21 (background radial gradient, amber accent)

```css
/* BEFORE */
    radial-gradient(circle at 12% 12%, rgb(159 126 74 / 14%), transparent 28%),

/* AFTER */
    radial-gradient(circle at 12% 12%, rgb(245 166 35 / 14%), transparent 28%),
```

### Occurrence 2 — Line 22 (background radial gradient, navy brand)

```css
/* BEFORE */
    radial-gradient(circle at 88% 10%, rgb(34 55 74 / 10%), transparent 24%),

/* AFTER */
    radial-gradient(circle at 88% 10%, rgb(0 102 255 / 10%), transparent 24%),
```

### Occurrence 3 — Line 119 (box-shadow, warm black)

```css
/* BEFORE */
    0 16px 32px rgb(23 32 42 / 6%);

/* AFTER */
    0 16px 32px rgb(0 0 0 / 6%);
```

### Occurrence 4 — Line 167 (linear gradient, amber accent)

```css
/* BEFORE */
    linear-gradient(135deg, rgb(159 126 74 / 10%) 0%, transparent 62%);

/* AFTER */
    linear-gradient(135deg, rgb(245 166 35 / 10%) 0%, transparent 62%);
```

### Occurrence 5 — Line 169 (box-shadow, warm black)

```css
/* BEFORE */
  box-shadow: 0 16px 34px rgb(23 32 42 / 7%);

/* AFTER */
  box-shadow: 0 16px 34px rgb(0 0 0 / 7%);
```

### Occurrence 6 — Line 187 (box-shadow, warm black)

```css
/* BEFORE */
    0 24px 52px rgb(23 32 42 / 7%);

/* AFTER */
    0 24px 52px rgb(0 0 0 / 7%);
```

### Occurrence 7 — Line 209 (::after radial gradient, navy brand)

```css
/* BEFORE */
  background: radial-gradient(circle at top right, rgb(34 55 74 / 8%), transparent 32%);

/* AFTER */
  background: radial-gradient(circle at top right, rgb(0 102 255 / 8%), transparent 32%);
```

### Occurrence 8 — Line 264 (box-shadow, warm black)

```css
/* BEFORE */
    0 24px 44px rgb(23 32 42 / 8%);

/* AFTER */
    0 24px 44px rgb(0 0 0 / 8%);
```

### Occurrence 9 — Line 480 (box-shadow, warm black)

```css
/* BEFORE */
    0 10px 18px rgb(23 32 42 / 7%);

/* AFTER */
    0 10px 18px rgb(0 0 0 / 7%);
```

### Occurrence 10 — Line 629 (box-shadow, warm black)

```css
/* BEFORE */
  box-shadow: 0 12px 26px rgb(23 32 42 / 5%);

/* AFTER */
  box-shadow: 0 12px 26px rgb(0 0 0 / 5%);
```

### Occurrence 11 — Line 640 (box-shadow, warm black)

```css
/* BEFORE */
    0 16px 28px rgb(23 32 42 / 8%);

/* AFTER */
    0 16px 28px rgb(0 0 0 / 8%);
```

### Occurrence 12 — Line 699 (box-shadow, warm black)

```css
/* BEFORE */
  box-shadow: 0 24px 40px rgb(23 32 42 / 12%);

/* AFTER */
  box-shadow: 0 24px 40px rgb(0 0 0 / 12%);
```

### Color mapping reference

| Find | Replace | Meaning |
|------|---------|---------|
| `rgb(159 126 74 / ...)` | `rgb(245 166 35 / ...)` | Gold accent -> amber accent (keep alpha) |
| `rgb(34 55 74 / ...)` | `rgb(0 102 255 / ...)` | Brand navy -> brand blue (keep alpha) |
| `rgb(23 32 42 / ...)` | `rgb(0 0 0 / ...)` | Warm black shadow -> neutral black (keep alpha) |

---

## Verification

Run these commands and confirm they pass:

```bash
# Build must succeed
npm run build

# Lint must pass
npm run lint

# This grep MUST return 0 matches
grep -n "rgb(34 55 74\|rgb(159 126 74\|rgb(23 32 42\|#22374a\|#9f7e4a" src/components/layout/shell.module.css

# Count check: should show 0
grep -c "rgb(34 55 74\|rgb(159 126 74\|rgb(23 32 42" src/components/layout/shell.module.css
```

---

## PR Spec

```bash
# Branch
git checkout -b design/sprint-7-t4-shell-css origin/main

# After completing work
git add src/components/layout/shell.module.css
git commit -m "design(S7-T4): migrate shell.module.css to new palette

Replace 12 hardcoded old-palette color values:
- Amber accent gradients (rgb(159 126 74)) -> amber (rgb(245 166 35))
- Navy brand gradients (rgb(34 55 74)) -> blue (rgb(0 102 255))
- Warm-black shadows (rgb(23 32 42)) -> neutral (rgb(0 0 0))

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"

git push -u origin design/sprint-7-t4-shell-css

gh pr create --title "design(S7-T4): migrate shell.module.css to new palette" \
  --body "$(cat <<'EOF'
## Summary
- Replace 12 hardcoded old-palette color values in shell.module.css
- Amber accent gradients -> new amber (rgb(245 166 35))
- Navy brand gradients -> blue (rgb(0 102 255))
- Warm-black shadows -> neutral black (rgb(0 0 0))

## Test plan
- [ ] npm run build passes
- [ ] npm run lint passes
- [ ] `grep -c "rgb(34 55 74\|rgb(159 126 74\|rgb(23 32 42" src/components/layout/shell.module.css` returns 0
- [ ] Visual: app shell has no warm navy/gold tints
- [ ] Dark mode renders correctly

Part of Sprint 7 — Design System Migration. See docs/sprints/sprint-7/SPRINT.md
EOF
)"
```

---

## Guardrails

- ONLY touch `src/components/layout/shell.module.css`
- Do NOT change any class names, selectors, or CSS properties
- Do NOT change layout, sizing, spacing, or positioning values
- Do NOT change any `rgb(255 255 255 / ...)` values (white overlays are fine)
- ONLY change the RGB color channels — keep all alpha/opacity values identical
- Do NOT add new CSS rules or remove existing ones
- Do NOT change the grid layout dimensions (288px sidebar stays for now — layout restructuring is a future sprint)
