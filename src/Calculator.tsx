'use client';

import {
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ArrowRight, ExternalLink, Info, RefreshCw } from 'lucide-react';

import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { Input } from '@/components/ui/input';

const CURRENCIES = [
  { code: 'BND', name: 'Brunei Dollar', nameZh: '文莱元' },
  { code: 'RM', name: 'Ringgit Malaysia', nameZh: '马来西亚令吉' },
  { code: 'RMB', name: 'Chinese Yuan', nameZh: '人民币' },
  { code: 'NTD', name: 'Taiwan Dollar', nameZh: '新台币' },
  { code: 'USD', name: 'US Dollar', nameZh: '美元' },
  { code: 'AUD', name: 'Australian Dollar', nameZh: '澳元' },
  { code: 'JPY', name: 'Japanese Yen', nameZh: '日元' },
  { code: 'SGD', name: 'Singapore Dollar', nameZh: '新加坡元' },
  { code: 'EUR', name: 'Euro', nameZh: '欧元' },
  { code: 'PHP', name: 'Philippine Peso', nameZh: '菲律宾比索' },
  { code: 'GBP', name: 'British Pound', nameZh: '英镑' },
] as const;

const FOREIGN_CURRENCIES = CURRENCIES.filter(
  ({ code }) => code !== 'BND' && code !== 'RM',
);

type CurrencyCode = (typeof CURRENCIES)[number]['code'];
type Language = 'en' | 'zh-CN';
type RouteCurrency = 'BND' | 'RM';
type DealerCurrency = RouteCurrency | 'RMB' | 'NTD';
type RateUnit = 1 | 100;
type Rate = { buying: string; selling: string };
type RateBook = Record<CurrencyCode, Rate>;
type RateUnitBook = Record<CurrencyCode, RateUnit>;
type RateTouchBook = Partial<
  Record<CurrencyCode, Partial<Record<keyof Rate, boolean>>>
>;
type RateValidation = {
  level: 'error' | 'warning';
  message: string;
};
type StoredCalculatorState = {
  language: Language;
  sourceCurrency: RouteCurrency;
  dealerCurrency: DealerCurrency;
  targetCurrency: CurrencyCode;
  targetSelected: boolean;
  amount: string;
  rates: RateBook;
  rateUnits: RateUnitBook;
};

const STORAGE_KEY = 'currency-converter-state-v1';

