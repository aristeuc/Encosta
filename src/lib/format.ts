const dateFormatter = new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" });

export function formatDate(date: Date | null | undefined): string {
  if (!date) return "—";
  return dateFormatter.format(date);
}

export function toInputDate(date: Date | null | undefined): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}
