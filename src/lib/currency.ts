/* ============================================================
   货币代码 → 符号映射
   AI 返回的 currency 字段（ISO 4217）转为展示符号
   ============================================================ */

const CURRENCY_SYMBOLS: Record<string, string> = {
  CNY: '¥',   // 人民币
  RMB: '¥',
  JPY: '¥',   // 日元（¥ 也是日元符号）
  KRW: '₩',   // 韩元
  USD: '$',   // 美元
  EUR: '€',   // 欧元
  GBP: '£',   // 英镑
  HKD: 'HK$', // 港元
  TWD: 'NT$', // 台币
  SGD: 'S$',  // 新加坡元
  THB: '฿',   // 泰铢
  VND: '₫',   // 越南盾
  MYR: 'RM',  // 马来西亚林吉特
  IDR: 'Rp',  // 印尼盾
  PHP: '₱',   // 菲律宾比索
  AUD: 'A$',  // 澳元
  NZD: 'NZ$', // 纽西兰元
  CAD: 'C$',  // 加拿大元
  CHF: 'CHF', // 瑞士法郎
  INR: '₹',   // 印度卢比
  AED: 'AED', // 阿联酋迪拉姆
  TRY: '₺',   // 土耳其里拉
  EGP: 'EGP', // 埃及镑
  ZAR: 'R',   // 南非兰特
  BRL: 'R$',  // 巴西雷亚尔
  MXN: 'MX$', // 墨西哥比索
  RUB: '₽',   // 俄罗斯卢布
}

/**
 * 将货币代码转为展示符号
 * @param currency ISO 4217 货币代码，如 "KRW"、"JPY"，或已是符号如 "¥"
 * @returns 展示符号，找不到时返回原始值或 '¥'
 */
export function getCurrencySymbol(currency?: string): string {
  if (!currency) return '¥'
  // 已经是符号（非字母或长度<=2）直接返回
  if (currency.length <= 2 || !/^[A-Z]+$/.test(currency)) return currency
  return CURRENCY_SYMBOLS[currency.toUpperCase()] ?? currency
}
