'use client';

import { useRef, useState } from 'react';
import { Upload, X, ImageIcon, Film, AlertCircle } from 'lucide-react';

const MAX_ARCHIVOS  = 4;
const MAX_IMG_MB    = 10;
const MAX_VIDEO_MB  = 50;

const FORMATOS_IMAGEN = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
const FORMATOS_VIDEO  = ['video/mp4', 'video/quicktime', 'video/avi', 'video/x-msvideo', 'video/mov', 'video/webm'];

export interface ArchivoEvidencia {
  id: string;
  file: File;
  preview: string;
  nombre: string;
  esVideo: boolean;
}

interface Props {
  archivos: ArchivoEvidencia[];
  onChange: (archivos: ArchivoEvidencia[]) => void;
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function generarPreview(file: File, esVideo: boolean): Promise<string> {
  if (esVideo) {
    return URL.createObjectURL(file);
  }
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const img    = new Image();
    const url    = URL.createObjectURL(file);
    img.onload = () => {
      const max = 400;
      const ratio = Math.min(max / img.width, max / img.height);
      canvas.width  = img.width  * ratio;
      canvas.height = img.height * ratio;
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(''); };
    img.src = url;
  });
}

export default function EvidenciasUploader({ archivos, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  async function handleFiles(files: FileList) {
    setError('');
    const nuevos: ArchivoEvidencia[] = [];

    for (const file of Array.from(files)) {
      if (archivos.length + nuevos.length >= MAX_ARCHIVOS) {
        setError(`Máximo ${MAX_ARCHIVOS} archivos en total.`);
        break;
      }

      const tipo    = file.type || '';
      const esImg   = FORMATOS_IMAGEN.some(f => tipo.startsWith(f) || file.name.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i));
      const esVideo = FORMATOS_VIDEO.some(f => tipo.startsWith(f)  || file.name.match(/\.(mp4|mov|avi|webm|wmv)$/i));

      if (!esImg && !esVideo) {
        setError(`"${file.name}" no es un formato válido.`);
        continue;
      }

      const maxMB = esVideo ? MAX_VIDEO_MB : MAX_IMG_MB;
      if (file.size > maxMB * 1024 * 1024) {
        setError(`"${file.name}" supera el límite de ${maxMB} MB.`);
        continue;
      }

      nuevos.push({
        id:      crypto.randomUUID(),
        file,
        preview: '',
        nombre:  file.name,
        esVideo,
      });
    }

    if (nuevos.length === 0) return;
    setLoading(true);
    const conPreview = await Promise.all(
      nuevos.map(async (a) => ({ ...a, preview: await generarPreview(a.file, a.esVideo) }))
    );
    setLoading(false);
    onChange([...archivos, ...conPreview]);
  }

  function eliminar(id: string) {
    const archivo = archivos.find(a => a.id === id);
    if (archivo?.esVideo && archivo.preview.startsWith('blob:')) URL.revokeObjectURL(archivo.preview);
    onChange(archivos.filter(a => a.id !== id));
    setError('');
  }

  return (
    <div className="space-y-3">
      {/* Zona de drop / botón */}
      <div
        className="border-2 border-dashed border-gray-200 rounded-lg p-5 text-center cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/gif,image/webp,image/bmp,video/mp4,video/quicktime,video/avi,video/webm"
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        <Upload className="h-7 w-7 mx-auto text-gray-300 mb-2" />
        <p className="text-sm text-gray-500 font-medium">
          Haz clic o arrastra archivos aquí
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Imágenes (JPG, PNG, WEBP · máx {MAX_IMG_MB}MB) · Videos (MP4, MOV · máx {MAX_VIDEO_MB}MB)
        </p>
        <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
          <span className={archivos.length >= MAX_ARCHIVOS ? 'text-orange-500 font-medium' : ''}>
            {archivos.length}/{MAX_ARCHIVOS} archivos
          </span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <p className="text-xs text-gray-400 flex items-center gap-2">
          <span className="animate-spin h-3 w-3 border-2 border-green-500 border-t-transparent rounded-full" />
          Procesando archivos...
        </p>
      )}

      {/* Previews */}
      {archivos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {archivos.map((a) => (
            <div key={a.id} className="relative group border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
              {/* Thumbnail */}
              <div className="aspect-square flex items-center justify-center bg-gray-100 overflow-hidden">
                {a.esVideo ? (
                  <video src={a.preview} className="w-full h-full object-cover" muted />
                ) : a.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.preview} alt={a.nombre} className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="h-8 w-8 text-gray-300" />
                )}
              </div>

              {/* Badge tipo */}
              <div className="absolute top-1.5 left-1.5">
                {a.esVideo
                  ? <span className="flex items-center gap-0.5 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded"><Film className="h-2.5 w-2.5" /> VIDEO</span>
                  : <span className="flex items-center gap-0.5 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded"><ImageIcon className="h-2.5 w-2.5" /> FOTO</span>
                }
              </div>

              {/* Botón eliminar */}
              <button
                type="button"
                onClick={() => eliminar(a.id)}
                className="absolute top-1.5 right-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>

              {/* Nombre y tamaño */}
              <div className="p-1.5">
                <p className="text-[10px] text-gray-600 truncate font-medium" title={a.nombre}>{a.nombre}</p>
                <p className="text-[10px] text-gray-400">{formatBytes(a.file.size)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
