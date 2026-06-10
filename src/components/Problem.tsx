import React from 'react';
import { CircleX, Sparkles, AlertTriangle, ArrowRight, CircleCheck } from 'lucide-react';

const Problem: React.FC = () => {
  return (
    <section id="problem" className="py-32 relative bg-[#030303] overflow-hidden border-t border-red-900/30">
      {/* Editorial aesthetic background element */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-red-900/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 lg:px-12 relative z-10">
        <div className="grid lg:grid-cols-12 gap-16 lg:gap-24 items-start">

          {/* Left Column - Editorial Text */}
          <div className="lg:col-span-6 space-y-10">
            <div className="space-y-6">
              <div className="flex items-center gap-3 text-red-500 font-mono text-xs uppercase tracking-widest font-semibold">
                <AlertTriangle size={14} className="text-red-600" />
                <span className="bg-red-950 text-red-400 px-2 py-1 rounded-sm">System Warning</span>
              </div>
              <h2 className="text-5xl lg:text-6xl font-serif text-white tracking-tighter leading-[1.1] pb-2">
                The "Old Way" is <span className="text-transparent bg-clip-text bg-gradient-to-br from-red-500 to-red-800 italic pr-2">killing</span><br /> your conversion rate.
              </h2>
              <p className="text-zinc-400 font-light leading-relaxed text-lg max-w-lg border-l-2 border-red-900/50 pl-6">
                Copy-pasting scripts doesn't work anymore. Prospects smell automation from a mile away. If you aren't personalizing, you're just spamming.
              </p>
            </div>

            <ul className="space-y-6 pt-4">
              {[
                { title: "Manual Data Entry", desc: "Hours wasted manually checking profiles and copying data." },
                { title: "Ignored Outreach", desc: "Generic 'Hey, quick question' messages left on read." },
                { title: "Empty Pipelines", desc: "Inconsistent lead flow and bare calendars." }
              ].map((item, idx) => (
                <li key={idx} className="flex items-start gap-5 group">
                  <div className="flex-shrink-0 mt-1 pb-1 border-b border-red-900/50 group-hover:border-red-500 transition-colors">
                    <span className="font-mono text-xs text-red-500/50 group-hover:text-red-400">0{idx + 1}</span>
                  </div>
                  <div>
                    <h4 className="text-zinc-200 font-medium tracking-wide mb-1 flex items-center gap-2">
                      {item.title}
                      {idx === 1 && <CircleX className="text-red-500 w-3 h-3" />}
                    </h4>
                    <p className="text-zinc-500 text-sm font-light">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Right Column - Industrial/Luxury Contrast */}
          <div className="lg:col-span-6 relative mt-12 lg:mt-0">

            {/* Connection Line */}
            <div className="hidden lg:block absolute left-[-3.5rem] top-[10%] bottom-[10%] w-px bg-gradient-to-b from-red-900/20 via-zinc-800 to-blue-900/20"></div>

            <div className="grid gap-12 relative">

              {/* Bad DM - Industrial / Brutalist */}
              <div className="relative group lg:ml-8 transform transition-transform duration-500 hover:-translate-y-1">
                <div className="absolute -inset-4 bg-red-950/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"></div>

                {/* Visual Connector */}
                <div className="hidden lg:block absolute -left-[2rem] top-1/2 w-[2rem] h-px bg-zinc-800"></div>

                <div className="relative bg-[#0a0a0a] border border-dashed border-zinc-700 p-6 rounded-none space-y-4 shadow-2xl">
                  <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                    <span className="font-mono text-xs text-zinc-500 uppercase tracking-widest hover:text-red-400 transition-colors">Legacy_Bot.exe</span>
                    <span className="font-mono text-[10px] text-zinc-600 bg-zinc-900 px-2 py-0.5 border border-zinc-800">STATUS: WARNING</span>
                  </div>
                  <div className="font-mono text-sm text-zinc-400 leading-relaxed opacity-60">
                    <span className="text-zinc-600">{">"} Input: </span> "Hi there! I help coaches get clients. Want to see my case study?"
                  </div>
                  <div className="flex items-center gap-2 pt-2 text-[11px] font-mono text-red-500/80 uppercase tracking-widest">
                    <AlertTriangle size={12} className="text-red-600" /> Target Blocked Engagement
                  </div>
                </div>
              </div>

              {/* The Shift Visualizer */}
              <div className="flex justify-center -my-6 relative z-10 lg:ml-8">
                <div className="bg-[#030303] p-4 text-zinc-800 rounded-full border border-white/5 shadow-2xl flex items-center justify-center">
                  <ArrowRight size={20} className="rotate-90 text-emerald-500 drop-shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                </div>
              </div>

              {/* MagnetEngine DM - Luxury Minimal */}
              <div className="relative group z-20 lg:-ml-4 transform transition-transform duration-500 hover:-translate-y-1">
                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600/40 to-cyan-600/40 rounded-3xl blur-xl opacity-30 group-hover:opacity-60 transition duration-700"></div>

                {/* Visual Connector */}
                <div className="hidden lg:block absolute -left-[2.5rem] top-1/2 w-[2.5rem] h-px bg-gradient-to-r from-emerald-900/50 to-emerald-500/50"></div>

                <div className="relative bg-[#030604]/90 backdrop-blur-2xl border border-emerald-500/30 rounded-2xl p-8 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.8)]">
                  <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 font-semibold flex items-center gap-2 tracking-wide font-sans">
                      <Sparkles size={16} className="text-emerald-400 animate-pulse" /> MagnetEngine
                    </span>
                    <span className="text-zinc-500 text-xs font-light tracking-wide">Delivered via AI</span>
                  </div>
                  <div className="text-white text-[15px] leading-relaxed font-light italic bg-gradient-to-br from-emerald-900/20 to-transparent p-6 rounded-xl border border-emerald-500/20 relative shadow-inner">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-400 to-cyan-600 rounded-l-xl"></div>
                    "Hey Sarah, just finished reading your thread on organic reach. The point about 'velocity' was super insightful—curious if you're applying that to your email flows too?"
                  </div>
                  <div className="flex items-center gap-2 mt-6 text-xs font-medium text-emerald-400 bg-emerald-500/10 w-fit px-3.5 py-1.5 rounded-full border border-emerald-500/20 shadow-[0_0_15px_-3px_rgba(16,185,129,0.3)]">
                    <CircleCheck size={14} /> Reply Received (12 mins ago)
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default Problem;
