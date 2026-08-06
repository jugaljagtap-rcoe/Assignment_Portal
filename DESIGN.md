---
name: Rizvi FE Assignment Portal
description: Institutional First Year & Core Engineering Lab Assignment & Auto-Grading System
colors:
  primary: "#0066CC"
  primary-hover: "#0077ED"
  primary-subtle: "#E8F0FB"
  neutral-bg: "#F5F5F7"
  neutral-surface: "#FFFFFF"
  neutral-subtle: "#F2F2F2"
  neutral-border: "#E5E5E7"
  neutral-border-strong: "#C7C7CC"
  text-primary: "#1D1D1F"
  text-secondary: "#6E6E73"
  text-tertiary: "#AEAEB2"
  success: "#34C759"
  success-subtle: "#F0FBF3"
  warning: "#FF9F0A"
  warning-subtle: "#FFF8EC"
  danger: "#FF3B30"
  danger-subtle: "#FFF2F1"
  purple: "#5E5CE6"
  purple-subtle: "#F0F0FF"
typography:
  display:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: "1.3"
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif"
    fontSize: "22px"
    fontWeight: 800
    lineHeight: "1.3"
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: "1.4"
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: "1.5"
    letterSpacing: "normal"
  label:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: "1.2"
    letterSpacing: "0.03em"
  mono:
    fontFamily: "'JetBrains Mono', SFMono-Regular, Consolas, monospace"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: "1.4"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  pill: "9999px"
spacing:
  xs: "6px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "24px"
  canvas: "40px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.neutral-surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "40px"
  card:
    backgroundColor: "{colors.neutral-surface}"
    rounded: "{rounded.lg}"
    padding: "20px"
  input-text:
    backgroundColor: "{colors.neutral-bg}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "42px"
---

# Design System: Rizvi FE Assignment Portal

## Overview

**Creative North Star: "The Institutional Precision Desk"**

The Rizvi First Year Engineering Assignment Portal employs a clean, high-clarity Light Mode design system modeled after Apple HIG and Linear desktop interfaces. It combines neutral background canvases (`#F5F5F7`) with elevated white surface cards (`#FFFFFF`), subtle 1px structural borders (`#E5E5E7`), and a purposeful institutional Royal Blue accent (`#0066CC`).

Designed for high numerical accuracy and zero visual distraction during lab sessions, the system pairs proportional interface typography (`Inter`) with high-legibility monospaced data styling (`JetBrains Mono`). Student assignment sheets are rendered on a dedicated 900px digital paper canvas that translates seamlessly between browser interaction and physical PDF printing.

**Key Characteristics:**
- **Prism-Clean Light Mode Palette:** Pristine background canvas with crisp elevated surface cards.
- **Dual-Font System:** Proportional sans-serif for UI structure and monospaced font for dynamic formulas and UINs.
- **Structured 4-Tier Elevation System:** Progressive shadow depth from flat cards to 64px modal overlays.
- **Apple-Style Segmented Controls:** Tactile role switcher (`⚡ Admin View` vs `👨‍🏫 Faculty View`).
- **Institutional Assignment Canvas:** 900px centered paper layout optimized for lab evaluation and high-resolution print export.

## Colors

The color system relies on a clean neutral foundation with high-contrast semantics for status feedback and subject tagging.

### Primary
- **Rizvi Royal Blue** (`#0066CC`): Applied strictly to key action buttons, active navigation indicators, and variable highlight chips.
- **Royal Blue Hover** (`#0077ED`): Primary button hover state.
- **Royal Blue Subtle** (`#E8F0FB`): Background tint for active sidebar items and variable chips.

### Neutral
- **Background Canvas** (`#F5F5F7`): Main application background.
- **Surface White** (`#FFFFFF`): Primary container, modal, and assignment card surface.
- **Subtle Surface** (`#F2F2F2`): Role switcher bar, table headers, and secondary hover states.
- **Default Border** (`#E5E5E7`): 1px structural divider line.
- **Strong Border** (`#C7C7CC`): Focused input border and strong surface bounds.
- **Primary Text** (`#1D1D1F`): High-contrast headings and body copy.
- **Secondary Text** (`#6E6E73`): Subtitles, form labels, and metadata.
- **Tertiary Text** (`#AEAEB2`): Placeholders, disabled states, and close icons.

### Feedback & Tagging
- **Success** (`#34C759` / `#F0FBF3`): Full marks (0% deduction), active user status, positive trends.
- **Warning** (`#FF9F0A` / `#FFF8EC`): Attempt 2 (-10% deduction), impending deadlines.
- **Danger** (`#FF3B30` / `#FFF2F1`): Attempt 3 (-20% deduction), failed whitelists, destructive buttons.
- **Purple Accent** (`#5E5CE6` / `#F0F0FF`): Course Outcome (CO) tags and specialized lab metadata.

### Named Rules
**The Rarity of Blue Rule.** Primary accent blue (`#0066CC`) is reserved strictly for interactive focus points and active navigation. It covers ≤10% of any screen surface to preserve its visual weight.

## Typography

**Display Font:** `Inter`, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif  
**Body Font:** `Inter`, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif  
**Label/Mono Font:** `JetBrains Mono`, SFMono-Regular, Consolas, monospace  

**Character:** Crisp, professional, academic, and highly readable. Proportional sans-serif drives structural readability, while monospaced text handles variable formulas, parameters, and student UINs.

