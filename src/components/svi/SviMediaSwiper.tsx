'use client';

import { useEffect, useMemo, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, A11y } from 'swiper/modules';
import { Loader2 } from 'lucide-react';
import apiSvi from '@/lib/apiSvi';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

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
  const [fullscreen, setFullscreen] = useState<string | null>(null);

  useEffect(() => {
    if (!images || images.length === 0) { setLoading(false); return; }

    let active = true;
    setLoading(true);
    setProgress(0);

    (async () => {
      let done = 0;
      const entries = await Promise.all(
        images.map(async (path) => {
          try {
            // El path viene como "preincidencias/fotos/filename.ext"
            // el endpoint espera solo el filename
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
      setBlobUrls(Object.fromEntries(entries));
      setLoading(false);
    })();

    return () => {
      active = false;
      Object.values(blobUrls).forEach((u) => u && URL.revokeObjectURL(u));
    };
  }, [images]);

  if (!images || images.length === 0) return null;

  return (
    <>
      <div className="h-[380px] relative rounded-lg overflow-hidden bg-gray-100" style={{ minWidth: 0 }}>
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
          <Swiper
            className="h-full w-full"
            modules={[Navigation, Pagination, A11y]}
            spaceBetween={0}
            slidesPerView={1}
            navigation
            pagination={{ clickable: true }}
            observer
            observeParents
            resizeObserver
          >
            {images.map((path, i) => (
              <SwiperSlide key={i}>
                <div
                  className="h-[380px] w-full cursor-pointer"
                  onClick={() => setFullscreen(blobUrls[path] ?? null)}
                >
                  {isVideo(path) ? (
                    <video
                      src={blobUrls[path] ?? ''}
                      className="w-full h-full object-contain"
                      preload="metadata"
                    />
                  ) : blobUrls[path] ? (
                    <img
                      src={blobUrls[path]!}
                      alt={`imagen-${i + 1}`}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                      No se pudo cargar la imagen
                    </div>
                  )}
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
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
