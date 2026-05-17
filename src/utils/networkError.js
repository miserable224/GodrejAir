/**
 * Safari/iOS often reports failed fetch as "Load failed" — map to actionable text.
 */
export function formatNetworkError(err, apiHint) {
  const msg = err?.message || String(err);
  if (
    err?.name === 'TypeError' &&
    (/load failed|failed to fetch|network error|network request failed/i.test(msg) ||
      msg === 'Load failed')
  ) {
    return (
      apiHint ||
      'Cannot reach the server. Check mobile data/Wi‑Fi, ensure the API URL is HTTPS, and try again.'
    );
  }
  if (err?.name === 'AbortError') {
    return 'Request timed out. Check your connection and try again.';
  }
  return msg;
}

export async function fetchWithNetworkHint(url, options, apiHint) {
  try {
    return await fetch(url, options);
  } catch (err) {
    throw new Error(formatNetworkError(err, apiHint));
  }
}
