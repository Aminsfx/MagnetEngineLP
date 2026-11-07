import { describe, it, expect, vi } from 'vitest';

vi.setConfig({ testTimeout: 20_000 });
import React, { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsPanel } from './SettingsPanel';
import { ToastProvider } from '../common/Toast';
import {
    buildReplySystemPrompt,
    buildSystemPrompt,
    DEFAULT_IDENTITY,
    LEGACY_SEED_IDENTITY,
} from '../../lib/prompt';
import type { AppConfig } from '../../lib/types';

const base: AppConfig = {
    systemPrompt: buildSystemPrompt(DEFAULT_IDENTITY),
    replySystemPrompt: buildReplySystemPrompt(DEFAULT_IDENTITY),
    includeKeywords: [],
    excludeKeywords: [],
    minFollowers: 0,
    maxFollowers: 500_000,
    accountType: 'all',
    selectedAIProvider: 'claude',
    dailySendCap: 40,
    ...DEFAULT_IDENTITY,
};

/** The panel with a config that updates the way DashboardShell's does. */
const Harness: React.FC<{ initial: AppConfig; isOwner?: boolean }> = ({ initial, isOwner }) => {
    const [config, setConfig] = useState(initial);
    return <SettingsPanel config={config} onUpdateConfig={setConfig} isOwner={isOwner} />;
};

function renderPanel(initial: AppConfig = base, isOwner = false) {
    render(<ToastProvider><Harness initial={initial} isOwner={isOwner} /></ToastProvider>);
    const reply = () => screen.getByLabelText(/Reply persona/) as HTMLTextAreaElement;
    const dm = () => screen.getByLabelText('DM prompt') as HTMLTextAreaElement;
    /** Both prompts are folded until asked for. */
    const showPrompts = async () => {
        for (const button of screen.getAllByRole('button', { name: 'Show the prompt' })) await userEvent.click(button);
    };
    return { reply, dm, showPrompts };
}

describe('SettingsPanel — the reply assistant speaks for the Operator', () => {
    it('rewrites the reply script as the Operator types their business', async () => {
        const { reply, showPrompts } = renderPanel();
        expect(screen.getByText(/Fill in Your business and this script/)).toBeInTheDocument();

        await userEvent.type(screen.getByLabelText('Business name'), 'Apex Growth');
        await userEvent.type(screen.getByLabelText('Who you help'), 'DTC founders');

        await showPrompts();
        expect(reply().value).not.toContain('MagnetEngine');
        expect(reply().value).toContain('You are the founder of Apex Growth.');
        expect(reply().value).toContain('You help DTC founders achieve');
        expect(screen.getByText(/Written from Your business/)).toBeInTheDocument();
    });

    it("replaces MagnetEngine's script once the Operator says who they are, without pressing anything", async () => {
        // A config from before the seed was emptied: MagnetEngine's own identity.
        const { reply, showPrompts } = renderPanel({
            ...base,
            ...LEGACY_SEED_IDENTITY,
            systemPrompt: buildSystemPrompt(LEGACY_SEED_IDENTITY),
            replySystemPrompt: buildReplySystemPrompt(LEGACY_SEED_IDENTITY),
        });
        const name = screen.getByLabelText('Business name');
        await userEvent.clear(name);
        await userEvent.type(name, 'Noor Studio');
        await showPrompts();

        expect(reply().value).toContain('You are the founder of Noor Studio.');
        expect(reply().value).not.toContain('You are the founder of MagnetEngine.');
    });

    it('keeps a script the Operator edited, and rebuilds it from their info on request', async () => {
        const { reply, showPrompts } = renderPanel();
        await userEvent.type(screen.getByLabelText('Business name'), 'Apex Growth');
        await showPrompts();
        await userEvent.clear(reply());
        await userEvent.type(reply(), 'reply like a pirate');

        expect(screen.getByText(/You edited this script/)).toBeInTheDocument();
        await userEvent.type(screen.getByLabelText('Business name'), ' Two');
        expect(reply().value).toBe('reply like a pirate');

        await userEvent.click(screen.getByRole('button', { name: /Rebuild from my business/ }));
        expect(reply().value).toContain('You are the founder of Apex Growth Two.');
        expect(screen.queryByRole('button', { name: /Rebuild from my business/ })).not.toBeInTheDocument();
    });
});

describe('SettingsPanel — the DM prompt', () => {
    it('follows the answers, and says so once the Operator types over it', async () => {
        const { dm, showPrompts } = renderPanel();
        await userEvent.type(screen.getByLabelText('Your first name'), 'Marcus');
        await showPrompts();
        expect(dm().value).toContain('You write as Marcus, founder at our business');

        await userEvent.type(dm(), ' Always mention Leeds.');
        expect(screen.getByText(/You edited this prompt/)).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: /Rebuild from my answers/ }));
        expect(dm().value).not.toContain('Always mention Leeds.');
        expect(screen.queryByText(/You edited this prompt/)).not.toBeInTheDocument();
    });

    it('saves the tone the moment it is picked', async () => {
        const { dm, showPrompts } = renderPanel();
        await showPrompts();
        await userEvent.click(screen.getByRole('radio', { name: 'Bold' }));
        expect(screen.getByRole('radio', { name: 'Bold' })).toHaveAttribute('aria-checked', 'true');
        expect(dm().value).toContain('Confident, with an actual point of view.');
    });
});

describe('SettingsPanel — niche presets', () => {
    it('fills the niche and the filters, leaves the Operator alone, and can be undone', async () => {
        renderPanel({ ...base, businessName: 'Apex Growth', proofPoint: '9 calls in 3 weeks' });
        await userEvent.click(screen.getByRole('button', { name: /Fill from a niche/ }));
        await userEvent.click(screen.getByRole('button', { name: /SMMA/ }));

        expect(screen.getByRole('status')).toHaveTextContent(/Filled from SMMA/);
        expect((screen.getByLabelText('What you do') as HTMLInputElement).value).toBe('Social media marketing agency');
        expect((screen.getByLabelText('Name or bio must mention') as HTMLInputElement).value).toContain('founder');
        expect((screen.getByLabelText('Business name') as HTMLInputElement).value).toBe('Apex Growth');
        expect((screen.getByLabelText('A real result you got for a client') as HTMLInputElement).value).toBe('9 calls in 3 weeks');

        await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
        expect((screen.getByLabelText('What you do') as HTMLInputElement).value).toBe('');
        expect((screen.getByLabelText('Name or bio must mention') as HTMLInputElement).value).toBe('');
    });

    it("offers the preset that sells MagnetEngine only in the Owner's workspace", async () => {
        renderPanel();
        await userEvent.click(screen.getByRole('button', { name: /Fill from a niche/ }));
        expect(screen.queryByRole('button', { name: /MagnetEngine Outreach/ })).not.toBeInTheDocument();
    });
});

describe('SettingsPanel — the claims', () => {
    it('counts the facts the AI is allowed to state', async () => {
        renderPanel();
        expect(screen.getByText(/of 9 filled/)).toHaveTextContent('0 of 9 filled');
        await userEvent.type(screen.getByLabelText('Your price'), '$197/mo');
        expect(screen.getByText(/of 9 filled/)).toHaveTextContent('1 of 9 filled');
    });
});
