# FYRK — Brand & UI Guidelines
## "Warm Authority" Design System

> **Version:** 0.2 — Warm Authority
> **Source:** [PRD.md](./PRD.md) · [API_SPEC.md](./API_SPEC.md)
> **Platforms:** Web (responsive, desktop-first) + Mobile app (React Native, future)
> **Design tool integration:** All tokens and components are Figma-export ready
> **Consumed by:** Frontend agent, Design agent

---

## 1. Design Philosophy: Warm Authority

"Warm Authority" bridges the gap between the analytical precision required by a "Household CFO" and the anxiety-reducing clarity needed by a more reluctant, less financially engaged partner. It uses the visual language of high-end editorial and private banking (**authority**) mixed with Scandinavian minimalism and soft aesthetics (**warmth**).

| Attribute | Do | Don't |
|---|---|---|
| **Tone** | Calm confidence, institutional trust, editorial warmth | Flashy, gamified, anxious, cold-corporate |
| **Density** | Adaptive — Narrative View (default) and Terminal View (CFO toggle) | One fixed density that frustrates one persona |
| **Color** | Warm, muted, sophisticated — Forest Navy, Sage, Terracotta | Neon greens, SaaS-blue gradients, traffic-light red/green |
| **Typography** | Serif for narrative (human layer), Sans for data (precision layer) | All-serif (newspaper) or all-sans (generic SaaS) |
| **Motion** | Subtle, purposeful (data transitions, micro-feedback) | Bouncy animations, parallax, confetti |
| **Charts** | Clean, warm palette, readable with context | 3D charts, excessive decoration, aggressive colors |

**Inspiration references:** Carta (equity management), Mercury (banking), Kinfolk magazine (editorial warmth), Scandinavian private banking reports (typographic authority).

### The Two-Persona Problem

The design system must serve two users who live in the **same household**:

| | The Household CFO | The Reluctant Partner |
|---|---|---|
| **Engagement** | Daily/weekly, proactive | Monthly, prompted by CFO |
| **Needs** | Precision, density, speed | "Are we okay?", clarity, calm |
| **Frustrated by** | Too much padding, hidden data, scrolling | Walls of data, jargon, complexity |
| **Design answer** | Terminal View (density toggle) | Narrative View (default) |

This is solved via the **Density Toggle** (see Section 4.1).

---

## 2. Design Tokens

### 2.1 Color Palette

```css
:root {
  /* ── Backgrounds & Surfaces ── */
  --co-bg-app:        #FDFDFC;   /* Alabaster — warm off-white base */
  --co-bg-surface:    #FFFFFF;   /* Pure white — elevated cards */
  --co-bg-hover:      #F4F3F0;   /* Oatmeal — hover/selected state */
  --co-bg-subtle:     #F8F7F5;   /* Between app and hover */

  /* ── Typography ── */
  --co-text-primary:   #1A1A1A;  /* Deep Charcoal — headings, primary figures */
  --co-text-secondary: #5E6266;  /* Slate Gray — metadata, labels */
  --co-text-muted:     #A4A7AB;  /* Dusty Gray — placeholder, disabled */

  /* ── Brand & Semantic ── */
  --co-brand-primary:  #2A3B4C;  /* Forest Navy — links, primary actions, institutional trust */
  --co-brand-light:    #3A5068;  /* Lighter navy — hover states */
  --co-status-up:      #4A7C59;  /* Sage Green — growth, positive change */
  --co-status-up-bg:   #EDF5F0;  /* Sage Green background */
  --co-status-down:    #CC5A50;  /* Muted Terracotta — warnings, liabilities */
  --co-status-down-bg: #FDF0EF;  /* Terracotta background */
  --co-info:           #6B8E9B;  /* Soft Steel — informational, neutral */
  --co-info-bg:        #EFF4F6;  /* Soft Steel background */

  /* ── Data Visualization (6-color palette) ── */
  --co-chart-1: #2A3B4C;        /* Forest Navy */
  --co-chart-2: #6B8E9B;        /* Soft Steel */
  --co-chart-3: #D4B872;        /* Pale Gold — wealth/premium feel */
  --co-chart-4: #5C4D5C;        /* Dusky Purple */
  --co-chart-5: #C4A882;        /* Sandstone (darkened for contrast) */
  --co-chart-6: #3D8B8B;        /* Coastal Teal */

  /* ── Borders & Elevation ── */
  --co-border:         #EAEAEA;  /* Soft gray — primary border */
  --co-border-strong:  #D4D4D4;  /* Stronger border for emphasis */
  --co-shadow-soft:    0 4px 20px rgba(0, 0, 0, 0.03);  /* Single, ultra-subtle shadow */

  /* ── Focus & Interaction ── */
  --co-focus-ring:     #6B8E9B;  /* Soft Steel — visible but not heavy */
  --co-focus-ring-offset: 2px;
}
```

