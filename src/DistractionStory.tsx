import { useEffect, useRef, useState } from 'react';
import { asset } from './paths';

type Dust = { x: number; y: number; dx: number; dy: number; size: number };
export default function DistractionStory() {
  const track = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const media = matchMedia('(max-width: 520px)');
    const update = () => setCompact(media.matches);
    update(); media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    const element = stage.current!;
    const scrollTrack = track.current!;
    if (!('IntersectionObserver' in window)) {
      element.dataset.static = 'true';
      element.dataset.shot = 'study';
      element.dataset.motion = 'paused';
      element.style.setProperty('--study', '1');
      element.style.setProperty('--thought-opacity', '0');
      return;
    }
    const canvas = element.querySelector('canvas')!;
    const context = canvas.getContext('2d');
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0, active = true;
    const dust: Dust[] = [];
    element.querySelectorAll<SVGGeometryElement>(`.${compact ? 'mobile' : 'desktop'}-thoughts .thought-lines path`).forEach(shape => {
      const length = shape.getTotalLength();
      for (let distance = 0; distance < length; distance += 7) {
        const point = shape.getPointAtLength(distance), seed = dust.length + 1;
        dust.push({ x: point.x, y: point.y, dx: Math.sin(seed * 12.9898) * 95 + 55, dy: Math.cos(seed * 7.23) * 70 - 60, size: .8 + (seed % 3) * .4 });
      }
    });
    const render = () => {
      frame = 0;
      if (document.hidden || !active) return;
      const bounds = scrollTrack.getBoundingClientRect();
      // Hold the complete first drawing, then dissolve, then settle into study.
      const raw = Math.max(0, Math.min(1, -bounds.top / Math.max(1, bounds.height - innerHeight)));
      const ramp = (start: number, end: number) => Math.max(0, Math.min(1, (raw - start) / (end - start)));
      const dissolve = ramp(.12, .3);
      const study = ramp(.79, .9);
      const pov = ramp(.28, .4) * (1 - ramp(.56, .65));
      const timer = ramp(.56, .65) * (1 - ramp(.78, .88));
      const camera = ramp(.2, .39) * (1 - ramp(.79, .93));
      element.style.setProperty('--pov', String(preference.matches ? 0 : pov));
      element.style.setProperty('--timer', String(preference.matches ? 0 : timer));
      element.style.setProperty('--camera', String(preference.matches ? 0 : camera));
      element.style.setProperty('--timer-turn', `${(1 - ramp(.56, .68)) * -80}deg`);
      element.dataset.shot = preference.matches ? 'study' : raw < .12 ? 'thoughtful' : raw < .3 ? 'dust' : raw < .56 ? 'phone-pov' : raw < .79 ? 'flip-timer' : 'study';
      element.style.setProperty('--thought-opacity', String(preference.matches ? 1 : 1 - dissolve));
      element.style.setProperty('--study', String(preference.matches ? 0 : study));
      element.dataset.dissolved = String(!preference.matches && dissolve >= .99);
      element.dataset.studying = String(!preference.matches && study >= .99);
      element.dataset.motion = !preference.matches && active && !document.hidden ? 'running' : 'paused';
      if (!context) return;
      const drawing = element.querySelector('svg')!;
      const svg = drawing.getBoundingClientRect();
      const scale = Math.min(devicePixelRatio || 1, 2);
      const width = Math.round(svg.width * scale), height = Math.round(svg.height * scale);
      if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
      context.resetTransform();
      context.clearRect(0, 0, width, height);
      // SVG preserves its aspect ratio inside the paper. Use its real transform,
      // including any letterboxing, so each particle starts on its pencil line.
      const matrix = drawing.getScreenCTM();
      if (!matrix || !svg.width || !svg.height) return;
      const sx = width / svg.width, sy = height / svg.height;
      context.setTransform(matrix.a * sx, matrix.b * sy, matrix.c * sx, matrix.d * sy, (matrix.e - svg.left) * sx, (matrix.f - svg.top) * sy);
      if (preference.matches || dissolve <= 0 || dissolve >= 1) return;
      context.fillStyle = getComputedStyle(element).color;
      context.globalAlpha = Math.sin(dissolve * Math.PI) * .75;
      dust.slice(0, 420).forEach(p => {
        context.beginPath(); context.arc(p.x + p.dx * dissolve, p.y + p.dy * dissolve, p.size * (1 - dissolve * .6), 0, Math.PI * 2); context.fill();
      });
      context.globalAlpha = 1;
    };
    const schedule = () => { if (!frame && active && !document.hidden) frame = requestAnimationFrame(render); };
    const observer = new IntersectionObserver(([entry]) => {
      active = entry.isIntersecting;
      element.dataset.motion = active && !document.hidden && !preference.matches ? 'running' : 'paused';
      if (active) schedule(); else { cancelAnimationFrame(frame); frame = 0; }
    });
    const visibility = () => {
      element.dataset.motion = active && !document.hidden && !preference.matches ? 'running' : 'paused';
      schedule();
    };
    observer.observe(scrollTrack);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    document.addEventListener('visibilitychange', visibility);
    preference.addEventListener('change', schedule); schedule();
    return () => {
      cancelAnimationFrame(frame); observer.disconnect();
      window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule);
      document.removeEventListener('visibilitychange', visibility); preference.removeEventListener('change', schedule);
    };
  }, [compact]);
  return <section className="manifesto section" id="manifesto"><span className="eyebrow">YOU DON’T NEED MORE WILLPOWER.</span><h2 className="reveal">You need a little<br/><span className="serif">space between</span><br/>the impulse and the scroll.</h2><p className="story-intro">A moment to notice the pull. A little room to choose differently.</p><div className="story-scroll" ref={track}><div className="sketch-stage" ref={stage}>
    <div className="sketch-paper"><svg className="mind-sketch" viewBox={compact ? '260 0 400 650' : '0 0 900 570'} role="img" aria-labelledby="sketch-title sketch-description"><title id="sketch-title">From a crowded mind to a quiet study session</title><desc id="sketch-description">A hand-drawn boy holds a phone beneath looping thoughts: One more video, Wait…, and What time is it? As the page moves, the pencil lines break into dust and he puts his phone down to write in an open book. The camera moves over his shoulder to a real FocusForge Shield app render, then into an illustrative full-screen flip timer before pulling back to show him studying. Reduced motion shows the final study scene without camera moves.</desc>
      <defs><marker id="pencil-arrow" markerWidth="9" markerHeight="9" refX="7" refY="4" orient="auto"><path d="m1 1 6 3-6 3" fill="none" stroke="currentColor" strokeWidth="1.3"/></marker><pattern id="pencil-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(24)"><path d="M0 0V5" stroke="currentColor" strokeWidth=".55" opacity=".3"/></pattern></defs>
      <g className="desktop-thoughts"><g className="thought-lines" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M423 154C376 125 363 185 321 157S300 90 331 111 302 160 270 118L242 96" markerEnd="url(#pencil-arrow)"/>
        <path d="M475 129C505 95 502 44 550 59S587 112 560 99 582 50 629 64" markerEnd="url(#pencil-arrow)"/>
        <path d="M489 181C545 157 553 229 590 213S624 169 599 173 611 226 658 210" markerEnd="url(#pencil-arrow)"/>
        <path d="M57 42 255 39 261 102 53 106Z M651 33 788 30 792 92 646 95Z M668 183 878 180 881 246 665 249Z"/>
      </g><g className="thought-words" fill="currentColor" textAnchor="middle"><text x="156" y="79">One more video</text><text x="717" y="69">Wait…</text><text x="773" y="221">What time is it?</text></g></g>
      <g className="mobile-thoughts"><g className="thought-lines" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m285 22 173-2 2 43-176 3z M493 29l130 2-1 43-129-2z M385 101l216-3 2 44-219 2z M349 69c-23 33 62 17 47 47s-37-8-16-13 43 22 49 65 M558 76c22 24-21 25-22 10s-37 25-54 84"/></g><g className="thought-words" textAnchor="middle" fill="currentColor"><text x="371" y="50">One more video</text><text x="558" y="59">Wait…</text><text x="492" y="129">What time is it?</text></g></g>
      <g className="figure-scene" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
        <g className="boy-outline">
          <g className="boy-head"><path d="M411 194c-17-30-8-69 18-80 31-13 69 2 72 37l-5 22 11 15-14 5c-2 25-15 38-35 35l-3 24m-35-46-7 35"/><path fill="url(#pencil-hatch)" d="M408 164c-8-31 7-62 33-64 3-15 19-10 24-3 14-7 35 4 36 18 17 6 15 27 4 37l-17-13-7 12-16-18-9 16-17-12-8 27m-14 16c-17-19-23 3-9 13l9 1"/><path d="m413 122 14-13m-15 25 16-18m-14 29 16-18m3-16 6 15m6-24 6 21m9-15 4 14m12-7 3 11m-62 54 4 6m58-17 7 2m-11-8 11 1m-12 36 13-2m-12 12 10-3"/><path className="pencil-echo" d="M400 170c-9-27-1-57 25-69m40 128 18-7m-76-43 3 13"/></g>
          <path fill="url(#pencil-hatch)" d="m423 241 25 17 15-17 30 14 20 49-18 42-9 80-108-10 14-65-14-21 13-71z"/><path d="m423 241 25 17 15-17 30 14 19 49m-89-63-32 18-36 95c-6 19 5 32 25 24l66-28m-44-72-20 62 51-17m-53 62-9 73m-35-23 112 12 11-60m-84-91 9 14m-7 78 4 14m64-11-3 27m-49-38 3 49m8-39 1 42m9-24v26"/>
          <g className="phone-pose"><path d="M479 291 512 328 538 310M491 337l17 20q9 8 20 0l33-31M512 328l14 14M538 310l5-17q2-8 7-5l-2 17 13 6q7 3 3 10l-9 10-11-3M550 311l11 4m-14 2 11 4m-14 1 9 4"/>
          <g className="sketch-phone"><path fill="var(--paper)" d="m545 256 31 11q5 2 3 7l-18 48q-2 4-6 2l-31-11q-4-1-2-6l18-47q1-5 5-4Z"/><path d="m546 264 25 9-15 41-25-9z m5-3 10 4m-19 47 5 2"/><path className="pencil-echo" d="m544 278 20 7m-23 0 20 7m-23 0 15 5m-13 1 10 4"/><path strokeWidth=".8" d="m575 276-17 44m-31-11 28 10"/></g></g>
          <g className="writing-pose"><path d="m480 290 32 47 49 36m-71-36 16 22 45 25m-128-50 40 25 43 12m-87-20 39 22 39 9"/><g className="writing-hand"><path fill="var(--paper)" d="m549 372 9-8 14 5 7 12-8 6-20-5z"/><path d="m563 369 13 6m-16-1 13 7m-16-2 12 7m-5-21 17 32m-3-1 4 1-1-5"/></g><path d="m499 369 16 2 9 6-3 7-20-4m6-5 12 4"/></g>
          <path d="m381 421 86 9 58 25m-75-27-59 35m-34 5 220 1m-185-58 5-32m12 38 5-30m12 32 5-28m12 29 5-27"/><path className="pencil-echo" d="m355 355c-5 20 7 35 28 28m-5 44 91 9m-72 33 176 4m-39-17-12 8"/>
        </g>
        <g className="study-desk"><path fill="var(--paper)" d="m305 395 326-2 5 11-333 2z"/><path d="m321 407-8 105m300-107 12 106m-300-85 287-1m-292 83-8 5m313-6 8 5"/><path className="pencil-echo" d="m310 398 317-2m-303 14-8 93m302-88 8 88"/><path fill="var(--paper)" d="m464 383 40-17 33 11 35-10 40 21-73 7z"/><path d="m537 377 2 18m-70-9 67 12 72-8m-123-11 18-6 22 7m-34 0 12-4 22 7m29-3 18-5 18 9m-31 1 13-3 17 7"/><path fill="url(#pencil-hatch)" d="m329 375 18-1 5 20h-28z"/><path d="m349 379c16-5 15 13 1 11m-21-26c-9-12 10-13 1-24"/><path className="desk-phone" d="m584 399 30-3 9 4-31 3z"/></g>
      </g>
    </svg><canvas className="thought-dust" aria-hidden="true"/></div><div className="story-pov" aria-hidden="true"><svg className="shoulder-foreground" viewBox="0 0 800 600"><path d="M-80 650V405Q-10 320 90 298L112 258Q30 210 66 118Q95 20 192 65Q269 110 233 202L210 258Q310 295 357 385L400 650"/><path className="pov-arm" d="M308 505Q393 454 470 385L486 247Q490 222 505 228L517 280 533 258Q546 246 552 264L566 349Q565 397 537 424L432 554"/></svg><div className="pov-device"><img src={asset('images/shield-dark.png')} alt="" width="680" height="1416"/><span className="pov-touch"/></div><p>Choose your boundaries.</p><small>Actual app widget-test render · fictional demo data</small></div><div className="story-timer" aria-hidden="true"><span>Focus session</span><div className="flip-clock"><div className="flip-digit">25<span className="flip-leaf">25</span></div><b>:</b><div className="flip-digit">00<span className="flip-leaf">00</span></div></div><p>One thing at a time.</p><small>Full-screen timer concept · not a running session</small></div><div className="story-captions" aria-hidden="true"><span className="before-caption">A little less in your head.</span><span className="after-caption">A little more here.</span></div><p className="reduced-story">Choose app boundaries. Set a full-screen timer. Put the phone down and make room for studying. App preview and timer sequence are illustrations, not live controls.</p>
  </div></div></section>;
}
