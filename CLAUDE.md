# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This repository contains a Claude Code skill: **`ui-ux-pro-max`** — a UI/UX design intelligence system with a searchable database of 67 styles, 96 color palettes, 57 font pairings, 25 chart types, 99 UX guidelines, and 13 tech stack guidelines.

**No build step required.** Pure Python (3.10+), zero external dependencies.

## Running the Skill

All commands are run from the skill root directory:

```bash
cd .claude/skills/ui-ux-pro-max
```

### Core Commands

```bash
# Generate full design system (primary workflow)
python3 scripts/search.py "<product_type> <industry> <keywords>" --design-system [-p "Project Name"]

# Generate and persist design system (Master + Overrides pattern)
python3 scripts/search.py "<query>" --design-system --persist -p "Project Name"

# Generate page-specific override (requires --persist)
python3 scripts/search.py "<query>" --design-system --persist -p "Project Name" --page "dashboard"

# Search a specific domain
python3 scripts/search.py "<keyword>" --domain <domain> [-n <max_results>]

# Get stack-specific implementation guidelines
python3 scripts/search.py "<keyword>" --stack <stack_name>

# Output as markdown instead of ASCII box
python3 scripts/search.py "<query>" --design-system -f markdown
```

### Available Domains
`product`, `style`, `typography`, `color`, `landing`, `chart`, `ux`, `react`, `web`, `prompt`

### Available Stacks
`html-tailwind` (default), `react`, `nextjs`, `vue`, `svelte`, `swiftui`, `react-native`, `flutter`, `shadcn`, `jetpack-compose`

## Architecture

```
.claude/skills/ui-ux-pro-max/
├── SKILL.md              # Full skill documentation and workflow
├── scripts/
│   ├── core.py           # BM25 search engine (no external deps)
│   ├── search.py         # CLI entry point (argparse)
│   └── design_system.py  # Multi-domain aggregator + design system generator
└── data/
    ├── *.csv             # Core design data (styles, colors, typography, etc.)
    └── stacks/           # Per-framework implementation guidelines (13 CSVs)
```

### Three-Tier Architecture

1. **Data Layer** — CSV files in `data/`. Human-readable, version-controllable. Core files cover styles, palettes, fonts, UX rules, landing patterns, chart types, etc. Stack-specific files live in `data/stacks/`.

2. **Search Layer** (`core.py`) — Pure Python BM25 implementation. Each domain maps to one or more CSV files. Auto-domain detection infers domain from query keywords when `--domain` is not specified.

3. **Generation Layer** (`design_system.py`) — `DesignSystemGenerator` runs multi-domain searches in parallel (product + style + color + landing + typography), applies reasoning rules from `ui-reasoning.csv` to select best matches, and outputs a complete design system. The `--persist` flag writes `design-system/MASTER.md` (global) and optionally `design-system/pages/<page>.md` (overrides).

### Master + Overrides Pattern

When `--persist` is used, the design system is saved hierarchically:
- `design-system/MASTER.md` — global source of truth
- `design-system/pages/<page>.md` — page-specific deviations that override the master

When implementing a specific page, check for the page override file first; fall back to MASTER.md.

## Skill Workflow (for UI/UX tasks)

1. Analyze user request: extract product type, style keywords, industry, stack
2. Run `--design-system` to get comprehensive recommendations
3. Supplement with domain-specific searches as needed
4. Get stack guidelines (default: `html-tailwind` if user doesn't specify)
5. Implement using the design system + SKILL.md's pre-delivery checklist
