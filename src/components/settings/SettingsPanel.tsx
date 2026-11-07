import React, { useEffect, useState } from 'react';
import { ChevronDown, RefreshCw, Undo2 } from 'lucide-react';
import { sendCapOf } from '../../lib/plans';
import type { AppConfig } from '../../lib/types';
import { INBOX_PAUSED } from '../../lib/routes';
import { NICHE_PRESETS, type NichePreset } from '../../lib/presets';
import { CARD_BEZEL } from '../../lib/theme';
import { usePlan } from '../../contexts/PlanContext';
import { useToast } from '../common/Toast';
import { NumberField } from '../common/NumberField';
import { ROW_PILL } from '../inbox/Copilot';
import {
    dmFollowsIdentity,
    identityOf,
    replyFollowsIdentity,
    withIdentity,
    TONE_OPTIONS,
    type OfferLedger,
    type PromptIdentity,
} from '../../lib/prompt';

interface SettingsPanelProps {
    config: AppConfig;
    onUpdateConfig: (config: AppConfig) => void;
    /** The Owner's workspace also sees the preset that sells MagnetEngine itself. */
    isOwner?: boolean;
}

/**
 * Settings, as one page of sections in the order an Operator sets them up:
 * who the messages come from, what they may claim, how they sound, who gets
 * them, how fast they go, what happens when someone answers, and where events
 * are sent.
 *
 * It replaces six stacked cards and a five-step wizard whose answers already
 * saved as they were typed, so its Next, Generate and Save buttons did nothing
 * an Operator could see. Everything here still saves through `onUpdateConfig`
 * on each change, and the page says so once, at the top, instead.
 *
 * The prompts are generated, so they sit folded under the section that
 * generates them, with a line saying whether they still follow the answers.
 */

/** Weekdays in a month — the horizon the daily cap is really spent over, since
 *  the extension only sends while the Operator has Instagram open. */
const WORKING_DAYS = 22;

const SECTIONS = [
    { id: 'settings-business', label: 'Your business' },
    { id: 'settings-claims', label: 'What the AI may claim' },
    { id: 'settings-voice', label: 'How DMs sound' },
    { id: 'settings-filters', label: 'Lead filters' },
    { id: 'settings-sending', label: 'Sending' },
    { id: 'settings-replies', label: INBOX_PAUSED ? 'Booking link' : 'Replies and booking' },
    { id: 'settings-integrations', label: 'Integrations' },
] as const;

/**
 * The Offer Ledger, in three groups of three.
 *
 * Every placeholder is a worked example rather than a description, because the
 * placeholder is what most Operators will copy the shape of — and the shape is
 * the whole lesson. "9 booked calls in 3 weeks for a 2-person agency in Leeds"
 * teaches proximate and ordinary; "we get amazing results" teaches nothing and
 * is also what an empty box invites.
 */
const LEDGER_GROUPS: {
    title: string;
    fields: { key: keyof OfferLedger; label: string; placeholder: string; hint?: string; wide?: boolean }[];
}[] = [
    {
        title: 'Results',
        fields: [
            { key: 'proofPoint', label: 'A real result you got for a client', placeholder: '9 booked calls in 3 weeks for a 2-person agency in Leeds', wide: true },
            { key: 'removedSacrifice', label: "What they don't have to do", placeholder: 'without hiring a VA or posting every day' },
            { key: 'timeToResult', label: 'How fast it happens', placeholder: 'inside the first 30 days' },
        ],
    },
    {
        title: 'Price',
        fields: [
            { key: 'price', label: 'Your price', placeholder: '$197/mo' },
            { key: 'priceAnchor', label: 'What it normally costs', placeholder: '$497/mo' },
            { key: 'guarantee', label: 'Your guarantee', placeholder: '7 days, money back' },
        ],
    },
    {
        title: 'The call',
        fields: [
            { key: 'callLength', label: 'How long the call is', placeholder: '15 minutes' },
            { key: 'callPromise', label: "What they get on it, even if they don't buy", placeholder: 'a written 30-day outreach plan' },
            {
                key: 'freeGive',
                label: "Something useful you'd give away free",
                placeholder: 'the 3-line profile audit I run before writing anything',
                hint: 'Lets some first DMs offer it instead of asking a question.',
                wide: true,
            },
        ],
    },
];

