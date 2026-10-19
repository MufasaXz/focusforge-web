import { useEffect, useState, type RefObject } from 'react';

// Intersection and visibility are independent of the parent's decorative motion.
export function useDemoActivity(ref: RefObject<HTMLElement | null>) {
  const [active, setActive] = useState(false);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    let pending = 0;
    const sync = () => {
      const bounds = ref.current?.getBoundingClientRect();
      const inView = !!bounds && bounds.bottom > 0 && bounds.right > 0 && bounds.top < innerHeight && bounds.left < innerWidth;
      setActive(inView && !document.hidden);
      setReduced(preference.matches);
    };
    // Read current geometry rather than a queued observer entry from before the
    // phone's entrance animation or a restored scroll position settled.
    const schedule = () => { if (!pending) pending = requestAnimationFrame(() => { pending = 0; sync(); }); };
    const observer = 'IntersectionObserver' in window ? new IntersectionObserver(sync, { threshold: 0 }) : undefined;
    if (ref.current) observer?.observe(ref.current);
    document.addEventListener('visibilitychange', sync);
    preference.addEventListener('change', sync);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    window.addEventListener('pageshow', schedule);
    sync();
    return () => {
      observer?.disconnect();
      cancelAnimationFrame(pending);
      document.removeEventListener('visibilitychange', sync);
      preference.removeEventListener('change', sync);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('pageshow', schedule);
    };
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
