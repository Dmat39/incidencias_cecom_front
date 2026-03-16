'use client';

import { useEffect, useState } from 'react';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import apiSvi from '@/lib/apiSvi';

const VIDEO_EXTS = ['.mp4', '.webm', '.ogg', '.avi', '.mov', '.wmv', '.flv', '.mkv'];
const HEIC_EXTS  = ['.heic', '.heif'];

const isVideo = (p: string) => VIDEO_EXTS.some((e) => p.toLowerCase().includes(e));
const isHeic  = (p: string) => HEIC_EXTS.some((e)  => p.toLowerCase().includes(e));

async function convertHeic(blob: Blob): Promise<Blob> {
  try {
    const heic2any = (await import('heic2any')).default;
    const result = await heic2any({ blob, toType: 'image/jpeg', quality: 0.8 });
    return Array.isArray(result) ? result[0] : result;
  } catch {
    return blob;
  }
}

interface Props {
  images: string[];
}

export default function SviMediaSwiper({ images }: Props) {
  const [blobUrls, setBlobUrls]     = useState<Record<string, string | null>>({});
  const [loading, setLoading]       = useState(true);
  const [progress, setProgress]     = useState(0);
  const [current, setCurrent]       = useState(0);
  const [fullscreen, setFullscreen] = useState<string | null>(null);

  useEffect(() => {
    if (!images || images.length === 0) { setLoading(false); return; }

    let active = true;
    setLoading(true);
    setProgress(0);
    setCurrent(0);

    const prevUrls: Record<string, string | null> = {};

    (async () => {
      let done = 0;
      const entries = await Promise.all(
        images.map(async (path) => {
          try {
            const filename = path.replace('preincidencias/fotos/', '');
            const res = await apiSvi.get(`/incidencias/fotos/${filename}`, {
              responseType: 'blob',
            });
            let blob: Blob = res.data;
            if (isHeic(path)) blob = await convertHeic(blob);
            const url = URL.createObjectURL(blob);
            done++;
            if (active) setProgress((done / images.length) * 100);
            return [path, url] as [string, string];
          } catch {
            done++;
            if (active) setProgress((done / images.length) * 100);
            return [path, null] as [string, null];
          }
        }),
      );
      if (!active) return;
      const map = Object.fromEntries(entries);
      Object.assign(prevUrls, map);
      setBlobUrls(map);
      setLoading(false);
    })();

    return () => {
      active = false;
      Object.values(prevUrls).forEach((u) => u && URL.revokeObjectURL(u));
    };
  }, [images]);

  if (!images || images.length === 0) return null;

  const total = images.length;
  const url   = blobUrls[images[current]];

  return (
    <>
      <div className="h-[380px] relative rounded-lg bg-gray-100 overflow-hidden select-none">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-slate-600" />
            <p className="text-sm text-gray-600 font-medium">Cargando imágenes...</p>
            <div className="w-56 bg-gray-200 rounded-full h-2">
              <div
                className="bg-slate-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-400">{Math.round(progress)}% completado</p>
          </div>
        ) : (
          <>
            {/* Slide */}
            <div
              className="w-full h-full cursor-pointer"
              onClick={() => url && setFullscreen(url)}
            >
              {isVideo(images[current]) ? (
                <video
                  src={url ?? ''}
                  className="w-full h-full object-contain"
                  preload="metadata"
                  controls
                />
              ) : url ? (
                <img
                  src={url}
                  alt={`imagen-${current + 1}`}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                  No se pudo cargar la imagen
                </div>
              )}
            </div>

            {/* Navegacisón */}
            {total > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); setCurrent((i) => Math.max(0, i - 1)); }}
                  disabled={current === 0}
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-black/40 hover:bg-black/60 disabled:opacity-20 text-white rounded-full p-1 transition-all"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setCurrent((i) => Math.min(total - 1, i + 1)); }}
                  disabled={current === total - 1}
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-black/40 hover:bg-black/60 disabled:opacity-20 text-white rounded-full p-1 transition-all"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>

                {/* Indicador */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      onClick={(e) => { e.stopPropagation(); setCurrent(i); }}
                      className={`w-2 h-2 rounded-full transition-all ${i === current ? 'bg-white scale-125' : 'bg-white/50 hover:bg-white/75'}`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Fullscreen viewer */}
      {fullscreen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setFullscreen(null)}
        >
          <img src={fullscreen} alt="fullscreen" className="max-h-screen max-w-screen object-contain" />
          <button
            className="absolute top-4 right-4 text-white text-2xl font-bold hover:text-gray-300"
            onClick={() => setFullscreen(null)}
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}
