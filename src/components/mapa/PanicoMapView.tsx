'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { PanicoAlerta } from '@/hooks/usePanicoAlertas';
import { formatDate } from '@/lib/date';

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface MarkerStyle { color: string; pulse: boolean; size: number }

function getMarkerStyle(estado?: string | null): MarkerStyle {
  if (estado === 'RECIBIDA')   return { color: '#ef4444', pulse: true,  size: 16 };
  if (estado === 'ATENDIENDO') return { color: '#f59e0b', pulse: false, size: 14 };
  if (estado === 'FINALIZADA') return { color: '#22c55e', pulse: false, size: 12 };
  if (estado === 'FALSA')      return { color: '#6b7280', pulse: false, size: 10 };
  return { color: '#6b7280', pulse: false, size: 10 };
}

function createMarkerIcon({ color, pulse, size }: MarkerStyle) {
  const ring = pulse
    ? `<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
         width:${size + 12}px;height:${size + 12}px;border-radius:50%;
         border:2px solid ${color};animation:lf-pulse 1.6s ease-out infinite;opacity:0.55;"></div>`
    : '';
  return L.divIcon({
    html: `<style>@keyframes lf-pulse{0%{transform:translate(-50%,-50%) scale(.8);opacity:.8}100%{transform:translate(-50%,-50%) scale(2.2);opacity:0}}</style>
      <div style="position:relative;width:${size}px;height:${size}px;">
        ${ring}
        <div style="position:absolute;top:0;left:0;width:${size}px;height:${size}px;
          border-radius:50%;background:${color};border:2.5px solid white;
          box-shadow:0 2px 6px rgba(0,0,0,.30);"></div>
      </div>`,
    className: '',
    iconSize:   [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor:[0, -(size / 2 + 6)],
  });
}

function SetView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  map.setView(center, zoom);
  return null;
}

interface Props {
  alertas: PanicoAlerta[];
  center?: [number, number];
  zoom?: number;
}

const DEFAULT_CENTER: [number, number] = [-11.9699, -76.998];

const ESTADO_LABEL: Record<string, string> = {
  RECIBIDA:   'Recibida',
  ATENDIENDO: 'En atención',
  FINALIZADA: 'Finalizada',
  FALSA:      'Falsa alarma',
};

export default function PanicoMapView({ alertas, center, zoom = 13 }: Props) {
  return (
    <MapContainer
      center={center || DEFAULT_CENTER}
      zoom={zoom}
      style={{ height: '100%', width: '100%' }}
      minZoom={11}
      maxZoom={18}
      zoomControl={false}
    >
      <ZoomControl position="bottomright" />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {center && <SetView center={center} zoom={zoom} />}

      {alertas.map((alerta) => {
        const lat = alerta.latitud != null ? Number(alerta.latitud) : null;
        const lng = alerta.longitud != null ? Number(alerta.longitud) : null;
        if (!lat || !lng) return null;

        const style = getMarkerStyle(alerta.estadoApp);
        const nombre = alerta.nombreReportante || 'Sin nombre';

        return (
          <Marker key={alerta.id} position={[lat, lng]} icon={createMarkerIcon(style)}>
            <Popup maxWidth={240}>
              <div style={{ fontFamily: 'inherit', fontSize: 13 }}>
                <p style={{ fontWeight: 700, color: '#1f2937', marginBottom: 4 }}>
                  📱 Alerta #{alerta.id}
                </p>
                <p style={{ color: '#374151', fontWeight: 600, marginBottom: 6 }}>
                  {nombre}
                </p>
                {alerta.telefonoReportante && (
                  <p style={{ fontSize: 11, color: '#6b7280', marginBottom: 3 }}>
                    📞 {alerta.telefonoReportante}
                  </p>
                )}
                {alerta.direccion && (
                  <p style={{ fontSize: 11, color: '#6b7280', marginBottom: 3 }}>
                    📍 {alerta.direccion}
                  </p>
                )}
                {alerta.registradoEn && (
                  <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8 }}>
                    {formatDate(alerta.registradoEn, 'dd/MM/yy HH:mm')}
                  </p>
                )}
                <div style={{ marginBottom: alerta.operadorRef ? 6 : 10 }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: 9999,
                    fontSize: 11,
                    fontWeight: 600,
                    background: style.color + '20',
                    color: style.color,
                    border: `1px solid ${style.color}40`,
                  }}>
                    {ESTADO_LABEL[alerta.estadoApp ?? ''] ?? alerta.estadoApp ?? 'Sin estado'}
                  </span>
                </div>
                {alerta.operadorRef && (
                  <p style={{ fontSize: 11, color: '#6b7280', marginBottom: 10 }}>
                    Operador: {alerta.operadorRef}
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
