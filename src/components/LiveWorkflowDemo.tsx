import React, { useState, useEffect, useCallback, useRef } from 'react';
import { UploadCloud, FilterX, Wand2, Rocket, Magnet, FileText, Database, Check, X } from 'lucide-react';

const steps = [
  {
    id: 1,
    title: 'Upload & Connect',
    description: 'Link your prospect lists or CRM. Copy & paste one webhook. Done in 5 minutes.',
    icon: UploadCloud,
  },
  {
    id: 2,
    title: 'Configure Filters',
    description: 'Tell MagnetEngine who your ideal customer is. The AI automatically removes junk leads.',
    icon: FilterX,
  },
  {
    id: 3,
    title: 'Generate DMs',
    description: 'The engine analyzes thousands of profiles and posts in seconds, writing 100% unique messages for each.',
    icon: Wand2,
  },
  {
    id: 4,
    title: 'Launch & Scale',
    description: 'Go live with instant automated outreach. Watch your calendar fill without lifting a finger.',
    icon: Rocket,
  },
];

// ── Step 1: Connect ──────────────────────────────────────────────────────────
const ConnectVisual: React.FC = () => (
  <div className="relative w-full h-full flex items-center justify-center">
    {/* Animated SVG connection lines */}
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
    >
      <line x1="16" y1="22" x2="50" y2="50" stroke="rgba(16,185,129,0.4)" strokeWidth="0.7" strokeDasharray="4,3">
        <animate attributeName="stroke-dashoffset" from="7" to="0" dur="1.3s" repeatCount="indefinite" />
      </line>
      <line x1="84" y1="22" x2="50" y2="50" stroke="rgba(16,185,129,0.4)" strokeWidth="0.7" strokeDasharray="4,3">
        <animate attributeName="stroke-dashoffset" from="7" to="0" dur="1.6s" repeatCount="indefinite" />
      </line>
      <line x1="16" y1="78" x2="50" y2="50" stroke="rgba(34,211,238,0.4)" strokeWidth="0.7" strokeDasharray="4,3">
        <animate attributeName="stroke-dashoffset" from="7" to="0" dur="1.9s" repeatCount="indefinite" />
      </line>
      <line x1="84" y1="78" x2="50" y2="50" stroke="rgba(34,211,238,0.4)" strokeWidth="0.7" strokeDasharray="4,3">
        <animate attributeName="stroke-dashoffset" from="7" to="0" dur="1.5s" repeatCount="indefinite" />
      </line>
      {/* Travelling dots */}
      <circle r="1.2" fill="rgba(16,185,129,0.9)">
        <animateMotion path="M 16,22 L 50,50" dur="1.3s" repeatCount="indefinite" />
      </circle>
      <circle r="1.2" fill="rgba(16,185,129,0.9)">
        <animateMotion path="M 84,22 L 50,50" dur="1.6s" repeatCount="indefinite" />
      </circle>
      <circle r="1.2" fill="rgba(34,211,238,0.9)">
        <animateMotion path="M 16,78 L 50,50" dur="1.9s" repeatCount="indefinite" />
      </circle>
      <circle r="1.2" fill="rgba(34,211,238,0.9)">
        <animateMotion path="M 84,78 L 50,50" dur="1.5s" repeatCount="indefinite" />
      </circle>
    </svg>

    {/* Center hub */}
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
      <div className="w-20 h-20 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex flex-col items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.25)]">
        <Magnet size={24} className="text-emerald-400" />
        <span className="text-[8px] text-emerald-400 mt-1 font-semibold tracking-tight text-center leading-tight">
          Magnet<br />Engine
        </span>
      </div>
    </div>

    {/* Top-left: LinkedIn */}
    <div className="absolute" style={{ top: '10%', left: '5%' }}>
      <div className="w-16 h-16 rounded-xl bg-[#030604] border border-white/10 flex flex-col items-center justify-center gap-0.5">
        <span className="text-base font-black text-[#0A66C2] leading-none">in</span>
        <span className="text-[8px] text-zinc-500">LinkedIn</span>
      </div>
    </div>

    {/* Top-right: CSV */}
    <div className="absolute" style={{ top: '10%', right: '5%' }}>
      <div className="w-16 h-16 rounded-xl bg-[#030604] border border-white/10 flex flex-col items-center justify-center gap-0.5">
        <FileText size={17} className="text-zinc-400" />
        <span className="text-[8px] text-zinc-500">CSV List</span>
      </div>
    </div>

    {/* Bottom-left: CRM */}
    <div className="absolute" style={{ bottom: '10%', left: '5%' }}>
      <div className="w-16 h-16 rounded-xl bg-[#030604] border border-white/10 flex flex-col items-center justify-center gap-0.5">
        <Database size={17} className="text-zinc-400" />
        <span className="text-[8px] text-zinc-500">CRM</span>
      </div>
    </div>

    {/* Bottom-right: Webhook */}
    <div className="absolute" style={{ bottom: '10%', right: '5%' }}>
      <div className="w-16 h-16 rounded-xl bg-[#030604] border border-white/10 flex flex-col items-center justify-center gap-0.5">
        <span className="text-sm font-bold text-zinc-400 font-mono">{'{}'}</span>
        <span className="text-[8px] text-zinc-500">Webhook</span>
      </div>
    </div>

    {/* Status pill */}
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
      <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-[10px] text-emerald-400 font-medium tracking-wide whitespace-nowrap">
          Connected · 4 sources active
        </span>
      </div>
    </div>
  </div>
);

