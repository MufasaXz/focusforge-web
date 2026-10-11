import { useState } from 'react';
import { pageLink } from './paths';

export default function Community() {
  const [connected, setConnected] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const names = celebrate ? ['You', 'Alex', 'Sam'] : ['Alex', 'You', 'Sam'];
  return <div className="community-pair">
    <section className="community-section leaderboard-section section" id="leaderboard">
      <div className="community-copy"><h2>A little friendly momentum.</h2><p>Small sessions. Shared motivation.</p></div>
      <div className={`rank-art ${celebrate ? 'celebrating' : ''}`}>
        <div className="community-art-title">This week <span>Focus minutes</span></div>
        <div className="rank-list" aria-label="Illustrative weekly rankings">{['Alex', 'You', 'Sam'].map(name => <div key={name} className={`rank-row ${name === 'You' ? 'is-you' : ''}`} style={{ '--rank': names.indexOf(name) } as React.CSSProperties}><span className="rank-number">{names.indexOf(name) + 1}</span><span className="rank-avatar" aria-hidden="true">{name[0]}</span><b>{name}</b><span>{name === 'You' ? (celebrate ? '245' : '210') : name === 'Alex' ? '240' : '180'} min</span></div>)}</div>
        <button className="graphic-button" aria-pressed={celebrate} onClick={() => setCelebrate(!celebrate)}>{celebrate ? 'Reset illustration' : 'Celebrate the effort'}<span aria-hidden="true">↗</span></button>
        <small className="illustration-label">Illustration · not actual standings</small>
      </div>
      <p className="community-disclosure">Optional public names and weekly minutes via Firebase. <a href={pageLink('/privacy')}>Sharing & privacy</a></p>
    </section>
    <section className="community-section friends-section section" id="friends">
      <div className="community-copy"><h2>Your people. Your pace.</h2><p>Private groups. One shared goal.</p></div>
      <div className={`friends-art ${connected ? 'connected' : ''}`}>
        <div className="community-art-title">Study circle <span>Different desks, together</span></div>
        <div className="study-circle" aria-hidden="true"><svg viewBox="0 0 400 230"><path className="circle-track" d="M80 70Q200 10 320 70L200 185Z"/><path className="circle-link" d="M80 70Q200 10 320 70L200 185Z"/></svg>{['Your desk', 'A friend', 'Your circle'].map((name, i) => <div className={`study-seat seat-${i}`} key={name}><svg viewBox="0 0 80 80"><circle cx="40" cy="22" r="10"/><path d="M22 54v-9q18-18 36 0v9M10 55h60M17 55v18m46-18v18M29 48l11 5 14-5M32 57l9 4 14-4"/></svg><span>{name}</span></div>)}</div>
        <button className="graphic-button" aria-pressed={connected} onClick={() => setConnected(!connected)}>{connected ? 'Reset connections' : 'Bring the circle together'}<span aria-hidden="true">＋</span></button>
        <small className="illustration-label">Illustration · no live users or presence</small>
      </div>
      <p className="community-disclosure">Groups share names, minutes and timer status via Firebase. <a href={pageLink('/privacy')}>Sharing & privacy</a></p>
    </section>
  </div>;
}
