// Deliberately not using Intl.DateTimeFormat("pt-PT", ...) here: on server
// runtimes without full ICU data, locale-driven day/month ordering can
// silently fall back to the en-US MM/DD/YYYY order. Build the DD/MM/YYYY
// string by hand so it's correct regardless of what ICU data is available.
export function formatDate(date: Date | null | undefined): string {
  if (!date) return "—";
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

export function toInputDate(date: Date | null | undefined): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}
