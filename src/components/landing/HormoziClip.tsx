import React, { useEffect, useRef, useState } from 'react';
import { Play, Volume2 } from 'lucide-react';
import { Section, Heading, Em } from './kit';

/**
 * A 39-second Short from Alex Hormozi's own YouTube channel ("Using DM's for
 * getting clients", 975k views), on why one person sending cold DMs every day
 * is enough to get clients. Chosen by the owner on 2026-10-16.
 *
 * Played through YouTube's privacy-enhanced embed, never re-hosted. It mounts
 * only when the section scrolls into view, starts muted (the only way a
 * browser allows a video to start by itself) and pauses when it scrolls away.
 * "Tap for sound" unmutes it. Visitors who ask for reduced motion get a still
 * frame and a play button instead of autoplay.
 *
 * The note under it says Hormozi has no tie to MagnetEngine: a famous face
 * next to a product reads as an endorsement unless the page says otherwise.
 */

const VIDEO_ID = 'jKpYqDrZUNE';
const WATCH_URL = `https://www.youtube.com/shorts/${VIDEO_ID}`;

function embedSrc(muted: boolean): string {
    const params = new URLSearchParams({
        autoplay: '1',
        mute: muted ? '1' : '0',
        playsinline: '1',
        loop: '1',
        playlist: VIDEO_ID,     // `loop` needs the video named as its own playlist
        rel: '0',
        modestbranding: '1',
        enablejsapi: '1',       // lets the page pause, play and unmute it
        origin: window.location.origin,
    });
    return `https://www.youtube-nocookie.com/embed/${VIDEO_ID}?${params}`;
}

/** Tell the embedded player to do something (the iframe API's postMessage form). */
function send(frame: HTMLIFrameElement | null, func: 'playVideo' | 'pauseVideo' | 'unMute') {
    frame?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args: [] }), '*');
}

export const HormoziClip: React.FC = () => {
    const box = useRef<HTMLDivElement>(null);
    const frame = useRef<HTMLIFrameElement>(null);
    const [reduced] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
    /** The player is mounted once the visitor first reaches it, and stays mounted. */
    const [started, setStarted] = useState(false);
    /** Fixed when the player mounts, so unmuting never reloads it. */
    const [startMuted, setStartMuted] = useState(true);
    const [muted, setMuted] = useState(true);

    useEffect(() => {
        const el = box.current;
        if (!el || reduced || typeof IntersectionObserver === 'undefined') return;
        const io = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setStarted(true);
                send(frame.current, 'playVideo');
            } else {
                send(frame.current, 'pauseVideo');
            }
        }, { threshold: 0.6 });
        io.observe(el);
        return () => io.disconnect();
    }, [reduced]);

    const unmute = () => {
        send(frame.current, 'unMute');
        send(frame.current, 'playVideo');
        setMuted(false);
    };

    // The reduced-motion path: a click is the visitor's own gesture, so it can start with sound.
    const playWithSound = () => {
        setStartMuted(false);
        setMuted(false);
        setStarted(true);
    };

    return (
        <Section id="hormozi">
            <div className="max-w-5xl mx-auto grid md:grid-cols-[minmax(0,1fr)_280px] gap-12 md:gap-16 items-center">
                <div>
                    <Heading>
                        Cold DMs get clients. <Em>Writing them is the hard part.</Em>
                    </Heading>
                    <p className="mt-6 text-lead text-neutral-400 max-w-[46ch]">
                        In 39 seconds, Alex Hormozi on why one person sending DMs every day is enough to get
                        clients.{' '}
                        <span className="text-white font-medium">
                            MagnetEngine finds the people and writes every one of those DMs — you approve them in ten
                            minutes a day.
                        </span>
                    </p>
                    <p className="mt-6 text-meta text-neutral-500">
                        Alex Hormozi isn't affiliated with MagnetEngine and doesn't endorse it.{' '}
                        <a href={WATCH_URL} target="_blank" rel="noreferrer" className="text-neutral-400 underline decoration-white/20 underline-offset-2 hover:text-white">
                            Watch on YouTube
                        </a>
                    </p>
                </div>

                <div ref={box} className="mx-auto md:mx-0 w-[280px] max-w-full">
                    <div className="relative aspect-[9/16] rounded-[1.5rem] overflow-hidden border border-white/10 bg-surface-raised shadow-2xl shadow-black/60">
                        {started ? (
                            <iframe
                                ref={frame}
                                src={embedSrc(startMuted)}
                                title="Alex Hormozi: Using DM's for getting clients"
                                allow="autoplay; encrypted-media; picture-in-picture"
                                allowFullScreen
                                className="absolute inset-0 w-full h-full"
                            />
                        ) : (
                            <button
                                type="button"
                                onClick={playWithSound}
                                className="group absolute inset-0 w-full h-full"
                                aria-label="Play the clip: Alex Hormozi on using DMs to get clients"
                            >
                                <img
                                    src={`https://i.ytimg.com/vi/${VIDEO_ID}/hqdefault.jpg`}
                                    alt=""
                                    loading="lazy"
                                    className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity"
                                />
                                <span className="absolute inset-0 flex items-center justify-center">
                                    <span className="w-14 h-14 rounded-full bg-white text-surface flex items-center justify-center shadow-xl">
                                        <Play className="w-5 h-5 ml-0.5" aria-hidden />
                                    </span>
                                </span>
                            </button>
                        )}
                    </div>
                    {/* Below the player, not on it: YouTube moves its own controls
                        around the frame, so anything laid over it covers one. */}
                    <div className="mt-4 h-9 flex justify-center">
                        {started && muted && (
                            <button
                                type="button"
                                onClick={unmute}
                                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white text-surface text-meta font-semibold whitespace-nowrap shadow-xl hover:bg-neutral-200 transition-colors"
                            >
                                <Volume2 className="w-4 h-4" aria-hidden /> Tap for sound
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </Section>
    );
};
