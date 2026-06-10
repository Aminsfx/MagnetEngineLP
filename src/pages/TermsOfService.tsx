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
                        Effective Date: February 27, 2026 &nbsp;·&nbsp; Last Updated: February 27, 2026
                    </p>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-10 text-sm text-blue-300">
                    <strong>Important:</strong> By creating an account or using MagnetEngine, you agree to these Terms. Please read them carefully, especially Section 6 regarding API Keys and Section 8 regarding Limitation of Liability.
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
                        MagnetEngine is a lead automation platform that allows users to import lead data, apply AI-powered filters, and generate personalized outreach messages. The Service may integrate with third-party AI providers (such as OpenAI, Anthropic, or others) at the user's direction.
                    </p>
                </Section>

                <Section title="5. Acceptable Use">
                    <p>You agree not to:</p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Use the Service for unlawful purposes or to violate any applicable laws or regulations.</li>
                        <li>Send unsolicited, harassing, or abusive communications through the platform.</li>
                        <li>Attempt to gain unauthorized access to any system or data.</li>
                        <li>Reverse engineer, decompile, or disassemble any part of the Service.</li>
                        <li>Use the Service in any way that disrupts, damages, or impairs its functionality.</li>
                    </ul>
                </Section>

                <Section title="6. Third-Party API Keys — User Responsibility">
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-300 mb-4">
                        <strong>⚠️ Critical Notice:</strong> This section critically affects your rights. Please read carefully.
                    </div>
                    <p>
                        MagnetEngine allows you to connect third-party AI service API keys (e.g., from OpenAI, Anthropic, Google, or other providers) to enhance the functionality of the Service ("User API Keys").
                    </p>
                    <p>
                        <strong className="text-white">You are solely and exclusively responsible for:</strong>
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>The safeguarding, confidentiality, and security of any API keys you enter into the Service.</li>
                        <li>Any costs, charges, overages, or fees billed by third-party API providers as a result of your API key usage through the Service.</li>
                        <li>Any unauthorized use, exposure, theft, or misuse of API keys you provide to the Service.</li>
                        <li>Rotating or revoking compromised API keys immediately upon suspicion of unauthorized access.</li>
                        <li>Compliance with all terms and conditions of the respective third-party API providers.</li>
                    </ul>
                    <p>
                        <strong className="text-white">MagnetEngine does not:</strong>
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Transmit your API keys to any party other than the designated third-party provider for the purpose of completing your requested actions.</li>
                        <li>Permanently store your User API Keys on our servers beyond what is required for your active session or as locally stored in your browser.</li>
                        <li>Guarantee that any locally-stored API key data is immune from exposure due to device compromise, browser vulnerabilities, or other factors outside our control.</li>
                    </ul>
                    <p>
                        <strong className="text-white">WE EXPRESSLY DISCLAIM ALL LIABILITY</strong> for any losses, damages, claims, costs, or consequences — direct, indirect, incidental, consequential, or punitive — arising from or related to the exposure, theft, unauthorized access, or misuse of any User API Keys entered into the Service, regardless of the cause. This includes but is not limited to: data breaches, security vulnerabilities, third-party service errors, device compromise, network interception, or your own negligence in managing API key credentials.
                    </p>
                </Section>

                <Section title="7. Intellectual Property">
                    <p>
                        All content, features, and functionality of the Service — including but not limited to text, graphics, logos, icons, and software — are the exclusive property of MagnetEngine and are protected by applicable intellectual property laws. You may not reproduce, distribute, or create derivative works without our express written consent.
                    </p>
                </Section>

                <Section title="8. Limitation of Liability">
                    <p>
                        TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, MAGNETENGINE AND ITS OFFICERS, EMPLOYEES, AGENTS, PARTNERS, AND LICENSORS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO: LOSS OF PROFITS, LOSS OF DATA, LOSS OF GOODWILL, SERVICE INTERRUPTION, COMPUTER DAMAGE, SYSTEM FAILURE, OR THE COST OF SUBSTITUTE SERVICES, ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE OR THESE TERMS.
                    </p>
                    <p>
                        IN NO EVENT SHALL OUR TOTAL CUMULATIVE LIABILITY TO YOU FOR ALL CLAIMS ARISING FROM OR RELATING TO THE SERVICE EXCEED THE GREATER OF (A) THE AMOUNTS YOU PAID TO US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM OR (B) ONE HUNDRED U.S. DOLLARS ($100).
                    </p>
                </Section>

                <Section title="9. Disclaimer of Warranties">
                    <p>
                        THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, AND TITLE. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS.
                    </p>
                </Section>

                <Section title="10. Indemnification">
                    <p>
                        You agree to defend, indemnify, and hold harmless MagnetEngine and its officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses — including reasonable legal fees — arising out of or in any way related to: (a) your access to or use of the Service; (b) your violation of these Terms; (c) your violation of any third-party rights, including privacy or intellectual property rights; or (d) any User API Keys you provide to the Service.
                    </p>
                </Section>

                <Section title="11. Modifications to Terms">
                    <p>
                        We reserve the right to update or modify these Terms at any time. We will notify you of material changes by posting the updated Terms on this page and updating the "Last Updated" date. Your continued use of the Service after changes become effective constitutes your acceptance of the revised Terms.
                    </p>
                </Section>

                <Section title="12. Governing Law">
                    <p>
                        These Terms shall be governed by and construed in accordance with the laws of the applicable jurisdiction, without regard to its conflict of law principles. Any disputes arising under these Terms shall be resolved through binding arbitration or in the courts of competent jurisdiction.
                    </p>
                </Section>

                <Section title="13. Contact">
                    <p>
                        If you have any questions about these Terms, please contact us at:{' '}
                        <a href="mailto:legal@magnetengine.ai" className="text-blue-500 hover:text-blue-400 transition-colors">
                            legal@magnetengine.ai
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
