
import React from 'react';
import { Filter, WandSparkles, ShieldCheck, TrendingUp } from 'lucide-react';

const Features: React.FC = () => {
  return (
    <section id="features" className="py-24 px-6 relative">
      <div className="max-w-6xl mx-auto space-y-16">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-medium text-white tracking-tight mb-4">Intelligent automation, not just a script.</h2>
          <p className="text-zinc-400">Powerful features designed to replace your manual prospecting workflow entirely.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 hover:bg-white/[0.08] transition-colors group">
            <div className="w-12 h-12 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center mb-6 group-hover:border-blue-500/30 transition-colors">
              <Filter className="text-zinc-400 group-hover:text-blue-400 transition-colors" size={24} />
            </div>
            <h3 className="text-xl text-white font-medium mb-3">Precision Filtering</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">Don't waste credits on bad leads. Filter thousands of prospects by criteria to find the top 1% who are ready to buy.</p>
          </div>

          {/* Card 2 */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 hover:bg-white/[0.08] transition-colors group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="w-12 h-12 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center mb-6 group-hover:border-blue-500/30 transition-colors">
              <WandSparkles className="text-zinc-400 group-hover:text-blue-400 transition-colors" size={24} />
            </div>
            <h3 className="text-xl text-white font-medium mb-3">AI Personalization</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">Compatible with OpenAI, Claude, and Gemini. It reads bios and posts to craft messages that feel 100% human-written.</p>
          </div>

          {/* Card 3 */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 hover:bg-white/[0.08] transition-colors group">
            <div className="w-12 h-12 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center mb-6 group-hover:border-blue-500/30 transition-colors">
              <ShieldCheck className="text-zinc-400 group-hover:text-blue-400 transition-colors" size={24} />
            </div>
            <h3 className="text-xl text-white font-medium mb-3">Plug-and-Play</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">No complex setup. Secure license system ensures you own your data. Export directly to Google Sheets instantly.</p>
          </div>

          {/* Wide Card */}
          <div className="md:col-span-3 bg-white/5 backdrop-blur-sm rounded-2xl p-8 md:p-12 relative overflow-hidden flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1 space-y-6 relative z-10">
              <h3 className="text-2xl text-white font-medium">Same results. Half the price. No course needed.</h3>
              <p className="text-zinc-400 text-lg">Most gurus sell you a $2,000 course on how to prospect. We just give you the software that does it for you.</p>

              <div className="flex items-center gap-8 pt-2">
                <div className="space-y-1">
                  <div className="text-2xl text-white font-medium">10x</div>
                  <div className="text-xs text-zinc-500 uppercase tracking-wide">Faster Outreach</div>
                </div>
                <div className="w-px h-12 bg-white/10"></div>
                <div className="space-y-1">
                  <div className="text-2xl text-white font-medium">100%</div>
                  <div className="text-xs text-zinc-500 uppercase tracking-wide">Done For You</div>
                </div>
              </div>
            </div>

            {/* Visual Graph Mockup */}
            <div className="flex-1 w-full relative">
              <div className="absolute inset-0 bg-blue-500/10 blur-[100px] rounded-full"></div>
              <div className="relative bg-black/40 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
                <div className="flex items-end gap-4 h-32 pb-6 border-b border-white/5">
                  <div className="w-full bg-zinc-800 rounded-t-sm h-[20%] relative group cursor-help">
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity">Manual</div>
                  </div>
                  <div className="w-full bg-zinc-700 rounded-t-sm h-[35%]"></div>
                  <div className="w-full bg-blue-900 rounded-t-sm h-[60%]"></div>
                  <div className="w-full bg-blue-500 rounded-t-sm h-[95%] relative shadow-[0_0_20px_rgba(59,130,246,0.5)] group">
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] text-blue-400 font-bold whitespace-nowrap">With MagnetEngine</div>
                  </div>
                </div>
                <div className="mt-4 flex justify-between items-center text-xs font-medium uppercase tracking-wider">
                  <span className="text-zinc-500">Calls Booked</span>
                  <span className="text-blue-400 flex items-center gap-1">
                    <TrendingUp size={12} /> +240% Increase
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
