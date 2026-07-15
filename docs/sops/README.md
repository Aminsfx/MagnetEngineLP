# Client SOPs — source files

These are the master copies of the two resources linked from the onboarding
email (email #4). They live in Google (Docs/Sheets) for clients; this folder is
the version-controlled source.

| File | Becomes | Linked via secret |
|---|---|---|
| `DM-PSYCHOLOGY-SOP.md` | Google Doc | `SOP_DOC_URL` |
| `CRM-TRACKER-TEMPLATE.csv` | Google Sheet | `CRM_SHEET_URL` |

The onboarding call link (`https://cal.com/magnetengine/30min`) is baked in as
the default; override with the `ONBOARDING_CALL_URL` secret if it ever changes.

## One-time publish to Google

**The SOP doc:**
1. docs.google.com → new doc → paste the content of `DM-PSYCHOLOGY-SOP.md`
   (or File → Open → upload the .md — Docs converts headings/tables automatically).
2. Title it **"MagnetEngine — DM Psychology Playbook"**.
3. Share → **Anyone with the link → Viewer** → copy the link.

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

## Wire the links into the email

```bash
supabase secrets set \
  SOP_DOC_URL="https://docs.google.com/document/d/..." \
  CRM_SHEET_URL="https://docs.google.com/spreadsheets/d/..."
```

Secrets are read at send time — no redeploy needed. Until they're set, the
onboarding email simply omits those steps (the call link always shows).

## Column guide (CRM sheet)

Statuses worth logging the moment they happen: **Replied?** + **Sentiment**
(Positive / Neutral / Negative), **Call Booked?** + date, **Showed?**,
**Closed?**, **Cash Collected ($)** (money in the bank) vs **Deal Value ($)**
(total contract). "Next Action" should never be empty for a live lead — if
there's no next action, the lead is either Closed or dead.
