# T5 — Color Migration: landing.module.css

> **Status:** TODO
> **Branch:** `design/sprint-7-t5-landing-css`
> **Depends on:** T1 (merged)
> **Parallel with:** T3, T4, T6

---

## Context

You are working on **Fyrk**, a household finance app built with Next.js 15 + TypeScript. The project recently migrated its CSS variable palette from warm earth tones ("Warm Authority") to a high-contrast modern blue system ("10x Financial Copilot"). The CSS variables in `globals.css` have already been updated (Sprint 7, Task 1).

However, several component CSS module files still contain **hardcoded old-palette `rgb()` values** that bypass the CSS variables. These render as warm navy/gold tints that clash with the new blue/neutral system.

Your job: replace all old-palette color references in **one specific file** so it matches the new design system. This is the largest migration — 17 occurrences across gradients, shadows, and backgrounds.

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
src/components/marketing/landing.module.css
```

Do NOT touch any other file in the repository.

---

## Instructions

There are exactly **17 occurrences** of old-palette colors in this file. Replace each one using the mappings below.

### Occurrence 1-2 — Line 14 (hero background gradient, navy brand)

```css
/* BEFORE */
    radial-gradient(circle at 14% -4%, rgb(34 55 74 / 0.16) 0%, rgb(34 55 74 / 0) 34%),

/* AFTER */
    radial-gradient(circle at 14% -4%, rgb(0 102 255 / 0.16) 0%, rgb(0 102 255 / 0) 34%),
```

### Occurrence 3-4 — Line 15 (hero background gradient, gold accent)

```css
/* BEFORE */
    radial-gradient(circle at 88% 10%, rgb(159 126 74 / 0.18) 0%, rgb(159 126 74 / 0) 28%),

/* AFTER */
    radial-gradient(circle at 88% 10%, rgb(245 166 35 / 0.18) 0%, rgb(245 166 35 / 0) 28%),
```

### Occurrence 5 — Line 103 (CTA button shadow)

```css
/* BEFORE */
  box-shadow: 0 16px 32px rgb(34 55 74 / 0.12);

/* AFTER */
  box-shadow: 0 16px 32px rgb(0 102 255 / 0.12);
```

### Occurrence 6 — Line 137 (product preview shadow)

```css
/* BEFORE */
  box-shadow: 0 22px 54px rgb(23 32 42 / 0.06);

/* AFTER */
  box-shadow: 0 22px 54px rgb(0 0 0 / 0.06);
```

### Occurrence 7-8 — Line 155 (feature section gradient, gold accent)

```css
/* BEFORE */
    radial-gradient(circle at 90% 0%, rgb(159 126 74 / 0.14) 0%, rgb(159 126 74 / 0) 24rem),

/* AFTER */
    radial-gradient(circle at 90% 0%, rgb(245 166 35 / 0.14) 0%, rgb(245 166 35 / 0) 24rem),
```

### Occurrence 9 — Line 187 (badge background)

```css
/* BEFORE */
  background: rgb(34 55 74 / 0.08);

/* AFTER */
  background: rgb(0 102 255 / 0.08);
```

### Occurrence 10 — Line 188 (badge border)

```css
/* BEFORE */
  border: 1px solid rgb(34 55 74 / 0.12);

/* AFTER */
  border: 1px solid rgb(0 102 255 / 0.12);
```

### Occurrence 11-12-13 — Line 260 (dark section gradient — THREE old colors)

This is the most complex replacement. The dark hero section uses a navy-based gradient that must become blue-based:

```css
/* BEFORE */
    linear-gradient(150deg, rgb(21 34 46 / 0.96) 0%, rgb(34 55 74 / 0.9) 60%, rgb(71 89 104 / 0.82) 100%);

/* AFTER */
    linear-gradient(150deg, rgb(0 40 120 / 0.96) 0%, rgb(0 102 255 / 0.9) 60%, rgb(40 100 200 / 0.82) 100%);
```

### Occurrence 14 — Line 262 (dark section shadow)

```css
/* BEFORE */
  box-shadow: 0 28px 56px rgb(34 55 74 / 0.22);

/* AFTER */
  box-shadow: 0 28px 56px rgb(0 102 255 / 0.22);
```

### Occurrence 15 — Line 391 (separator shadow)

```css
/* BEFORE */
  box-shadow: 0 18px 42px rgb(23 32 42 / 0.05);

/* AFTER */
  box-shadow: 0 18px 42px rgb(0 0 0 / 0.05);
```

### Occurrence 16-17 — Lines 504-505 (section gradient, gold + navy)

```css
/* BEFORE */
    radial-gradient(circle at 80% 20%, rgb(159 126 74 / 0.12) 0%, rgb(159 126 74 / 0) 32%),
    linear-gradient(180deg, rgb(34 55 74 / 0.06) 0%, rgb(34 55 74 / 0.02) 100%),

/* AFTER */
    radial-gradient(circle at 80% 20%, rgb(245 166 35 / 0.12) 0%, rgb(245 166 35 / 0) 32%),
    linear-gradient(180deg, rgb(0 102 255 / 0.06) 0%, rgb(0 102 255 / 0.02) 100%),
```

### Occurrence 18-19 — Lines 553-554 (CTA section gradient, navy)

```css
/* BEFORE */
    linear-gradient(180deg, rgb(34 55 74 / 0.96) 0%, rgb(34 55 74 / 0.86) 100%),

/* AFTER */
    linear-gradient(180deg, rgb(0 102 255 / 0.96) 0%, rgb(0 102 255 / 0.86) 100%),
```

### Occurrence 20 — Line 556 (CTA section shadow)

```css
/* BEFORE */
  box-shadow: 0 22px 42px rgb(34 55 74 / 0.14);

