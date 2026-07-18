MASTER UI REDESIGN PROMPT (Existing Codebase)

You are a Senior Product Designer and Frontend Engineer specializing in enterprise dashboards.

I already have a fully working React/Vite application.

Your task is NOT to rebuild the project.

Your task is NOT to create additional pages.

Your task is NOT to change business logic.

Your task is ONLY to redesign the existing dashboard UI while preserving functionality.

STRICT RULES

Do NOT:

create new pages
create a different application
redesign routing
change React architecture
rename components unnecessarily
modify APIs
modify state management
modify backend calls
remove existing functionality
replace libraries unless absolutely necessary

Assume every component already works.

Only improve its UI.

Goal

Transform the current dashboard into a premium enterprise intelligence platform suitable for government crime analysts.

The final result should feel comparable to products like:

Palantir Gotham
IBM i2 Analyst Notebook
Datadog
ArcGIS
Bloomberg Terminal
Linear
Stripe Dashboard

NOT:

Dribbble concept art
AI-generated neon dashboard
Gaming interface
Cyberpunk UI
Preserve Existing Features

Keep every existing widget.

Examples include:

KPI cards
Crime Heatmap
Hotspot Details
Link Analysis Graph
Correlation Charts
Filters
Breadcrumb
Authentication Status
District Selector

Do not remove or replace them.

Only redesign their presentation.

Navigation

Do NOT design all pages shown in the sidebar.

The sidebar exists only for navigation.

Only style it.

Do not generate mockups for:

Reports
Alerts
Settings
Hotspots
District Pages

Simply improve the existing sidebar.

Prefer:

collapsible
icon-first
compact
clean spacing
Design Philosophy

The dashboard will be used by analysts for 8-10 hours daily.

Therefore prioritize:

excellent readability

strong hierarchy

minimal distractions

information density

large whitespace

clear grouping

professional typography

consistent spacing

fast visual scanning

Color System

Dark theme.

Background:

#090B10

Surface:

#11141B

Cards:

#171B24

Borders:

#252A36

Primary text:

#F4F6F8

Secondary text:

#98A2B3

Accent colors only where necessary.

Blue

Emerald

Amber

Red

Avoid:

Purple everywhere

Pink everywhere

Heavy gradients

Glow effects

Glassmorphism

Neon borders

Typography

Modern enterprise typography.

Large dashboard title

Medium section headers

Compact labels

Readable numbers

Proper spacing

Clear hierarchy

Cards

Redesign KPI cards.

Requirements:

larger numbers

small icon

tiny trend indicator

subtext underneath

soft shadow

8-12px border radius

equal heights

consistent padding

Do not use glowing cards.

Heatmap

The heatmap should become the hero of the page.

Increase its size.

Reduce surrounding clutter.

Move hotspot details into a floating side panel inside the map instead of blocking the center.

Improve zoom controls.

Improve dropdown styling.

Social Network Graph

Redesign as a premium graph panel.

Better spacing.

Legend.

Node count.

Relationship count.

Fullscreen action.

Export action.

More breathing room.

Charts

Modernize charts.

Reduce unnecessary borders.

Improve axis typography.

Better legends.

Consistent spacing.

Better colors.

Hover states.

Professional analytics look.

Header

Redesign header.

Include:

Dashboard title

Breadcrumb

Date Range

Authentication Status

Current Role

Search (optional)

Profile menu

Actions aligned cleanly.

Sidebar

Only redesign.

Do not add pages.

Collapsed width around 72px.

Expanded around 250px.

Simple monochrome icons.

One accent color.

Professional hover states.

Visual Hierarchy

Every section should have a clear importance.

Priority:

Header
KPI Cards
Heatmap
Link Analysis
Charts
Secondary Information
Spacing

Use an 8px spacing system.

24-32px page padding.

24px gaps between sections.

20px card padding.

Consistent margins everywhere.

No cramped layouts.

Microinteractions

Add subtle animations only.

Hover elevation.

Button transitions.

Smooth panel expansion.

Chart hover.

Nothing flashy.

Accessibility

Meet WCAG AA.

Readable text.

Proper contrast.

Large click targets.

Keyboard-friendly.

Responsiveness

Desktop first.

1440px

1600px

1920px

Maintain structure down to 1280px.

Implementation Rules

You are working on an existing codebase.

Reuse existing components whenever possible.

Only modify:

layout
spacing
typography
colors
component styling
icons
card structure
responsiveness

Avoid changing business logic.

Do not break existing functionality.

Refactor incrementally instead of rewriting.