
import React from 'react';
import { Magnet } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="border-t border-white/5 py-12 bg-black">
      <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-zinc-800 rounded flex items-center justify-center text-zinc-400">
            <Magnet size={14} />
          </div>
          <span className="text-zinc-400 text-sm font-medium">MagnetEngine</span>
        </div>
        
        <div className="flex gap-8 text-sm text-zinc-600">
          <a href="#" className="hover:text-zinc-300 transition-colors">Privacy</a>
          <a href="#" className="hover:text-zinc-300 transition-colors">Terms</a>
          <a href="mailto:aminupsellz@gmail.com" className="hover:text-zinc-300 transition-colors">Contact</a>
        </div>

        <div className="text-sm text-zinc-700">
          © {new Date().getFullYear()} MagnetEngine. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
