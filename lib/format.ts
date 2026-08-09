export function formatRelativeTime(iso: string, now = Date.now()): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) {
    return "Just now";
  }

  const deltaSec = Math.max(0, Math.round((now - then) / 1000));
  if (deltaSec < 45) {
    return "Just now";
  }
  if (deltaSec < 3600) {
    const mins = Math.max(1, Math.round(deltaSec / 60));
    return `${mins}m ago`;
  }
  if (deltaSec < 86400) {
    const hours = Math.max(1, Math.round(deltaSec / 3600));
    return `${hours}h ago`;
  }
  const days = Math.max(1, Math.round(deltaSec / 86400));
  return `${days}d ago`;
}

export function formatCoordPair(lat: number, lng: number): string {
  return `${lat.toFixed(3)}°, ${lng.toFixed(3)}°`;
}
