/**
 * Madagascar faritra (region) lookup via nearest district centroid.
 * Districts from openadmindata.org (CC-BY-4.0).
 */

export type RegionAnchor = {
  lat: number;
  lng: number;
  region: string;
};

export const REGION_ANCHORS: readonly RegionAnchor[] = [
  { lat: -19.502, lng: 48.122, region: "Alaotra-Mangoro" },
  { lat: -18.729, lng: 48.305, region: "Alaotra-Mangoro" },
  { lat: -17.866, lng: 48.374, region: "Alaotra-Mangoro" },
  { lat: -17.461, lng: 48.415, region: "Alaotra-Mangoro" },
  { lat: -16.737, lng: 48.316, region: "Alaotra-Mangoro" },
  { lat: -20.748, lng: 47.013, region: "Amoron'i Mania" },
  { lat: -20.561, lng: 47.323, region: "Amoron'i Mania" },
  { lat: -20.456, lng: 46.392, region: "Amoron'i Mania" },
  { lat: -20.289, lng: 47.446, region: "Amoron'i Mania" },
  { lat: -19.337, lng: 47.731, region: "Analamanga" },
  { lat: -19.01, lng: 47.52, region: "Analamanga" },
  { lat: -18.933, lng: 47.515, region: "Analamanga" },
  { lat: -18.933, lng: 47.551, region: "Analamanga" },
  { lat: -18.918, lng: 47.625, region: "Analamanga" },
  { lat: -18.904, lng: 47.512, region: "Analamanga" },
  { lat: -18.895, lng: 47.529, region: "Analamanga" },
  { lat: -18.882, lng: 47.54, region: "Analamanga" },
  { lat: -18.868, lng: 47.493, region: "Analamanga" },
  { lat: -18.821, lng: 47.772, region: "Analamanga" },
  { lat: -18.676, lng: 47.417, region: "Analamanga" },
  { lat: -18.235, lng: 47.004, region: "Analamanga" },
  { lat: -18.198, lng: 47.724, region: "Analamanga" },
  { lat: -17.472, lng: 49.006, region: "Analanjirofo" },
  { lat: -17.25, lng: 49.153, region: "Analanjirofo" },
  { lat: -16.911, lng: 49.911, region: "Analanjirofo" },
  { lat: -16.67, lng: 49.328, region: "Analanjirofo" },
  { lat: -16.235, lng: 49.499, region: "Analanjirofo" },
  { lat: -15.369, lng: 49.534, region: "Analanjirofo" },
  { lat: -25.344, lng: 45.472, region: "Androy" },
  { lat: -25.05, lng: 44.938, region: "Androy" },
  { lat: -24.799, lng: 45.796, region: "Androy" },
  { lat: -24.27, lng: 45.444, region: "Androy" },
  { lat: -24.588, lng: 46.948, region: "Anosy" },
  { lat: -24.509, lng: 46.357, region: "Anosy" },
  { lat: -23.412, lng: 45.85, region: "Anosy" },
  { lat: -24.59, lng: 44.422, region: "Atsimo-Andrefana" },
  { lat: -23.693, lng: 44.534, region: "Atsimo-Andrefana" },
  { lat: -23.452, lng: 45.065, region: "Atsimo-Andrefana" },
  { lat: -23.343, lng: 43.659, region: "Atsimo-Andrefana" },
  { lat: -23.281, lng: 43.808, region: "Atsimo-Andrefana" },
  { lat: -22.83, lng: 44.369, region: "Atsimo-Andrefana" },
  { lat: -22.132, lng: 44.7, region: "Atsimo-Andrefana" },
  { lat: -21.873, lng: 43.739, region: "Atsimo-Andrefana" },
  { lat: -21.505, lng: 45.236, region: "Atsimo-Andrefana" },
  { lat: -23.944, lng: 46.81, region: "Atsimo-Atsinanana" },
  { lat: -23.586, lng: 47.43, region: "Atsimo-Atsinanana" },
  { lat: -23.354, lng: 46.978, region: "Atsimo-Atsinanana" },
  { lat: -22.832, lng: 47.652, region: "Atsimo-Atsinanana" },
  { lat: -22.691, lng: 47.308, region: "Atsimo-Atsinanana" },
  { lat: -20.084, lng: 48.019, region: "Atsinanana" },
  { lat: -20.043, lng: 48.505, region: "Atsinanana" },
  { lat: -19.564, lng: 48.461, region: "Atsinanana" },
  { lat: -19.365, lng: 48.771, region: "Atsinanana" },
  { lat: -18.667, lng: 48.883, region: "Atsinanana" },
  { lat: -18.143, lng: 49.398, region: "Atsinanana" },
  { lat: -18.014, lng: 49.089, region: "Atsinanana" },
  { lat: -17.43, lng: 46.027, region: "Betsiboka" },
  { lat: -17.22, lng: 46.843, region: "Betsiboka" },
  { lat: -17.139, lng: 47.646, region: "Betsiboka" },
  { lat: -16.718, lng: 46.558, region: "Boeny" },
  { lat: -16.649, lng: 45.399, region: "Boeny" },
  { lat: -16.229, lng: 46.657, region: "Boeny" },
  { lat: -16.15, lng: 45.933, region: "Boeny" },
  { lat: -15.68, lng: 46.344, region: "Boeny" },
  { lat: -15.594, lng: 46.739, region: "Boeny" },
  { lat: -18.728, lng: 46.021, region: "Bongolava" },
  { lat: -18.242, lng: 46.41, region: "Bongolava" },
  { lat: -13.784, lng: 48.375, region: "Diana" },
  { lat: -13.513, lng: 49.008, region: "Diana" },
  { lat: -13.349, lng: 48.26, region: "Diana" },
  { lat: -12.498, lng: 49.164, region: "Diana" },
  { lat: -12.291, lng: 49.265, region: "Diana" },
  { lat: -21.841, lng: 46.737, region: "Haute Matsiatra" },
  { lat: -21.673, lng: 47.053, region: "Haute Matsiatra" },
  { lat: -21.454, lng: 47.087, region: "Haute Matsiatra" },
  { lat: -21.414, lng: 47.248, region: "Haute Matsiatra" },
  { lat: -21.25, lng: 46.909, region: "Haute Matsiatra" },
  { lat: -21.226, lng: 46.204, region: "Haute Matsiatra" },
  { lat: -21.056, lng: 47.146, region: "Haute Matsiatra" },
  { lat: -23.157, lng: 46.601, region: "Ihorombe" },
  { lat: -22.545, lng: 46.871, region: "Ihorombe" },
  { lat: -22.367, lng: 45.85, region: "Ihorombe" },
  { lat: -19.219, lng: 46.544, region: "Itasy" },
  { lat: -19.045, lng: 47.248, region: "Itasy" },
  { lat: -18.928, lng: 46.805, region: "Itasy" },
  { lat: -18.816, lng: 44.628, region: "Melaky" },
  { lat: -17.912, lng: 45.014, region: "Melaky" },
  { lat: -17.814, lng: 45.505, region: "Melaky" },
  { lat: -17.733, lng: 44.405, region: "Melaky" },
  { lat: -16.857, lng: 44.947, region: "Melaky" },
  { lat: -21.407, lng: 44.152, region: "Menabe" },
  { lat: -20.687, lng: 45.186, region: "Menabe" },
  { lat: -20.514, lng: 44.347, region: "Menabe" },
  { lat: -19.66, lng: 44.791, region: "Menabe" },
  { lat: -19.207, lng: 45.321, region: "Menabe" },
  { lat: -15.259, lng: 50.137, region: "Sava" },
  { lat: -14.613, lng: 49.497, region: "Sava" },
  { lat: -14.245, lng: 49.675, region: "Sava" },
  { lat: -13.453, lng: 49.733, region: "Sava" },
  { lat: -16.182, lng: 47.697, region: "Sofia" },
  { lat: -16.049, lng: 48.704, region: "Sofia" },
  { lat: -15.801, lng: 47.723, region: "Sofia" },
  { lat: -15.151, lng: 48.76, region: "Sofia" },
  { lat: -14.972, lng: 48.077, region: "Sofia" },
  { lat: -14.668, lng: 47.764, region: "Sofia" },
  { lat: -14.561, lng: 48.883, region: "Sofia" },
  { lat: -19.892, lng: 46.626, region: "Vakinankaratra" },
  { lat: -19.882, lng: 47.031, region: "Vakinankaratra" },
  { lat: -19.841, lng: 47.204, region: "Vakinankaratra" },
  { lat: -19.75, lng: 47.533, region: "Vakinankaratra" },
  { lat: -19.727, lng: 46.227, region: "Vakinankaratra" },
  { lat: -19.422, lng: 47.54, region: "Vakinankaratra" },
  { lat: -19.419, lng: 46.893, region: "Vakinankaratra" },
  { lat: -22.341, lng: 47.683, region: "Vatovavy-Fitovinany" },
  { lat: -21.964, lng: 47.899, region: "Vatovavy-Fitovinany" },
  { lat: -21.855, lng: 47.392, region: "Vatovavy-Fitovinany" },
  { lat: -21.236, lng: 48.106, region: "Vatovavy-Fitovinany" },
  { lat: -21.071, lng: 47.611, region: "Vatovavy-Fitovinany" },
  { lat: -20.536, lng: 48.122, region: "Vatovavy-Fitovinany" },
];

