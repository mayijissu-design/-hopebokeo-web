/**
 * Format numbers with locale commas (e.g. 1,000, 25,400)
 */
export function formatNumber(val: number | string | null | undefined): string {
  if (val === null || val === undefined || val === "") return "0";
  const num = typeof val === "number" ? val : Number(val);
  if (isNaN(num)) return String(val);
  return num.toLocaleString();
}

export function parseFormattedNumber(val: string): number {
  if (!val) return 0;
  const cleaned = val.replace(/,/g, "").trim();
  const num = Number(cleaned);
  return isNaN(num) ? 0 : num;
}
