import React from 'react';
import { Filter, WandSparkles, ShieldCheck, TrendingUp } from 'lucide-react';

const Features: React.FC = () => {
  return (
    <section id="features" className="py-32 px-6 relative bg-[#030604] border-t border-white/5">
      <div className="max-w-6xl mx-auto space-y-20">

        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-6">
          <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full border border-white/10 bg-white/[0.02] text-zinc-400 text-[10px] font-semibold uppercase tracking-widest">
            Why MagnetEngine?
          </div>
          <h2 className="text-4xl md:text-5xl font-medium text-white tracking-tight drop-shadow-md">
            Never Lose a Lead to <br className="hidden md:block" /> Poor Communication Again
          </h2>
          <p className="text-zinc-400 font-light text-lg">
            Three reasons why top agencies choose MagnetEngine over traditional scripts.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="bg-[#050A08] border border-emerald-500/10 rounded-3xl p-10 hover:border-emerald-500/30 transition-all duration-500 group relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent"></div>
            <div className="w-20 h-20 rounded-2xl bg-[#030604] border border-white/5 flex items-center justify-center mb-10 group-hover:border-emerald-500/30 group-hover:shadow-[inset_0_0_20px_rgba(16,185,129,0.1)] transition-all duration-500">
              <Filter className="text-zinc-300 group-hover:text-emerald-400 transition-colors" size={32} strokeWidth={1.5} />
            </div>
            <h3 className="text-lg text-white font-medium mb-4">Precision Filtering.</h3>
            <p className="text-[15px] text-zinc-500 font-light leading-relaxed">
              Don't waste credits on bad leads. Filter thousands of prospects by criteria to find the top 1% who are ready to buy.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-[#050A08] border border-cyan-500/10 rounded-3xl p-10 hover:border-cyan-500/30 transition-all duration-500 group relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent"></div>
            <div className="w-20 h-20 rounded-2xl bg-[#030604] border border-white/5 flex items-center justify-center mb-10 group-hover:border-cyan-500/30 group-hover:shadow-[inset_0_0_20px_rgba(34,211,238,0.1)] transition-all duration-500">
              <WandSparkles className="text-zinc-300 group-hover:text-cyan-400 transition-colors" size={32} strokeWidth={1.5} />
            </div>
            <h3 className="text-lg text-white font-medium mb-4">AI Personalization.</h3>
            <p className="text-[15px] text-zinc-500 font-light leading-relaxed">
              Compatible with top LLMs. It analyzes profiles and recent posts to craft messages that feel 100% human-written and contextual.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-[#050A08] border border-emerald-500/10 rounded-3xl p-10 hover:border-emerald-500/30 transition-all duration-500 group relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent"></div>
            <div className="w-20 h-20 rounded-2xl bg-[#030604] border border-white/5 flex items-center justify-center mb-10 group-hover:border-emerald-500/30 group-hover:shadow-[inset_0_0_20px_rgba(16,185,129,0.1)] transition-all duration-500">
              <ShieldCheck className="text-zinc-300 group-hover:text-emerald-400 transition-colors" size={32} strokeWidth={1.5} />
            </div>
            <h3 className="text-lg text-white font-medium mb-4">Plug-and-Play Scale.</h3>
            <p className="text-[15px] text-zinc-500 font-light leading-relaxed">
              No complex setup. Secure license system ensures you own your data. Export directly to your CRM or Sheets instantly.
            </p>
          </div>

          {/* Wide Card (Retained but restyled for consistency) */}
          <div className="md:col-span-3 bg-[#050A08] border border-white/5 rounded-3xl p-10 md:p-16 relative overflow-hidden flex flex-col md:flex-row items-center gap-16 group hover:border-emerald-500/20 transition-all duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

            <div className="flex-1 space-y-6 relative z-10">
              <h3 className="text-3xl text-white font-medium">Same results.<br /> Half the price.</h3>
              <p className="text-[15px] text-zinc-500 font-light leading-relaxed max-w-sm">
                Most gurus sell you a $2,000 course on how to prospect. We just give you the software that does it for you on autopilot.
              </p>

              <div className="flex items-center gap-10 pt-6 border-t border-white/5">
                <div className="space-y-1.5">
                  <div className="text-4xl text-emerald-400 font-medium tracking-tight">10x</div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium">Faster Outreach</div>
                </div>
                <div className="space-y-1.5">
                  <div className="text-4xl text-cyan-400 font-medium tracking-tight">100%</div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium">Done For You</div>
                </div>
              </div>
            </div>

            {/* Visual Graph Mockup */}
            <div className="flex-1 w-full relative">
              <div className="relative bg-[#030604]/80 border border-white/5 rounded-2xl p-8 shadow-2xl">
                <div className="flex items-end gap-6 h-40 pb-6 border-b border-white/5">
                  <div className="w-full bg-zinc-800/50 rounded h-[15%] relative group/bar hover:bg-zinc-700 transition-colors">
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs text-zinc-500 opacity-0 group-hover/bar:opacity-100 transition-opacity">Manual</div>
                  </div>
                  <div className="w-full bg-zinc-800/60 rounded h-[35%] hover:bg-zinc-700 transition-colors"></div>
                  <div className="w-full bg-emerald-900/30 rounded h-[50%] border-t border-emerald-500/20"></div>
                  <div className="w-full bg-gradient-to-t from-emerald-600/80 to-cyan-500 rounded relative group/bar shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-[11px] text-white font-medium whitespace-nowrap bg-[#030604] border border-emerald-500/30 px-3 py-1.5 rounded-full shadow-lg">MagnetEngine</div>
                  </div>
                </div>
                <div className="mt-8 flex justify-between items-center text-xs font-semibold uppercase tracking-widest">
                  <span className="text-zinc-600">Calls Booked</span>
                  <span className="text-emerald-400 flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                    <TrendingUp size={16} /> +240% Lift
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;
