// ─── AUTH ─────────────────────────────────────────────────────────────────────

export interface LoginDto {
  username: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UsuarioAuth {
  id: number;
  username: string;
  email: string;
  nombres?: string;
  apellidos?: string;
  roles: string[];
}

export interface AuthState {
  user: UsuarioAuth | null;
  accessToken: string | null;
  refreshToken: string | null;
}

// ─── CATÁLOGOS BASE ───────────────────────────────────────────────────────────

export interface CatalogoBase {
  id: number;
  descripcion?: string;
  habilitado?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Unidad extends CatalogoBase {
  descripcion?: string;
}

export interface TipoCaso extends CatalogoBase {
  codigo?: string;
  unidadId?: number;
  unidad?: Unidad;
}

export interface SubTipoCaso extends CatalogoBase {
  codigo?: string;
  urgencia?: string;
  tipoCasoId?: number;
  tipoCaso?: TipoCaso;
}

export interface TipoReportante extends CatalogoBase {}

export interface Severidad extends CatalogoBase {}

export interface EstadoIncidencia extends CatalogoBase {}

export interface EstadoProceso extends CatalogoBase {}

export interface CargoSereno extends CatalogoBase {}

export interface MedioReporte extends CatalogoBase {
  codigo?: string;
  numeracion?: number;
}

export interface Operador extends CatalogoBase {
  medioId?: number;
  medio?: MedioReporte;
}

export interface Jurisdiccion {
  id: number;
  codigo?: string;
  nombre?: string;
  habilitado?: boolean;
}

export interface GeneroAgresor extends CatalogoBase {}
export interface GeneroVictima extends CatalogoBase {}
export interface SeveridadProceso extends CatalogoBase {}

// ─── SERENO ───────────────────────────────────────────────────────────────────

export interface Sereno {
  id: number;
  dni?: string;
  nombres?: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
  habilitado?: boolean;
  cargoSerenoId?: number;
  cargoSereno?: CargoSereno;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateSerenoDto {
  dni?: string;
  nombres?: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
  habilitado?: boolean;
  cargoSerenoId?: number;
}

// ─── USUARIO ──────────────────────────────────────────────────────────────────

export interface Usuario {
  id: number;
  username?: string;
  email?: string;
  nombres?: string;
  apellidos?: string;
  habilitado?: boolean;
  roles?: { rol: { id: number; nombre: string } }[];
  createdAt?: string;
}

export interface CreateUsuarioDto {
  username: string;
  email: string;
  password: string;
  nombres?: string;
  apellidos?: string;
  roles?: string[];
}

// ─── EVIDENCIA ────────────────────────────────────────────────────────────────

export interface Evidencia {
  id: number;
  nombreArchivo?: string;
  rutaArchivo?: string;
  fechaHoraRegistro?: string;
  incidenciaId: number;
  usuarioId?: number;
}

// ─── INCIDENCIA ───────────────────────────────────────────────────────────────

export interface Incidencia {
  id: number;
  codigoIncidencia?: string;
  // Clasificación
  unidadId?: number;
  unidad?: Unidad;
  tipoCasoId?: number;
  tipoCaso?: TipoCaso;
  subTipoCasoId?: number;
  subTipoCaso?: SubTipoCaso;
  // Reportante
  tipoReportanteId?: number;
  tipoReportante?: TipoReportante;
  nombreReportante?: string;
  telefonoReportante?: string;
  // Ubicación
  direccion?: string;
  latitud?: number | string;
  longitud?: number | string;
  // Descripción
  descripcion?: string;
  // Temporalidad
  registradoEn?: string;
  ocurridoEn?: string;
  atendidoEn?: string;
  // Clasificación adicional
  severidadId?: number;
  severidad?: Severidad;
  jurisdiccionId?: number;
  jurisdiccion?: Jurisdiccion;
  // Estado
  situacionId?: number;
  situacion?: EstadoIncidencia;
  // Canal
  medioId?: number;
  medio?: MedioReporte;
  operadorId?: number;
  operador?: Operador;
  usuarioId?: number;
  usuario?: Usuario;
  // Atención
  descripcionIntervencion?: string;
  nombreAgraviado?: string;
  telefonoAgraviado?: string;
  // Proceso
  estadoProcesoId?: number;
  estadoProceso?: EstadoProceso;
  generoAgresorId?: number;
  generoAgresor?: GeneroAgresor;
  generoVictimaId?: number;
  generoVictima?: GeneroVictima;
  severidadProcesoId?: number;
  severidadProceso?: SeveridadProceso;
  // Relaciones
  serenos?: { sereno: Sereno }[];
  evidencias?: Evidencia[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateIncidenciaDto {
  unidadId?: number;
  tipoCasoId?: number;
  subTipoCasoId?: number;
  tipoReportanteId?: number;
  nombreReportante?: string;
  telefonoReportante?: string;
  reportanteFuente?: 'GESTIONATE' | 'LOCAL' | 'MANUAL';
  direccion?: string;
  latitud?: number;
  longitud?: number;
  descripcion?: string;
  ocurridoEn?: string;
  severidadId?: number;
  jurisdiccionId?: number;
  situacionId?: number;
  medioId?: number;
  operadorId?: number;
}

export interface UpdateAtencionDto {
  descripcionIntervencion?: string;
  nombreAgraviado?: string;
  telefonoAgraviado?: string;
  estadoProcesoId?: number;
  generoAgresorId?: number;
  generoVictimaId?: number;
  severidadProcesoId?: number;
  situacionId?: number;
  severidadId?: number;
  medioId?: number;
  operadorId?: number;
  atendidoEn?: string;
}

export interface FilterIncidenciaDto {
  fechaInicio?: string;
  fechaFin?: string;
  situacionId?: number;
  unidadId?: number;
  jurisdiccionId?: number;
  page?: number;
  limit?: number;
}

// ─── PAGINATION ───────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  data: T;
  message: string;
  statusCode: number;
}
