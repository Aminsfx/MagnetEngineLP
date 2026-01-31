
import React from 'react';
import { TrendingUp, Crown, Briefcase, Rocket } from 'lucide-react';

const SocialProof: React.FC = () => {
  return (
    <section className="py-20 border-t border-white/5 bg-zinc-950">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <h2 className="text-2xl text-white font-medium mb-12">Trusted by coaches & agencies scaling to $50k/mo</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
          <div className="flex items-center justify-center gap-2">
            <TrendingUp className="text-zinc-400" size={24} />
            <span className="font-semibold text-lg text-zinc-300">Vortex</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Crown className="text-zinc-400" size={24} />
            <span className="font-semibold text-lg text-zinc-300">Empire</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Briefcase className="text-zinc-400" size={24} />
            <span className="font-semibold text-lg text-zinc-300">AgencyFlow</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Rocket className="text-zinc-400" size={24} />
            <span className="font-semibold text-lg text-zinc-300">ScaleUp</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SocialProof;
