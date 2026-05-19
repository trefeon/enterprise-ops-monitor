# Enterprise Operations Monitor — Design System
**Version:** 1.0.0  
**Stack:** React + Tailwind CSS v4 + shadcn/ui  
**Theme:** Dark-only (no light mode toggle)  
**Purpose:** Portfolio-grade enterprise ops dashboard — Planet Ban internal tooling, rebranded with dummy data

---

## 1. Design Philosophy

This system follows **Industrial Clarity** — the aesthetic of mission-critical infrastructure tools. Think Datadog, Grafana, Linear. Not consumer SaaS. Not a startup landing page.

### Core Principles
- **Depth over flatness** — elevation via surface brightness, not shadows alone
- **Systematic green** — the accent color bleeds into every interactive state, not just badges
- **Typography that earns attention** — monospace for data/labels, sans-serif for prose
- **No decoration for decoration's sake** — every visual element is either functional or contextual
- **Density without clutter** — enterprise users read dashboards fast, reward their scan patterns

---

## 2. Color System

All colors defined as CSS variables. No hardcoded hex anywhere in components.

### Base Palette (CSS Variables)

```css
:root {
  /* === BACKGROUNDS === */
  --bg-base:       #0b0c0e;   /* Page background — NOT pure black */
  --bg-surface:    #111316;   /* Cards, panels, sidebar */
  --bg-elevated:   #181b1f;   /* Dropdowns, modals, tooltips */
  --bg-input:      #14171b;   /* Form inputs, selects */
  --bg-hover:      #1e2126;   /* Row hover, item hover */

  /* === BORDERS === */
  --border-subtle:  rgba(255, 255, 255, 0.06);   /* Default card borders */
  --border-default: rgba(255, 255, 255, 0.10);   /* Input borders, dividers */
  --border-strong:  rgba(255, 255, 255, 0.18);   /* Active/focused borders */
  --border-accent:  rgba(74, 222, 128, 0.40);    /* Focus ring — green tint */

  /* === TEXT === */
  --text-primary:   #f0f2f5;   /* Headings, primary labels */
  --text-secondary: #8b919a;   /* Supporting text, descriptions */
  --text-muted:     #50555e;   /* Timestamps, metadata, placeholders */
  --text-disabled:  #383c42;   /* Disabled state text */
  --text-inverse:   #0b0c0e;   /* Text on light/green backgrounds */

  /* === ACCENT — PRIMARY GREEN === */
  --accent:         #4ade80;   /* Primary CTA, active indicators */
  --accent-dim:     #22c55e;   /* Hover state for accent elements */
  --accent-muted:   rgba(74, 222, 128, 0.12);  /* Subtle green backgrounds */
  --accent-glow:    rgba(74, 222, 128, 0.20);  /* Focus glow, ring */

  /* === SEMANTIC COLORS === */
  --color-success:  #4ade80;   /* Same as accent — operational */
  --color-warning:  #fbbf24;   /* Degraded, pending */
  --color-danger:   #f87171;   /* Error, offline, critical */
  --color-info:     #60a5fa;   /* Info states, links */
  --color-neutral:  #6b7280;   /* Unknown/inactive states */

  /* Semantic backgrounds (badge/chip fills) */
  --bg-success: rgba(74, 222, 128, 0.10);
  --bg-warning: rgba(251, 191, 36, 0.10);
  --bg-danger:  rgba(248, 113, 113, 0.10);
  --bg-info:    rgba(96, 165, 250, 0.10);

  /* === CHART PALETTE (for data viz) === */
  --chart-1: #4ade80;   /* Green  */
  --chart-2: #60a5fa;   /* Blue   */
  --chart-3: #fbbf24;   /* Amber  */
  --chart-4: #a78bfa;   /* Purple */
  --chart-5: #f87171;   /* Red    */
}
```

### Color Usage Rules

