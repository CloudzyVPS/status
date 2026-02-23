const LOAD_RETRIES = 3;
const LOAD_RETRY_DELAY = 2000;
const LOAD_FETCH_TIMEOUT = 15000;

export async function fetchWithRetry(url, log, retries = LOAD_RETRIES) {
  for (let i = 0; i < retries; i++) {
    const ac = new AbortController();
    const timeoutId = setTimeout(() => ac.abort(), LOAD_FETCH_TIMEOUT);
    try {
      const res = await fetch(url, { signal: ac.signal });
      clearTimeout(timeoutId);
      if (res.ok) return res;
      if (i === retries - 1) return res;
      if (log) log.warn(`Fetch failed (${res.status}), retry ${i + 1}/${retries} in ${LOAD_RETRY_DELAY}ms`);
      await new Promise((r) => setTimeout(r, LOAD_RETRY_DELAY));
    } catch (err) {
      clearTimeout(timeoutId);
      if (i === retries - 1) throw err;
      if (log) log.warn(`Fetch error (${err.message}), retry ${i + 1}/${retries} in ${LOAD_RETRY_DELAY}ms`);
      await new Promise((r) => setTimeout(r, LOAD_RETRY_DELAY));
    }
  }
  return null;
}
