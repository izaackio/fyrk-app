# FYRK — Brand & UI Guidelines
## "10x Financial Copilot" Design System

> **Version:** 1.0 — 10x Financial Copilot
> **Source:** [PRD.md](./PRD.md) · [API_SPEC.md](./API_SPEC.md)
> **Platforms:** Web (responsive, desktop-first) + Mobile app (React Native, future)
> **Design tool integration:** All tokens and components are Figma-export ready
> **Consumed by:** Frontend agent, Design agent

---

## 1. Design Philosophy: 10x Financial Copilot

"10x Financial Copilot" is a high-contrast modern fintech design language that positions Fyrk as an intelligent copilot for household finances. It combines Scandinavian minimalism with tech confidence — a feed-based copilot UI where AI-driven insights flow naturally alongside structured financial data.

| Attribute | Do | Don't |
|---|---|---|
| **Tone** | Confident, modern, intelligent — copilot clarity | Warm-cozy, gamified, anxious, old-school banking |
| **Density** | Adaptive — Feed View (default) and Terminal View (CFO toggle) | One fixed density that frustrates one persona |
| **Color** | High-contrast, clean — Electric Blue primary, neutral grays | Earth tones, muted palettes, warm creams |
| **Typography** | Italic serif for copilot voice, geometric sans for UI/data | All-serif (newspaper) or all-sans (generic SaaS) |
| **Motion** | Subtle, purposeful (data transitions, micro-feedback) | Bouncy animations, parallax, confetti |
| **Charts** | Clean, vibrant palette, readable with context | 3D charts, excessive decoration, muted colors |

**Inspiration references:** Linear (product craft), Mercury (banking clarity), Vercel (developer confidence), Stripe Dashboard (data density), Arc Browser (copilot patterns).

### The Two-Persona Problem

The design system must serve two users who live in the **same household**:

| | The Household CFO | The Reluctant Partner |
|---|---|---|
| **Engagement** | Daily/weekly, proactive | Monthly, prompted by CFO |
| **Needs** | Precision, density, speed | "Are we okay?", clarity, calm |
| **Frustrated by** | Too much padding, hidden data, scrolling | Walls of data, jargon, complexity |
| **Design answer** | Terminal View (density toggle) | Feed View (default) |

This is solved via the **Density Toggle** (see Section 4.1).

---

## 1.5 Logo Mark — "The Pure Typeset ƒ"

### Primary Mark

The Fyrk logo is built from a single typographic element: the **italic ƒ character** set in Instrument Serif italic.

- **Mark:** Instrument Serif italic `ƒ` character
- **Wordmark:** "fyrk" set in DM Sans weight 600
- **Lockup:** ƒ mark + wordmark, horizontally aligned with optical baseline alignment

### Usage Rules

- **Clear space:** Minimum 1× the height of the ƒ character on all sides
- **Monochrome only:** `#111111` on light backgrounds, `#f0f0f0` on dark backgrounds
- **Minimum size:** 16px for the ƒ mark
- **No effects:** No drop shadows, gradients, outlines, or 3D treatments on the mark
- **Background:** Always place on solid backgrounds — never on photos or busy patterns

### Lockup Variants

| Variant | Usage |
|---|---|
| **ƒ mark only** | App icon, favicon, compact spaces |
| **ƒ + wordmark** | Navigation, marketing, documentation |
| **Wordmark only** | Legal footers, dense UI contexts |

---

## 2. Design Tokens

### 2.1 Color Palette

