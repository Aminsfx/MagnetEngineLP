import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const faqData = [
    {
        question: "How does it actually work?",
        answer: "You type in a keyword — say ‘SMMA’ or ‘business coach’ — and MagnetEngine pulls up matching Instagram profiles. From there, the AI reads each bio and writes a personalised DM for that specific person. You review every message before anything goes out, approve the ones you’re happy with, and the Chrome extension handles the sending while you get on with your day."
    },
    {
        question: "Do I need my own AI account or API keys?",
        answer: "No — nothing. All the AI power is built in, managed by us, and paid for by us. You never create an account with any AI provider, never paste an API key anywhere, and never get a surprise bill from anyone. Your subscription is the only cost. You log in, the AI just works."
    },
    {
        question: "What do I need to get started?",
        answer: "An Instagram account and an offer — that’s it. No spreadsheets, no tech setup, no integrations to wire up. The setup wizard takes about five minutes: tell it what you sell and who you sell to, and it builds your outreach voice for you. The Chrome extension installs in one click, and you’re sending the same day."
    },
    {
        question: "Is my Instagram account safe?",
        answer: "Safety is the whole design. Messages go out one at a time with natural 15–45 minute gaps, exactly like a human sends, with a hard daily cap you control. You approve every single message before it leaves — nothing sends without your sign-off. And everything runs from your own browser session: we never see, ask for, or store your Instagram password."
    },
    {
        question: "How does the 7-day money-back guarantee work?",
        answer: "Give it a real shot in your first week — complete the 5-minute setup wizard, launch a campaign, and send at least 20 approved DMs. If it’s not for you, email support@magnetengine.xyz within 7 days of your first payment and you get a full refund, back to your card within 5–10 business days. It applies to your first payment, once per customer — the full conditions are in our Terms."
    },
    {
        question: "Am I locked into a contract?",
        answer: "No contracts, no lock-in, no cancellation calls. It’s a simple subscription — monthly or annual — and you can cancel anytime with one email. If you cancel, you keep access until the end of the period you already paid for, and you’re never billed again. Between the guarantee and cancel-anytime, the risk sits with us, not you."
    }
];

const FAQItem: React.FC<{ question: string; answer: string }> = ({ question, answer }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="border-b border-white/5 py-6 group">
            <button
                className="flex w-full items-center justify-between text-left focus:outline-none transition-colors"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className={`text-[17px] font-medium transition-colors duration-300 ${isOpen ? 'text-emerald-400' : 'text-zinc-200 group-hover:text-white'}`}>{question}</span>
                <span className={`p-1.5 rounded-full transition-colors duration-300 flex-shrink-0 ${isOpen ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-zinc-400 group-hover:bg-white/10 group-hover:text-white'}`}>
                    {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </span>
            </button>
            <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-48 opacity-100 mt-4' : 'max-h-0 opacity-0'}`}
            >
                <div className="text-zinc-400 font-light leading-relaxed pr-8 text-[15px]">
                    {answer}
                </div>
            </div>
        </div>
    );
};

const FAQ = () => {
    return (
        <section id="faq" className="py-24 px-4 sm:px-6 lg:px-8 relative z-10 bg-[#030604]">
            <div className="max-w-3xl mx-auto">
                <div className="text-center mb-16 space-y-4">
                    <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-2">FAQ</div>
                    <h2 className="text-3xl sm:text-4xl font-semibold text-white tracking-tight drop-shadow-md">
                        Frequently Asked Questions
                    </h2>
                    <p className="text-zinc-400 font-light text-lg">
                        Everything you need to know about MagnetEngine.
                    </p>
                </div>
                <div className="space-y-2">
                    {faqData.map((item, index) => (
                        <FAQItem key={index} question={item.question} answer={item.answer} />
                    ))}
                </div>
            </div>
        </section>
    );
};

export default FAQ;
