import PlayBadge from './PlayBadge';
import { GITHUB_RELEASES, SUPPORT_EMAIL } from './downloadLinks';

// The closed-test page, kept at its old address now that the app is live.
export default function GetOnPlay() {
  return <main id="main" className="play-test section">
    <div className="play-test-intro">
      <span className="play-test-status"><span className="status-dot"/>Live on Google Play</span>
      <h1>FocusForge is on<br/><span className="serif">Google Play.</span></h1>
      <p>Thank you to everyone who joined the closed test, kept the app installed for 14 days and sent feedback. FocusForge is now available to everyone on Google Play, free and with no ads.</p>
      <div className="hero-actions"><PlayBadge/></div>
    </div>
    <aside className="play-test-help">
      <h2>Were you a tester?</h2>
      <p>Your test install keeps updating from Google Play. You can leave the test from the Play Store listing whenever you like.</p>
      <p>Prefer an APK? <a href={GITHUB_RELEASES}>Get FocusForge on GitHub</a>. Questions? <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></p>
    </aside>
  </main>;
}
