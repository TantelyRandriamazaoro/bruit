/** ~130m cells — aligns with nearby report clustering. */
export const AREA_CELL_DEG = 0.0012;
/** ~250m cells — wider live-map activity neighborhoods. */
export const LIVE_AREA_CELL_DEG = 0.0024;

export function areaCellKey(
  lat: number,
  lng: number,
  cellDeg: number = AREA_CELL_DEG,
): string {
  const latCell = Math.round(lat / cellDeg);
  const cosLat = Math.max(0.2, Math.abs(Math.cos((lat * Math.PI) / 180)));
  const lngCell = Math.round(lng / (cellDeg / cosLat));
  return `${latCell}:${lngCell}`;
}

export type AreaPoint = {
  lat: number;
  lng: number;
};

export type AreaLabelMap = Record<string, string>;