| Use Case | Token |
|---|---|
| Page background | `--bg-base` |
| Sidebar, nav panel | `--bg-surface` |
| Content cards | `--bg-surface` with `--border-subtle` border |
| Modal, dropdown | `--bg-elevated` |
| Text input background | `--bg-input` |
| Primary CTA button | `--accent` bg, `--text-inverse` text |
| Ghost/secondary button | `--bg-hover` bg, `--text-primary` text |
| Active nav item | `--accent-muted` bg, `--accent` text |
| Status badge — OK | `--bg-success` bg, `--color-success` text |
| Status badge — WARN | `--bg-warning` bg, `--color-warning` text |
| Status badge — ERROR | `--bg-danger` bg, `--color-danger` text |
| Input focus ring | `1px solid --border-accent` + `0 0 0 3px --accent-glow` |

**Rule:** Never use raw `#000000` as a background. Use `--bg-base`.  
**Rule:** Never use raw `#ffffff` for text. Use `--text-primary`.  
**Rule:** Every interactive element must change visually on hover AND focus.

---

## 3. Typography

### Font Stack

```css
/* Display font — branding, hero headings, app name */
--font-display: 'DM Sans', sans-serif;

/* Body font — UI text, descriptions, prose */
--font-body: 'Geist', 'DM Sans', sans-serif;

/* Mono font — data values, IDs, code, labels, metrics */
--font-mono: 'Geist Mono', 'JetBrains Mono', monospace;
```

Load via Google Fonts or Fontsource:
```html
<!-- In index.html -->
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
```
Install Geist via npm: `npm install geist`

### Type Scale

| Role | Size | Weight | Font | Color | Usage |
|---|---|---|---|---|---|
| `display-xl` | 48px / 3rem | 700 | Display | `--text-primary` | Login page hero |
| `display-lg` | 32px / 2rem | 700 | Display | `--text-primary` | Page titles |
| `heading-lg` | 24px / 1.5rem | 600 | Display | `--text-primary` | Section headers |
| `heading-md` | 18px / 1.125rem | 600 | Display | `--text-primary` | Card titles, widget headers |
| `heading-sm` | 14px / 0.875rem | 600 | Body | `--text-primary` | Column headers, group labels |
| `body-lg` | 16px / 1rem | 400 | Body | `--text-primary` | Main content text |
| `body-md` | 14px / 0.875rem | 400 | Body | `--text-secondary` | Descriptions, subtitles |
| `body-sm` | 12px / 0.75rem | 400 | Body | `--text-muted` | Metadata, timestamps |
| `label` | 11px / 0.6875rem | 600 | Body | `--text-muted` | Form labels, section labels (UPPERCASE, letter-spacing: 0.08em) |
| `data-lg` | 28px / 1.75rem | 700 | Mono | `--text-primary` | KPI values, big numbers |
| `data-md` | 16px / 1rem | 600 | Mono | `--text-primary` | Table values, IDs |
| `data-sm` | 12px / 0.75rem | 500 | Mono | `--text-secondary` | Timestamps, version strings |
| `code` | 13px / 0.8125rem | 400 | Mono | `--text-secondary` | Code snippets, terminal |

### Typography Rules

- Form labels, section titles (like "IDENTITY", "SECURITY KEY") → `label` style: **11px, 600 weight, uppercase, 0.08em tracking**
- Metric values (store counts, uptime %) → `data-lg` in `--font-mono` 
- Timestamps, version strings → `data-sm` in `--font-mono`
- Never mix display font into data-heavy components — keep data in mono
- Line height: headings `1.2`, body `1.6`, mono `1.4`

---

## 4. Spacing Scale

Base unit: `4px`. All spacing must be multiples of this.

```
xs:  4px   (0.25rem)
sm:  8px   (0.5rem)
md:  12px  (0.75rem)
lg:  16px  (1rem)
xl:  24px  (1.5rem)
2xl: 32px  (2rem)
3xl: 48px  (3rem)
4xl: 64px  (4rem)
5xl: 96px  (6rem)
```

### Layout Spacing Guidelines

| Area | Padding |
|---|---|
| Page container | `px-6 py-6` (24px) |
| Card internal | `p-5` (20px) or `p-6` (24px) |
| Form fields gap | `gap-4` (16px) |
| Section gap | `gap-6` (24px) |
| Sidebar item | `px-3 py-2` (12px/8px) |
| Table cell | `px-4 py-3` (16px/12px) |
| Badge/chip | `px-2 py-0.5` (8px/2px) |
| Button (default) | `px-4 py-2` (16px/8px) |
| Button (lg) | `px-6 py-3` (24px/12px) |

