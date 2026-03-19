# FYRK — Design System Sprint
## "10x Financial Copilot" Migration

> **Version:** 1.0
> **Created:** 2026-03-19
> **Source:** [design-10x.html](./design-10x.html) (approved concept) · [BRAND_GUIDELINES.md](./BRAND_GUIDELINES.md) (to be rewritten)
> **Outcome:** Codebase fully migrated from "Warm Authority" to "10x Financial Copilot" design system
> **Logo:** Proposal 3 — The Pure Typeset ƒ (Instrument Serif italic)
> **Consumed by:** All agents (Frontend, Design, Architect)

---

## 0. Multi-Agent Guardrails

This sprint is designed for **parallel agent execution**. Multiple agents can work concurrently IF they respect the file ownership below.

### File ownership matrix

| Phase | Owned files | Exclusive? | Notes |
|-------|------------|------------|-------|
| **P1** | `layout.tsx`, `globals.css`, `BRAND_GUIDELINES.md` | YES — no other phase touches these until P1 merges | Foundation that all other phases read from |
| **P2** | `icons.tsx`, `LandingPage.tsx` | YES | Logo mark only — no layout changes |
| **P3a** | `theme.module.css` | YES | Largest CSS file. One agent only. |
| **P3b** | `shell.module.css` | YES | Layout component styles |
| **P3c** | `landing.module.css` | YES | Marketing page styles |
| **P3d** | `dashboard-insights.module.css` | YES | Dashboard component styles |
| **P4** | `AppShell.tsx`, `SidebarNav.tsx`, `Topbar.tsx`, `shell.module.css` | YES — conflicts with P3b on shell.module.css | Must run AFTER P3b completes |
| **P5** | `layout.tsx` only (font import swap) | YES — conflicts with P1 | Must run AFTER P1 completes |

### Parallelization rules

```
P1  ──────────→ MERGE ──→ P3a ─┐
                          P3b ─┤──→ MERGE ──→ P4
                          P3c ─┤
                          P3d ─┘
               MERGE ──→ P2 (can start after P1 merges)
               MERGE ──→ P5 (can start after P1 merges, needs visual eval)
```

**Critical rule:** P3a, P3b, P3c, P3d can run **in parallel** — they touch different files. P4 depends on P3b. P5 depends on P1 + visual evaluation.

### Shared contracts (DO NOT BREAK)

1. **CSS variable names** — All phases read `--co-*` and `--font-*` variables defined in `globals.css`. Only P1 modifies these names/values. All other phases consume them.
2. **Font variable mapping** — `--font-data`, `--font-narrative`, `--font-mono` are the three canonical font variables. Same names, new underlying fonts after P1.
3. **Component props** — No phase changes any TypeScript interface or component prop. Styling only.
4. **Tailwind theme bridge** — The `@theme inline` block in `globals.css` maps `--co-*` vars to Tailwind tokens. Only P1 touches this.

### Agent handoff protocol

Before starting work, each agent MUST:
1. `git pull` to ensure P1 foundation is merged
2. Verify `npm run build` passes on current main
3. Create branch from main: `design/phase-{N}-{description}`
4. After completing work: `npm run build` + `npm run lint` must pass
5. Open PR against main with screenshots

---

## Phase 1: Foundation — Fonts + Colors

**Branch:** `design/phase-1-foundation`
**Files touched:** `src/app/layout.tsx`, `src/app/globals.css`, `docs/BRAND_GUIDELINES.md`
**Depends on:** Nothing
**Blocks:** All other phases

### Step 1.1 — Swap font imports in layout.tsx

| Action | Detail |
|--------|--------|
| Remove imports | `Public_Sans`, `Newsreader` from `next/font/google` |
| Add imports | `DM_Sans` (weights 400, 500, 600, 700), `Instrument_Serif` (weight 400, style `["italic"]`) |
| Keep | `IBM_Plex_Mono` unchanged |
| Update | `themeColor` from `#f6f1ea` → `#fafafa` (light), `#171411` → `#111111` (dark) |

