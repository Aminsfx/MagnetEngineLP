# Client SOPs — source files

The two resources linked from the onboarding email (email #4).

| File | Becomes | Linked via |
|---|---|---|
| `DM-PSYCHOLOGY-SOP.md` | The branded PDF at `public/downloads/MagnetEngine-DM-Playbook.pdf` — bundled with the app, always available, no publishing step | `SOP_DOC_URL` secret (optional override — unset uses the bundled PDF automatically) |
| `CRM-TRACKER-TEMPLATE.csv` | Google Sheet | `CRM_SHEET_URL` secret |

The onboarding call link (`https://cal.com/magnetengine/30min`) is baked in as
the default; override with the `ONBOARDING_CALL_URL` secret if it ever changes.

## The DM Psychology Playbook (PDF)

Shipped as a static asset — `public/downloads/MagnetEngine-DM-Playbook.pdf` —
served straight from your app's domain at `<APP_URL>/downloads/MagnetEngine-DM-Playbook.pdf`.
No Google Doc, no sharing settings, nothing to keep in sync. `DM-PSYCHOLOGY-SOP.md`
in this folder is the plain-text source the PDF's content was built from — keep
it updated for reference, but the PDF is what actually ships to customers.

To replace the PDF: drop a new file at the same path and redeploy the frontend
(no Edge Function changes needed). To point at something else entirely (e.g. a
living Google Doc you want to keep editing post-launch), set `SOP_DOC_URL`.

## One-time publish to Google

**The CRM sheet:**
1. sheets.google.com → new sheet → File → Import → Upload →
   `CRM-TRACKER-TEMPLATE.csv` → "Replace spreadsheet".
2. Delete the 3 example rows once you've seen how they're filled in (or keep
   them as reference — they show a closed deal, a warm lead, and a no-reply).
3. Optional summary row (put above the table or on a second tab):
   - Replies: `=COUNTIF(H:H,"Y")` · Booked: `=COUNTIF(N:N,"Y")`
   - Closed: `=COUNTIF(Q:Q,"Y")` · **Cash collected:** `=SUM(R:R)`
4. Share → **Anyone with the link → Viewer** → copy the link. Clients make
   their own editable copy via **File → Make a copy** (the email tells them to).

## Wire the CRM link into the email

```bash
supabase secrets set CRM_SHEET_URL="https://docs.google.com/spreadsheets/d/..."
```

Secret is read at send time — no redeploy needed. Until it's set, the
onboarding email simply omits that step (the call + PDF steps always show,
since the PDF ships with the app and needs no secret).

## Column guide (CRM sheet)

Statuses worth logging the moment they happen: **Replied?** + **Sentiment**
(Positive / Neutral / Negative), **Call Booked?** + date, **Showed?**,
**Closed?**, **Cash Collected ($)** (money in the bank) vs **Deal Value ($)**
(total contract). "Next Action" should never be empty for a live lead — if
there's no next action, the lead is either Closed or dead.
