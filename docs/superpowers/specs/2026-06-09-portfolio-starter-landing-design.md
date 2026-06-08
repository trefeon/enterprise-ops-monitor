# Portfolio Starter Landing Design

## Summary

Enterprise Ops Monitor becomes **Enterprise Ops Starter**: a portfolio-ready, reusable operations dashboard starter built from retail IT support experience and redesigned around simulated data.

The app gets a public portfolio landing page before login. The landing page explains the project, shows the product, links to the demo login, and frames the repo as a reusable starter. The protected dashboard stays dense, calm, and operational.

## Goals

- Add a public landing page at `/`.
- Move the current protected dashboard entry to `/app`.
- Keep `/login` as demo access.
- Present the project as a sanitized portfolio case study and reusable starter.
- Apply Kole Jain-inspired UI/UX rules from researched transcripts: product thinking, flow/state coverage, sidebar clarity, color layers, restrained motion, and professional presentation.

## Non-Goals

- No full backend rewrite.
- No removal of existing RBAC/auth behavior.
- No generic marketing homepage.
- No company-specific references or real workplace data.
- No decorative animation that does not clarify interaction.

## Route Design

| Route | Access | Purpose |
| --- | --- | --- |
| `/` | Public | Portfolio landing page |
| `/case-study` | Public | Deeper project story, architecture, tradeoffs |
| `/starter` | Public | Reuse guide for future projects |
| `/login` | Public | Demo login and manual login |
| `/app` | Protected | Current dashboard home |
| `/app/*` | Protected | Existing operations routes |

Existing links that currently target `/` as dashboard should target `/app` after routing changes.

## Landing Page Structure

### First Viewport

- Top nav: name/brand, Case Study, Starter Kit, GitHub, Demo.
- H1: `Enterprise Ops Starter`
- Supporting copy: production-style operations dashboard starter from retail IT support experience, sanitized with simulated data.
- Primary CTA: `Open Demo`
- Secondary CTA: `Read Case Study`
- Supporting CTA: `GitHub`
- Product visual: real dashboard screenshot or live preview-style frame, not abstract SVG art.
- Disclosure: `Simulated/anonymized data. No real company, customer, employee, or credential data.`

### Proof Section

Show capabilities as concrete product modules:

- Auth + RBAC
- EOD monitoring
- Store sync health
- Store and employee directories
- Backup and system health
- Exports
- Docker/Postgres API stack

### Case Study Section

Show project thinking:

- Problem: distributed branch operations need one operational view.
- Solution: authenticated dashboard with status, filters, exports, and admin controls.
- Architecture: React/Vite frontend, Express API, Postgres, Docker, seeded demo data.
- Tradeoffs: simulated data, stable route contracts, reusable base components, RBAC boundaries.

### Starter Kit Section

Explain reuse path:

- Replace domain copy/config.
- Add a module from existing page/table patterns.
- Seed simulated data.
- Add permissions and route guards.
- Run local, Docker, tests.

## Dashboard Rules

The protected app should feel like an internal operations product, not a landing page.

- Keep dense but readable information layout.
- Sidebar remains the product spine.
- Navigation labels stay short and grouped.
- Use Lucide icons consistently.
- Tables must support search/filter/sort where useful.
- Charts must prioritize readability over decoration.
- Every action needs visible feedback: loading, success, empty, error, disabled, active.

## Visual System Rules

### Color

- Use neutral layers for base, surface, elevated, input, hover.
- Use one main accent ramp instead of scattered accents.
- Use semantic colors for status: success, warning, danger, info.
- Build dark mode as its own palette; do not invert light mode.
- Reserve high-contrast text for primary information and actions.

### Typography

- Landing page can use larger type for narrative hierarchy.
- Dashboard type stays compact; avoid hero-scale headings inside app panels.
- Keep one primary sans-serif family.
- Keep labels, captions, and metadata visually distinct.

### Spacing And Layout

- Use consistent 4px/8px spacing rhythm.
- Keep app sections scan-friendly.
- Avoid nested cards.
- Cards should represent individual repeated items or framed tools, not whole page sections.

### Motion

- Use motion for feedback and progressive disclosure.
- Good cases: hover, press, loading, toast, drawer, modal, sidebar disclosure.
- Avoid scroll-jacking and decorative motion.
- Respect reduced motion behavior already provided by `BaseMotionProvider`.

## Sanitization Rules

- Remove or avoid real company names, internal hostnames, private deploy paths, and workplace-specific labels.
- Keep demo disclosure visible in public pages and docs.
- Keep `.env.example` values as placeholders.
- Keep seeded demo data generic.
- Do not include real store, employee, customer, credential, provider, or operational data.

## Implementation Boundaries

Frontend work should focus on:

- `apps/web/src/router/index.tsx` for public and protected route split.
- New public landing page under `apps/web/src/pages/Landing/`.
- Optional public case-study/starter pages under `apps/web/src/pages/CaseStudy/` and `apps/web/src/pages/Starter/`.
- Sidebar route updates in `apps/web/src/components/layout/Sidebar.tsx`.
- Link/copy updates in login/about/dashboard surfaces.
- Design token cleanup only where needed by landing.

Backend work should be limited to copy/config support if needed. API route contracts should remain stable.

## Research Sources

- Kole Jain transcript index: https://sozai.app/transcripts/channel/kole-jain/
- Product design mindset: https://sozai.app/transcript/stop-making-pretty-uis-think-product-designer/
- Dashboard UI: https://sozai.app/transcript/build-dashboard-ui-beginner-guide/
- Beginner mistakes: https://sozai.app/transcript/ui-ux-mistakes-beginner/
- UI/UX concepts: https://sozai.app/transcript/ui-ux-concepts-explained-10-minutes/
- Color system: https://sozai.app/transcript/60-30-10-rule-ruining-ui-designs/
- Color mistakes: https://sozai.app/transcript/7-color-mistakes-ruin-ui-designs/
- UI sections: https://sozai.app/transcript/formula-truly-captivating-ui-sections/
- SaaS UI mistakes: https://sozai.app/transcript/saas-ui-ux-mistakes-vibe-code/
- Micro animations: https://sozai.app/transcript/micro-animations-level-up-ui-free-figma/
- UI presentation: https://sozai.app/transcript/definitive-process-present-uis-pro/

## Acceptance Criteria

- Public `/` loads without auth and presents the project clearly in five seconds.
- `Open Demo` routes to `/login`.
- Logged-in dashboard starts at `/app`.
- Existing protected routes still work behind auth.
- No company/private data appears in landing copy or route labels.
- Landing page has responsive desktop/mobile layout.
- App UI keeps operational density and avoids marketing-style cards inside dashboard.
- Relevant frontend lint/typecheck/tests pass after implementation.