---

## 5. Border Radius Scale

```css
--radius-xs:  4px   /* Badges, chips, tags */
--radius-sm:  6px   /* Inputs, small buttons */
--radius-md:  8px   /* Buttons (default), dropdowns */
--radius-lg:  10px  /* Cards, panels */
--radius-xl:  12px  /* Modals, login card */
--radius-2xl: 16px  /* Large panels */
--radius-full: 9999px /* Pill badges, avatar */
```

**Rule:** Cards and panels → `--radius-lg` (10px).  
**Rule:** Inputs → `--radius-sm` (6px).  
**Rule:** Buttons → `--radius-md` (8px).  
**Rule:** Status badges/chips → `--radius-xs` (4px).

---

## 6. Background Treatment

### Page Background

Do **not** use flat `#000000`. The page background must have visual texture:

```css
body {
  background-color: var(--bg-base); /* #0b0c0e */
  background-image:
    radial-gradient(ellipse 80% 50% at 50% -20%, rgba(74, 222, 128, 0.04) 0%, transparent 60%),
    url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.015'%3E%3Cpath d='M0 0h40v1H0zM0 0v40h1V0z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
}
```

This adds: (1) a subtle green radial glow at the top (brand anchor), (2) a 40px grid texture at 1.5% opacity.

### Sidebar Background

```css
.sidebar {
  background: linear-gradient(180deg, var(--bg-surface) 0%, #0f1215 100%);
  border-right: 1px solid var(--border-subtle);
}
```

### Card / Panel

```css
.card {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
}

/* Elevated variant — for login panel, modals */
.card-elevated {
  background: var(--bg-surface);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-xl);
  box-shadow:
    0 0 0 1px rgba(255,255,255,0.04) inset,
    0 20px 60px rgba(0, 0, 0, 0.4);
}
```

---

## 7. Component Specifications

### 7.1 Buttons

#### Primary (CTA)
```css
.btn-primary {
  background: var(--accent);
  color: var(--text-inverse);
  border: none;
  font-weight: 600;
  font-size: 14px;
  padding: 10px 20px;
  border-radius: var(--radius-md);
  transition: all 150ms ease;
}
.btn-primary:hover {
  background: var(--accent-dim);
  box-shadow: 0 0 16px var(--accent-glow);
}
.btn-primary:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--accent-glow);
}
```

#### Secondary / Ghost
```css
.btn-secondary {
  background: transparent;
  color: var(--text-primary);
  border: 1px solid var(--border-default);
  font-weight: 500;
  font-size: 14px;
  padding: 10px 20px;
  border-radius: var(--radius-md);
  transition: all 150ms ease;
}
.btn-secondary:hover {
  background: var(--bg-hover);
  border-color: var(--border-strong);
}
```

#### Danger
```css
.btn-danger {
  background: transparent;
  color: var(--color-danger);
  border: 1px solid rgba(248, 113, 113, 0.30);
}
.btn-danger:hover {
  background: rgba(248, 113, 113, 0.08);
  border-color: var(--color-danger);
}
```

**Icon inside button:** Always `gap-2` between icon and label. Icon size: `16px` / `size-4`.

---

### 7.2 Form Inputs

```css
.input {
  background: var(--bg-input);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-family: var(--font-body);
  font-size: 14px;
  padding: 10px 12px;
  width: 100%;
  transition: border-color 150ms ease, box-shadow 150ms ease;
}
.input::placeholder {
  color: var(--text-muted);
}
.input:hover {
  border-color: var(--border-strong);
}
.input:focus {
  outline: none;
  border-color: var(--border-accent);
  box-shadow: 0 0 0 3px var(--accent-glow);
}
```

**Form label style:**
```css
.form-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 8px;
}
```

---

### 7.3 Status Badges / Chips

