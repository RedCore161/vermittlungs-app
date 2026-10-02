import type { LatLngBoundsExpression, LatLngTuple } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { AttributionControl, MapContainer, TileLayer } from 'react-leaflet';
import { mapConfig } from '../config';

/** Geographic centre of Germany (near Niederdorla, Thuringia). */
export const GERMANY_CENTER: LatLngTuple = [51.1657, 10.4515];

/** South-west / north-east corners enclosing Germany with a small margin. */
export const GERMANY_BOUNDS: [LatLngTuple, LatLngTuple] = [
  [47.0, 5.5],
  [55.3, 15.5],
];

/** Panning is limited to a slightly larger area so the edges stay reachable. */
const MAX_BOUNDS: LatLngBoundsExpression = [
  [45.5, 2.0],
  [57.0, 19.0],
];

/** Leaflet credit without the flag icon Leaflet adds to its default prefix. */
const ATTRIBUTION_PREFIX = '<a href="https://leafletjs.com" title="A JavaScript library for interactive maps">Leaflet</a>';

interface GermanyMapProps {
  className?: string;
}

export function GermanyMap({ className }: GermanyMapProps) {
  return (
    <section className={['germany-map', className].filter(Boolean).join(' ')} aria-label="Karte von Deutschland">
      <MapContainer
        bounds={GERMANY_BOUNDS}
        maxBounds={MAX_BOUNDS}
        maxBoundsViscosity={0.8}
        minZoom={5}
        maxZoom={18}
        scrollWheelZoom
        attributionControl={false}
      >
        <AttributionControl prefix={ATTRIBUTION_PREFIX} />
        <TileLayer url={mapConfig.tileUrl} attribution={mapConfig.attribution} />
      </MapContainer>
    </section>
  );
}