const COPY = {
  en: {
    pageTitle: 'Currency Converter',
    eyebrow: 'Cross-rate calculator',
    languageLabel: 'Change language',
    languageEnglish: 'English',
    languageChinese: 'Simplified Chinese',
    setupHeading: 'Choose the exchange route',
    setupDescription:
      'Tell us what you have and the currency used by the dealer.',
    sourceLabel: 'You have',
    sourceAria: 'Currency you have',
    dealerLabel: 'Dealer operates in',
    dealerAria: 'Dealer currency',
    convertsTo: 'Converts to',
    foreignCurrency: 'Foreign currency',
    ratesHeading: 'Enter the dealer’s rates',
    ratesDescription:
      'Copy the displayed rates and choose whether they cover 1 or 100 units.',
    clearRates: 'Clear rates',
    dealerRates: 'Dealer rates',
    currency: 'Currency',
    quotedPer: 'Quoted per',
    dealerBuying: 'Dealer buying',
    dealerSelling: 'Dealer selling',
    yourCurrencyRate: 'Your currency rate',
    foreignCurrencyRate: 'Foreign currency rate',
    selectCurrency: 'Select currency',
    quotedUnits: (currency: CurrencyCode) => `${currency} quoted units`,
    oneUnit: '1 unit',
    oneHundredUnits: '100 units',
    buyingRate: (currency: CurrencyCode, dealer: DealerCurrency) =>
      `${currency} buying rate in ${dealer}`,
    sellingRate: (currency: CurrencyCode, dealer: DealerCurrency) =>
      `${currency} selling rate in ${dealer}`,
    validationPositive: 'Enter positive numbers for both buying and selling.',
    validationBuyingHigher:
      'Buying is higher than selling. Check if the rates are swapped.',
    validationWideSpread: (spread: string) =>
      `Wide spread (${spread}%). Check the values and quoted unit.`,
    rateNote:
      '“Buying” means the dealer buys that currency. “Selling” means the dealer sells it. Rates quoted per 100 are divided by 100 before calculating.',
    resultsHeading: 'Effective direct rates',
    resultsDescription: (dealer: DealerCurrency) =>
      `The dealer’s ${dealer} step is included automatically.`,
    amountLabel: 'Amount you have',
    optional: 'Optional',
    amountHelp: 'Enter an amount to estimate the total you will receive.',
    amountPlaceholder: 'e.g. 500',
    amountError: 'Enter an amount greater than zero, or leave it blank.',
    directRate: 'Direct rate',
    crossRate: 'Cross rate',
    oneGets: (source: RouteCurrency) => `1 ${source} gets`,
    whenBuying: (currency: CurrencyCode) =>
      `when you buy ${currency} from the dealer`,
    estimatedAmount: 'Estimated amount received',
    checkRates: 'Check the rates above',
    waitingRates: 'Waiting for rates',
    chooseCurrency: 'Choose a currency',
    chooseCurrencyDescription:
      'Select the second-row currency above to calculate the direct rate.',
    correctRates: 'Correct the highlighted buying and selling values.',
    enterRates: (source: RouteCurrency, currency: CurrencyCode) =>
      `Enter buying and selling rates for ${source} and ${currency} above.`,
    googleAria: 'Google rate comparison',
    compareGoogle: 'Compare with Google',
    googleDescription: (source: RouteCurrency, currency: CurrencyCode) =>
      `See Google’s current market result for 1 ${source} to ${currency}.`,
    checkGoogle: (source: RouteCurrency, currency: CurrencyCode) =>
      `Check ${source} → ${currency} on Google`,
    footer:
      'Rates are calculated and remembered on this device. They are not sent anywhere.',
  },
  'zh-CN': {
    pageTitle: '货币换算器',
    eyebrow: '交叉汇率计算器',
    languageLabel: '切换语言',
    languageEnglish: '英文',
    languageChinese: '简体中文',
    setupHeading: '选择兑换路径',
    setupDescription: '选择您持有的货币和兑换商使用的货币。',
    sourceLabel: '您持有',
    sourceAria: '您持有的货币',
    dealerLabel: '兑换商使用',
    dealerAria: '兑换商使用的货币',
    convertsTo: '兑换为',
    foreignCurrency: '外币',
    ratesHeading: '输入兑换商汇率',
    ratesDescription:
      '输入显示的汇率，并选择汇率是按 1 个还是 100 个单位报价。',
    clearRates: '清除汇率',
    dealerRates: '兑换商汇率',
    currency: '货币',
    quotedPer: '报价单位',
    dealerBuying: '兑换商买入价',
    dealerSelling: '兑换商卖出价',
    yourCurrencyRate: '您持有货币的汇率',
    foreignCurrencyRate: '外币汇率',
    selectCurrency: '选择货币',
    quotedUnits: (currency: CurrencyCode) => `${currency} 的报价单位`,
    oneUnit: '1 个单位',
    oneHundredUnits: '100 个单位',
    buyingRate: (currency: CurrencyCode, dealer: DealerCurrency) =>
      `以 ${dealer} 计价的 ${currency} 买入价`,
    sellingRate: (currency: CurrencyCode, dealer: DealerCurrency) =>
      `以 ${dealer} 计价的 ${currency} 卖出价`,
    validationPositive: '请为买入价和卖出价输入正数。',
    validationBuyingHigher: '买入价高于卖出价。请检查两者是否填反。',
    validationWideSpread: (spread: string) =>
      `买卖价差较大（${spread}%）。请检查数值和报价单位。`,
    rateNote:
      '“买入价”是兑换商买入该货币的价格；“卖出价”是兑换商卖出该货币的价格。按 100 个单位报价的汇率会先除以 100 再计算。',
    resultsHeading: '实际直接汇率',
    resultsDescription: (dealer: DealerCurrency) =>
      `系统已自动计入兑换商使用 ${dealer} 的兑换步骤。`,
    amountLabel: '您持有的金额',
    optional: '可选',
    amountHelp: '输入金额以估算您将收到的总额。',
    amountPlaceholder: '例如 500',
    amountError: '请输入大于零的金额，或留空。',
    directRate: '直接汇率',
    crossRate: '交叉汇率',
    oneGets: (source: RouteCurrency) => `1 ${source} 可兑换`,
    whenBuying: (currency: CurrencyCode) => `当您从兑换商购买 ${currency} 时`,
    estimatedAmount: '预计收到金额',
    checkRates: '请检查上方汇率',
    waitingRates: '等待输入汇率',
    chooseCurrency: '选择一种货币',
    chooseCurrencyDescription: '请在上方第二行选择货币以计算直接汇率。',
    correctRates: '请修正突出显示的买入价和卖出价。',
    enterRates: (source: RouteCurrency, currency: CurrencyCode) =>
      `请在上方输入 ${source} 和 ${currency} 的买入价与卖出价。`,
    googleAria: 'Google 汇率比较',
    compareGoogle: '与 Google 比较',
    googleDescription: (source: RouteCurrency, currency: CurrencyCode) =>
      `查看 Google 当前 1 ${source} 兑换 ${currency} 的市场结果。`,
    checkGoogle: (source: RouteCurrency, currency: CurrencyCode) =>
      `在 Google 上查看 ${source} → ${currency}`,
    footer: '汇率在此设备上计算并保存，不会发送到任何地方。',
  },
} as const;

