
import React from 'react';
import { ArrowUpRight } from 'lucide-react';

const CTA: React.FC = () => {
  return (
    <section id="cta" className="py-32 px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-black to-black"></div>

      <div className="max-w-3xl mx-auto text-center relative z-10 space-y-8">
        <h2 className="text-4xl md:text-5xl font-medium text-white tracking-tight">Ready to fill your calendar?</h2>
        <p className="text-xl text-zinc-400 font-light">
          Join the waiting list or book a call to see if your niche qualifies for MagnetEngine.
        </p>

        <div className="flex flex-col items-center gap-6 pt-4">
          <button
            data-cal-link="magnetengine/15min"
            data-cal-namespace="15min"
            data-cal-config='{"layout":"month_view","useSlotsViewOnSmallScreen":"true"}'
            className="px-10 py-4 bg-white text-black hover:bg-zinc-200 text-lg font-medium rounded-full transition-all flex items-center gap-2 shadow-2xl"
          >
            Book Your Demo
            <ArrowUpRight size={20} />
          </button>
          <p className="text-sm text-zinc-600 flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
            2 slots left for this week
          </p>
        </div>
      </div>
    </section>
  );
};

export default CTA;
