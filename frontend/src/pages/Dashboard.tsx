import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarClock,
  CalendarDays,
  ClipboardList,
  LayoutGrid,
  MonitorSmartphone,
  Scissors,
  Stethoscope,
  UserCog,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { Card, PageHeader } from '../components/ui'
import { pacientesApi } from '../api/pacientes'
import { medicosApi } from '../api/medicos'
import { agendamentosApi } from '../api/agendamentos'
import { compromissosApi } from '../api/compromissos'
import { cirurgiasApi } from '../api/cirurgias'
import { tiposProcedimentoApi } from '../api/tiposProcedimento'
import { useAuth } from '../contexts/AuthContext'

export default function Dashboard() {
  const { usuario } = useAuth()
  const ehMedico = usuario?.role === 'medico'
  const ehPj = usuario?.role === 'pj'
  const [counts, setCounts] = useState({
    pacientes: 0,
    medicos: 0,
    hoje: 0,
    compromissosHoje: 0,
    cirurgiasRealizadas: 0,
    procedimentosHoje: 0,
    cirurgiasHoje: 0,
  })
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    const hoje = new Date().toISOString().slice(0, 10)
    Promise.all([
      ehPj ? Promise.resolve([]) : pacientesApi.listar(),
      ehPj ? Promise.resolve([]) : medicosApi.listar(),
      ehPj ? Promise.resolve([]) : agendamentosApi.listar({ data: hoje, medico_id: ehMedico ? (usuario?.medico_id ?? undefined) : undefined }),
      ehMedico ? compromissosApi.listar({ data: hoje }) : Promise.resolve([]),
      ehPj ? cirurgiasApi.listar({ status: 'pronta' }) : Promise.resolve([]),
      ehMedico ? tiposProcedimentoApi.listar() : Promise.resolve([]),
    ])
      .then(([pacientes, medicos, agendamentosHoje, compromissosHoje, cirurgiasRealizadas, tiposProcedimento]) => {
        // Distingue, dentro dos agendamentos do dia, quais são cirurgia (tipo de
        // procedimento marcado "gera cirurgia") dos demais procedimentos —
        // "Consultas hoje" continua contando todos, sem mudar o que já existia.
        const idsCirurgia = new Set(tiposProcedimento.filter((t) => t.gera_cirurgia).map((t) => t.id))
        const cirurgiasHoje = agendamentosHoje.filter((a) => a.tipo_procedimento_id && idsCirurgia.has(a.tipo_procedimento_id)).length
        const procedimentosHoje = agendamentosHoje.filter(
          (a) => a.tipo_procedimento_id && !idsCirurgia.has(a.tipo_procedimento_id),
        ).length
        setCounts({
          pacientes: pacientes.length,
          medicos: medicos.length,
          hoje: agendamentosHoje.length,
          compromissosHoje: compromissosHoje.length,
          cirurgiasRealizadas: cirurgiasRealizadas.length,
          procedimentosHoje,
          cirurgiasHoje,
        })
      })
      .catch(() => setErro('Não foi possível conectar à API. Verifique se o backend está rodando (npm run dev na pasta backend).'))
  }, [ehMedico, ehPj, usuario?.medico_id])

  const cards: { label: string; value: number; to: string; icon: LucideIcon }[] = ehPj
    ? [{ label: 'Cirurgias realizadas', value: counts.cirurgiasRealizadas, to: '/cirurgias', icon: Scissors }]
    : ehMedico
      ? [
          { label: 'Consultas hoje', value: counts.hoje, to: '/agendamento', icon: CalendarDays },
          { label: 'Procedimentos hoje', value: counts.procedimentosHoje, to: '/agendamento', icon: ClipboardList },
          { label: 'Cirurgias hoje', value: counts.cirurgiasHoje, to: '/agendamento', icon: Scissors },
          { label: 'Compromissos hoje', value: counts.compromissosHoje, to: '/agendamento', icon: CalendarClock },
          { label: 'Total do dia', value: counts.hoje + counts.compromissosHoje, to: '/agendamento', icon: LayoutGrid },
        ]
      : [
          { label: 'Pacientes cadastrados', value: counts.pacientes, to: '/administrativo/pacientes', icon: Users },
          { label: 'Médicos cadastrados', value: counts.medicos, to: '/administrativo/medicos', icon: Stethoscope },
          { label: 'Consultas hoje', value: counts.hoje, to: '/agendamento', icon: CalendarDays },
        ]

  const primeiroNome = usuario?.nome?.split(' ')[0]
  const saudacao = usuario?.sexo === 'feminino' ? 'Bem-vinda' : 'Bem-vindo'

  return (
    <div>
      {primeiroNome && (
        <p className="text-sm font-medium text-brand-700 mb-1">{saudacao}, {primeiroNome}!</p>
      )}
      <PageHeader
        title="Visão geral"
        subtitle="Resumo rápido da clínica"
        icon={LayoutGrid}
        action={
          usuario && (
            <Link to="/meu-perfil" className="shrink-0 self-start -mt-4">
              {usuario.foto_url ? (
                <img
                  src={usuario.foto_url}
                  alt=""
                  className="h-24 w-24 rounded-full object-cover ring-1 ring-slate-200 shadow-sm"
                />
              ) : (
                <span className="h-24 w-24 rounded-full bg-slate-100 flex items-center justify-center ring-1 ring-slate-200">
                  <UserCog className="h-10 w-10 text-slate-400" />
                </span>
              )}
            </Link>
          )
        }
      />

      {erro && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {erro}
        </div>
      )}

      <div className={`grid grid-cols-1 ${ehPj ? 'sm:grid-cols-1 max-w-xs' : ehMedico ? 'sm:grid-cols-3 lg:grid-cols-5' : 'sm:grid-cols-3'} gap-4 mb-8`}>
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