type Copy = (typeof COPY)[Language];

const DEFAULT_RATES: RateBook = {
  BND: { buying: '', selling: '' },
  RM: { buying: '', selling: '' },
  RMB: { buying: '', selling: '' },
  NTD: { buying: '', selling: '' },
  USD: { buying: '', selling: '' },
  AUD: { buying: '', selling: '' },
  JPY: { buying: '', selling: '' },
  SGD: { buying: '', selling: '' },
  EUR: { buying: '', selling: '' },
  PHP: { buying: '', selling: '' },
  GBP: { buying: '', selling: '' },
};

const DEFAULT_RATE_UNITS: RateUnitBook = {
  BND: 1,
  RM: 1,
  RMB: 1,
  NTD: 1,
  USD: 1,
  AUD: 1,
  JPY: 1,
  SGD: 1,
  EUR: 1,
  PHP: 1,
  GBP: 1,
};

const GOOGLE_CURRENCY_CODES: Record<CurrencyCode, string> = {
  BND: 'BND',
  RM: 'MYR',
  RMB: 'CNY',
  NTD: 'TWD',
  USD: 'USD',
  AUD: 'AUD',
  JPY: 'JPY',
  SGD: 'SGD',
  EUR: 'EUR',
  PHP: 'PHP',
  GBP: 'GBP',
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

const formatRate = (value: number, language: Language) =>
  new Intl.NumberFormat(language, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(value);

const formatAmount = (value: number, language: Language) =>
  new Intl.NumberFormat(language, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);

const validateRate = (rate: Rate, copy: Copy): RateValidation | null => {
  if (rate.buying === '' && rate.selling === '') return null;

  const buying = toPositiveNumber(rate.buying);
  const selling = toPositiveNumber(rate.selling);
  if (buying === null || selling === null) {
    return {
      level: 'error',
      message: copy.validationPositive,
    };
  }

  if (buying > selling) {
    return {
      level: 'error',
      message: copy.validationBuyingHigher,
    };
  }

  const spread = ((selling - buying) / ((selling + buying) / 2)) * 100;
  if (spread > 15) {
    return {
      level: 'warning',
      message: copy.validationWideSpread(spread.toFixed(1)),
    };
  }

  return null;
};

const isRouteCurrency = (value: unknown): value is RouteCurrency =>
  value === 'BND' || value === 'RM';

const isLanguage = (value: unknown): value is Language =>
  value === 'en' || value === 'zh-CN';

const isDealerCurrency = (value: unknown): value is DealerCurrency =>
  value === 'BND' || value === 'RM' || value === 'RMB' || value === 'NTD';

const isForeignCurrency = (value: unknown): value is CurrencyCode =>
  isCurrency(value) && value !== 'BND' && value !== 'RM';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isRateInputValue = (value: unknown): value is string =>
  typeof value === 'string' &&
  (value === '' || (Number.isFinite(Number(value)) && Number(value) >= 0));

const readStoredState = (): StoredCalculatorState => {
  const fallback: StoredCalculatorState = {
    language: 'en',
    sourceCurrency: 'BND',
    dealerCurrency: 'RM',
    targetCurrency: 'RMB',
    targetSelected: false,
    amount: '',
    rates: structuredClone(DEFAULT_RATES),
    rateUnits: structuredClone(DEFAULT_RATE_UNITS),
  };

  if (typeof window === 'undefined') return fallback;

  try {
    const rawState = window.localStorage.getItem(STORAGE_KEY);
    if (!rawState) return fallback;

    const storedState: unknown = JSON.parse(rawState);
    if (!isRecord(storedState)) return fallback;

    const language = isLanguage(storedState.language)
      ? storedState.language
      : fallback.language;
    const sourceCurrency = isRouteCurrency(storedState.sourceCurrency)
      ? storedState.sourceCurrency
      : fallback.sourceCurrency;
    const dealerCurrency = isDealerCurrency(storedState.dealerCurrency)
      ? storedState.dealerCurrency
      : fallback.dealerCurrency;
    const targetCurrency = isForeignCurrency(storedState.targetCurrency)
      ? storedState.targetCurrency
      : fallback.targetCurrency;
    const targetSelected = storedState.targetSelected === true;
    const amount = isRateInputValue(storedState.amount)
      ? storedState.amount
      : fallback.amount;

    const rates = structuredClone(DEFAULT_RATES);
    if (isRecord(storedState.rates)) {
      for (const { code } of CURRENCIES) {
        const storedRate = storedState.rates[code];
        if (!isRecord(storedRate)) continue;
        if (isRateInputValue(storedRate.buying)) {
          rates[code].buying = storedRate.buying;
        }
        if (isRateInputValue(storedRate.selling)) {
          rates[code].selling = storedRate.selling;
        }
      }
    }

    const rateUnits = structuredClone(DEFAULT_RATE_UNITS);
    if (isRecord(storedState.rateUnits)) {
      for (const { code } of CURRENCIES) {
        const storedUnit = storedState.rateUnits[code];
        if (storedUnit === 1 || storedUnit === 100) {
          rateUnits[code] = storedUnit;
        }
      }
    }

    return {
      language,
      sourceCurrency,
      dealerCurrency,
      targetCurrency,
      targetSelected,
      amount,
      rates,
      rateUnits,
    };
  } catch {
    return fallback;
  }
};

const makeRateRows = (
  source: RouteCurrency,
  preferredTarget?: CurrencyCode,
): CurrencyCode[] => {
  const availableTargets = FOREIGN_CURRENCIES.map(({ code }) => code);
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
  const [initialState] = useState(readStoredState);
  const [language, setLanguage] = useState<Language>(initialState.language);
  const [sourceCurrency, setSourceCurrency] = useState<RouteCurrency>(
    initialState.sourceCurrency,
  );
  const [dealerCurrency, setDealerCurrency] = useState<DealerCurrency>(
    initialState.dealerCurrency,
  );
  const [rowCurrencies, setRowCurrencies] = useState<CurrencyCode[]>([
    initialState.sourceCurrency,
    initialState.targetCurrency,
  ]);
  const [targetSelected, setTargetSelected] = useState(
    initialState.targetSelected,
  );
  const [amount, setAmount] = useState(initialState.amount);
  const [rates, setRates] = useState<RateBook>(initialState.rates);
  const [rateUnits, setRateUnits] = useState<RateUnitBook>(
    initialState.rateUnits,
  );
  const [rateTouches, setRateTouches] = useState<RateTouchBook>(() => {
    const touches: RateTouchBook = {};
    for (const { code } of CURRENCIES) {
      if (
        initialState.rates[code].buying !== '' ||
        initialState.rates[code].selling !== ''
      ) {
        touches[code] = { buying: true, selling: true };
      }
    }
    return touches;
  });
  const rateInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const copy = COPY[language];
  const languageControlCopy = COPY[language === 'en' ? 'zh-CN' : 'en'];
  const targetCurrency = rowCurrencies[1];
  const targetCurrencyDetails = CURRENCIES.find(
    ({ code }) => code === targetCurrency,
  );
  const targetCurrencyName =
    (language === 'en'
      ? targetCurrencyDetails?.name
      : targetCurrencyDetails?.nameZh) ?? targetCurrency;
  const targetCurrencyDisplay = targetSelected
    ? `${targetCurrency} — ${targetCurrencyName}`
    : copy.foreignCurrency;

  const sourceCurrencies = CURRENCIES.filter(
    ({ code }) => code === 'BND' || code === 'RM',
  );
  const dealerCurrencies = CURRENCIES.filter(
    ({ code }) =>
      code === 'BND' || code === 'RM' || code === 'RMB' || code === 'NTD',
  );

  const rateValidations = useMemo(() => {
    const validations = {} as Record<CurrencyCode, RateValidation | null>;
    for (const { code } of CURRENCIES) {
      validations[code] = validateRate(rates[code], copy);
    }
    return validations;
  }, [copy, rates]);

  const hasBlockingRateError = rowCurrencies.some(
    (currency) => rateValidations[currency]?.level === 'error',
  );
  const hasVisibleBlockingRateError = rowCurrencies.some(
    (currency) =>
      rateTouches[currency]?.buying &&
      rateTouches[currency]?.selling &&
      rateValidations[currency]?.level === 'error',
  );
  const amountValue = toPositiveNumber(amount);
  const hasAmountError = amount !== '' && amountValue === null;

  const results = useMemo(
    () => [
      {
        currency: rowCurrencies[1],
        quote:
          !targetSelected || hasBlockingRateError
            ? null
            : getQuote(
                sourceCurrency,
                dealerCurrency,
                rowCurrencies[1],
                rates,
                rateUnits,
              ),
      },
    ],
    [
      dealerCurrency,
      hasBlockingRateError,
      rateUnits,
      rates,
      rowCurrencies,
      sourceCurrency,
      targetSelected,
    ],
  );

  const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(
    `1 ${GOOGLE_CURRENCY_CODES[sourceCurrency]} to ${GOOGLE_CURRENCY_CODES[rowCurrencies[1]]}`,
  )}`;

  const changeSourceCurrency = (currency: RouteCurrency) => {
    setSourceCurrency(currency);
    setRowCurrencies((current) => makeRateRows(currency, current[1]));
  };

  const changeDealerCurrency = (currency: DealerCurrency) => {
    setDealerCurrency(currency);
  };

  const changeTargetCurrency = (currency: CurrencyCode) => {
    setRowCurrencies((current) => [current[0], currency]);
    setTargetSelected(true);
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

  const markRateTouched = (currency: CurrencyCode, side: keyof Rate) => {
    setRateTouches((current) => ({
      ...current,
      [currency]: { ...current[currency], [side]: true },
    }));
  };

  const clearRates = () => {
    setRates(structuredClone(DEFAULT_RATES));
    setRateTouches({});
    setTargetSelected(false);
  };

  const getVisibleRateValidation = (currency: CurrencyCode) =>
    rateTouches[currency]?.buying && rateTouches[currency]?.selling
      ? rateValidations[currency]
      : null;

  const handleRateKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
    inputIndex: number,
  ) => {
    if (event.key !== 'Enter') return;

    event.preventDefault();
    const nextInput = rateInputRefs.current[inputIndex + 1];
    if (nextInput) {
      nextInput.focus();
      nextInput.select();
    } else {
      event.currentTarget.blur();
    }
  };

  useEffect(() => {
    const stateToStore: StoredCalculatorState = {
      language,
      sourceCurrency,
      dealerCurrency,
      targetCurrency: rowCurrencies[1],
      targetSelected,
      amount,
      rates,
      rateUnits,
    };

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToStore));
    } catch {
      // The calculator still works when browser storage is unavailable.
    }
  }, [
    amount,
    dealerCurrency,
    language,
    rateUnits,
    rates,
    rowCurrencies,
    sourceCurrency,
    targetSelected,
  ]);

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = copy.pageTitle;
  }, [copy.pageTitle, language]);

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
              dealerCurrency: {
                type: 'string',
                enum: ['BND', 'RM', 'RMB', 'NTD'],
              },
              rates: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    currency: {
                      type: 'string',
                      enum: CURRENCIES.map(({ code }) => code),
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
              !isDealerCurrency(candidate.dealerCurrency) ||
              !Array.isArray(candidate.rates)
            ) {
              throw new Error('Invalid exchange calculator configuration.');
            }

            const nextRates: RateBook = structuredClone(DEFAULT_RATES);
            const nextRateUnits: RateUnitBook =
              structuredClone(DEFAULT_RATE_UNITS);
            const nextRateTouches: RateTouchBook = {};
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
              nextRateTouches[rate.currency] = {
                buying: true,
                selling: true,
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
            const configuredDealer = candidate.dealerCurrency as DealerCurrency;
            setSourceCurrency(configuredSource);
            setDealerCurrency(configuredDealer);
            setRowCurrencies(makeRateRows(configuredSource, configuredTarget));
            setTargetSelected(configuredTarget !== undefined);
            setRates(nextRates);
            setRateUnits(nextRateUnits);
            setRateTouches(nextRateTouches);
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
            <p className="eyebrow">{copy.eyebrow}</p>
            <h1>{copy.pageTitle}</h1>
          </div>
          <label className="language-control">
            <span>{languageControlCopy.languageLabel}</span>
            <NativeSelect
              className="language-select"
              value={language}
              onChange={(event) => setLanguage(event.target.value as Language)}
              aria-label={languageControlCopy.languageLabel}
            >
              <NativeSelectOption value="en">
                {languageControlCopy.languageEnglish}
              </NativeSelectOption>
              <NativeSelectOption value="zh-CN">
                {languageControlCopy.languageChinese}
              </NativeSelectOption>
            </NativeSelect>
          </label>
        </header>

        <section className="setup-card" aria-labelledby="setup-heading">
          <div className="section-heading">
            <span className="step-number">01</span>
            <div>
              <h2 id="setup-heading">{copy.setupHeading}</h2>
              <p>{copy.setupDescription}</p>
            </div>
          </div>

          <div className="route-builder">
            <label className="field-block">
              <span>{copy.sourceLabel}</span>
              <NativeSelect
                className="select-control"
                value={sourceCurrency}
                onChange={(event) =>
                  changeSourceCurrency(event.target.value as RouteCurrency)
                }
                aria-label={copy.sourceAria}
              >
                {sourceCurrencies.map((currency) => (
                  <NativeSelectOption key={currency.code} value={currency.code}>
                    {currency.code} —{' '}
                    {language === 'en' ? currency.name : currency.nameZh}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </label>

            <div className="route-arrow" aria-hidden="true">
              <ArrowRight size={20} />
            </div>

            <label className="field-block">
              <span>{copy.dealerLabel}</span>
              <NativeSelect
                className="select-control"
                value={dealerCurrency}
                onChange={(event) =>
                  changeDealerCurrency(event.target.value as DealerCurrency)
                }
                aria-label={copy.dealerAria}
              >
                {dealerCurrencies.map((currency) => (
                  <NativeSelectOption key={currency.code} value={currency.code}>
                    {currency.code} —{' '}
                    {language === 'en' ? currency.name : currency.nameZh}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </label>

            <div className="route-arrow" aria-hidden="true">
              <ArrowRight size={20} />
            </div>

            <div className="route-destination">
              <span>{copy.convertsTo}</span>
              <strong>{targetCurrencyDisplay}</strong>
            </div>
          </div>

          <div className="route-summary" aria-live="polite">
            <span>{sourceCurrency}</span>
            <ArrowRight size={16} aria-hidden="true" />
            <span>{dealerCurrency}</span>
            <ArrowRight size={16} aria-hidden="true" />
            <span>
              {targetSelected ? targetCurrency : copy.foreignCurrency}
            </span>
          </div>
        </section>

        <section className="rates-card" aria-labelledby="rates-heading">
          <div className="section-heading rates-title-row">
            <div className="heading-with-step">
              <span className="step-number">02</span>
              <div>
                <h2 id="rates-heading">{copy.ratesHeading}</h2>
                <p>{copy.ratesDescription}</p>
              </div>
            </div>
            <button className="clear-button" type="button" onClick={clearRates}>
              <RefreshCw size={15} aria-hidden="true" />
              {copy.clearRates}
            </button>
          </div>

          <fieldset className="rate-table">
            <legend className="sr-only">{copy.dealerRates}</legend>
            <div className="rate-header" aria-hidden="true">
              <span>{copy.currency}</span>
              <span>{copy.quotedPer}</span>
              <span>{copy.dealerBuying}</span>
              <span>{copy.dealerSelling}</span>
            </div>

            {rowCurrencies.map((currency, index) => (
              <div className="rate-row" key={`${index}-${currency}`}>
                <NativeSelect
                  className="currency-select"
                  value={index === 1 && !targetSelected ? '' : currency}
                  disabled={index === 0}
                  onChange={(event) =>
                    changeTargetCurrency(event.target.value as CurrencyCode)
                  }
                  aria-label={
                    index === 0
                      ? copy.yourCurrencyRate
                      : copy.foreignCurrencyRate
                  }
                >
                  {index === 1 && (
                    <NativeSelectOption value="" disabled>
                      {copy.selectCurrency}
                    </NativeSelectOption>
                  )}
                  {(index === 0 ? CURRENCIES : FOREIGN_CURRENCIES).map(
                    (option) => (
                      <NativeSelectOption key={option.code} value={option.code}>
                        {option.code} (
                        {language === 'en' ? option.name : option.nameZh})
                      </NativeSelectOption>
                    ),
                  )}
                </NativeSelect>

                <div className="mobile-rate-field">
                  <label htmlFor={`quoted-units-${index}`}>
                    {copy.quotedPer}
                  </label>
                  <NativeSelect
                    id={`quoted-units-${index}`}
                    className="unit-select"
                    value={rateUnits[currency]}
                    disabled={index === 1 && !targetSelected}
                    onChange={(event) =>
                      changeRateUnit(
                        currency,
                        Number(event.target.value) as RateUnit,
                      )
                    }
                    aria-label={copy.quotedUnits(currency)}
                  >
                    <NativeSelectOption value={1}>
                      {copy.oneUnit}
                    </NativeSelectOption>
                    <NativeSelectOption value={100}>
                      {copy.oneHundredUnits}
                    </NativeSelectOption>
                  </NativeSelect>
                </div>

                <div className="mobile-rate-field">
                  <label htmlFor={`buying-${index}`}>{copy.dealerBuying}</label>
                  <Input
                    id={`buying-${index}`}
                    ref={(element) => {
                      rateInputRefs.current[index * 2] = element;
                    }}
                    type="number"
                    disabled={index === 1 && !targetSelected}
                    min="0"
                    step="any"
                    inputMode="decimal"
                    enterKeyHint="next"
                    placeholder="0.0000"
                    value={rates[currency].buying}
                    onFocus={(event) => event.currentTarget.select()}
                    onBlur={() => markRateTouched(currency, 'buying')}
                    onKeyDown={(event) => handleRateKeyDown(event, index * 2)}
                    onChange={(event) =>
                      changeRate(currency, 'buying', event.target.value)
                    }
                    aria-invalid={
                      getVisibleRateValidation(currency)?.level === 'error'
                    }
                    aria-describedby={
                      getVisibleRateValidation(currency)
                        ? `rate-validation-${index}`
                        : undefined
                    }
                    aria-label={copy.buyingRate(currency, dealerCurrency)}
                  />
                </div>

                <div className="mobile-rate-field">
                  <label htmlFor={`selling-${index}`}>
                    {copy.dealerSelling}
                  </label>
                  <Input
                    id={`selling-${index}`}
                    ref={(element) => {
                      rateInputRefs.current[index * 2 + 1] = element;
                    }}
                    type="number"
                    disabled={index === 1 && !targetSelected}
                    min="0"
                    step="any"
                    inputMode="decimal"
                    enterKeyHint={
                      index === rowCurrencies.length - 1 ? 'done' : 'next'
                    }
                    placeholder="0.0000"
                    value={rates[currency].selling}
                    onFocus={(event) => event.currentTarget.select()}
                    onBlur={() => markRateTouched(currency, 'selling')}
                    onKeyDown={(event) =>
                      handleRateKeyDown(event, index * 2 + 1)
                    }
                    onChange={(event) =>
                      changeRate(currency, 'selling', event.target.value)
                    }
                    aria-invalid={
                      getVisibleRateValidation(currency)?.level === 'error'
                    }
                    aria-describedby={
                      getVisibleRateValidation(currency)
                        ? `rate-validation-${index}`
                        : undefined
                    }
                    aria-label={copy.sellingRate(currency, dealerCurrency)}
                  />
                </div>

                {(index === 0 || targetSelected) &&
                  getVisibleRateValidation(currency) && (
                    <p
                      className={`rate-validation rate-validation-${getVisibleRateValidation(currency)?.level}`}
                      id={`rate-validation-${index}`}
                      role={
                        getVisibleRateValidation(currency)?.level === 'error'
                          ? 'alert'
                          : 'status'
                      }
                    >
                      {getVisibleRateValidation(currency)?.message}
                    </p>
                  )}
              </div>
            ))}
          </fieldset>

          <div className="rate-note">
            <Info size={16} aria-hidden="true" />
            <p>{copy.rateNote}</p>
          </div>
        </section>

        <section className="results-section" aria-labelledby="results-heading">
          <div className="section-heading results-heading">
            <span className="step-number">03</span>
            <div>
              <h2 id="results-heading">{copy.resultsHeading}</h2>
              <p>{copy.resultsDescription(dealerCurrency)}</p>
            </div>
          </div>

          <div className="amount-converter">
            <div className="amount-copy">
              <label htmlFor="exchange-amount">
                {copy.amountLabel} <span>{copy.optional}</span>
              </label>
              <p id="exchange-amount-help">{copy.amountHelp}</p>
            </div>
            <div className="amount-input-wrap">
              <Input
                id="exchange-amount"
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                enterKeyHint="done"
                placeholder={copy.amountPlaceholder}
                value={amount}
                onFocus={(event) => event.currentTarget.select()}
                onChange={(event) => setAmount(event.target.value)}
                aria-invalid={hasAmountError}
                aria-describedby={
                  hasAmountError
                    ? 'exchange-amount-error'
                    : 'exchange-amount-help'
                }
              />
              <span>{sourceCurrency}</span>
            </div>
            {hasAmountError && (
              <p className="amount-error" id="exchange-amount-error">
                {copy.amountError}
              </p>
            )}
          </div>

          <div className="result-grid">
            {results.map(({ currency, quote }) => (
              <article className="result-card" key={currency}>
                <div className="result-card-topline">
                  <div className="currency-pair">
                    <span>{sourceCurrency}</span>
                    <ArrowRight size={17} aria-hidden="true" />
                    <span>
                      {targetSelected ? currency : copy.foreignCurrency}
                    </span>
                  </div>
                  {targetSelected && (
                    <span className="status-pill">
                      {sourceCurrency === dealerCurrency
                        ? copy.directRate
                        : copy.crossRate}
                    </span>
                  )}
                </div>

                {quote ? (
                  <>
                    <div className="headline-rate">
                      <span>{copy.oneGets(sourceCurrency)}</span>
                      <strong>
                        {formatRate(quote.receives, language)}{' '}
                        <small>{currency}</small>
                      </strong>
                      <p>{copy.whenBuying(currency)}</p>
                    </div>

                    {amountValue !== null && (
                      <div className="amount-total" aria-live="polite">
                        <span>{copy.estimatedAmount}</span>
                        <strong>
                          {formatAmount(amountValue, language)} {sourceCurrency}
                          <small> ≈ </small>
                          {formatRate(
                            amountValue * quote.receives,
                            language,
                          )}{' '}
                          {currency}
                        </strong>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="empty-result">
                    <strong>
                      {!targetSelected
                        ? copy.chooseCurrency
                        : hasVisibleBlockingRateError
                          ? copy.checkRates
                          : copy.waitingRates}
                    </strong>
                    <p>
                      {!targetSelected
                        ? copy.chooseCurrencyDescription
                        : hasVisibleBlockingRateError
                          ? copy.correctRates
                          : copy.enterRates(sourceCurrency, currency)}
                    </p>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>

        {targetSelected && (
          <aside className="google-rate-check" aria-label={copy.googleAria}>
            <div>
              <strong>{copy.compareGoogle}</strong>
              <p>{copy.googleDescription(sourceCurrency, rowCurrencies[1])}</p>
            </div>
            <a href={googleSearchUrl} target="_blank" rel="noopener noreferrer">
              {copy.checkGoogle(sourceCurrency, rowCurrencies[1])}
              <ExternalLink size={16} aria-hidden="true" />
            </a>
          </aside>
        )}

        <footer>{copy.footer}</footer>
      </div>
    </main>
  );
}
