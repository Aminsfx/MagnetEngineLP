import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '../components/Logo';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="mb-10">
        <h2 className="text-xl font-semibold text-white mb-3 border-b border-white/10 pb-2">{title}</h2>
        <div className="text-zinc-400 text-sm leading-relaxed space-y-3">{children}</div>
    </div>
);

const TermsOfService: React.FC = () => {
    return (
        <div className="relative min-h-screen bg-black text-white overflow-hidden">
            <div className="fixed inset-0 grid-bg pointer-events-none z-0" />
            <div className="fixed inset-0 bg-gradient-to-b from-black via-blue-900/10 to-black pointer-events-none z-0" />

            <div className="relative z-10 max-w-3xl mx-auto px-6 py-16">
                <Link
                    to="/login"
                    className="inline-flex items-center text-sm text-zinc-500 hover:text-white transition-colors mb-10 group"
                >
                    <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                    Back
                </Link>

                {/* Header */}
                <div className="mb-12">
                    <div className="mb-4">
                        <Logo size="sm" linkTo="/" />
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-3">Terms of Service</h1>
                    <p className="text-zinc-500 text-sm">
                        Effective Date: February 27, 2026 &nbsp;·&nbsp; Last Updated: July 10, 2026
                    </p>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-10 text-sm text-blue-300">
                    <strong>Important:</strong> By creating an account or using MagnetEngine, you agree to these Terms. Please read them carefully, especially Section 6 regarding AI Services, Section 7 regarding Refunds, and Section 9 regarding Limitation of Liability.
                </div>

                <Section title="1. Acceptance of Terms">
                    <p>
                        These Terms of Service ("Terms") govern your access to and use of MagnetEngine ("Service"), operated by MagnetEngine ("we," "us," or "our"). By accessing or using our Service, you agree to be bound by these Terms. If you do not agree, do not use the Service.
                    </p>
                </Section>

                <Section title="2. Eligibility">
                    <p>
                        You must be at least 18 years old to use the Service. By using MagnetEngine, you represent and warrant that you meet this requirement and that you have the legal capacity to enter into these Terms.
                    </p>
                </Section>

                <Section title="3. Account Registration">
                    <p>
                        You are responsible for maintaining the confidentiality of your account credentials, including your password and any linked OAuth credentials (e.g., Google). You agree to notify us immediately of any unauthorized use of your account. We are not liable for any losses caused by unauthorized access to your account.
                    </p>
                </Section>

                <Section title="4. Description of Service">
                    <p>
                        MagnetEngine is a lead automation platform that allows users to find leads, apply AI-powered filters, and generate personalized outreach messages. All AI processing and data services used by the platform are provided, managed, and paid for by MagnetEngine — you do not need to supply, configure, or pay for any third-party API keys or accounts to use the Service.
                    </p>
                </Section>

                <Section title="5. Acceptable Use">
                    <p>You agree not to:</p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Use the Service for unlawful purposes or to violate any applicable laws or regulations.</li>
                        <li>Send unsolicited, harassing, or abusive communications through the platform.</li>
                        <li>Attempt to gain unauthorized access to any system or data.</li>
                        <li>Attempt to extract, copy, or misuse any credentials, API keys, or service integrations embedded in or used by the platform.</li>
                        <li>Circumvent, disable, or interfere with usage limits, quotas, or safety features of the Service.</li>
                        <li>Reverse engineer, decompile, or disassemble any part of the Service.</li>
                        <li>Use the Service in any way that disrupts, damages, or impairs its functionality.</li>
                    </ul>
                </Section>

                <Section title="6. AI Services — Provided by Us">
                    <p>
                        MagnetEngine provides all AI generation and data services as part of your subscription ("Included Services"). You do not enter, store, or manage any third-party API keys in the Service.
                    </p>
                    <p>
                        <strong className="text-white">The following applies to the Included Services:</strong>
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li><strong className="text-white">We pay the AI bills.</strong> All AI usage within your plan's limits is included in your subscription price at no extra cost to you.</li>
                        <li><strong className="text-white">Usage limits apply.</strong> Your plan includes defined monthly quotas (e.g., leads, campaigns, and AI message generations). Usage beyond these quotas may be throttled or paused until the next billing cycle.</li>
                        <li><strong className="text-white">Fair use.</strong> The Included Services are for your own business outreach. Reselling, sharing accounts, or automated bulk extraction of AI output beyond normal product use is prohibited.</li>
                        <li><strong className="text-white">Providers may change.</strong> We may add, remove, or substitute underlying AI or data providers at any time to maintain quality and availability, without notice, provided the core functionality of the Service is preserved.</li>
                        <li><strong className="text-white">No warranty on AI output.</strong> AI-generated messages are suggestions. You review and approve every message before it is sent, and you are solely responsible for the content of messages you approve and send.</li>
                    </ul>
                </Section>

                <Section title="7. Refunds — 7-Day Money-Back Guarantee">
                    <p>
                        We offer a 7-day money-back guarantee on your first payment. To qualify for a refund, all of the following conditions must be met:
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li><strong className="text-white">Timing:</strong> Your refund request must be received within seven (7) calendar days of your first payment. Requests received after day 7 are not eligible.</li>
                        <li><strong className="text-white">Genuine use:</strong> You must have completed the AI setup wizard and launched at least one campaign. The guarantee exists for people who tried the product, not for accounts that never used it.</li>
                        <li><strong className="text-white">Real outreach attempted:</strong> You must have approved and sent at least twenty (20) DMs through the platform during the 7-day period.</li>
                        <li><strong className="text-white">First-time customers only:</strong> The guarantee applies once per customer, on your first subscription payment only. Renewals, reactivations, and repeat purchases are not eligible.</li>
                        <li><strong className="text-white">No abuse:</strong> Accounts that exhaust their monthly quotas (e.g., bulk-scraping leads or bulk-generating messages for export) and then request a refund are not eligible, at our reasonable discretion.</li>
                        <li><strong className="text-white">How to request:</strong> Email <a href="mailto:support@magnetengine.xyz" className="text-blue-500 hover:text-blue-400 transition-colors">support@magnetengine.xyz</a> from your account email with the subject "Refund request".</li>
                    </ul>
                    <p>
                        Approved refunds are issued to the original payment method within 5–10 business days, and your access ends when the refund is issued. Except as stated in this section, all payments are final and non-refundable, including partial billing periods after cancellation.
                    </p>
                </Section>

                <Section title="8. Intellectual Property">
                    <p>
                        All content, features, and functionality of the Service — including but not limited to text, graphics, logos, icons, and software — are the exclusive property of MagnetEngine and are protected by applicable intellectual property laws. You may not reproduce, distribute, or create derivative works without our express written consent.
                    </p>
                </Section>

                <Section title="9. Limitation of Liability">
                    <p>
                        TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, MAGNETENGINE AND ITS OFFICERS, EMPLOYEES, AGENTS, PARTNERS, AND LICENSORS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO: LOSS OF PROFITS, LOSS OF DATA, LOSS OF GOODWILL, SERVICE INTERRUPTION, COMPUTER DAMAGE, SYSTEM FAILURE, OR THE COST OF SUBSTITUTE SERVICES, ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE OR THESE TERMS.
                    </p>
                    <p>
                        IN NO EVENT SHALL OUR TOTAL CUMULATIVE LIABILITY TO YOU FOR ALL CLAIMS ARISING FROM OR RELATING TO THE SERVICE EXCEED THE GREATER OF (A) THE AMOUNTS YOU PAID TO US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM OR (B) ONE HUNDRED U.S. DOLLARS ($100).
                    </p>
                </Section>

                <Section title="10. Disclaimer of Warranties">
                    <p>
                        THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, AND TITLE. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS. WE DO NOT GUARANTEE ANY SPECIFIC BUSINESS RESULTS, REPLY RATES, BOOKED CALLS, OR REVENUE FROM YOUR USE OF THE SERVICE.
                    </p>
                </Section>

                <Section title="11. Indemnification">
                    <p>
                        You agree to defend, indemnify, and hold harmless MagnetEngine and its officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses — including reasonable legal fees — arising out of or in any way related to: (a) your access to or use of the Service; (b) your violation of these Terms; (c) your violation of any third-party rights, including privacy or intellectual property rights; or (d) the content of any messages you approve and send through the Service.
                    </p>
                </Section>

                <Section title="12. Modifications to Terms">
                    <p>
                        We reserve the right to update or modify these Terms at any time. We will notify you of material changes by posting the updated Terms on this page and updating the "Last Updated" date. Your continued use of the Service after changes become effective constitutes your acceptance of the revised Terms.
                    </p>
                </Section>

                <Section title="13. Governing Law">
                    <p>
                        These Terms shall be governed by and construed in accordance with the laws of the applicable jurisdiction, without regard to its conflict of law principles. Any disputes arising under these Terms shall be resolved through binding arbitration or in the courts of competent jurisdiction.
                    </p>
                </Section>

                <Section title="14. Contact">
                    <p>
                        If you have any questions about these Terms, please contact us at:{' '}
                        <a href="mailto:legal@magnetengine.xyz" className="text-blue-500 hover:text-blue-400 transition-colors">
                            legal@magnetengine.xyz
                        </a>
                    </p>
                </Section>

                <div className="border-t border-white/10 pt-8 mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-600">
                    <span>© 2026 MagnetEngine. All rights reserved.</span>
                    <Link to="/privacy" className="text-blue-500 hover:text-blue-400 transition-colors">Privacy Policy →</Link>
                </div>
            </div>
        </div>
    );
};

export default TermsOfService;
