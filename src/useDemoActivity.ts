import { useEffect, useState, type RefObject } from 'react';

// Intersection and visibility are independent of the parent's decorative motion.
export function useDemoActivity(ref: RefObject<HTMLElement | null>) {
  const [active, setActive] = useState(false);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let inView = !('IntersectionObserver' in window);
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => { setActive(inView && !document.hidden); setReduced(preference.matches); };
    const observer = 'IntersectionObserver' in window ? new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; sync(); }, { threshold: 0 }) : undefined;
    if (ref.current) observer?.observe(ref.current);
    document.addEventListener('visibilitychange', sync);
    preference.addEventListener('change', sync);
    sync();
    return () => { observer?.disconnect(); document.removeEventListener('visibilitychange', sync); preference.removeEventListener('change', sync); };
  }, [ref]);
  return { active, reduced };
}
// One wall-clock-aligned timer for visible demos; no page-level state updates.
const clockSubscribers = new Set<(now: number) => void>();
let clockTimer: ReturnType<typeof setTimeout> | undefined;
function tick() {
  clearTimeout(clockTimer);
  clockTimer = undefined;
  if (document.hidden || !clockSubscribers.size) return;
  const now = Date.now();
  clockSubscribers.forEach(subscriber => subscriber(now));
  if (clockSubscribers.size) clockTimer = setTimeout(tick, 1000 - now % 1000 + 1);
}
export function useDemoElapsed(active: boolean, limit: number) {
  const [started] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!active) return;
    const sync = (now: number) => {
      const seconds = Math.min(limit, Math.floor((now - started) / 1000));
      setElapsed(seconds);
      if (seconds >= limit) clockSubscribers.delete(sync);
    };
    if (!clockSubscribers.size) document.addEventListener('visibilitychange', tick);
    clockSubscribers.add(sync);
    tick();
    return () => {
      clockSubscribers.delete(sync);
      if (!clockSubscribers.size) {
        clearTimeout(clockTimer);
        clockTimer = undefined;
        document.removeEventListener('visibilitychange', tick);
      }
    };
  }, [active, limit, started]);
  return elapsed;
}
export function demoTime(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