```typescript
// BEFORE
import { IBM_Plex_Mono, Newsreader, Public_Sans } from "next/font/google";
const dataFont = Public_Sans({ subsets: ["latin"], weight: ["400","500","600","700"], variable: "--font-data", display: "swap" });
const narrativeFont = Newsreader({ subsets: ["latin"], weight: ["400","500","600","700"], variable: "--font-narrative", display: "swap" });

// AFTER
import { DM_Sans, IBM_Plex_Mono, Instrument_Serif } from "next/font/google";
const dataFont = DM_Sans({ subsets: ["latin"], weight: ["400","500","600","700"], variable: "--font-data", display: "swap" });
const narrativeFont = Instrument_Serif({ subsets: ["latin"], weight: ["400"], style: ["italic"], variable: "--font-narrative", display: "swap" });
```

**Risk:** `Instrument_Serif` may not be exported from `next/font/google`. Fallback: use `next/font/local` with downloaded `.woff2` from Google Fonts CDN.

### Step 1.2 — Replace color tokens in globals.css

Replace the `:root` color block. Keep spacing, radius, motion, and container tokens unchanged.

| Token | Old | New | Reason |
|-------|-----|-----|--------|
| `--co-bg-app` | `#f6f1ea` | `#fafafa` | Warm cream → clean neutral |
| `--co-bg-surface` | `#fffdf9` | `#ffffff` | Warm white → pure white |
| `--co-bg-surface-strong` | `#ffffff` | `#ffffff` | No change |
| `--co-bg-hover` | `#f1ebe2` | `#f0f0f0` | Warm hover → neutral hover |
| `--co-bg-subtle` | `#fbf7f0` | `#f5f5f5` | Warm subtle → neutral subtle |
| `--co-bg-inset` | `#ede6dc` | `#e8e8e8` | Warm inset → neutral inset |
| `--co-text-primary` | `#17202a` | `#111111` | Deep charcoal → near-black |
| `--co-text-secondary` | `#5a6672` | `#666666` | Slate → neutral gray |
| `--co-text-muted` | `#88919a` | `#999999` | Steel muted → neutral muted |
| `--co-brand-primary` | `#22374a` | `#0066ff` | Forest Navy → vivid blue |
| `--co-brand-light` | `#36526a` | `#3384ff` | Lighter navy → lighter blue |
| `--co-brand-accent` | `#9f7e4a` | `#f5a623` | Pale gold → amber |
| `--co-status-up` | `#4b725c` | `#00a866` | Sage green → vivid green |
| `--co-status-up-bg` | `#eef4ef` | `#e6f9ef` | Sage bg → green bg |
| `--co-status-down` | `#b55d53` | `#e03e3e` | Terracotta → vivid red |
| `--co-status-down-bg` | `#fbefed` | `#fde8e8` | Terracotta bg → red bg |
| `--co-info` | `#657d8f` | `#6b7280` | Soft steel → neutral info |
| `--co-info-bg` | `#eef3f6` | `#f0f1f3` | Steel bg → neutral bg |
| **New** | — | `--co-status-warning: #f5a623` | Amber warning (new token) |
| **New** | — | `--co-status-warning-bg: #fef6e6` | Amber bg (new token) |
| **New** | — | `--co-chart-purple: #a855f7` | Purple chart color (new token) |

**Chart palette update:**

| Token | Old | New |
|-------|-----|-----|
| `--co-chart-1` | `#22374a` | `#0066ff` |
| `--co-chart-2` | `#657d8f` | `#00a866` |
| `--co-chart-3` | `#b3925f` | `#f5a623` |
| `--co-chart-4` | `#7c6b53` | `#a855f7` |
| `--co-chart-5` | `#557b72` | `#e03e3e` |
| `--co-chart-6` | `#b96c53` | `#6b7280` |

**Border & elevation update:**

| Token | Old | New |
|-------|-----|-----|
| `--co-border` | `#ddd4c8` | `#e5e5e5` |
| `--co-border-strong` | `#c8bcad` | `#cccccc` |
| `--co-border-soft` | `#ebe4da` | `#f0f0f0` |
| `--co-shadow-soft` | `rgb(23 32 42 / 6%)` | `rgb(0 0 0 / 5%)` |
| `--co-shadow-raised` | `rgb(23 32 42 / 10%)` | `rgb(0 0 0 / 8%)` |
| `--co-focus-ring` | `#6d879a` | `#0066ff` |
| `--co-shadow-focus` | navy-tinted | `0 0 0 1px rgb(255 255 255 / 94%), 0 0 0 4px rgb(0 102 255 / 24%)` |

