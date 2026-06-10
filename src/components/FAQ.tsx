import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const faqData = [
    {
        question: "How does it actually work?",
        answer: "You type in a keyword — say ‘SMMA’ or ‘business coach’ — and MagnetEngine pulls up to 100 Instagram profiles that match. From there, the AI reads each bio and writes a personalised DM for that specific person. You review every message before anything goes out, approve the ones you’re happy with, and the Chrome extension handles the sending while you get on with your day."
    },
    {
        question: "What’s the difference between Test Mode and Production Mode?",
        answer: "Test Mode is for making sure everything’s dialled in — messages send with a short delay so you can see how it all flows without actually hitting real inboxes at speed. Production Mode is the real thing: messages go out with natural gaps between them, the way a real person would send. Starter gets Test Mode. Pro and Agency unlock Production."
    },
    {
        question: "How many DMs can I realistically send per day?",
        answer: "We usually tell people to start at 20–30 a day and build from there. Instagram rewards consistency over volume, so a steady 30 well-written DMs a day beats a one-time blast of 200. Pro and Agency users can push up to 200/day once their account has some warm history. The app lets you set your own cap so you’re always in control."
    },
    {
        question: "What does the 7-day guarantee actually mean?",
        answer: "Simple: send at least 20 DMs in the first 7 days using Production Mode, and if you don’t get at least 3 real replies, we refund your setup fee — no awkward back-and-forth. We put this in place because we’ve seen the system work consistently when people actually use it. The only ask is that you give it a real shot."
    },
    {
        question: "What kind of businesses does this work for?",
        answer: "Anything service-based that does outreach — agencies, coaches, consultants, freelancers, anyone selling a high-ticket offer and looking for clients on Instagram. If your ideal client has an Instagram account and a bio, MagnetEngine can find them and start a conversation. The Prompt Wizard in settings lets you tailor the voice and angle to whatever you’re selling."
    },
    {
        question: "What’s the Agency plan — is it just more features?",
        answer: "No, Agency is a completely different experience. You’re not running the software yourself — we run it for you. We write your outreach copy, pull fresh leads every week, send the campaigns, watch the replies, qualify the good ones, and drop confirmed calls straight onto your calendar. You show up to close. That’s it."
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
