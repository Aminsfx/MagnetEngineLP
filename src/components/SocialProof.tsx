import React from 'react';
import { TrendingUp, Crown, Briefcase, Rocket } from 'lucide-react';

const SocialProof: React.FC = () => {
  return (
    <section className="py-20 border-t border-white/5 bg-[#05070A]">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <h2 className="text-sm font-semibold tracking-widest text-zinc-500 uppercase mb-10">Trusted by coaches & agencies scaling to $50k/mo</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-zinc-400">
          <div className="flex items-center justify-center gap-2 opacity-50 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-500 hover:scale-105 cursor-default">
            <TrendingUp size={22} />
            <span className="font-semibold text-lg tracking-wide">Vortex</span>
          </div>
          <div className="flex items-center justify-center gap-2 opacity-50 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-500 hover:scale-105 cursor-default">
            <Crown size={22} />
            <span className="font-semibold text-lg tracking-wide">Empire</span>
          </div>
          <div className="flex items-center justify-center gap-2 opacity-50 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-500 hover:scale-105 cursor-default">
            <Briefcase size={22} />
            <span className="font-semibold text-lg tracking-wide">AgencyFlow</span>
          </div>
          <div className="flex items-center justify-center gap-2 opacity-50 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-500 hover:scale-105 cursor-default">
            <Rocket size={22} />
            <span className="font-semibold text-lg tracking-wide">ScaleUp</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SocialProof;
