import { GITHUB_RELEASES, SUPPORT_EMAIL } from './downloadLinks';

const steps = [
  {
    title: 'Join the Google Group',
    description: 'Use the same Gmail address you use on the Play Store. Join the group before opening the testing link.',
    action: 'Join the group',
    href: 'https://groups.google.com/g/focusforge',
  },
  {
    title: 'Become a tester',
    description: 'Open the testing page with that same Google account, then tap “Become a tester”.',
    action: 'Become a tester',
    href: 'https://play.google.com/apps/testing/dev.focusforge.focusforge',
  },
  {
    title: 'Get FocusForge on Play Store',
    description: 'Once you have joined the test, download and install the app from its Play Store listing.',
    action: 'Open Play Store',
    href: 'https://play.google.com/store/apps/details?id=dev.focusforge.focusforge',
  },
];

export default function GetOnPlay() {
  return <main id="main" className="play-test section">
    <div className="play-test-intro">
      <span className="eyebrow">A LITTLE HELP. A BIG NEXT STEP.</span>
      <h1>Help bring FocusForge<br/><span className="serif">to the Play Store.</span></h1>
      <p>Hey guys! I made an app called FocusForge, and I’m looking for <strong>50+ testers</strong> to help get it published on Google Play. Please help me out by following these quick steps.</p>
      <span className="play-test-status"><span className="status-dot"/>Closed testing · Android</span>
    </div>
    <ol className="play-test-steps" aria-label="Join the FocusForge closed test">
      {steps.map((step, index) => <li key={step.href}>
        <span className="play-step-number" aria-hidden="true">0{index + 1}</span>
        <div><h2>{step.title}</h2><p>{step.description}</p><a className="button" href={step.href}>{step.action}<span aria-hidden="true">↗</span></a></div>
      </li>)}
    </ol>
    <section className="play-test-followup" aria-labelledby="keep-testing">
      <span className="eyebrow">ONE SMALL SESSION A DAY</span>
      <h2 id="keep-testing">Stay with us for <span className="serif">14 days.</span></h2>
      <p>Please stay opted into the test, keep FocusForge installed on your phone for at least <strong>14 consecutive days</strong>, and use it for <strong>1–5 minutes daily</strong>. Try a timer, explore Shield, and tell me what feels good or could be improved. Your help supports our application for production access; Google makes the final approval decision.</p>
      <h3>Tell us what you think.</h3>
      <p>Please leave honest feedback through the Play Store testing listing. What did you like? What could work better? Closed-test feedback is private to the developer. If you don’t see a feedback option, <a href={"mailto:" + SUPPORT_EMAIL + "?subject=FocusForge%20testing%20feedback"}>email me</a> instead.</p>
      <p className="play-test-thanks">Thanks for helping FocusForge grow! <span role="img" aria-label="Thank you">🙏</span></p>
    </section>
    <aside className="play-test-help">
      <h2>Can’t open the listing?</h2>
      <p>Check that you joined the Google Group and that all three pages use the same Google account as your Play Store. Then open the testing link again.</p>
      <p>Prefer an APK? <a href={GITHUB_RELEASES}>Get FocusForge on GitHub →</a></p>
    </aside>
  </main>;
}