```css
:root {
  /* ── Backgrounds & Surfaces ── */
  --co-bg-app:            #fafafa;   /* Neutral off-white base */
  --co-bg-surface:        #ffffff;   /* Pure white — elevated cards */
  --co-bg-surface-strong: #ffffff;   /* Strong surface */
  --co-bg-hover:          #f0f0f0;   /* Hover/selected state */
  --co-bg-subtle:         #f5f5f5;   /* Between app and hover */
  --co-bg-inset:          #e8e8e8;   /* Inset/recessed areas */

  /* ── Typography ── */
  --co-text-primary:   #111111;  /* Near-black — headings, primary figures */
  --co-text-secondary: #666666;  /* Medium gray — metadata, labels */
  --co-text-muted:     #999999;  /* Light gray — placeholder, disabled */

  /* ── Brand & Semantic ── */
  --co-brand-primary:  #0066ff;  /* Electric Blue — links, primary actions */
  --co-brand-light:    #3384ff;  /* Lighter blue — hover states */
  --co-brand-accent:   #f5a623;  /* Amber — accent highlights */
  --co-status-up:      #00a866;  /* Green — growth, positive change */
  --co-status-up-bg:   #e6f9ef;  /* Green background */
  --co-status-down:    #e03e3e;  /* Red — warnings, liabilities */
  --co-status-down-bg: #fde8e8;  /* Red background */
  --co-info:           #6b7280;  /* Cool gray — informational, neutral */
  --co-info-bg:        #f0f1f3;  /* Info background */
  --co-status-warning:    #f5a623;  /* Amber — warnings */
  --co-status-warning-bg: #fef6e6;  /* Warning background */

  /* ── Data Visualization (6-color palette) ── */
  --co-chart-1: #0066ff;        /* Electric Blue */
  --co-chart-2: #00a866;        /* Green */
  --co-chart-3: #f5a623;        /* Amber */
  --co-chart-4: #a855f7;        /* Purple */
  --co-chart-5: #e03e3e;        /* Red */
  --co-chart-6: #6b7280;        /* Cool Gray */

  /* ── Borders & Elevation ── */
  --co-border:         #e5e5e5;  /* Soft gray — primary border */
  --co-border-strong:  #cccccc;  /* Stronger border for emphasis */
  --co-border-soft:    #f0f0f0;  /* Subtle border */
  --co-shadow-soft:    0 18px 36px rgb(0 0 0 / 5%);
  --co-shadow-raised:  0 24px 48px rgb(0 0 0 / 8%);

  /* ── Focus & Interaction ── */
  --co-focus-ring:        #0066ff;
  --co-focus-ring-offset: 3px;
  --co-shadow-focus:      0 0 0 1px rgb(255 255 255 / 94%), 0 0 0 4px rgb(0 102 255 / 24%);
}
```

### High-Contrast Dark Mode

Dark mode uses pure neutral grays — clean and modern, not warm.

```css
[data-theme="dark"] {
  /* ── Backgrounds ── */
  --co-bg-app:            #111111;   /* Near-black base */
  --co-bg-surface:        #1a1a1a;   /* Elevated surface */
  --co-bg-surface-strong: #222222;   /* Strong surface */
  --co-bg-hover:          #2a2a2a;   /* Hover state */
  --co-bg-subtle:         #161616;   /* Subtle background */
  --co-bg-inset:          #0d0d0d;   /* Inset/recessed */

  /* ── Typography ── */
  --co-text-primary:   #f0f0f0;  /* Near-white */
  --co-text-secondary: #a0a0a0;  /* Medium gray */
  --co-text-muted:     #666666;  /* Muted gray */

  /* ── Brand (brightened for dark bg) ── */
  --co-brand-primary:  #4d94ff;  /* Lighter blue for readability */
  --co-brand-light:    #6ba6ff;
  --co-brand-accent:   #ffb84d;  /* Brightened amber */
  --co-status-up:      #33cc80;  /* Brightened green */
  --co-status-up-bg:   #112a1a;
  --co-status-down:    #ff6b6b;  /* Brightened red */
  --co-status-down-bg: #2a1515;
  --co-info:           #9ca3af;
  --co-info-bg:        #1a1d23;
  --co-status-warning:    #ffb84d;
  --co-status-warning-bg: #2a2010;

  /* ── Borders ── */
  --co-border:         #2a2a2a;
  --co-border-strong:  #3a3a3a;
  --co-border-soft:    #222222;
  --co-shadow-soft:    0 20px 40px rgb(0 0 0 / 28%);
  --co-shadow-raised:  0 28px 56px rgb(0 0 0 / 36%);

  /* ── Focus ── */
  --co-focus-ring:     #4d94ff;
  --co-shadow-focus:   0 0 0 1px rgb(17 17 17 / 92%), 0 0 0 4px rgb(77 148 255 / 28%);
}
```

**Default mode: Light.** Dark mode supported as user preference. Rule: chart colors remain the same in both modes, with opacity adjustments on backgrounds only.

### 2.2 Typography System

Typography establishes intelligence and clarity. The key innovation: **italic serif for copilot voice, geometric sans for data**.

