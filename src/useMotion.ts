import { useEffect } from 'react';

// Progressive enhancement: content stays visible if JS, observers or animation
// support is unavailable. Motion never owns layout, navigation or scroll position.
export function useMotion(path: string) {
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let dispose = () => {};
    const configure = () => {
      dispose();
      if (preference.matches) return;
      const animations = new Set<Animation>();
      const targets = document.querySelectorAll<HTMLElement>(
        '.reveal, .steps article, .faq > div, .final-cta > :not(.cta-orbit):not(.cta-flower)',
      );
      let observer: IntersectionObserver | undefined;
      if ('IntersectionObserver' in window) {
        observer = new IntersectionObserver(entries => {
          entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            observer?.unobserve(entry.target);
            const element = entry.target as HTMLElement;
            if (!element.animate) return;
            const index = element.matches('.steps article') ? Array.from(element.parentElement!.children).indexOf(element) : 0;
            const animation = element.animate(
              [{ opacity: 0.25, transform: 'translateY(22px)' }, { opacity: 1, transform: 'translateY(0)' }],
              { duration: 700, delay: index * 90, easing: 'cubic-bezier(.22,1,.36,1)' },
            );
            animations.add(animation);
            animation.onfinish = () => animations.delete(animation);
          });
        }, { threshold: 0.12 });
        targets.forEach(target => observer!.observe(target));
      }

      const art = document.querySelector<HTMLElement>('.hero-art');
      const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
      let frame = 0;
      let x = 0, y = 0, targetX = 0, targetY = 0;
      let visible = true;
      const render = () => {
        frame = 0;
        if (!art || !visible || document.hidden) return;
        x += (targetX - x) * 0.12;
        y += (targetY - y) * 0.12;
        const bounds = art.getBoundingClientRect();
        const scroll = Math.max(-1, Math.min(1, (innerHeight * 0.5 - (bounds.top + bounds.height * 0.5)) / innerHeight));
        art.style.setProperty('--depth-x', `${x.toFixed(3)}px`);
        art.style.setProperty('--depth-y', `${y.toFixed(3)}px`);
        art.style.setProperty('--scroll-depth', `${(scroll * 14).toFixed(3)}px`);
        if (Math.abs(targetX - x) + Math.abs(targetY - y) > 0.05) schedule();
      };
      const schedule = () => { if (!frame && visible && !document.hidden) frame = requestAnimationFrame(render); };
      const move = (event: PointerEvent) => {
        if (!art || !finePointer.matches || event.pointerType === 'touch') return;
        const bounds = art.getBoundingClientRect();
        targetX = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1)) * 8;
        targetY = Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1)) * 6;
        schedule();
      };
      const reset = () => { targetX = targetY = 0; schedule(); };
      const toolkit = document.querySelector<HTMLElement>('.toolkit-shell');
      const community = document.querySelector<HTMLElement>('.community-pair');
      let communityVisible = true;
      const communityObserver = 'IntersectionObserver' in window
        ? new IntersectionObserver(([entry]) => { communityVisible = entry.isIntersecting; syncPlayback(); })
        : undefined;
      if (community) communityObserver?.observe(community);
      let toolkitVisible = true;
      const syncPlayback = () => {
        if (art) art.dataset.motion = visible && !document.hidden ? 'running' : 'paused';
        if (toolkit) toolkit.dataset.motion = toolkitVisible && !document.hidden ? 'running' : 'paused';
        if (community) community.dataset.motion = communityVisible && !document.hidden ? 'running' : 'paused';
      };
      const toolkitObserver = 'IntersectionObserver' in window
        ? new IntersectionObserver(([entry]) => { toolkitVisible = entry.isIntersecting; syncPlayback(); })
        : undefined;
      if (toolkit) toolkitObserver?.observe(toolkit);
      syncPlayback();
      const visibility = () => { syncPlayback(); if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else schedule(); };
      let artObserver: IntersectionObserver | undefined;
      if (art && 'IntersectionObserver' in window) {
        artObserver = new IntersectionObserver(([entry]) => {
          visible = entry.isIntersecting;
          syncPlayback();
          if (visible) schedule();
          else { cancelAnimationFrame(frame); frame = 0; }
        });
        artObserver.observe(art);
      }
      art?.addEventListener('pointermove', move, { passive: true });
      art?.addEventListener('pointerleave', reset);
      finePointer.addEventListener('change', reset);
      window.addEventListener('scroll', schedule, { passive: true });
      window.addEventListener('resize', schedule, { passive: true });
      document.addEventListener('visibilitychange', visibility);
      schedule();
      dispose = () => {
        observer?.disconnect();
        artObserver?.disconnect();
        toolkitObserver?.disconnect();
        communityObserver?.disconnect();
        community?.removeAttribute('data-motion');
        art?.removeAttribute('data-motion');
        toolkit?.removeAttribute('data-motion');
        animations.forEach(animation => animation.cancel());
        cancelAnimationFrame(frame);
        art?.removeEventListener('pointermove', move);
        art?.removeEventListener('pointerleave', reset);
        finePointer.removeEventListener('change', reset);
        window.removeEventListener('scroll', schedule);
        window.removeEventListener('resize', schedule);
        document.removeEventListener('visibilitychange', visibility);
        ['--depth-x', '--depth-y', '--scroll-depth'].forEach(property => art?.style.removeProperty(property));
      };
    };
    configure();
    preference.addEventListener('change', configure);
    return () => { dispose(); preference.removeEventListener('change', configure); };
  }, [path]);
}