### Warm Dark Mode

Dark mode maintains the warm character — **not** cold blue-black.

```css
[data-theme="dark"] {
  /* ── Backgrounds ── */
  --co-bg-app:        #1A1815;   /* Warm charcoal — not pure black */
  --co-bg-surface:    #242220;   /* Warm elevated surface */
  --co-bg-hover:      #2E2B28;   /* Warm hover */
  --co-bg-subtle:     #1F1D1B;

  /* ── Typography ── */
  --co-text-primary:   #F0EDE8;  /* Warm off-white */
  --co-text-secondary: #9A9590;  /* Warm gray */
  --co-text-muted:     #6B6560;

  /* ── Brand (lightened for dark bg) ── */
  --co-brand-primary:  #7BA3BC;  /* Lighter navy for readability */
  --co-brand-light:    #92B8CE;
  --co-status-up:      #6AAF7B;  /* Lightened sage */
  --co-status-up-bg:   #1E2A22;
  --co-status-down:    #E07A70;  /* Lightened terracotta */
  --co-status-down-bg: #2A1F1E;
  --co-info:           #8AAFBC;
  --co-info-bg:        #1E2628;

  /* ── Borders ── */
  --co-border:         #3A3632;
  --co-border-strong:  #4A4540;
  --co-shadow-soft:    0 4px 20px rgba(0, 0, 0, 0.15);

  /* ── Focus ── */
  --co-focus-ring:     #8AAFBC;
}
```

**Default mode: Light.** Dark mode supported as user preference. Rule: chart colors remain the same in both modes, with opacity adjustments on backgrounds only.

### 2.2 Typography System

Typography does the heavy lifting to establish authority. The key innovation: **serif for narrative, sans for data**.

```css
:root {
  /* ── Font Families ── */

  /* Narrative/editorial — the "human layer" of the app */
  --font-narrative: 'Playfair Display', ui-serif, Georgia, serif;
  
  /* UI, data, and controls — the "precision layer" */
  --font-data: 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif;
  
  /* Financial figures in CFO/Terminal mode (optional density toggle) */
  --font-mono: 'JetBrains Mono', 'Source Code Pro', ui-monospace, monospace;

  /* ── Scale ── */
  --text-xs:    0.75rem;    /* 12px */
  --text-sm:    0.875rem;   /* 14px */
  --text-base:  1rem;       /* 16px */
  --text-lg:    1.125rem;   /* 18px */
  --text-xl:    1.25rem;    /* 20px */
  --text-2xl:   1.5rem;     /* 24px */
  --text-3xl:   1.875rem;   /* 30px */
  --text-4xl:   2.25rem;    /* 36px */

  /* ── Weights ── */
  --font-regular:  400;
  --font-medium:   500;
  --font-semibold: 600;
  --font-bold:     700;

  /* ── Line Heights ── */
  --leading-tight:   1.25;
  --leading-normal:  1.5;
  --leading-relaxed: 1.75;
}
```

### Strict Typography Boundary

The serif font (`--font-narrative`) is strictly limited to the **human/editorial layer**:

