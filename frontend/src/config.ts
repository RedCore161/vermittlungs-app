export interface MapConfig {
  tileUrl: string;
  attribution: string;
}

const DEFAULT_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const DEFAULT_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-Mitwirkende';

/** Builds the map configuration from (build-time) environment variables. */
export function resolveMapConfig(env: Record<string, string | undefined>): MapConfig {
  return {
    tileUrl: env.VITE_MAP_TILE_URL?.trim() || DEFAULT_TILE_URL,
    attribution: env.VITE_MAP_ATTRIBUTION?.trim() || DEFAULT_ATTRIBUTION,
  };
}

export const mapConfig = resolveMapConfig(import.meta.env);
