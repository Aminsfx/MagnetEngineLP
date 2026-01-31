
import React from 'react';
import { Magnet, ArrowRight } from 'lucide-react';

const Navbar: React.FC = () => {
  return (
    <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-black/50 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-900 rounded-lg flex items-center justify-center text-white">
            <Magnet size={20} strokeWidth={1.5} />
          </div>
          <span className="text-white font-medium tracking-tight">MagnetEngine</span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm text-zinc-400">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#problem" className="hover:text-white transition-colors">Why Us</a>
          <a href="#cta" className="hover:text-white transition-colors">Process</a>
        </div>

        <button
          data-cal-link="magnetengine/15min"
          data-cal-namespace="15min"
          data-cal-config='{"layout":"month_view","useSlotsViewOnSmallScreen":"true"}'
          className="group relative px-4 py-2 bg-white text-black text-sm font-medium rounded-full overflow-hidden transition-all hover:bg-zinc-200"
        >
          <span className="relative z-10 flex items-center gap-2">
            Book a Demo
            <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
          </span>
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