**Dark mode `[data-theme="dark"]` update:**

| Token | Old | New |
|-------|-----|-----|
| `--co-bg-app` | `#171411` | `#111111` |
| `--co-bg-surface` | `#221e1a` | `#1a1a1a` |
| `--co-bg-surface-strong` | `#29241f` | `#222222` |
| `--co-bg-hover` | `#2a2520` | `#2a2a2a` |
| `--co-bg-subtle` | `#1c1814` | `#161616` |
| `--co-bg-inset` | `#120f0d` | `#0d0d0d` |
| `--co-text-primary` | `#f3ede5` | `#f0f0f0` |
| `--co-text-secondary` | `#b8afa4` | `#a0a0a0` |
| `--co-text-muted` | `#8c8278` | `#666666` |
| `--co-brand-primary` | `#9db3c4` | `#4d94ff` |
| `--co-brand-light` | `#bfd0dd` | `#6ba6ff` |
| `--co-brand-accent` | `#c9ae7a` | `#ffb84d` |
| `--co-status-up` | `#8db198` | `#33cc80` |
| `--co-status-up-bg` | `#202920` | `#112a1a` |
| `--co-status-down` | `#de897d` | `#ff6b6b` |
| `--co-status-down-bg` | `#2d201d` | `#2a1515` |
| `--co-border` | `#3a322b` | `#2a2a2a` |
| `--co-border-strong` | `#4c433a` | `#3a3a3a` |
| `--co-border-soft` | `#2d2722` | `#222222` |
| `--co-focus-ring` | `#b0c2cf` | `#4d94ff` |

**Body background:** Remove the warm gradient overlay:

```css
/* BEFORE */
body {
  background:
    linear-gradient(180deg, rgb(255 255 255 / 62%) 0%, rgb(255 255 255 / 0%) 22rem),
    linear-gradient(180deg, var(--co-bg-subtle) 0%, var(--co-bg-app) 18rem, var(--co-bg-app) 100%);
}

/* AFTER */
body {
  background: var(--co-bg-app);
}
```

**Other globals.css updates:**
- `a` tag: `text-decoration-color: rgb(34 55 74 / 24%)` → `rgb(0 102 255 / 24%)`
- `::selection`: `background: rgb(34 55 74 / 16%)` → `rgb(0 102 255 / 16%)`

**Radius tightening** (optional, recommended):

| Token | Old | New | Reason |
|-------|-----|-----|--------|
| `--radius-sm` | `12px` | `10px` | Slightly sharper for modern feel |
| `--radius-md` | `22px` | `16px` | Less bubbly, more polished |
| `--radius-lg` | `32px` | `24px` | Still soft, less cartoon |

### Step 1.3 — Rewrite BRAND_GUIDELINES.md

Full rewrite from v0.2 "Warm Authority" to v1.0 "10x Financial Copilot". Key changes:

1. **Section 1 (Philosophy):** "Warm Authority" → "10x Financial Copilot". New philosophy: high-contrast modern fintech, feed-based copilot UI, Scandinavian minimalism meets tech confidence.
2. **Section 1.5 (NEW — Logo Mark):** Document Proposal 3 "The Pure Typeset ƒ". Instrument Serif italic ƒ as the icon mark. Wordmark "fyrk" in DM Sans 600. Usage rules, clear space, monochrome variants, minimum sizes.
3. **Section 2.1 (Colors):** Replace all color values with the new palette (matching globals.css exactly).
4. **Section 2.2 (Typography):** Playfair Display → Instrument Serif (italic, copilot voice). Inter → DM Sans (UI body). JetBrains Mono → IBM Plex Mono (keep). Update sourcing table.
5. **Section 3 (Layout):** 240px sidebar → 64px rail + feed + 380px context panel. Update ASCII diagrams.
6. **Section 4 (Components):** Add Command Bar (⌘K), typed feed cards (Insight, Action, Proposal, Alert). Update color references throughout.
7. **All remaining sections:** Find-replace all old color names (Forest Navy, Sage Green, Terracotta, Pale Gold) and font names (Playfair Display, Inter, JetBrains Mono).

### PR gate

