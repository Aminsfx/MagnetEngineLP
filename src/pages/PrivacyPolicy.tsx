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

const PrivacyPolicy: React.FC = () => {
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
                    <h1 className="text-4xl font-bold text-white mb-3">Privacy Policy</h1>
                    <p className="text-zinc-500 text-sm">
                        Effective Date: February 27, 2026 &nbsp;·&nbsp; Last Updated: February 27, 2026
                    </p>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-10 text-sm text-blue-300">
                    <strong>Summary:</strong> MagnetEngine does not sell your personal data. You never need to enter any API keys or third-party credentials — all AI and data services are provided and managed by us as part of your subscription.
                </div>

                <Section title="1. Introduction">
                    <p>
                        MagnetEngine ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform ("Service"). By using the Service, you consent to the practices described in this Policy.
                    </p>
                </Section>

                <Section title="2. Information We Collect">
                    <p><strong className="text-white">a) Information you provide directly:</strong></p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Account registration details (e.g., name, email address, password).</li>
                        <li>Profile information you choose to provide.</li>
                        <li>Communications with our support team.</li>
                    </ul>
                    <p><strong className="text-white">b) Information collected automatically:</strong></p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Usage data such as pages visited, features used, and timestamps.</li>
                        <li>Device information including browser type, operating system, and IP address.</li>
                        <li>Cookies and similar tracking technologies for session management and analytics.</li>
                    </ul>
                    <p><strong className="text-white">c) Information NOT collected by us:</strong></p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Third-party API keys or credentials — the Service never asks you for any (see Section 5).</li>
                        <li>The content of AI-generated messages beyond what is needed to display them to you.</li>
                        <li>Your Instagram password — the Service and its extension operate only through your own logged-in browser session and never see or store your Instagram credentials.</li>
                    </ul>
                </Section>

                <Section title="3. How We Use Your Information">
                    <p>We use the information we collect to:</p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Provide, operate, and maintain the Service.</li>
                        <li>Authenticate your identity and manage your account.</li>
                        <li>Communicate with you about updates, security alerts, and support.</li>
                        <li>Monitor and analyze usage to improve the Service.</li>
                        <li>Comply with legal obligations and enforce our Terms of Service.</li>
                        <li>Detect and prevent fraud, abuse, or security incidents.</li>
                    </ul>
                    <p>We do <strong className="text-white">not</strong> sell, rent, or trade your personal information to third parties for marketing purposes.</p>
                </Section>

                <Section title="4. Cookies and Tracking">
                    <p>
                        We use cookies and similar technologies to maintain session state, remember your preferences, and perform analytics. You can control cookie usage through your browser settings, though disabling cookies may affect the functionality of the Service.
                    </p>
                    <p>
                        We may use third-party analytics services (such as Vercel Analytics or similar) that collect anonymized usage data. These services have their own privacy policies governing the use of such data.
                    </p>
                </Section>

                <Section title="5. AI Services — Managed by Us">
                    <p>
                        MagnetEngine provides all AI generation and data services as part of your subscription. You never enter, store, or manage any third-party API keys or credentials in the Service.
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li><strong className="text-white">Nothing for you to secure:</strong> Because you provide no credentials, there are no API keys of yours to expose, leak, or rotate. The service credentials the platform runs on belong to us and are managed and paid for by us.</li>
                        <li><strong className="text-white">What is sent to AI providers:</strong> To generate a message, the Service transmits the relevant lead's public profile information (e.g., name, handle, bio) to our AI processing providers. This data is used solely to generate your message and is subject to those providers' data-processing terms.</li>
                        <li><strong className="text-white">Provider changes:</strong> We may change the underlying AI or data providers at any time to maintain quality and availability; this does not change what data of yours is processed.</li>
                    </ul>
                </Section>

                <Section title="6. Data Sharing and Disclosure">
                    <p>We do not sell your personal data. We may share your information only in the following limited circumstances:</p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li><strong className="text-white">Service Providers:</strong> With trusted vendors who assist in operating the Service (e.g., hosting, analytics), under strict confidentiality obligations.</li>
                        <li><strong className="text-white">Legal Compliance:</strong> When required by law, court order, or governmental authority.</li>
                        <li><strong className="text-white">Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets, your data may be transferred as part of that transaction.</li>
                        <li><strong className="text-white">Protection of Rights:</strong> To enforce our Terms of Service or protect the rights, property, or safety of MagnetEngine, our users, or others.</li>
                    </ul>
                </Section>

                <Section title="7. Data Security">
                    <p>
                        We implement industry-standard technical and organizational measures to protect your personal information, including SSL/TLS encryption, access controls, and regular security reviews. However, no method of transmission over the internet or electronic storage is 100% secure.
                    </p>
                    <p>
                        In the event of a data breach affecting your personal information, we will notify you in accordance with applicable law.
                    </p>
                </Section>

                <Section title="8. Data Retention">
                    <p>
                        We retain your personal information for as long as your account is active or as needed to provide the Service. You may request deletion of your account and associated data at any time. Certain data may be retained for legal compliance or legitimate business purposes.
                    </p>
                </Section>

                <Section title="9. Your Rights">
                    <p>Depending on your location, you may have the following rights regarding your personal data:</p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li><strong className="text-white">Access:</strong> Request a copy of the personal data we hold about you.</li>
                        <li><strong className="text-white">Correction:</strong> Request correction of inaccurate or incomplete data.</li>
                        <li><strong className="text-white">Deletion:</strong> Request deletion of your personal data ("right to be forgotten").</li>
                        <li><strong className="text-white">Portability:</strong> Request your data in a machine-readable format.</li>
                        <li><strong className="text-white">Objection:</strong> Object to the processing of your data for certain purposes.</li>
                        <li><strong className="text-white">Withdrawal of Consent:</strong> Withdraw consent where processing is based on consent.</li>
                    </ul>
                    <p>
                        To exercise any of these rights, contact us at{' '}
                        <a href="mailto:privacy@magnetengine.xyz" className="text-blue-500 hover:text-blue-400 transition-colors">
                            privacy@magnetengine.xyz
                        </a>.
                    </p>
                </Section>

                <Section title="10. Children's Privacy">
                    <p>
                        The Service is not directed to individuals under the age of 18. We do not knowingly collect personal information from minors. If you believe a minor has provided us with personal information, please contact us immediately and we will delete such data.
                    </p>
                </Section>

                <Section title="11. Changes to This Policy">
                    <p>
                        We may update this Privacy Policy from time to time. We will notify you of significant changes by posting the updated Policy on this page and updating the "Last Updated" date. Your continued use of the Service after changes are posted constitutes acceptance of the revised Policy.
                    </p>
                </Section>

                <Section title="12. Contact Us">
                    <p>
                        If you have any questions, concerns, or requests regarding this Privacy Policy, please contact us at:
                    </p>
                    <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-4 mt-2">
                        <p className="text-white font-medium">MagnetEngine</p>
                        <p>Email: <a href="mailto:privacy@magnetengine.xyz" className="text-blue-500 hover:text-blue-400 transition-colors">privacy@magnetengine.xyz</a></p>
                        <p>Legal inquiries: <a href="mailto:legal@magnetengine.xyz" className="text-blue-500 hover:text-blue-400 transition-colors">legal@magnetengine.xyz</a></p>
                    </div>
                </Section>

                <div className="border-t border-white/10 pt-8 mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-600">
                    <span>© 2026 MagnetEngine. All rights reserved.</span>
                    <Link to="/terms" className="text-blue-500 hover:text-blue-400 transition-colors">Terms of Service →</Link>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
