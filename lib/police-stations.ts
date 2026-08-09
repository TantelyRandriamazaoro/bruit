/**
 * Commissariats de police across Madagascar.
 *
 * Locations from OpenStreetMap (amenity=police, name contains Commissariat).
 * Phone numbers from:
 * - French government advisories (diplomatie.gouv.fr / mg.diplomatie.gouv.fr)
 *   for regional commissariats centraux
 * - Published Police Secours directory for Antananarivo arrondissements
 * - OpenStreetMap contact tags when present
 *
 * Verify locally when possible; look up numbers on Google when missing.
 */

export type PoliceStation = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  /** Display phone when known; null means suggest searching Google */
  phone: string | null;
};

export const POLICE_STATIONS: PoliceStation[] = [
  { id: "osm-n1300009976", name: "Commissariat Central Ampasambazaha", lat: -21.448282, lng: 47.087699, phone: "+261 20 75 943 75" },
  { id: "osm-n5120085522", name: "Commissariat Central Antsiranana", lat: -12.28556, lng: 49.294528, phone: "+261 34 05 998 59" },
  { id: "osm-n4293569071", name: "Commissariat central de police", lat: -18.835393, lng: 47.556093, phone: "+261 34 05 998 11" },
  { id: "osm-n490698699", name: "Commissariat central de Tsaralalàna", lat: -18.907036, lng: 47.519381, phone: "+261 20 22 227 35" },
  { id: "osm-n12498069879", name: "Commissariat Central Mahajanga", lat: -15.725197, lng: 46.305497, phone: "+261 20 62 229 32" },
  { id: "osm-n676825532", name: "Commissariat Central Toamasina", lat: -18.155659, lng: 49.409399, phone: "+261 20 53 320 17" },
  { id: "osm-n12378564129", name: "Commissariat Central Toliara", lat: -23.354388, lng: 43.668804, phone: "+261 34 05 998 78" },
  { id: "osm-n11434505869", name: "Commissariat Central Antsirabe", lat: -19.867432, lng: 47.036591, phone: "+261 20 44 480 33" },
  { id: "osm-n11010163047", name: "Commissariat de la Sécurité", lat: -14.544047, lng: 48.745498, phone: null },
  { id: "osm-n8199631775", name: "Commissariat de la Sécurité Publique Ambato Boeny", lat: -16.472565, lng: 46.714673, phone: null },
  { id: "osm-n8814635175", name: "Commissariat de la Sécurité Publique du District d'Ikongo", lat: -21.877725, lng: 47.434911, phone: null },
  { id: "osm-n664491883", name: "Commissariat de Police", lat: -18.947888, lng: 48.234235, phone: null },
  { id: "osm-n4289479817", name: "Commissariat de police", lat: -16.082654, lng: 47.653385, phone: null },
  { id: "osm-w1284905438", name: "Commissariat de police", lat: -21.429262, lng: 47.106595, phone: null },
  { id: "osm-n1317463778", name: "Commissariat de Police Abattoir Marovato", lat: -15.717487, lng: 46.319998, phone: null },
  { id: "osm-n12285538569", name: "Commissariat de police Alasora", lat: -18.945918, lng: 47.555726, phone: "+261 34 05 531 08" },
  { id: "osm-n1332794107", name: "Commissariat de Police Ambalavao", lat: -21.832611, lng: 46.935583, phone: null },
  { id: "osm-n12364756198", name: "Commissariat de Police Ambanja", lat: -13.676485, lng: 48.452384, phone: null },
  { id: "osm-n12636161856", name: "Commissariat de Police Ambatofinandrahana", lat: -20.551212, lng: 46.804055, phone: null },
  { id: "osm-w1434363617", name: "Commissariat de Police Ambatondrazaka", lat: -17.82933, lng: 48.425631, phone: null },
  { id: "osm-n717397295", name: "Commissariat de Police Ambilobe", lat: -13.197116, lng: 49.049103, phone: null },
  { id: "osm-n12285467340", name: "Commissariat de police Ambohimena", lat: -19.88694, lng: 47.040007, phone: "+261 20 26 368 78" },
  { id: "osm-n12636340727", name: "Commissariat de Police Ambositra", lat: -20.531669, lng: 47.245698, phone: null },
  { id: "osm-n10743703619", name: "Commissariat de Police Ampanihy", lat: -24.694186, lng: 44.749421, phone: null },
  { id: "osm-n12509745782", name: "Commissariat de Police Analalava", lat: -14.631863, lng: 47.748323, phone: null },
  { id: "osm-n10870354937", name: "Commissariat de Police Andapa", lat: -14.665562, lng: 49.651721, phone: null },
  { id: "osm-n7208404027", name: "Commissariat de Police Antalaha", lat: -14.903074, lng: 50.278992, phone: null },
  { id: "osm-n6702180257", name: "Commissariat de Police Antsalova", lat: -18.674645, lng: 44.623033, phone: null },
  { id: "osm-n2530838767", name: "Commissariat de Police Antsohihy", lat: -14.87709, lng: 47.986022, phone: null },
  { id: "osm-n12318831429", name: "Commissariat de Police Arivonimamo I", lat: -19.00794, lng: 47.180635, phone: null },
  { id: "osm-n12509808114", name: "Commissariat de Police Befandriana Nord", lat: -15.254781, lng: 48.542174, phone: null },
  { id: "osm-w1335700701", name: "Commissariat de police de Ranohira", lat: -22.556492, lng: 45.413433, phone: null },
  { id: "osm-w191071087", name: "Commissariat de Police de Tsiroanomandidy", lat: -18.768227, lng: 46.048074, phone: null },
  { id: "osm-n663135715", name: "Commissariat de Police des 67ha", lat: -18.903965, lng: 47.512036, phone: "+261 20 22 291 29" },
  { id: "osm-n667742342", name: "Commissariat de Police du IIe Arrondissement", lat: -18.915302, lng: 47.531704, phone: "+261 20 22 309 46" },
  { id: "osm-n671874569", name: "Commissariat de police du IIIe arrondissement", lat: -18.902822, lng: 47.52992, phone: "+261 20 22 291 30" },
  { id: "osm-w604941149", name: "Commissariat de Police du VIe Arrondissement / Mahamasina", lat: -18.918293, lng: 47.52407, phone: "+261 20 22 280 48" },
  { id: "osm-w510259348", name: "Commissariat de Police du VIIIe Arrondissement", lat: -18.87055, lng: 47.545609, phone: "+261 20 22 400 12" },
  { id: "osm-n8046896100", name: "Commissariat de Police Fandriana", lat: -20.236476, lng: 47.377583, phone: null },
  { id: "osm-n12635976375", name: "Commissariat de Police Farafangana", lat: -22.821248, lng: 47.835025, phone: null },
  { id: "osm-n12299673021", name: "Commissariat de Police Faratsiho", lat: -19.403001, lng: 46.950435, phone: null },
  { id: "osm-n12509146805", name: "Commissariat de Police Fenerive Est", lat: -17.381752, lng: 49.41399, phone: null },
  { id: "osm-n12607160765", name: "Commissariat de Police Fort-Dauphin", lat: -25.027977, lng: 46.998857, phone: "+261 34 05 529 46" },
  { id: "osm-n6811902908", name: "Commissariat de Police Ifanadiana", lat: -21.303432, lng: 47.636582, phone: null },
  { id: "osm-n1337567270", name: "Commissariat de Police Ihosy", lat: -22.403436, lng: 46.128484, phone: null },
  { id: "osm-n12588011176", name: "Commissariat de Police Maevatanana", lat: -16.947366, lng: 46.830838, phone: null },
  { id: "osm-n12358402684", name: "Commissariat de Police Mahanoro", lat: -19.899442, lng: 48.809161, phone: null },
  { id: "osm-n6670102414", name: "Commissariat de Police Maintirano", lat: -18.060967, lng: 44.024006, phone: null },
  { id: "osm-n6159191276", name: "Commissariat de Police Manakara", lat: -22.143461, lng: 48.011544, phone: null },
  { id: "osm-n12509180912", name: "Commissariat de Police Mananara Avaratra", lat: -16.171243, lng: 49.768852, phone: null },
  { id: "osm-n12656231399", name: "Commissariat de Police Mananjary", lat: -21.236592, lng: 48.346917, phone: null },
  { id: "osm-n12509668490", name: "Commissariat de Police Mandritsara", lat: -15.845194, lng: 48.829164, phone: null },
  { id: "osm-n12509144928", name: "Commissariat de Police Maroantsetra", lat: -15.438695, lng: 49.73901, phone: null },
  { id: "osm-n6612927318", name: "Commissariat de Police Marovoay", lat: -16.11341, lng: 46.637805, phone: null },
  { id: "osm-n3150381468", name: "Commissariat de Police Miandrivazo", lat: -19.523365, lng: 45.45696, phone: null },
  { id: "osm-n12498650004", name: "Commissariat de Police Morafenobe", lat: -17.817605, lng: 44.923453, phone: null },
  { id: "osm-n12607441683", name: "Commissariat de Police Morondava", lat: -20.290414, lng: 44.274363, phone: "+261 34 05 529 94" },
  { id: "osm-n1028762691", name: "Commissariat de Police Nosy Be", lat: -13.406931, lng: 48.276763, phone: null },
  { id: "osm-n12509387764", name: "Commissariat de Police Port Berge", lat: -15.567603, lng: 47.619777, phone: null },
  { id: "osm-n12509134650", name: "Commissariat de Police Sainte Marie", lat: -16.998158, lng: 49.852277, phone: null },
  { id: "osm-n7600320797", name: "Commissariat de Police Sakaraha", lat: -22.913178, lng: 44.53171, phone: null },
  { id: "osm-n1924275753", name: "Commissariat de Police Sambava", lat: -14.259153, lng: 50.160502, phone: "+261 32 03 20 805" },
  { id: "osm-n10976833709", name: "Commissariat de Police Vangaindrano", lat: -23.35046, lng: 47.603883, phone: null },
  { id: "osm-n5501788097", name: "Commissariat de Police Vatomandry", lat: -19.333661, lng: 48.979177, phone: null },
  { id: "osm-n591946476", name: "Commissariat de Police VIe Arrondissement", lat: -18.868593, lng: 47.493041, phone: "+261 20 22 225 52" },
  { id: "osm-n12358978259", name: "Commissariat de Police Vohemar", lat: -13.355073, lng: 50.006858, phone: null },
  { id: "osm-n12656753879", name: "Commissariat de Police Vohipeno", lat: -22.353958, lng: 47.840272, phone: null },
  { id: "osm-n5114377171", name: "Commissariat du 1er Arrondissement", lat: -18.156211, lng: 49.405668, phone: "+261 20 53 320 17" },
];

