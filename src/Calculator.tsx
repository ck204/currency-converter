'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ExternalLink, Info, RefreshCw } from 'lucide-react';

import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { Input } from '@/components/ui/input';

const CURRENCIES = [
  { code: 'BND', name: 'Brunei Dollar' },
  { code: 'RM', name: 'Ringgit Malaysia' },
  { code: 'RMB', name: 'Chinese Yuan' },
  { code: 'NTD', name: 'New Taiwan Dollar' },
] as const;

type CurrencyCode = (typeof CURRENCIES)[number]['code'];
type RouteCurrency = 'BND' | 'RM';
type RateUnit = 1 | 100;
type Rate = { buying: string; selling: string };
type RateBook = Record<CurrencyCode, Rate>;
type RateUnitBook = Record<CurrencyCode, RateUnit>;

const DEFAULT_RATES: RateBook = {
  BND: { buying: '', selling: '' },
  RM: { buying: '', selling: '' },
  RMB: { buying: '', selling: '' },
  NTD: { buying: '', selling: '' },
};

const DEFAULT_RATE_UNITS: RateUnitBook = {
  BND: 1,
  RM: 1,
  RMB: 1,
  NTD: 1,
};

const GOOGLE_CURRENCY_CODES: Record<CurrencyCode, string> = {
  BND: 'BND',
  RM: 'MYR',
  RMB: 'CNY',
  NTD: 'TWD',
};

const isCurrency = (value: unknown): value is CurrencyCode =>
  typeof value === 'string' && CURRENCIES.some(({ code }) => code === value);

const toPositiveNumber = (value: string) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
};

const normalizeRate = (value: string, quotedUnits: RateUnit) => {
  const rate = toPositiveNumber(value);
  return rate === null ? null : rate / quotedUnits;
};

