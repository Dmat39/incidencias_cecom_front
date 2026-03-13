'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polygon, Tooltip, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const DEFAULT_LAT = -11.9699;
const DEFAULT_LNG = -76.998;

interface JurisdiccionFeature {
  type: string;
  properties: {
    id: string;
    name: string;
    color: string;
  };
  geometry: {
    type: string;
    coordinates: number[][][];
  };
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=es`,
      { headers: { 'Accept-Language': 'es' } }
    );
    if (!res.ok) return '';
    const json = await res.json();
    const a = json.address ?? {};
    const parts: string[] = [];
    const road = a.road ?? a.pedestrian ?? a.footway ?? a.path ?? '';
    if (road) parts.push(road);
    if (a.house_number) parts.push(a.house_number);
    const area = a.suburb ?? a.neighbourhood ?? a.quarter ?? a.city_district ?? '';
    if (area) parts.push(area);
    const city = a.city ?? a.town ?? a.village ?? a.municipality ?? '';
    if (city && city !== area) parts.push(city);
    return parts.join(', ') || json.display_name || '';
  } catch {
    return '';
  }
}

interface ClickHandlerProps {
  onSelect: (lat: number, lng: number, address: string) => void;
  onLoading: (loading: boolean) => void;
}

function ClickHandler({ onSelect, onLoading }: ClickHandlerProps) {
  useMapEvents({
    async click(e) {
      const { lat, lng } = e.latlng;
      onLoading(true);
      const address = await reverseGeocode(lat, lng);
      onLoading(false);
      onSelect(lat, lng, address);
    },
  });
  return null;
}

interface Props {
  lat?: number;
  lng?: number;
  onSelect: (lat: number, lng: number, address: string) => void;
  onLoading?: (loading: boolean) => void;
  activeJurisdiccionName?: string;
}

export default function MapPicker({ lat, lng, onSelect, onLoading, activeJurisdiccionName }: Props) {
  const [jurisdicciones, setJurisdicciones] = useState<JurisdiccionFeature[]>([]);

  useEffect(() => {
    fetch('/juridiccion.geojson')
      .then((r) => r.json())
      .then((data) => setJurisdicciones(data?.features ?? []))
      .catch(() => {});
  }, []);

  return (
    <MapContainer
      center={[lat ?? DEFAULT_LAT, lng ?? DEFAULT_LNG]}
      zoom={14}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Polígonos de jurisdicciones */}
      {jurisdicciones.map((j) => {
        const name  = j.properties?.name ?? '';
        const color = (j.properties?.color ?? '#3b82f6').trim();
        const isActive = activeJurisdiccionName?.toLowerCase().trim() === name.toLowerCase().trim();
        // GeoJSON coords son [lng, lat], Leaflet usa [lat, lng]
        const positions = j.geometry.coordinates[0].map(
          ([lngC, latC]) => [latC, lngC] as [number, number]
        );
        return (
          <Polygon
            key={j.properties?.id ?? name}
            positions={positions}
            pathOptions={{
              color,
              weight: isActive ? 3 : 1.5,
              fillColor: color,
              fillOpacity: isActive ? 0.25 : 0.08,
              opacity: isActive ? 1 : 0.6,
            }}
          >
            <Tooltip direction="center" offset={[0, 0]} opacity={0.9}>{name}</Tooltip>
          </Polygon>
        );
      })}

      <ClickHandler onSelect={onSelect} onLoading={onLoading ?? (() => {})} />
      {lat && lng && <Marker position={[lat, lng]} />}
    </MapContainer>
  );
}
