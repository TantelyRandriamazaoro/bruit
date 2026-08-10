import { areaCellKey, type AreaLabelMap, type AreaPoint } from "@/lib/area-cell";
import { AREA_LABELS_SESSION_KEY } from "@/lib/constants";
import { getSupabase } from "@/lib/supabase/client";

function readSessionAreaLabels(): AreaLabelMap {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.sessionStorage.getItem(AREA_LABELS_SESSION_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    const labels: AreaLabelMap = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string" && value.length > 0) {
        labels[key] = value;
      }
    }
    return labels;
  } catch {
    return {};
  }
}

function rememberSessionAreaLabels(labels: AreaLabelMap): void {
  if (typeof window === "undefined") {
    return;
  }

  const entries = Object.entries(labels).filter(
    ([key, value]) => key.length > 0 && typeof value === "string" && value.length > 0,
  );
  if (entries.length === 0) {
    return;
  }

  try {
    const next = { ...readSessionAreaLabels() };
    for (const [key, value] of entries) {
      next[key] = value;
    }
    window.sessionStorage.setItem(AREA_LABELS_SESSION_KEY, JSON.stringify(next));
  } catch {
    // Ignore quota / private-mode failures; network cache still works.
  }
}

export async function fetchCachedAreaLabels(
  cellKeys: string[],
): Promise<AreaLabelMap> {
  const unique = [...new Set(cellKeys.filter(Boolean))];
  if (unique.length === 0) {
    return {};
  }

  const { data, error } = await getSupabase()
    .from("area_labels")
    .select("cell_key, name")
    .in("cell_key", unique);

  if (error) {
    console.error(error);
    return {};
  }

  const labels: AreaLabelMap = {};
  for (const row of data ?? []) {
    labels[row.cell_key] = row.name;
  }
  return labels;
}

/** Resolve missing cells via the server (Nominatim once → DB cache). */
export async function resolveAreaLabels(
  points: AreaPoint[],
): Promise<AreaLabelMap> {
  if (points.length === 0) {
    return {};
  }

  const response = await fetch("/api/area-labels", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ points }),
  });

  if (!response.ok) {
    console.error("area-labels resolve failed", response.status);
    return {};
  }

  const payload = (await response.json()) as { labels?: AreaLabelMap };
  const labels = payload.labels ?? {};
  rememberSessionAreaLabels(labels);
  return labels;
}

export async function loadAreaLabelsForPoints(
  points: AreaPoint[],
): Promise<AreaLabelMap> {
  const uniquePoints = new Map<string, AreaPoint>();
  for (const point of points) {
    const key = areaCellKey(point.lat, point.lng);
    if (!uniquePoints.has(key)) {
      uniquePoints.set(key, point);
    }
  }

  if (uniquePoints.size === 0) {
    return {};
  }

  const sessionCached = readSessionAreaLabels();
  const labels: AreaLabelMap = {};
  const missingKeys: string[] = [];

  for (const key of uniquePoints.keys()) {
    const cached = sessionCached[key];
    if (cached) {
      labels[key] = cached;
    } else {
      missingKeys.push(key);
    }
  }

  if (missingKeys.length === 0) {
    return labels;
  }

  const fromDb = await fetchCachedAreaLabels(missingKeys);
  Object.assign(labels, fromDb);

  const missingPoints = missingKeys
    .filter((key) => !fromDb[key])
    .map((key) => uniquePoints.get(key)!)
    .filter(Boolean);

  if (missingPoints.length > 0) {
    const resolved = await resolveAreaLabels(missingPoints);
    Object.assign(labels, resolved);
  }

  rememberSessionAreaLabels(labels);
  return labels;
}
