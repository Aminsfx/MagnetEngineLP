# Client SOPs — source files

Resources linked from the onboarding email (email #4).

| File | Becomes | Linked via |
|---|---|---|
| `DM-PSYCHOLOGY-SOP.md` | The branded PDF at `public/downloads/MagnetEngine-DM-Playbook.pdf` — bundled with the app, always available, no publishing step | `SOP_DOC_URL` secret (optional override — unset uses the bundled PDF automatically) |

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
