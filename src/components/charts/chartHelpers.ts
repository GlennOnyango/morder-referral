import type { ModelsReferral } from "../../types/referrals.generated";

export function countBy(items: string[]): Record<string, number> {
  return items.reduce<Record<string, number>>((acc, v) => {
    const key = v.trim().toLowerCase();
    if (key) acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

export function toChartData(counts: Record<string, number>, limit?: number) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const slice = limit ? entries.slice(0, limit) : entries;
  return slice.map(([name, value]) => ({ name, value }));
}

export function buildMonthlyTrend(referrals: ModelsReferral[]) {
  const counts: Record<string, number> = {};
  for (const r of referrals) {
    if (!r.createdAt) continue;
    const d = new Date(r.createdAt);
    if (Number.isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, count]) => ({
      month: new Date(`${month}-01`).toLocaleString("default", { month: "short", year: "2-digit" }),
      count,
    }));
}
