---
name: Rizvi FE Assignment Portal
description: Institutional FE & Core Engineering Lab Assignment System (Luma Sticky App Edition)
colors:
  primary: "#1889E6"
  primary-hover: "#1577C8"
  primary-subtle: "#EBF5FF"
  secondary: "#182430"
  secondary-hover: "#223042"
  neutral-bg: "#F8F9FA"
  neutral-surface: "#FFFFFF"
  neutral-subtle: "#F1F5F9"
  neutral-border: "#E2E8F0"
  neutral-border-strong: "#CBD5E1"
  text-primary: "#1E293B"
  text-secondary: "#64748B"
  text-tertiary: "#94A3B8"
  accent-pink: "#F83D68"
  success: "#10B981"
  success-subtle: "#ECFDF5"
  warning: "#F59E0B"
  warning-subtle: "#FFFBEB"
  danger: "#EF4444"
  danger-subtle: "#FEF2F2"
  purple: "#8B5CF6"
  purple-subtle: "#F5F3FF"
typography:
  display:
    fontFamily: "'Exo 2', 'Roboto', 'Lato', sans-serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: "1.3"
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "'Roboto', 'Lato', sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: "1.3"
    letterSpacing: "-0.01em"
  title:
    fontFamily: "'Lato', 'Roboto', sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: "1.4"
  body:
    fontFamily: "'Lato', 'Roboto', sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: "1.5"
  label:
    fontFamily: "'Lato', 'Roboto', sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: "1.2"
    letterSpacing: "0.04em"
  mono:
    fontFamily: "'JetBrains Mono', SFMono-Regular, monospace"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: "1.4"
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  canvas: "40px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "0 18px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.neutral-surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "0 18px"
    height: "40px"
  card:
    backgroundColor: "{colors.neutral-surface}"
    rounded: "{rounded.lg}"
    padding: "24px"
  input-text:
    backgroundColor: "{colors.neutral-surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "0 14px"
    height: "42px"
---

# Design System: Rizvi FE Assignment Portal (Luma Edition)

## Overview

**Creative North Star: "The Sticky Academy Desktop"**

The Rizvi FE Assignment Portal visual system is extracted directly from the **Luma Sticky App Layout** architecture. It pairs an ultra-clean slate canvas (`#F8F9FA`) with sticky top headers, deep dark navy sidebar options (`#182430`), crisp white elevated surface cards (`#FFFFFF`), structural 1px divider lines (`#E2E8F0`), and a vibrant Dodger Blue primary action accent (`#1889E6`).

Designed for high-density academic workflows, student variable problem-solving, and instant auto-grading, this aesthetic combines modern SaaS layout rhythm (`Lato`, `Roboto`, `Exo 2`) with high-precision monospaced numerical formatting (`JetBrains Mono`).

**Key Characteristics:**
- **Sticky App Layout Architecture:** Fixed 64px navbar with shadow paired with responsive navigation drawer and sticky subnav headers.
- **Section Separators with Label Badges:** Clear horizontal rules (`.page-separator`) with embedded uppercase section title pills.
- **Dodger Blue & Deep Navy Palette:** Vibrant primary blue (`#1889E6`) paired with rich dark drawer tones (`#182430`) and crisp white surfaces.
- **Tactile Card Grid System:** Equal-height flex card containers (`.card-group-row`) with soft elevation depth (`0 1px 3px rgba(0,0,0,0.05)`).
- **Dual-Font Precision Protocol:** Expressive sans-serif UI type coupled with monospaced variables for dynamic inputs and student UIN calculations.

## Colors

The palette balances clean slate backgrounds with vibrant interactive blue accents and high-contrast semantic indicators.

### Primary
- **Luma Dodger Blue** (`#1889E6`): Primary action buttons, active navigation indicators, progress bars, and key focus states.
- **Dodger Blue Hover** (`#1577C8`): Primary button hover and interactive active states.
- **Dodger Blue Subtle** (`#EBF5FF`): Tinted background for active sidebar menu items, selected tab chips, and variable highlight badges.