const formatRate = (value: number) =>
  new Intl.NumberFormat('en', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(value);

const otherRouteCurrency = (currency: RouteCurrency): RouteCurrency =>
  currency === 'BND' ? 'RM' : 'BND';

const makeRateRows = (
  source: RouteCurrency,
  dealer: RouteCurrency,
  preferredTarget?: CurrencyCode,
): CurrencyCode[] => {
  const availableTargets = CURRENCIES.map(({ code }) => code).filter(
    (code) => code !== source && code !== dealer,
  );
  const target =
    preferredTarget && availableTargets.includes(preferredTarget)
      ? preferredTarget
      : availableTargets[0];

  return [source, target];
};

function getQuote(
  source: CurrencyCode,
  dealer: CurrencyCode,
  target: CurrencyCode,
  rates: RateBook,
  rateUnits: RateUnitBook,
) {
  const targetBuying =
    target === dealer
      ? 1
      : normalizeRate(rates[target].buying, rateUnits[target]);
  const targetSelling =
    target === dealer
      ? 1
      : normalizeRate(rates[target].selling, rateUnits[target]);

  if (source === dealer) {
    if (targetBuying === null || targetSelling === null) return null;
    return {
      buying: targetBuying,
      selling: targetSelling,
      receives: 1 / targetSelling,
      indirect: false,
    };
  }

  const sourceBuying = normalizeRate(rates[source].buying, rateUnits[source]);
  const sourceSelling = normalizeRate(rates[source].selling, rateUnits[source]);

  if (
    sourceBuying === null ||
    sourceSelling === null ||
    targetBuying === null ||
    targetSelling === null
  ) {
    return null;
  }

  return {
    buying: targetBuying / sourceSelling,
    selling: targetSelling / sourceBuying,
    receives: sourceBuying / targetSelling,
    indirect: true,
  };
}

export default function Home() {
  const [sourceCurrency, setSourceCurrency] = useState<RouteCurrency>('BND');
  const [dealerCurrency, setDealerCurrency] = useState<RouteCurrency>('RM');
  const [rowCurrencies, setRowCurrencies] = useState<CurrencyCode[]>([
    'BND',
    'RMB',
  ]);
  const [rates, setRates] = useState<RateBook>(DEFAULT_RATES);
  const [rateUnits, setRateUnits] = useState<RateUnitBook>(DEFAULT_RATE_UNITS);

  const dealerCurrencies = CURRENCIES.filter(
    ({ code }) => code === 'BND' || code === 'RM',
  );

  const results = useMemo(
    () => [
      {
        currency: rowCurrencies[1],
        quote: getQuote(
          sourceCurrency,
          dealerCurrency,
          rowCurrencies[1],
          rates,
          rateUnits,
        ),
      },
    ],
    [dealerCurrency, rateUnits, rates, rowCurrencies, sourceCurrency],
  );

  const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(
    `1 ${GOOGLE_CURRENCY_CODES[sourceCurrency]} to ${GOOGLE_CURRENCY_CODES[rowCurrencies[1]]}`,
  )}`;

  const changeSourceCurrency = (currency: RouteCurrency) => {
    const nextDealer =
      currency === dealerCurrency
        ? otherRouteCurrency(currency)
        : dealerCurrency;

    setSourceCurrency(currency);
    setDealerCurrency(nextDealer);
    setRowCurrencies((current) =>
      makeRateRows(currency, nextDealer, current[1]),
    );
  };

  const changeDealerCurrency = (currency: RouteCurrency) => {
    const nextSource =
      currency === sourceCurrency
        ? otherRouteCurrency(currency)
        : sourceCurrency;

    setDealerCurrency(currency);
    setSourceCurrency(nextSource);
    setRowCurrencies((current) =>
      makeRateRows(nextSource, currency, current[1]),
    );
  };

  const changeTargetCurrency = (currency: CurrencyCode) => {
    setRowCurrencies((current) => [current[0], currency]);
  };

  const changeRate = (
    currency: CurrencyCode,
    side: keyof Rate,
    value: string,
  ) => {
    setRates((current) => ({
      ...current,
      [currency]: { ...current[currency], [side]: value },
    }));
  };

  const changeRateUnit = (currency: CurrencyCode, quotedUnits: RateUnit) => {
    setRateUnits((current) => ({
      ...current,
      [currency]: quotedUnits,
    }));
  };

  const clearRates = () => setRates(DEFAULT_RATES);

  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: {
              name: string;
              title: string;
              description: string;
              inputSchema: object;
              annotations: {
                readOnlyHint: boolean;
                untrustedContentHint: boolean;
              };
              execute: (input: unknown) => unknown;
            },
            options?: { signal?: AbortSignal },
          ) => void | Promise<void>;
        };
      }
    ).modelContext;

    if (!context?.registerTool) return;
    const lifecycle = new AbortController();

    void Promise.resolve(
      context.registerTool(
        {
          name: 'configure_exchange_calculator',
          title: 'Configure exchange calculator',
          description:
            'Set the user currency, dealer currency, quoted units, and dealer buying and selling rates in the visible calculator.',
          inputSchema: {
            type: 'object',
            properties: {
              sourceCurrency: { type: 'string', enum: ['BND', 'RM'] },
              dealerCurrency: { type: 'string', enum: ['BND', 'RM'] },
              rates: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    currency: {
                      type: 'string',
                      enum: ['BND', 'RM', 'RMB', 'NTD'],
                    },
                    quotedUnits: { type: 'number', enum: [1, 100] },
                    buying: { type: 'number', exclusiveMinimum: 0 },
                    selling: { type: 'number', exclusiveMinimum: 0 },
                  },
                  required: ['currency', 'quotedUnits', 'buying', 'selling'],
                  additionalProperties: false,
                },
              },
            },
            required: ['sourceCurrency', 'dealerCurrency', 'rates'],
            additionalProperties: false,
          },
          annotations: {
            readOnlyHint: false,
            untrustedContentHint: false,
          },
          execute(input) {
            const candidate = input as {
              sourceCurrency?: unknown;
              dealerCurrency?: unknown;
              rates?: unknown;
            };
            if (
              !isCurrency(candidate.sourceCurrency) ||
              !['BND', 'RM'].includes(candidate.sourceCurrency) ||
              !isCurrency(candidate.dealerCurrency) ||
              !['BND', 'RM'].includes(candidate.dealerCurrency) ||
              !Array.isArray(candidate.rates) ||
              candidate.sourceCurrency === candidate.dealerCurrency
            ) {
              throw new Error('Invalid exchange calculator configuration.');
            }

            const nextRates: RateBook = structuredClone(DEFAULT_RATES);
            const nextRateUnits: RateUnitBook =
              structuredClone(DEFAULT_RATE_UNITS);
            let configuredTarget: CurrencyCode | undefined;
            for (const item of candidate.rates) {
              const rate = item as {
                currency?: unknown;
                quotedUnits?: unknown;
                buying?: unknown;
                selling?: unknown;
              };
              if (
                !isCurrency(rate.currency) ||
                (rate.quotedUnits !== 1 && rate.quotedUnits !== 100) ||
                typeof rate.buying !== 'number' ||
                rate.buying <= 0 ||
                typeof rate.selling !== 'number' ||
                rate.selling <= 0
              ) {
                throw new Error(
                  'Every rate must contain quoted units and positive buying and selling values.',
                );
              }
              nextRateUnits[rate.currency] = rate.quotedUnits;
              nextRates[rate.currency] = {
                buying: String(rate.buying),
                selling: String(rate.selling),
              };
              if (
                rate.currency !== candidate.sourceCurrency &&
                rate.currency !== candidate.dealerCurrency &&
                configuredTarget === undefined
              ) {
                configuredTarget = rate.currency;
              }
            }

            const configuredSource = candidate.sourceCurrency as RouteCurrency;
            const configuredDealer = candidate.dealerCurrency as RouteCurrency;
            setSourceCurrency(configuredSource);
            setDealerCurrency(configuredDealer);
            setRowCurrencies(
              makeRateRows(
                configuredSource,
                configuredDealer,
                configuredTarget,
              ),
            );
            setRates(nextRates);
            setRateUnits(nextRateUnits);
            return {
              sourceCurrency: candidate.sourceCurrency,
              dealerCurrency: candidate.dealerCurrency,
              configuredRates: candidate.rates.length,
            };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => undefined);

    return () => lifecycle.abort();
  }, []);

  return (
    <main className="app-shell">
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />

      <div className="workspace">
        <header className="site-header">
          <div className="brand-mark" aria-hidden="true">
            <span>$</span>
          </div>
          <div>
            <p className="eyebrow">Cross-rate calculator</p>
            <h1>Currency Converter</h1>
          </div>
        </header>

        <section className="setup-card" aria-labelledby="setup-heading">
          <div className="section-heading">
            <span className="step-number">01</span>
            <div>
              <h2 id="setup-heading">Choose the exchange route</h2>
              <p>Tell us what you have and the currency used by the dealer.</p>
            </div>
          </div>

          <div className="route-builder">
            <label className="field-block">
              <span>You have</span>
              <NativeSelect
                className="select-control"
                value={sourceCurrency}
                onChange={(event) =>
                  changeSourceCurrency(event.target.value as RouteCurrency)
                }
                aria-label="Currency you have"
              >
                {dealerCurrencies.map((currency) => (
                  <NativeSelectOption key={currency.code} value={currency.code}>
                    {currency.code} — {currency.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </label>

            <div className="route-arrow" aria-hidden="true">
              <ArrowRight size={20} />
            </div>

            <label className="field-block">
              <span>Dealer operates in</span>
              <NativeSelect
                className="select-control"
                value={dealerCurrency}
                onChange={(event) =>
                  changeDealerCurrency(event.target.value as RouteCurrency)
                }
                aria-label="Dealer currency"
              >
                {dealerCurrencies.map((currency) => (
                  <NativeSelectOption key={currency.code} value={currency.code}>
                    {currency.code} — {currency.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </label>

            <div className="route-arrow" aria-hidden="true">
              <ArrowRight size={20} />
            </div>

            <div className="route-destination">
              <span>Converts to</span>
              <strong>Foreign currency</strong>
            </div>
          </div>

          <div className="route-summary" aria-live="polite">
            <span>{sourceCurrency}</span>
            <ArrowRight size={16} aria-hidden="true" />
            <span>{dealerCurrency}</span>
            <ArrowRight size={16} aria-hidden="true" />
            <span>Foreign currency</span>
          </div>
        </section>

        <section className="rates-card" aria-labelledby="rates-heading">
          <div className="section-heading rates-title-row">
            <div className="heading-with-step">
              <span className="step-number">02</span>
              <div>
                <h2 id="rates-heading">Enter the dealer’s rates</h2>
                <p>
                  Copy the displayed rates and choose whether they cover 1 or
                  100 units.
                </p>
              </div>
            </div>
            <button className="clear-button" type="button" onClick={clearRates}>
              <RefreshCw size={15} aria-hidden="true" />
              Clear rates
            </button>
          </div>

          <fieldset className="rate-table">
            <legend className="sr-only">Dealer rates</legend>
            <div className="rate-header" aria-hidden="true">
              <span>Currency</span>
              <span>Quoted per</span>
              <span>Dealer buying</span>
              <span>Dealer selling</span>
            </div>

            {rowCurrencies.map((currency, index) => (
              <div className="rate-row" key={`${index}-${currency}`}>
                <NativeSelect
                  className="currency-select"
                  value={currency}
                  disabled={index === 0}
                  onChange={(event) =>
                    changeTargetCurrency(event.target.value as CurrencyCode)
                  }
                  aria-label={
                    index === 0 ? 'Your currency rate' : 'Foreign currency rate'
                  }
                >
                  {CURRENCIES.map((option) => (
                    <NativeSelectOption
                      key={option.code}
                      value={option.code}
                      disabled={
                        option.code === dealerCurrency ||
                        (index === 1 && option.code === sourceCurrency)
                      }
                    >
                      {option.code}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>

                <div className="mobile-rate-field">
                  <label htmlFor={`quoted-units-${index}`}>Quoted per</label>
                  <NativeSelect
                    id={`quoted-units-${index}`}
                    className="unit-select"
                    value={rateUnits[currency]}
                    onChange={(event) =>
                      changeRateUnit(
                        currency,
                        Number(event.target.value) as RateUnit,
                      )
                    }
                    aria-label={`${currency} quoted units`}
                  >
                    <NativeSelectOption value={1}>1 unit</NativeSelectOption>
                    <NativeSelectOption value={100}>
                      100 units
                    </NativeSelectOption>
                  </NativeSelect>
                </div>

                <div className="mobile-rate-field">
                  <label htmlFor={`buying-${index}`}>Dealer buying</label>
                  <Input
                    id={`buying-${index}`}
                    type="number"
                    min="0"
                    step="any"
                    inputMode="decimal"
                    placeholder="0.0000"
                    value={rates[currency].buying}
                    onChange={(event) =>
                      changeRate(currency, 'buying', event.target.value)
                    }
                    aria-label={`${currency} buying rate in ${dealerCurrency}`}
                  />
                </div>

                <div className="mobile-rate-field">
                  <label htmlFor={`selling-${index}`}>Dealer selling</label>
                  <Input
                    id={`selling-${index}`}
                    type="number"
                    min="0"
                    step="any"
                    inputMode="decimal"
                    placeholder="0.0000"
                    value={rates[currency].selling}
                    onChange={(event) =>
                      changeRate(currency, 'selling', event.target.value)
                    }
                    aria-label={`${currency} selling rate in ${dealerCurrency}`}
                  />
                </div>
              </div>
            ))}
          </fieldset>

          <div className="rate-note">
            <Info size={16} aria-hidden="true" />
            <p>
              “Buying” means the dealer buys that currency. “Selling” means the
              dealer sells it. Rates quoted per 100 are divided by 100 before
              calculating.
            </p>
          </div>
        </section>

        <section className="results-section" aria-labelledby="results-heading">
          <div className="section-heading results-heading">
            <span className="step-number step-number-accent">03</span>
            <div>
              <h2 id="results-heading">Effective direct rates</h2>
              <p>
                The dealer’s {dealerCurrency} step is included automatically.
              </p>
            </div>
          </div>

          <div className="result-grid">
            {results.map(({ currency, quote }) => (
              <article className="result-card" key={currency}>
                <div className="result-card-topline">
                  <div className="currency-pair">
                    <span>{sourceCurrency}</span>
                    <ArrowRight size={17} aria-hidden="true" />
                    <span>{currency}</span>
                  </div>
                  <span className="status-pill">
                    {quote?.indirect ? 'Cross rate' : 'Direct rate'}
                  </span>
                </div>

                {quote ? (
                  <>
                    <div className="headline-rate">
                      <span>1 {sourceCurrency} gets</span>
                      <strong>
                        {formatRate(quote.receives)} <small>{currency}</small>
                      </strong>
                      <p>when you buy {currency} from the dealer</p>
                    </div>

                    <dl className="quote-details">
                      <div>
                        <dt>Dealer buys {currency}</dt>
                        <dd>
                          {formatRate(quote.buying)} {sourceCurrency}
                        </dd>
                      </div>
                      <div>
                        <dt>Dealer sells {currency}</dt>
                        <dd>
                          {formatRate(quote.selling)} {sourceCurrency}
                        </dd>
                      </div>
                    </dl>
                    <p className="unit-caption">
                      Effective {sourceCurrency} price per 1 {currency}
                    </p>
                  </>
                ) : (
                  <div className="empty-result">
                    <strong>Waiting for rates</strong>
                    <p>
                      Enter buying and selling rates for {sourceCurrency} and{' '}
                      {currency} above.
                    </p>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>

        <aside
          className="google-rate-check"
          aria-label="Google rate comparison"
        >
          <div>
            <strong>Compare with Google</strong>
            <p>
              See Google’s current market result for 1 {sourceCurrency} to{' '}
              {rowCurrencies[1]}.
            </p>
          </div>
          <a href={googleSearchUrl} target="_blank" rel="noopener noreferrer">
            Check {sourceCurrency} → {rowCurrencies[1]} on Google
            <ExternalLink size={16} aria-hidden="true" />
          </a>
        </aside>

        <footer>
          Rates are calculated in your browser and are not saved or sent
          anywhere.
        </footer>
      </div>
    </main>
  );
}
