'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
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

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=es`,
      { headers: { 'Accept-Language': 'es' } }
    );
    if (!res.ok) return '';
    const json = await res.json();
    const a = json.address ?? {};
    // Construir dirección legible: calle número, barrio/distrito
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
}

export default function MapPicker({ lat, lng, onSelect, onLoading }: Props) {
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
      <ClickHandler onSelect={onSelect} onLoading={onLoading ?? (() => {})} />
      {lat && lng && <Marker position={[lat, lng]} />}
    </MapContainer>
  );
}
