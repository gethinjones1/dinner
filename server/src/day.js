export function isValidTimezone(tz) {
  if (typeof tz !== 'string' || tz.length === 0) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

// Calendar date (YYYY-MM-DD) of `date` in the given IANA timezone.
export function dayInTimezone(timezone, date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function previousDay(day) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

// Consecutive days posted, ending today (or yesterday, so a streak isn't
// shown as broken before you've had a chance to post tonight).
// `days` must be sorted newest first.
export function streakLength(days, today) {
  const posted = new Set(days);
  let day = posted.has(today) ? today : previousDay(today);
  let streak = 0;
  while (posted.has(day)) {
    streak++;
    day = previousDay(day);
  }
  return streak;
}
