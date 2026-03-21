# T6 — Color Migration: dashboard-insights.module.css

> **Status:** ⬜ TODO
> **Branch:** `design/sprint-7-t6-dashboard-css`
> **Depends on:** T1 (merged ✅)
> **Parallel with:** T3, T4, T5

---

## Context

You are working on **Fyrk**, a household finance app built with Next.js 15 + TypeScript. The project recently migrated its CSS variable palette from warm earth tones ("Warm Authority") to a high-contrast modern blue system ("10x Financial Copilot"). The CSS variables in `globals.css` have already been updated (Sprint 7, Task 1).

This file has **1 remaining old-palette reference** — a radial gradient using the old navy brand color.

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
src/components/dashboard/dashboard-insights.module.css
```

**Do NOT touch any other file.**

---

## Branch setup

```bash
git fetch origin main
git checkout -b design/sprint-7-t6-dashboard-css origin/main
```

---

## Instructions

There is exactly **1 old-palette color reference** in this file.

### Match 1 — Line ~45

```css
/* BEFORE */
radial-gradient(circle at 0% 0%, rgb(34 55 74 / 0.12) 0%, rgb(34 55 74 / 0) 32%),

/* AFTER */
radial-gradient(circle at 0% 0%, rgb(0 102 255 / 0.12) 0%, rgb(0 102 255 / 0) 32%),
```

This replaces the old navy brand color with the new electric blue brand color in a subtle radial gradient overlay on the dashboard insights section.

---

## Verification

```bash
# Build must pass
npm run build

# Lint must pass
npm run lint

# This grep MUST return 0 matches:
grep -n "rgb(34 55 74\|rgb(159 126 74\|rgb(23 32 42\|#22374a\|#9f7e4a" src/components/dashboard/dashboard-insights.module.css
```

---

## PR

```bash
git add src/components/dashboard/dashboard-insights.module.css
git commit -m "design(S7-T6): migrate dashboard-insights.module.css to new palette

Replace 1 hardcoded old-palette gradient color.
Navy brand gradient (rgb 34 55 74) → blue (rgb 0 102 255).

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"

git push -u origin design/sprint-7-t6-dashboard-css

gh pr create \
  --title "design(S7-T6): migrate dashboard-insights.module.css to new palette" \
  --body "$(cat <<'EOF'
## Summary
- Replace 1 hardcoded old-palette gradient color in dashboard-insights.module.css
- Navy brand gradient → electric blue brand gradient

## Verification
- [x] `npm run build` passes
- [x] `npm run lint` passes
- [x] `grep` for old colors returns 0 matches
- [ ] Visual: dashboard insights section uses blue tint, not navy
- [ ] Dark mode renders correctly

Sprint 7 — Task 6 of 6. See `docs/sprints/sprint-7/SPRINT.md`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Guardrails

- **ONLY** modify `src/components/dashboard/dashboard-insights.module.css`
- Do NOT change class names, selectors, layout properties, sizing, spacing, or animations
- Do NOT add new classes or remove existing ones
- Do NOT change any property that isn't a color value
- Do NOT "improve" or refactor anything — this is a surgical color replacement
- Keep alpha/opacity values identical — only the RGB channels change