```
TESTS:
  [ ] npm run build — passes (zero errors)
  [ ] npm run lint — passes (no new violations)
  [ ] Manual: body text renders in DM Sans (check DevTools → Computed)
  [ ] Manual: .editorialText renders in Instrument Serif italic (check DevTools → Computed)
  [ ] Manual: page background is neutral #fafafa, not warm cream
  [ ] Manual: dark mode toggle works — no white-on-white or black-on-black
  [ ] Manual: primary button/link color is blue #0066ff, not navy
  [ ] Manual: status colors (green/red) are vibrant, not muted
  [ ] Consistency: all hex values in BRAND_GUIDELINES.md match globals.css
  [ ] Consistency: all font names in BRAND_GUIDELINES.md match layout.tsx
  [ ] Consistency: zero references to old names (Playfair, Inter, JetBrains, Forest Navy, Sage, Terracotta, Pale Gold)

EXPECTED REGRESSIONS (acceptable, fixed in P3):
  - Components with hardcoded rgb(34 55 74 / ...) still show navy tints
  - Gradients in theme.module.css still reference old palette
  - Landing page has hardcoded color values not yet migrated
```

### Outcome

After merge, every CSS-variable-based style in the app automatically picks up new fonts and colors. ~60% of the UI updates "for free." Remaining ~40% is hardcoded values in component CSS, handled in Phase 3.

---

## Phase 2: Logo Mark

**Branch:** `design/phase-2-logo`
**Files touched:** `src/components/layout/icons.tsx`, `src/components/marketing/LandingPage.tsx`
**Depends on:** P1 merged (needs Instrument Serif font loaded)
**Blocks:** Nothing
**Can run in parallel with:** P3a, P3b, P3c, P3d

### Step 2.1 — Replace FyrkMark in icons.tsx

Replace the current SVG rectangle icon with the Instrument Serif italic ƒ glyph.

```typescript
// BEFORE: Rectangle with lines
export function FyrkMark(props: IconProps) {
  return (
    <svg aria-hidden {...iconProps} {...props}>
      <rect height="18" rx="5" width="18" x="3" y="3" />
      <path d="M8 8h8" />
      <path d="M8 12h5" />
      <path d="M8 16h8" />
      <path d="M16 8v8" />
    </svg>
  );
}

// AFTER: Instrument Serif italic ƒ as text-based mark
export function FyrkMark({ className, ...props }: Omit<IconProps, 'viewBox'>) {
  return (
    <span
      className={className}
      aria-hidden="true"
      style={{
        fontFamily: 'var(--font-narrative)',
        fontStyle: 'italic',
        fontSize: '1.5em',
        lineHeight: 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      {...props}
    >
      ƒ
    </span>
  );
}
```

**Note:** This changes the component from an `<svg>` to a `<span>`. Verify all call sites handle both element types. If any call site passes SVG-specific props, provide an SVG-based fallback using `<text>` element.

### Step 2.2 — Update LandingPage.tsx wordmark

Update the hero logo/wordmark to show the ƒ mark alongside "fyrk":

- ƒ mark: Instrument Serif italic, rendered at display size
- "fyrk" text: DM Sans 600 weight
- Lockup: ƒ mark + "fyrk" with consistent spacing

### PR gate

```
TESTS:
  [ ] npm run build — passes
  [ ] npm run lint — passes
  [ ] Manual: sidebar logo renders ƒ glyph in Instrument Serif italic
  [ ] Manual: ƒ glyph is visually recognizable at 24px, 32px, and 48px sizes
  [ ] Manual: landing page shows ƒ + "fyrk" wordmark
  [ ] Manual: dark mode — ƒ mark has correct color contrast
  [ ] No TypeScript errors from component signature change
```

### Outcome

The Fyrk brand mark is visible throughout the app — sidebar, landing page, favicon candidate. The ƒ becomes the first thing users associate with the product.

---

## Phase 3: Component Styling (4 parallel sub-phases)

**Depends on:** P1 merged
**Can run in parallel:** P3a, P3b, P3c, P3d are independent — different files

### Phase 3a: theme.module.css

**Branch:** `design/phase-3a-theme-css`
**File:** `src/components/theme/theme.module.css` (1,260 lines)
**Hardcoded old colors:** ~5 occurrences of `rgb(34 55 74 / ...)` and `#22374a`

