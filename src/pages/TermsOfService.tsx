import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '../components/Logo';
import { SUPPORT_EMAIL } from '../lib/plans';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="mb-10">
        <h2 className="text-xl font-semibold text-white mb-3 border-b border-white/10 pb-2">{title}</h2>
        <div className="text-neutral-400 text-sm leading-relaxed space-y-3">{children}</div>
    </div>
);

const TermsOfService: React.FC = () => {
    return (
        <div className="relative min-h-screen bg-surface text-white overflow-hidden selection:bg-white/20 selection:text-white">
            <div className="fixed inset-0 grid-bg pointer-events-none z-0" />

            <div className="relative z-10 max-w-3xl mx-auto px-6 py-16">
                <Link
                    to="/login"
                    className="inline-flex items-center text-sm text-neutral-500 hover:text-white transition-colors mb-10 group"
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
                    <p className="text-neutral-500 text-sm">
                        Effective Date: February 27, 2026 &nbsp;·&nbsp; Last Updated: July 10, 2026
                    </p>
                </div>

                <div className="bg-white/[0.04] border border-white/10 rounded-xl p-4 mb-10 text-sm text-neutral-200">
                    <strong>Important:</strong> By creating an account or using MagnetEngine, you agree to these Terms. Please read them carefully, especially Section 6 regarding AI Services, Section 7 regarding the Free Trial and Billing, and Section 9 regarding Limitation of Liability.
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

                <Section title="7. Free Trial, Billing and Cancellation">
                    <p>
                        New subscriptions begin with a three (3) day free trial. The terms of the trial are as follows:
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li><strong className="text-white">Card required:</strong> A valid payment method is required to start the trial. You are not charged to begin it.</li>
                        <li><strong className="text-white">Full access:</strong> The trial gives you the complete product, including lead scraping, AI message generation and sending, subject to the same quotas as a paid subscription.</li>
                        <li><strong className="text-white">Cancel before day 4 and pay nothing:</strong> If you cancel at any point during the three-day trial period, you are charged nothing and your access ends at the close of the trial.</li>
                        <li><strong className="text-white">Automatic billing:</strong> If you do not cancel, your card is charged the then-current subscription price on day 4, and on the same date of each following month until you cancel.</li>
                        <li><strong className="text-white">How to cancel:</strong> Cancel in one click from your account page, or email <a href={`mailto:${SUPPORT_EMAIL}`} className="text-white underline decoration-white/30 underline-offset-4 hover:decoration-white transition-colors">{SUPPORT_EMAIL}</a> from your account email before the trial ends.</li>
                        <li><strong className="text-white">One trial per customer:</strong> The free trial is available once per customer. Repeat signups, reactivations and additional accounts are not eligible.</li>
                    </ul>
                    <p>
                        Cancelling stops all future charges and your access continues until the end of the period you have already paid for. Except where required by law, payments already taken are final and non-refundable, including partial billing periods after cancellation. We do not offer a money-back guarantee on paid periods — the free trial exists so that you can evaluate the product before paying.
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
                        <a href={`mailto:${SUPPORT_EMAIL}`} className="text-white underline decoration-white/30 underline-offset-4 hover:decoration-white transition-colors">{SUPPORT_EMAIL}</a>
                    </p>
                </Section>

                <div className="border-t border-white/10 pt-8 mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
                    <span>© 2026 MagnetEngine. All rights reserved.</span>
                    <Link to="/privacy" className="text-white underline decoration-white/30 underline-offset-4 hover:decoration-white transition-colors">Privacy Policy →</Link>
                </div>
            </div>
        </div>
    );
};

export default TermsOfService;
