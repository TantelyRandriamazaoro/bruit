/** ~130m cells — aligns with nearby report clustering. */
export const AREA_CELL_DEG = 0.0012;

export function areaCellKey(lat: number, lng: number): string {
  const latCell = Math.round(lat / AREA_CELL_DEG);
  const cosLat = Math.max(0.2, Math.abs(Math.cos((lat * Math.PI) / 180)));
  const lngCell = Math.round(lng / (AREA_CELL_DEG / cosLat));
  return `${latCell}:${lngCell}`;
}

export type AreaPoint = {
  lat: number;
  lng: number;
};

export type AreaLabelMap = Record<string, string>;
