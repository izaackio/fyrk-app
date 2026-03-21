# FYRK — Sprint Execution Guidelines

> How sprints are structured, how agents parallelize work, and how quality is enforced.

---

## 1. What is a Sprint?

A sprint is a batch of coordinated work toward a single, measurable goal. Each sprint produces a shippable increment — the codebase is demonstrably better after the sprint than before.

A sprint is **complete** when:
- All tasks within it are merged to `main`
- The sprint-level Definition of Done passes
- No regressions introduced (build, lint, tests, visual)

---

## 2. Sprint Structure

Every sprint lives under `docs/sprints/sprint-{N}/` with this layout:

```
docs/sprints/sprint-{N}/
  SPRINT.md              ← Sprint overview: goal, dependency graph, DoD
  tasks/
    T1-{name}.md         ← Self-contained task prompt for Agent 1
    T2-{name}.md         ← Self-contained task prompt for Agent 2
    ...
```

### SPRINT.md

The sprint overview contains:
- **Goal** — one sentence describing the sprint outcome
- **Dependency graph** — which tasks block which, and what can run in parallel
- **Task index** — table linking to each task file with status
- **Definition of Done** — sprint-level acceptance criteria that gates the release

### Task files (T{N}-{name}.md)

Each task file is a **complete, self-contained prompt** that an agent reads and executes without needing any other context. It includes everything the agent needs:

1. **Context** — what the project is, what's happening, why this task exists
2. **Prerequisites** — what must be true before starting (merged PRs, branch state)
3. **Owned files** — explicit list of files this agent may modify (exclusivity enforced)
4. **Instructions** — step-by-step what to do, with exact code snippets where useful
5. **Verification** — commands to run, grep checks, visual checks
6. **PR spec** — exact branch name, PR title, body template
7. **Guardrails** — what NOT to touch, what to leave alone

---

## 3. Multi-Agent Parallelization

### The core rule: file-level exclusivity

Each task **owns** a set of files. No two concurrent tasks may own the same file. This eliminates merge conflicts and coordination overhead entirely.

```
Task A owns: theme.module.css
Task B owns: shell.module.css
Task C owns: landing.module.css
→ A, B, C can all run in parallel. Zero conflicts possible.
```

### Dependency types

| Type | Meaning | Example |
|------|---------|---------|
| **blocks** | Task B cannot start until Task A's PR is merged | P1 (tokens) blocks P3 (component colors) |
| **parallel** | Tasks share no files and can run simultaneously | P3a, P3b, P3c all run at once |
| **sequential** | Tasks share a file and must run one after another | P3b then P4 (both touch shell.module.css) |

### Dependency graph format

Every sprint visualizes this as an ASCII diagram:

```
T1 ──→ merge ──→ T2 ─┐
                  T3 ─┤──→ merge ──→ T5
                  T4 ─┘
```

### Agent handoff protocol

Before starting any task, the agent MUST:

```
1. git fetch origin main
2. git checkout -b {branch-name} origin/main
3. npm run build                          ← verify clean starting state
4. Read the task file completely
5. Execute the instructions
6. Run all verification checks
7. git add {only owned files}
8. git commit with descriptive message
9. git push -u origin {branch-name}
10. gh pr create with the specified title and body
```

After completing a task:
- Mark the task status as `COMPLETE` in SPRINT.md (if you have write access)
- Do NOT touch files outside your owned set
- Do NOT merge your own PR — another agent or human reviews and merges

---

## 4. Task Prompt Quality Standard

Every task prompt must be **10x quality** — meaning an agent with zero prior context about the project can read it, understand it, and execute it correctly on the first attempt.

### Required sections

| Section | Purpose | Quality bar |
|---------|---------|-------------|
| **Context** | Why this task exists | 2-3 sentences, links to relevant docs |
| **Prerequisites** | What must be true to start | Exact git commands to verify |
| **Owned files** | Files this agent may modify | Exhaustive list, no ambiguity |
| **Instructions** | What to do | Step-by-step, with before/after code where useful |
| **Verification** | How to confirm it worked | Exact commands with expected output |
| **PR spec** | How to ship it | Branch name, PR title, body template |
| **Guardrails** | What NOT to do | Explicit list of anti-patterns |

### Anti-patterns to avoid

- "Update the colors" — too vague. Which colors? Which files? What values?
- "Make it look good" — subjective. Use exact hex codes and CSS properties.
- "Fix any issues you find" — scope creep. Tasks have a fixed scope.
- "See BRAND_GUIDELINES.md for details" — don't make the agent hunt for info. Inline everything it needs.

---

## 5. PR Gate Protocol

Every task PR must pass these checks before merge:

```
AUTOMATED (CI):
  [ ] npm run build — zero errors
  [ ] npm run lint — zero new violations
  [ ] npm run test — all tests pass (if tests exist for touched code)

MANUAL (reviewer):
  [ ] Only owned files are modified (git diff --name-only)
  [ ] Task-specific verification checks pass
  [ ] No regressions in visual appearance
  [ ] Dark mode still works (if UI was touched)
```

### Sprint-level gate

After ALL task PRs are merged, the sprint-level Definition of Done is evaluated. This typically includes:

- Cross-cutting grep checks (e.g., "zero old-palette references in src/")
- Full-app visual review
- Build + deploy verification
- Any sprint-specific acceptance criteria

---

## 6. Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Sprint folder | `sprint-{N}` | `sprint-7` |
| Task file | `T{N}-{kebab-name}.md` | `T1-foundation.md` |
| Git branch | `design/sprint-{N}-t{N}-{name}` or phase-specific | `design/phase-3a-theme-css` |
| PR title | `{type}(S{N}-T{N}): {description}` | `design(S7-T3): migrate theme.module.css` |
| Commit message | Same as PR title | `design(S7-T3): migrate theme.module.css` |

---

## 7. Sprint Lifecycle

```
PLAN    → Sprint goal defined, tasks written, dependency graph mapped
EXECUTE → Agents pick up tasks, work in parallel within dependency constraints
REVIEW  → PRs reviewed and merged as they complete
GATE    → Sprint-level DoD evaluated after all tasks merge
RETRO   → What worked, what didn't, what to improve for next sprint
```

Each sprint should take **1-2 sessions** to execute. If a sprint takes longer, it's too big — split it.