```css
:root {
  /* ── Font Families ── */

  /* Copilot/editorial — the AI "intelligence layer" of the app */
  --font-narrative: 'Instrument Serif', ui-serif, Georgia, serif;

  /* UI, data, and controls — the "precision layer" */
  --font-data: 'DM Sans', ui-sans-serif, system-ui, -apple-system, sans-serif;

  /* Financial figures in CFO/Terminal mode (optional density toggle) */
  --font-mono: 'IBM Plex Mono', 'Source Code Pro', ui-monospace, monospace;

  /* ── Scale ── */
  --text-xs:    0.75rem;    /* 12px */
  --text-sm:    0.875rem;   /* 14px */
  --text-base:  1rem;       /* 16px */
  --text-lg:    1.125rem;   /* 18px */
  --text-xl:    1.375rem;   /* 22px */
  --text-2xl:   1.75rem;    /* 28px */
  --text-3xl:   2.125rem;   /* 34px */
  --text-4xl:   clamp(2.5rem, 5vw, 3.5rem);

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

The serif font (`--font-narrative`) is strictly limited to the **copilot/intelligence layer**:

| Instrument Serif italic allowed | Serif forbidden |
|---|---|
| AI-generated narratives and insights | Dashboard metrics & numbers |
| Life Event Playbook introductions | Balance Sheet data |
| Quarterly Review copilot letter | Account lists & tables |
| Proposal discussion thread text | Settings, forms, inputs |
| Copilot voice on editorial screens | Navigation, buttons, labels |
| Financial Timeline narrative snippets | Chart axes and legends |

All numerical values must use `--font-data` with the `font-variant-numeric: tabular-nums` CSS property so decimal places and amounts align perfectly in tables and the Balance Sheet.

In **Terminal/CFO Mode** (density toggle active), financial figures switch to `--font-mono` for maximum data-density readability.

### Font sourcing

| Font | Source | License | Notes |
|---|---|---|---|
| DM Sans | Google Fonts | Free / OFL | Loaded via next/font/google |
| Instrument Serif | Google Fonts | Free / OFL | Italic only — copilot voice |
| IBM Plex Mono | Google Fonts | Free / OFL | Terminal mode only |

### 2.3 Spacing & Form

```css
:root {
  /* ── 8px Base Grid ── */
  --space-xs:  4px;
  --space-sm:  8px;
  --space-md:  16px;
  --space-lg:  24px;
  --space-xl:  36px;
  --space-2xl: 48px;
  --space-3xl: 72px;
  --space-4xl: 96px;

  /* ── Border Radius ── */
  --radius-sm:   10px;   /* Badges, tags, inputs */
  --radius-md:   16px;   /* Standard cards, timeline events */
  --radius-lg:   24px;   /* Major sections, modals */
  --radius-full: 9999px; /* Pills, avatars */
}
```

**Elevation philosophy:** border-first, not shadow-first.
- Use `1px solid var(--co-border)` as the **primary** way to define card edges
- Reserve `var(--co-shadow-soft)` for hover states and elevated interactive elements only
- Never use dark, sharp drop shadows

---

## 3. Layout System

### App Layout (authenticated)

```
┌─────────────────────────────────────────────────────────────────────┐
│  Icon Rail (64px) │  Feed (flex)                │  Context (380px)  │
│                   │                              │  (future P4)      │
│  ƒ logo           │  Main Content Area           │                   │
│  ──────           │  (max-width: 1200px)         │  AI insights      │
│  Dashboard        │  bg: var(--co-bg-app)        │  Quick actions    │
│  Balance Sheet    │                              │  Contextual help  │
│  Timeline         │  Cards: var(--co-bg-surface) │                   │
│  Events           │  with 1px var(--co-border)   │                   │
│  Review           │                              │                   │
│  Fitness          │                              │                   │
│  Proposals        │                              │                   │
│  ──────           │                              │                   │
│  Household        │                              │                   │
│  Settings         │                              │                   │
└───────────────────┴──────────────────────────────┴───────────────────┘
```

### Icon Rail Navigation (64px)

The sidebar is a compact 64px icon rail with tooltip labels on hover:

- Icon style: 20px line icons, `--co-text-secondary` default
- Active state: `--co-brand-primary` icon color with `--co-bg-hover` pill background
- Hover: `--co-bg-hover` pill background
- Text labels visible on hover (tooltip) or in expanded mode (tablet+)

### Responsive breakpoints

| Breakpoint | Width | Layout change |
|---|---|---|
| **Desktop** | ≥1280px | Icon rail + feed + context panel |
| **Tablet** | 768–1279px | Icon rail + feed (context panel hidden) |
| **Mobile** | <768px | Bottom tab navigation, no rail |

---

## 4. Component Specifications

### 4.0 Command Bar (⌘K)

A global command palette accessible via `⌘K` (macOS) or `Ctrl+K` (Windows/Linux):

```
┌──────────────────────────────────────────┐
│  🔍 Search or type a command...          │
│──────────────────────────────────────────│
│  RECENT                                  │
│  → Balance Sheet                         │
│  → Q4 2025 Review                        │
│  NAVIGATION                              │
│  → Go to Dashboard                       │
│  → Go to Timeline                        │
│  ACTIONS                                 │
│  → Create Proposal                       │
│  → Start Life Event                      │
│  → Generate Quarterly Review             │
└──────────────────────────────────────────┘
```

- Background: `--co-bg-surface` with `--co-shadow-raised`
- Border: `1px solid var(--co-border)`
- Border radius: `--radius-lg`
- Input: DM Sans, `--text-lg`, no border
- Results: grouped by category, keyboard navigable
- Backdrop: `rgba(17, 17, 17, 0.4)`

### 4.1 The Density Toggle (Key Innovation)

The UI supports two density modes, toggled by the user:

**State A: Feed View (Default)**
- High whitespace, `--text-base` / `--text-lg` for body text
- Cards with `--radius-md`, generous padding (`--space-lg`)
- Net Worth and Fitness Score prominent
- AI narratives displayed inline in Instrument Serif italic
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
  mode: 'feed' | 'terminal'
}

// Applied via data attribute on root layout
// <body data-density="feed"> or <body data-density="terminal">

// CSS adjusts spacing, font sizes, and layout via attribute selectors
// [data-density="terminal"] .card { padding: var(--space-sm); }
// [data-density="terminal"] .amount { font-family: var(--font-mono); }
```

