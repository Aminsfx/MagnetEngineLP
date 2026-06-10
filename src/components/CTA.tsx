import React from 'react';
import { ArrowUpRight } from 'lucide-react';

const CTA: React.FC = () => {
  return (
    <section id="cta" className="py-32 px-6 relative overflow-hidden bg-[#030604]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-900/10 via-transparent to-transparent z-0"></div>

      <div className="max-w-3xl mx-auto text-center relative z-10 space-y-8">
        <h2 className="text-4xl md:text-5xl font-semibold text-white tracking-tight drop-shadow-lg">Ready to fill your calendar?</h2>
        <p className="text-xl text-zinc-400 font-light max-w-2xl mx-auto">
          Join the waiting list or book a call to see if your niche qualifies for MagnetEngine.
        </p>

        <div className="flex flex-col items-center gap-6 pt-6">
          <button
            data-cal-link="magnetengine/15min"
            data-cal-namespace="15min"
            data-cal-config='{"layout":"month_view","useSlotsViewOnSmallScreen":"true"}'
            className="group px-10 py-4 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 text-lg font-semibold rounded-full transition-all duration-300 flex items-center gap-3 shadow-[0_0_30px_-5px_rgba(16,185,129,0.4)] hover:shadow-[0_0_40px_0px_rgba(16,185,129,0.6)] hover:-translate-y-1"
          >
            Book Your Demo
            <ArrowUpRight size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </button>
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-500/5 border border-emerald-500/10 backdrop-blur-md">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <p className="text-sm font-medium text-emerald-100/70">2 slots left for this week</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;
