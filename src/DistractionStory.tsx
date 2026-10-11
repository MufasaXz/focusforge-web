import { useEffect, useRef, useState } from 'react';

type Dust = { x: number; y: number; dx: number; dy: number; size: number };
export default function DistractionStory() {
  const stage = useRef<HTMLDivElement>(null);
  const [quiet, setQuiet] = useState(false);
  const manual = useRef<boolean | null>(null);
  useEffect(() => {
    const element = stage.current!;
    const canvas = element.querySelector('canvas')!;
    const context = canvas.getContext('2d');
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let active = true;
    const dust: Dust[] = [];
    // Sample original thought contours, not a screen-sized particle field.
    element.querySelectorAll<SVGGeometryElement>('.thought-lines path, .thought-lines rect').forEach(shape => {
      const length = shape.getTotalLength();
      for (let distance = 0; distance < length; distance += 9) {
        const point = shape.getPointAtLength(distance);
        const seed = dust.length + 1;
        dust.push({ x: point.x, y: point.y, dx: Math.sin(seed * 12.9898) * 105 + 80, dy: Math.cos(seed * 7.23) * 75 - 65, size: 1 + (seed % 3) * .45 });
      }
    });
    const particles = dust.slice(0, 420);
    const render = () => {
      frame = 0;
      if (document.hidden || !active) return;
      const bounds = element.querySelector('svg')!.getBoundingClientRect();
      canvas.style.height = `${bounds.height}px`;
      const progress = manual.current !== null ? (manual.current ? 1 : 0) : Math.max(0, Math.min(1, (innerHeight * .28 - bounds.top) / (bounds.height * .65)));
      element.style.setProperty('--thought-opacity', String(Math.max(0, 1 - progress * 2.2)));
      element.dataset.dissolved = String(progress >= .99);
      const scale = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(bounds.width * scale);
      canvas.height = Math.round(bounds.height * scale);
      if (!context) return;
      context.setTransform(canvas.width / 900, 0, 0, canvas.height / 510, 0, 0);
      context.clearRect(0, 0, 900, 510);
      if (preference.matches || progress <= 0 || progress >= 1) return;
      context.fillStyle = getComputedStyle(element).color;
      context.globalAlpha = Math.sin(progress * Math.PI) * .8;
      particles.forEach(p => {
        context.beginPath();
        context.arc(p.x + p.dx * progress, p.y + p.dy * progress + progress * progress * 50, p.size * (1 - progress * .6), 0, Math.PI * 2);
        context.fill();
      });
      context.globalAlpha = 1;
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(render); };
    const observer = new IntersectionObserver(([entry]) => { active = entry.isIntersecting; if (active) schedule(); });
    observer.observe(element);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    document.addEventListener('visibilitychange', schedule);
    preference.addEventListener('change', schedule);
    schedule();
    return () => {
      cancelAnimationFrame(frame); observer.disconnect();
      window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule);
      document.removeEventListener('visibilitychange', schedule); preference.removeEventListener('change', schedule);
    };
  }, [quiet]);
  return <section className="manifesto section" id="manifesto"><span className="eyebrow">YOU DON’T NEED MORE WILLPOWER.</span><h2 className="reveal">You need a little<br/><span className="serif">space between</span><br/>the impulse and the scroll.</h2><p className="story-intro">A moment to notice the pull. A little room to choose differently.</p><div className="sketch-stage" ref={stage}>
    <svg className="mind-sketch" viewBox="0 0 900 510" role="img" aria-labelledby="sketch-title sketch-description"><title id="sketch-title">A pencil-outline boy looking at his phone</title><desc id="sketch-description">Curly thought arrows connect his mind to the distractions: One more video, Wait…, and What time is it? Scroll past to let the thoughts dissolve, or use the button below.</desc>
      <defs><marker id="pencil-arrow" markerWidth="9" markerHeight="9" refX="7" refY="4" orient="auto"><path d="m1 1 6 3-6 3" fill="none" stroke="currentColor" strokeWidth="1.3"/></marker></defs>
      <g className="thought-lines" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M423 154C376 125 363 185 321 157S300 90 331 111 302 160 270 118L242 96" markerEnd="url(#pencil-arrow)"/>
        <path d="M475 129C505 95 502 44 550 59S587 112 560 99 582 50 629 64" markerEnd="url(#pencil-arrow)"/>
        <path d="M489 181C545 157 553 229 590 213S624 169 599 173 611 226 658 210" markerEnd="url(#pencil-arrow)"/>
        <rect x="51" y="40" width="210" height="65" rx="8"/><rect x="645" y="31" width="145" height="62" rx="8"/><rect x="664" y="182" width="218" height="64" rx="8"/>
      </g>
      <g className="thought-words" fill="currentColor" textAnchor="middle"><text x="156" y="79">One more video</text><text x="717" y="69">Wait…</text><text x="773" y="221">What time is it?</text></g>
      <g className="boy-outline" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M411 194c-17-30-8-69 18-80 31-13 69 2 72 37l-5 22 11 15-14 5c-2 25-15 38-35 35l-3 24m-35-46-7 35"/>
        <path d="M408 164c-8-31 7-62 33-64 3-15 19-10 24-3 14-7 35 4 36 18 17 6 15 27 4 37l-17-13-7 12-16-18-9 16-17-12-8 27m-14 16c-17-19-23 3-9 13l9 1m-12-62 13-13m-9 24 15-17m-13 27 15-16"/>
        <path d="m477 170 7 2m-10 29 13-2m-64 43 25 16 15-17 30 14 19 49m-89-63-32 18-36 95c-6 19 5 32 25 24l66-28m-44-72-20 62 51-17m36-40 40 46 37-30m-65 31 18 20c9 10 19 8 29 0l36-35m-71-6 21-14m-102 63-9 73m-35-23 112 12 11-60"/>
        <path d="m488 316 22-12 15 3 17-17c7-7 15-2 10 5l-16 25-27 9m32-27 23 6m-14-12 19 7m-20-20 17 9m-22 14 17 7"/>
        <path className="sketch-phone" d="m543 260 33 12-19 49-33-12zM547 267l20 7-13 34-20-7z"/>
        <path d="m381 421 86 9 58 25m-75-27-59 35m-34 5 220 1m-185-58 5-32m12 38 5-30m12 32 5-28m12 29 5-27"/>
        <path className="pencil-echo" d="M400 170c-9-27-1-57 25-69m-70 254c-5 20 7 35 28 28m-5 44 91 9m-72 33 176 4"/>
      </g><g className="sketch-spark" stroke="currentColor" strokeWidth="1.5"><path d="m323 247-12-9m9 26-18 2m282 118 14-9m-9 24 18 4"/></g>
    </svg><canvas className="thought-dust" aria-hidden="true"/>
    <span className="sketch-caption">A little less in your head. A little more here.</span>
  </div><div className="noise-control"><p>Scroll to let the distractions go. Your attention stays.</p><button className="button" aria-pressed={quiet} onClick={() => { manual.current = !quiet; setQuiet(!quiet); }}>{quiet ? 'Bring back the noise' : 'Make a little space'}<span aria-hidden="true">{quiet ? '↺' : '↗'}</span></button><small>An interactive illustration. Actual shielding runs in the Android app.</small></div></section>;
}
