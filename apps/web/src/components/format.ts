/**
 * Format a number as Japanese yen.
 * Amounts >= 10,000 are shown in 万円 (e.g. "1,520万円").
 * Amounts < 10,000 are shown in 円 (e.g. "1,234円").
 */
export function formatYen(amount: number): string {
  if (Math.abs(amount) >= 10000) {
    const man = Math.round(amount / 10000);
    return `${man.toLocaleString("ja-JP")}万円`;
  }
  return `${amount.toLocaleString("ja-JP")}円`;
}

/**
 * Format a date string or Date object as Japanese date.
 * Example: "2026年2月24日"
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

/**
 * Format a date string to month-only display.
 * Example: "2月"
 */
export function formatMonth(date: string): string {
  const d = new Date(date);
  return `${d.getMonth() + 1}月`;
}