Toggle location: top-right of main content area, next to dark mode toggle. Icon: grid/list view toggle.

### 4.2 Base Components (shadcn/ui, customized)

All shadcn/ui components customized to 10x Financial Copilot tokens:

- **Button:** Sizes: `sm` (32px), `md` (40px), `lg` (48px). Primary variant uses `--co-brand-primary` (Electric Blue). Destructive uses `--co-status-down`. Border radius: `--radius-sm`.
- **Card:** Border: `1px solid var(--co-border)`. Border radius: `--radius-md`. Background: `--co-bg-surface`. No shadow by default; `--co-shadow-soft` on hover.
- **Input:** Height 40px, `--radius-sm`, border `--co-border`. Focus ring: `--co-focus-ring` with 3px offset.
- **Dialog/Modal:** Centered, max-width 560px, `--radius-lg`, backdrop with `rgba(17, 17, 17, 0.4)`.
- **Toast:** Bottom-right, auto-dismiss 5s. Success uses green border (`--co-status-up`), error uses red border (`--co-status-down`).

### 4.3 Domain Components

#### AmountDisplay

```typescript
interface AmountDisplayProps {
  amount: number           // minor units (öre)
  currency: string         // ISO 4217
  showSign?: boolean       // +/- prefix
  colorize?: boolean       // Green positive, Red negative
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
- Color gradient uses semantic colors:
  0–300:   var(--co-status-down)  Red
  300–500: var(--co-brand-accent) Amber
  500–700: var(--co-info)         Cool Gray
  700–1000: var(--co-status-up)   Green
- Label below: "Financial Fitness" in --font-data
- Trend arrow: up/down with delta value
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
- A continuous, thin (2px), vertical line in var(--co-info) (Cool Gray)
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
  - Narrative snippet: --font-narrative (Instrument Serif italic), --co-text-secondary
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
  Pending → Amber background (--co-brand-accent) with --co-text-primary text
  Approved → Green background (--co-status-up)
  Rejected → Red background (--co-status-down)
- Title: --font-data semibold
- Description: --font-data regular
- Discussion thread: --font-narrative for comment content (copilot layer)
- Impact analysis section (collapsible): data in --font-data
- Action buttons: Electric Blue primary, outline secondary
```

#### AccountCard

