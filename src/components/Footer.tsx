import React from 'react';
import { Magnet } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="border-t border-white/5 py-12 bg-[#030604] relative z-10">
      <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white shadow-[0_0_15px_-3px_rgba(255,255,255,0.2)]">
            <Magnet size={18} strokeWidth={2.5} className="text-[#030604] rotate-90" />
          </div>
          <span className="text-zinc-300 text-sm font-medium tracking-wide">MagnetEngine</span>
        </div>

        <div className="flex gap-8 text-sm text-zinc-500">
          <a href="#" className="hover:text-emerald-400 transition-colors">Privacy</a>
          <a href="#" className="hover:text-emerald-400 transition-colors">Terms</a>
          <a href="mailto:aminupsellz@gmail.com" className="hover:text-emerald-400 transition-colors">Contact</a>
        </div>

        <div className="text-sm text-zinc-600 font-light">
          © {new Date().getFullYear()} MagnetEngine. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
