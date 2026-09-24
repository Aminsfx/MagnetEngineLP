import React, { useState } from 'react';
import { Save, Sparkles, ChevronRight, ChevronLeft, CheckCircle, RefreshCw, Settings as SettingsIcon, Zap, ChevronDown, CalendarClock, Webhook, Bot } from 'lucide-react';
import { AppConfig } from '../../lib/types';
import { NICHE_PRESETS, type NichePreset } from '../../lib/presets';
import { usePlan } from '../../contexts/PlanContext';
import { useToast } from '../common/Toast';
import {
    buildSystemPrompt,
    buildReplySystemPrompt,
    isLegacyGeneratedPrompt,
    DEFAULT_REPLY_SYSTEM_PROMPT,
    TONE_OPTIONS,
    type PromptIdentity,
    type OfferLedger,
} from '../../lib/prompt';

interface SettingsPanelProps {
    config: AppConfig;
    onUpdateConfig: (config: AppConfig) => void;
}

/** Weekdays in a month — the horizon the daily cap is really spent over, since
 *  the extension only sends while the Operator has Instagram open. */
const WORKING_DAYS = 22;

/**
 * Colour on this page follows one rule, because it is six near-identical
 * section cards and the eye needs something to group them by:
 *
 *   `info`  — the two panels that configure the AI itself (Prompt Wizard,
 *             Reply Assistant), including their focus rings.
 *   `brand` — every other section: things the Operator configures.
 *
 * Both render monochrome in the dashboard today; the rule is kept because it
 * is what decides where a colour would go if one came back.
 *
 * That rule is why two hues went away. Violet is retired outright
 * (docs/DESIGN-TOKENS.md); the Reply Assistant folds to `info` because it *is*
 * the AI, while the preset picker folds to `brand` with the other config
 * sections rather than to `neutral` — Lead Filtering and Booking Link were
 * already `brand`, so `neutral` would have invented a third treatment for a
 * section that behaves exactly like them. Integrations was `info` but a webhook
 * is plumbing, not generation, so it moves the other way, to `brand`.
 *
 * The upshot: `info` here means "the AI" and nothing else, which is the whole
 * point of reserving it.
 */

// ─── Onboarding Wizard ──────────────────────────────────────────────────────

type WizardStep = 1 | 2 | 3 | 4 | 5;

/** The wizard collects exactly what the prompt module needs. */
type WizardData = PromptIdentity;

const STEP_LABELS = ['Business', 'Value Prop', 'Your Offer', 'Tone & Style', 'Review'];

/**
 * Read the identity back off a stored config.
 *
 * Written once rather than at each of the three call sites that needed it,
 * because the list is now seventeen fields and the previous hand-copied version
 * was already one field short the day the Offer Ledger landed — a miss there is
 * silent, and its only symptom is a prompt that quietly stops mentioning your
 * price.
 */
function identityOf(config: AppConfig): PromptIdentity {
    return {
        founderName: config.founderName ?? '',
        founderRole: config.founderRole ?? '',
        businessName: config.businessName ?? '',
        businessNiche: config.businessNiche ?? '',
        targetAudience: config.targetAudience ?? '',
        valueProposition: config.valueProposition ?? '',
        exampleDM: config.exampleDM ?? '',
        dmTone: config.dmTone ?? 'casual',
        proofPoint: config.proofPoint,
        removedSacrifice: config.removedSacrifice,
        timeToResult: config.timeToResult,
        freeGive: config.freeGive,
        price: config.price,
        priceAnchor: config.priceAnchor,
        guarantee: config.guarantee,
        callLength: config.callLength,
        callPromise: config.callPromise,
    };
}

/**
 * The Offer Ledger, as nine questions.
 *
 * Every placeholder is a worked example rather than a description, because the
 * placeholder is what most Operators will copy the shape of — and the shape is
 * the whole lesson. "9 booked calls in 3 weeks for a 2-person agency in Leeds"
 * teaches proximate and ordinary; "we get amazing results" teaches nothing and
 * is also what an empty box invites.
 */