```
Design: Horizontal card with provider identity
- 1px --co-border, --radius-md, --co-bg-surface
- Provider logo (left, 32x32, --radius-sm)
- Account name (--font-data semibold) + wrapper badge (ISK/KF/Depa)
  - Badge: --radius-sm, --co-bg-hover background, --text-xs
- Total value (right, large, --font-data tabular-nums)
  - Terminal mode: --font-mono
- Holdings count + last synced (--text-xs, --co-text-muted)
- Owner avatar (if household view, not own account)
- Privacy indicator: lock icon if amount_hidden or private
- Hover: --co-shadow-soft + border shifts to --co-border-strong
```

#### NetWorthTrend

```
Design: Area chart
- Line: var(--co-brand-primary) (Electric Blue)
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
│ Good morning, Isac · Andersson Household    [⊞/≡] │  <- density toggle
├────────────────────────────────────────────────────┤
│                                                    │
│ ┌──────────────────┐ ┌──────────────────────────┐ │
│ │  NET WORTH        │ │  FINANCIAL FITNESS        │ │
│ │  2 430 000 SEK    │ │      ┌──────┐             │ │
│ │  +12 400 (+0.5%)  │ │      │ 720  │             │ │
│ │  this week        │ │      └──────┘             │ │
│ │  [Net worth chart]│ │  +20 from last month      │ │
│ └──────────────────┘ └──────────────────────────┘ │
│                                                    │
│ ┌──────────────────────────────────────────────┐   │
│ │  COPILOT INSIGHTS                            │   │
│ │  ─────────────────                           │   │
│ │  "Your household net worth grew by 12,400    │   │  <- Instrument Serif italic
│ │   SEK as Nordic markets continued their      │   │
│ │   steady climb. Your Avanza ISK..."          │   │
│ │                                              │   │
│ │   - ISK Avanza up 2.3%               [sans]  │   │  <- DM Sans
│ │   - Mortgage fixed rate expires in 8 months  │   │
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
│ │  RECENT TIMELINE                             │   │
│ │  [Latest 5 timeline entries...]              │   │
│ │  → View full timeline                        │   │
│ └──────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────┘
```

### Balance Sheet

```
┌────────────────────────────────────────────────────┐
│ Household Balance Sheet          as of Mar 20, 2026│
├────────────────────────────────────────────────────┤
│                                                    │
│  NET WORTH: 2 430 000 SEK                   [⊞/≡] │  <- density toggle
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
│  FEED VIEW:                  TERMINAL VIEW:        │
│  ┌──────────────────────┐     ┌──────────────────┐│
│  │ ISK Avanza           │     │ ISK Avanza 350K  ││
│  │    350 000 SEK        │     │ KF Nordnet  180K ││
│  │    5 holdings · +2.3% │     │ SEB Savings 450K ││
│  │    Updated today      │     │ PPM         380K ││
│  └──────────────────────┘     │ Skandia     220K ││
│  ┌──────────────────────┐     │ Mortgage   -420K ││
│  │ KF Nordnet            │     └──────────────────┘│
│  │    180 000 SEK        │                          │
│  └──────────────────────┘                          │
│                                                    │
│ Data quality: 85% · 1 account stale                │
└────────────────────────────────────────────────────┘
```

### Financial Timeline

