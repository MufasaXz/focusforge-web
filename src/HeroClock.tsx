import { useEffect, useRef, useState } from 'react';
import { asset } from './paths';
import { demoTime, useDemoActivity, useDemoElapsed } from './useDemoActivity';

// The verified 680 × 1416 capture's dial is centered at (340, 620),
// s=504, r=.47s. Only the digit slot and original progress pointer are
// masked in Retro. Other faces use captures of their own actual app layout,
// with only the timer glyphs cleared for the synchronized live overlay.
// Coordinates come from Flutter render bounds in images/clock-provenance.json.
const faces = ['Retro', 'Flip', 'Minimal'] as const;
function FlipDigit({ glyph, animate }: { glyph: string; animate: boolean }) {
  const card = useRef<HTMLSpanElement>(null);
  const previous = useRef(glyph);
  useEffect(() => {
    const outgoing = previous.current;
    previous.current = glyph;
    if (!animate || outgoing === glyph || !card.current?.animate) return;
    const top = card.current.querySelector<HTMLElement>('.flip-falling')!;
    const bottom = card.current.querySelector<HTMLElement>('.flip-rising')!;
    top.firstElementChild!.textContent = outgoing;
    const options = { duration: 210, fill: 'both' as const, easing: 'ease-in-out' };
    const falling = top.animate([{ transform: 'rotateX(0deg)', visibility: 'visible' }, { transform: 'rotateX(-90deg)', visibility: 'hidden' }], options);
    const rising = bottom.animate([{ transform: 'rotateX(90deg)', visibility: 'hidden' }, { transform: 'rotateX(0deg)', visibility: 'visible' }], { ...options, delay: 210 });
    return () => { falling.cancel(); rising.cancel(); };
  }, [glyph, animate]);
  return <span className="demo-flip-card" ref={card}><span className="flip-half flip-top"><span>{glyph}</span></span><span className="flip-half flip-bottom"><span>{glyph}</span></span><span className="flip-half flip-top flip-falling"><span>{glyph}</span></span><span className="flip-half flip-bottom flip-rising"><span>{glyph}</span></span></span>;
}
function MinimalRing({ progress }: { progress: number }) {
  const angle = progress * Math.PI * 2 - Math.PI / 2;
  return <svg className="minimal-progress-ring" viewBox="0 0 680 1416" aria-hidden="true">
    <circle cx="340" cy="561.67" r="195.62" fill="none" stroke="#e5c36c" strokeWidth="19.56" strokeLinecap="round" pathLength="1" strokeDasharray={progress + ' 1'} transform="rotate(-90 340 561.67)"/>
    {progress > 0 && <circle cx={340 + 195.62 * Math.cos(angle)} cy={561.67 + 195.62 * Math.sin(angle)} r="6.26" fill="#e5c36c"/>}
  </svg>;
}
export default function HeroClock() {
  const phone = useRef<HTMLDivElement>(null);
  const { active, reduced } = useDemoActivity(phone);
  const remaining = 1500 - useDemoElapsed(active, 1500);
  const [face, setFace] = useState(0);
  const rotation = useRef(0);
  const hold = useRef(5000);
  useEffect(() => {
    if (reduced) { rotation.current = 0; hold.current = 5000; setFace(0); return; }
    if (!active) return;
    // Five seconds of visible hold; the 480ms transition is additional.
    // Rotation pauses, while the independent wall-clock countdown catches up.
    let start = performance.now();
    let timer: ReturnType<typeof setTimeout>;
    const advance = () => {
      rotation.current = 0;
      hold.current = 5480;
      setFace(value => (value + 1) % faces.length);
      start = performance.now();
      timer = setTimeout(advance, 5480);
    };
    timer = setTimeout(advance, Math.max(0, hold.current - rotation.current));
    return () => { clearTimeout(timer); rotation.current += performance.now() - start; };
    // Face changes belong to this timer, not a page-wide render/ticker.
  }, [active, reduced]);
  const time = demoTime(remaining);
  const angle = (1500 - remaining) / 1500 * 360;
  const progress = (1500 - remaining) / 1500;
  return <div className="hero-phone phone-front" ref={phone} data-face={faces[reduced ? 0 : face]} data-clock-motion={active ? 'running' : 'paused'}>
    <img src={asset('images/focus-dark.png')} alt="FocusForge focus app capture with fictional data and animated clock-face demos, not a live session or physical-device screenshot" width="680" height="1416" fetchPriority="high"/>
    <img className={'hero-face-capture ' + (face === 1 && !reduced ? 'face-visible' : '')} src={asset('images/focus-flip-dark.png')} alt="" width="680" height="1416" aria-hidden="true"/>
    <img className={'hero-face-capture ' + (face === 2 && !reduced ? 'face-visible' : '')} src={asset('images/focus-minimal-dark.png')} alt="" width="680" height="1416" aria-hidden="true"/>
    <svg className={`hero-retro-pointer ${face === 0 || reduced ? 'face-visible' : ''}`} viewBox="0 0 680 1416" aria-hidden="true">
      <defs><linearGradient id="pointer-mask" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#2f3034"/><stop offset="1" stopColor="#2c2d30"/></linearGradient></defs>
      <path d="M328 394H352V448H328Z" fill="url(#pointer-mask)"/>
      <path d="M340 415V448" stroke="#a7a197" strokeWidth="5" strokeLinecap="round"/>
      <g className="retro-hand" transform={`rotate(${angle} 340 620)`} data-angle={angle}><path d="M340 437V395" stroke="#e5c36c" strokeWidth="7" strokeLinecap="round"/><circle cx="340" cy="396" r="8.5" fill="#e5c36c"/></g>
    </svg>
    <span className={`hero-demo-clock ${face === 0 || reduced ? 'face-visible' : ''}`} aria-hidden="true"><span>{time}</span></span>
    <div className={`hero-face hero-face-flip ${face === 1 && !reduced ? 'face-visible' : ''}`} aria-hidden="true"><div className="demo-flip-board">{time.split('').map((glyph, i) => glyph === ':' ? <span className="demo-flip-colon" key={i}><i/><i/></span> : <FlipDigit key={i} glyph={glyph} animate={active && face === 1 && !reduced}/>)}</div></div>
    <div className={"hero-minimal-progress " + (face === 2 && !reduced ? "face-visible" : "")} aria-hidden="true"><MinimalRing progress={progress}/></div>
    <div className={"hero-face hero-face-minimal " + (face === 2 && !reduced ? "face-visible" : "")} aria-hidden="true"><span className="hero-minimal-digits">{time.split("").map((glyph, i) => <span key={i} className={glyph === ":" ? "minimal-colon" : ""}>{glyph}</span>)}</span><i><b style={{ transform: "scaleX(" + progress + ")" }}/></i></div>
    <span className="clock-a11y" role="timer" aria-live="off" aria-label={`Animated ${faces[reduced ? 0 : face]} clock demo: ${time} remaining`}>{time}</span>
  </div>;
}