// ── Step 2: Filter ───────────────────────────────────────────────────────────
const FilterVisual: React.FC = () => {
  const leads = [
    { name: 'Alex Rodriguez', score: 94, pass: true },
    { name: 'Spam Bot #247', score: 11, pass: false },
    { name: 'Maria Santos', score: 87, pass: true },
    { name: 'Generic Inc. #89', score: 8, pass: false },
    { name: 'James Thompson', score: 91, pass: true },
  ];

  return (
    <div className="w-full h-full flex flex-col gap-2 px-4 py-3">
      <div className="text-[10px] text-zinc-500 uppercase tracking-widest">
        Scanning 2,847 prospects...
      </div>
      <div className="w-full space-y-1.5">
        {leads.map((lead) => (
          <div
            key={lead.name}
            className={`flex items-center gap-3 px-3.5 py-2 rounded-xl border ${
              lead.pass
                ? 'bg-emerald-500/5 border-emerald-500/20'
                : 'bg-red-500/5 border-red-500/15 opacity-55'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                lead.pass ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
              }`}
            >
              {lead.name[0]}
            </div>
            <span className="text-xs text-zinc-300 flex-1 truncate">{lead.name}</span>
            <span className={`text-xs font-mono shrink-0 ${lead.pass ? 'text-emerald-400' : 'text-red-400'}`}>
              {lead.score}%
            </span>
            {lead.pass ? (
              <Check size={14} className="text-emerald-400 shrink-0" />
            ) : (
              <X size={14} className="text-red-400 shrink-0" />
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-8 pt-2 mt-1 border-t border-white/5 w-full justify-center">
        <div className="text-center">
          <div className="text-2xl font-medium text-emerald-400">312</div>
          <div className="text-[9px] text-zinc-500 uppercase tracking-widest">Qualified</div>
        </div>
        <div className="w-px h-8 bg-white/10" />
        <div className="text-center">
          <div className="text-2xl font-medium text-red-400/70">2,535</div>
          <div className="text-[9px] text-zinc-500 uppercase tracking-widest">Filtered Out</div>
        </div>
      </div>
    </div>
  );
};

// ── Step 3: DM Generation ────────────────────────────────────────────────────
const FULL_MESSAGE =
  "Hey Alex! Saw your recent post about scaling outreach — loved the insight on personalization. We built something specifically to solve that exact bottleneck. Worth a quick 15-min chat this week?";

const DMVisual: React.FC = () => {
  const [charIndex, setCharIndex] = useState(0);

  useEffect(() => {
    setCharIndex(0);
  }, []);

  useEffect(() => {
    if (charIndex < FULL_MESSAGE.length) {
      const t = setTimeout(() => setCharIndex((i) => i + 1), 28);
      return () => clearTimeout(t);
    }
  }, [charIndex]);

  return (
    <div className="w-full h-full flex flex-col gap-3 p-5">
      {/* Profile being analyzed */}
      <div className="flex items-center gap-3 pb-3 border-b border-white/5">
        <img
          src="https://randomuser.me/api/portraits/men/43.jpg"
          alt="Alex Rodriguez"
          className="w-10 h-10 rounded-full object-cover shrink-0 ring-1 ring-white/10"
        />
        <div className="min-w-0">
          <div className="text-sm text-white font-medium truncate">Alex Rodriguez</div>
          <div className="text-[11px] text-zinc-500 truncate">CEO @ ScaleMax Agency · 3rd+</div>
        </div>
        <div className="ml-auto shrink-0 flex items-center gap-1.5 text-[9px] text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-full border border-cyan-500/20">
          <div className="w-1 h-1 rounded-full bg-cyan-400 animate-pulse" />
          AI Analyzing
        </div>
      </div>

      {/* Generated message */}
      <div className="flex-1 flex flex-col gap-2 min-h-0">
        <div className="text-[10px] text-zinc-500 uppercase tracking-widest">Generated Message</div>
        <div className="flex-1 bg-[#030604] border border-white/5 rounded-xl p-4 text-[13px] text-zinc-300 leading-relaxed overflow-hidden">
          {FULL_MESSAGE.slice(0, charIndex)}
          <span className="inline-block w-0.5 h-[1em] bg-emerald-400 ml-px animate-pulse align-middle" />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        {[
          ['100%', 'Unique', 'text-white'],
          ['High', 'Relevance', 'text-emerald-400'],
          ['2.3s', 'Generated', 'text-cyan-400'],
        ].map(([val, label, color]) => (
          <div key={label} className="text-center bg-white/[0.02] border border-white/5 rounded-lg py-2">
            <div className={`text-sm font-medium ${color}`}>{val}</div>
            <div className="text-[9px] text-zinc-500 uppercase tracking-widest">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Step 4: Scale ────────────────────────────────────────────────────────────
const ScaleVisual: React.FC = () => {
  const slots = [
    { time: '9:00 AM', booked: true, name: 'Sarah M.' },
    { time: '10:30 AM', booked: true, name: 'James T.' },
    { time: '12:00 PM', booked: true, name: 'Priya K.' },
    { time: '2:00 PM', booked: true, name: 'Carlos D.' },
    { time: '3:30 PM', booked: false, name: '' },
    { time: '5:00 PM', booked: false, name: '' },
  ];

  return (
    <div className="w-full h-full flex flex-col gap-2 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-400 font-medium">This Week's Calendar</span>
        <div className="flex items-center gap-1.5 text-[9px] text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
          <Rocket size={9} />
          <span>Live & Running</span>
        </div>
      </div>

      <div className="flex-1 space-y-1">
        {slots.map((slot) => (
          <div
            key={slot.time}
            className={`flex items-center gap-3 px-3.5 py-2 rounded-xl border ${
              slot.booked
                ? 'bg-emerald-500/5 border-emerald-500/20'
                : 'bg-white/[0.02] border-white/5'
            }`}
          >
            <span className="text-[11px] text-zinc-500 w-[72px] shrink-0 font-mono">{slot.time}</span>
            {slot.booked ? (
              <>
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <span className="text-[9px] font-bold text-emerald-400">{slot.name[0]}</span>
                </div>
                <span className="text-xs text-emerald-300 flex-1">{slot.name}</span>
                <span className="text-[9px] font-semibold uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full shrink-0">
                  Booked
                </span>
              </>
            ) : (
              <span className="text-xs text-zinc-600">Available</span>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-white/5">
        <span className="text-[11px] text-zinc-500">Running 24/7 on autopilot</span>
        <span className="text-sm font-medium text-emerald-400">
          +14 calls{' '}
          <span className="text-xs text-zinc-500 font-normal">this week</span>
        </span>
      </div>
    </div>
  );
};

// ── Main Component ───────────────────────────────────────────────────────────
const LiveWorkflowDemo: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [fade, setFade] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goToStep = useCallback((index: number) => {
    setFade(false);
    setTimeout(() => {
      setActiveStep(index);
      setFade(true);
    }, 250);
  }, []);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setActiveStep((prev) => (prev + 1) % steps.length);
        setFade(true);
      }, 250);
    }, 4500);
  }, []);

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startTimer]);

  const handleStepClick = (index: number) => {
    if (index === activeStep) return;
    goToStep(index);
    startTimer(); // reset auto-advance on manual click
  };

  const visuals = [<ConnectVisual />, <FilterVisual />, <DMVisual />, <ScaleVisual />];

  return (
    <section className="py-32 px-6 relative bg-[#030604]" id="workflow">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-20 space-y-4">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-2">
            How It Works
          </div>
          <h2 className="text-4xl md:text-5xl font-medium text-white tracking-tight drop-shadow-md">
            Get Started in 4 Simple Steps
          </h2>
          <p className="text-zinc-400 font-light text-lg">
            From zero to an automated sales machine—faster than you think.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-16 items-center max-w-5xl mx-auto">
          {/* Left: Timeline */}
          <div className="lg:col-span-5 space-y-1">
            {steps.map((step, index) => {
              const isActive = index === activeStep;
              const Icon = step.icon;
              return (
                <div
                  key={step.id}
                  className={`relative pl-8 py-5 cursor-pointer transition-all duration-500 ${
                    isActive ? 'opacity-100' : 'opacity-40 hover:opacity-70'
                  }`}
                  onClick={() => handleStepClick(index)}
                >
                  {isActive ? (
                    <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] rounded-full" />
                  ) : (
                    <div className="absolute left-[0.5px] top-0 bottom-0 w-[1px] bg-white/10" />
                  )}
                  <div className="flex items-start gap-4">
                    <div className={`mt-1 shrink-0 ${isActive ? 'text-emerald-400' : 'text-zinc-500'}`}>
                      <Icon size={20} strokeWidth={1.5} />
                    </div>
                    <div>
                      <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                        <span className="text-zinc-500 text-sm font-mono mr-1">{step.id} —</span>
                        {step.title}
                      </h4>
                      <p className="text-sm text-zinc-400 font-light leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: Animated Visual Panel */}
          <div className="lg:col-span-7 relative w-full h-[400px]">
            {/* Background glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[120%] bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none -z-10" />

            {/* Panel window */}
            <div className="relative w-full h-full bg-[#050A08] border border-white/5 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
              {/* Window chrome */}
              <div className="h-10 border-b border-white/5 flex items-center px-4 gap-2 bg-[#020403] shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                <span className="ml-auto text-[10px] text-zinc-600 font-mono">
                  {steps[activeStep].title}
                </span>
              </div>

              {/* Animated content */}
              <div
                className={`flex-1 overflow-hidden transition-opacity duration-300 ${
                  fade ? 'opacity-100' : 'opacity-0'
                }`}
              >
                {visuals[activeStep]}
              </div>
            </div>

            {/* Border overlay */}
            <div className="absolute inset-0 border border-white/5 rounded-2xl pointer-events-none" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default LiveWorkflowDemo;