| Task | Detail |
|------|--------|
| Find/replace all `rgb(34 55 74 / ...)` | → `rgb(0 102 255 / ...)` (brand blue) |
| Find/replace all `rgb(159 126 74 / ...)` | → `rgb(245 166 35 / ...)` (amber) or `var(--co-brand-accent)` |
| Update `.buttonPrimary` gradient | Forest Navy gradient → `#0066ff` blue gradient |
| Update `.logoGlyph` container | Adjust sizing/padding for ƒ character instead of SVG rectangle |
| Update any warm-tinted shadows | `rgb(23 32 42 / ...)` → `rgb(0 0 0 / ...)` neutral shadows |
| Verify `.narrativeBody` | Should auto-inherit Instrument Serif from `--font-narrative` variable |

### Phase 3b: shell.module.css

**Branch:** `design/phase-3b-shell-css`
**File:** `src/components/layout/shell.module.css`
**Hardcoded old colors:** ~12 occurrences

| Task | Detail |
|------|--------|
| Find/replace all `rgb(34 55 74 / ...)` | → `rgb(0 102 255 / ...)` or `var(--co-brand-primary)` |
| Find/replace all `rgb(159 126 74 / ...)` | → `var(--co-brand-accent)` |
| Update sidebar background tints | Remove warm-tinted backgrounds, use neutral |
| Update rail hover/active states | Use new brand blue for active indicators |
| Keep layout dimensions unchanged | 288px sidebar stays — layout change is Phase 4 |

### Phase 3c: landing.module.css

**Branch:** `design/phase-3c-landing-css`
**File:** `src/components/marketing/landing.module.css`
**Hardcoded old colors:** ~17 occurrences (most of any file)

| Task | Detail |
|------|--------|
| Find/replace all `rgb(34 55 74 / ...)` | → `rgb(0 102 255 / ...)` in gradients and shadows |
| Find/replace all `rgb(159 126 74 / ...)` | → `rgb(245 166 35 / ...)` in accent elements |
| Update hero gradient | Warm navy gradient → clean blue gradient |
| Update CTA button colors | Forest Navy → `#0066ff` blue |
| Update social proof section | Warm tints → neutral or blue-tinted |
| Update footer | Old color references → new palette |

### Phase 3d: dashboard-insights.module.css

**Branch:** `design/phase-3d-dashboard-css`
**File:** `src/components/dashboard/dashboard-insights.module.css`
**Hardcoded old colors:** ~1 occurrence

| Task | Detail |
|------|--------|
| Find/replace `rgb(34 55 74 / ...)` | → `var(--co-brand-primary)` or new blue equivalent |
| Verify insight cards render correctly | With new brand colors |

### PR gate (shared across all P3 sub-phases)

```
TESTS (per sub-phase):
  [ ] npm run build — passes
  [ ] npm run lint — passes
  [ ] grep -r "rgb(34 55 74" <owned-file> returns 0 matches
  [ ] grep -r "rgb(159 126 74" <owned-file> returns 0 matches
  [ ] grep -r "#22374a" <owned-file> returns 0 matches
  [ ] grep -r "#9f7e4a" <owned-file> returns 0 matches
  [ ] Manual: no visible warm/navy tints remaining in the component's rendered output
  [ ] Manual: dark mode still renders correctly for the component

ZERO-TOLERANCE RULE:
  After all P3 sub-phases merge, running this command must return 0 results:
  grep -r "rgb(34 55 74\|rgb(159 126 74\|#22374a\|#9f7e4a" src/
```

### Outcome

After all P3 sub-phases merge, the entire app is visually consistent with the new palette. Zero hardcoded old-palette references remain in `src/`. The "10x Financial Copilot" identity is fully expressed in color.

---

## Phase 4: Layout Restructuring

**Branch:** `design/phase-4-layout`
**Files touched:** `src/components/layout/AppShell.tsx`, `src/components/layout/SidebarNav.tsx`, `src/components/layout/Topbar.tsx`, `src/components/layout/shell.module.css`
**Depends on:** P1 + P3b merged (shell.module.css must be color-clean before layout changes)
**Blocks:** Nothing

### Step 4.1 — Slim rail to 64px

