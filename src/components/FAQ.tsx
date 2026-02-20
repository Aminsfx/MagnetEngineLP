import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const faqData = [
    {
        question: "1. Is MagnetEngine a monthly subscription?",
        answer: "No. You pay a one-time license fee for lifetime access. Unlike other tools that hit you with monthly bills, you own MagnetEngine forever. One closed deal usually covers your entire investment."
    },
    {
        question: "2. Do I need technical skills to use this?",
        answer: "Not at all. If you can use a Google Sheet, you can use MagnetEngine. To make it even easier, we include a 1-on-1 onboarding call where we handle the technical setup for you. You’ll leave the call with a system ready to book meetings."
    },
    {
        question: "3. Will this get my social media accounts banned?",
        answer: "No. MagnetEngine isn't a \"black-hat\" bot that takes over your account. It is a backend AI tool that filters your data and writes personalized messages for you. You stay in total control, keeping your accounts 100% safe."
    },
    {
        question: "4. How is this better than buying a lead-gen course?",
        answer: "A course gives you 40 hours of homework; MagnetEngine gives you a working machine. Instead of just learning how to find leads, our AI actually filters the data and writes the custom DMs for you. It’s automation, not just education."
    },
    {
        question: "5. What if I don't know who to target?",
        answer: "We’ve already solved that. Your license includes our Instagram and YouTube Targeting Sheets. We show you exactly which competitors to target and which keywords to use so the AI only focuses on prospects who are ready to buy."
    }
];

const FAQItem: React.FC<{ question: string; answer: string }> = ({ question, answer }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="border-b border-zinc-800 py-4">
            <button
                className="flex w-full items-center justify-between text-left focus:outline-none"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="text-lg font-medium text-zinc-100">{question}</span>
                {isOpen ? <ChevronUp className="h-5 w-5 text-zinc-500" /> : <ChevronDown className="h-5 w-5 text-zinc-500" />}
            </button>
            {isOpen && (
                <div className="mt-3 text-zinc-400 leading-relaxed">
                    {answer}
                </div>
            )}
        </div>
    );
};

const FAQ = () => {
    return (
        <section id="faq" className="py-24 px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-3xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                        Frequently Asked Questions
                    </h2>
                    <p className="text-zinc-400">
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