### Hierarchy
- **Display** (Bold 700, `28px`, line-height `1.3`, `-0.02em`): Main view title (`h1.page-title`).
- **Headline** (ExtraBold 800, `22px`, line-height `1.3`, `-0.01em`): Institutional paper header (`.college-name`).
- **Title** (SemiBold 600, `18px`, line-height `1.4`, `-0.01em`): Card titles and section headers (`.card-title`).
- **Body** (Regular 400, `15px`, line-height `1.5`): Standard explanatory text and question wording (`.question-text`).
- **Label** (SemiBold 600, `12px`, uppercase, `0.03em`): Input labels, KPI headers, and table th (`.form-label`, `.kpi-label`).
- **Mono Data** (SemiBold 600, `13px` / `14px`, line-height `1.4`): Variable substitution values, answer inputs, and student UINs (`.var-chip`, `.param-input-val`).

### Named Rules
**The Dual-Font Protocol Rule.** Never mix sans-serif and mono fonts inside numerical inputs or formulas. All variable numbers, calculations, and solution parameters must render in `JetBrains Mono`.

## Layout

- **Main Application Grid:** Sticky top header (64px) with a centered main container (`max-width: 1280px`) containing a 240px fixed left sidebar navigation and flexible main view area.
- **Dashboard KPI Grid:** 4-column CSS grid (`repeat(4, 1fr)` with 16px gap) for metric summary cards.
- **Assignment Paper Canvas:** Centered 900px layout (`max-width: 900px`) with 40px internal padding, mimicking physical A4 sheet geometry.
- **Spacing Scale:** Standardized rhythm using 6px, 12px, 16px, 20px, 24px, and 40px padding/gap steps.

## Elevation & Depth

Depth is established through light tonal layering combined with a strict 4-level box shadow hierarchy.

### Shadow Vocabulary
- **Level 0** (`none`): Flat resting surface.
- **Level 1** (`0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)`): Standard resting cards and header bar.
- **Level 2** (`0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)`): Card hover state and dropdown popovers.
- **Level 3** (`0 12px 32px rgba(0, 0, 0, 0.12), 0 4px 8px rgba(0, 0, 0, 0.06)`): Digital assignment canvas paper and floating toasts.
- **Level 4** (`0 24px 64px rgba(0, 0, 0, 0.16), 0 8px 16px rgba(0, 0, 0, 0.08)`): High-priority modal dialogs.

### Named Rules
**The Progressive Elevation Rule.** Surfaces never jump more than one elevation shadow level during interaction. Resting level-1 cards transition strictly to level-2 on hover.

## Shapes

- **Form Language:** Crisp rectangles with subtle rounded corners.
- **Radius Scale:**
  - `sm` (`6px`): Sub-buttons, tags, and small inputs.
  - `md` (`8px`): Main action buttons, form inputs, role switcher container, table bounds.
  - `lg` (`12px`): Dashboard KPI cards, standard content cards, assignment canvas.
  - `xl` (`16px`): Modal dialog windows.
  - `pill` (`9999px`): User status badges and active indicators.

## Components

### Buttons
- **Shape:** Rounded rectangle (`8px` radius, `40px` height).
- **Primary:** Background `#0066CC`, text `#FFFFFF`. Hover: `#0077ED` with `0 2px 6px rgba(0, 102, 204, 0.25)` shadow.
- **Secondary:** Background `#FFFFFF`, border `1px solid #E5E5E7`, text `#1D1D1F`. Hover: `#F2F2F2`, border `#C7C7CC`.
- **Destructive:** Background `#FFFFFF`, border `1px solid #FF3B30`, text `#FF3B30`. Hover: `#FFF2F1`.
- **Ghost:** Background transparent, text `#0066CC`. Hover: `#E8F0FB`.

### Form Inputs
- **Shape:** Height `42px`, padding `0 12px`, radius `8px`.
- **Base Style:** Background `#F5F5F7`, border `1px solid #E5E5E7`, text `#1D1D1F`.
- **Focus State:** Border shift to `#0066CC`, background `#FFFFFF`, halo `0 0 0 3px rgba(0, 102, 204, 0.15)`.

### Chips & Variable Markers
- **Variable Chip:** Background `#E8F0FB`, text `#0066CC`, border `1px solid rgba(0, 102, 204, 0.2)`, font `JetBrains Mono` 13px.
- **Status Badges:** Tag classes for Success (`#F0FBF3` / `#34C759`), Warning (`#FFF8EC` / `#FF9F0A`), Danger (`#FFF2F1` / `#FF3B30`), Course Outcomes (`#F0F0FF` / `#5E5CE6`).

### Assignment Canvas
- **Paper Canvas:** Width `900px`, background `#FFFFFF`, border `1px solid #E5E5E7`, radius `12px`, shadow `level-3`, padding `40px`.
- **Institutional Header:** Centered uppercase college title with 2px solid `#1D1D1F` bottom border underline.

## Do's and Don'ts

### Do:
- **Do** use `#F5F5F7` for application body background and `#FFFFFF` for elevated content cards.
- **Do** wrap all student-unique numerical values in `.var-chip` elements using `JetBrains Mono`.
- **Do** apply strict 1px `#E5E5E7` border lines to demarcate structured sections.
- **Do** preserve the centered 900px canvas max-width for student assignment sheet views.

### Don't:
- **Don't** introduce saturated dark mode backgrounds or heavy dark drop shadows.
- **Don't** mix sans-serif and monospaced typography within the same numerical entry field.
- **Don't** bypass the 4-level shadow scale with arbitrary custom CSS drop-shadows.
- **Don't** alter the hardcoded 5 engineering branch or 6 department taxonomy tags.
