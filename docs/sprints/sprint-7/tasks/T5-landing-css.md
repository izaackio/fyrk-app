# T5 — Color Migration: landing.module.css

> **Status:** ⬜ TODO
> **Branch:** `design/sprint-7-t5-landing-css`
> **Depends on:** T1 (merged ✅)
> **Parallel with:** T3, T4, T6

---

## Context

You are working on **Fyrk**, a household finance app built with Next.js 15 + TypeScript. The project recently migrated its CSS variable palette from warm earth tones ("Warm Authority") to a high-contrast modern blue system ("10x Financial Copilot"). The CSS variables in `globals.css` have already been updated (Sprint 7, Task 1).

However, several component CSS module files still contain **hardcoded old-palette `rgb()` values** that bypass the CSS variables. These render as warm navy/gold tints that clash with the new blue/neutral system.

Your job: replace all old-palette color references in **one specific file** so it matches the new design system. This is the **largest migration** — 17 occurrences across gradients, shadows, and backgrounds.

---

## Prerequisites

Verify that T1 (foundation) is merged to main:

```bash
git fetch origin main
git log --oneline -3 origin/main
# Should show a commit referencing "design(S7-P1)" or "new color palette"
```

---

## Owned files

You may ONLY modify this file:

```
src/components/marketing/landing.module.css
```

**Do NOT touch any other file.**

---

## Branch setup

```bash
git fetch origin main
git checkout -b design/sprint-7-t5-landing-css origin/main
```

---

## Instructions

There are exactly **17 old-palette color references** in this file. Replace each one using the mappings below. Keep the exact same alpha/opacity values — only change the RGB channels.

### Match 1-2 — Line ~14 (hero background radial gradients)

```css
/* BEFORE */
radial-gradient(circle at 14% -4%, rgb(34 55 74 / 0.16) 0%, rgb(34 55 74 / 0) 34%),

/* AFTER */
radial-gradient(circle at 14% -4%, rgb(0 102 255 / 0.16) 0%, rgb(0 102 255 / 0) 34%),
```

### Match 3-4 — Line ~15 (hero background radial gradient, amber)

```css
/* BEFORE */
radial-gradient(circle at 88% 10%, rgb(159 126 74 / 0.18) 0%, rgb(159 126 74 / 0) 28%),

/* AFTER */
radial-gradient(circle at 88% 10%, rgb(245 166 35 / 0.18) 0%, rgb(245 166 35 / 0) 28%),
```

### Match 5 — Line ~103 (box-shadow)

```css
/* BEFORE */
box-shadow: 0 16px 32px rgb(34 55 74 / 0.12);

/* AFTER */
box-shadow: 0 16px 32px rgb(0 0 0 / 0.12);
```

### Match 6 — Line ~137 (box-shadow)

```css
/* BEFORE */
box-shadow: 0 22px 54px rgb(23 32 42 / 0.06);

/* AFTER */
box-shadow: 0 22px 54px rgb(0 0 0 / 0.06);
```

### Match 7-8 — Line ~155 (radial gradient, amber)

```css
/* BEFORE */
radial-gradient(circle at 90% 0%, rgb(159 126 74 / 0.14) 0%, rgb(159 126 74 / 0) 24rem),

/* AFTER */
radial-gradient(circle at 90% 0%, rgb(245 166 35 / 0.14) 0%, rgb(245 166 35 / 0) 24rem),
```

### Match 9 — Line ~187 (background)

```css
/* BEFORE */
background: rgb(34 55 74 / 0.08);

/* AFTER */
background: rgb(0 102 255 / 0.08);
```

### Match 10 — Line ~188 (border)

```css
/* BEFORE */
border: 1px solid rgb(34 55 74 / 0.12);

/* AFTER */
border: 1px solid rgb(0 102 255 / 0.12);
```

### Match 11-12-13 — Line ~260 (dark section gradient — 3 navy variants)

This is a dark background section. Replace navy blues with modern dark blues:

```css
/* BEFORE */
linear-gradient(150deg, rgb(21 34 46 / 0.96) 0%, rgb(34 55 74 / 0.9) 60%, rgb(71 89 104 / 0.82) 100%);

/* AFTER */
linear-gradient(150deg, rgb(0 30 80 / 0.96) 0%, rgb(0 50 130 / 0.9) 60%, rgb(30 80 180 / 0.82) 100%);
```

### Match 14 — Line ~262 (box-shadow)

```css
/* BEFORE */
box-shadow: 0 28px 56px rgb(34 55 74 / 0.22);

/* AFTER */
box-shadow: 0 28px 56px rgb(0 0 0 / 0.22);
```

### Match 15 — Line ~391 (box-shadow)

```css
/* BEFORE */
box-shadow: 0 18px 42px rgb(23 32 42 / 0.05);

/* AFTER */
box-shadow: 0 18px 42px rgb(0 0 0 / 0.05);
```

### Match 16-17 — Line ~504-505 (radial + linear gradients)

```css
/* BEFORE */
radial-gradient(circle at 80% 20%, rgb(159 126 74 / 0.12) 0%, rgb(159 126 74 / 0) 32%),
linear-gradient(180deg, rgb(34 55 74 / 0.06) 0%, rgb(34 55 74 / 0.02) 100%),

/* AFTER */
radial-gradient(circle at 80% 20%, rgb(245 166 35 / 0.12) 0%, rgb(245 166 35 / 0) 32%),
linear-gradient(180deg, rgb(0 102 255 / 0.06) 0%, rgb(0 102 255 / 0.02) 100%),
```

