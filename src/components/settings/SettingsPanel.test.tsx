import { describe, it, expect } from 'vitest';
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
const Harness: React.FC<{ initial: AppConfig }> = ({ initial }) => {
    const [config, setConfig] = useState(initial);
    return <SettingsPanel config={config} onUpdateConfig={setConfig} />;
};

function renderPanel(initial: AppConfig = base) {
    render(<ToastProvider><Harness initial={initial} /></ToastProvider>);
    return { script: () => screen.getByLabelText(/Reply persona/) as HTMLTextAreaElement };
}

describe('SettingsPanel — the reply assistant speaks for the Operator', () => {
    it('rewrites the reply script as the Operator types their business into the wizard', async () => {
        const { script } = renderPanel();
        expect(script().value).not.toContain('MagnetEngine');
        expect(screen.getByText(/Fill in the AI Prompt Wizard above/)).toBeInTheDocument();

        await userEvent.type(screen.getByLabelText('Business / Agency Name'), 'Apex Growth');
        await userEvent.type(screen.getByLabelText(/Ideal Target Audience/), 'DTC founders');

        expect(script().value).toContain('You are the founder of Apex Growth.');
        expect(script().value).toContain('You help DTC founders achieve');
        expect(screen.getByText(/Written from your answers/)).toBeInTheDocument();
    });

    it("replaces MagnetEngine's script once the Operator says who they are, without pressing Generate", async () => {
        // A config from before the seed was emptied: MagnetEngine's own identity.
        const { script } = renderPanel({
            ...base,
            ...LEGACY_SEED_IDENTITY,
            systemPrompt: buildSystemPrompt(LEGACY_SEED_IDENTITY),
            replySystemPrompt: buildReplySystemPrompt(LEGACY_SEED_IDENTITY),
        });
        const name = screen.getByLabelText('Business / Agency Name');
        await userEvent.clear(name);
        await userEvent.type(name, 'Noor Studio');

        expect(script().value).toContain('You are the founder of Noor Studio.');
        expect(script().value).not.toContain('You are the founder of MagnetEngine.');
    });

    it('keeps a script the Operator edited, and rebuilds it from their info on request', async () => {
        const { script } = renderPanel();
        await userEvent.type(screen.getByLabelText('Business / Agency Name'), 'Apex Growth');
        await userEvent.clear(script());
        await userEvent.type(script(), 'reply like a pirate');

        expect(screen.getByText(/You edited this script/)).toBeInTheDocument();
        await userEvent.type(screen.getByLabelText('Business / Agency Name'), ' Two');
        expect(script().value).toBe('reply like a pirate');

        await userEvent.click(screen.getByRole('button', { name: /Rebuild from my business info/ }));
        expect(script().value).toContain('You are the founder of Apex Growth Two.');
        expect(screen.queryByRole('button', { name: /Rebuild from my business info/ })).not.toBeInTheDocument();
    });
});
