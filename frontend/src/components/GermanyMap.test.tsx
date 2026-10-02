import type { LatLngTuple } from 'leaflet';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GermanyMap, GERMANY_BOUNDS, GERMANY_CENTER } from './GermanyMap';

function isInside([lat, lng]: LatLngTuple) {
  const [[south, west], [north, east]] = GERMANY_BOUNDS;
  return lat >= south && lat <= north && lng >= west && lng <= east;
}

describe('GermanyMap', () => {
  it('covers all of Germany', () => {
    const extremes: Record<string, LatLngTuple> = {
      'List auf Sylt': [55.05, 8.42], // north
      Oberstdorf: [47.27, 10.18], // south
      Isenbruch: [51.05, 5.87], // west
      Görlitz: [51.15, 14.99], // east
    };
    Object.values(extremes).forEach((point) => expect(isInside(point)).toBe(true));
    expect(isInside(GERMANY_CENTER)).toBe(true);
  });

  it('renders an OpenStreetMap based map with attribution', () => {
    const { container } = render(<GermanyMap />);

    expect(screen.getByRole('region', { name: /karte von deutschland/i })).toBeInTheDocument();
    expect(container.querySelector('.leaflet-container')).not.toBeNull();
    expect(screen.getByText(/openstreetmap/i)).toBeInTheDocument();
  });

  it('credits Leaflet without the default flag icon', () => {
    const { container } = render(<GermanyMap />);

    const attribution = container.querySelector('.leaflet-control-attribution');
    expect(attribution).toHaveTextContent(/Leaflet/);
    expect(attribution?.querySelector('svg')).toBeNull();
  });
});
