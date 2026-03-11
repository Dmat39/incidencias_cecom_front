'use client';

import { AlertTriangle, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface Stats {
  total: number;
  pendientes: number;
  enAtencion: number;
  atendidas: number;
}

interface Props {
  stats?: Stats;
  isLoading?: boolean;
}

const cards = [
  { key: 'total', label: 'Total', icon: AlertTriangle, color: 'text-blue-600', bg: 'bg-blue-50' },
  { key: 'pendientes', label: 'Pendientes', icon: Clock, color: 'text-red-600', bg: 'bg-red-50' },
  { key: 'enAtencion', label: 'En Atención', icon: XCircle, color: 'text-yellow-600', bg: 'bg-yellow-50' },
  { key: 'atendidas', label: 'Atendidas', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
] as const;

export default function StatsCards({ stats, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}><CardContent className="p-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(({ key, label, icon: Icon, color, bg }) => (
        <Card key={key} className="border border-gray-200 shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className={`p-3 rounded-xl ${bg}`}>
              <Icon className={`h-6 w-6 ${color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{stats?.[key] ?? 0}</p>
              <p className="text-sm text-gray-500">{label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