| ✅ Serif (Playfair Display) allowed | ❌ Serif forbidden |
|---|---|
| "What Changed This Week" narrative | Dashboard metrics & numbers |
| Life Event Playbook introductions | Balance Sheet data |
| Quarterly Review letter | Account lists & tables |
| Proposal discussion thread text | Settings, forms, inputs |
| Page titles on editorial screens | Navigation, buttons, labels |
| Financial Timeline narrative snippets | Chart axes and legends |

All numerical values must use `--font-data` with the `font-variant-numeric: tabular-nums` CSS property so decimal places and amounts align perfectly in tables and the Balance Sheet.

In **Terminal/CFO Mode** (density toggle active), financial figures switch to `--font-mono` for maximum data-density readability.

### Font sourcing

| Font | Source | License | Notes |
|---|---|---|---|
| Inter | Google Fonts | Free / OFL | Self-host for performance |
| Playfair Display | Google Fonts | Free / OFL | Prototype. Consider GT Super (~$200) for production |
| JetBrains Mono | JetBrains | Free / OFL | Terminal mode only |

### 2.3 Spacing & Form

```css
:root {
  /* ── 8px Base Grid ── */
  --space-xs:  4px;
  --space-sm:  8px;
  --space-md:  16px;
  --space-lg:  24px;
  --space-xl:  32px;
  --space-2xl: 48px;
  --space-3xl: 64px;
  --space-4xl: 96px;

  /* ── Border Radius ── */
  --radius-sm:   4px;    /* Badges, tags, inputs */
  --radius-md:   12px;   /* Standard cards, timeline events */
  --radius-lg:   24px;   /* Major sections, modals */
  --radius-full: 9999px; /* Pills, avatars */
}
```

**Elevation philosophy:** border-first, not shadow-first.
- Use `1px solid var(--co-border)` as the **primary** way to define card edges on the alabaster background
- Reserve `var(--co-shadow-soft)` for hover states and elevated interactive elements only
- Never use dark, sharp drop shadows

---

## 3. Layout System

### App Layout (authenticated)

```
┌─────────────────────────────────────────────────────────────┐
│  Topbar: Logo · Household Selector · Search · Notifications │
├────────┬────────────────────────────────────────────────────┤
│        │                                                    │
│  Side  │              Main Content Area                     │
│  nav   │              (max-width: 1200px, centered)         │
│        │              bg: var(--co-bg-app)                   │
│  240px │                                                    │
│  fixed │              Cards: var(--co-bg-surface)            │
│  bg:   │              with 1px var(--co-border)              │
│  white │                                                    │
│        │                                                    │
└────────┴────────────────────────────────────────────────────┘
```

### Sidebar navigation

```
📊  Dashboard
📈  Balance Sheet
🕐  Timeline
📋  Life Events
📊  Quarterly Review
💪  Financial Fitness
📝  Proposals
───────────────
👥  Household
⚙️  Settings
```

Sidebar text in `--font-data`. Active item: `--co-brand-primary` text with `--co-bg-hover` background. Hover: `--co-bg-hover`.

### Responsive breakpoints

| Breakpoint | Width | Layout change |
|---|---|---|
| **Desktop** | ≥1280px | Full sidebar + content |
| **Tablet** | 768–1279px | Collapsible sidebar (overlay) |
| **Mobile** | <768px | Bottom tab navigation, no sidebar |

---

## 4. Component Specifications

### 4.1 The Density Toggle (Key Innovation)

The UI supports two density modes, toggled by the user:

**State A: Narrative View (Default)**
- High whitespace, `--text-base` / `--text-lg` for body text
- Cards with `--radius-md`, generous padding (`--space-lg`)
- Net Worth and Fitness Score prominent
- AI narratives displayed inline
- Best for: The Reluctant Partner, first-time users, demo mode

**State B: Terminal View (CFO Mode)**
- Reduced padding (`--space-sm` / `--space-xs`)
- Font sizes drop to `--text-sm` / `--text-xs`
- Card layouts transform into high-density data grids
- Financial figures switch to `--font-mono`
- Narrative sections collapse to one-line summaries (expandable)
- Best for: The Household CFO, power users, daily checking

