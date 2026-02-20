import React, { useState, useEffect, useRef } from 'react';
import { Upload, Filter, Wand2, MessageCircle, Wallet, Play } from 'lucide-react';

const TOTAL_LEADS = 1000;

const steps = [
    {
        id: 'upload',
        label: 'UPLOAD',
        sub: 'Contacts',
        icon: Upload,
        color: 'text-blue-400',
        ring: 'ring-blue-500/40',
        glow: 'shadow-blue-500/20',
    },
    {
        id: 'filter',
        label: 'FILTER',
        sub: 'ICP Match',
        icon: Filter,
        color: 'text-violet-400',
        ring: 'ring-violet-500/40',
        glow: 'shadow-violet-500/20',
    },
    {
        id: 'personalize',
        label: 'PERSONALIZE',
        sub: 'AI DMs',
        icon: Wand2,
        color: 'text-cyan-400',
        ring: 'ring-cyan-500/40',
        glow: 'shadow-cyan-500/20',
    },
    {
        id: 'engage',
        label: 'ENGAGE',
        sub: 'Replies',
        icon: MessageCircle,
        color: 'text-emerald-400',
        ring: 'ring-emerald-500/40',
        glow: 'shadow-emerald-500/20',
    },
    {
        id: 'profit',
        label: 'PROFIT',
        sub: 'Revenue',
        icon: Wallet,
        color: 'text-yellow-400',
        ring: 'ring-yellow-500/40',
        glow: 'shadow-yellow-500/20',
        isRevenue: true,
    },
];

// Realistic conversion rates per stage
const CONVERSIONS = [1, 0.35, 0.35, 0.08, 0.3];
const REVENUE_PER_DEAL = 2500;

function computeValues(progress: number[]): number[] {
    const values: number[] = [];
    let current = TOTAL_LEADS;
    for (let i = 0; i < steps.length; i++) {
        values.push(Math.round(current * progress[i]));
        if (i > 0) current = values[i];
    }
    return values;
}

const LiveWorkflowDemo: React.FC = () => {
    const [running, setRunning] = useState(false);
    const [progress, setProgress] = useState([0, 0, 0, 0, 0]);
    const [activeStep, setActiveStep] = useState(-1);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const values = computeValues(progress);

    const reset = () => {
        setProgress([0, 0, 0, 0, 0]);
        setActiveStep(-1);
        setRunning(false);
    };

    const startSimulation = () => {
        if (running) {
            reset();
            return;
        }
        reset();
        setRunning(true);

        let step = 0;
        let p = [0, 0, 0, 0, 0];

        const tick = () => {
            if (step >= steps.length) {
                setRunning(false);
                setActiveStep(-1);
                return;
            }

            setActiveStep(step);

            const target = CONVERSIONS[step];
            const increment = target / 40; // 40 ticks per step → ~800ms per step
            let current = 0;

            intervalRef.current = setInterval(() => {
                current = Math.min(current + increment, target);
                p = [...p];
                p[step] = current;
                setProgress([...p]);

                if (current >= target - 0.001) {
                    clearInterval(intervalRef.current!);
                    step++;
                    setTimeout(tick, 200);
                }
            }, 20);
        };

        tick();
    };

    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    return (
        <section className="py-20 px-6 relative overflow-hidden" id="workflow">
            {/* Subtle background glow */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-blue-600/5 rounded-full blur-3xl" />
            </div>

            <div className="max-w-5xl mx-auto relative z-10">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-12">
                    <div>
                        <h2 className="text-3xl font-bold text-white">Live Workflow Demo</h2>
                        <p className="text-zinc-500 mt-1 text-sm">
                            Watch how 1,000 leads turn into revenue.
                        </p>
                    </div>

                    <button
                        onClick={startSimulation}
                        className={`
              flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm transition-all
              ${running
                                ? 'bg-zinc-800 border border-zinc-700 text-zinc-300 hover:border-zinc-600'
                                : 'bg-white text-black hover:bg-zinc-100 shadow-lg'
                            }
            `}
                    >
                        <Play size={15} className={running ? 'text-zinc-400' : 'text-black'} />
                        {running ? 'Reset' : 'Start Simulation'}
                    </button>
                </div>

                {/* Pipeline */}
                <div className="relative bg-zinc-950 border border-white/[0.06] rounded-2xl px-8 py-12">
                    {/* Connecting line */}
                    <div className="absolute top-[4.75rem] left-[calc(10%+28px)] right-[calc(10%+28px)] h-px bg-zinc-800 z-0" />

                    <div className="relative z-10 flex items-start justify-between gap-2">
                        {steps.map((step, i) => {
                            const Icon = step.icon;
                            const val = values[i];
                            const isActive = activeStep === i;
                            const isDone = progress[i] >= CONVERSIONS[i] - 0.001;

                            return (
                                <div key={step.id} className="flex flex-col items-center gap-3 flex-1">
                                    {/* Circle */}
                                    <div
                                        className={`
                      w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300
                      bg-zinc-900 border border-zinc-800
                      ${isActive ? `ring-2 ${step.ring} shadow-lg ${step.glow} scale-110` : ''}
                      ${isDone && !isActive ? 'border-zinc-700' : ''}
                    `}
                                    >
                                        <Icon
                                            size={22}
                                            className={`transition-colors duration-300 ${isDone || isActive ? step.color : 'text-zinc-600'}`}
                                        />
                                    </div>

                                    {/* Label */}
                                    <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
                                        {step.label}
                                    </span>

                                    {/* Value */}
                                    <div className="text-center">
                                        <div
                                            className={`text-2xl font-bold tabular-nums transition-colors duration-200 ${isDone ? 'text-white' : 'text-zinc-700'
                                                }`}
                                        >
                                            {step.isRevenue
                                                ? val > 0
                                                    ? `$${(val * REVENUE_PER_DEAL).toLocaleString()}`
                                                    : '$0'
                                                : val.toLocaleString()}
                                        </div>
                                        <div className="text-xs text-zinc-600 mt-0.5">{step.sub}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Progress bar */}
                    {running && (
                        <div className="mt-10 mx-auto max-w-xs">
                            <div className="h-0.5 bg-zinc-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-blue-500 via-violet-500 to-emerald-500 transition-all duration-300"
                                    style={{
                                        width: `${((activeStep + (progress[activeStep] / CONVERSIONS[activeStep])) / steps.length) * 100}%`,
                                    }}
                                />
                            </div>
                            <p className="text-center text-xs text-zinc-600 mt-2">Simulating pipeline...</p>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};

export default LiveWorkflowDemo;
