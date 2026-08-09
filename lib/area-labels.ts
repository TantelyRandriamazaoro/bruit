import { areaCellKey, type AreaLabelMap, type AreaPoint } from "@/lib/area-cell";
import { getSupabase } from "@/lib/supabase/client";

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
  return payload.labels ?? {};
}

export async function loadAreaLabelsForPoints(
  points: AreaPoint[],
): Promise<AreaLabelMap> {
  const cellKeys = points.map((point) => areaCellKey(point.lat, point.lng));
  const cached = await fetchCachedAreaLabels(cellKeys);
  const missingPoints = points.filter(
    (point) => !cached[areaCellKey(point.lat, point.lng)],
  );

  if (missingPoints.length === 0) {
    return cached;
  }

  const resolved = await resolveAreaLabels(missingPoints);
  return { ...cached, ...resolved };
}
