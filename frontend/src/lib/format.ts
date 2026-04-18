export function formatEur(value: number | null | undefined): string {
  if (value == null) return "—";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(2)} M€`;
  if (abs >= 10_000) return `${(value / 1_000).toFixed(1)} k€`;
  return `${value.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €`;
}

export function formatPct(value: number | null | undefined, withSign = false): string {
  if (value == null) return "—";
  const sign = withSign && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)} %`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function formatMonthYear(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
  } catch {
    return iso;
  }
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase();
}
