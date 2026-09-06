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
Turning rows from an outside source — keyword search, followers scrape, CSV
upload — into Leads. Intake is where handles are canonicalised and duplicates
are dropped, so downstream code can assume both.
_Avoid_: import, ingestion (reserved for the Inbox), mapping

### Outreach

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
_Avoid_: delivered, dispatched, queued

**Send Cap**:
The maximum number of DMs the extension will send in one day. Set by the
operator, enforced by the extension.
_Avoid_: rate limit, throttle

**Follow-up**:
A later scheduled touch to a Lead that already received a DM. Distinct from a
reply, which the Lead initiates.

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
What a Conversation reveals about the Lead behind it — that they replied, and
whether they booked. The one path from the Inbox back into the Lead lifecycle.
An Outcome is evidence that something happened, never that it didn't, so it only
ever moves a Lead forwards. Interest as read by the AI is a judgement, not an
Outcome: it colours the Inbox but does not move the funnel. Nor does an Outcome
make a Lead Sent — that stays the extension's word alone.
_Avoid_: result, status, signal

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