### Secondary
- **Header & Drawer Navy** (`#182430`): Dark navigation drawer background, dark topbar variants, and high-emphasis brand containers.
- **Drawer Navy Hover** (`#223042`): Hover state for dark navigation menu items.

### Neutral
- **Slate Canvas Background** (`#F8F9FA`): Main application background canvas.
- **Surface White** (`#FFFFFF`): Elevated cards, modals, dropdown menus, and assignment sheets.
- **Subtle Surface** (`#F1F5F9`): Table headers, filter bars, segmented switchers, and subtle hover states.
- **Default Border** (`#E2E8F0`): Structural 1px boundary lines and table row dividers.
- **Strong Border** (`#CBD5E1`): Input field boundaries, active tab borders, and popover container outlines.
- **Primary Text** (`#1E293B`): Dark slate headings, body text, and table content.
- **Secondary Text** (`#64748B`): Subtitles, metadata, form labels, and secondary actions.
- **Tertiary Text** (`#94A3B8`): Placeholder text, disabled inputs, and subtle icons.

### Feedback & Notifications
- **Luma Pink Highlight** (`#F83D68`): Notification badges, unread indicators, and urgent highlights.
- **Emerald Success** (`#10B981` / `#ECFDF5`): 0% deduction status, full attempt credit, active user status.
- **Amber Warning** (`#F59E0B` / `#FFFBEB`): Impending batch deadlines, attempt 2 (-10% deduction).
- **Rose Danger** (`#EF4444` / `#FEF2F2`): Attempt 3 (-20% deduction), invalid student UIN, delete confirmation dialogs.
- **Violet Accent** (`#8B5CF6` / `#F5F3FF`): Course Outcomes (CO1-CO6), Bloom's taxonomy tags, and specialized lab metadata.

### Named Rules
**The Dodger Blue Focal Rule.** Luma Dodger Blue (`#1889E6`) must be applied exclusively to actionable focal points (primary CTA buttons, active tab indicators, and progress meters). It must never exceed 10% of total viewport area.

## Typography

**Display Font:** `Exo 2`, `Roboto`, `Lato`, sans-serif  
**Body Font:** `Lato`, `Roboto`, sans-serif  
**Label/Mono Font:** `JetBrains Mono`, SFMono-Regular, monospace  

**Character:** Academic, polished, structured, and legible across mobile and desktop viewports.

### Hierarchy
- **Display** (Bold 700, `28px`, line-height `1.3`, `-0.02em`): Main view titles and hero headings (`.page-heading`, `.hero-title`).
- **Headline** (Bold 700, `22px`, line-height `1.3`, `-0.01em`): Institutional paper header and modal titles (`.modal-title`, `.college-title`).
- **Title** (SemiBold 600, `18px`, line-height `1.4`): Dashboard card headers and section titles (`.card-title`).
- **Body** (Regular 400, `15px`, line-height `1.5`): Standard explanatory body text, assignment instructions (`.card-body`, `.question-text`).
- **Label** (SemiBold 600, `12px`, uppercase, `0.04em`): Form field labels, table column headers (`th`), KPI subtitles (`.form-label`, `.page-separator__text`).
- **Mono Data** (SemiBold 600, `13px`, line-height `1.4`): Dynamic question parameters, variable inputs, CSV solution numbers (`.var-chip`, `.param-input`).

### Named Rules
**The Pure Monospace Formula Rule.** All variable values, calculated key limits, and student UIN entries must strictly use `JetBrains Mono`. Proportional fonts must never be rendered inside dynamic variable inputs.

## Layout

- **Sticky App Topbar:** Fixed 64px top navigation bar with `.navbar-shadow` (`0 2px 10px rgba(0,0,0,0.06)`).
- **Navigation Drawer:** 250px left sidebar drawer for role navigation (`Student`, `Faculty`, `Admin`).
- **Container Boundaries:** Centered page container (`max-width: 1280px`) with 24px/32px responsive side padding.
- **Section Separators:** Horizontal divider lines featuring uppercase section text badges (`.page-separator__text`).
- **Digital Paper Canvas:** 900px max-width assignment sheet canvas with 40px internal padding.

