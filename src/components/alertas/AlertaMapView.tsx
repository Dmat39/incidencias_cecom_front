'use client';

import { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

/** Escala lineal según nivel de zoom del mapa */
function zoomScale(zoom: number): number {
  if (zoom >= 17) return 1;
  if (zoom >= 15) return 0.75;
  if (zoom >= 13) return 0.55;
  if (zoom >= 11) return 0.38;
  return 0.25;
}

function makePanicIcon(zoom: number) {
  const s    = zoomScale(zoom);
  const size = Math.max(8, Math.round(24 * s));
  const half = size / 2;
  const ring1 = Math.round(42 * s);
  const ring2 = Math.round(56 * s);
  const svgSz = Math.max(5, Math.round(11 * s));

  return L.divIcon({
    html: `
      <div style="position:relative;width:${size}px;height:${size}px;">
        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
          width:${ring1}px;height:${ring1}px;border-radius:50%;border:2px solid #ef4444;
          animation:panic-pulse 1.4s ease-out infinite;opacity:0.55;"></div>
        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
          width:${ring2}px;height:${ring2}px;border-radius:50%;border:1.5px solid #ef4444;
          animation:panic-pulse 1.4s ease-out infinite 0.4s;opacity:0.3;"></div>
        <div style="
          position:absolute;top:0;left:0;width:${size}px;height:${size}px;border-radius:50%;
          background:linear-gradient(135deg,#f87171,#dc2626);
          border:${Math.max(1, Math.round(3 * s))}px solid white;
          box-shadow:0 3px 10px rgba(220,38,38,.6);
          display:flex;align-items:center;justify-content:center;transition:all .15s;">
          ${size >= 14 ? `
          <svg xmlns='http://www.w3.org/2000/svg' width='${svgSz}' height='${svgSz}' viewBox='0 0 24 24'
            fill='none' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'>
            <path d='M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z'/>
          </svg>` : ''}
        </div>
      </div>
      <style>
        @keyframes panic-pulse {
          0%   { transform:translate(-50%,-50%) scale(.6); opacity:.6; }
          100% { transform:translate(-50%,-50%) scale(2.2); opacity:0; }
        }
      </style>`,
    className: '',
    iconSize:   [size, size],
    iconAnchor: [half, half],
  });
}

function makeCameraIcon(tipo: 'municipal' | 'vecinal', zoom: number) {
  const s      = zoomScale(zoom);
  const pinW   = Math.max(6, Math.round(32 * s));
  const pinH   = Math.max(7, Math.round(38 * s));
  const squSz  = Math.round(32 * s);       // cuadrado del pin (parte circular)
  const svgSz  = Math.max(4, Math.round(13 * s));
  const border = Math.max(1, Math.round(2.5 * s));

  const isMunicipal = tipo === 'municipal';
  const bg     = isMunicipal ? 'linear-gradient(135deg,#60a5fa,#2563eb)' : 'linear-gradient(135deg,#c084fc,#9333ea)';
  const glow   = isMunicipal ? 'rgba(37,99,235,.45)' : 'rgba(147,51,234,.45)';
  const borderC = isMunicipal ? '#93c5fd' : '#d8b4fe';

  const showIcon = pinW >= 14;

  return L.divIcon({
    html: `
      <div style="position:relative;width:${pinW}px;height:${pinH}px;transition:all .15s;">
        <div style="
          position:absolute;top:0;left:0;width:${squSz}px;height:${squSz}px;
          border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          background:${bg};
          border:${border}px solid ${borderC};
          box-shadow:0 4px 12px ${glow};
        "></div>
        ${showIcon ? `
        <div style="
          position:absolute;top:${Math.round(4 * s)}px;left:${Math.round(4 * s)}px;
          width:${Math.round(24 * s)}px;height:${Math.round(24 * s)}px;
          display:flex;align-items:center;justify-content:center;">
          <svg xmlns='http://www.w3.org/2000/svg' width='${svgSz}' height='${svgSz}' viewBox='0 0 24 24'
            fill='none' stroke='white' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'>
            <path d='M15 10l4.553-2.069A1 1 0 0 1 21 8.845v6.31a1 1 0 0 1-1.447.894L15 14M3 8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'/>
          </svg>
        </div>` : ''}
        <div style="
          position:absolute;bottom:0;left:50%;transform:translateX(-50%);
          width:${Math.max(2, Math.round(6 * s))}px;height:${Math.max(2, Math.round(6 * s))}px;
          border-radius:50%;background:${glow};filter:blur(2px);
        "></div>
      </div>`,
    className: '',
    iconSize:   [pinW, pinH],
    iconAnchor: [Math.round(pinW / 2), pinH - 1],
    popupAnchor: [0, -pinH],
  });
}

function ZoomTracker({ onZoom }: { onZoom: (z: number) => void }) {
  useMapEvents({ zoom: (e) => onZoom((e.target as L.Map).getZoom()) });
  return null;
}

export interface CamaraCercana {
  id: string;
  tipo: 'municipal' | 'vecinal';
  nombre?: string;
  direccion?: string;
  tipoCamara?: string;
  marca?: string;
  latitude: number;
  longitude: number;
  distanciaM: number;
}

export interface RadioCercana {
  issi: string;
  unicocodigo?: string;
  estado?: string;
  hexacolor?: string;
  direccion?: string;
  latitud: number;
  longitud: number;
  distancia_metros: number;
}

function isHexRedDominant(hex?: string): boolean {
  if (!hex) return false;
  const h = hex.replace('#', '');
  if (h.length < 6) return false;
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return r > 150 && r > g * 1.5 && r > b * 1.5;
}

function makeRadioIcon(zoom: number, hexacolor?: string) {
  const s      = zoomScale(zoom);
  const pinW   = Math.max(6, Math.round(32 * s));
  const pinH   = Math.max(7, Math.round(38 * s));
  const squSz  = Math.round(32 * s);
  const svgSz  = Math.max(4, Math.round(13 * s));
  const border = Math.max(1, Math.round(2.5 * s));

  const showIcon = pinW >= 14;

  const apagada  = isHexRedDominant(hexacolor);
  const bg       = apagada ? 'linear-gradient(135deg,#f87171,#dc2626)' : 'linear-gradient(135deg,#4ade80,#16a34a)';
  const glow     = apagada ? 'rgba(220,38,38,.45)'                     : 'rgba(22,163,74,.45)';
  const borderC  = apagada ? '#fca5a5'                                  : '#86efac';

  return L.divIcon({
    html: `
      <div style="position:relative;width:${pinW}px;height:${pinH}px;transition:all .15s;">
        <div style="
          position:absolute;top:0;left:0;width:${squSz}px;height:${squSz}px;
          border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          background:${bg};
          border:${border}px solid ${borderC};
          box-shadow:0 4px 12px ${glow};
        "></div>
        ${showIcon ? `
        <div style="
          position:absolute;top:${Math.round(4 * s)}px;left:${Math.round(4 * s)}px;
          width:${Math.round(24 * s)}px;height:${Math.round(24 * s)}px;
          display:flex;align-items:center;justify-content:center;">
          <svg xmlns='http://www.w3.org/2000/svg' width='${svgSz}' height='${svgSz}' viewBox='0 0 24 24'
            fill='none' stroke='white' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'>
            <rect x='7' y='2' width='10' height='20' rx='2'/>
            <line x1='10' y1='2' x2='10' y2='0'/>
            <line x1='14' y1='2' x2='14' y2='0'/>
            <line x1='9' y1='8' x2='15' y2='8'/>
            <line x1='9' y1='10' x2='15' y2='10'/>
            <circle cx='12' cy='16' r='2' fill='white' stroke='none'/>
          </svg>
        </div>` : ''}
        <div style="
          position:absolute;bottom:0;left:50%;transform:translateX(-50%);
          width:${Math.max(2, Math.round(6 * s))}px;height:${Math.max(2, Math.round(6 * s))}px;
          border-radius:50%;background:${glow};filter:blur(2px);
        "></div>
      </div>`,
    className: '',
    iconSize:   [pinW, pinH],
    iconAnchor: [Math.round(pinW / 2), pinH - 1],
    popupAnchor: [0, -pinH],
  });
}

interface Props {
  lat: number;
  lng: number;
  camaras?: CamaraCercana[];
  radios?: RadioCercana[];
}

export default function AlertaMapView({ lat, lng, camaras = [], radios = [] }: Props) {
  const [zoom, setZoom] = useState(17);

  return (
    <MapContainer
      center={[lat, lng]}
      zoom={17}
      style={{ height: '100%', width: '100%' }}
      zoomControl
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ZoomTracker onZoom={setZoom} />

      {/* Marcador de la alerta */}
      <Marker position={[lat, lng]} icon={makePanicIcon(zoom)} />

      {/* Marcadores de radios GPS */}
      {radios.map((radio) => {
        const apagada  = isHexRedDominant(radio.hexacolor);
        const pinColor = apagada ? '#dc2626' : '#16a34a';
        return (
          <Marker
            key={radio.issi}
            position={[radio.latitud, radio.longitud]}
            icon={makeRadioIcon(zoom, radio.hexacolor)}
          >
            <Popup minWidth={200} maxWidth={240}>
              <div style={{ fontFamily: 'system-ui,sans-serif', margin: '-4px -4px' }}>
                <div style={{
                  background: pinColor,
                  padding: '8px 12px',
                  borderRadius: '6px 6px 0 0',
                  display: 'flex', alignItems: 'center', gap: 7,
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                    fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="7" y="2" width="10" height="20" rx="2"/>
                    <line x1="10" y1="2" x2="10" y2="0"/>
                    <line x1="14" y1="2" x2="14" y2="0"/>
                    <line x1="9" y1="8" x2="15" y2="8"/>
                    <line x1="9" y1="10" x2="15" y2="10"/>
                    <circle cx="12" cy="16" r="2" fill="white" stroke="none"/>
                  </svg>
                  <span style={{ color: 'white', fontWeight: 700, fontSize: 13 }}>
                    {radio.unicocodigo ?? radio.issi}
                  </span>
                </div>
                <div style={{ padding: '10px 12px', background: 'white', borderRadius: '0 0 6px 6px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {radio.estado && (
                    <div>
                      <span style={{
                        display: 'inline-block',
                        background: pinColor + '22', color: pinColor,
                        fontSize: 10, fontWeight: 700,
                        padding: '2px 7px', borderRadius: 20,
                        letterSpacing: '0.04em',
                      }}>
                        {radio.estado}
                      </span>
                    </div>
                  )}
                  {/* ISSI */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24"
                      fill="none" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
                    </svg>
                    <span style={{ fontSize: 11, color: '#6b7280' }}>ISSI: <strong style={{ color: '#374151' }}>{radio.issi}</strong></span>
                  </div>
                  {/* Ubicación */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5 }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24"
                      fill="none" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                      style={{ marginTop: 1, flexShrink: 0 }}>
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                    </svg>
                    <span style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.4 }}>
                      {radio.latitud.toFixed(5)}, {radio.longitud.toFixed(5)}
                      {radio.direccion ? <><br /><span style={{ color: '#9ca3af' }}>Rumbo: {radio.direccion}</span></> : null}
                    </span>
                  </div>
                  {/* Distancia */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    background: '#f9fafb', borderRadius: 6, padding: '4px 8px',
                    border: '1px solid #f3f4f6',
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24"
                      fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>
                      A <strong style={{ color: '#dc2626' }}>{radio.distancia_metros} m</strong> de la alerta
                    </span>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* Marcadores de cámaras */}
      {camaras.map((cam) => {
        const isMunicipal = cam.tipo === 'municipal';
        const accentColor = isMunicipal ? '#2563eb' : '#9333ea';
        const badgeBg     = isMunicipal ? '#dbeafe' : '#f3e8ff';
        const badgeColor  = isMunicipal ? '#1d4ed8' : '#7e22ce';
        const label       = isMunicipal ? 'Municipal' : 'Vecinal';
        const detalle     = isMunicipal ? cam.tipoCamara : cam.marca;

        return (
          <Marker
            key={cam.id}
            position={[cam.latitude, cam.longitude]}
            icon={makeCameraIcon(cam.tipo, zoom)}
          >
            <Popup minWidth={200} maxWidth={240}>
              <div style={{ fontFamily: 'system-ui,sans-serif', margin: '-4px -4px' }}>
                {/* Header */}
                <div style={{
                  background: accentColor,
                  padding: '8px 12px',
                  borderRadius: '6px 6px 0 0',
                  display: 'flex', alignItems: 'center', gap: 7,
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                    fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.845v6.31a1 1 0 0 1-1.447.894L15 14M3 8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  </svg>
                  <span style={{ color: 'white', fontWeight: 700, fontSize: 13 }}>
                    {cam.nombre ?? 'Cámara'}
                  </span>
                </div>

                {/* Body */}
                <div style={{ padding: '10px 12px', background: 'white', borderRadius: '0 0 6px 6px' }}>
                  <div style={{ marginBottom: 6 }}>
                    <span style={{
                      display: 'inline-block',
                      background: badgeBg, color: badgeColor,
                      fontSize: 10, fontWeight: 700,
                      padding: '2px 7px', borderRadius: 20,
                      letterSpacing: '0.04em',
                    }}>
                      {label}{detalle ? ` · ${detalle}` : ''}
                    </span>
                  </div>

                  {cam.direccion && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5, marginBottom: 6 }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24"
                        fill="none" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                        style={{ marginTop: 1, flexShrink: 0 }}>
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                        <circle cx="12" cy="10" r="3"/>
                      </svg>
                      <span style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.4 }}>{cam.direccion}</span>
                    </div>
                  )}

                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    background: '#f9fafb', borderRadius: 6, padding: '4px 8px',
                    border: '1px solid #f3f4f6',
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24"
                      fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>
                      A <strong style={{ color: '#dc2626' }}>{cam.distanciaM} m</strong> de la alerta
                    </span>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