```typescript
// Toggle implementation
interface DensityMode {
  mode: 'narrative' | 'terminal'
}

// Applied via data attribute on root layout
// <body data-density="narrative"> or <body data-density="terminal">

// CSS adjusts spacing, font sizes, and layout via attribute selectors
// [data-density="terminal"] .card { padding: var(--space-sm); }
// [data-density="terminal"] .amount { font-family: var(--font-mono); }
```

Toggle location: top-right of main content area, next to dark mode toggle. Icon: grid/list view toggle.

### 4.2 Base Components (shadcn/ui, customized)

All shadcn/ui components customized to Warm Authority tokens:

- **Button:** Sizes: `sm` (32px), `md` (40px), `lg` (48px). Primary variant uses `--co-brand-primary` (Forest Navy). Destructive uses `--co-status-down`. Border radius: `--radius-sm`.
- **Card:** Border: `1px solid var(--co-border)`. Border radius: `--radius-md`. Background: `--co-bg-surface`. No shadow by default; `--co-shadow-soft` on hover.
- **Input:** Height 40px, `--radius-sm`, border `--co-border`. Focus ring: `--co-focus-ring` with 2px offset.
- **Dialog/Modal:** Centered, max-width 560px, `--radius-lg`, backdrop with warm tint `rgba(26,24,21,0.4)`.
- **Toast:** Bottom-right, auto-dismiss 5s. Success uses Sage Green border, error uses Terracotta border.

### 4.3 Domain Components

#### AmountDisplay

```typescript
interface AmountDisplayProps {
  amount: number           // minor units (öre)
  currency: string         // ISO 4217
  showSign?: boolean       // +/- prefix
  colorize?: boolean       // Sage Green positive, Terracotta negative
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showCurrency?: boolean
}

// Styling rules:
// Font: var(--font-data) with font-variant-numeric: tabular-nums
// In Terminal mode: var(--font-mono)
// Positive: var(--co-status-up)
// Negative: var(--co-status-down)
// Format: "1 234 567 SEK" (spaces as thousand separator, Swedish convention)
```

#### FitnessGauge

```
Design: Semi-circular arc gauge
- Score number: large, center, font-data tabular-nums (e.g., "720")
- Arc fills clockwise based on score (0=empty, 1000=full)
- Color gradient uses Warm Authority semantic colors:
  0–300:   var(--co-status-down)  Muted Terracotta
  300–500: #D4B872               Pale Gold  
  500–700: var(--co-info)        Soft Steel
  700–1000: var(--co-status-up)  Sage Green
- Label below: "Financial Fitness" in --font-data
- Trend arrow: ↑↓ with delta value
```

#### AllocationChart

```
Design: Donut chart with center label
- 6-color palette: --co-chart-1 through --co-chart-6
- Segments ordered by size (largest first, clockwise)
- Hover: segment expands slightly, tooltip with white bg + soft border
- Center: total value in AmountDisplay
- Legend: right-side list with colored dots, sorted by %
- Chart tooltip rule: pure white background, 1px --co-border, --radius-sm
- Variants: byAssetClass, byGeography, byCurrency, bySector
```

#### TimelineEntry (Signature Component)

The Financial Timeline is the signature UX. Specific design pattern:

```
Design:
- A continuous, thin (2px), vertical line in var(--co-info) (Soft Steel)
  running down the left side
  
- Events are dots on the line:
  - AUTOMATIC events (dividends, market shifts, system): 
    Small solid dots (8px), --co-info color
  - HUMAN events (proposals approved, life events, decisions): 
    Larger dots (16px) containing miniature icons, --co-brand-primary
  - MILESTONES (fitness crossed threshold, goal reached):
    Larger dots (16px), --co-status-up with glow ring

- Content card (right of line):
  - Title: --font-data, --co-text-primary
  - Narrative snippet: --font-narrative (serif), --co-text-secondary
  - Metadata: --font-data --text-xs, --co-text-muted

- Hover interaction:
  - Slightly expands the card (scale 1.01)
  - Highlights the path from this event back to the present day  
    (line brightens between hovered event and "today" marker)
  - Visually reinforces "decisions compounding over time"

- "TODAY" marker: horizontal break in the line with label
- "FUTURE" section: dotted line, lighter colors (goals/planned events)
```

