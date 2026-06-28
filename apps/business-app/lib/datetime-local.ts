/**
 * Convert an ISO UTC timestamp string to the `datetime-local` input format
 * (`YYYY-MM-DDTHH:mm`) in the browser's local timezone.
 */
export function isoToLocalDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    d.getFullYear() +
    '-' +
    pad(d.getMonth() + 1) +
    '-' +
    pad(d.getDate()) +
    'T' +
    pad(d.getHours()) +
    ':' +
    pad(d.getMinutes())
  );
}

/**
 * Convert a `datetime-local` input value (`YYYY-MM-DDTHH:mm` in local time)
 * back to an ISO UTC string for submission to the API.
 */
export function localDatetimeLocalToIso(local: string): string {
  return new Date(local).toISOString();
}
