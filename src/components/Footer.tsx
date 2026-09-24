import React from 'react';
import { Link } from 'react-router-dom';
import { Magnet } from 'lucide-react';
import { SUPPORT_EMAIL } from '../lib/plans';

const Footer: React.FC = () => {
  return (
    <footer className="border-t border-white/5 py-12 bg-surface relative z-10">
      <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white shadow-[0_0_15px_-3px_rgba(255,255,255,0.2)]">
            <Magnet size={18} strokeWidth={2.5} className="text-surface rotate-90" />
          </div>
          <span className="text-neutral-300 text-body-sm font-medium tracking-[-0.01em]">MagnetEngine</span>
        </div>

        <div className="flex gap-8 text-meta text-neutral-400">
          <Link to="/privacy" className="hover:text-brand-400 transition-colors">Privacy</Link>
          <Link to="/terms" className="hover:text-brand-400 transition-colors">Terms</Link>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-brand-400 transition-colors">Contact</a>
        </div>

        <div className="text-meta text-neutral-500">
          © {new Date().getFullYear()} MagnetEngine. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
