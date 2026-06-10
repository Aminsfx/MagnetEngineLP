import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';

const testimonials = [
  {
    name: 'Sarah Mitchell',
    title: 'Founder & CEO',
    company: 'Elevate Growth Agency',
    photo: 'https://randomuser.me/api/portraits/women/44.jpg',
    initials: 'SM',
    gradient: 'from-emerald-500 to-teal-600',
    accentColor: 'text-emerald-400',
    quote:
      "We went from booking 4 discovery calls a week to 22 in just 6 weeks. MagnetEngine doesn't just send messages — it sends the right message, to the right person, at the right time. Our entire prospecting workflow is now fully on autopilot.",
    metric: '+450%',
    metricLabel: 'increase in booked calls',
  },
  {
    name: 'James Okafor',
    title: 'CEO',
    company: 'Apex Digital Partners',
    photo: 'https://randomuser.me/api/portraits/men/32.jpg',
    initials: 'JO',
    gradient: 'from-cyan-500 to-blue-600',
    accentColor: 'text-cyan-400',
    quote:
      "I was skeptical about AI outreach — I'd been burned by spammy tools before. MagnetEngine is completely different. The personalization is genuinely impressive. We signed three new retainer clients within the first month alone.",
    metric: '3 clients',
    metricLabel: 'signed in first 30 days',
  },
  {
    name: 'Priya Sharma',
    title: 'Head of Business Development',
    company: 'ScalePeak Studio',
    photo: 'https://randomuser.me/api/portraits/women/67.jpg',
    initials: 'PS',
    gradient: 'from-violet-500 to-purple-600',
    accentColor: 'text-violet-400',
    quote:
      "Our SDR team was spending 60% of their time just researching and writing personalized messages. MagnetEngine cut that to near zero. Now they spend their time actually closing deals. It's a complete game-changer for our pipeline.",
    metric: '60%',
    metricLabel: 'time saved on prospecting',
  },
  {
    name: 'Carlos Mendez',
    title: 'Managing Director',
    company: 'LeadForge Solutions',
    photo: 'https://randomuser.me/api/portraits/men/55.jpg',
    initials: 'CM',
    gradient: 'from-orange-500 to-amber-500',
    accentColor: 'text-amber-400',
    quote:
      "The ROI was obvious within the first two weeks. MagnetEngine found prospects we never would have targeted manually, and crafted messages that actually got responses. Our reply rate jumped from 3% to 19% — almost overnight.",
    metric: '19%',
    metricLabel: 'reply rate (was 3%)',
  },
  {
    name: 'Emma Thornton',
    title: 'Co-founder',
    company: 'Northstar Creative Agency',
    photo: 'https://randomuser.me/api/portraits/women/24.jpg',
    initials: 'ET',
    gradient: 'from-pink-500 to-rose-500',
    accentColor: 'text-pink-400',
    quote:
      "As a creative agency, I didn't think we needed an outreach tool. I was wrong. MagnetEngine helped us land our biggest client ever — a $12k/month retainer — within 45 days of getting started. It literally paid for itself 60 times over.",
    metric: '$12k/mo',
    metricLabel: 'client landed in 45 days',
  },
];

const Testimonials: React.FC = () => {
  const [current, setCurrent] = useState(0);
  const [fade, setFade] = useState(true);
  const [imgError, setImgError] = useState<Record<number, boolean>>({});
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goTo = useCallback((rawIndex: number) => {
    const index = ((rawIndex % testimonials.length) + testimonials.length) % testimonials.length;
    setFade(false);
    setTimeout(() => {
      setCurrent(index);
      setFade(true);
    }, 300);
  }, []);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setCurrent((prev) => (prev + 1) % testimonials.length);
        setFade(true);
      }, 300);
    }, 5500);
  }, []);

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startTimer]);

  const handleNav = (rawIndex: number) => {
    goTo(rawIndex);
    startTimer();
  };

  const t = testimonials[current];

  return (
    <section className="py-32 px-6 relative bg-[#030604] border-t border-white/5">
      <div className="max-w-6xl mx-auto space-y-16">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto space-y-6">
          <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full border border-white/10 bg-white/[0.02] text-zinc-400 text-[10px] font-semibold uppercase tracking-widest">
            Client Results
          </div>
          <h2 className="text-4xl md:text-5xl font-medium text-white tracking-tight drop-shadow-md">
            Agencies Winning With<br className="hidden md:block" /> MagnetEngine
          </h2>
          <p className="text-zinc-400 font-light text-lg">
            Real results from real agencies that automated their outreach.
          </p>
        </div>

        {/* Carousel */}
        <div className="max-w-4xl mx-auto">
          <div
            className={`transition-opacity duration-300 ${fade ? 'opacity-100' : 'opacity-0'}`}
          >
            <div className="bg-[#050A08] border border-white/5 rounded-3xl p-8 md:p-14 relative overflow-hidden">
              {/* Top accent line */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />

              <div className="flex flex-col md:flex-row gap-10 items-start">
                {/* Left column: avatar + stars + metric */}
                <div className="flex flex-col items-center gap-4 md:w-36 shrink-0">
                  {/* Avatar — real photo with gradient fallback */}
                  {!imgError[current] ? (
                    <img
                      key={current}
                      src={t.photo}
                      alt={t.name}
                      className="w-20 h-20 rounded-2xl object-cover shadow-lg ring-1 ring-white/10"
                      onError={() => setImgError((prev) => ({ ...prev, [current]: true }))}
                    />
                  ) : (
                    <div
                      className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${t.gradient} flex items-center justify-center text-white text-2xl font-bold shadow-lg`}
                    >
                      {t.initials}
                    </div>
                  )}
                  {/* Stars */}
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={13} className="text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                  {/* Metric card */}
                  <div className="text-center bg-[#030604] border border-white/5 rounded-2xl p-4 w-full">
                    <div
                      className={`text-xl font-bold bg-gradient-to-br ${t.gradient} bg-clip-text text-transparent leading-tight`}
                    >
                      {t.metric}
                    </div>
                    <div className="text-[9px] text-zinc-500 uppercase tracking-widest mt-1 leading-snug">
                      {t.metricLabel}
                    </div>
                  </div>
                </div>

                {/* Right column: quote + attribution */}
                <div className="flex-1 flex flex-col gap-5 min-w-0">
                  {/* Decorative quote mark */}
                  <div className="text-8xl text-white/[0.04] font-serif leading-none select-none -mb-6">
                    "
                  </div>
                  <p className="text-lg md:text-xl text-zinc-300 font-light leading-relaxed">
                    {t.quote}
                  </p>
                  <div className="pt-4 border-t border-white/5">
                    <div className="text-white font-medium">{t.name}</div>
                    <div className="text-zinc-500 text-sm mt-0.5">
                      {t.title}
                      <span className="text-white/20 mx-1.5">·</span>
                      <span className="text-zinc-400">{t.company}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation controls */}
          <div className="flex items-center justify-center gap-5 mt-8">
            <button
              onClick={() => handleNav(current - 1)}
              className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:border-white/25 transition-all duration-200"
              aria-label="Previous testimonial"
            >
              <ChevronLeft size={16} />
            </button>

            {/* Dot indicators */}
            <div className="flex items-center gap-2">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => handleNav(i)}
                  aria-label={`Go to testimonial ${i + 1}`}
                  className={`rounded-full transition-all duration-300 ${
                    i === current
                      ? 'w-6 h-2 bg-emerald-400'
                      : 'w-2 h-2 bg-white/20 hover:bg-white/40'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={() => handleNav(current + 1)}
              className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:border-white/25 transition-all duration-200"
              aria-label="Next testimonial"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
