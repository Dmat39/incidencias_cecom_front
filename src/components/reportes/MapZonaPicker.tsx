'use client';

import { useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Polygon, Polyline, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// [lat, lng] for Leaflet internal use
type LatLng = [number, number];

function DrawHandler({ onAdd, closed }: { onAdd: (pt: LatLng) => void; closed: boolean }) {
  useMapEvents({
    click(e) {
      if (closed) return;
      onAdd([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

interface Props {
  /** Called with [lng, lat][] (GeoJSON / turf order) when user confirms */
  onConfirm: (polygon: [number, number][]) => void;
}

export default function MapZonaPicker({ onConfirm }: Props) {
  const [points, setPoints] = useState<LatLng[]>([]);
  const [closed, setClosed] = useState(false);

  const canClose = points.length >= 3;
  const canConfirm = closed;

  const handleAdd = (pt: LatLng) => setPoints((prev) => [...prev, pt]);

  const handleClose = () => {
    if (canClose) setClosed(true);
  };

  const handleUndo = () => {
    if (closed) { setClosed(false); return; }
    setPoints((prev) => prev.slice(0, -1));
  };

  const handleClear = () => { setPoints([]); setClosed(false); };

  const handleConfirm = () => {
    if (!canConfirm) return;
    // Convert [lat, lng] → [lng, lat] for GeoJSON / turf
    onConfirm(points.map(([lat, lng]) => [lng, lat]));
  };

  // Closed polygon = append first point to close visually
  const polygonPositions: LatLng[] = closed && points.length >= 3
    ? [...points, points[0]]
    : points;

  return (
    <div className="flex flex-col gap-3">
      {/* Instructions */}
      <p className="text-xs text-gray-500">
        {closed
          ? `Perímetro cerrado (${points.length} puntos). Confirma para usar esta zona.`
          : points.length < 3
          ? `Haz clic en el mapa para agregar vértices. Mínimo 3 puntos (${points.length}/3).`
          : `${points.length} puntos. Puedes seguir agregando o cerrar el perímetro.`}
      </p>

      {/* Map */}
      <div style={{ height: 420, borderRadius: 8, overflow: 'hidden' }}>
        <MapContainer
          center={[-12.027, -77.007]}
          zoom={16}
          style={{ height: '100%', width: '100%', cursor: closed ? 'default' : 'crosshair' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <DrawHandler onAdd={handleAdd} closed={closed} />

          {/* Vertex markers */}
          {points.map((pt, i) => (
            <CircleMarker
              key={i}
              center={pt}
              radius={i === 0 ? 7 : 5}
              pathOptions={{
                color: i === 0 ? '#dc2626' : '#2563eb',
                fillColor: i === 0 ? '#dc2626' : '#2563eb',
                fillOpacity: 1,
                weight: 2,
              }}
            />
          ))}

          {/* Polygon when closed */}
          {closed && points.length >= 3 && (
            <Polygon
              positions={polygonPositions}
              pathOptions={{ color: '#2563eb', fillColor: '#3b82f6', fillOpacity: 0.2, weight: 2 }}
            />
          )}

          {/* Open polyline while drawing */}
          {!closed && points.length >= 2 && (
            <Polyline
              positions={points}
              pathOptions={{ color: '#2563eb', weight: 2, dashArray: '6 4' }}
            />
          )}
        </MapContainer>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleUndo}
          disabled={points.length === 0}
          className="px-3 py-1.5 text-xs rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-40"
        >
          ↩ Deshacer
        </button>
        <button
          type="button"
          onClick={handleClear}
          disabled={points.length === 0}
          className="px-3 py-1.5 text-xs rounded border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-40"
        >
          Limpiar
        </button>
        <button
          type="button"
          onClick={handleClose}
          disabled={!canClose || closed}
          className="px-3 py-1.5 text-xs rounded border border-blue-400 text-blue-700 hover:bg-blue-50 disabled:opacity-40"
        >
          Cerrar perímetro
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!canConfirm}
          className="px-4 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 font-semibold ml-auto"
        >
          Usar esta zona →
        </button>
      </div>
    </div>
  );
}
