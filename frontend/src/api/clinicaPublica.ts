import { api } from './client'

export interface ClinicaPublica {
  nome: string
  logo_url: string | null
  cor_primaria: string | null
}

export const clinicaPublicaApi = {
  obter: (slug: string) => api.get<ClinicaPublica>(`/clinica-publica/${slug}`),
}
