import React from 'react';
import { ArrowRight } from 'lucide-react';

const Hero: React.FC = () => {
  return (
    <section className="relative overflow-hidden min-h-[100dvh] flex flex-col items-center justify-between bg-[#030604] pt-32 pb-20 px-4 sm:px-6 z-0">

      {/* ── Ambient glow — planet atmosphere ───────────────────────── */}
      <div
        className="planet-glow absolute inset-x-0 top-0 pointer-events-none -z-20"
        style={{
          bottom: '22%',
          background: 'radial-gradient(ellipse 85% 100% at 50% 100%, rgba(16,185,129,0.5) 0%, rgba(16,185,129,0.25) 30%, rgba(34,211,238,0.1) 60%, transparent 85%)',
          filter: 'blur(70px)',
        }}
      />

      {/* Subtle top mesh — warmth behind badge */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[360px] pointer-events-none -z-10"
        style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(16,185,129,0.06) 0%, transparent 70%)' }}
      />

      {/* Planet horizon — static base */}
      <div
        className="absolute top-[60%] sm:top-[65%] md:top-[70%] left-1/2 -translate-x-1/2
                   w-[300vw] sm:w-[200vw] lg:w-[150vw] xl:w-[110vw]
                   h-[1000px] md:h-[1400px] rounded-[100%]
                   border-t-[2px] border-emerald-300/30
                   bg-gradient-to-b from-[#0a1a14] via-[#030604] to-[#030604]
                   -z-10 pointer-events-none
                   before:absolute before:inset-0 before:rounded-[100%]
                   before:bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))]
                   before:from-cyan-100/10 before:via-transparent before:to-transparent
                   before:top-[-1px]"
      />

      {/* Orbit rim blink overlay */}
      <div
        className="orbit-glow absolute top-[60%] sm:top-[65%] md:top-[70%] left-1/2 -translate-x-1/2
                   w-[300vw] sm:w-[200vw] lg:w-[150vw] xl:w-[110vw]
                   h-[1000px] md:h-[1400px] rounded-[100%] -z-10 pointer-events-none"
        style={{
          boxShadow: [
            '0 -600px 700px 150px rgba(16,185,129,0.22)',
            '0 -250px 450px  80px rgba(16,185,129,0.4)',
            '0 -80px  220px   0px rgba(16,185,129,0.8)',
            '0 -20px   80px -10px rgba(52,211,153,0.7)',
            'inset 0 50px 160px -10px rgba(34,211,238,0.45)',
          ].join(', '),
        }}
      />

      {/* ── Hero Content ────────────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col items-center text-center mt-6">

        {/* Badge — double-bezel (outer gradient hairline + dark inner core) */}
        <div className="hero-animate mb-10" style={{ animationDelay: '0ms' }}>
          <div
            className="p-px rounded-full"
            style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(16,185,129,0.22), rgba(255,255,255,0.04))' }}
          >
            <div
              className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#030604]"
              style={{ boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.06)' }}
            >
              <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">V2.0 Now Live</span>
              <span className="w-px h-3 bg-white/[0.1]" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-400">Get Early Access</span>
            </div>
          </div>
        </div>

        {/* H1 */}
        <h1
          className="hero-animate font-bold text-white mb-7 leading-[0.92] tracking-[-0.04em] max-w-3xl"
          style={{
            animationDelay: '140ms',
            fontSize: 'clamp(3rem, 8.5vw, 7rem)',
          }}
        >
          Stop prospecting<br />
          <span
            style={{
              background: 'linear-gradient(135deg, #6ee7b7 0%, #34d399 40%, #22d3ee 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            manually.
          </span>
        </h1>

        {/* Subtitle */}
        <p
          className="hero-animate font-light text-zinc-400 max-w-[480px] mx-auto mb-12 leading-[1.65]"
          style={{
            animationDelay: '280ms',
            fontSize: 'clamp(1rem, 1.8vw, 1.15rem)',
          }}
        >
          MagnetEngine scrapes your ideal clients on Instagram, writes a personalised DM for each one, and sends it from your account while you sleep.
        </p>

        {/* CTAs */}
        <div
          className="hero-animate flex flex-col sm:flex-row items-center gap-3 mb-20"
          style={{ animationDelay: '400ms' }}
        >
          {/* Primary — button-in-button pattern, scrolls to pricing */}
          <a
            href="#pricing"
            className="group flex items-center gap-3 pl-6 pr-[7px] py-[7px] rounded-full bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98]"
            style={{
              boxShadow: '0 0 28px rgba(16,185,129,0.3), 0 0 80px rgba(16,185,129,0.08)',
              transition: 'all 700ms cubic-bezier(0.32,0.72,0,1)',
            }}
          >
            <span className="text-[15px] font-semibold text-emerald-950 leading-none">
              Start Automating
            </span>
            {/* Nested icon circle */}
            <span
              className="w-8 h-8 rounded-full bg-emerald-950/20 flex items-center justify-center group-hover:translate-x-0.5 group-hover:-translate-y-px"
              style={{ transition: 'transform 700ms cubic-bezier(0.32,0.72,0,1)' }}
            >
              <ArrowRight size={14} className="text-emerald-950" strokeWidth={2.5} />
            </span>
          </a>

          {/* Secondary — hairline glass pill */}
          <button
            data-cal-link="magnetengine/15min"
            data-cal-namespace="15min"
            data-cal-config='{"layout":"month_view","useSlotsViewOnSmallScreen":"true"}'
            className="flex items-center px-6 py-3.5 rounded-full border border-white/[0.08] bg-white/[0.03] text-zinc-300 hover:text-white hover:border-white/[0.15] hover:bg-white/[0.05] active:scale-[0.98] text-[15px] font-medium"
            style={{ transition: 'all 700ms cubic-bezier(0.32,0.72,0,1)' }}
          >
            Book a Demo
          </button>
        </div>

      </div>

      {/* ── Social proof strip ─────────────────────────────────────── */}
      <div
        className="hero-animate relative z-20 mt-auto w-full max-w-2xl mx-auto text-center"
        style={{ animationDelay: '540ms' }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-600 mb-5">
          Trusted by scaling agencies &amp; global teams
        </p>
        <div className="flex items-center justify-center flex-wrap gap-y-4">
          {['Vortex', 'Empire', 'AgencyFlow', 'ScaleUp'].map((name, i, arr) => (
            <React.Fragment key={name}>
              <span
                className="px-6 text-xl font-bold text-zinc-500 hover:text-zinc-200 cursor-default select-none tracking-tight"
                style={{ transition: 'color 500ms cubic-bezier(0.32,0.72,0,1)' }}
              >
                {name}
              </span>
              {i < arr.length - 1 && (
                <span className="w-px h-5 bg-white/[0.08]" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

    </section>
  );
};

export default Hero;
