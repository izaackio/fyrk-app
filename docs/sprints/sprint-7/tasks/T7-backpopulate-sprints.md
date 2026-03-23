# T7 — Backpopulate Sprint 0–6 Records

> **Sprint:** 7 (housekeeping task — no code changes)
> **Status:** TODO
> **Depends on:** None (can run in parallel with T3-T6)
> **Owned files:** `docs/sprints/sprint-{0,1,2,3,4,5,6}/SPRINT.md` (7 new files)

---

## Context

Fyrk adopted a structured sprint execution framework in Sprint 7 (see `docs/sprints/SPRINT_GUIDELINES.md`). Sprints 0–6 were executed before this framework existed. Their history is scattered across `progress.md` (delivery log), `docs/BUILD_PLAN.md` (original scope), and git history (actual PRs).

This task creates a **completed sprint record** for each prior sprint so the `/docs/sprints/` directory becomes the single canonical archive of all sprint work — past and present.

---

## What to create

For each sprint 0 through 6, create `docs/sprints/sprint-{N}/SPRINT.md` following the template below.

These are **retrospective records**, not task prompts. Since the work is already done, the task files (`tasks/T{N}-*.md`) are NOT needed — the SPRINT.md serves as both summary and archive.

---

## Template for completed sprint records

```markdown
# Sprint {N} — {Title}

> **Status:** COMPLETE
> **Goal:** {One sentence from BUILD_PLAN.md}
> **Dates:** {Approximate week range from BUILD_PLAN.md}

---

## Delivered

{Bullet list of what was actually shipped, sourced from progress.md merged PR track}

## Merged PRs

| PR | Branch | Description |
|----|--------|-------------|
| #{num} | `{branch}` | {One-line summary} |

## Key Decisions

{Any notable architectural or scope decisions from this sprint — 2-3 bullets max. "None recorded" if nothing stands out.}

## Definition of Done (Retrospective)

{What would have been the DoD if the framework existed. 3-5 checkboxes, all checked.}
```

---

## Data sources

For each sprint, pull information from these three sources:

### 1. `docs/BUILD_PLAN.md` — Original scope and goal
- Sprint 0: line 109 — Pre-Launch Waitlist Page
- Sprint 1: line 147 — Foundation
- Sprint 2: line 191 — Accounts & Data
- Sprint 3: line 243 — Balance Sheet & Intelligence
- Sprint 4: line 292 — Timeline, Life Events & Fitness
- Sprint 5: line 349 — Quarterly Review & Governance
- Sprint 6: line 396 — Demo Data, Polish & Launch Prep

### 2. `progress.md` — Delivery log with merged PRs
- Sprint 0: lines ~30-60
- Sprint 1: lines ~60-100
- Sprint 2: lines ~100-130
- Sprint 3: lines ~130-170
- Sprint 4: lines ~170-200
- Sprint 5: lines ~200-230
- Sprint 6: lines ~230-248

### 3. Git history — PR numbers and branches
```bash
gh pr list --state merged --limit 50 --json number,title,headRefName,mergedAt
```

---

## Instructions

1. `git fetch origin main && git checkout -b docs/backpopulate-sprints origin/main`
2. Read `docs/BUILD_PLAN.md` and `progress.md` to gather scope and delivery data for each sprint
3. Run `gh pr list --state merged --limit 100 --json number,title,headRefName` to get full PR history
4. Create these 7 directories and files:
   - `docs/sprints/sprint-0/SPRINT.md`
   - `docs/sprints/sprint-1/SPRINT.md`
   - `docs/sprints/sprint-2/SPRINT.md`
   - `docs/sprints/sprint-3/SPRINT.md`
   - `docs/sprints/sprint-4/SPRINT.md`
   - `docs/sprints/sprint-5/SPRINT.md`
   - `docs/sprints/sprint-6/SPRINT.md`
5. Each file follows the completed sprint record template above
6. Keep each file concise — aim for 30-60 lines per sprint record

---

## Verification

```bash
# All 7 files exist
ls docs/sprints/sprint-{0,1,2,3,4,5,6}/SPRINT.md

# All marked COMPLETE
grep -l "COMPLETE" docs/sprints/sprint-{0,1,2,3,4,5,6}/SPRINT.md | wc -l
# Expected: 7

# No task subdirectories created (retrospective records don't need them)
ls docs/sprints/sprint-{0,1,2,3,4,5,6}/tasks/ 2>&1 | grep -c "No such file"
# Expected: 7

# Build still passes (no code touched)
npm run build
```

---

## PR Spec

- **Branch:** `docs/backpopulate-sprints`
- **Title:** `docs: backpopulate sprint 0-6 records into /docs/sprints/`
- **Body:**
  ```
  ## Summary
  - Creates retrospective SPRINT.md records for sprints 0-6
  - Establishes /docs/sprints/ as the single canonical sprint archive
  - No code changes — documentation only

  ## Test plan
  - [ ] All 7 SPRINT.md files exist and are well-formed
  - [ ] Each file accurately reflects the delivered scope from progress.md
  - [ ] PR numbers match git history
  - [ ] npm run build still passes
  ```

---

## Guardrails

- **DO NOT** create task files (`tasks/T{N}-*.md`) for completed sprints — this is retroactive busywork
- **DO NOT** modify any existing files (progress.md, BUILD_PLAN.md, etc.)
- **DO NOT** modify any code files
- **DO NOT** invent delivery details — only record what is documented in progress.md and git history
- **DO** keep records concise — these are archives, not planning docs
