export type RelativeTimeMessages = {
  justNow: string;
  minutesAgo: (count: number) => string;
  hoursAgo: (count: number) => string;
  daysAgo: (count: number) => string;
};

export function formatRelativeTime(
  iso: string,
  messages: RelativeTimeMessages,
  now = Date.now(),
): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) {
    return messages.justNow;
  }

  const deltaSec = Math.max(0, Math.round((now - then) / 1000));
  if (deltaSec < 45) {
    return messages.justNow;
  }
  if (deltaSec < 3600) {
    const mins = Math.max(1, Math.round(deltaSec / 60));
    return messages.minutesAgo(mins);
  }
  if (deltaSec < 86400) {
    const hours = Math.max(1, Math.round(deltaSec / 3600));
    return messages.hoursAgo(hours);
  }
  const days = Math.max(1, Math.round(deltaSec / 86400));
  return messages.daysAgo(days);
}

export function formatCoordPair(lat: number, lng: number): string {
  return `${lat.toFixed(3)}°, ${lng.toFixed(3)}°`;
}
