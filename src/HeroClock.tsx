import { useEffect, useRef, useState } from 'react';
import { asset } from './paths';

// Capture: 680 × 1416. Canvas pixel inspection bounds the bright 25:00
// glyphs at x=233..448, y=597..660. The mask adds a four-pixel margin;
// dial ticks and REMAINING stay untouched. The app's RetroClock uses
// InterDisplay, 1.05 line-height and -.048em tracking (clock_faces.dart).
// Our self-hosted bold face measures 215 × 64px at 86px, matching the capture.
export default function HeroClock() {
  const phone = useRef<HTMLDivElement>(null);
  const [remaining, setRemaining] = useState(25 * 60);
  useEffect(() => {
    const deadline = Date.now() + 25 * 60 * 1000;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let visible = true;
    const sync = () => {
      clearTimeout(timer);
      if (document.hidden || !visible) return;
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(left);
      // Align to this countdown's deadline, not the wall clock's second phase.
      // A resumed/background-throttled callback always recomputes elapsed time.
      if (left) timer = setTimeout(sync, Math.max(16, deadline - Date.now() - (left - 1) * 1000 + 1));
    };
    const observer = 'IntersectionObserver' in window ? new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    }) : undefined;
    observer?.observe(phone.current!);
    document.addEventListener('visibilitychange', sync);
    sync();
    return () => { clearTimeout(timer); observer?.disconnect(); document.removeEventListener('visibilitychange', sync); };
  }, []);
  const time = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`;
  return <div className="hero-phone phone-front" ref={phone}>
    <img src={asset('images/focus-dark.png')} alt="FocusForge focus app capture with fictional data and an animated demo countdown, not a live session" width="680" height="1416" fetchPriority="high"/>
    <span className="hero-demo-clock" role="timer" aria-live="off" aria-label={`Illustrative countdown: ${time} remaining`}><span>{time}</span></span>
  </div>;
}