/** Sentinel for points outside Madagascar — translate in UI. */
export const UNKNOWN_REGION = "__elsewhere__";

function dist2(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dLat = a.lat - b.lat;
  const dLng = a.lng - b.lng;
  return dLat * dLat + dLng * dLng;
}

/** Nearest-district region for a point in Madagascar. */
export function regionForPoint(point: {
  lat: number;
  lng: number;
}): string {
  if (
    !Number.isFinite(point.lat) ||
    !Number.isFinite(point.lng) ||
    point.lat < -26.2 ||
    point.lat > -11.5 ||
    point.lng < 42.8 ||
    point.lng > 51.0
  ) {
    return UNKNOWN_REGION;
  }

  let best = REGION_ANCHORS[0];
  let bestD = Infinity;
  for (const anchor of REGION_ANCHORS) {
    const d = dist2(point, anchor);
    if (d < bestD) {
      bestD = d;
      best = anchor;
    }
  }
  return best.region;
}

export type RegionGroup<T extends { lat: number; lng: number }> = {
  region: string;
  items: T[];
  isUserRegion: boolean;
};

/**
 * Group items by faritra.
 * User’s region first, then by newest item time (closest group as tie-break
 * when distanceOf is provided). Within a group, newest first.
 */
export function groupByRegion<T extends { lat: number; lng: number }>(
  items: T[],
  userLocation: { lat: number; lng: number } | null,
  newestTime: (item: T) => number,
  distanceOf?: (item: T) => number | null,
): RegionGroup<T>[] {
  const buckets = new Map<string, T[]>();

  for (const item of items) {
    const region = regionForPoint(item);
    const list = buckets.get(region);
    if (list) {
      list.push(item);
    } else {
      buckets.set(region, [item]);
    }
  }

  const userRegion = userLocation ? regionForPoint(userLocation) : null;

  const minDistance = (groupItems: T[]) => {
    if (!distanceOf) {
      return null;
    }
    let best: number | null = null;
    for (const item of groupItems) {
      const d = distanceOf(item);
      if (d == null || !Number.isFinite(d)) {
        continue;
      }
      if (best == null || d < best) {
        best = d;
      }
    }
    return best;
  };

  return [...buckets.entries()]
    .map(([region, groupItems]) => {
      const sortedItems = [...groupItems].sort(
        (a, b) => newestTime(b) - newestTime(a),
      );
      return {
        region,
        items: sortedItems,
        isUserRegion: Boolean(userRegion && region === userRegion),
      };
    })
    .sort((a, b) => {
      if (a.isUserRegion !== b.isUserRegion) {
        return a.isUserRegion ? -1 : 1;
      }
      if (a.region === UNKNOWN_REGION) {
        return 1;
      }
      if (b.region === UNKNOWN_REGION) {
        return -1;
      }
      const aNewest = Math.max(...a.items.map(newestTime));
      const bNewest = Math.max(...b.items.map(newestTime));
      if (bNewest !== aNewest) {
        return bNewest - aNewest;
      }
      const aDist = minDistance(a.items);
      const bDist = minDistance(b.items);
      if (aDist != null && bDist != null && aDist !== bDist) {
        return aDist - bDist;
      }
      if (aDist != null && bDist == null) {
        return -1;
      }
      if (aDist == null && bDist != null) {
        return 1;
      }
      return a.region.localeCompare(b.region);
    });
}