const LEDGER_KEYS = LEDGER_GROUPS.flatMap((g) => g.fields.map((f) => f.key));

const ACCOUNT_TYPES: { value: AppConfig['accountType']; label: string }[] = [
    { value: 'all', label: 'All accounts' },
    { value: 'public', label: 'Public only' },
    { value: 'private', label: 'Private only' },
];

const WEBHOOK_EVENTS = [
    { key: 'replied' as const, label: 'Lead replied' },
    { key: 'positiveReply' as const, label: 'Positive reply' },
    { key: 'booked' as const, label: 'Call booked' },
];

// ─── Building blocks ────────────────────────────────────────────────────────

const INPUT =
    'w-full rounded-xl border border-white/10 bg-surface-raised px-4 py-2.5 text-body-sm text-white ' +
    'placeholder:text-neutral-500 transition-colors hover:border-white/20 ' +
    'focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/10';

const TEXTAREA = `${INPUT} resize-y`;

/** A generated prompt is text the model reads, so it is shown as such. */
const PROMPT_TEXT =
    'w-full rounded-xl border border-white/10 bg-surface px-4 py-3 font-mono text-meta leading-relaxed text-neutral-300 ' +
    'resize-y transition-colors hover:border-white/20 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/10';

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40';

const Section: React.FC<{
    id: string;
    title: string;
    description: React.ReactNode;
    aside?: React.ReactNode;
    children: React.ReactNode;
}> = ({ id, title, description, aside, children }) => (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-6">
        <div className="rounded-[1.5rem] p-[1px]" style={CARD_BEZEL.outer}>
            <div className="rounded-[calc(1.5rem-1px)] bg-surface-sunken" style={CARD_BEZEL.inner}>
                <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 px-5 pb-5 pt-6 sm:px-6">
                    <div className="min-w-0 max-w-xl">
                        <h2 id={`${id}-title`} className="text-base font-semibold tracking-tight text-white">{title}</h2>
                        <p className="mt-1 text-meta text-neutral-400">{description}</p>
                    </div>
                    {aside}
                </header>
                <div className="divide-y divide-white/6 border-t border-white/6">{children}</div>
            </div>
        </div>
    </section>
);

/** One ruled band inside a section. */
const Group: React.FC<{ title?: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
    <div className={`space-y-4 px-5 py-5 sm:px-6 ${className ?? ''}`}>
        {title && <h3 className="text-meta font-semibold text-neutral-200">{title}</h3>}
        {children}
    </div>
);

const Field: React.FC<{
    id: string;
    label: string;
    hint?: React.ReactNode;
    className?: string;
    children: React.ReactNode;
}> = ({ id, label, hint, className, children }) => (
    <div className={className}>
        <label htmlFor={id} className="mb-1.5 block text-meta font-medium text-neutral-300">{label}</label>
        {children}
        {hint && <p id={`${id}-hint`} className="mt-1.5 text-meta text-neutral-400">{hint}</p>}
    </div>
);

/** The Approval Queue's stage track, as a choice of one. */
function Segmented<T extends string>({ labelledBy, value, options, onChange }: {
    labelledBy: string;
    value: T;
    options: { value: T; label: string }[];
    onChange: (value: T) => void;
}) {
    return (
        <div
            role="radiogroup"
            aria-labelledby={labelledBy}
            className="inline-flex max-w-full flex-wrap items-center gap-0.5 rounded-full border border-white/6 bg-white/4 p-1"
        >
            {options.map((o) => {
                const active = o.value === value;
                return (
                    <button
                        key={o.value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => onChange(o.value)}
                        className={`rounded-full px-3.5 py-1.5 text-meta font-medium transition-colors ${FOCUS} ${
                            active ? 'bg-surface text-white ring-1 ring-inset ring-white/12' : 'text-neutral-400 hover:text-white'
                        }`}
                    >
                        {o.label}
                    </button>
                );
            })}
        </div>
    );
}