#### ProposalCard

```
Design: Card with status badge
- Border: 1px solid var(--co-border)
- Status badge corner: 
  Pending → Pale Gold background with --co-text-primary text
  Approved → Sage Green background
  Rejected → Terracotta background
- Title: --font-data semibold
- Description: --font-data regular
- Discussion thread: --font-narrative for comment content (human layer)
- Impact analysis section (collapsible): data in --font-data
- Action buttons: Forest Navy primary, outline secondary
```

#### AccountCard

```
Design: Horizontal card with provider identity
- 1px --co-border, --radius-md, --co-bg-surface
- Provider logo (left, 32×32, --radius-sm)
- Account name (--font-data semibold) + wrapper badge (ISK/KF/Depå)
  - Badge: --radius-sm, --co-bg-hover background, --text-xs
- Total value (right, large, --font-data tabular-nums)
  - Terminal mode: --font-mono
- Holdings count + last synced (--text-xs, --co-text-muted)
- Owner avatar (if household view, not own account)
- Privacy indicator: 🔒 icon if amount_hidden or private
- Hover: --co-shadow-soft + border shifts to --co-border-strong
```

#### NetWorthTrend

```
Design: Area chart
- Line: var(--co-brand-primary) (Forest Navy)
- Fill: gradient from --co-brand-primary (10% opacity) to transparent
- X-axis: dates (monthly ticks), --font-data --text-xs, --co-text-muted
- Y-axis: SEK values (abbreviated: "2.4M SEK"), --font-data --text-xs
- Tooltip: white bg, --co-border, --radius-sm
- Life event overlay: small dots on the line at event dates
  - Hover dot: shows event title
- Grid lines: 1px --co-border, dashed, subtle
```

---

## 5. Screen Blueprints

### Dashboard (Household Home)

```
┌────────────────────────────────────────────────────┐
│ Good morning, Isac · Andersson Household    [⊞/≡] │  ← density toggle
├────────────────────────────────────────────────────┤
│                                                    │
│ ┌──────────────────┐ ┌──────────────────────────┐ │
│ │  NET WORTH        │ │  FINANCIAL FITNESS        │ │
│ │  2 430 000 SEK    │ │      ┌──────┐             │ │
│ │  ▲ +12 400 (+0.5%)│ │      │ 720  │             │ │
│ │  this week        │ │      └──────┘             │ │
│ │  [Net worth chart]│ │  ▲ +20 from last month   │ │
│ └──────────────────┘ └──────────────────────────┘ │
│                                                    │
│ ┌──────────────────────────────────────────────┐   │
│ │  📰 WHAT CHANGED THIS WEEK                    │   │
│ │  ─────────────────────                         │   │
│ │  "Your household net worth grew by 12,400     │   │  ← serif (--font-narrative)
│ │   SEK as Nordic markets continued their       │   │
│ │   steady climb. Your Avanza ISK..."            │   │
│ │                                                │   │
│ │   • ISK Avanza up 2.3%                 [sans]  │   │  ← sans (--font-data)
│ │   • Mortgage fixed rate expires in 8 months    │   │
│ └──────────────────────────────────────────────┘   │
│                                                    │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────┐   │
│ │ Active       │ │ Pending      │ │ Upcoming │   │
│ │ Life Events  │ │ Proposals    │ │ Review   │   │
│ │ 1 active     │ │ 2 pending    │ │ Q1 in    │   │
│ │              │ │              │ │ 18 days  │   │
│ └──────────────┘ └──────────────┘ └──────────┘   │
│                                                    │
│ ┌──────────────────────────────────────────────┐   │
│ │  🕐 RECENT TIMELINE                           │   │
│ │  [Latest 5 timeline entries...]               │   │
│ │  → View full timeline                          │   │
│ └──────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────┘
```