### Match 18-19 — Line ~553 (dark section gradient)

```css
/* BEFORE */
linear-gradient(180deg, rgb(34 55 74 / 0.96) 0%, rgb(34 55 74 / 0.86) 100%),

/* AFTER */
linear-gradient(180deg, rgb(0 50 130 / 0.96) 0%, rgb(0 50 130 / 0.86) 100%),
```

### Match 20 — Line ~556 (box-shadow)

```css
/* BEFORE */
box-shadow: 0 22px 42px rgb(34 55 74 / 0.14);

/* AFTER */
box-shadow: 0 22px 42px rgb(0 0 0 / 0.14);
```

### Match 21-22 — Line ~593 (radial gradient, amber)

```css
/* BEFORE */
radial-gradient(circle at 88% 12%, rgb(159 126 74 / 0.14) 0%, rgb(159 126 74 / 0) 28%),

/* AFTER */
radial-gradient(circle at 88% 12%, rgb(245 166 35 / 0.14) 0%, rgb(245 166 35 / 0) 28%),
```

### Match 23-24-25 — Line ~643-644 (dark section gradient — amber + navy)

```css
/* BEFORE */
radial-gradient(circle at 86% 14%, rgb(159 126 74 / 0.22) 0%, rgb(159 126 74 / 0) 26rem),
linear-gradient(165deg, rgb(25 38 50 / 0.98) 0%, rgb(34 55 74 / 0.94) 62%, rgb(48 65 79 / 0.92) 100%);

/* AFTER */
radial-gradient(circle at 86% 14%, rgb(245 166 35 / 0.22) 0%, rgb(245 166 35 / 0) 26rem),
linear-gradient(165deg, rgb(0 30 80 / 0.98) 0%, rgb(0 50 130 / 0.94) 62%, rgb(20 70 160 / 0.92) 100%);
```

### Color mapping summary

| Find | Replace | Context |
|------|---------|---------|
| `rgb(34 55 74 / ...)` | `rgb(0 102 255 / ...)` | Brand navy → brand blue (gradients, backgrounds, borders) |
| `rgb(159 126 74 / ...)` | `rgb(245 166 35 / ...)` | Gold accent → amber accent (gradients) |
| `rgb(23 32 42 / ...)` | `rgb(0 0 0 / ...)` | Warm-black → neutral-black (shadows) |
| `rgb(21 34 46 / ...)` | `rgb(0 30 80 / ...)` | Dark navy → dark blue (dark section backgrounds) |
| `rgb(71 89 104 / ...)` | `rgb(30 80 180 / ...)` | Light navy → light blue (dark section gradient end) |
| `rgb(48 65 79 / ...)` | `rgb(20 70 160 / ...)` | Mid navy → mid blue (dark section gradient mid) |
| `rgb(25 38 50 / ...)` | `rgb(0 30 80 / ...)` | Near-black navy → near-black blue (dark section gradient start) |

**Design intent for dark sections:** These are full-width dark background hero/CTA sections on the marketing page. They should feel "Fyrk blue" — deep, modern, and confident — rather than the old warm navy.

---

## Verification

```bash
# Build must pass
npm run build

# Lint must pass
npm run lint

# This grep MUST return 0 matches:
grep -n "rgb(34 55 74\|rgb(159 126 74\|rgb(23 32 42\|rgb(21 34 46\|rgb(25 38 50\|rgb(48 65 79\|rgb(71 89 104\|#22374a\|#9f7e4a" src/components/marketing/landing.module.css
```

---

## PR

```bash
git add src/components/marketing/landing.module.css
git commit -m "design(S7-T5): migrate landing.module.css to new palette

Replace 17 hardcoded old-palette color values:
- Navy brand gradients → blue gradients
- Gold accent gradients → amber gradients
- Dark section backgrounds → deep modern blue
- Warm-black shadows → neutral black

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"

git push -u origin design/sprint-7-t5-landing-css

gh pr create \
  --title "design(S7-T5): migrate landing.module.css to new palette" \
  --body "$(cat <<'EOF'
## Summary
- Replace 17 hardcoded old-palette color values in landing.module.css
- Navy gradients → blue, gold accents → amber, dark sections → modern blue
- Warm-black shadows → neutral black

## Verification
- [x] `npm run build` passes
- [x] `npm run lint` passes
- [x] `grep` for old colors returns 0 matches
- [ ] Visual: landing page hero/CTA sections show blue not navy
- [ ] Visual: dark sections feel modern blue, not warm navy
- [ ] Dark mode renders correctly

Sprint 7 — Task 5 of 6. See `docs/sprints/sprint-7/SPRINT.md`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Guardrails

- **ONLY** modify `src/components/marketing/landing.module.css`
- Do NOT change class names, selectors, layout properties, sizing, spacing, or animations
- Do NOT add new classes or remove existing ones
- Do NOT change any property that isn't a color value
- Do NOT "improve" or refactor anything — this is a surgical color replacement
- Keep all alpha/opacity values identical — only the RGB channels change
- The dark section gradients should produce a deep blue appearance, NOT a bright blue. Keep the high opacity values (0.9+) to ensure the sections remain dark.
