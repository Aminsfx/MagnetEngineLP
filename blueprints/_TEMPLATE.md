BLUEPRINT [n]: [short name of the thing]

BUILDER: [Claude Sonnet | Claude Haiku], working alone, cold start, cannot ask questions.  (one line on why this model fits this item)

GOAL

  One or two plain sentences: what exists and works when this is done, stated as a finished result, not a task list. The builder should know what it is aiming at before it reads anything else.

CONTEXT THE BUILDER NEEDS (it has no memory of the planning chat)

  - Files to read first: [real paths in this repo the builder should open before editing, if there is a repo]
  - Real inputs, in full: [the current file, brand colors, the example to match, the data columns, the audience, the voice, a past sample. If it is not written or pasted here, it does not exist for the builder.]
  - Data shapes / examples: [sample input and expected output, real values not placeholders]
  - Gotchas: [traps found while grounding: a naming quirk, a shared util, an env var, a thing that looks reusable but is not]

CONSTRAINTS (the limits)

  - Must stay inside: [the exact files/modules/folders it is allowed to touch]
  - Must not change: [files, public APIs, schemas, copy, or behavior it must leave alone]
  - Stack / tools to respect: [languages, frameworks, libs, or tools already in use; anything it must or must not use]
  - Non-negotiables: [length, tone, perf, style, naming, security, budget, or product rules that apply]

STEP-BY-STEP PLAN (in build order)

  1. [exact file to create or edit] - [exact change: function/component/route/copy + signature or shape + what it does]
  2. [next file] - [next change]
  3. ... every step one concrete action with no judgment call left in it; where a step needs exact words, put the exact words; where a step needs a decision, make it here and state it
  (If a step depends on an earlier one, say so. The numbers are the order.)

EXACT INPUTS TO USE

  - Files to open or create, by name: [...]
  - The one prompt to hand the builder to kick this off: "[paste-in instruction that starts the build from this blueprint]"
  - Copy / values / snippets to use verbatim: [anything the builder would otherwise write from scratch]

DEFINITION OF DONE (checklist the builder ticks against its own output before calling it finished)

  [ ] [observable behavior 1 is true]
  [ ] [the exact test or command that must pass, e.g. `npm test` green, a named test file, or 'all 5 links resolve']
  [ ] [edge case handled: ...]
  [ ] [objective checks: 'headline under 8 words', 'file saved as pricing.md', 'no placeholder text remains']
  [ ] [nothing in CONSTRAINTS was violated]
  (Every box pass or fail. If any box fails, fix and recheck. If all pass, it is done.)

IF SOMETHING IS UNCLEAR (anti-stall)

  If the builder hits a genuine gap this blueprint did not cover: make the smallest safe assumption, write it at the top of the output as 'ASSUMPTION: ...', and keep going. Never stall, never ask, never invent big new scope. (I will scan for ASSUMPTION tags before I trust the batch.)
