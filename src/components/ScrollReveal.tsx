import React, { useRef, useEffect, useState } from 'react';

interface ScrollRevealProps {
  children: React.ReactNode;
  /** Extra delay in ms before the animation starts once in view */
  delay?: number;
  /** How far below its natural position the element starts (Tailwind translate-y value) */
  className?: string;
}

/**
 * Wraps any content so it fades up once when it enters the viewport.
 * Uses IntersectionObserver — no scroll listeners, no jank.
 */
const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  delay = 0,
  className = '',
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect(); // fire once only
        }
      },
      {
        threshold: 0.08,
        rootMargin: '0px 0px -50px 0px', // trigger slightly before fully on screen
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all ease-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      } ${className}`}
      style={{
        transitionDuration: '700ms',
        transitionDelay: visible ? `${delay}ms` : '0ms',
      }}
    >
      {children}
    </div>
  );
};

export default ScrollReveal;
