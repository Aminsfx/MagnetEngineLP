BLUEPRINT 5: Vertical Launch Packs (gap-fill — presets already exist)

BUILDER: Claude Haiku, working alone, cold start, cannot ask questions. (Pure pattern-following: add one preset object matching nine existing examples, plus a small chip row copied from existing UI patterns. Every value is written below.)

GOAL

A "Gym Owner Outreach" preset exists alongside the nine presets already in the app, and the Campaign Builder's search tab shows one-click preset chips that fill the search box with that preset's suggested search terms — so a new user's campaign is 80% configured before they type anything.

CONTEXT THE BUILDER NEEDS (it has no memory of the planning chat)

- Files to read first:
  - `src/lib/presets.ts` — `NichePreset` interface and NINE existing presets. Your new preset must match their exact shape and style (see the 'coach' preset at line ~76 as the closest model).
  - `src/components/campaign/CampaignBuilder.tsx` — the search tab: `searchRaw` state (line ~61), `setSearchRaw`, the search input, and `usePlan()` giving `limits.canUsePresets`.
  - `src/components/settings/SettingsPanel.tsx` — `PresetPicker` (line ~70) shows how presets are rendered elsewhere; do NOT modify it.
- Real inputs, in full — the new preset object, use VERBATIM as the LAST element of `NICHE_PRESETS`:
  ```typescript
  {
      id: 'gym-owner',
      name: 'Gym Owner Outreach',
      emoji: '🏋️',
      description: 'Target gym owners, fitness studios, and personal trainers',
      suggestedSearch: 'gym owner, fitness studio, personal trainer, crossfit box, pilates studio, boxing gym',
      config: {
          businessNiche: 'Growth services for gyms and fitness businesses',
          targetAudience: 'Gym owners, boutique fitness studio founders, and independent personal trainers with 500–100k followers who want more members or clients',
          valueProposition: 'We help gyms and fitness studios fill their member pipeline with local leads from Instagram — without paid ads or discounting.',
          dmTone: 'friendly',
          includeKeywords: ['gym', 'fitness', 'trainer', 'coach', 'studio', 'crossfit', 'pilates', 'owner', 'PT'],
          excludeKeywords: ['bot', 'giveaway', 'MLM', 'supplement rep', 'follow for follow'],
          minFollowers: 500,
          maxFollowers: 100000,
          systemPrompt: `You are writing cold DMs for a growth service targeting gym owners, fitness studio founders, and personal trainers.

VALUE PROPOSITION: We help gyms and fitness studios fill their member pipeline with local Instagram leads — without paid ads or discounting.

TONE: Friendly and energetic — one fitness person talking to another.

RULES:
- 2–3 sentences max.
- Reference their gym, training style, or something specific from their profile.
- End with a curious question about how they currently get new members or clients.
- Never open with a compliment about their physique. Talk business.
- Output ONLY the raw DM text. No quotes, no labels, no markdown.`,
      },
  },
  ```
- Data shapes / examples: clicking a chip labeled `🏋️ Gym Owner Outreach` sets the search input value to `gym owner, fitness studio, personal trainer, crossfit box, pilates studio, boxing gym`.
- Gotchas:
  - Presets are Pro-gated: `limits.canUsePresets` is false on Starter. The chip row must render ONLY when `limits.canUsePresets` is true (no upgrade overlay needed in Campaign Builder — Settings already has one).
  - Chips only fill the search box (`setSearchRaw(preset.suggestedSearch)`); they must NOT apply the preset's config — full config application already lives in Settings' PresetPicker.
  - The chip row belongs inside the `tab === 'search'` branch only, rendered directly above the search-terms input.

CONSTRAINTS (the limits)

- Must stay inside: `src/lib/presets.ts` (append one preset), `src/components/campaign/CampaignBuilder.tsx` (add chip row).
- Must not change: the nine existing presets, `SettingsPanel.tsx`, `PresetPicker`, any type in `types.ts`.
- Stack / tools to respect: Tailwind dark theme; no new dependencies, no new icons.
- Non-negotiables: preset object copied verbatim from CONTEXT; chip styling: `px-3 py-1.5 rounded-full border border-white/8 bg-white/3 text-[11px] text-zinc-400 hover:border-violet-500/30 hover:text-violet-300 transition-all`.

STEP-BY-STEP PLAN (in build order)

1. `src/lib/presets.ts` — append the gym-owner preset object (verbatim from CONTEXT) as the last element of `NICHE_PRESETS`.
2. `src/components/campaign/CampaignBuilder.tsx` — inside the search-tab JSX, directly above the search-terms input, add (only when `limits.canUsePresets`):
   - A label line: `Quick fill from a niche pack:` (`text-[10px] uppercase tracking-wider text-zinc-600 mb-1.5`).
   - A `flex flex-wrap gap-2` row of buttons, one per `NICHE_PRESETS` entry, content `{preset.emoji} {preset.name}`, `onClick={() => setSearchRaw(preset.suggestedSearch)}`, styled per Non-negotiables. Import `NICHE_PRESETS` from `../../lib/presets`.

EXACT INPUTS TO USE

- Files to open or create, by name: `src/lib/presets.ts` (edit), `src/components/campaign/CampaignBuilder.tsx` (edit).
- The one prompt to hand the builder to kick this off: "Open blueprints/vertical-launch-packs.md in this repo and implement it exactly as written. Do not redesign anything; every decision is already made in the blueprint."
- Copy / values / snippets to use verbatim: the entire preset object; the label line; the chip classes.

DEFINITION OF DONE (checklist the builder ticks against its own output before calling it finished)

[ ] `NICHE_PRESETS` has 10 entries; the tenth is `gym-owner` exactly as specified; the Settings PresetPicker automatically shows it (it maps over NICHE_PRESETS — verify visually or by reading the code path).
[ ] `npx tsc --noEmit` passes and `npm run build` is green.
[ ] On a Pro/Agency plan the search tab shows 10 chips; clicking one fills the search input; on Starter (`canUsePresets` false) no chip row renders.
[ ] Chips do not change filters, system prompt, or any config — only `searchRaw`.
[ ] Nothing in CONSTRAINTS was violated.

IF SOMETHING IS UNCLEAR (anti-stall)

If the builder hits a genuine gap this blueprint did not cover: make the smallest safe assumption, write it at the top of the output as 'ASSUMPTION: ...', and keep going. Never stall, never ask, never invent big new scope.