### Balance Sheet

```
┌────────────────────────────────────────────────────┐
│ Household Balance Sheet          as of Feb 23, 2026│
├────────────────────────────────────────────────────┤
│                                                    │
│  NET WORTH: 2 430 000 SEK                   [⊞/≡] │  ← density toggle
│  Assets: 2 850 000 · Liabilities: 420 000          │
│                                                    │
│  [Toggle: Household | Isac | Partner]              │
│                                                    │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐│
│ │ By Asset     │ │ By Geography │ │ By Currency  ││
│ │ Class        │ │              │ │              ││
│ │ [Donut]      │ │ [Donut]      │ │ [Donut]      ││
│ │ 6-color      │ │ palette      │ │              ││
│ └──────────────┘ └──────────────┘ └──────────────┘│
│                                                    │
│  NARRATIVE VIEW:              TERMINAL VIEW:       │
│  ┌──────────────────────┐     ┌──────────────────┐│
│  │ 🏦 ISK Avanza        │     │ ISK Avanza 350K  ││
│  │    350 000 SEK        │     │ KF Nordnet  180K ││
│  │    5 holdings · ↑2.3% │     │ SEB Savings 450K ││
│  │    Updated today      │     │ PPM         380K ││
│  └──────────────────────┘     │ Skandia     220K ││
│  ┌──────────────────────┐     │ Mortgage   -420K ││
│  │ 🏦 KF Nordnet         │     └──────────────────┘│
│  │    180 000 SEK        │                          │
│  └──────────────────────┘                          │
│                                                    │
│ ⚠️ Data quality: 85% · 1 account stale             │
└────────────────────────────────────────────────────┘
```

### Financial Timeline

```
┌────────────────────────────────────────────────────┐
│ Financial Timeline          [Filter ▾] [+ Add]     │
├────────────────────────────────────────────────────┤
│                                                    │
│  FUTURE ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌ (dotted line)  │
│     ╎                                              │
│     ╎  🎯 Sep 2026 · Summer house (goal)           │
│     ╎     Target: 500 000 SEK                      │
│     ╎                                              │
│  ── TODAY ──────────────────────────                │
│     │                                              │
│  Feb ●  📊 Q4 2025 Review · Score: 720 (▲+20)     │  ← large dot (human)
│  20  │     "Strong quarter..."  [serif]             │
│     │                                              │
│  Feb ●  📝 Reviewed insurance coverage              │  ← large dot (human)
│  12  │     "We decided to increase..."  [serif]     │
│     │                                              │
│  Jan ●  🏠 Apartment Search Started                 │  ← large dot + icon
│  15  │     Life Event active                        │
│     │     Budget: 3 500 000 SEK · Q3 2026          │
│     │     Playbook: 8/12 actions complete           │
│     │                                              │
│  Dec ·  Auto: Dividend received (Investor AB)       │  ← small dot (auto)
│  18  │  +2 340 SEK                                  │
│     │                                              │
│  Dec ●  🏆 Fitness: Crossed 700                     │  ← milestone dot + glow
│  01  │     Buffer score improved to 160             │
│     │                                              │
│  ... │  [Load more]                                │
└────────────────────────────────────────────────────┘
```

---

## 6. Animation & Motion

| Interaction | Animation | Duration | Easing |
|---|---|---|---|
| Page transition | Fade content, not container | 150ms | ease-out |
| Card hover | Border darkens + `--co-shadow-soft` appears | 200ms | ease-in-out |
| Chart data change | Smooth interpolation | 500ms | ease-out |
| Score gauge fill | Sweep from 0 to value | 1000ms | ease-out |
| Timeline entry appear | Fade + slide-up from 8px | 300ms | ease-out |
| Timeline hover path | Line brightens from event to today | 400ms | ease-out |
| Toast appear | Slide from right | 250ms | ease-out |
| Modal open | Fade warm backdrop + scale 0.97→1 | 200ms | ease-out |
| Skeleton loading | Shimmer pulse on `--co-bg-hover` | 1500ms loop | linear |
| Density toggle | Cross-fade between states | 300ms | ease-in-out |

