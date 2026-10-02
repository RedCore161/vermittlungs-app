import { describe, expect, it } from 'vitest';
import { resolveMapConfig } from './config';

describe('resolveMapConfig', () => {
  it('defaults to the public OpenStreetMap tile server', () => {
    const config = resolveMapConfig({});

    expect(config.tileUrl).toBe('https://tile.openstreetmap.org/{z}/{x}/{y}.png');
    expect(config.attribution).toMatch(/OpenStreetMap/);
  });

  it('accepts a custom tile server from the environment', () => {
    const config = resolveMapConfig({
      VITE_MAP_TILE_URL: 'https://tiles.example.com/{z}/{x}/{y}.png',
      VITE_MAP_ATTRIBUTION: '&copy; Example',
    });

    expect(config.tileUrl).toBe('https://tiles.example.com/{z}/{x}/{y}.png');
    expect(config.attribution).toBe('&copy; Example');
  });

  it('ignores empty values', () => {
    const config = resolveMapConfig({ VITE_MAP_TILE_URL: '  ', VITE_MAP_ATTRIBUTION: '' });

    expect(config.tileUrl).toBe('https://tile.openstreetmap.org/{z}/{x}/{y}.png');
  });
});
