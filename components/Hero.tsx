
import React from 'react';
import { Calendar, CirclePlay, Users, Hash, ShieldCheck, User, Sparkles, CircleCheck, ArrowRight } from 'lucide-react';

const Hero: React.FC = () => {
  return (
    <section className="pt-32 px-6 pb-20 relative">
      <div className="text-center max-w-4xl mx-auto space-y-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/20 bg-blue-500/10 text-blue-400 text-xs font-medium">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          V2.0 Now Available
        </div>

        <h1 className="text-5xl md:text-7xl leading-[1.1] font-medium text-white tracking-tight">
          Stop prospecting manually. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-blue-200 to-white">
            Clone yourself with AI.
          </span>
        </h1>

        <p className="text-lg md:text-xl leading-relaxed font-light text-zinc-400 max-w-2xl mx-auto">
          Automate your lead generation. MagnetEngine filters high-quality prospects and generates hyper-personalized DMs that get replies, not blocks.
        </p>

        <div className="flex flex-col md:flex-row items-center justify-center gap-4 pt-4">
          <button
            data-cal-link="magnetengine/15min"
            data-cal-namespace="15min"
            data-cal-config='{"layout":"month_view","useSlotsViewOnSmallScreen":"true"}'
            className="w-full md:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-all shadow-[0_0_20px_-5px_rgba(37,99,235,0.5)] flex items-center justify-center gap-2 group"
          >
            Start Automating
            <Calendar size={18} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
          <a href="#features" className="w-full md:w-auto px-8 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-medium rounded-lg transition-all flex items-center justify-center gap-2">
            <CirclePlay size={18} />
            Watch Workflow
          </a>
        </div>

        {/* UI Mockup */}
        <div className="mt-16 relative mx-auto max-w-4xl rounded-xl border border-white/10 bg-zinc-900/50 backdrop-blur-xl shadow-2xl overflow-hidden group">
          {/* Mac Window Controls */}
          <div className="h-8 border-b border-white/5 bg-zinc-900 flex items-center px-4 gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
            <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
            <div className="ml-auto text-xs text-zinc-600 flex items-center gap-1">
              <ShieldCheck size={12} />
              License Verified
            </div>
          </div>

          <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/5 h-auto md:h-[400px]">
            {/* Column 1: Sources */}
            <div className="p-6 space-y-4 bg-black/20 text-left">
              <div className="text-xs font-medium text-zinc-500 uppercase tracking-widest">Lead Source</div>
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-blue-900/10 border border-blue-500/20 flex items-center gap-3">
                  <Users className="text-blue-400" size={20} />
                  <div>
                    <div className="text-sm text-white">Competitor Followers</div>
                    <div className="text-xs text-zinc-500">2,403 leads found</div>
                  </div>
                </div>
                <div className="p-3 rounded-lg border border-white/5 opacity-50 flex items-center gap-3 grayscale">
                  <Hash className="text-zinc-400" size={20} />
                  <div>
                    <div className="text-sm text-zinc-300">Hashtag Search</div>
                    <div className="text-xs text-zinc-600">Idle</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Column 2: AI Processing */}
            <div className="p-6 space-y-4 relative overflow-hidden text-left">
              <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none"></div>
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium text-zinc-500 uppercase tracking-widest">AI Engine</div>
                <span className="text-[10px] bg-green-500/10 text-green-400 px-2 py-0.5 rounded border border-green-500/20">Active</span>
              </div>

              <div className="space-y-4 mt-4">
                <div className="flex gap-3 items-start animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/5 flex items-center justify-center shrink-0">
                    <User className="text-zinc-400" size={16} />
                  </div>
                  <div className="space-y-2 w-full">
                    <div className="h-2 w-24 bg-zinc-800 rounded"></div>
                    <div className="h-2 w-full bg-zinc-800 rounded"></div>
                    <div className="h-2 w-3/4 bg-zinc-800 rounded"></div>
                  </div>
                </div>

                <div className="p-3 bg-zinc-900 rounded border border-white/10 mt-4">
                  <div className="flex items-center gap-2 text-xs text-blue-300 mb-2">
                    <Sparkles size={12} />
                    Analyzing Bio & Context...
                  </div>
                  <div className="text-xs text-zinc-400 leading-relaxed font-mono">
                    {">"} Detected: Course Creator<br />
                    {">"} Pain Point: Scaling ads<br />
                    {">"} Strategy: Soft approach
                  </div>
                </div>
              </div>
            </div>

            {/* Column 3: Output */}
            <div className="p-6 space-y-4 bg-black/20 text-left">
              <div className="text-xs font-medium text-zinc-500 uppercase tracking-widest">Personalized DM</div>
              <div className="p-4 rounded-xl bg-gradient-to-br from-zinc-900 to-black border border-white/10 shadow-lg relative">
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-ping"></div>
                <div className="flex gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-800"></div>
                  <div>
                    <div className="text-sm font-medium text-white">To: @alex_marketing</div>
                    <div className="text-xs text-zinc-500">Just now</div>
                  </div>
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed italic">
                  "Hey Alex, saw your recent reel about ad fatigue. Loved the point about creative testing..."
                </p>
                <div className="mt-3 flex gap-2">
                  <span className="text-[10px] px-2 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">High Relevance</span>
                </div>
              </div>
              <div className="flex justify-center pt-2">
                <button className="text-xs text-zinc-500 hover:text-white flex items-center gap-1 transition-colors">
                  View all 42 generated <ArrowRight size={12} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
