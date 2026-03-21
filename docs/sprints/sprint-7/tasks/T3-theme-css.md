# T3 — Color Migration: theme.module.css

> **Status:** ⬜ TODO
> **Branch:** `design/sprint-7-t3-theme-css`
> **Depends on:** T1 (merged ✅)
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

## Owned files

You may ONLY modify this file:

```
src/components/theme/theme.module.css
```

**Do NOT touch any other file.** Not globals.css, not layout.tsx, not any other .module.css, not any .tsx file.

---

## Branch setup

```bash
git fetch origin main
git checkout -b design/sprint-7-t3-theme-css origin/main
```

---

## Instructions

There are exactly **5 old-palette color references** in this file. Replace each one using the mapping below. Keep the exact same alpha/opacity values — only change the RGB channels.

### Match 1 — Line ~237

```css
/* BEFORE */
box-shadow:
    0 14px 28px rgb(34 55 74 / 16%);

/* AFTER */
box-shadow:
    0 14px 28px rgb(0 0 0 / 16%);
```

### Match 2 — Line ~249

```css
/* BEFORE */
box-shadow:
    0 18px 30px rgb(34 55 74 / 20%);

/* AFTER */
box-shadow:
    0 18px 30px rgb(0 0 0 / 20%);
```

### Match 3 — Line ~664

```css
/* BEFORE */
box-shadow:
    0 10px 18px rgb(23 32 42 / 6%);

/* AFTER */
box-shadow:
    0 10px 18px rgb(0 0 0 / 6%);
```

### Match 4 — Line ~773

```css
/* BEFORE */
box-shadow:
    0 10px 18px rgb(23 32 42 / 6%);

/* AFTER */
box-shadow:
    0 10px 18px rgb(0 0 0 / 6%);
```

### Match 5 — Line ~1010

```css
/* BEFORE */
box-shadow:
    0 14px 24px rgb(23 32 42 / 6%);

/* AFTER */
box-shadow:
    0 14px 24px rgb(0 0 0 / 6%);
```

### Color mapping reference

| Find | Replace | Reason |
|------|---------|--------|
| `rgb(34 55 74 / ...)` | `rgb(0 0 0 / ...)` | Navy-tinted shadows → neutral shadows |
| `rgb(23 32 42 / ...)` | `rgb(0 0 0 / ...)` | Warm-black shadows → neutral-black shadows |

**Note:** For shadow values, we use neutral black (`0 0 0`) rather than brand blue (`0 102 255`) because shadows should be colorless. Blue-tinted shadows would look unnatural.

---

## Verification

Run these commands after making your changes:

```bash
# Build must pass
npm run build

# Lint must pass
npm run lint

# This grep MUST return 0 matches:
grep -n "rgb(34 55 74\|rgb(159 126 74\|rgb(23 32 42\|#22374a\|#9f7e4a" src/components/theme/theme.module.css
```

If the grep returns any matches, you missed a replacement. Go back and fix it.

---

## PR

```bash
git add src/components/theme/theme.module.css
git commit -m "design(S7-T3): migrate theme.module.css to new palette

Replace 5 hardcoded old-palette shadow colors with neutral black.
Navy-tinted box-shadows (rgb 34 55 74, rgb 23 32 42) → rgb(0 0 0).

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"

git push -u origin design/sprint-7-t3-theme-css

gh pr create \
  --title "design(S7-T3): migrate theme.module.css to new palette" \
  --body "$(cat <<'EOF'
## Summary
- Replace 5 hardcoded old-palette shadow color values in theme.module.css
- Navy-tinted shadows → neutral-black shadows

## Verification
- [x] `npm run build` passes
- [x] `npm run lint` passes
- [x] `grep` for old colors returns 0 matches
- [ ] Visual: no warm navy tints in themed components
- [ ] Dark mode renders correctly

Sprint 7 — Task 3 of 6. See `docs/sprints/sprint-7/SPRINT.md`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Guardrails

- **ONLY** modify `src/components/theme/theme.module.css`
- Do NOT change class names, selectors, layout properties, sizing, spacing, or animations
- Do NOT add new classes or remove existing ones
- Do NOT change any property that isn't a color value
- Do NOT "improve" or refactor anything — this is a surgical color replacement
- Keep all alpha/opacity values identical — only the RGB channels change
