# MagnetEngine Backlog

Each item has a build-ready blueprint in `blueprints/` written for a cheaper builder model
(Claude Sonnet or Haiku) working cold-start, alone, with zero questions. To build an item,
hand the builder the one-line prompt inside its blueprint. Template: `blueprints/_TEMPLATE.md`.

Build in this order (dependencies noted):

| # | Item | Blueprint | Builder | Notes |
|---|------|-----------|---------|-------|
| 1 | Polar payments + automatic activation | `blueprints/polar-auto-activation.md` | Sonnet | Replaces manual SQL activation; auto-revoke on cancel |
| 2 | CSV lead import | `blueprints/csv-lead-import.md` | Sonnet | Third tab in Campaign Builder; Apify/scraper exports |
| 3 | Chrome Web Store readiness | `blueprints/chrome-web-store-publish.md` | Sonnet | Kills the "downloadable file" trust problem — store install |
| 4 | Reply Battlecards | `blueprints/reply-battlecards.md` | Sonnet | Adds `calendarLink` to AppConfig + Settings card |
| 5 | Vertical Launch Packs (gym pack + chips) | `blueprints/vertical-launch-packs.md` | Haiku | Presets already exist; this is the gap-fill |
| 6 | Follow-up auto-send | `blueprints/follow-up-autosend.md` | Sonnet | Makes the sequencer actually dispatch to the extension |
| 7 | Zapier + outbound webhooks | `blueprints/zapier-webhooks.md` | Sonnet | Also adds the missing "Mark as Booked" action |
| 8 | Outreach Health Score | `blueprints/outreach-health-score.md` | Haiku | Red/yellow/green weekly behavior score on dashboard |
| 9 | Benchmark overlays on metrics | `blueprints/benchmark-overlays.md` | Haiku | "AI Analyst" is already rule-based — kept; this adds context |

Ordering constraints: 4 before 7 is nice (7's Settings card slots after 4's Booking Link card)
but not required — each blueprint stands alone. 1–3 have no dependencies on 4–9.

Deferred (decided, not blueprinted yet):
- **AI Reply Assistant / appointment booker** — feasible only through the Chrome extension
  (reads the open DM thread, AI drafts a reply, user approves). A fully autonomous booker that
  sends AND replies server-side would require clients' Instagram credentials, violates IG ToS,
  and risks account bans — rejected. Blueprint on request once items 1–9 ship.
- Team seats, A/B test engine, lead scoring, multi-channel — revisit at 20+ customers.
