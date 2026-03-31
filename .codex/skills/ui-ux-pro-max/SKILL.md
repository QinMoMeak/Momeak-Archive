---
name: ui-ux-pro-max
description: ui and ux design intelligence for web and mobile product work. use when coding or reviewing interfaces, choosing styles, color systems, typography, charts, layouts, responsive behavior, accessibility, motion, or component patterns. especially useful for landing pages, dashboards, admin panels, ecommerce, saas, portfolios, blogs, and mobile apps across html, react, next.js, vue, svelte, swiftui, react native, flutter, tailwind, and shadcn/ui.
---

Use this skill to make concrete UI decisions fast and keep implementation quality high.

## Included resources
- `scripts/search.py`: main entry point
- `scripts/design_system.py`: generates a full design-system recommendation
- `data/*.csv`: styles, products, colors, typography, charts, landing-page patterns, and ux rules

## Workflow
1. Extract the product type, audience, platform, stack, and the user's quality goal.
2. Start with a full design-system recommendation.
3. Deep-dive with domain searches only where needed.
4. Apply the findings to the code or review.
5. Before finishing, run a short UX quality pass: accessibility, responsive behavior, interaction states, and performance.

## Step 1: generate a design system first
From the repo root, run:

```bash
python3 .codex/skills/ui-ux-pro-max/scripts/search.py "<product type + industry + style keywords>" --design-system -p "<project name>"
```

Use this first whenever the request is about a new page, product direction, redesign, or choosing style/color/typography.

Examples:

```bash
python3 .codex/skills/ui-ux-pro-max/scripts/search.py "beauty spa wellness premium" --design-system -p "Serenity Spa"
python3 .codex/skills/ui-ux-pro-max/scripts/search.py "fintech dashboard trustworthy modern" --design-system -p "LedgerFlow"
```

Optional persistence:

```bash
python3 .codex/skills/ui-ux-pro-max/scripts/search.py "fintech dashboard trustworthy modern" --design-system --persist -p "LedgerFlow"
```

## Step 2: use targeted searches as needed

```bash
python3 .codex/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain <domain>
python3 .codex/skills/ui-ux-pro-max/scripts/search.py "<query>" --stack <stack>
```

### domains
- `product`: product-type patterns
- `style`: visual styles and effects
- `color`: color palettes
- `typography`: font pairings
- `landing`: page structures and CTA patterns
- `chart`: chart recommendations
- `ux`: accessibility, motion, responsive, forms, navigation, and other UX rules

### stacks
- `html-tailwind`
- `react`
- `nextjs`

Examples:

```bash
python3 .codex/skills/ui-ux-pro-max/scripts/search.py "glassmorphism dark" --domain style
python3 .codex/skills/ui-ux-pro-max/scripts/search.py "pricing page social proof" --domain landing
python3 .codex/skills/ui-ux-pro-max/scripts/search.py "mobile accessibility touch targets" --domain ux
python3 .codex/skills/ui-ux-pro-max/scripts/search.py "table rerender memoization" --stack react
```

## How to apply results
- Convert the selected style, color, and typography into reusable design tokens.
- Keep one clear visual system per screen; do not mix unrelated styles.
- Prefer semantic tokens over raw hex values in components.
- Keep one primary CTA per major section or screen.
- Use svg icon sets instead of emoji for production UI.

## Required final review
Before delivering UI work, check these items explicitly:
- contrast and keyboard/focus visibility
- touch target size and interaction feedback
- responsive behavior at small and large breakpoints
- loading, empty, success, and error states
- motion duration and reduced-motion support
- layout stability and obvious performance problems

## If the user asks for a review instead of implementation
Use this order:
1. identify product/style mismatch
2. find accessibility failures
3. check layout and responsive issues
4. inspect hierarchy, spacing, typography, and color semantics
5. inspect interaction states and motion
6. finish with the 3 to 7 highest-impact fixes first