```css
/* Base */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: var(--radius-xs);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

/* Dot indicator */
.badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

/* Variants */
.badge-success { background: var(--bg-success); color: var(--color-success); }
.badge-warning { background: var(--bg-warning); color: var(--color-warning); }
.badge-danger  { background: var(--bg-danger);  color: var(--color-danger);  }
.badge-info    { background: var(--bg-info);    color: var(--color-info);    }
.badge-neutral { background: rgba(107,114,128,0.12); color: var(--color-neutral); }
```

**Animated pulse for live/operational badges:**
```css
.badge-live .badge-dot::after {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: 50%;
  background: var(--color-success);
  animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
@keyframes pulse-ring {
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50%       { opacity: 0;   transform: scale(2.5); }
}
```

---

### 7.4 Sidebar Navigation

```css
/* Sidebar container */
.sidebar {
  width: 240px;
  min-height: 100vh;
  background: linear-gradient(180deg, var(--bg-surface) 0%, #0f1215 100%);
  border-right: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  padding: 16px 8px;
}

/* Nav item */
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  font-size: 13.5px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 150ms ease;
  margin-bottom: 2px;
}
.nav-item:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}
.nav-item.active {
  background: var(--accent-muted);
  color: var(--accent);
  font-weight: 600;
}
.nav-item.active .nav-icon {
  color: var(--accent);
}
```

**Nav section label:**
```css
.nav-section-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-disabled);
  padding: 16px 12px 6px;
}
```

---

### 7.5 Data Tables

```css
.table-wrapper {
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.table {
  width: 100%;
  border-collapse: collapse;
}
.table thead th {
  background: var(--bg-elevated);
  padding: 10px 16px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
  text-align: left;
  border-bottom: 1px solid var(--border-subtle);
}
.table tbody tr {
  border-bottom: 1px solid var(--border-subtle);
  transition: background 100ms ease;
}
.table tbody tr:last-child { border-bottom: none; }
.table tbody tr:hover { background: var(--bg-hover); }
.table tbody td {
  padding: 12px 16px;
  font-size: 13.5px;
  color: var(--text-primary);
}
/* Mono values in table cells */
.table .cell-mono {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-secondary);
}
```

---

### 7.6 KPI / Metric Cards

```css
.metric-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 20px;
}
.metric-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 8px;
}
.metric-value {
  font-family: var(--font-mono);
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.1;
}
.metric-delta {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 600;
  margin-top: 6px;
}
.metric-delta.positive { color: var(--color-success); }
.metric-delta.negative { color: var(--color-danger); }
```

---

### 7.7 Toast / Notification

```css
.toast {
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-left: 3px solid;       /* Colored per semantic */
  border-radius: var(--radius-md);
  padding: 12px 16px;
  min-width: 300px;
  max-width: 400px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
}
.toast-success { border-left-color: var(--color-success); }
.toast-warning { border-left-color: var(--color-warning); }
.toast-danger  { border-left-color: var(--color-danger);  }
.toast-info    { border-left-color: var(--color-info);    }
```

---

### 7.8 Modal / Dialog

```css
.modal-overlay {
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
}
.modal {
  background: var(--bg-surface);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-xl);
  box-shadow:
    0 0 0 1px rgba(255,255,255,0.04) inset,
    0 24px 80px rgba(0,0,0,0.6);
  padding: 24px;
  max-width: 520px;
  width: 100%;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}
.modal-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}
```

---

### 7.9 Dropdown / Select Menu

```css
.dropdown {
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  box-shadow: 0 8px 32px rgba(0,0,0,0.4);
  padding: 4px;
  min-width: 180px;
}
.dropdown-item {
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  font-size: 13.5px;
  color: var(--text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background 100ms ease;
}
.dropdown-item:hover { background: var(--bg-hover); }
.dropdown-item.active { color: var(--accent); }
.dropdown-separator {
  height: 1px;
  background: var(--border-subtle);
  margin: 4px 0;
}
```

---

## 8. Motion & Animation

### Principles
- **Purposeful, not decorative** — animate to communicate state change, not to impress
- **Fast interactions** — hover/focus transitions: `150ms ease`
- **Meaningful entrances** — page load / route change: `300–400ms ease-out`
- **Never animate layout shifts** — only opacity, transform, and color

