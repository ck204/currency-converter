import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUpRight, RefreshCw } from 'lucide-react';

import { CURRENCIES, isCurrency, type Currency } from './currencies';
import {
  loadGoogleRates,
  readSavedRates,
  type RateSnapshot,
} from './google-rates';

type Language = 'en' | 'zh-CN';

const COPY = {
  en: {
    title: 'Convert to BND',
    eyebrow: 'Everyday currency converter',
    subtitle: 'A quick answer in Brunei dollars.',
    currency: 'From currency',
    amount: 'Amount',
    result: 'In Brunei dollars',
    google: 'Check on Google',
    refresh: 'Refresh rates',
    loading: 'Getting Google rates…',
    available: 'Google Finance rates',
    saved: 'Saved Google rates',
    unavailable:
      'Google rates are unavailable. Try refreshing or check on Google.',
    missing:
      'Google hasn’t returned a rate for this currency. Check on Google.',
    invalid: 'Enter a valid amount of zero or more.',
    empty: 'Enter an amount to convert.',
    retrieved: 'Retrieved',
    estimate: 'Estimated value',
    note: 'Google quotes may be delayed by up to 20 minutes. Bank and money changer rates may differ.',
    dealer: 'Need the dealer’s buying and selling rates?',
    dealerLink: 'Open the dealer calculator',
    language: 'Language',
    refreshing: 'Refreshing…',
  },
  'zh-CN': {
    title: '换算为文莱元',
    eyebrow: '日常货币换算器',
    subtitle: '快速查看外币的文莱元价值。',
    currency: '外币',
    amount: '金额',
    result: '换算为文莱元',
    google: '在 Google 上查看',
    refresh: '刷新汇率',
    loading: '正在获取 Google 汇率…',
    available: 'Google Finance 汇率',
    saved: '已保存的 Google 汇率',
    unavailable: '暂时无法获取 Google 汇率。请刷新或在 Google 上查看。',
    missing: 'Google 暂未提供该货币的汇率。请在 Google 上查看。',
    invalid: '请输入大于或等于零的有效金额。',
    empty: '输入金额以进行换算。',
    retrieved: '获取时间',
    estimate: '估算价值',
    note: 'Google 汇率可能延迟最多 20 分钟。银行和兑换商的汇率可能不同。',
    dealer: '需要使用兑换商的买入价和卖出价？',
    dealerLink: '打开兑换商计算器',
    language: '语言',
    refreshing: '正在刷新…',
  },
} as const;

const numberFormat = (value: number, language: Language, precision = 6) =>
  new Intl.NumberFormat(language, { maximumFractionDigits: precision }).format(
    value,
  );