const LEDGER_FIELDS: { key: keyof OfferLedger; label: string; placeholder: string }[] = [
    { key: 'proofPoint', label: 'One real result you have produced', placeholder: '9 booked calls in 3 weeks for a 2-person agency in Leeds' },
    { key: 'removedSacrifice', label: 'What they do NOT have to do', placeholder: 'without hiring a VA or posting every day' },
    { key: 'timeToResult', label: 'How fast it happens', placeholder: 'inside the first 30 days' },
    { key: 'freeGive', label: 'One useful thing you will give away free', placeholder: 'the 3-line profile audit I run before writing anything' },
    { key: 'price', label: 'Your price', placeholder: '$197/mo' },
    { key: 'priceAnchor', label: 'What it normally costs', placeholder: '$497/mo' },
    { key: 'guarantee', label: 'Your guarantee', placeholder: '7 days, money back' },
    { key: 'callLength', label: 'How long the call is', placeholder: '15 minutes' },
    { key: 'callPromise', label: 'What they get on the call even if they never buy', placeholder: 'a written 30-day outreach plan' },
];

// ─── Preset Picker ──────────────────────────────────────────────────────────

interface PresetPickerProps {
    onApply: (preset: NichePreset) => void;
}

const PresetPicker: React.FC<PresetPickerProps> = ({ onApply }) => {
    const [open, setOpen] = useState(false);
    const [applied, setApplied] = useState<string | null>(null);

    const handleApply = (preset: NichePreset) => {
        onApply(preset);
        setApplied(preset.id);
        setOpen(false);
        setTimeout(() => setApplied(null), 3000);
    };

    return (
        <div className="bg-surface-raised border border-white/5 rounded-2xl overflow-hidden">
            <button
                onClick={() => setOpen(v => !v)}
                className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-white/[0.02] transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
                        <Zap className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-white">Quick-Start Niche Preset</h3>
                        <p className="text-label text-neutral-400">Pick your niche to pre-fill all settings instantly</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {applied && (
                        <span className="text-label text-white bg-white/10 border border-white/20 px-2.5 py-1 rounded-full font-medium">
                            Applied ✓
                        </span>
                    )}
                    <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
                </div>
            </button>

            {open && (
                <div className="px-6 pb-6 border-t border-white/5 pt-4">
                    <p className="text-label text-neutral-400 mb-4">
                        Selecting a preset fills your AI prompt, bio keywords, follower range, and suggested search terms. You can edit anything after.
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {NICHE_PRESETS.map(preset => (
                            <button
                                key={preset.id}
                                onClick={() => handleApply(preset)}
                                className="flex flex-col items-start gap-1.5 p-3.5 rounded-xl border border-white/6 bg-white/[0.02] hover:border-white/30 hover:bg-white/5 transition-colors duration-200 text-left group"
                            >
                                <span className="text-xl leading-none">{preset.emoji}</span>
                                <span className="text-xs font-semibold text-white leading-snug group-hover:text-white transition-colors">
                                    {preset.name}
                                </span>
                                <span className="text-label text-neutral-400 leading-snug">{preset.description}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Component ──────────────────────────────────────────────────────────────

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ config, onUpdateConfig }) => {
    const { limits } = usePlan();
    const dailyCap = config.dailySendCap ?? 40;
    const toast = useToast();
    const [wizardStep, setWizardStep] = useState<WizardStep>(
        config.onboardingComplete ? 5 : 1
    );
    const [wizard, setWizard] = useState<WizardData>(() => identityOf(config));

    const updateWizard = (patch: Partial<WizardData>) => setWizard(prev => ({ ...prev, ...patch }));

    /**
     * The AI SDR's persona used to stay "You are the founder of MagnetEngine"
     * for every Operator, because nothing regenerated it when the wizard ran.
     * Regenerate it from the new identity — unless the Operator has written
     * their own, which we detect by checking whether the stored value is still
     * one this module would have produced.
     */
    const regeneratedReplyPrompt = (data: PromptIdentity): string | undefined => {
        const current = config.replySystemPrompt ?? '';
        const machineWritten =
            current === '' ||
            current === DEFAULT_REPLY_SYSTEM_PROMPT ||
            // A persona generated at an older recipe version is still ours to
            // replace — without this, re-running the wizard would preserve a
            // stale prompt as if the Operator had typed it.
            isLegacyGeneratedPrompt(current) ||
            current === buildReplySystemPrompt(identityOf(config));
        return machineWritten ? buildReplySystemPrompt(data) : config.replySystemPrompt;
    };

    const handleApplyPreset = (preset: NichePreset) => {
        const p = preset.config;
        const newWizard: WizardData = {
            // A preset describes a niche, never the Operator — so their identity
            // and their Offer Ledger survive it untouched. A preset that
            // overwrote the Ledger would hand everyone the same invented proof.
            ...wizard,
            businessNiche: p.businessNiche ?? wizard.businessNiche,
            targetAudience: p.targetAudience ?? wizard.targetAudience,
            valueProposition: p.valueProposition ?? wizard.valueProposition,
            dmTone: p.dmTone ?? wizard.dmTone,
        };
        setWizard(newWizard);

        // Regenerate the system prompt from the merged wizard data so presets
        // benefit from the universal high-reply prompt too.
        const updatedConfig: AppConfig = {
            ...config,
            // Every PromptIdentity field, Ledger included. Listing them by hand
            // is how the Ledger would silently stop being persisted the next
            // time one was added.
            ...newWizard,
            systemPrompt: buildSystemPrompt(newWizard),
            replySystemPrompt: regeneratedReplyPrompt(newWizard),
            includeKeywords: p.includeKeywords ?? config.includeKeywords,
            excludeKeywords: p.excludeKeywords ?? config.excludeKeywords,
            minFollowers: p.minFollowers ?? config.minFollowers,
            maxFollowers: p.maxFollowers ?? config.maxFollowers,
            onboardingComplete: true,
        };
        onUpdateConfig(updatedConfig);
        setWizardStep(5); // jump to review so user sees what was generated
    };

    const handleGeneratePrompt = () => {
        const updated: AppConfig = {
            ...config,
            ...wizard,
            systemPrompt: buildSystemPrompt(wizard),
            replySystemPrompt: regeneratedReplyPrompt(wizard),
            onboardingComplete: true,
        };
        onUpdateConfig(updated);
        setWizardStep(5);
    };

    const handleUpdateKeywords = (type: 'includeKeywords' | 'excludeKeywords', value: string) => {
        const keywords = value.split(',').map(k => k.trim()).filter(Boolean);
        onUpdateConfig({ ...config, [type]: keywords });
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">

            {/* ── Niche Preset Picker ───────────────────────────────────── */}
            <PresetPicker onApply={handleApplyPreset} />

            {/* ── AI Onboarding Wizard ──────────────────────────────────── */}
            <div className="bg-surface-raised border border-white/5 rounded-2xl overflow-hidden">
                {/* Wizard header */}
                <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5">
                    <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-white">AI Prompt Wizard</h3>
                        <p className="text-label text-neutral-400">Tell us about your business and we'll craft the perfect outreach prompt</p>
                    </div>
                    {config.onboardingComplete && (
                        <span className="ml-auto flex items-center gap-1 text-label text-white bg-white/10 border border-white/20 px-2.5 py-1 rounded-full">
                            <CheckCircle className="w-3 h-3" /> Configured
                        </span>
                    )}
                </div>

                {/* Step indicator */}
                <div className="flex px-6 pt-5 gap-2">
                    {STEP_LABELS.map((label, i) => {
                        const step = (i + 1) as WizardStep;
                        const done = step < wizardStep;
                        const active = step === wizardStep;
                        return (
                            <React.Fragment key={label}>
                                <button
                                    onClick={() => setWizardStep(step)}
                                    className={`flex flex-col items-center gap-1 flex-1 transition-all ${active ? 'opacity-100' : 'opacity-50 hover:opacity-75'}`}
                                >
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                                        done ? 'bg-white text-surface' :
                                        active ? 'bg-white text-surface' :
                                        'bg-white/8 text-neutral-400'
                                    }`}>
                                        {done ? <CheckCircle className="w-3.5 h-3.5" /> : i + 1}
                                    </div>
                                    <span className={`text-label font-medium ${active ? 'text-white' : 'text-neutral-400'}`}>{label}</span>
                                </button>
                                {i < STEP_LABELS.length - 1 && (
                                    <div className={`flex-1 h-[1px] mt-3.5 transition-colors ${done ? 'bg-white/40' : 'bg-white/8'}`} />
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>

                {/* Step content */}
                <div className="px-6 py-5">
                    {wizardStep === 1 && (
                        <div className="space-y-4">
                            <h4 className="text-sm font-medium text-white mb-4">Tell us about your business</h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label htmlFor="settingspa-your-name" className="block text-xs text-neutral-400 mb-1.5">Your Name</label>
                                    <input id="settingspa-your-name"
                                        type="text"
                                        value={wizard.founderName}
                                        onChange={e => updateWizard({ founderName: e.target.value })}
                                        placeholder="e.g. Marcus"
                                        className="w-full bg-surface border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-white/50"
                                    />
                                    <p className="text-label text-neutral-400 mt-1">The DMs are written as if from you.</p>
                                </div>
                                <div>
                                    <label htmlFor="settingspa-your-role" className="block text-xs text-neutral-400 mb-1.5">Your Role</label>
                                    <input id="settingspa-your-role"
                                        type="text"
                                        value={wizard.founderRole}
                                        onChange={e => updateWizard({ founderRole: e.target.value })}
                                        placeholder="e.g. founder, coach, consultant"
                                        className="w-full bg-surface border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-white/50"
                                    />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="settingspa-business-agency-name" className="block text-xs text-neutral-400 mb-1.5">Business / Agency Name</label>
                                <input id="settingspa-business-agency-name"
                                    type="text"
                                    value={wizard.businessName}
                                    onChange={e => updateWizard({ businessName: e.target.value })}
                                    placeholder="e.g. Apex Growth Agency"
                                    className="w-full bg-surface border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-white/50"
                                />
                            </div>
                            <div>
                                <label htmlFor="settingspa-your-niche-industry" className="block text-xs text-neutral-400 mb-1.5">Your Niche / Industry</label>
                                <input id="settingspa-your-niche-industry"
                                    type="text"
                                    value={wizard.businessNiche}
                                    onChange={e => updateWizard({ businessNiche: e.target.value })}
                                    placeholder="e.g. Social media marketing for e-commerce brands"
                                    className="w-full bg-surface border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-white/50"
                                />
                            </div>
                            <div>
                                <label htmlFor="settingspa-ideal-target-audience-icp" className="block text-xs text-neutral-400 mb-1.5">Ideal Target Audience (ICP)</label>
                                <input id="settingspa-ideal-target-audience-icp"
                                    type="text"
                                    value={wizard.targetAudience}
                                    onChange={e => updateWizard({ targetAudience: e.target.value })}
                                    placeholder="e.g. Founders of 7-figure DTC brands with 10k-500k followers"
                                    className="w-full bg-surface border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-white/50"
                                />
                            </div>
                        </div>
                    )}

                    {wizardStep === 2 && (
                        <div className="space-y-4">
                            <h4 className="text-sm font-medium text-white mb-4">What value do you deliver?</h4>
                            <div>
                                <label htmlFor="settingspa-core-value-proposition" className="block text-xs text-neutral-400 mb-1.5">Core Value Proposition</label>
                                <textarea id="settingspa-core-value-proposition"
                                    value={wizard.valueProposition}
                                    onChange={e => updateWizard({ valueProposition: e.target.value })}
                                    rows={3}
                                    placeholder="e.g. We run paid social ads that generate $3-5 for every $1 spent, guaranteed in 90 days or you don't pay."
                                    className="w-full bg-surface border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-white/50 resize-none"
                                />
                            </div>
                            <div>
                                <label htmlFor="settingspa-example-of-a-great-dm" className="block text-xs text-neutral-400 mb-1.5">Example of a great DM you've sent (optional)</label>
                                <textarea id="settingspa-example-of-a-great-dm"
                                    value={wizard.exampleDM}
                                    onChange={e => updateWizard({ exampleDM: e.target.value })}
                                    rows={3}
                                    placeholder="Paste a real DM that got a positive reply — the AI will match its style"
                                    className="w-full bg-surface border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-white/50 resize-none"
                                />
                            </div>
                        </div>
                    )}

                    {wizardStep === 3 && (
                        <div className="space-y-4">
                            <h4 className="text-sm font-medium text-white mb-1">What are you actually allowed to say?</h4>
                            <p className="text-label text-neutral-400 leading-relaxed mb-4">
                                Your prompts refuse to invent a number, which is the right instinct and useless
                                without this. Leave a field blank and the AI will never mention it — it can only
                                say what you type here. Round down, never up: a claim that sounds too good reads
                                as a scam and costs you the reply a duller, believable one would have earned.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {LEDGER_FIELDS.map(field => (
                                    <div key={field.key} className={field.key === 'callPromise' ? 'sm:col-span-2' : undefined}>
                                        <label htmlFor={`ledger-${field.key}`} className="block text-xs text-neutral-400 mb-1.5">{field.label}</label>
                                        <input
                                            id={`ledger-${field.key}`}
                                            value={wizard[field.key] ?? ''}
                                            onChange={e => updateWizard({ [field.key]: e.target.value } as Partial<WizardData>)}
                                            placeholder={field.placeholder}
                                            className="w-full bg-surface border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-white/50"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {wizardStep === 4 && (
                        <div className="space-y-4">
                            <h4 className="text-sm font-medium text-white mb-4">Choose your outreach tone</h4>
                            <div className="grid grid-cols-2 gap-3">
                                {TONE_OPTIONS.map(tone => (
                                    <button
                                        key={tone.value}
                                        onClick={() => updateWizard({ dmTone: tone.value })}
                                        className={`text-left p-4 rounded-xl border transition-colors ${
                                            wizard.dmTone === tone.value
                                                ? 'bg-white/10 border-white/30 text-white'
                                                : 'bg-white/3 border-white/5 text-neutral-400 hover:border-white/15 hover:text-neutral-200'
                                        }`}
                                    >
                                        <div className="font-medium text-sm mb-1">{tone.label}</div>
                                        <div className="text-label text-neutral-400 leading-relaxed">{tone.description}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {wizardStep === 5 && (
                        <div className="space-y-4">
                            <h4 className="text-sm font-medium text-white mb-2">Your AI system prompt</h4>
                            <p className="text-label text-neutral-400 mb-3">
                                Generated from your wizard answers. You can edit it directly — changes save immediately.
                            </p>
                            <textarea
                                value={config.systemPrompt}
                                onChange={e => onUpdateConfig({ ...config, systemPrompt: e.target.value })}
                                rows={10}
                                className="w-full bg-surface border border-white/8 rounded-xl px-4 py-3 text-xs text-neutral-300 font-mono focus:outline-none focus:ring-1 focus:ring-white/50 resize-none leading-relaxed"
                            />
                            <button
                                onClick={() => setWizardStep(1)}
                                className="flex items-center gap-2 text-xs text-neutral-400 hover:text-neutral-300 transition-colors"
                            >
                                <RefreshCw className="w-3.5 h-3.5" /> Redo wizard
                            </button>
                        </div>
                    )}
                </div>

                {/* Wizard navigation */}
                {wizardStep < 5 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-white/5">
                        <button
                            onClick={() => setWizardStep(prev => Math.max(1, prev - 1) as WizardStep)}
                            disabled={wizardStep === 1}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-neutral-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronLeft className="w-4 h-4" /> Back
                        </button>

                        {wizardStep < 4 ? (
                            <button
                                onClick={() => setWizardStep(prev => (prev + 1) as WizardStep)}
                                className="flex items-center gap-2 px-5 py-2 bg-white/8 hover:bg-white/12 border border-white/10 rounded-xl text-sm text-white font-medium transition-colors"
                            >
                                Next <ChevronRight className="w-4 h-4" />
                            </button>
                        ) : (
                            <button
                                onClick={handleGeneratePrompt}
                                className="flex items-center gap-2 px-5 py-2 bg-white hover:bg-neutral-200 text-surface font-semibold rounded-xl text-sm transition-colors"
                            >
                                <Sparkles className="w-4 h-4" /> Generate Prompt
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* ── Lead Filtering Rules ─────────────────────────────────────── */}
            <div className="bg-surface-raised border border-white/5 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center">
                        <SettingsIcon className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-white">Lead Filtering Rules</h3>
                        <p className="text-label text-neutral-400">Applied after scraping to qualify leads</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label htmlFor="settingspa-must-include-keywords-in-bio" className="block text-xs text-neutral-400 mb-1.5">Must Include Keywords (in bio/name)</label>
                        <input id="settingspa-must-include-keywords-in-bio"
                            type="text"
                            defaultValue={config.includeKeywords.join(', ')}
                            onBlur={e => handleUpdateKeywords('includeKeywords', e.target.value)}
                            placeholder="founder, CEO, agency, entrepreneur"
                            className="w-full bg-surface border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-white/50"
                        />
                    </div>

                    <div>
                        <label htmlFor="settingspa-exclude-keywords" className="block text-xs text-neutral-400 mb-1.5">Exclude Keywords</label>
                        <input id="settingspa-exclude-keywords"
                            type="text"
                            defaultValue={config.excludeKeywords.join(', ')}
                            onBlur={e => handleUpdateKeywords('excludeKeywords', e.target.value)}
                            placeholder="bot, spam, fake, giveaway"
                            className="w-full bg-surface border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-white/50"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="settingspa-min-followers" className="block text-xs text-neutral-400 mb-1.5">Min Followers</label>
                            <input id="settingspa-min-followers"
                                type="number"
                                value={config.minFollowers}
                                onChange={e => onUpdateConfig({ ...config, minFollowers: Number(e.target.value) })}
                                className="w-full bg-surface border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/50"
                            />
                        </div>
                        <div>
                            <label htmlFor="settingspa-max-followers" className="block text-xs text-neutral-400 mb-1.5">Max Followers</label>
                            <input id="settingspa-max-followers"
                                type="number"
                                value={config.maxFollowers}
                                onChange={e => onUpdateConfig({ ...config, maxFollowers: Number(e.target.value) })}
                                className="w-full bg-surface border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/50"
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="settingspa-account-type-filter" className="block text-xs text-neutral-400 mb-1.5">Account Type Filter</label>
                        <select id="settingspa-account-type-filter"
                            value={config.accountType}
                            onChange={e => onUpdateConfig({ ...config, accountType: e.target.value as any })}
                            className="w-full bg-surface border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/50"
                        >
                            <option value="all">All accounts</option>
                            <option value="public">Public only</option>
                            <option value="private">Private only</option>
                        </select>
                    </div>

                    <div className="pt-2 border-t border-white/5">
                        <label htmlFor="settingspa-daily-send-limit" className="block text-xs text-neutral-400 mb-1.5">
                            Daily Send Limit
                        </label>
                        <div className="flex items-center gap-3">
                            <input id="settingspa-daily-send-limit"
                                type="number"
                                min={1}
                                max={limits.maxDailyCap}
                                value={dailyCap}
                                onChange={e => {
                                    onUpdateConfig({ ...config, dailySendCap: Math.min(limits.maxDailyCap, Math.max(1, Number(e.target.value))) });
                                }}
                                className="w-28 bg-surface border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/50"
                            />
                            <span className="text-xs text-neutral-400">DMs per day</span>
                        </div>
                        {/* Two meters, two different jobs: this cap is about not
                            tripping Instagram, the monthly credits are about
                            what the Owner pays the AI providers. They are not
                            the same number and should not be merged into one —
                            but the Operator picks the cap HERE, and until now
                            nothing on this screen mentioned that a cap they are
                            allowed to set can spend the month in two days. */}
                        {dailyCap * WORKING_DAYS > limits.maxDMGenerations && (
                            <p className="mt-2 text-label text-white/90 leading-relaxed">
                                At {dailyCap}/day you would spend all {limits.maxDMGenerations} monthly DM credits in
                                about {Math.max(1, Math.round(limits.maxDMGenerations / dailyCap))} days. Around{' '}
                                <strong>{Math.floor(limits.maxDMGenerations / WORKING_DAYS)}/day</strong> lasts a full month.
                            </p>
                        )}
                        <p className="mt-1.5 text-label text-neutral-400 leading-relaxed">
                            This cap paces sending so Instagram doesn't flag the account. Separately, your plan
                            includes {limits.maxDMGenerations} AI-written DMs a month.
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Booking Link ─────────────────────────────────────────────── */}
            <div className="bg-surface-raised border border-white/5 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center">
                        <CalendarClock className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-white">Booking Link</h3>
                        <p className="text-label text-neutral-400">Inserted into your reply battlecards in the Approval Queue</p>
                    </div>
                </div>
                <div>
                    <label htmlFor="settingspa-calendly-booking-page-url" className="block text-xs text-neutral-400 mb-1.5">Calendly / booking page URL</label>
                    <input id="settingspa-calendly-booking-page-url"
                        type="url"
                        value={config.calendarLink ?? ''}
                        onChange={e => onUpdateConfig({ ...config, calendarLink: e.target.value })}
                        placeholder="https://calendly.com/yourname/15min"
                        className="w-full bg-surface border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-white/50"
                    />
                </div>
            </div>

            {/* ── AI Reply Assistant (Inbox) — `info`, it configures the AI ── */}
            <div className="bg-surface-raised border border-white/5 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-white">AI Reply Assistant</h3>
                        <p className="text-label text-neutral-400">How the AI answers inbound DMs in your Inbox and books calls</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label htmlFor="settingspa-reply-persona-amp-instructions" className="block text-xs text-neutral-400 mb-1.5">Reply persona &amp; instructions</label>
                        <textarea id="settingspa-reply-persona-amp-instructions"
                            value={config.replySystemPrompt ?? ''}
                            onChange={e => onUpdateConfig({ ...config, replySystemPrompt: e.target.value })}
                            rows={8}
                            placeholder="Describe how the AI should reply to prospects, handle objections, and steer toward booking a call…"
                            className="w-full bg-surface border border-white/8 rounded-xl px-4 py-3 text-xs text-neutral-300 font-mono focus:outline-none focus:ring-1 focus:ring-white/50 resize-none leading-relaxed"
                        />
                        <p className="text-label text-neutral-400 mt-1">Your booking link (set above) is shared automatically once a prospect shows interest.</p>
                    </div>

                    <label className="flex items-start gap-3 p-3.5 rounded-xl border border-white/8 bg-white/[0.02] cursor-pointer">
                        <input
                            type="checkbox"
                            checked={!!config.autopilot}
                            onChange={e => onUpdateConfig({ ...config, autopilot: e.target.checked })}
                            className="accent-white mt-0.5"
                        />
                        <div>
                            <div className="text-sm text-white font-medium">Autopilot — reply automatically</div>
                            <p className="text-label text-neutral-400 mt-0.5">
                                When on, the AI answers new inbound DMs on its own (paced by your DM delay and daily cap) while a dashboard tab is open. When off, replies wait for your approval in the Inbox.
                            </p>
                        </div>
                    </label>
                </div>
            </div>

            {/* ── Integrations — Zapier / Make — `brand`, plumbing not AI ──── */}
            <div className="bg-surface-raised border border-white/5 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center">
                        <Webhook className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-white">Integrations — Zapier / Make</h3>
                        <p className="text-label text-neutral-400">Push events to your CRM, Slack, or email the moment they happen</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label htmlFor="settingspa-webhook-url-zapier-catch-hook" className="block text-xs text-neutral-400 mb-1.5">Webhook URL (Zapier Catch Hook, Make, etc.)</label>
                        <input id="settingspa-webhook-url-zapier-catch-hook"
                            type="url"
                            value={config.webhookUrl ?? ''}
                            onChange={e => onUpdateConfig({ ...config, webhookUrl: e.target.value })}
                            placeholder="https://hooks.zapier.com/hooks/catch/…"
                            className="w-full bg-surface border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-white/50"
                        />
                        {!!config.webhookUrl && !config.webhookUrl.startsWith('https://') && (
                            <p className="text-label text-white/90 mt-1.5">
                                Must be an https:// URL — events won't fire until it is.
                            </p>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-4">
                        {([
                            { key: 'replied' as const, label: 'Lead replied' },
                            { key: 'positiveReply' as const, label: 'Positive reply' },
                            { key: 'booked' as const, label: 'Call booked' },
                        ]).map(({ key, label }) => {
                            const toggles = config.webhookEvents ?? { replied: false, positiveReply: true, booked: true };
                            return (
                                <label key={key} className="flex items-center gap-2 text-xs text-neutral-400 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={toggles[key]}
                                        onChange={e => onUpdateConfig({
                                            ...config,
                                            webhookEvents: { ...toggles, [key]: e.target.checked },
                                        })}
                                        className="accent-white"
                                    />
                                    {label}
                                </label>
                            );
                        })}
                    </div>

                    <p className="text-label text-neutral-400">
                        Each event POSTs JSON: {'{ event, timestamp, lead: { handle, name, followers, campaignId, dmContent } }'}. In Zapier, use "Webhooks by Zapier → Catch Hook".
                    </p>
                </div>
            </div>

            {/* ── Save button ─────────────────────────────────────────────── */}
            {/* Every control above already persists through onUpdateConfig, so
                this re-writes the current config and confirms. It used to call
                storage.setConfig directly — writing a second, diverging copy to
                localStorage — and then browser alert(). */}
            <button
                onClick={() => {
                    onUpdateConfig(config);
                    toast.success('Settings saved.');
                }}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-neutral-200 text-surface rounded-xl transition-colors font-semibold text-sm"
            >
                <Save className="w-4 h-4" />
                Save Settings
            </button>
        </div>
    );
};