| File | Change |
|------|--------|
| `shell.module.css` | `.shellLayout` grid: `288px minmax(0, 1fr)` → `64px minmax(0, 1fr)` |
| `shell.module.css` | `.rail` width adjustments, padding reduction |
| `AppShell.tsx` | Remove narrative text sections from rail (brand description, principles cards, context cards) |
| `SidebarNav.tsx` | Strip text labels, render icon-only. Add `title` attribute or tooltip for accessibility |

### Step 4.2 — Add context panel (right side)

| File | Change |
|------|--------|
| `shell.module.css` | Grid becomes: `64px minmax(0, 1fr) 380px` |
| `shell.module.css` | New `.contextPanel` class: 380px fixed, border-left, overflow-y auto |
| `AppShell.tsx` | Add `<aside className={styles.contextPanel}>` after main content |
| Content | Context panel shows: account summary, fitness score, pending items (can start with placeholder) |

### Step 4.3 — Responsive breakpoints

| Breakpoint | Behavior |
|------------|----------|
| ≥1280px | Full three-panel: 64px rail + feed + 380px context |
| 768–1279px | Two-panel: 64px rail + feed. Context panel hidden (accessible via toggle) |
| <768px | Single panel: feed only. Rail collapses to bottom tab bar |

### Step 4.4 — Simplify Topbar

| File | Change |
|------|--------|
| `Topbar.tsx` | Topbar sits inside feed area, not full-width |
| `Topbar.tsx` | Move search to ⌘K command bar overlay (can be a stub/placeholder initially) |
| `Topbar.tsx` | Keep: page title, density toggle, profile/theme toggle |

### PR gate

```
TESTS:
  [ ] npm run build — passes
  [ ] npm run lint — passes
  [ ] Manual: rail renders at 64px with icons only
  [ ] Manual: icons are recognizable and have accessible labels (title or aria-label)
  [ ] Manual: context panel renders at 380px on desktop
  [ ] Manual: context panel hides at <1280px
  [ ] Manual: rail collapses to bottom tabs at <768px
  [ ] Manual: feed area maintains readable content width
  [ ] Manual: dark mode works across all three panels
  [ ] No TypeScript errors from component restructuring
  [ ] All existing nav links remain functional
```

### Outcome

The app shell matches the approved three-panel layout from the design concept. Navigation is streamlined to an icon rail. Context is always visible on desktop. The foundation is set for feed-based copilot cards in future sprints.

---

## Phase 5: Font Evaluation (DM Sans)

**Branch:** `design/phase-5-font-eval`
**Files touched:** `src/app/layout.tsx` (only if swap needed), minor CSS adjustments
**Depends on:** P1 merged (DM Sans must be live to evaluate)
**Blocks:** Nothing
**Can run in parallel with:** P2, P3, P4

### Step 5.1 — Evaluation matrix

After P1 merges and DM Sans is live, evaluate these scenarios:

| Scenario | Check | Pass criteria |
|----------|-------|---------------|
| Nav labels at 13px | Legibility, weight distinction | Clear at 500 weight, readable at 400 |
| Body text at 16px | Paragraph readability | Comfortable line-height, no cramping |
| Tabular data | `font-variant-numeric: tabular-nums` | Decimal points align, thousands separators consistent |
| Amount display at various sizes | 11px (metadata), 14px (list), 24px (hero) | Numerals are distinctive, not ambiguous (0 vs O, 1 vs l) |
| Headings at 24-36px | Weight 700 presence | Bold is distinctly bold, not just medium |
| Form inputs at 14px | Characters don't clip, placeholder readable | Full x-height visible, no clipping |
| macOS Safari rendering | Subpixel antialiasing | No fuzz or blur at body sizes |
| macOS Chrome rendering | Hinting quality | Consistent with Safari |

### Step 5.2 — Alternative candidates (if DM Sans fails)

| Font | Strengths | Risk |
|------|-----------|------|
| **Inter** | Industry standard, best tabular numerals, widest weight range | Ubiquitous — may feel generic |
| **Geist Sans** | Vercel-native, designed for Next.js, excellent UI rendering | Less established brand identity |
| **Plus Jakarta Sans** | Warmer geometric, good fintech fit | Tabular nums untested |
| **General Sans** | Modern geometric, free tier | Not on Google Fonts — needs local hosting |

### Step 5.3 — Decision protocol