## Elevation & Depth

Surfaces use light tonal contrast combined with soft subtle shadow elevation steps.

### Shadow Vocabulary
- **Level 0** (`none`): Flat resting surface.
- **Level 1** (`0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03)`): Resting cards and header bar.
- **Level 2** (`0 4px 14px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)`): Interactive card hover states and dropdown menus.
- **Level 3** (`0 10px 25px rgba(0, 0, 0, 0.10)`): Digital assignment canvas sheet and popovers.
- **Level 4** (`0 20px 50px rgba(0, 0, 0, 0.15)`): High-priority modal dialog overlays.

### Named Rules
**The One-Level Jump Rule.** Hovering over resting Level 1 cards must smoothly transition exclusively to Level 2 (`0 4px 14px rgba(0,0,0,0.08)`). Multi-level jumps are strictly prohibited.

## Shapes

- **Form Language:** Rounded geometric shapes with clean 1px structural strokes.
- **Radius Scale:**
  - `sm` (`4px`): Badges, tooltips, subnav tags.
  - `md` (`8px`): Action buttons, form input fields, table bounds, role toggles.
  - `lg` (`12px`): Dashboard KPI cards, content containers, dropdown popovers.
  - `xl` (`16px`): Dialog windows and full modals.
  - `pill` (`9999px`): Notification counter badges, status indicators, avatar clips.

## Components

### Buttons
- **Shape:** Height `40px`, padding `0 18px`, radius `8px`.
- **Primary:** Background `#1889E6`, text `#FFFFFF`. Hover: `#1577C8` with `0 2px 8px rgba(24, 137, 230, 0.3)` shadow.
- **Secondary:** Background `#FFFFFF`, border `1px solid #E2E8F0`, text `#1E293B`. Hover: `#F1F5F9`, border `#CBD5E1`.
- **Destructive:** Background `#FFFFFF`, border `1px solid #EF4444`, text `#EF4444`. Hover: `#FEF2F2`.
- **Ghost:** Background transparent, text `#1889E6`. Hover: `#EBF5FF`.

### Form Inputs
- **Shape:** Height `42px`, padding `0 14px`, radius `8px`.
- **Base Style:** Background `#FFFFFF`, border `1px solid #CBD5E1`, text `#1E293B`.
- **Focus State:** Border `#1889E6`, box-shadow `0 0 0 3px rgba(24, 137, 230, 0.15)`.

### Cards & Section Separators
- **Card Surface:** Background `#FFFFFF`, border `1px solid #E2E8F0`, radius `12px`, padding `24px`, shadow `level-1`.
- **Page Separator:** Centered 1px line with `.page-separator__text` pill (`bg-slate-100`, uppercase 12px label).

### Navigation & Drawers
- **Topbar Navbar:** Height 64px, background `#FFFFFF`, bottom border `1px solid #E2E8F0`, shadow `0 2px 10px rgba(0,0,0,0.06)`.
- **Sidebar Drawer:** Width 250px, background `#FFFFFF` (or `#182430` for dark drawer mode), right border `1px solid #E2E8F0`.

## Do's and Don'ts

### Do:
- **Do** use `#F8F9FA` for main page canvas background and `#FFFFFF` for content cards.
- **Do** format all dynamic variable numbers and student UIN entries in `JetBrains Mono`.
- **Do** utilize `.page-separator` divider bars with uppercase label pills to demarcate dashboard sections.
- **Do** apply strict 1px `#E2E8F0` structural border lines to all card containers.

### Don't:
- **Don't** use heavy dark drop shadows or un-layered saturated backgrounds.
- **Don't** mix proportional sans-serif fonts inside dynamic formula fields or parameter inputs.
- **Don't** hardcode random border radii outside the `4px`, `8px`, `12px`, `16px`, `9999px` scale.
- **Don't** alter institutional whitelist constraints or core academic domain requirements (`@eng.rizvi.edu.in`).
