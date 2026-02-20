import React from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import LiveWorkflowDemo from '../components/LiveWorkflowDemo';
import Problem from '../components/Problem';
import Features from '../components/Features';
import SocialProof from '../components/SocialProof';
import FAQ from '../components/FAQ';
import CTA from '../components/CTA';
import Pricing from '../components/Pricing';
import Footer from '../components/Footer';

const LandingPage: React.FC = () => {
    return (
        <div className="relative min-h-screen">
            {/* Background Grid Elements */}
            <div className="fixed inset-0 grid-bg pointer-events-none z-0" />
            <div className="fixed inset-0 bg-gradient-to-b from-black via-transparent to-black pointer-events-none z-0" />

            <Navbar />

            <main className="relative z-10">
                <Hero />
                <LiveWorkflowDemo />
                <Problem />
                <Features />
                <SocialProof />
                <Pricing />
                <FAQ />
                <CTA />
            </main>

            <Footer />
        </div>
    );
};

export default LandingPage;
