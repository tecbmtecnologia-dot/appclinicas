import type { ReactNode } from 'react'
import { Card } from '../../components/ui'

export default function PaginaLegal({ titulo, atualizadoEm, children }: { titulo: string; atualizadoEm: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <Card className="p-6 sm:p-10">
          <h1 className="text-2xl font-bold text-slate-900">{titulo}</h1>
          <p className="text-sm text-slate-400 mt-1 mb-6">Última atualização: {atualizadoEm}</p>
          <div className="space-y-4 text-sm text-slate-700 leading-relaxed [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-slate-900 [&_h2]:mt-6 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">
            {children}
          </div>
        </Card>
      </div>
    </div>
  )
}
