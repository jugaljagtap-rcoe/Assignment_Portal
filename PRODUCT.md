# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Vanilla HTML5, CSS3, JavaScript (ES6 modules/browser scripts), Supabase JS Client SDK (v2), Google Identity Services (OAuth 2.0), Vercel static deployment.

## Users

- **First Year Engineering (FE) & Core Lab Students**: Complete personalized variable assignments, view unique dynamic parameters, calculate answers, and submit multi-parameter auto-graded solutions within attempt and deadline limits.
- **Faculty Members**: Upload subject assignments, define parameters and double CSV solution keys, monitor student submissions, perform read-only student sheet inspection, and review auto-calculated grades.
- **Master Admin & Department Heads**: Enforce strict `@eng.rizvi.edu.in` domain access, manage faculty/student rosters via bulk CSV import, configure system settings, and inspect analytical reports across 5 engineering branches and 6 departments.

## Product Purpose

Provide a specialized institutional assignment, auto-grading, and laboratory management platform for Rizvi College of Engineering that eliminates academic dishonesty through student-unique variable parameters while streamlining grading workflows for faculty and administrators.

## Positioning

Unlike generic learning management systems (LMS) or static assignment PDFs, the Rizvi FE Portal dynamically generates unique numerical question parameters linked to each student's UIN, automatically grading multi-parameter numerical entries against double CSV solution keys while enforcing strict domain-whitelisted access.

## Operating Context

- Web application accessed by students on laptops, desktops, and mobile devices during lab hours and homework submissions.
- Used by faculty during lab evaluations and grading windows.
- Integrated with Supabase backend for real-time authentication, database tables, and role-based policies.
- Deployed on Vercel with Google Workspace OAuth domain restriction (`@eng.rizvi.edu.in`).

## Capabilities and Constraints

- **Strict OAuth Whitelist**: Access strictly restricted to pre-enrolled emails in Master Admin list, Faculty Roster CSV, or 360 Student Master UIN CSV. No guest or unlisted access allowed.
- **Personalized Variable Questions**: Dynamic input values per student UIN to eliminate copying.
- **Multi-Parameter Auto-Grading**: Evaluation of multi-variable responses against uploaded solution keys.
- **Attempt & Deduction Rules**: Attempt 1 (0% deduction), Attempt 2 (-10%), Attempt 3 (-20%, max 3 attempts); Late penalty of -10%/day after batch deadline (capped at 30%).
- **Read-Only Sheet Inspection**: Faculty can view a student's exact substituted question sheet in a dedicated modal without role switching.
- **Dual-Role Master Toggle**: `jugaljagtap@eng.rizvi.edu.in` can switch seamlessly between Admin View and Faculty View.
- **Hardcoded Branches & Departments**: 5 engineering branches (AI & DS, Civil, Computer, ECS, Mechanical) and 6 academic departments.

## Brand Commitments

- **Official Name**: Rizvi College of Engineering — First Year Engineering (FE) & Core Engineering Labs Assignment Portal.
- **Institutional Domain**: Strictly `@eng.rizvi.edu.in`.
- **Voice**: Professional, academic, authoritative, precise, and supportive.

## Evidence on Hand

- Complete web codebase: `index.html`, `css/styles.css`, `js/data.js`, `js/app.js`, `js/adminView.js`, `js/facultyView.js`, `js/studentView.js`, `js/analyticsView.js`.
- Deployment Configuration: `vercel.json`, `.gitignore`, `README.md`.
- Standard CSV templates documented in README for 360 student master roster, faculty roster, and double CSV solution keys.

## Product Principles

1. **Academic Integrity First**: Personalized assignment variables render copying mathematically futile.
2. **Zero-Friction Grading**: Instant multi-parameter automated evaluation dramatically reduces faculty administrative load.
3. **Strict Domain Perimeter**: Unlisted accounts are denied entry immediately, safeguarding institutional data.
4. **Transparent Evaluation**: Clear deduction rules, attempt limits, and read-only inspection preserve trust between students and faculty.
5. **Universal & Balanced Focus**: Polished UX and equal priority across Student, Faculty, and Admin interfaces.

## Accessibility & Inclusion

- High contrast visual hierarchy, readable typography (`Inter` & `JetBrains Mono`), accessible controls, and responsive layout for desktop and mobile devices across all student and faculty roles.
