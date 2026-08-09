import { areaCellKey, type AreaLabelMap, type AreaPoint } from "@/lib/area-cell";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type NominatimAddress = {
  neighbourhood?: string;
  suburb?: string;
  quarter?: string;
  city_district?: string;
  district?: string;
  village?: string;
  town?: string;
  city?: string;
  municipality?: string;
  county?: string;
  state?: string;
  road?: string;
  pedestrian?: string;
};

type NominatimResponse = {
  name?: string;
  display_name?: string;
  address?: NominatimAddress;
};

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function formatAreaName(payload: NominatimResponse): string {
  const address = payload.address ?? {};
  const locality =
    address.neighbourhood ||
    address.suburb ||
    address.quarter ||
    address.city_district ||
    address.district ||
    address.village ||
    address.town ||
    address.city ||
    address.municipality;

  const road = address.road || address.pedestrian;

  if (road && locality && road !== locality) {
    return `${road}, ${locality}`;
  }
  if (locality) {
    return locality;
  }
  if (road) {
    return road;
  }
  if (payload.name) {
    return payload.name;
  }
  if (address.county || address.state) {
    return [address.county, address.state].filter(Boolean).join(", ");
  }
  if (payload.display_name) {
    return payload.display_name.split(",").slice(0, 2).join(",").trim();
  }
  return "Nearby";
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("zoom", "17");
  url.searchParams.set("addressdetails", "1");

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "BruitNoiseMap/0.1 (area label cache; local community app)",
    },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`Nominatim ${response.status}`);
  }

  const payload = (await response.json()) as NominatimResponse;
  return formatAreaName(payload);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function resolveAndCacheAreaLabels(
  points: AreaPoint[],
): Promise<AreaLabelMap> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return {};
  }

  const unique = new Map<string, AreaPoint>();
  for (const point of points) {
    if (
      !Number.isFinite(point.lat) ||
      !Number.isFinite(point.lng) ||
      point.lat < -90 ||
      point.lat > 90 ||
      point.lng < -180 ||
      point.lng > 180
    ) {
      continue;
    }
    const key = areaCellKey(point.lat, point.lng);
    if (!unique.has(key)) {
      unique.set(key, point);
    }
  }

  if (unique.size === 0) {
    return {};
  }

  const cellKeys = [...unique.keys()];
  const { data: existing, error: readError } = await supabase
    .from("area_labels")
    .select("cell_key, name")
    .in("cell_key", cellKeys);

  if (readError) {
    console.error(readError);
  }

  const labels: AreaLabelMap = {};
  for (const row of existing ?? []) {
    labels[row.cell_key] = row.name;
  }

  const missing = cellKeys.filter((key) => !labels[key]);
  for (const [index, cellKey] of missing.entries()) {
    const point = unique.get(cellKey);
    if (!point) {
      continue;
    }

    // Nominatim usage policy: max 1 request / second.
    if (index > 0) {
      await sleep(1100);
    }

    try {
      const name = await reverseGeocode(point.lat, point.lng);
      const { error: insertError } = await supabase.from("area_labels").insert({
        cell_key: cellKey,
        lat: point.lat,
        lng: point.lng,
        name,
        source: "nominatim",
      });

      if (insertError && insertError.code !== "23505") {
        console.error(insertError);
      }

      labels[cellKey] = name;
    } catch (err) {
      console.error("reverse geocode failed", cellKey, err);
    }
  }

  return labels;
}
