# MagnetEngine

Instagram cold-outreach automation for agencies and coaches. The product finds
prospects, writes them a first DM, has the operator approve it, sends it through
a browser extension, and then helps answer whatever comes back.

## Language

### Prospecting

**Lead**:
One Instagram profile the operator might contact, plus everything the product
has learned about the outreach to it. Uniquely identified by its handle across
the whole account, not per campaign.
_Avoid_: prospect, contact, profile, record

**Handle**:
An Instagram username in canonical form — lowercase, no leading `@`, no URL.
Two Leads with the same handle are the same Lead.
_Avoid_: username, IG name

**Campaign**:
One batch of Leads gathered together, named by the operator. A grouping for
review and reporting; it does not own the Leads in it.
_Avoid_: batch, list, segment

**Intake**:
Turning rows from an outside source — an Instagram scrape (keyword, hashtag,
followers, post engagement, place, a handle list…) or a CSV upload — into
Leads. Intake is where handles are canonicalised and duplicates
are dropped, so downstream code can assume both.
_Avoid_: import, ingestion (reserved for the Inbox), mapping

### Outreach

**Offer Ledger**:
The facts the Operator has earned the right to state — one real result, the
removed sacrifice, the price, the anchor, the guarantee, what the call gives
away for free. Closed by construction: a number that is not in the Ledger does
not reach a prospect, because every prompt is told the Ledger is the whole of
what is true. An empty Ledger says so out loud rather than going unmentioned,
since a prompt that omits the subject reads as permission to invent one.
_Avoid_: offer, claims, value prop (reserved for the single outcome line)

**DM**:
The first message sent to a Lead. Written by the AI from the operator's system
prompt, then approved by a human.
_Avoid_: message (reserved for the Inbox), outreach, note

**Approval Queue**:
The review surface where an operator reads, edits, approves or rejects each
drafted DM before it can be sent.
_Avoid_: review list, drafts, pending

**Approved**:
The operator has accepted a drafted DM. Approval permits sending; it is not
sending.

**Sent**:
The extension has confirmed a DM actually reached Instagram. Never inferred
from handing work to the extension — a Lead is Sent only on confirmation.
The extension confirms by two routes: the receipt it returns after sending, and
an outbound Message it later reads back out of Instagram's own inbox. Both are
the same observer reporting the same fact, so both make a Lead Sent.

A Booked Lead is also Sent. That is not a third confirmation route but the
funnel being ordered: a booking cannot precede the message that caused it, and
Booked is a confirmed event either way — the Operator clicked it, or the AI read
it off a "yes, Tuesday works". Sent acquired this way carries no send date,
because nothing observed when the send happened.
_Avoid_: delivered, dispatched, queued

**Handed off**:
A delivered Handoff carried the Lead's approved DM to the extension. The
extension accepted the work; nothing has been observed to send yet, so a
Handed-off Lead is not Sent and moves no metric.
_Avoid_: queued, scheduled, sending

**Send Cap**:
The maximum number of DMs the extension will send in one day. Set by the
operator, enforced by the extension.
_Avoid_: rate limit, throttle

**Follow-up**:
A later scheduled touch to a Lead that already received a DM. Distinct from a
reply, which the Lead initiates.

**Ladder**:
An ordered set of follow-up touches in which each touch steps the ask DOWN and
brings a new reason to write. A touch that repeats the previous ask is the same
message arriving louder, and is not a rung. Two ladders exist: the cold one,
for a Lead who never answered, and the Rescue ladder below.
_Avoid_: drip, cadence, sequence of messages

**Rescue**:
The ladder for a Lead who replied and never booked. It counts from their reply
rather than from the DM, because a stalled conversation is measured from the
last thing that actually happened. Until it existed the engine skipped every
Lead the moment they answered, so the warmest segment in the workspace received
nothing at all.
_Avoid_: re-engagement, nurture, win-back

**Handshake**:
What the installed extension tells the dashboard about itself — the wire-protocol
revision it speaks and the message names it accepts. The dashboard asks before
handing over work, so a message the installed build can't act on is refused with
a reason the Operator can read, rather than posted into silence. Needed because
the two halves stop updating together once the extension ships from the store.
_Avoid_: version check, ping, capability negotiation

### Inbox

**Conversation**:
One Instagram DM thread with a Lead, as mirrored into the product.
_Avoid_: chat, thread (reserved for the raw Instagram payload)

**Message**:
A single entry in a Conversation, inbound or outbound. Distinct from a DM,
which is specifically the first outbound message of an outreach.

**Ingestion**:
Merging a snapshot of Instagram threads into Conversations and Messages,
de-duplicating against what is already known — including the product's own
outbound Messages echoing back.
_Avoid_: sync, import, intake (reserved for Leads)

**Autopilot**:
The mode in which the AI answers new inbound Messages without waiting for the
operator to approve each reply.

**Outcome**:
What a Conversation reveals about the Lead behind it — that we messaged them,
that they replied, and whether they booked. The one path from the Inbox back
into the Lead lifecycle. An Outcome is evidence that something happened, never
that it didn't, so it only ever moves a Lead forwards. Interest as read by the
AI is a judgement, not an Outcome: it colours the Inbox but does not move the
funnel.

A **Reply** is an answer to outreach, so an Outcome only reads one from an
inbound Message that arrived after an outbound one. A prospect who writes first
is an inbound lead, not a reply. That ordering is what keeps Replied a subset of
Sent, and reply rate at or below 100%.
_Avoid_: result, status, signal

**Opted Out**:
A Lead who asked not to be contacted again. Suppression only: it stops every
follow-up condition including "always", moves no metric, and fires no webhook —
`detectTransitions` does not know the field exists.

This is the one place an AI judgement is allowed onto a Lead, and it is allowed
because of the direction it points. Interest is kept out of the funnel because a
misread inflates a number and fires a webhook nobody can unsend; a misread
opt-out costs one follow-up that was never owed. Like every other flag it only
moves forwards, so a thread the AI later reclassifies cannot reopen someone to
outreach they already declined.
_Avoid_: unsubscribed, blacklisted, suppressed

### Access

**Operator**:
The paying customer using the dashboard. The person doing outreach, as opposed
to the Lead receiving it.
_Avoid_: user, client, account, member

**Subscription**:
The Operator's paid access, in one of three states: pending, active, cancelled.
Only active opens the dashboard.

**Owner**:
The person who runs MagnetEngine and pays for its API keys. Reaches the admin
console; is not an Operator.
_Avoid_: admin (ambiguous with the console itself)
