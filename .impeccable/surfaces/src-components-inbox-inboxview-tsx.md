---
version: 1
slug: "src-components-inbox-inboxview-tsx"
primary_target: "src/components/inbox/InboxView.tsx"
related_targets: ["src/components/inbox/Copilot.tsx","src/components/inbox/DealPanel.tsx","src/lib/triage.ts"]
---

# Inbox

Scope: the dashboard's `/inbox` page (InboxView, Copilot, DealPanel; triage.ts orders it). Mode: Operate.

Audience and job: the Operator, replying to prospects who answered a DM. Dozens of conversations a day, on a desktop (owner, 2026-10-24). They reply copilot-first: take one of the three suggested replies, edit it, approve and send.

Owner decisions for this surface (2026-10-24):
- "Copilot, then edit": the three suggested replies are the main event, shown in full, one click into the composer.
- The decision page closed unanswered and the owner then asked to "redesign the inbox section", so the build takes the assigned direction (stated assumption).

Constraints that must survive: priority triage with a next step per conversation, the All / Qualified / Objections / Booked filters with counts, search, the copilot's three angles (auto-drafted only when a reply is owed), Approve & Send through the extension (a refused handoff keeps the draft and says why), Booked, labels with quick labels, the deal (price, Mark as won, Edit deal), the Autopilot switch and its warning, the connected account with Switch account, the wrong-account notice, the empty state that teaches the extension, and mobile.

Memorable moment: Send, then Next. After a reply is handed to the extension the open row offers the next conversation that needs you as its one white pill.

## Direction contract

THESIS: One full-width list sorted by who needs you; a conversation unfolds in place under its row, thread, three full replies and composer together. Refuses the two-pane split, where the list shrank to a 264px column and the copilot hid behind truncated chips.

OWN-WORLD: The dashboard's black and white: untinted grounds, the CARD_BEZEL list card on surface-sunken, hairline-ruled rows, sticky priority headers with mono counts, filters on the recessed stage track, handles and times in Sometype Mono, pills for every control, one white pill per open row, emerald only for Booked and Won.

STORY: The Operator sees who needs them first and why, unfolds the top conversation, reads the last messages, uses one reply, edits it, sends it through the extension, and presses Next.

FIRST VIEWPORT: Row one: "Inbox", the count of conversations that need you, the connected account; the Autopilot switch at right. Row two: the filter track and search. Then the list card: "Needs attention" first; each row is avatar, name over mono handle, their last message, the next step, mono time waited. The open row: recent messages, three replies side by side with Use, the composer with the white Approve & Send pill, a slim bar for Booked, deal and labels.

FORM: Inline-expanding list, position 6 of my seven ordered structures; seed key 956c4fcf. Raised by the declined boarding-pass challenger: a conversation that gets a new message moves to its new place and stays lit until you open it.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