/** The Inbox's Autopilot switch, without the pill around it. */
const Switch: React.FC<{ checked: boolean; onChange: (on: boolean) => void; labelledBy: string; describedBy?: string }> = ({
    checked, onChange, labelledBy, describedBy,
}) => (
    <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        onClick={() => onChange(!checked)}
        className={`flex-none rounded-full p-1 ${FOCUS}`}
    >
        <span aria-hidden className={`relative block h-[18px] w-8 rounded-full transition-colors ${checked ? 'bg-white' : 'bg-white/15'}`}>
            <span className={`absolute left-[2px] top-[2px] h-[14px] w-[14px] rounded-full transition-transform duration-200 ${
                checked ? 'translate-x-[14px] bg-surface' : 'bg-white'
            }`} />
        </span>
    </button>
);

/**
 * A generated prompt, folded. The line above it says whether it still follows
 * the answers on this page; once the Operator types over it, it is theirs and
 * the answers stop reaching it until they ask for a rebuild.
 */
const PromptEditor: React.FC<{
    id: string;
    title: string;
    label: string;
    value: string;
    placeholder?: string;
    status: string;
    edited: boolean;
    rebuildLabel: string;
    onChange: (value: string) => void;
    onRebuild: () => void;
}> = ({ id, title, label, value, placeholder, status, edited, rebuildLabel, onChange, onRebuild }) => {
    const [open, setOpen] = useState(false);
    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
                <div className="min-w-0 max-w-xl">
                    <h3 className="text-meta font-semibold text-neutral-200">{title}</h3>
                    <p className="mt-0.5 text-meta text-neutral-400">{status}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {edited && (
                        <button type="button" onClick={onRebuild} className={`${ROW_PILL} ${FOCUS}`}>
                            <RefreshCw className="h-3.5 w-3.5" aria-hidden /> {rebuildLabel}
                        </button>
                    )}
                    <button
                        type="button"
                        aria-expanded={open}
                        aria-controls={id}
                        onClick={() => setOpen((v) => !v)}
                        className={`${ROW_PILL} ${FOCUS}`}
                    >
                        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden />
                        {open ? 'Hide the prompt' : 'Show the prompt'}
                    </button>
                </div>
            </div>
            {open && (
                <div>
                    <label htmlFor={id} className="sr-only">{label}</label>
                    <textarea
                        id={id}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        rows={14}
                        spellCheck={false}
                        placeholder={placeholder}
                        className={PROMPT_TEXT}
                    />
                </div>
            )}
        </div>
    );
};

/** Comma-separated keywords, kept as typed until the field is left. */
const KeywordField: React.FC<{
    id: string;
    label: string;
    hint: string;
    placeholder: string;
    value: string[];
    onCommit: (keywords: string[]) => void;
}> = ({ id, label, hint, placeholder, value, onCommit }) => (
    <Field id={id} label={label} hint={hint}>
        <input
            // Remounts when the list changes from outside (a preset, an undo),
            // which an uncontrolled field would otherwise never show.
            key={value.join(',')}
            id={id}
            type="text"
            defaultValue={value.join(', ')}
            onBlur={(e) => onCommit(e.target.value.split(',').map((k) => k.trim()).filter(Boolean))}
            placeholder={placeholder}
            aria-describedby={`${id}-hint`}
            className={INPUT}
        />
    </Field>
);

