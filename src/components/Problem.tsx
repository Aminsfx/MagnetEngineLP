
import React from 'react';
import { CircleX, Sparkles, CircleCheck } from 'lucide-react';

const Problem: React.FC = () => {
  return (
    <section id="problem" className="py-24 border-t border-white/5 relative bg-zinc-950/50">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div className="space-y-6">
            <h2 className="text-3xl md:text-4xl font-medium text-white tracking-tight">The "Old Way" is killing your conversion rate.</h2>
            <p className="text-zinc-400 leading-relaxed text-lg">
              Copy-pasting scripts doesn't work anymore. Prospects smell automation from a mile away. If you aren't personalizing, you're just spamming.
            </p>

            <ul className="space-y-4 mt-6">
              {[
                "Hours wasted manually checking profiles",
                "Generic 'Hey, quick question' messages ignored",
                "Inconsistent lead flow and empty calendars"
              ].map((item, idx) => (
                <li key={idx} className="flex items-center gap-3 text-zinc-400">
                  <CircleX className="text-red-500 shrink-0" size={20} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-red-500/20 to-blue-500/20 rounded-2xl blur-lg opacity-50"></div>
            <div className="relative bg-black border border-white/10 rounded-xl p-8 grid gap-8">

              {/* Bad DM */}
              <div className="space-y-2 opacity-50">
                <div className="flex justify-between text-sm">
                  <span className="text-red-400 font-medium">Generic Bot</span>
                  <span className="text-zinc-600">Sent</span>
                </div>
                <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-500 text-sm italic">
                  "Hi there! I help coaches get clients. Want to see my case study?"
                </div>
                <div className="flex items-center gap-2 text-xs text-red-500/70">
                  <CircleX size={12} /> Blocked / Ignored
                </div>
              </div>

              {/* MagnetEngine DM */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-blue-400 font-medium flex items-center gap-2">
                    <Sparkles size={14} /> MagnetEngine
                  </span>
                  <span className="text-zinc-500">Sent</span>
                </div>
                <div className="p-4 rounded-lg bg-gradient-to-r from-blue-900/10 to-transparent border border-blue-500/30 text-zinc-200 text-sm shadow-[0_0_15px_-5px_rgba(59,130,246,0.2)] italic">
                  "Hey Sarah, just finished reading your thread on organic reach. The point about 'velocity' was super insightful—curious if you're applying that to your email flows too?"
                </div>
                <div className="flex items-center gap-2 text-xs text-green-400">
                  <CircleCheck size={12} /> Reply Received (12 mins ago)
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