### Transition Tokens

```css
--transition-fast:    150ms ease;          /* Hover, focus, active states */
--transition-normal:  250ms ease;          /* Panel open/close, accordion */
--transition-slow:    350ms ease-out;      /* Page entrance, modal appear */
--transition-spring:  400ms cubic-bezier(0.34, 1.56, 0.64, 1); /* Popovers, tooltips */
```

### Standard Entrance Animation

Apply to cards, modals, and content sections on mount:

```css
@keyframes fade-up {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-enter {
  animation: fade-up 300ms ease-out forwards;
}

/* Stagger children with delay */
.animate-enter:nth-child(1) { animation-delay: 0ms; }
.animate-enter:nth-child(2) { animation-delay: 60ms; }
.animate-enter:nth-child(3) { animation-delay: 120ms; }
.animate-enter:nth-child(4) { animation-delay: 180ms; }
```

### Sidebar Nav Transition

```css
.sidebar-link {
  transition:
    background var(--transition-fast),
    color var(--transition-fast),
    padding-left var(--transition-fast);
}
.sidebar-link.active {
  padding-left: 16px; /* subtle indent on active */
}
```

---

## 9. Layout System

### Overall Shell

```
┌─────────────────────────────────────────────┐
│  Topbar (48px fixed)  — optional            │
├──────────────┬──────────────────────────────┤
│              │                              │
│  Sidebar     │   Main Content Area          │
│  (240px)     │   (flex-1, overflow-y auto)  │
│              │                              │
│              │                              │
└──────────────┴──────────────────────────────┘
```

```css
.app-shell {
  display: flex;
  min-height: 100vh;
  background: var(--bg-base);
}
.main-content {
  flex: 1;
  min-width: 0;
  padding: 24px;
  overflow-y: auto;
}
```

### Content Grid

```css
/* Dashboard KPI row — 4 columns */
.grid-kpi {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

/* 2-column layout */
.grid-2col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

/* 3-column layout */
.grid-3col {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

/* Responsive breakpoints */
@media (max-width: 1280px) { .grid-kpi  { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 768px)  { .grid-kpi  { grid-template-columns: 1fr; } }
@media (max-width: 1024px) { .grid-2col { grid-template-columns: 1fr; } }
```

### Page Header Pattern

```
Page Title (heading-lg)
Subtitle (body-md, --text-secondary)           [Action Buttons]
──────────────────────────────────────────────────────────────
Content below
```

---

## 10. Login Page Specific

The login page is the **portfolio entry point** — it must impress in 3 seconds.

### Layout

- Full viewport, split 60/40 — hero left, form right
- Left side: vertically centered, generous padding
- Right side: form card centered vertically, max-width 440px

### Hero Side

```css
.login-hero {
  background:
    radial-gradient(ellipse 60% 60% at 30% 50%, rgba(74,222,128,0.06) 0%, transparent 70%),
    var(--bg-base);
  padding: 60px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
```

- **App name / logo** top-left: `DM Sans 700, 13px, uppercase, letter-spacing: 0.12em`
- **Hero headline** "Enterprise Monitor": `display-xl` (48px), `DM Sans 700`
- **Tagline**: `body-lg`, `--text-secondary`
- **Status badges** (Operational / Secure Hub): `badge-success` and `badge-neutral`
- **Footer**: `body-sm`, `--text-muted`, `--font-mono`

### Form Side

```css
.login-form-side {
  background: rgba(17, 19, 22, 0.95);
  border-left: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 60px 40px;
}
.login-card {
  width: 100%;
  max-width: 440px;
}
```

- **"Welcome Back"**: `heading-lg` (24px, 600)
- **Subtitle**: `body-md`, `--text-secondary`
- **Form labels**: `label` style (11px, uppercase, muted)
- **Inputs**: full-width, with icon prefix, green focus ring
- **Sign In button**: `btn-primary`, full-width, `btn-lg` size
- **Demo Account section**: card with `--bg-elevated` background, `--border-subtle` border
- **Version string**: `data-sm` in `--font-mono`, `--text-muted`

