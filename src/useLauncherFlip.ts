import { useEffect, useRef, useState } from 'react';

// Native scrolling owns gestures and settling. Only the whole screen plane tilts;
// its natural horizontal position coordinates outgoing and incoming screens.
export function useLauncherFlip(count: number) {
  const rail = useRef<HTMLDivElement>(null);
  const target = useRef(0);
  const [index, setIndex] = useState(0);
  const go = (next: number) => {
    const element = rail.current;
    if (!element) return;
    target.current = Math.max(0, Math.min(count - 1, next));
    element.scrollTo({ left: target.current * element.clientWidth, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  };
  useEffect(() => {
    const element = rail.current!;
    const screens = [...element.querySelectorAll<HTMLElement>('.feature-slide')];
    // Warm all three decoded previews without delaying controls or awaiting a
    // potentially stalled download. Failure leaves native image fallbacks intact.
    let disposed = false, previewsReady = false;
    const images = [...element.querySelectorAll<HTMLImageElement>('img')];
    const decodes = images.map(image => image.decode().then(() => { if (!disposed) image.dataset.decoded = 'true'; }).catch(() => {}));
    // Native navigation never waits. Suspend the extra 3D enhancement until
    // decoding settles, with a bounded fallback for stalled image requests.
    const enable = () => { if (!disposed) { previewsReady = true; schedule(); } };
    const decodeTimeout = setTimeout(enable, 2500);
    void Promise.allSettled(decodes).then(() => { clearTimeout(decodeTimeout); enable(); });
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    let width = element.clientWidth, frame = 0, current = 0, programmatic = false;
    const paint = () => {
      frame = 0;
      if (document.hidden) return;
      // A resize can dispatch scroll before ResizeObserver. Do not interpret
      // the old pixel offset using the new viewport's snap geometry.
      if (element.clientWidth !== width) { resize(); return; }
      const progress = element.scrollLeft / Math.max(1, width);
      screens.forEach((screen, position) => {
        const distance = Math.max(-1, Math.min(1, position - progress));
        screen.style.setProperty('--screen-angle', `${preference.matches || !previewsReady ? 0 : -distance * 38}deg`);
        screen.style.setProperty('--screen-depth', `${preference.matches || !previewsReady ? 0 : -Math.abs(distance) * 100}px`);
      });
      const next = Math.max(0, Math.min(count - 1, Math.round(progress)));
      // No React updates at gesture/frame frequency, only screen boundaries.
      if (next !== current) { current = next; setIndex(next); }
      if (!programmatic) target.current = next;
    };
    const schedule = () => { if (!frame && !document.hidden) frame = requestAnimationFrame(paint); };
    const resize = () => {
      width = element.clientWidth;
      programmatic = false;
      element.scrollTo({ left: current * width, behavior: 'instant' });
      target.current = current;
      schedule();
    };
    const interrupt = () => { programmatic = false; target.current = Math.round(element.scrollLeft / Math.max(1, width)); };
    const start = () => { programmatic = true; };
    const settle = () => { programmatic = false; target.current = Math.round(element.scrollLeft / Math.max(1, width)); schedule(); };
    const visibility = () => { if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else schedule(); };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    element.addEventListener('scroll', schedule, { passive: true });
    element.addEventListener('scrollend', settle);
    element.addEventListener('pointerdown', interrupt, { passive: true });
    element.addEventListener('wheel', interrupt, { passive: true });
    element.addEventListener('launcher-navigation', start);
    preference.addEventListener('change', schedule);
    document.addEventListener('visibilitychange', visibility);
    paint();
    return () => {
      disposed = true;
      clearTimeout(decodeTimeout);
      cancelAnimationFrame(frame); observer.disconnect();
      element.removeEventListener('scroll', schedule);
      element.removeEventListener('scrollend', settle);
      element.removeEventListener('pointerdown', interrupt);
      element.removeEventListener('wheel', interrupt);
      element.removeEventListener('launcher-navigation', start);
      preference.removeEventListener('change', schedule);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [count]);
  const navigate = (next: number) => {
    rail.current?.dispatchEvent(new Event('launcher-navigation'));
    go(next);
  };
  return { rail, index, navigate, target };
}
