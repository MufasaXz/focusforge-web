import { useEffect, useRef, useState } from 'react';
import { pageLink } from './paths';
import { demoTime, useDemoActivity, useDemoElapsed } from './useDemoActivity';

const standings = [
  { name: 'Keshab', minutes: 240, rank: 2, medal: 'Silver' },
  { name: 'Sudeep', minutes: 320, rank: 1, medal: 'Gold' },
  { name: 'Pranshu', minutes: 160, rank: 3, medal: 'Bronze' },
];
function Podium() {
  const chart = useRef<HTMLDivElement>(null);
  const { active, reduced } = useDemoActivity(chart);
  const animations = useRef<Animation[]>([]);
  const [replay, setReplay] = useState(0);
  const [enhanced, setEnhanced] = useState(false);
  useEffect(() => {
    const element = chart.current!;
    setEnhanced(true);
    if (reduced || !element.animate) return;
    const make = (target: Element, frames: Keyframe[], delay: number, duration: number) => {
      const animation = target.animate(frames, { delay, duration, fill: 'both', easing: 'cubic-bezier(.22,1,.36,1)' });
      animation.pause();
      animations.current.push(animation);
    };
    element.querySelectorAll<HTMLElement>('.podium-column').forEach(column => {
      const rise = Number(column.dataset.rise);
      const rank = Number(column.dataset.rank);
      const stagger = (rank - 1) * 120;
      make(column.querySelector('.podium-outline')!, [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], stagger, 900);
      make(column.querySelector('.podium-label')!, [{ transform: `translateY(${rise}px)` }, { transform: 'translateY(0)' }], stagger, 900);
      if (rank === 1) {
        make(column.querySelector('.podium-fill')!, [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], 1100, 1000);
        make(column.querySelector('.podium-name')!, [{ fontWeight: 400 }, { fontWeight: 700 }], 2100, 1);
        make(column.querySelector('.podium-medal')!, [{ opacity: 0, transform: 'translateY(-12px) scale(.8)' }, { opacity: 1, transform: 'translateY(0) scale(1)' }], 2150, 450);
      } else {
        make(column.querySelector('.podium-fill')!, [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], 1100 + stagger, 1000);
        make(column.querySelector('.podium-name')!, [{ fontWeight: 400 }, { fontWeight: 700 }], 2100 + stagger, 1);
        make(column.querySelector('.podium-medal')!, [{ opacity: 0, transform: 'translateY(-12px) scale(.8)' }, { opacity: 1, transform: 'translateY(0) scale(1)' }], 2150 + stagger, 450);
      }
    });
    return () => { animations.current.forEach(animation => animation.cancel()); animations.current = []; };
  }, [replay, reduced]);
  useEffect(() => {
    const sync = () => animations.current.forEach(animation => {
      if (active && !document.hidden && animation.playState === 'paused') animation.play();
      else if ((!active || document.hidden) && animation.playState === 'running') animation.pause();
    });
    sync();
    // Pause synchronously on visibility changes, before React's next effect.
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, [active, replay, reduced]);
  return <div className="rank-art">
    <div className="community-art-title"><b>Weekly leaderboard</b><span>Focus minutes · demo</span></div>
    <div className="podium" ref={chart} aria-label="Fictional weekly focus minutes" data-motion={active ? 'running' : 'paused'}>
      {standings.map(person => <div className="podium-column" key={person.name} data-rank={person.rank} data-rise={person.minutes * .5} style={{ '--bar-height': `${person.minutes * .5}px` } as React.CSSProperties} tabIndex={0} aria-label={`${person.rank}. ${person.name}, ${person.minutes} minutes, ${person.medal} medal`}>
        <div className="podium-label"><span className={`podium-medal medal-${person.rank}`} aria-hidden="true"><svg viewBox="0 0 40 48"><path d="m12 2 8 17 8-17M8 2h9l7 17M32 2h-9l-7 17" fill="none" stroke="currentColor" strokeWidth="3"/><circle cx="20" cy="29" r="14" fill="currentColor"/><text x="20" y="34" textAnchor="middle">{person.rank}</text></svg><small>{person.medal}</small></span><span className="podium-name">{person.name}</span></div>
        <div className="podium-bar"><div className="podium-outline"/><div className="podium-fill"/></div>
        <span className="podium-tooltip" role="tooltip">{person.minutes} min · #{person.rank}</span>
      </div>)}
    </div>
    <details className="ranking-table"><summary>View demo rankings</summary><table><caption>Fictional weekly focus minutes</caption><thead><tr><th>Rank</th><th>Name</th><th>Minutes</th></tr></thead><tbody>{[...standings].sort((a,b) => a.rank-b.rank).map(person => <tr key={person.name}><td>{person.rank}</td><th scope="row">{person.name}</th><td>{person.minutes}</td></tr>)}</tbody></table></details>
    {enhanced && <button className="graphic-button" disabled={reduced} onClick={() => setReplay(value => value + 1)}>Replay podium<span aria-hidden="true">↶</span></button>}
    <small className="illustration-label">Fictional illustration · not actual standings</small>
  </div>;
}
const friends = [
  { name: 'Keshab', subject: 'Math', elapsed: 4, duration: 1500 },
  { name: 'Sudeep', subject: 'Biology', elapsed: 2240, duration: 3600 },
  { name: 'Pranshu', subject: 'Literature', elapsed: 860, duration: 1800 },
  { name: 'Mira', subject: 'Taking a break', elapsed: 0, duration: 0 },
];
function StudyGroup() {
  const group = useRef<HTMLDivElement>(null);
  const { active } = useDemoActivity(group);
  const elapsed = useDemoElapsed(active, Math.max(...friends.map(friend => friend.duration - friend.elapsed)));
  return <div className="friends-art" ref={group}>
    <div className="community-art-title"><b>Library table</b><span>Private study group · demo</span></div>
    <p className="group-demo-note">Three focus plans. One friend taking a break.</p>
    <div className="study-circle" aria-label="Fictional study group timers">{friends.map(friend => {
      const seconds = Math.min(friend.duration, friend.elapsed + elapsed);
      const focusing = friend.duration > seconds;
      return <div className="study-member" key={friend.name}><span className="rank-avatar" aria-hidden="true">{friend.name[0]}</span><div><b>{friend.name}</b><small>{friend.subject}</small></div><span className="friend-timer"><span role={friend.duration ? 'timer' : undefined} aria-live="off" aria-label={friend.duration ? `${friend.name}: ${demoTime(seconds)} elapsed` : undefined}>{friend.duration ? demoTime(seconds) : '—'}</span><small>{focusing ? 'Focusing' : friend.duration ? 'Completed' : 'Not focusing'}</small></span></div>;
    })}</div>
    <small className="illustration-label">Fictional illustration · no live users or presence</small>
  </div>;
}
export default function Community() {
  return <div className="community-pair">
    <section className="community-section leaderboard-section section" id="leaderboard"><div className="community-copy"><h2>A little friendly momentum.</h2><p>Make the time you put in visible.</p></div><Podium/><p className="community-disclosure">Opt-in names, chosen profile photos, levels and weekly minutes can remain visible in that week’s top 100 after sign-out. Turn sharing off or delete your account to withdraw your entries. <a href={pageLink('/privacy')}>Sharing & privacy</a></p></section>
    <section className="community-section friends-section section" id="friends"><div className="community-copy"><h2>Your people. Your pace.</h2><p>Separate desks. A shared study session.</p></div><StudyGroup/><p className="community-disclosure">Groups share names, minutes and timer status, not verified presence. <a href={pageLink('/privacy')}>Sharing & privacy</a></p></section>
  </div>;
}