export function policeStationsToGeoJSON(): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: POLICE_STATIONS.map((station) => ({
      type: "Feature",
      properties: {
        id: station.id,
        name: station.name,
        phone: station.phone,
      },
      geometry: {
        type: "Point",
        coordinates: [station.lng, station.lat],
      },
    })),
  };
}

/** Build a tel: href from a station phone. */
export function policePhoneHref(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("261")) {
    return `tel:+${digits}`;
  }
  if (digits.startsWith("0")) {
    return `tel:+261${digits.slice(1)}`;
  }
  return `tel:+261${digits}`;
}

/** Google search for a commissariat phone number. */
export function policeGoogleSearchHref(
  name: string,
  phoneQuery = "téléphone",
): string {
  const query = `${name} Madagascar ${phoneQuery}`;
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

/** Prefer local 0XX formatting for Madagascar numbers. */
export function formatPolicePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("261") && digits.length >= 12) {
    const rest = digits.slice(3);
    return `0${rest.slice(0, 2)} ${rest.slice(2, 4)} ${rest.slice(4, 7)} ${rest.slice(7)}`;
  }
  return phone;
}

/** Shorter label for list / sheet titles. */
export function shortPoliceStationName(name: string): string {
  let short = name
    .replace(/^Commissariat\s+/iu, "")
    .replace(/^Central(e)?\s+/iu, "")
    .replace(/^de\s+la\s+Sécurité(\s+Publique)?\s+/iu, "")
    .replace(/^de\s+[Pp]olice\s+/iu, "")
    .replace(/^du\s+/iu, "")
    .replace(/^des\s+/iu, "")
    .replace(/^de\s+/iu, "")
    .trim();

  short = short.replace(/^Police\s+(du|des|de)\s+/iu, "");

  return short || name;
}

export type SelectedPoliceStation = {
  id: string;
  name: string;
  phone: string | null;
  lat: number;
  lng: number;
};

const EARTH_RADIUS_KM = 6371;

export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Commissariats within radiusKm of the user, nearest first. */
export const NEARBY_COMMISSARIAT_KM = 40;

export function nearbyPoliceStations(
  origin: { lat: number; lng: number },
  radiusKm = NEARBY_COMMISSARIAT_KM,
): Array<PoliceStation & { distanceKm: number }> {
  return POLICE_STATIONS.map((station) => ({
    ...station,
    distanceKm: distanceKm(origin, station),
  }))
    .filter((station) => station.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
