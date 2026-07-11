import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const faqData = [
    {
        question: "How does it actually work?",
        answer: "You type in a keyword, something like 'SMMA' or 'business coach', and MagnetEngine pulls up matching Instagram profiles. The AI then looks at each person's account and content and writes a personal DM just for them. You review every message before anything goes out, approve the ones you like, and the Chrome extension takes care of the sending while you get on with your day."
    },
    {
        question: "Do I need my own AI account or API keys?",
        answer: "No. All the AI is built in, managed by us and paid for by us. You never create an account with any AI company, never paste a key anywhere, and never get a surprise bill from anyone. Your subscription is the only cost. You log in and it just works."
    },
    {
        question: "What do I need to get started?",
        answer: "An Instagram account and an offer, that's it. No spreadsheets, no tech setup, nothing to connect. The setup wizard takes about five minutes: you tell it what you sell and who you sell to, and it builds your outreach style for you. The Chrome extension installs in one click and you can be sending the same day."
    },
    {
        question: "Is my Instagram account safe?",
        answer: "Safety is the whole point of how we built this. Messages go out one at a time with natural gaps of 15 to 45 minutes, the way a real person sends, and there's a daily cap you control. Nothing sends without your approval. Everything runs from your own browser too, so we never see or store your Instagram password."
    },
    {
        question: "How does the 7-day money-back guarantee work?",
        answer: "Give it a real shot in your first week: finish the 5-minute setup wizard, launch a campaign and send at least 20 approved DMs. If it's not for you, email support@magnetengine.xyz within 7 days of your first payment and we refund you in full, back on your card within 5 to 10 business days. It covers your first payment, once per customer. The full conditions are in our Terms."
    },
    {
        question: "Am I locked into a contract?",
        answer: "No contracts, no lock-in, no awkward cancellation calls. It's a simple subscription, monthly or annual, and you can cancel anytime with one email. If you cancel, you keep access until the end of what you already paid for and you're never billed again. Between the guarantee and cancel anytime, the risk is on us, not you."
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
