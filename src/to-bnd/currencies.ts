export const CURRENCIES = [
  { code: 'USD', name: 'US dollar', zh: '美元' },
  { code: 'MYR', name: 'Malaysian ringgit (RM)', zh: '马来西亚令吉' },
  { code: 'CNY', name: 'Chinese yuan (RMB)', zh: '人民币' },
  { code: 'TWD', name: 'Taiwan dollar (NTD)', zh: '新台币' },
  { code: 'SGD', name: 'Singapore dollar', zh: '新加坡元' },
  { code: 'JPY', name: 'Japanese yen', zh: '日元' },
  { code: 'AUD', name: 'Australian dollar', zh: '澳元' },
  { code: 'EUR', name: 'Euro', zh: '欧元' },
  { code: 'GBP', name: 'British pound', zh: '英镑' },
  { code: 'PHP', name: 'Philippine peso', zh: '菲律宾比索' },
  { code: 'THB', name: 'Thai baht', zh: '泰铢' },
  { code: 'IDR', name: 'Indonesian rupiah', zh: '印尼盾' },
  { code: 'HKD', name: 'Hong Kong dollar', zh: '港元' },
  { code: 'KRW', name: 'South Korean won', zh: '韩元' },
  { code: 'VND', name: 'Vietnamese dong', zh: '越南盾' },
  { code: 'INR', name: 'Indian rupee', zh: '印度卢比' },
  { code: 'CAD', name: 'Canadian dollar', zh: '加拿大元' },
  { code: 'NZD', name: 'New Zealand dollar', zh: '新西兰元' },
] as const;

export type Currency = (typeof CURRENCIES)[number]['code'];

export function isCurrency(value: unknown): value is Currency {
  return CURRENCIES.some((currency) => currency.code === value);
}
