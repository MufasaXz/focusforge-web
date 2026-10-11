import { useState } from 'react';
import { pageLink } from './paths';

export default function Community() {
  const [connected, setConnected] = useState(false);
  const [completed, setCompleted] = useState(false);
  const names = completed ? ['You', 'Alex', 'Sam'] : ['Alex', 'You', 'Sam'];
  return <div className="community-pair">
    <section className="community-section leaderboard-section section" id="leaderboard">
      <div className="community-copy"><h2>A little friendly momentum.</h2><p>Make the time you put in visible.</p></div>
      <div className={`rank-art ${completed ? 'celebrating' : ''}`}>
        <div className="community-art-title"><b>Weekly leaderboard</b><span>Focus minutes</span></div>
        <div className="rank-columns" aria-hidden="true"><span>Rank / student</span><span>This week</span></div>
        <div className="rank-list" aria-label="Fictional illustrative weekly rankings">{['Alex', 'You', 'Sam'].map(name => <div key={name} className={`rank-row ${name === 'You' ? 'is-you' : ''}`} style={{ '--rank': names.indexOf(name) } as React.CSSProperties}><span className="rank-number">{names.indexOf(name) + 1}</span><span className="rank-avatar" aria-hidden="true">{name[0]}</span><b>{name}<small>{name === 'You' ? 'Your study time' : 'Example student'}</small></b><span className="rank-change" aria-label={name === 'You' && completed ? 'Up one place' : undefined}>{name === 'You' && completed ? '↑ 1' : '—'}</span><span className="rank-minutes">{name === 'You' ? (completed ? '245' : '210') : name === 'Alex' ? '240' : '180'} <small>min</small></span></div>)}</div>
        <p className="social-result" role="status">{completed ? '35 minutes added. You moved up one place.' : 'A 35-minute session can change your week.'}</p>
        <button className="graphic-button" aria-pressed={completed} onClick={() => setCompleted(!completed)}>{completed ? 'Reset illustration' : 'Preview a completed session'}<span aria-hidden="true">{completed ? '↶' : '+'}</span></button>
        <small className="illustration-label">Fictional illustration · not actual standings</small>
      </div>
      <p className="community-disclosure">Optional public names and weekly minutes via Firebase. <a href={pageLink('/privacy')}>Sharing & privacy</a></p>
    </section>
    <section className="community-section friends-section section" id="friends">
      <div className="community-copy"><h2>Your people. Your pace.</h2><p>Separate desks. A shared study session.</p></div>
      <div className={`friends-art ${connected ? 'connected' : ''}`}>
        <div className="community-art-title"><b>Library table</b><span>Private study group</span></div>
        <div className="group-session"><span className="session-signal" aria-hidden="true"/><div><b>{connected ? 'Study session' : 'Ready when you are'}</b><span>{connected ? '25-minute focus plan' : 'Choose a quiet moment together'}</span></div><span className="session-count">{connected ? '3 studying' : '3 members'}</span></div>
        <div className="study-circle" aria-label="Illustrative group members">{['You', 'Alex', 'Sam'].map((name, i) => <div className="study-member" key={name} style={{ '--member': i } as React.CSSProperties}><span className="rank-avatar" aria-hidden="true">{name[0]}</span><div><b>{name}</b><small>{['Math', 'Biology', 'Literature'][i]}</small></div><span className="member-status"><i aria-hidden="true"/>{connected ? 'Studying' : 'Ready'}</span><span className="session-line" aria-hidden="true"/></div>)}</div>
        <p className="social-result" role="status">{connected ? 'Three desks, one stretch of focused time.' : 'No chat to keep up with. Just a little company.'}</p>
        <button className="graphic-button" aria-pressed={connected} onClick={() => setConnected(!connected)}>{connected ? 'Reset connections' : 'Preview a group session'}<span aria-hidden="true">{connected ? '↶' : '+'}</span></button>
        <small className="illustration-label">Fictional illustration · no live users or presence</small>
      </div>
      <p className="community-disclosure">Groups share names, minutes and timer status via Firebase. <a href={pageLink('/privacy')}>Sharing & privacy</a></p>
    </section>
  </div>;
}
