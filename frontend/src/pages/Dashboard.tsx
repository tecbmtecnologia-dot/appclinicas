import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, LayoutGrid, MonitorSmartphone, Stethoscope, Users, type LucideIcon } from 'lucide-react'
import { Card, PageHeader } from '../components/ui'
import { pacientesApi } from '../api/pacientes'
import { medicosApi } from '../api/medicos'
import { agendamentosApi } from '../api/agendamentos'
import { useAuth } from '../contexts/AuthContext'

export default function Dashboard() {
  const { usuario } = useAuth()
  const ehMedico = usuario?.role === 'medico'
  const [counts, setCounts] = useState({ pacientes: 0, medicos: 0, hoje: 0 })
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    const hoje = new Date().toISOString().slice(0, 10)
    Promise.all([
      pacientesApi.listar(),
      medicosApi.listar(),
      agendamentosApi.listar({ data: hoje, medico_id: ehMedico ? (usuario?.medico_id ?? undefined) : undefined }),
    ])
      .then(([pacientes, medicos, agendamentosHoje]) => {
        setCounts({ pacientes: pacientes.length, medicos: medicos.length, hoje: agendamentosHoje.length })
      })
      .catch(() => setErro('Não foi possível conectar à API. Verifique se o backend está rodando (npm run dev na pasta backend).'))
  }, [ehMedico, usuario?.medico_id])

  const cards: { label: string; value: number; to: string; icon: LucideIcon }[] = ehMedico
    ? [{ label: 'Meus agendamentos hoje', value: counts.hoje, to: '/agendamento', icon: CalendarDays }]
    : [
        { label: 'Pacientes cadastrados', value: counts.pacientes, to: '/administrativo/pacientes', icon: Users },
        { label: 'Médicos cadastrados', value: counts.medicos, to: '/administrativo/medicos', icon: Stethoscope },
        { label: 'Consultas hoje', value: counts.hoje, to: '/agendamento', icon: CalendarDays },
      ]

  const primeiroNome = usuario?.nome?.split(' ')[0]

  return (
    <div>
      {primeiroNome && (
        <p className="text-sm font-medium text-brand-700 mb-1">Bem-vindo, {primeiroNome}!</p>
      )}
      <PageHeader title="Visão geral" subtitle="Resumo rápido da clínica" icon={LayoutGrid} />

      {erro && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {erro}
        </div>
      )}

      <div className={`grid grid-cols-1 ${ehMedico ? 'sm:grid-cols-1 max-w-xs' : 'sm:grid-cols-3'} gap-4 mb-8`}>
        {cards.map((c) => (
          <Link key={c.label} to={c.to}>
            <Card className="p-5 hover:border-brand-300 hover:-translate-y-0.5 transition-all">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">{c.label}</p>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                  <c.icon className="h-4 w-4" strokeWidth={2} />
                </span>
              </div>
              <p className="text-3xl font-bold text-slate-900 mt-3">{c.value}</p>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5">
          <h2 className="font-semibold text-slate-800 mb-3">Módulos disponíveis</h2>
          <ul className="text-sm text-slate-600 space-y-2.5">
            <li className="flex items-center gap-2.5">
              <CalendarDays className="h-4 w-4 text-brand-600 shrink-0" strokeWidth={2} /> Agendamento de consultas
            </li>
            <li className="flex items-center gap-2.5">
              <Stethoscope className="h-4 w-4 text-brand-600 shrink-0" strokeWidth={2} /> Prontuário eletrônico
            </li>
            <li className="flex items-center gap-2.5">
              <Users className="h-4 w-4 text-brand-600 shrink-0" strokeWidth={2} /> Gestão administrativa (pacientes e médicos)
            </li>
            <li className="flex items-center gap-2.5">
              <MonitorSmartphone className="h-4 w-4 text-brand-600 shrink-0" strokeWidth={2} /> Telemedicina (chat em tempo real)
            </li>
          </ul>
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold text-slate-800 mb-2">Como instalar como app</h2>
          <p className="text-sm text-slate-600">
            No Chrome/Edge (desktop) clique no ícone de instalar na barra de endereço. No celular,
            use "Adicionar à tela inicial" no menu do navegador. O app funciona como aplicativo
            nativo, em desktop e mobile.
          </p>
        </Card>
      </div>
    </div>
  )
}
