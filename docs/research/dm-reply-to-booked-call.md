# From a reply to a booked call over DM

The reason for the reply prompt's path (prompt v9, `_shared/reply.ts`). The
owner described the method on 2026-11-21 after watching autopilot. This note
records it and what the setter material we found says.

## What the owner saw

- Too many questions, and none of them led anywhere near a call.
- A question followed by the booking link in the same message. The code did
  this: generate-reply appended the link to every reply it classed as
  "interested".

## The method (owner)

1. Understand the pain with a couple of questions.
2. Show you understand it: tell them you can actually help with that problem
   and offer to show them how. Then wait for their answer, yes or no. No price.
3. On a yes, send the link and ask which of two days inside the next two days
   fits them best ("today is Monday, so Tuesday or Wednesday?").
4. In the same message, ask them to tell you once they have booked so you can
   confirm it on your end.

(Revised the same day: the first version offered the two days before the
link. The owner wants the offer to be a yes/no question first, and the days
to come with the link.)

## What the setter material says

The search turned up mostly freelancer listings and vendor blogs, so read these
as practitioner claims and not tested numbers. They agree with the owner's
method on every point:

- Scripts are staged in the same order: intro, qualifying, transition, propose
  the call, booking. The call is what you ask for, and the details are left
  for the call.
- Qualify with one or two questions before the link, not a questionnaire.
- A raw calendar link sent too early mostly goes unclicked. Booking works best
  when it happens inside the conversation: agree the day first, then send the
  link for that day.
- Two or three concrete options close in one exchange. An open "when are you
  free?" starts a thread. That is why the link message names two days.

Sources:
- [Instagram Sales Funnel: DMs to Booked Calls (2026), setsmart.io](https://setsmart.io/blog/instagram-sales-funnel)
- [Turn Instagram Into an Appointment-Setting Machine, creatorflow.so](https://creatorflow.so/blog/instagram-appointment-setter-automation/)
- [Reel to booked call funnel, dmchamp.com](https://dmchamp.com/resources/reel-to-booked-call-funnel/)
- [Share your calendar in an async conversation, clarityflow.com](https://clarityflow.com/guides/booking-offer)
- [Online booking vs social media DMs, schedulingkit.com](https://schedulingkit.com/online-booking-vs/social-media-dms)

## Choices made where the owner did not say

- **Weekends are skipped.** On Friday the call is offered on Monday or Tuesday,
  because booking calendars rarely open on weekends and a day the link can't
  book loses the call at the last step.
- **Two questions** before the call has to be offered (`DISCOVERY_QUESTIONS`).
  A prospect whose first reply already shows the pain skips straight to the
  offer.
- **"booked" means booked.** A prospect who says yes or picks a day is `interested`; only
  "done, booked it" (or, with no link set up, an agreed time) is `booked`. The
  booked intent moves the funnel, and picking a day is not a booking.
