# Giftomat — Project Summary & Audit (for transfer)

**Source note**: this is compiled from Claude's persistent memory for this Project, which itself was assembled from prior sessions (marked `[backfill]` — a reconstruction, not a verbatim transcript). It is **not** a review of raw chat logs — I don't have access to those as a separate corpus, only to what was already distilled into memory. Sections below are marked accordingly. Treat anything under "Gaps" as genuinely absent, not just unlisted.

---

## 1. Product summary

**What it is**: Giftomat (Гифтомат) — a privacy-first, 100% client-side browser media studio, also installable as a PWA with offline support. Zero server-side media processing by design.

**Instruments (5, all implemented)**:
| Instrument | Notes |
|---|---|
| GIF construction | Includes video-to-GIF frame extraction; uses `gif.js`/`gif.worker.js`; `dispose: 2` required per frame to avoid artifacts |
| PDF carousel | — |
| HTML-to-PDF | Uses `wkhtmltopdf`, Pygments, Python `markdown` for related PDF doc generation tooling |
| Image crop | Blog preset 1024×512, blog-preview preset 950×417, nudge/pan arrow controls in the drop zone; `drawCover` logic prevents letterboxing |
| JPG/WebP compression + HEIC/HEIF conversion | `heic-to` library for HEIC |

**Stack**: Next.js (App Router), React, TypeScript, Tailwind CSS, Web Workers, service worker for PWA.

**Design system**: "August Design System v3" / "Dark Workbench" — Navy/Accent-purple/Growth-Lime tokens; Canvas shell; Navy sidebar; themed buttons/fields/panels/cards; mobile drawer with dark-glass treatment; a11y touch-target fixes.

**Deployment (critical architectural fact)**:
- Staging: GitHub → Vercel (standard Next.js runtime).
- Production: **VibeCode** — static Next.js export served by a hand-written `server.js` on bare `node:http`. This is *not* a standard Next.js server environment; any server-runtime-dependent feature is a production risk. VibeCode docs are filed under "galaxy" naming (`build_galaxy.md`).

**External validation**: a 28-page PDF review package was assembled for an external AI reviewer (Fable 5.1), covering key modules, context cards, design contracts, VibeCode reference material, and a 6-part structured prompt (architecture / UX-GUI friction / top-5 priorities / three-horizon roadmap / feature-expansion ideas / UI modernization). **Status of findings**: package was prepared; no record of findings having been triaged into concrete backlog items yet.

**Open product decision**: navigation IA — floating bottom-nav bar vs. slide-in drawer. Design guidance (August §17.3) favors bottom-nav for ≤5 destinations; Giftomat has exactly 5. **Awaiting Paulo's explicit sign-off** — not yet decided.

### Not available in memory (genuine gaps, not omissions)
- Customer Journey Map: no funnel, persona, acquisition/activation/retention data recorded anywhere.
- Component-level architecture (file/module graph, state management approach, data flow between instruments).
- Full UI/UX flow beyond the crop presets and the design-token system.
- Analytics/telemetry setup, if any (plausible there is none, given the privacy-first/no-backend positioning, but this is inference, not a stated fact).
- Test suite contents beyond "35 unit tests" as a count at one point in time — could have drifted.
- Any business/marketing data (pricing, positioning, target segments) specific to Giftomat itself, as distinct from Paulo's general Brazilian-SaaS-marketing work context, which is a separate, unrelated thread in memory.

If any of this is needed for future work, it needs to come from Paulo directly or a fresh repomix/codebase read — it won't surface from memory continuity alone.

---

## 2. Workflow as currently practiced

1. Paulo supplies a repomix XML snapshot (source of truth for repo state).
2. Claude analyzes it, writes a standalone idempotent Python patch script (never direct commits, never line-number edits).
3. Delivery: patch script + one-line bash command (activate/commit/push), in a single message.
4. Dev environment: GitHub Codespaces.