/* AFTER */
  box-shadow: 0 22px 42px rgb(0 102 255 / 0.14);
```

### Occurrence 21-22 — Line 593 (section gradient, gold)

```css
/* BEFORE */
    radial-gradient(circle at 88% 12%, rgb(159 126 74 / 0.14) 0%, rgb(159 126 74 / 0) 28%),

/* AFTER */
    radial-gradient(circle at 88% 12%, rgb(245 166 35 / 0.14) 0%, rgb(245 166 35 / 0) 28%),
```

### Occurrence 23-24-25 — Lines 643-644 (footer gradient — gold + THREE navy variants)

```css
/* BEFORE */
    radial-gradient(circle at 86% 14%, rgb(159 126 74 / 0.22) 0%, rgb(159 126 74 / 0) 26rem),
    linear-gradient(165deg, rgb(25 38 50 / 0.98) 0%, rgb(34 55 74 / 0.94) 62%, rgb(48 65 79 / 0.92) 100%);

/* AFTER */
    radial-gradient(circle at 86% 14%, rgb(245 166 35 / 0.22) 0%, rgb(245 166 35 / 0) 26rem),
    linear-gradient(165deg, rgb(0 50 140 / 0.98) 0%, rgb(0 102 255 / 0.94) 62%, rgb(20 70 160 / 0.92) 100%);
```

### Additional cleanup: warm off-white text colors

After the gradient replacements, search for any warm-tinted text colors like `#f5efe6`, `#f7f2ea`, `#f8f6f1`. Replace with clean whites:

```
#f5efe6 -> #f0f0f0
#f7f2ea -> #f0f0f0
#f8f6f1 -> #f0f0f0
```

Also update any warm background references in linear gradients:
```
rgb(251 247 240 / ...) -> rgb(250 250 250 / ...)
rgb(247 242 235 / ...) -> rgb(245 245 245 / ...)
rgb(245 239 230 / ...) -> rgb(240 240 240 / ...)
```

### Color mapping reference

| Find | Replace | Meaning |
|------|---------|---------|
| `rgb(34 55 74 / ...)` | `rgb(0 102 255 / ...)` | Brand navy -> brand blue |
| `rgb(159 126 74 / ...)` | `rgb(245 166 35 / ...)` | Gold accent -> amber accent |
| `rgb(23 32 42 / ...)` | `rgb(0 0 0 / ...)` | Warm black -> neutral black |
| `rgb(21 34 46 / ...)` | `rgb(0 40 120 / ...)` | Dark navy -> dark blue |
| `rgb(71 89 104 / ...)` | `rgb(40 100 200 / ...)` | Light navy -> light blue |
| `rgb(48 65 79 / ...)` | `rgb(20 70 160 / ...)` | Mid navy -> mid blue |
| `rgb(25 38 50 / ...)` | `rgb(0 50 140 / ...)` | Near-black navy -> near-black blue |

---

## Verification

Run these commands and confirm they pass:

```bash
# Build must succeed
npm run build

# Lint must pass
npm run lint

# This grep MUST return 0 matches for ALL old palette values
grep -n "rgb(34 55 74\|rgb(159 126 74\|rgb(23 32 42\|rgb(21 34 46\|rgb(25 38 50\|rgb(48 65 79\|rgb(71 89 104\|#22374a\|#9f7e4a" src/components/marketing/landing.module.css

# Count check: should show 0
grep -c "rgb(34 55 74\|rgb(159 126 74\|rgb(23 32 42\|rgb(21 34 46" src/components/marketing/landing.module.css
```

---

## PR Spec

```bash
# Branch
git checkout -b design/sprint-7-t5-landing-css origin/main

# After completing work
git add src/components/marketing/landing.module.css
git commit -m "design(S7-T5): migrate landing.module.css to new palette

Replace 17+ hardcoded old-palette color values:
- Navy brand gradients (rgb(34 55 74)) -> blue (rgb(0 102 255))
- Gold accent gradients (rgb(159 126 74)) -> amber (rgb(245 166 35))
- Dark navy sections -> dark blue equivalents
- Warm-black shadows (rgb(23 32 42)) -> neutral (rgb(0 0 0))
- Warm off-white text -> clean white

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"

git push -u origin design/sprint-7-t5-landing-css

gh pr create --title "design(S7-T5): migrate landing.module.css to new palette" \
  --body "$(cat <<'EOF'
## Summary
- Replace 17+ hardcoded old-palette color values in landing.module.css
- Navy brand gradients -> blue (rgb(0 102 255))
- Gold accent gradients -> amber (rgb(245 166 35))
- Dark section gradients -> dark blue equivalents
- Warm-black shadows -> neutral black
- Warm off-white text -> clean white

## Test plan
- [ ] npm run build passes
- [ ] npm run lint passes
- [ ] `grep -c "rgb(34 55 74\|rgb(159 126 74\|rgb(23 32 42\|rgb(21 34 46" src/components/marketing/landing.module.css` returns 0
- [ ] Visual: landing page hero/CTA show blue not navy
- [ ] Visual: dark sections feel modern blue, not warm navy
- [ ] Visual: no warm gold tints remaining
- [ ] Dark mode renders correctly

Part of Sprint 7 — Design System Migration. See docs/sprints/sprint-7/SPRINT.md
EOF
)"
```

---

## Guardrails

- ONLY touch `src/components/marketing/landing.module.css`
- Do NOT change any class names, selectors, or CSS properties
- Do NOT change layout, sizing, spacing, or positioning values
- Do NOT change any `rgb(255 255 255 / ...)` values (white overlays are fine)
- ONLY change the RGB color channels — keep all alpha/opacity values identical
- Do NOT add new CSS rules or remove existing ones
- Do NOT modify the LandingPage.tsx component — CSS only
