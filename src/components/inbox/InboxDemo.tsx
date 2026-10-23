import React, { useCallback, useMemo, useState } from 'react';
import { InboxView } from './InboxView';
import { demoInbox } from '../../lib/inboxDemo';
import { aiAPI, withInstruction, type ReplyResult } from '../../lib/api';
import { DEFAULT_REPLY_SYSTEM_PROMPT } from '../../lib/prompt';
import { useToast } from '../common/Toast';
import { intake } from '../../lib/intake';
import type { AppConfig, Conversation, Lead, Message } from '../../lib/types';

/**
 * The Inbox over sample conversations, for `npm run demo` only. The copilot
 * calls the real reply function, so its drafts are real; sending, labels and
 * Autopilot stay in this component's memory and reach neither Instagram nor
 * the database.
 */
export const InboxDemo: React.FC<{ config: AppConfig }> = ({ config }) => {
    const toast = useToast();
    const initial = useMemo(() => demoInbox(), []);
    const [conversations, setConversations] = useState<Conversation[]>(initial.conversations);
    const [messages, setMessages] = useState<Message[]>(initial.messages);
    const [autopilot, setAutopilot] = useState(false);

    const demoConfig: AppConfig = useMemo(() => ({
        ...config,
        autopilot,
        instagramAccount: { id: 'demo', username: 'your-account', connectedAt: new Date().toISOString() },
    }), [config, autopilot]);

    const update = useCallback((c: Conversation) => {
        setConversations(prev => prev.map(x => (x.id === c.id ? c : x)));
    }, []);

    const generate = useCallback(async (c: Conversation, instruction?: string): Promise<ReplyResult> => {
        const history = messages
            .filter(m => m.conversationId === c.id)
            .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
            .map(m => ({ direction: m.direction, text: m.text }));
        const result = await aiAPI.generateReply(config.selectedAIProvider, {
            messages: history,
            contact: { handle: c.handle, name: c.name },
            systemPrompt: withInstruction(config.replySystemPrompt || DEFAULT_REPLY_SYSTEM_PROMPT, instruction),
            calendarLink: config.calendarLink,
        });
        if (!instruction) update({ ...c, intent: result.intent, status: result.intent === 'booked' ? 'booked' : c.status });
        return result;
    }, [config, messages, update]);

    // Deals stay in memory too: a sample handle can never become a real Lead.
    const [leads, setLeads] = useState<Lead[]>([]);
    const saveDeal = useCallback((c: Conversation, change: (lead: Lead) => Lead) => {
        setLeads(prev => {
            const existing = prev.find(l => l.handle === c.handle);
            const base = existing ?? intake({
                source: 'inbox', rows: [{ handle: c.handle, name: c.name }], campaignId: 'inbox-demo',
            }).leads[0];
            if (!base) return prev;
            const next = change(base);
            return existing ? prev.map(l => (l.id === next.id ? next : l)) : [...prev, next];
        });
    }, []);

    const send = useCallback((c: Conversation, text: string) => {
        const now = new Date().toISOString();
        setMessages(prev => [...prev, { id: `${c.id}-sent-${Date.now()}`, conversationId: c.id, direction: 'out', text, createdAt: now }]);
        update({ ...c, lastMessageAt: now, lastMessageText: text, needsReply: false, unread: false });
        toast.info('Preview: added to the sample thread. Nothing was sent.');
    }, [toast, update]);

    return (
        <div className="flex flex-col h-full gap-3">
            <p role="status" className="flex-none px-3.5 py-2 rounded-xl border border-white/15 bg-white/[0.05] text-meta text-neutral-300">
                <span className="text-white font-medium">Preview with sample conversations.</span> The copilot's drafts are
                real AI replies; nothing you send here leaves this page.
            </p>
            <div className="flex-1 min-h-0">
                <InboxView
                    conversations={conversations}
                    messages={messages}
                    leads={leads}
                    onSaveDeal={saveDeal}
                    config={demoConfig}
                    detected={null}
                    onGenerateReply={generate}
                    onSendReply={send}
                    onUpdateConversation={update}
                    onUpdateConfig={(next) => setAutopilot(!!next.autopilot)}
                    onDisconnectInstagram={() => toast.info('Preview: there is no real account connected.')}
                />
            </div>
        </div>
    );
};
