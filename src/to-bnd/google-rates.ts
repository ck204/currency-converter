import { isCurrency, type Currency } from './currencies';

export type Rates = Partial<Record<Currency, number>>;
export type RateSnapshot = { rates: Rates; retrievedAt: number };

const CACHE_KEY = 'google-bnd-rates-v1';
const SHEET_ID = import.meta.env.VITE_GOOGLE_RATES_SHEET_ID as
  | string
  | undefined;
const SHEET_GID =
  (import.meta.env.VITE_GOOGLE_RATES_SHEET_GID as string | undefined) ?? '0';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Google returns one BND-per-unit quote per row. Never replace a missing
// Google quote with a rate from a different provider or a hardcoded rate.
export function parseGoogleRates(response: unknown): Rates {
  if (
    !isRecord(response) ||
    response.status !== 'ok' ||
    !isRecord(response.table) ||
    !Array.isArray(response.table.rows)
  ) {
    throw new Error('Google rates are unavailable.');
  }

  const rates: Rates = {};
  for (const row of response.table.rows) {
    if (!isRecord(row) || !Array.isArray(row.c)) continue;
    const [codeCell, rateCell] = row.c;
    if (!isRecord(codeCell) || !isRecord(rateCell)) continue;
    const code = codeCell.v;
    const rate = rateCell.v;
    if (
      isCurrency(code) &&
      typeof rate === 'number' &&
      Number.isFinite(rate) &&
      rate > 0
    ) {
      rates[code] = rate;
    }
  }

  if (Object.keys(rates).length === 0)
    throw new Error('No Google quotes were returned.');
  return rates;
}

export function readSavedRates(): RateSnapshot | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const saved: unknown = JSON.parse(raw);
    if (
      !isRecord(saved) ||
      !isRecord(saved.rates) ||
      typeof saved.retrievedAt !== 'number' ||
      !Number.isFinite(saved.retrievedAt) ||
      saved.retrievedAt <= 0 ||
      saved.retrievedAt > Date.now()
    )
      return null;
    const rates: Rates = {};
    for (const [code, rate] of Object.entries(saved.rates)) {
      if (
        isCurrency(code) &&
        typeof rate === 'number' &&
        Number.isFinite(rate) &&
        rate > 0
      )
        rates[code] = rate;
    }
    return Object.keys(rates).length
      ? { rates, retrievedAt: saved.retrievedAt }
      : null;
  } catch {
    return null;
  }
}

export function loadGoogleRates(signal: AbortSignal): Promise<RateSnapshot> {
  return new Promise((resolve, reject) => {
    if (!SHEET_ID || !/^[\w-]+$/.test(SHEET_ID) || !/^\d+$/.test(SHEET_GID)) {
      reject(new Error('Google rates have not been connected.'));
      return;
    }
    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }

    // Google Sheets documents this JSONP protocol for browser access.
    // Only the fixed Google host can supply the script; no credentials are used.
    const callback = `bndRates_${crypto.randomUUID().replaceAll('-', '')}`;
    const globals = window as unknown as Record<string, unknown>;
    const script = document.createElement('script');
    const url = new URL(
      `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq`,
    );
    url.searchParams.set('gid', SHEET_GID);
    url.searchParams.set('headers', '1');
    url.searchParams.set('range', 'A1:B19');
    url.searchParams.set('tq', 'select A, B');
    url.searchParams.set('tqx', `out:json;responseHandler:${callback}`);
    url.searchParams.set('_', String(Date.now()));
    script.src = url.href;
    script.referrerPolicy = 'no-referrer';

    const cleanup = () => {
      clearTimeout(timeout);
      signal.removeEventListener('abort', abort);
      script.remove();
      // A response already in flight can still run after removing its script.
      // Retain a harmless callback briefly to prevent an uncaught global error.
      globals[callback] = () => {};
      setTimeout(() => {
        delete globals[callback];
      }, 60_000);
    };
    const abort = () => {
      cleanup();
      reject(new DOMException('Aborted', 'AbortError'));
    };
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Google rates took too long to load.'));
    }, 12_000);

    globals[callback] = (response: unknown) => {
      cleanup();
      try {
        const snapshot = {
          rates: parseGoogleRates(response),
          retrievedAt: Date.now(),
        };
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(snapshot));
        } catch {
          /* Storage is optional. */
        }
        resolve(snapshot);
      } catch (error) {
        reject(error);
      }
    };
    script.onerror = () => {
      cleanup();
      reject(new Error('Unable to reach Google rates.'));
    };
    signal.addEventListener('abort', abort, { once: true });
    document.head.append(script);
  });
}