export default function Converter() {
  const [language, setLanguage] = useState<Language>('en');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [amount, setAmount] = useState('1');
  const [snapshot, setSnapshot] = useState<RateSnapshot | null>(readSavedRates);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const controllerRef = useRef<AbortController | null>(null);
  const copy = COPY[language];

  useEffect(() => {
    document.title = copy.title;
    document.documentElement.lang = language;
  }, [copy.title, language]);

  useEffect(() => {
    const controller = new AbortController();
    controllerRef.current = controller;
    loadGoogleRates(controller.signal)
      .then((value) => {
        if (controller.signal.aborted) return;
        setSnapshot(value);
        setFailed(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [refreshKey]);

  const parsedAmount = Number(amount);
  const validAmount =
    amount.trim() !== '' && Number.isFinite(parsedAmount) && parsedAmount >= 0;
  const rate = snapshot?.rates[currency];
  const total = validAmount && rate !== undefined ? parsedAmount * rate : null;
  const overflow = total !== null && !Number.isFinite(total);
  const invalid = amount.trim() !== '' && (!validAmount || overflow);
  const result =
    total !== null && !overflow
      ? new Intl.NumberFormat(language, {
          minimumFractionDigits: 2,
          maximumFractionDigits: total > 0 && total < 0.01 ? 6 : 2,
        }).format(total)
      : '—';
  const googleUrl = new URL('https://www.google.com/search');
  googleUrl.searchParams.set(
    'q',
    `${validAmount && !overflow ? amount : '1'} ${currency} to BND`,
  );
  const status = loading
    ? copy.loading
    : failed && snapshot
      ? copy.saved
      : snapshot
        ? copy.available
        : copy.unavailable;

  function refresh() {
    controllerRef.current?.abort();
    setLoading(true);
    setFailed(false);
    setRefreshKey((key) => key + 1);
  }

  return (
    <main className="bnd-shell">
      <header className="bnd-header">
        <a
          className="bnd-brand"
          href={import.meta.env.BASE_URL}
          aria-label="Currency converter home"
        >
          B$
        </a>
        <label className="bnd-language">
          <span className="bnd-sr-only">{copy.language}</span>
          <select
            value={language}
            onChange={(event) =>
              setLanguage(event.target.value === 'zh-CN' ? 'zh-CN' : 'en')
            }
          >
            <option value="en">English</option>
            <option value="zh-CN">简体中文</option>
          </select>
        </label>
      </header>

      <div className="bnd-intro">
        <p className="bnd-eyebrow">{copy.eyebrow}</p>
        <h1>{copy.title}</h1>
        <p>{copy.subtitle}</p>
      </div>

      <section className="bnd-card" aria-label={copy.title}>
        <div className="bnd-inputs">
          <label className="bnd-field" htmlFor="from-currency">
            <span>{copy.currency}</span>
            <select
              id="from-currency"
              value={currency}
              onChange={(event) => {
                if (isCurrency(event.target.value))
                  setCurrency(event.target.value);
              }}
            >
              {CURRENCIES.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.code} — {language === 'en' ? item.name : item.zh}
                </option>
              ))}
            </select>
          </label>
          <label className="bnd-field" htmlFor="foreign-amount">
            <span>{copy.amount}</span>
            <div className="bnd-amount-wrap">
              <input
                id="foreign-amount"
                type="number"
                inputMode="decimal"
                enterKeyHint="done"
                min="0"
                step="any"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    event.currentTarget.blur();
                  }
                }}
                aria-invalid={invalid}
                aria-describedby={invalid ? 'amount-error' : undefined}
              />
              <span aria-hidden="true">{currency}</span>
            </div>
          </label>
          {invalid && (
            <p id="amount-error" className="bnd-error" role="alert">
              {copy.invalid}
            </p>
          )}
        </div>

        <div className="bnd-divider">
          <span>
            <ArrowDown size={19} aria-hidden="true" />
          </span>
        </div>

        <div className="bnd-result" aria-live="polite" aria-atomic="true">
          <p className="bnd-result-label">{copy.result}</p>
          <div className="bnd-total">
            <span className="bnd-total-number">{result}</span>
            <span className="bnd-total-code">BND</span>
          </div>
          <p className="bnd-estimate">{copy.estimate}</p>
          {rate !== undefined && (
            <div className="bnd-rate-pair">
              <p>
                1 {currency} = {numberFormat(rate, language)} BND
              </p>
              <p>
                1 BND = {numberFormat(1 / rate, language)} {currency}
              </p>
            </div>
          )}
          {!validAmount && !invalid && (
            <p className="bnd-message">{copy.empty}</p>
          )}
          {!loading && snapshot && rate === undefined && (
            <p className="bnd-message">{copy.missing}</p>
          )}
        </div>

        <div className="bnd-actions">
          <a
            className="bnd-google"
            href={googleUrl.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            {copy.google}
            <ArrowUpRight size={17} aria-hidden="true" />
          </a>
          <button
            type="button"
            className="bnd-refresh"
            onClick={refresh}
            disabled={loading}
          >
            <RefreshCw size={15} aria-hidden="true" />
            {loading ? copy.refreshing : copy.refresh}
          </button>
        </div>
      </section>

      <output className="bnd-source">
        <span
          className={`bnd-dot${failed ? ' bnd-dot-warning' : ''}`}
          aria-hidden="true"
        />
        <span>{status}</span>
        {snapshot && (
          <span className="bnd-retrieved">
            {copy.retrieved}{' '}
            {new Intl.DateTimeFormat(language, {
              dateStyle: 'medium',
              timeStyle: 'short',
            }).format(snapshot.retrievedAt)}
          </span>
        )}
      </output>
      <p className="bnd-note">{copy.note}</p>
      <footer className="bnd-footer">
        <p>{copy.dealer}</p>
        <a href={import.meta.env.BASE_URL}>
          {copy.dealerLink}
          <ArrowUpRight size={14} aria-hidden="true" />
        </a>
      </footer>
    </main>
  );
}