1. Run evaluation matrix against DM Sans (2 hours max)
2. If DM Sans passes all criteria → **keep, close P5**
3. If DM Sans fails ≥2 criteria → test top alternative (Inter first, then Geist)
4. Swap requires changes ONLY in:
   - `layout.tsx` (font import)
   - `globals.css` (letter-spacing, line-height tweaks if needed)
   - `BRAND_GUIDELINES.md` (font name + sourcing table)
5. No component files should need changes — they all use `var(--font-data)`

### PR gate

```
TESTS:
  [ ] npm run build — passes
  [ ] Evaluation matrix completed with screenshots for each scenario
  [ ] If font swapped: BRAND_GUIDELINES.md updated
  [ ] If font swapped: layout.tsx import matches BRAND_GUIDELINES.md
  [ ] Manual: tabular numerals align in Balance Sheet view
  [ ] Manual: nav labels readable at small sizes
  [ ] Manual: no FOUT on page load
```

### Outcome

The UI sans-serif font is confirmed as production-quality for a financial app. Either DM Sans is validated, or a better alternative is in place. All future development uses the confirmed font with confidence.

---

## Sprint Summary

| Phase | Branch | Files | Parallel? | Estimated effort | Priority |
|-------|--------|-------|-----------|-----------------|----------|
| **P1** | `design/phase-1-foundation` | 3 files | First — blocks all | Medium (1-2h) | Critical |
| **P2** | `design/phase-2-logo` | 2 files | After P1 | Small (30m) | High |
| **P3a** | `design/phase-3a-theme-css` | 1 file | After P1, parallel with P3b/c/d | Medium (1h) | High |
| **P3b** | `design/phase-3b-shell-css` | 1 file | After P1, parallel with P3a/c/d | Small (30m) | High |
| **P3c** | `design/phase-3c-landing-css` | 1 file | After P1, parallel with P3a/b/d | Medium (45m) | High |
| **P3d** | `design/phase-3d-dashboard-css` | 1 file | After P1, parallel with P3a/b/c | Small (15m) | Medium |
| **P4** | `design/phase-4-layout` | 4 files | After P3b | Large (2-3h) | Medium |
| **P5** | `design/phase-5-font-eval` | 1-3 files | After P1 | Small (1h) | Low |

### Total estimated effort: 6-8 hours

### Definition of Done (entire sprint)

```
[ ] npm run build — zero errors
[ ] npm run lint — zero warnings
[ ] grep -r "rgb(34 55 74\|rgb(159 126 74\|#22374a\|#9f7e4a\|Playfair\|Newsreader\|Public.Sans\|JetBrains" src/ → 0 results
[ ] grep -r "Forest Navy\|Sage Green\|Terracotta\|Pale Gold\|Warm Authority" docs/BRAND_GUIDELINES.md → 0 results
[ ] App renders with DM Sans + Instrument Serif + IBM Plex Mono
[ ] Logo shows Instrument Serif italic ƒ mark
[ ] All colors match approved design-10x.html concept
[ ] Three-panel layout: 64px rail + feed + 380px context
[ ] Dark mode fully functional
[ ] BRAND_GUIDELINES.md v1.0 internally consistent with codebase
[ ] All changes committed on feature branches, merged via PR
```

---

## Appendix: Color Migration Cheat Sheet

For agents working on P3 sub-phases, use this find/replace reference:

```
FIND                              → REPLACE WITH
rgb(34 55 74 / ...)               → rgb(0 102 255 / ...) [keep same alpha]
rgb(159 126 74 / ...)             → rgb(245 166 35 / ...) [keep same alpha]
rgb(75 114 92 / ...)              → rgb(0 168 102 / ...) [keep same alpha]
rgb(181 93 83 / ...)              → rgb(224 62 62 / ...) [keep same alpha]
rgb(23 32 42 / ...) [shadows]     → rgb(0 0 0 / ...) [keep same alpha]
#22374a                           → var(--co-brand-primary) [or #0066ff]
#9f7e4a                           → var(--co-brand-accent) [or #f5a623]
#4b725c                           → var(--co-status-up) [or #00a866]
#b55d53                           → var(--co-status-down) [or #e03e3e]
```

Prefer `var(--co-*)` references over hardcoded hex wherever the context allows (not inside gradient stops that need raw values).
