import { api } from './client'
import type { InstalarInfo } from '../types'

export const instalarApi = {
  info: (clinicaSlug: string, perfilSlug: string) => api.get<InstalarInfo>(`/instalar-info/${clinicaSlug}/${perfilSlug}`),
}
