import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConnectInstagram } from './ConnectInstagram';
import type { ExtensionStatus } from '../../lib/extensionProtocol';

const extension = (protocolVersion: number, needsUpdate: boolean): ExtensionStatus => ({
    state: 'ready', version: '1.10.1', protocolVersion, accepts: [], needsUpdate,
});

// The regression: the Connect screen asked for the latest extension, when all
// it needs is one that says whose inbox it read (protocol 4). Every time the
// protocol moved on, an Operator connecting in the days before the new build
// cleared the Chrome Web Store was told their copy "can't tell us which
// Instagram account it reads", which was false, and couldn't connect.
describe('connecting Instagram', () => {
    it('takes an extension that is behind the dashboard but reads whose inbox it is', () => {
        render(<ConnectInstagram extension={extension(4, true)} detected={null} onConnect={() => {}} />);

        expect(screen.getByText('Extension installed')).toBeInTheDocument();
        expect(screen.queryByText(/can't tell us which Instagram account/)).not.toBeInTheDocument();
    });

    it('still asks for an update from a build that cannot say whose inbox it read', () => {
        render(<ConnectInstagram extension={extension(3, true)} detected={null} onConnect={() => {}} />);

        expect(screen.getByText('Update the extension')).toBeInTheDocument();
    });
});
