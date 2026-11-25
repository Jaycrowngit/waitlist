/**
 * Where the waitlist form posts to.
 *
 * Set PUBLIC_API_URL (in .env or the host's env vars) to override.
 * Otherwise: on localhost the form posts to the local Laravel API,
 * everywhere else it uses production.
 */
export function apiBaseUrl(): string {
  const override = import.meta.env.PUBLIC_API_URL as string | undefined;
  const host = window.location.hostname;
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '' || host === '::1';

  const url = override || (isLocal ? 'http://localhost:8000/api/v1' : 'https://api.byllora.com/api/v1');
  return url.replace(/\/$/, '');
}
