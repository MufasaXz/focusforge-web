import { PLAY_STORE } from './downloadLinks';

/** Google Play's "Get it on" badge, drawn in markup so it stays sharp at any size. */
export default function PlayBadge() {
  return <a className="play-badge" href={PLAY_STORE} aria-label="Get it on Google Play">
    <svg viewBox="0 0 24 26" width="26" height="28" aria-hidden="true">
      <path fill="#4285F4" d="M1.3 1 13 13 1.3 25a1.6 1.6 0 0 1-.6-1.3V2.3c0-.5.2-1 .6-1.3Z"/>
      <path fill="#34A853" d="M1.3 1c.4-.3 1-.3 1.6 0l14.6 8.4L13 13Z"/>
      <path fill="#FBBC04" d="m17.5 9.4 4.2 2.4c1 .6 1 1.8 0 2.4l-4.2 2.4L13 13Z"/>
      <path fill="#EA4335" d="M13 13l4.5 3.6L2.9 25c-.6.3-1.2.3-1.6 0Z"/>
    </svg>
    <span><small>Get it on</small>Google Play</span>
  </a>;
}