```
┌────────────────────────────────────────────────────┐
│ Financial Timeline          [Filter] [+ Add]       │
├────────────────────────────────────────────────────┤
│                                                    │
│  FUTURE ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌ (dotted line)  │
│     ╎                                              │
│     ╎  Sep 2026 · Summer house (goal)              │
│     ╎     Target: 500 000 SEK                      │
│     ╎                                              │
│  ── TODAY ──────────────────────────                │
│     │                                              │
│  Feb ●  Q4 2025 Review · Score: 720 (+20)          │  <- large dot (human)
│  20  │     "Strong quarter..."  [serif italic]      │
│     │                                              │
│  Feb ●  Reviewed insurance coverage                 │  <- large dot (human)
│  12  │     "We decided to increase..."  [serif]     │
│     │                                              │
│  Jan ●  Apartment Search Started                    │  <- large dot + icon
│  15  │     Life Event active                        │
│     │     Budget: 3 500 000 SEK · Q3 2026          │
│     │     Playbook: 8/12 actions complete           │
│     │                                              │
│  Dec ·  Auto: Dividend received (Investor AB)       │  <- small dot (auto)
│  18  │  +2 340 SEK                                  │
│     │                                              │
│  Dec ●  Fitness: Crossed 700                        │  <- milestone dot + glow
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
| Modal open | Fade backdrop + scale 0.97→1 | 200ms | ease-out |
| Skeleton loading | Shimmer pulse on `--co-bg-hover` | 1500ms loop | linear |
| Density toggle | Cross-fade between states | 300ms | ease-in-out |
| Command bar open | Fade + scale 0.98→1 | 150ms | ease-out |

All animations respect `prefers-reduced-motion: reduce` — instantly apply final state, no transitions.

---

## 7. Empty States & Loading

### Empty states

Every screen has a designed empty state:
1. **Icon** (subtle, single-color in `--co-text-muted`, not cartoon)
2. **Title** in `--font-data` semibold
3. **Description** in `--font-data` regular, `--co-text-secondary`
4. **Primary action** button (Electric Blue)

Example (Balance Sheet, no accounts):
```
  Your Household Balance Sheet
  Add your first financial account to see your
  complete financial picture in one place.

  [+ Add Account]     [Import from CSV]
```

### Loading states

- **Page-level:** Skeleton matching target layout — card shapes in `--co-bg-hover` with shimmer
- **Component-level:** Pulse shimmer on individual cards/charts
- **AI generation:** Instrument Serif italic progress message: *"Writing your quarterly review..."* with estimated time
- **Never a blank white screen** — always show structure immediately

---

## 8. Accessibility (WCAG 2.1 AA)

| Requirement | Implementation |
|---|---|
| Color contrast | 4.5:1 minimum. Verified: `--co-text-primary` (#111111) on `--co-bg-app` (#fafafa) = 17.4:1; `--co-text-secondary` (#666666) on `--co-bg-surface` (#ffffff) = 5.7:1 |
| Focus indicators | `--co-shadow-focus` ring in Electric Blue with 3px offset. Visible on both light and dark |
| Keyboard navigation | All features accessible via keyboard; logical tab order; Command Bar (⌘K) for quick navigation |
| Screen reader labels | All icons have `aria-label`; charts have text summary alternatives |
| Reduced motion | Respect `prefers-reduced-motion`; all animations disabled |
| Touch targets | Minimum 44x44px on mobile |
| Color-blind safety | Chart palette tested for deuteranopia/protanopia; shapes + patterns available as fallback |

---

## 9. Figma Export Strategy

All tokens structured for Figma import:

1. **Color tokens** → Figma Variables (modes: Light / Dark)
2. **Typography** → Figma Text Styles (Instrument Serif copilot, DM Sans data, IBM Plex Mono terminal)
3. **Spacing** → Auto Layout values from 8px grid
4. **Borders & shadows** → Figma Effect Styles
5. **Radii** → Figma Variables (10px / 16px / 24px)

### Component naming convention

```
components/
  primitives/
    Button / Primary / Large
    Button / Secondary / Medium
    Input / Default
    Input / Error
    Card / Feed Density
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
    AccountCard / Feed
    AccountCard / Terminal Row
    ProposalCard / Pending
    ProposalCard / Approved
    DensityToggle / Feed Active
    DensityToggle / Terminal Active
    CommandBar / Default
    CommandBar / With Results
  layout/
    IconRail / Default
    IconRail / With Tooltip
    Topbar / Default
    ContextPanel / Default (future)
    PageHeader / With Density Toggle
```

---

## 10. Mobile App Considerations (React Native, Future)

| Web | React Native equivalent |
|---|---|
| CSS variables | Theme objects (same token values, same neutral palette) |
| shadcn/ui | React Native Paper or custom components |
| Recharts | `react-native-svg-charts` or `victory-native` |
| Icon rail nav | Bottom tab navigation (5 tabs max) |
| Tailwind + density toggle | NativeWind with context-based density |
| Google Fonts (Instrument Serif, DM Sans) | Self-bundled via `expo-font` |

**Mobile-specific:**
- Density toggle → mobile defaults to Feed View; Terminal unavailable (screen too small)
- Simplified dashboard (vertically stacked metric cards)
- Swipe-able timeline
- Push notifications for proposals + reviews
- Biometric auth (FaceID / fingerprint)
- Command Bar replaced with search screen