/** The section list: a column beside the page on wide screens, a row above it on narrow ones. */
const SectionNav: React.FC = () => {
    const [active, setActive] = useState<string>(SECTIONS[0].id);

    useEffect(() => {
        if (typeof IntersectionObserver === 'undefined') return;
        const els = SECTIONS.map((s) => document.getElementById(s.id)).filter((el): el is HTMLElement => !!el);
        // A thin band a fifth of the way down the viewport: the section
        // crossing it is the one being read.
        const io = new IntersectionObserver((entries) => {
            const hit = entries
                .filter((e) => e.isIntersecting)
                .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
            if (hit) setActive(hit.target.id);
        }, { rootMargin: '-20% 0px -75% 0px' });
        els.forEach((el) => io.observe(el));
        return () => io.disconnect();
    }, []);

    const go = (id: string) => {
        setActive(id);
        const el = document.getElementById(id);
        if (!el) return;
        const reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        el.scrollIntoView?.({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    };

    return (
        <nav aria-label="Settings sections" className="lg:sticky lg:top-8 lg:self-start">
            <ul className="-mx-4 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
                {SECTIONS.map((s) => {
                    const current = s.id === active;
                    return (
                        <li key={s.id} className="flex-none">
                            <button
                                type="button"
                                onClick={() => go(s.id)}
                                aria-current={current ? 'location' : undefined}
                                className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-meta font-medium transition-colors lg:w-full lg:text-left ${FOCUS} ${
                                    current ? 'bg-white/6 text-white' : 'text-neutral-400 hover:text-white'
                                }`}
                            >
                                {s.label}
                            </button>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
};

// ─── Component ──────────────────────────────────────────────────────────────

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ config, onUpdateConfig, isOwner = false }) => {
    const { limits } = usePlan();
    const toast = useToast();
    const dailyCap = sendCapOf(config);
    const identity = identityOf(config);

    const [presetsOpen, setPresetsOpen] = useState(false);
    const [applied, setApplied] = useState<{ name: string; before: AppConfig } | null>(null);

    /**
     * What you type is what the AI uses. Every answer saves as it is typed, and
     * both prompts follow it unless the Operator edited one by hand
     * (`withIdentity`). The identity is read off the config on every render
     * rather than copied into this panel, so the two can never disagree.
     */
    const updateIdentity = (patch: Partial<PromptIdentity>) => {
        onUpdateConfig(withIdentity(config, { ...identity, ...patch }));
    };

    const applyPreset = (preset: NichePreset) => {
        const p = preset.config;
        // A preset describes a niche, never the Operator — so their identity
        // and their Offer Ledger survive it untouched. A preset that
        // overwrote the Ledger would hand everyone the same invented proof.
        const next: PromptIdentity = {
            ...identity,
            businessNiche: p.businessNiche ?? identity.businessNiche,
            targetAudience: p.targetAudience ?? identity.targetAudience,
            valueProposition: p.valueProposition ?? identity.valueProposition,
            dmTone: p.dmTone ?? identity.dmTone,
        };
        setApplied({ name: preset.name, before: config });
        setPresetsOpen(false);
        // `withIdentity` carries every PromptIdentity field, Ledger included;
        // listing them by hand is how the Ledger would silently stop being
        // persisted.
        onUpdateConfig({
            ...withIdentity(config, next, { dm: true }),
            includeKeywords: p.includeKeywords ?? config.includeKeywords,
            excludeKeywords: p.excludeKeywords ?? config.excludeKeywords,
            minFollowers: p.minFollowers ?? config.minFollowers,
            maxFollowers: p.maxFollowers ?? config.maxFollowers,
            onboardingComplete: true,
        });
    };

    const undoPreset = () => {
        if (!applied) return;
        onUpdateConfig(applied.before);
        setApplied(null);
    };

    const presets = NICHE_PRESETS.filter((p) => isOwner || p.id !== 'magnetengine');
    const hasIdentity = Boolean(identity.businessName.trim() || identity.valueProposition.trim() || identity.targetAudience.trim());
    const dmFollows = dmFollowsIdentity(config);
    const replyFollows = replyFollowsIdentity(config);
    const ledgerFilled = LEDGER_KEYS.filter((k) => identity[k]?.trim()).length;
    const tone = TONE_OPTIONS.find((t) => t.value === identity.dmTone) ?? TONE_OPTIONS[0];
    const webhookEvents = config.webhookEvents ?? { replied: false, positiveReply: true, booked: true };
    const webhookInvalid = !!config.webhookUrl && !config.webhookUrl.startsWith('https://');
    const creditsRunOut = dailyCap * WORKING_DAYS > limits.maxDMGenerations;
    const monthly = limits.maxDMGenerations.toLocaleString('en-US');

    return (
        <div className="lg:grid lg:grid-cols-[12.5rem_minmax(0,1fr)] lg:gap-10">
            <SectionNav />

            <div className="mt-4 space-y-6 lg:mt-0">

                {/* ── Your business ─────────────────────────────────────── */}
                <Section
                    id="settings-business"
                    title="Your business"
                    description="Your DMs and replies are written as you, about what you sell."
                    aside={
                        <button
                            type="button"
                            aria-expanded={presetsOpen}
                            aria-controls="settings-presets"
                            onClick={() => setPresetsOpen((v) => !v)}
                            className={`${ROW_PILL} ${FOCUS}`}
                        >
                            <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${presetsOpen ? 'rotate-180' : ''}`} aria-hidden />
                            Fill from a niche
                        </button>
                    }
                >
                    {presetsOpen && (
                        <Group>
                            <p className="text-meta text-neutral-400">
                                Fills what you do, who you help, what they get and your tone, plus your lead filters.
                                Your name, business name and claims stay as they are.
                            </p>
                            <ul id="settings-presets" className="grid gap-x-6 sm:grid-cols-2">
                                {presets.map((preset) => (
                                    <li key={preset.id} className="border-t border-white/6">
                                        <button
                                            type="button"
                                            onClick={() => applyPreset(preset)}
                                            className={`group -mx-2 w-[calc(100%+1rem)] rounded-xl px-2 py-3 text-left transition-colors hover:bg-white/4 ${FOCUS}`}
                                        >
                                            <span className="block text-body-sm font-medium text-neutral-100 group-hover:text-white">{preset.name}</span>
                                            <span className="mt-0.5 block text-meta text-neutral-400">{preset.description}</span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </Group>
                    )}

                    {applied && (
                        <div className="px-5 py-4 sm:px-6">
                            <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3">
                                <p className="text-body-sm text-neutral-300">
                                    Filled from <span className="text-white">{applied.name}</span>. Check the answers below.
                                </p>
                                <button type="button" onClick={undoPreset} className={`${ROW_PILL} ${FOCUS}`}>
                                    <Undo2 className="h-3.5 w-3.5" aria-hidden /> Undo
                                </button>
                            </div>
                        </div>
                    )}

                    <Group>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field id="settings-founder-name" label="Your first name" hint="DMs are written as if from you.">
                                <input
                                    id="settings-founder-name"
                                    type="text"
                                    value={identity.founderName}
                                    onChange={(e) => updateIdentity({ founderName: e.target.value })}
                                    placeholder="Marcus"
                                    autoComplete="given-name"
                                    aria-describedby="settings-founder-name-hint"
                                    className={INPUT}
                                />
                            </Field>
                            <Field id="settings-founder-role" label="Your role">
                                <input
                                    id="settings-founder-role"
                                    type="text"
                                    value={identity.founderRole}
                                    onChange={(e) => updateIdentity({ founderRole: e.target.value })}
                                    placeholder="founder, coach, consultant"
                                    className={INPUT}
                                />
                            </Field>
                        </div>
                        <Field id="settings-business-name" label="Business name" hint="Kept out of first DMs. Replies use it.">
                            <input
                                id="settings-business-name"
                                type="text"
                                value={identity.businessName}
                                onChange={(e) => updateIdentity({ businessName: e.target.value })}
                                placeholder="Apex Growth"
                                autoComplete="organization"
                                aria-describedby="settings-business-name-hint"
                                className={INPUT}
                            />
                        </Field>
                        <Field id="settings-niche" label="What you do">
                            <input
                                id="settings-niche"
                                type="text"
                                value={identity.businessNiche}
                                onChange={(e) => updateIdentity({ businessNiche: e.target.value })}
                                placeholder="Paid social for e-commerce brands"
                                className={INPUT}
                            />
                        </Field>
                        <Field id="settings-audience" label="Who you help">
                            <input
                                id="settings-audience"
                                type="text"
                                value={identity.targetAudience}
                                onChange={(e) => updateIdentity({ targetAudience: e.target.value })}
                                placeholder="Founders of 7-figure DTC brands"
                                className={INPUT}
                            />
                        </Field>
                        <Field
                            id="settings-outcome"
                            label="What they get"
                            hint="The result, in their words. A first DM turns it into its question, never a pitch."
                        >
                            <textarea
                                id="settings-outcome"
                                value={identity.valueProposition}
                                onChange={(e) => updateIdentity({ valueProposition: e.target.value })}
                                rows={2}
                                placeholder="More booked calls every week, without buying ads"
                                aria-describedby="settings-outcome-hint"
                                className={TEXTAREA}
                            />
                        </Field>
                    </Group>
                </Section>

                {/* ── What the AI may claim (the Offer Ledger) ─────────────── */}
                <Section
                    id="settings-claims"
                    title="What the AI may claim"
                    description="The AI only states a result, price or number you typed here. A blank field never comes up. Round down, never up."
                    aside={
                        <p className="text-meta text-neutral-400">
                            <span className="font-mono text-neutral-200">{ledgerFilled}</span> of {LEDGER_KEYS.length} filled
                        </p>
                    }
                >
                    {LEDGER_GROUPS.map((group) => (
                        <Group key={group.title} title={group.title}>
                            <div className="grid gap-4 sm:grid-cols-2">
                                {group.fields.map((f) => (
                                    <Field
                                        key={f.key}
                                        id={`ledger-${f.key}`}
                                        label={f.label}
                                        hint={f.hint}
                                        className={f.wide ? 'sm:col-span-2' : undefined}
                                    >
                                        <input
                                            id={`ledger-${f.key}`}
                                            type="text"
                                            value={identity[f.key] ?? ''}
                                            onChange={(e) => updateIdentity({ [f.key]: e.target.value } as Partial<PromptIdentity>)}
                                            placeholder={f.placeholder}
                                            aria-describedby={f.hint ? `ledger-${f.key}-hint` : undefined}
                                            className={INPUT}
                                        />
                                    </Field>
                                ))}
                            </div>
                        </Group>
                    ))}
                </Section>

                {/* ── How DMs sound ──────────────────────────────────────── */}
                <Section
                    id="settings-voice"
                    title="How DMs sound"
                    description="Each first DM is one or two short sentences: one detail from their profile and one question."
                >
                    <Group>
                        <p id="settings-tone-label" className="text-meta font-medium text-neutral-300">Tone</p>
                        <div className="space-y-2">
                            <Segmented
                                labelledBy="settings-tone-label"
                                value={identity.dmTone}
                                options={TONE_OPTIONS}
                                onChange={(dmTone) => updateIdentity({ dmTone })}
                            />
                            <p className="text-meta text-neutral-400">{tone.description}</p>
                        </div>
                    </Group>
                    <Group>
                        <Field
                            id="settings-example-dm"
                            label="A DM that got you a reply (optional)"
                            hint="The AI matches its tone and length, never its words."
                        >
                            <textarea
                                id="settings-example-dm"
                                value={identity.exampleDM}
                                onChange={(e) => updateIdentity({ exampleDM: e.target.value })}
                                rows={3}
                                placeholder="Paste one you actually sent"
                                aria-describedby="settings-example-dm-hint"
                                className={TEXTAREA}
                            />
                        </Field>
                    </Group>
                    <Group>
                        <PromptEditor
                            id="settings-dm-prompt"
                            title="The DM prompt"
                            label="DM prompt"
                            value={config.systemPrompt}
                            status={!dmFollows
                                ? 'You edited this prompt, so changes on this page no longer reach it.'
                                : hasIdentity
                                    ? 'Written from your answers on this page, and rewritten when you change them.'
                                    : 'Written from this page. Fill in Your business so it speaks for you.'}
                            edited={!dmFollows}
                            rebuildLabel="Rebuild from my answers"
                            onChange={(systemPrompt) => onUpdateConfig({ ...config, systemPrompt })}
                            onRebuild={() => {
                                onUpdateConfig(withIdentity(config, identity, { dm: true }));
                                toast.success('DM prompt rebuilt from your answers.');
                            }}
                        />
                    </Group>
                </Section>

                {/* ── Lead filters ──────────────────────────────────────── */}
                <Section
                    id="settings-filters"
                    title="Lead filters"
                    description="Every search is checked against these before a DM is written."
                >
                    <Group>
                        <KeywordField
                            id="settings-include"
                            label="Name or bio must mention"
                            hint="Any one of these words. Leave it blank to keep everyone."
                            placeholder="founder, CEO, agency, coach"
                            value={config.includeKeywords}
                            onCommit={(includeKeywords) => onUpdateConfig({ ...config, includeKeywords })}
                        />
                        <KeywordField
                            id="settings-exclude"
                            label="Skip anyone whose name or bio mentions"
                            hint="Checked before a profile's details load, so a skipped person costs you nothing."
                            placeholder="giveaway, crypto, follow for follow"
                            value={config.excludeKeywords}
                            onCommit={(excludeKeywords) => onUpdateConfig({ ...config, excludeKeywords })}
                        />
                    </Group>
                    <Group>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field id="settings-min-followers" label="Followers, at least">
                                <NumberField
                                    id="settings-min-followers"
                                    min={0}
                                    value={config.minFollowers}
                                    onCommit={(minFollowers) => onUpdateConfig({ ...config, minFollowers })}
                                    className={`${INPUT} font-mono`}
                                />
                            </Field>
                            <Field id="settings-max-followers" label="Followers, at most">
                                <NumberField
                                    id="settings-max-followers"
                                    min={0}
                                    value={config.maxFollowers}
                                    onCommit={(maxFollowers) => onUpdateConfig({ ...config, maxFollowers })}
                                    className={`${INPUT} font-mono`}
                                />
                            </Field>
                        </div>
                        <div className="space-y-1.5">
                            <p id="settings-account-type-label" className="text-meta font-medium text-neutral-300">Account type</p>
                            <Segmented
                                labelledBy="settings-account-type-label"
                                value={config.accountType}
                                options={ACCOUNT_TYPES}
                                onChange={(accountType) => onUpdateConfig({ ...config, accountType })}
                            />
                        </div>
                    </Group>
                </Section>

                {/* ── Sending ───────────────────────────────────────────── */}
                <Section
                    id="settings-sending"
                    title="Sending"
                    description="The extension sends from your own Instagram, one at a time with a pause between each, up to this many a day."
                >
                    <Group>
                        <Field
                            id="settings-daily-cap"
                            label="Daily limit"
                            hint={<>Up to <span className="font-mono text-neutral-300">{limits.maxDailyCap}</span> a day on your plan. Your plan also writes <span className="font-mono text-neutral-300">{monthly}</span> DMs a month.</>}
                        >
                            <div className="flex items-center gap-3">
                                <NumberField
                                    id="settings-daily-cap"
                                    min={1}
                                    max={limits.maxDailyCap}
                                    value={dailyCap}
                                    onCommit={(dailySendCap) => onUpdateConfig({ ...config, dailySendCap })}
                                    aria-describedby="settings-daily-cap-hint"
                                    className={`${INPUT} w-28 font-mono`}
                                />
                                <span className="text-meta text-neutral-400">DMs a day</span>
                            </div>
                        </Field>
                        {/* Two meters, two jobs: the cap paces sending so the
                            account isn't flagged; the monthly credits are what
                            the Owner pays the AI providers. Not merged, but a
                            cap the Operator may set can spend the month early,
                            and this is where they set it. */}
                        {creditsRunOut && (
                            <p role="status" className="rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3 text-body-sm text-neutral-300">
                                At <span className="font-mono text-white">{dailyCap}</span> a day, the month's{' '}
                                <span className="font-mono text-white">{monthly}</span> DMs run out in about{' '}
                                <span className="font-mono text-white">{Math.max(1, Math.round(limits.maxDMGenerations / dailyCap))}</span> days.
                                About <span className="font-mono text-white">{Math.floor(limits.maxDMGenerations / WORKING_DAYS)}</span> a day lasts the month.
                            </p>
                        )}
                    </Group>
                </Section>

                {/* ── Replies and booking ───────────────────────────────── */}
                <Section
                    id="settings-replies"
                    title={INBOX_PAUSED ? 'Booking link' : 'Replies and booking'}
                    description={INBOX_PAUSED
                        ? 'Where people go to book a call with you.'
                        : 'How the AI answers people who write back, and where it sends them to book.'}
                >
                    <Group>
                        <Field
                            id="settings-booking-link"
                            label="Booking link"
                            hint={INBOX_PAUSED ? undefined : 'The reply assistant shares it once someone is interested.'}
                        >
                            <input
                                id="settings-booking-link"
                                type="url"
                                inputMode="url"
                                value={config.calendarLink ?? ''}
                                onChange={(e) => onUpdateConfig({ ...config, calendarLink: e.target.value })}
                                placeholder="https://calendly.com/yourname/15min"
                                aria-describedby={INBOX_PAUSED ? undefined : 'settings-booking-link-hint'}
                                className={INPUT}
                            />
                        </Field>
                    </Group>

                    {!INBOX_PAUSED && (
                        <>
                            <Group>
                                <div className="flex items-start justify-between gap-6">
                                    <div className="min-w-0 max-w-xl">
                                        <h3 id="settings-autopilot-label" className="text-meta font-semibold text-neutral-200">Autopilot</h3>
                                        <p id="settings-autopilot-hint" className="mt-0.5 text-meta text-neutral-400">
                                            {config.autopilot
                                                ? 'On. The AI answers new messages without waiting for you, while a dashboard tab is open, paced by your daily limit.'
                                                : 'Off. Every reply waits for you to approve it in the Inbox.'}
                                        </p>
                                    </div>
                                    <Switch
                                        checked={!!config.autopilot}
                                        onChange={(autopilot) => onUpdateConfig({ ...config, autopilot })}
                                        labelledBy="settings-autopilot-label"
                                        describedBy="settings-autopilot-hint"
                                    />
                                </div>
                            </Group>
                            <Group>
                                <PromptEditor
                                    id="settings-reply-prompt"
                                    title="The reply script"
                                    label="Reply persona and instructions"
                                    value={config.replySystemPrompt ?? ''}
                                    placeholder="How the AI should answer prospects, handle objections and steer toward a call"
                                    status={!replyFollows
                                        ? 'You edited this script, so changes to your business no longer reach it.'
                                        : hasIdentity
                                            ? 'Written from Your business, and rewritten when you change it.'
                                            : 'Fill in Your business and this script will speak for you and your offer.'}
                                    edited={!replyFollows}
                                    rebuildLabel="Rebuild from my business"
                                    onChange={(replySystemPrompt) => onUpdateConfig({ ...config, replySystemPrompt })}
                                    onRebuild={() => {
                                        onUpdateConfig(withIdentity(config, identity, { reply: true }));
                                        toast.success('Reply script rebuilt from your business info.');
                                    }}
                                />
                            </Group>
                        </>
                    )}
                </Section>

                {/* ── Integrations ──────────────────────────────────────── */}
                <Section
                    id="settings-integrations"
                    title="Integrations"
                    description="Send an event to Zapier, Make or your CRM the moment it happens."
                >
                    <Group>
                        <Field
                            id="settings-webhook"
                            label="Webhook URL"
                            hint={webhookInvalid
                                ? <span className="text-danger-300">Use an https:// address. Nothing is sent until it is.</span>
                                : 'A Zapier Catch Hook, a Make webhook, or any https endpoint.'}
                        >
                            <input
                                id="settings-webhook"
                                type="url"
                                inputMode="url"
                                value={config.webhookUrl ?? ''}
                                onChange={(e) => onUpdateConfig({ ...config, webhookUrl: e.target.value })}
                                placeholder="https://hooks.zapier.com/hooks/catch/…"
                                aria-invalid={webhookInvalid || undefined}
                                aria-describedby="settings-webhook-hint"
                                className={`${INPUT} ${webhookInvalid ? 'border-danger-500/40' : ''}`}
                            />
                        </Field>
                        <fieldset>
                            <legend className="mb-2 text-meta font-medium text-neutral-300">Send these events</legend>
                            <div className="flex flex-wrap gap-x-6 gap-y-2">
                                {WEBHOOK_EVENTS.map(({ key, label }) => (
                                    <label key={key} className="flex cursor-pointer items-center gap-2 text-body-sm text-neutral-200">
                                        <input
                                            type="checkbox"
                                            checked={webhookEvents[key]}
                                            onChange={(e) => onUpdateConfig({ ...config, webhookEvents: { ...webhookEvents, [key]: e.target.checked } })}
                                            className="h-4 w-4 accent-white"
                                        />
                                        {label}
                                    </label>
                                ))}
                            </div>
                        </fieldset>
                        <p className="text-meta text-neutral-400">
                            Each event is a POST with a JSON body:{' '}
                            <code className="font-mono text-neutral-300">{'{ event, timestamp, lead: { handle, name, followers, campaignId, dmContent } }'}</code>
                        </p>
                    </Group>
                </Section>
            </div>
        </div>
    );
};
