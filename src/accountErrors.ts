// Public messages are fixed strings. Never render SDK/network exception text.
export function accountErrorMessage(error: unknown) {
 const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
 if (['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-email'].includes(code)) return 'We could not sign in. Check your email and password, or use Google if that is how you joined FocusForge.';
 if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return 'Google sign-in was cancelled. Your account has not been deleted.';
 if (code === 'auth/popup-blocked') return 'Your browser blocked Google sign-in. Allow pop-ups for this website and try again.';
 if (code === 'auth/unauthorized-domain' || code === 'auth/operation-not-allowed') return 'This sign-in method is unavailable. Please contact FocusForge support.';
 if (code === 'auth/requires-recent-login' || code === 'auth/user-token-expired' || code === 'auth/invalid-user-token') return 'Please sign out here, sign in again, then retry deletion. Some cloud records may already have been removed.';
 if (code.includes('permission-denied') || code.includes('failed-precondition')) return 'Cloud cleanup could not finish. Your login has not been deleted. Please retry or contact support if this continues.';
 if (code.includes('too-many-requests') || code.includes('resource-exhausted')) return 'Too many requests. Wait a little before trying again. No deletion success has been confirmed.';
 if (code.includes('network') || code.includes('unavailable')) return 'The connection was interrupted. Keep this page open and retry when you are online. Your login is kept until cloud cleanup finishes.';
 return 'We could not complete this action. Please retry or contact support. Deletion has not been confirmed.';
}