---

## 11. Iconography

Use **Lucide React** exclusively. Do not mix icon libraries.

```
npm install lucide-react
```

### Icon Size Standards

| Context | Size | Class |
|---|---|---|
| Sidebar nav icon | 16px | `size-4` |
| Button icon | 16px | `size-4` |
| Form input prefix icon | 14px | `size-3.5` |
| Status/badge icon | 12px | `size-3` |
| Page title icon | 20px | `size-5` |
| Empty state icon | 40px | `size-10` |
| Alert/toast icon | 16px | `size-4` |

**Rule:** Icon color always inherits from parent `color`. Never set a hardcoded color on an icon.  
**Rule:** Icons inside buttons use `size-4`. No margin utilities — use `gap-2` on the button.

---

## 12. Elevation Model

In dark UIs, elevation = surface brightness (not shadow size).

| Level | Surface | Token | Use |
|---|---|---|---|
| 0 | Page | `--bg-base` (#0b0c0e) | Body background |
| 1 | Panel | `--bg-surface` (#111316) | Sidebar, cards |
| 2 | Elevated | `--bg-elevated` (#181b1f) | Table headers, dropdowns |
| 3 | Floating | `--bg-elevated` + shadow | Modals, tooltips |
| 4 | Input | `--bg-input` (#14171b) | Form inputs |

**Key:** Higher elevation = lighter background. Never invert this.

---

## 13. Scrollbars

Style scrollbars to match the dark theme:

```css
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.10);
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.18);
}
```

---

## 14. Focus & Accessibility

- **Focus ring**: `box-shadow: 0 0 0 3px var(--accent-glow)` — never `outline: none` without a replacement
- **Contrast**: all text must meet WCAG AA (4.5:1 for body, 3:1 for large text)
- **Interactive targets**: minimum 36px touch target height
- **Reduced motion**: wrap entrance animations in `@media (prefers-reduced-motion: no-preference)`

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 15. Quick-Reference Checklist for AI Agent

Before generating any component, verify:

- [ ] Background uses `--bg-base`, `--bg-surface`, or `--bg-elevated` — never raw `#000` or `#fff`
- [ ] All colors reference CSS variables — no hardcoded hex in components
- [ ] Interactive elements (buttons, inputs, nav items) have hover + focus states
- [ ] Input focus uses `--border-accent` + `--accent-glow` glow
- [ ] Form labels are `11px / uppercase / 0.08em tracking / --text-muted`
- [ ] Data values (metrics, IDs, timestamps) use `--font-mono`
- [ ] Status badges use correct semantic token pair (bg + text)
- [ ] Spacing uses the 4px base scale
- [ ] Card border is `1px solid var(--border-subtle)`
- [ ] Lucide icons sized with `size-*` class, no manual `w-/h-` on icons inside components
- [ ] Page background has radial glow + grid texture applied on `body`
- [ ] Sign In / primary CTA button is `--accent` green, not white
- [ ] Sidebar active state uses `--accent-muted` background + `--accent` text
- [ ] All transitions use `--transition-fast` (150ms) for hover, `--transition-slow` for mount

---

## 16. Do Not Do List

| ❌ Don't | ✅ Do instead |
|---|---|
| `background: #000000` | `background: var(--bg-base)` |
| `color: #ffffff` | `color: var(--text-primary)` |
| `font-family: Inter, Arial` | `font-family: var(--font-body)` |
| Metric values in sans-serif | Use `var(--font-mono)` for all numbers |
| White Sign In button | `--accent` green primary button |
| Input without focus ring | Add `--border-accent` + `--accent-glow` on focus |
| Flat `#000` page background | `--bg-base` + radial glow + grid texture |
| `space-x-*` / `space-y-*` | `flex gap-*` |
| Multiple icon libraries | Lucide React only |
| Hard-coded `shadow-*` for elevation | Use surface brightness (elevation model above) |
| `border-radius: 50%` on non-avatars | Use `--radius-*` tokens |
| Green accent only on Operational badge | Green must also appear on: button, focus ring, active nav, input focus |

---

*End of design.md — v1.0.0*