import { useEffect, useRef, useState } from 'react';
import { asset } from './paths';
import { demoTime, useDemoActivity } from './useDemoActivity';

const faces = ['Retro', 'Flip', 'Minimal'] as const;
const duration = 1500;
const hold = 6000;

// Face rotation, digits and ring all sample this one visible-time timeline.
// A suspended tab resumes at the same point without replaying missed flips.
function useClockTimeline(active: boolean, reduced: boolean) {
  const elapsed = useRef(0);
  const [frame, setFrame] = useState({ seconds: 0, progress: 0, face: 0 });
  useEffect(() => {
    if (!active) return;
    let request = 0;
    let previous = performance.now();
    const tick = (now: number) => {
      if (document.hidden) { previous = now; request = requestAnimationFrame(tick); return; }
      elapsed.current += Math.max(0, now - previous);
      previous = now;
      const total = Math.min(elapsed.current / 1000, duration);
      setFrame({ seconds: Math.floor(total), progress: total / duration, face: reduced ? 0 : Math.floor(elapsed.current / hold) % faces.length });
      request = requestAnimationFrame(tick);
    };
    request = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(request);
  }, [active, reduced]);
  return { ...frame, face: reduced ? 0 : frame.face };
}

function FlipDigit({ glyph, animate }: { glyph: string; animate: boolean }) {
  const card = useRef<HTMLSpanElement>(null);
  const previous = useRef(glyph);
  const [turn, setTurn] = useState<{ from: string; to: string } | null>(null);
  useEffect(() => {
    const from = previous.current;
    previous.current = glyph;
    if (!animate || from === glyph) { setTurn(null); return; }
    setTurn({ from, to: glyph });
  }, [glyph, animate]);
  useEffect(() => {
    if (!turn || !card.current) return;
    const options = { duration: 520, fill: 'both' as const, easing: 'linear' };
    const falling = card.current.querySelector('.flip-falling')!.animate([
      { transform: 'rotateX(0deg)', visibility: 'visible', offset: 0 },
      { transform: 'rotateX(-90deg)', visibility: 'hidden', offset: .5 },
      { transform: 'rotateX(-90deg)', visibility: 'hidden', offset: 1 },
    ], options);
    const rising = card.current.querySelector('.flip-rising')!.animate([
      { transform: 'rotateX(90deg)', visibility: 'hidden', offset: 0 },
      { transform: 'rotateX(90deg)', visibility: 'visible', offset: .5 },
      { transform: 'rotateX(0deg)', visibility: 'visible', offset: 1 },
    ], options);
    falling.startTime = rising.startTime = document.timeline.currentTime;
    rising.finished.then(() => setTurn(null)).catch(() => {});
    return () => { falling.cancel(); rising.cancel(); };
  }, [turn]);
  return <span className="demo-flip-card" ref={card} data-digit={glyph} data-flipping={!!turn}>
    <span className="flip-half flip-top"><span>{glyph}</span></span>
    <span className="flip-half flip-bottom"><span>{turn?.from ?? glyph}</span></span>
    <span className="flip-half flip-top flip-falling"><span>{turn?.from ?? glyph}</span></span>
    <span className="flip-half flip-bottom flip-rising"><span>{glyph}</span></span>
  </span>;
}

export default function HeroClock() {
  const phone = useRef<HTMLDivElement>(null);
  const { active, reduced } = useDemoActivity(phone);
  const { seconds, progress, face } = useClockTimeline(active, reduced);
  const time = demoTime(duration - seconds);
  const angle = progress * 360;
  return <div className="hero-phone phone-front" ref={phone} data-face={faces[face]} data-clock-motion={active ? 'running' : 'paused'}>
    <img src={asset('images/focus-dark.png')} alt="FocusForge focus app capture with fictional data and animated clock-face demos" width="680" height="1416" fetchPriority="high"/>
    <div className="hero-clock-stage" aria-hidden="true">
      <div className={'clock-face hero-retro ' + (face === 0 ? 'face-visible' : '')}>
        <svg className="hero-retro-pointer" viewBox="0 0 560 560">
          <defs><radialGradient id="clock-dial"><stop stopColor="#30312f"/><stop offset="1" stopColor="#242522"/></radialGradient></defs>
          <circle cx="280" cy="264" r="240" fill="url(#clock-dial)" stroke="#41423d" strokeWidth="2"/>
          {Array.from({ length: 60 }, (_, i) => <line key={i} x1="280" y1={i % 5 ? 42 : 36} x2="280" y2={i % 5 ? 51 : 58} stroke={i % 5 ? '#62665e' : '#b2b4a6'} strokeWidth={i % 5 ? 1.5 : 3} transform={'rotate(' + i * 6 + ' 280 264)'}/>)}
          <g className="retro-hand" transform={'rotate(' + angle + ' 280 264)'} data-angle={angle}><path d="M280 35V68" stroke="#e5c36c" strokeWidth="6" strokeLinecap="round"/><circle cx="280" cy="35" r="7" fill="#e5c36c"/></g>
          {[0, 10, 20, 30, 40, 50].map(n => { const a = n / 60 * Math.PI * 2 - Math.PI / 2; return <text key={n} x={280 + 185 * Math.cos(a)} y={264 + 185 * Math.sin(a) + 5} textAnchor="middle" fill="#a8ac9f" fontSize="15">{String(n).padStart(2, '0')}</text>; })}
        </svg>
        <span className="hero-demo-clock"><small>REMAINING</small><span>{time}</span></span>
      </div>
      <div className={'clock-face hero-face-flip ' + (face === 1 ? 'face-visible' : '')}>
        <span className="clock-face-label">REMAINING</span>
        <div className="demo-flip-board">{time.split('').map((glyph, i) => glyph === ':' ? <span className="demo-flip-colon" key={i}><i/><i/></span> : <FlipDigit key={i} glyph={glyph} animate={active && face === 1 && !reduced}/>)}</div>
      </div>
      <div className={'clock-face hero-face-minimal ' + (face === 2 ? 'face-visible' : '')}>
        <svg className="minimal-progress-ring" viewBox="0 0 560 560"><circle cx="280" cy="264" r="211" fill="none" stroke="#46483e" strokeWidth="4"/><circle cx="280" cy="264" r="211" fill="none" stroke="#e5c36c" strokeWidth="8" strokeLinecap="round" pathLength="1" strokeDasharray={progress + ' 1'} transform="rotate(-90 280 264)"/></svg>
        <span className="hero-minimal-digits">{time}</span>
        <span className="minimal-label">A little more focus.</span>
      </div>
      <span className="clock-mode-label">Focus<span>One session at a time</span></span>
    </div>
    <span className="clock-a11y" role="timer" aria-live="off" aria-label={'Animated ' + faces[face] + ' clock demo: ' + time + ' remaining'}>{time}</span>
  </div>;
}
