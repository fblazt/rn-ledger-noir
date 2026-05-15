export function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function toMonthKey(date: Date) {
  return date.toISOString().slice(0, 7);
}

export function nowIso() {
  return new Date().toISOString();
}
