const readableDateFormatter = new Intl.DateTimeFormat('en', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
  year: 'numeric',
});

const monthLabelFormatter = new Intl.DateTimeFormat('en', {
  month: 'long',
  timeZone: 'UTC',
  year: 'numeric',
});

export function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function toMonthKey(date: Date) {
  return date.toISOString().slice(0, 7);
}

export function nowIso() {
  return new Date().toISOString();
}

export function formatReadableDate(dateValue: string) {
  const date = new Date(`${dateValue}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return readableDateFormatter.format(date);
}

export function formatMonthLabel(monthValue: string) {
  const date = new Date(`${monthValue}-01T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return monthValue;
  }

  return monthLabelFormatter.format(date);
}
