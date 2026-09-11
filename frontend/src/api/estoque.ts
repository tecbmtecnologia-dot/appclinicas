import { api, getToken } from './client'
import type { EstoqueItem } from '../types'

export interface EstoqueItemForm {
  descricao: string
  quantidade: number
  data_validade?: string | null
}

export const estoqueApi = {
  listar: () => api.get<EstoqueItem[]>('/estoque'),
  criar: (data: EstoqueItemForm) => api.post<EstoqueItem>('/estoque', data),
  atualizar: (id: string, data: Partial<EstoqueItemForm>) => api.put<EstoqueItem>(`/estoque/${id}`, data),
  remover: (id: string) => api.del<void>(`/estoque/${id}`),
  abrirRelatorioPdf: async () => {
    const res = await fetch('/api/estoque/relatorio.pdf', {
      headers: { Authorization: `Bearer ${getToken() ?? ''}` },
    })
    if (!res.ok) throw new Error('Não foi possível gerar o relatório.')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  },
}
