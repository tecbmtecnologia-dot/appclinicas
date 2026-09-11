import { api, getToken } from './client'
import type { ContratoModelo } from '../types'

export const contratoModeloApi = {
  obter: () => api.get<ContratoModelo>('/contrato-modelo'),
  salvar: (texto: string) => api.put<ContratoModelo>('/contrato-modelo', { texto }),
  gerarPdf: async (pacienteId: string) => {
    const res = await fetch(`/api/contrato-modelo/gerar/${pacienteId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken() ?? ''}` },
    })
    if (!res.ok) {
      const corpo = await res.json().catch(() => null)
      throw new Error(corpo?.error || 'Não foi possível gerar o contrato.')
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  },
}
