'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CatalogoTable from '@/components/catalogos/CatalogoTable';
import {
  useUnidades, useTipoCasos, useSubTipoCasos, useJurisdicciones,
  useMedios, useOperadores, useEstadoIncidencias, useSeveridades,
  useCargoSerenos, useTipoReportantes, useEstadoProcesos,
  useGeneroAgresor, useGeneroVictima, useCatalogoMutations,
} from '@/hooks/useCatalogos';

type CatalogDef = {
  value: string;
  label: string;
  key: Parameters<typeof useCatalogoMutations>[0];
  useData: () => ReturnType<typeof useUnidades>;
};

const catalogs: CatalogDef[] = [
  { value: 'unidades', label: 'Unidades', key: 'unidades', useData: useUnidades },
  { value: 'tipo-casos', label: 'Tipos de Caso', key: 'tipo-casos', useData: useTipoCasos },
  { value: 'subtipo-casos', label: 'Subtipos', key: 'subtipo-casos', useData: useSubTipoCasos },
  { value: 'jurisdicciones', label: 'Jurisdicciones', key: 'jurisdicciones', useData: useJurisdicciones },
  { value: 'medios', label: 'Medios', key: 'medios', useData: useMedios },
  { value: 'operadores', label: 'Operadores', key: 'operadores', useData: useOperadores },
  { value: 'estado-incidencias', label: 'Estados Inc.', key: 'estado-incidencias', useData: useEstadoIncidencias },
  { value: 'severidades', label: 'Severidades', key: 'severidades', useData: useSeveridades },
  { value: 'cargo-serenos', label: 'Cargos Serenos', key: 'cargo-serenos', useData: useCargoSerenos },
  { value: 'tipo-reportantes', label: 'Tipo Reportantes', key: 'tipo-reportantes', useData: useTipoReportantes },
  { value: 'estado-procesos', label: 'Estado Procesos', key: 'estado-procesos', useData: useEstadoProcesos },
  { value: 'genero-agresor', label: 'Género Agresor', key: 'genero-agresor', useData: useGeneroAgresor },
  { value: 'genero-victima', label: 'Género Víctima', key: 'genero-victima', useData: useGeneroVictima },
];

function CatalogoTabContent({ cat }: { cat: CatalogDef }) {
  const { data = [], isLoading } = cat.useData();
  const { create, update, remove } = useCatalogoMutations(cat.key);
  return (
    <CatalogoTable
      items={data}
      isLoading={isLoading}
      onCreate={(d) => create.mutateAsync(d)}
      onUpdate={(d) => update.mutateAsync(d)}
      onDelete={(id) => remove.mutateAsync(id)}
    />
  );
}

export default function CatalogosPage() {
  return (
    <div>
      <Tabs defaultValue="unidades" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-gray-100 p-1 mb-4">
          {catalogs.map((cat) => (
            <TabsTrigger key={cat.value} value={cat.value} className="text-xs data-[state=active]:bg-green-600 data-[state=active]:text-white">
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {catalogs.map((cat) => (
          <TabsContent key={cat.value} value={cat.value}>
            <CatalogoTabContent cat={cat} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