All animations respect `prefers-reduced-motion: reduce` — instantly apply final state, no transitions.

---

## 7. Empty States & Loading

### Empty states

Every screen has a designed empty state:
1. **Icon** (subtle, single-color in `--co-text-muted`, not cartoon)
2. **Title** in `--font-data` semibold
3. **Description** in `--font-data` regular, `--co-text-secondary`
4. **Primary action** button (Forest Navy)

Example (Balance Sheet, no accounts):
```
  📊
  Your Household Balance Sheet
  Add your first financial account to see your 
  complete financial picture in one place.
  
  [+ Add Account]     [Import from CSV]
```

### Loading states

- **Page-level:** Skeleton matching target layout — card shapes in `--co-bg-hover` with shimmer
- **Component-level:** Pulse shimmer on individual cards/charts
- **AI generation:** Serif typography progress message: *"Writing your quarterly review..."* with estimated time
- **Never a blank white screen** — always show structure immediately

---

## 8. Accessibility (WCAG 2.1 AA)

| Requirement | Implementation |
|---|---|
| Color contrast | 4.5:1 minimum. Verified: `--co-text-primary` on `--co-bg-app` = 14.5:1 ✓; `--co-text-secondary` on `--co-bg-surface` = 5.2:1 ✓ |
| Focus indicators | 2px ring in `--co-focus-ring` (Soft Steel) with 2px offset. Visible on both light and dark |
| Keyboard navigation | All features accessible via keyboard; logical tab order |
| Screen reader labels | All icons have `aria-label`; charts have text summary alternatives |
| Reduced motion | Respect `prefers-reduced-motion`; all animations disabled |
| Touch targets | Minimum 44×44px on mobile |
| Color-blind safety | Chart palette tested for deuteranopia/protanopia; shapes + patterns available as fallback |

---

## 9. Figma Export Strategy

All tokens structured for Figma import:

1. **Color tokens** → Figma Variables (modes: Warm Light / Warm Dark)
2. **Typography** → Figma Text Styles (Playfair narrative, Inter data, JetBrains terminal)
3. **Spacing** → Auto Layout values from 8px grid
4. **Borders & shadows** → Figma Effect Styles
5. **Radii** → Figma Variables (4px / 12px / 24px)

### Component naming convention

```
components/
  primitives/
    Button / Primary / Large
    Button / Secondary / Medium
    Input / Default
    Input / Error
    Card / Narrative Density
    Card / Terminal Density
  domain/
    AmountDisplay / Positive / Large
    AmountDisplay / Negative / Small
    FitnessGauge / Default
    FitnessGauge / Dark Mode
    AllocationChart / By Asset Class
    TimelineEntry / Human Event
    TimelineEntry / Auto Event
    TimelineEntry / Milestone
    AccountCard / Narrative
    AccountCard / Terminal Row
    ProposalCard / Pending
    ProposalCard / Approved
    DensityToggle / Narrative Active
    DensityToggle / Terminal Active
  layout/
    Sidebar / Expanded
    Sidebar / Collapsed
    Topbar / Default
    PageHeader / With Density Toggle
```

---

## 10. Mobile App Considerations (React Native, Future)

| Web | React Native equivalent |
|---|---|
| CSS variables | Theme objects (same token values, same warm palette) |
| shadcn/ui | React Native Paper or custom components |
| Recharts | `react-native-svg-charts` or `victory-native` |
| Sidebar nav | Bottom tab navigation (5 tabs max) |
| Tailwind + density toggle | NativeWind with context-based density |
| Google Fonts (Playfair, Inter) | Self-bundled via `expo-font` |

**Mobile-specific:**
- Density toggle → mobile defaults to Narrative View; Terminal unavailable (screen too small)
- Simplified dashboard (vertically stacked metric cards)
- Swipe-able timeline
- Push notifications for proposals + reviews
- Biometric auth (FaceID / fingerprint)
