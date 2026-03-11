'use client';

import { Loader2 } from 'lucide-react';

interface SerenoHistorial {
  nombre_reportante: string;
  codigo_incidencias: string[];
}

interface JurisdiccionHistorial {
  jurisdiccion_id: number;
  jurisdiccion: string;
  users: SerenoHistorial[];
}

interface Props {
  tableData: JurisdiccionHistorial[];
  isLoading: boolean;
}

export default function HistorialTabla({ tableData, isLoading }: Props) {
  let countTotal = 0;

  const maxCodigos = tableData.reduce((max, entry) => {
    return Math.max(
      max,
      entry.users.reduce((um, u) => {
        countTotal += u.codigo_incidencias.length;
        return Math.max(um, u.codigo_incidencias.length);
      }, 0),
    );
  }, 0);

  const headers = ['JURISDICCION', 'SERENOS', 'CODIGOS', 'CUENTA'];

  return (
    <div className="overflow-auto flex flex-1">
      <table className="min-w-full bg-white border text-xs whitespace-nowrap h-max">
        <thead>
          <tr>
            <th colSpan={headers.length + maxCodigos - 1} className="py-2 px-2 border uppercase bg-gray-50">
              HISTORIAL INCIDENCIAS
            </th>
          </tr>
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="px-2 py-1 border bg-slate-700 text-white" colSpan={h === 'CODIGOS' ? maxCodigos : 1}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={headers.length} className="py-8 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-slate-600" />
                <p className="text-gray-500">Cargando historial...</p>
              </td>
            </tr>
          ) : !tableData || tableData.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="py-8 text-center text-gray-400">
                No se encontraron incidencias para este turno
              </td>
            </tr>
          ) : (
            <>
              {tableData.map((jur) =>
                jur.users.map((sereno, si) => (
                  <tr key={`${jur.jurisdiccion_id}-${si}`} className="hover:bg-gray-50">
                    {si === 0 && (
                      <td rowSpan={jur.users.length} className="px-2 border text-center font-medium bg-slate-50">
                        {jur.jurisdiccion}
                      </td>
                    )}
                    <td className="px-2 border text-center">{sereno.nombre_reportante}</td>
                    {Array.from({ length: maxCodigos }, (_, idx) => (
                      <td key={idx} className="px-2 border text-center text-gray-600">
                        {sereno.codigo_incidencias[idx] || ''}
                      </td>
                    ))}
                    <td className="px-2 border text-center font-semibold">{sereno.codigo_incidencias.length}</td>
                  </tr>
                )),
              )}
              <tr className="bg-gray-50 font-bold">
                <td className="invisible" colSpan={headers.length + maxCodigos - 2} />
                <td className="px-2 border text-center text-slate-700">{countTotal}</td>
              </tr>
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}