**Patch script contract**: `--verify/--apply/--commit/--push/--diagnose` flags; graceful no-op if already applied; anchor-based exact-string replacement with versioned marker comments (`GIFTOMAT_SPRINT_X_V1_*`); legacy markers recognized as done-states; surgical scope only.

**Pre-delivery validation**: typecheck + 35-unit-test suite + smoke-check + build + PostCSS/Tailwind compile, run against a **fresh** reference extraction (not the possibly-stale snapshot already in context).

---

## 3. Audit: inefficiencies identified and fixes

### 3.1 Repo drift (explicitly named as the #1 recurring risk in memory)
**Problem**: the repomix snapshot Claude analyzes regularly diverges from the live repo, causing patch scripts to target anchors that no longer exist or have shifted.
**Fix already adopted**: never assume snapshot currency; verify anchors against fresh state.
**Further fix to consider**: have Paulo timestamp every repomix export in its filename or first line, and have Claude refuse to patch against a snapshot older than N hours/days without an explicit "yes, still current" confirmation. This turns an implicit assumption into an explicit gate.

### 3.2 Idempotency substring trap
**Problem**: when an anchor's NEW string contains the OLD string as a substring (or vice versa), re-running a patch script silently misfires — either double-applying or no-oping when it shouldn't.
**Fix already adopted**: manually check anchor mutual-exclusivity before shipping.
**Further fix to consider**: bake an automated self-test into the patch-script template itself — run `--apply` twice in a row in CI/verify mode and diff the two resulting file states; they must be identical. This converts a manual-review step into an automatic one and removes reliance on Claude remembering to check by hand every time.

### 3.3 Undocumented convention ambiguity (inline styles vs. Tailwind)
**Problem**: an earlier resolution ("abandon Tailwind `className` on interactive elements, use inline `style={{}}`") predates the August Design System v3 token-based theming layer. Memory doesn't record whether v3 superseded, coexists with, or partially overrides that earlier decision — this is a live ambiguity, flagged rather than silently resolved in both new documents above.
**Fix**: resolve this once, explicitly, and record the resolution as a single canonical rule in the repo's `AGENTS.md` (already drafted with a flag) so it stops being re-derived per session.

### 3.4 Large unreviewed external audit sitting idle
**Problem**: the 28-page Fable 5.1 review package was produced but, per memory, has not been triaged into a backlog. That's a sunk-cost audit at risk of going stale as the codebase moves.
**Fix**: triage it in one dedicated session — extract the top-5 priorities section into discrete backlog items with accept/reject/defer decisions, so the artifact converts into action rather than sitting as reference material indefinitely.

### 3.5 Memory itself: backfill-only, no forward-logging
**Problem**: everything in project memory is tagged `[backfill]`, meaning it was reconstructed after the fact rather than captured as decisions were made. That's inherently lossy — this audit itself is proof (no CJM, no architecture diagram, no test-suite detail beyond a single count).
**Fix**: going forward, after any session that produces an architectural decision, a resolved bug, or a new hard constraint, explicitly ask for it to be written to the Project's memory files (`overview.md`, `ways-of-working.md`) in that same session, rather than relying on later reconstruction. This is the main lever available to prevent the same gap from recurring.

### 3.6 No stated versioning/change-tracking for the design system
**Problem**: "v3" is referenced by name, but memory holds no changelog of v1→v2→v3, so it's unclear what changed and why at each step — relevant if a future decision needs to reference "why we moved away from X."
**Fix**: low-priority; only worth fixing if the design system is expected to keep evolving in ways that need historical justification. If so, a one-paragraph changelog entry per version bump, appended to `overview.md`, is cheap insurance.

---

## 4. Deliverables produced alongside this summary
- `01-custom-project-instructions.md` — paste into the Project's custom instructions.
- `02-AGENTS.md` — commit to the Giftomat repo root (or `.github/`, depending on which agents you run) as-is.

Both encode the dual-deployment constraint, the patch-script contract, and the known resolved bugs as hard rules, so they don't need to be re-derived or re-explained each session.
