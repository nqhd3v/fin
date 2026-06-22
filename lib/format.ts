const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const groupFormatter = new Intl.NumberFormat("vi-VN");

/** Format an amount as VND, e.g. 45000 -> "45.000 ₫". */
export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount);
}

/** Group an integer with thousand separators, e.g. 20000 -> "20.000". */
export function formatNumber(amount: number): string {
  return groupFormatter.format(amount);
}

/** Compact amount for tight UI, e.g. 45000 -> "45k", 1200000 -> "1.2M". */
export function formatCompact(amount: number): string {
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(amount % 1_000_000 === 0 ? 0 : 1)}M`;
  }
  if (amount >= 1_000) {
    return `${Math.round(amount / 1_000)}k`;
  }
  return String(amount);
}

/** Relative day label for grouping, e.g. "Today", "Yesterday", "Mon 16 Jun". */
export function formatDayLabel(date: Date): string {
  const today = new Date();
  const startOf = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((startOf(today) - startOf(date)) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}
