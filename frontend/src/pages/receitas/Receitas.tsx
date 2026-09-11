import { useEffect, useState } from 'react'
import { Printer } from 'lucide-react'
import { Card, EmptyState, Label, PageHeader } from '../../components/ui'
import { SeletorPaciente } from '../../components/SeletorPaciente'
import { pacientesApi } from '../../api/pacientes'
import { prontuariosApi } from '../../api/prontuarios'
import type { Paciente, ReceitaResumo } from '../../types'

function formatarDataBr(iso: string) {
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('pt-BR')
}

export default function Receitas() {
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [pacienteId, setPacienteId] = useState('')
  const [receitas, setReceitas] = useState<ReceitaResumo[]>([])
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    pacientesApi.listar().then(setPacientes).catch(() => {})
  }, [])

  useEffect(() => {
    if (!pacienteId) {
      setReceitas([])
      return
    }
    setCarregando(true)
    prontuariosApi
      .listarReceitasPorPaciente(pacienteId)
      .then(setReceitas)
      .finally(() => setCarregando(false))
  }, [pacienteId])

  return (
    <div>
      <PageHeader title="Receitas" subtitle="Selecione o paciente para imprimir uma receita já emitida" icon={Printer} />

      <Card className="p-4 mb-6 max-w-md">
        <Label>Paciente</Label>
        <SeletorPaciente pacientes={pacientes} value={pacienteId} onChange={setPacienteId} />
      </Card>

      {!pacienteId ? (
        <EmptyState text="Selecione um paciente para ver as receitas dele." />
      ) : carregando ? (
        <p className="text-sm text-slate-400">Carregando...</p>
      ) : receitas.length === 0 ? (
        <EmptyState text="Nenhuma receita emitida para este paciente ainda." />
      ) : (
        <div className="space-y-3">
          {receitas.map((r) => (
            <Card key={r.id} className="p-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-slate-800">{formatarDataBr(r.data)}</p>
                <p className="text-xs text-slate-400">Dr(a). {r.medico_nome}</p>
              </div>
              <button
                type="button"
                onClick={() => prontuariosApi.abrirReceitaPdf(r.id).catch(() => alert('Erro ao gerar a receita.'))}
                className="flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-800"
              >
                <Printer className="h-4 w-4" /> Imprimir
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
