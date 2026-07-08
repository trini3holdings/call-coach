# PRODUCTION STANDARDS — Layout Law (HARD-LOCKED, ALL AGENTS, ALL REPOS)

**Status:** LOCKED. Zero exceptions. Applies to every persona, expert, orchestrator, skill, and script that produces any visual deliverable (PDF, proposal, audit, deck, landing page, mockup frame, one-pager, email header, social asset).
**Owner:** AI Ops — Done & Co.
**Enforced by:** Marcus (routing gate) + Lex (hard pre-publish/pre-render QA gate). Nothing renders, ships, or publishes without passing this.
**Canonical copy:** This file is committed to the root of EVERY repo in the org. If it changes, update it here and re-propagate to all repos. Do not drift silently in any single deliverable.

---

## LAW 1 — Full symmetry on every page

Every page must be fully symmetrical and balanced. No lopsided columns. No page may look "short" on one side and "full" on the other.

## LAW 2 — Every column fills 100% of its vertical space

Every column on every multi-column page must fill the full available height, edge to edge. No dead space. No empty bands. No gray/wash background showing where content or imagery should be.

- **Left/image columns included.** On any page with a mockup, screenshot, chart, or image panel, the image panel must fill the full column height and visually match the paired text column's height. It must NEVER leave background matting showing above or below the image while the opposite column runs full.
- **Both paired columns must be equal height** and bottom-aligned to the same baseline.

## LAW 3 — No cropping of client/asset content to force a fill

Filling space must never crop or cut off meaningful content (a client mockup's footer, a chart axis, a headline). If content would be cropped, resize the container/typography/spacing so the FULL asset shows AND the column still fills. Balance by sizing, not by clipping.

## LAW 4 — Short content is distributed, not dumped

If a section has little content, distribute or vertically center it and scale supporting elements so leftover space reads as intentional, balanced whitespace — never a gap at top or bottom.

## LAW 5 — Verify visually before shipping

Every page must be rendered and visually inspected (screenshot/diagnostic per page) BEFORE sharing, publishing, or filing. Confirm: symmetry, both columns full, no clipping, no dead bands, equal-height cards. This is a required step, not optional.

## LAW 6 — Mobile-first, high-CRO is PRIORITY ONE

Mobile is designed first and optimized for conversion above everything else. Desktop is second, but still gets correct, deliberate UI/UX (never a lazy stretch of the mobile layout).

- **Reduce scroll fatigue.** Do not endlessly stack sections vertically on mobile. Use proper UI/UX patterns to compress the journey: horizontal left-to-right scroll widgets / swipeable carousels for card sets, logo rows, testimonials, service tiles, and galleries WHERE APPROPRIATE, so the user swipes sideways instead of scrolling forever.
- **Apply real UI/UX principles** (thumb-zone CTAs, progressive disclosure, sticky primary action, chunked content, visual hierarchy) to maximize mobile conversion. Every mobile decision is justified by CRO, not convenience.
- **Desktop:** use the right pattern for the wider canvas. Never dumb-stretch mobile; never leave it under-designed either.

## LAW 7 — Cards are always symmetrical and equal-height

On every breakpoint, any set of cards (feature cards, pricing cards, service tiles, two-panel hero splits, testimonial cards, image+text pairs) must be perfectly symmetrical: equal height, equal width within their row, aligned top and bottom baselines, consistent internal padding.

- **Never uneven cards.** A row of cards must not have one taller/shorter than its siblings.
- **Two-panel splits** (text card beside an image) must be equal height with matching corner radius and aligned top and bottom edges. No panel floating shorter than its partner.
- Equalize by sizing containers and distributing content, never by cropping meaningful content.

---

## Enforcement hooks

- **Marcus:** flags any layout risk before routing to render; refuses to advance a render/publish without a Lex PASS.
- **Lex (hard gate):** the pre-publish/pre-render QA gate explicitly checks Laws 1–7 and BLOCKS on any violation, including uneven cards, missing mobile-first CRO treatment, and unbalanced two-panel splits. A deliverable that fails any law is NOT shippable.
- **Sasha / any render skill:** must produce per-page diagnostics and self-check against this file before handing to Lex.

> This is a permanent Done & Co. production standard. It supersedes any per-project convenience. When in doubt, fill the space and balance the page.
