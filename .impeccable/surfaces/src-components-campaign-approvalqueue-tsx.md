---
version: 1
slug: "src-components-campaign-approvalqueue-tsx"
primary_target: "src/components/campaign/ApprovalQueue.tsx"
related_targets: ["src/components/campaign/QueueRow.tsx","src/lib/queue.ts"]
---

# Approval Queue

Scope: the dashboard's `/queue` page (ApprovalQueue + QueueRow). Mode: Operate.

Audience and job: the Operator, after a scrape. Campaigns are big (50–250 leads); they skim the drafts and approve most in bulk, stopping on odd ones (owner, 2026-10-24). The task per Campaign is write DMs → read and approve → send.

Owner decisions for this surface (2026-10-24):
- Every scrape stays its own Campaign (CONTEXT.md's word; the owner said "separated"); a fresh one never mixes with leads that already have DMs or were sent.
- Sent leads leave the queue for a Sent history; replies and deals live in the Inbox and dashboard.
- A rejected lead goes to a Skipped list it can be restored from.

Constraints that must survive: Write DMs (engine batches of 10), edit/approve/skip per row, bulk approve with confirm and undo, Send with confirm (gap minutes, Send Cap), never re-send a lead the extension confirmed, delete, search, export, the Settings-rules filter, pagination for 250+ leads with one page of rows mounted, reply/booked/won marking and the deal editor for sent leads.

Memorable moment: the next-decision band — one sentence and one button that always says what this Campaign needs next.

## Direction contract

THESIS: One table and three stages (To write, To review, To send); every scrape is a campaign chip you switch to. Refuses the old six-status filter bar and the mixed list where a fresh scrape sat among sent leads.

OWN-WORLD: The dashboard's black and white: untinted grounds, 1px white hairlines, the CARD_BEZEL table card, stage tabs on a recessed pill track, hairline campaign chips, Sometype Mono for every count, one white pill for the action, emerald only for approved and won, red only for delete.

STORY: The Operator opens on the newest Campaign, sees what it needs next, does it in bulk or row by row, and watches leads leave for Sent history once the extension confirms them; skipped leads wait in Skipped.

FIRST VIEWPORT: Row one: the stage track with mono counts on the left; Sent and Skipped as quiet views, search and a menu on the right. Row two: campaign chips, newest first, each with its count for the stage. Row three: the next-decision band, one sentence and one white pill (Write N DMs, Approve N DMs, Send N DMs or Send all N DMs), replaced by the bulk bar while rows are selected. Below: the table card, rows changing state in place with an inline undo.

FORM: Stage tabs + campaign chips (dealt as "batch chips"), position 7 of my seven ordered structures; seed key 4e8eaa79. Raised by the declined wayfinding challenger (show only the next decision, with its count) and split-flap challenger (rows change state in place; the table never jumps).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
