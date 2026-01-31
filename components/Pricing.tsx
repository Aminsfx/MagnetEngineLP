
import React from 'react';
import { Check, Calendar } from 'lucide-react';

const features = [
    {
        title: "Prospect CRM Dashboard",
        description: "Organize and track every lead in one place."
    },
    {
        title: "Automated AI Outreach",
        description: "Generate personalized DMs instantly."
    },
    {
        title: "Proven Sales SOPs",
        description: "Step-by-step guides to booking calls."
    },
    {
        title: "Smart Lead Filtering",
        description: "Automatically remove unqualified leads."
    },
    {
        title: "Visual Pipeline (Kanban)",
        description: "Drag-and-drop deals from \"New\" to \"Sold.\""
    },
    {
        title: "Revenue Calculator",
        description: "Know exactly how many DMs hit your income goal."
    },
    {
        title: "Live Analytics",
        description: "Track replies and booked calls in real-time."
    },
    {
        title: "Plug-and-Play Setup",
        description: "No tech skills needed—start in minutes."
    }
];

const Pricing: React.FC = () => {
    return (
        <section id="pricing" className="py-24 px-6 relative overflow-hidden">
            <div className="max-w-6xl mx-auto relative z-10">
                <div className="text-center max-w-2xl mx-auto mb-16">
                    <h2 className="text-3xl md:text-5xl font-medium text-white tracking-tight mb-4">Complete Lead Mastery</h2>
                    <p className="text-zinc-400 text-lg">Everything you need to scale your outreach and dominate your niche.</p>
                </div>

                <div className="max-w-4xl mx-auto">
                    <div className="relative group">
                        {/* Background Glow */}
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>

                        <div className="relative bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-12">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12 border-b border-white/5 pb-8">
                                <div>
                                    <h3 className="text-3xl font-bold text-white mb-2">MagnetEngine Full Suite</h3>
                                    <p className="text-zinc-400 font-light max-w-sm">The all-in-one execution engine for modern sales teams and founders.</p>
                                </div>
                                <div className="flex flex-col gap-3 w-full md:w-auto">
                                    <button
                                        data-cal-link="magnetengine/15min"
                                        data-cal-namespace="15min"
                                        data-cal-config='{"layout":"month_view","useSlotsViewOnSmallScreen":"true"}'
                                        className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-full transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(37,99,235,0.3)] whitespace-nowrap"
                                    >
                                        <Calendar size={18} />
                                        Book a Discovery Call
                                    </button>
                                    <p className="text-center text-xs text-zinc-500 italic">Custom implementation & support included</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                                {features.map((feature, index) => (
                                    <div key={index} className="flex gap-4">
                                        <div className="mt-1 flex-shrink-0 w-5 h-5 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                                            <Check className="text-blue-400" size={12} strokeWidth={3} />
                                        </div>
                                        <div>
                                            <h4 className="text-white font-medium mb-1">{feature.title}</h4>
                                            <p className="text-zinc-400 text-sm leading-relaxed">{feature.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Pricing;
