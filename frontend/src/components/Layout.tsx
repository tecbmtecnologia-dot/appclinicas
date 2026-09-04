import { NavLink, Outlet } from 'react-router-dom'
import {
  BarChart3,
  Building2,
  CalendarDays,
  ClipboardList,
  Clock,
  LayoutGrid,
  LogOut,
  PiggyBank,
  Scissors,
  Stethoscope,
  UserCog,
  Users,
  Users2,
  Video,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import NotificationBell from './NotificationBell'
import type { Role } from '../types'

const navOperacional: { to: string; label: string; end?: boolean; roles?: Role[]; icon: LucideIcon }[] = [
  { to: '/', label: 'Início', end: true, icon: LayoutGrid },
  { to: '/agendamento', label: 'Agendamento', roles: ['admin', 'coordenador', 'recepcao', 'medico', 'financeiro'], icon: CalendarDays },
  { to: '/prontuario', label: 'Prontuário', roles: ['admin', 'coordenador', 'medico', 'enfermagem'], icon: ClipboardList },
  { to: '/administrativo/pacientes', label: 'Pacientes', icon: Users },
  { to: '/cirurgias', label: 'Cirurgias', roles: ['admin', 'coordenador', 'medico', 'enfermagem', 'recepcao'], icon: Scissors },
  { to: '/administrativo/medicos', label: 'Médicos', roles: ['admin', 'coordenador', 'recepcao', 'medico'], icon: Stethoscope },
  { to: '/administrativo/usuarios', label: 'Usuários', roles: ['admin', 'coordenador'], icon: UserCog },
  { to: '/telemedicina', label: 'Telemedicina', roles: ['admin', 'coordenador', 'medico'], icon: Video },
  { to: '/reunioes', label: 'Reuniões', icon: Users2 },
  { to: '/financeiro', label: 'Financeiro', roles: ['admin', 'recepcao', 'financeiro'], icon: Wallet },
  { to: '/financeiro/minhas-financas', label: 'Minhas finanças', icon: PiggyBank },
  { to: '/ponto', label: 'Ponto', icon: Clock },
  { to: '/ponto/relatorio', label: 'Relatório de ponto', roles: ['admin', 'coordenador', 'financeiro'], icon: BarChart3 },
  { to: '/configuracoes/clinica', label: 'Minha Clínica', roles: ['admin'], icon: Building2 },
]

const navPlataforma = [{ to: '/plataforma/clinicas', label: 'Clínicas', end: true, icon: Building2 }]

const rotulosRole: Record<Role, string> = {
  super_admin: 'Administrador da plataforma',
  admin: 'Administrador',
  coordenador: 'Coordenador(a)',
  medico: 'Médico(a)',
  enfermagem: 'Enfermagem',
  recepcao: 'Recepção',
  financeiro: 'Financeiro',
}

export default function Layout() {
  const { usuario, sair } = useAuth()
  const ehPlataforma = usuario?.role === 'super_admin'
  const itens = ehPlataforma ? navPlataforma : navOperacional.filter((item) => !item.roles || (usuario && item.roles.includes(usuario.role)))
  const nomeMarca = usuario?.clinica?.nome ?? 'Clínicas'
  const logoUrl = usuario?.clinica?.logo_url

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-slate-100">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="h-9 w-9 rounded-xl object-cover ring-1 ring-slate-200" />
          ) : (
            <div className="h-9 w-9 rounded-xl bg-brand-700 flex items-center justify-center text-white shadow-sm shadow-brand-700/30">
              <Stethoscope className="h-5 w-5" strokeWidth={2.25} />
            </div>
          )}
          <span className="font-bold tracking-tight text-slate-900 truncate">{nomeMarca}</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {itens.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-slate-100">
          {usuario && (
            <div className="mb-3 px-1 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-700 truncate">{usuario.nome}</p>
                <p className="text-xs text-slate-400">{rotulosRole[usuario.role]}</p>
              </div>
              {!ehPlataforma && <NotificationBell />}
            </div>
          )}
          <button
            onClick={sair}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <LogOut className="h-4 w-4" strokeWidth={2} />
            Sair
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 h-screen md:h-auto md:min-h-screen">
        <header className="flex md:hidden items-center justify-between border-b border-slate-200 bg-white px-4 py-3 shrink-0">
          <div className="flex items-center gap-2">
            {logoUrl ? (
              <img src={logoUrl} alt="" className="h-7 w-7 rounded-lg object-cover ring-1 ring-slate-200" />
            ) : (
              <div className="h-7 w-7 rounded-lg bg-brand-700 flex items-center justify-center text-white">
                <Stethoscope className="h-4 w-4" strokeWidth={2.25} />
              </div>
            )}
            <span className="font-bold text-slate-900">{nomeMarca}</span>
          </div>
          <div className="flex items-center gap-3">
            {!ehPlataforma && <NotificationBell />}
            <button onClick={sair} className="text-xs font-medium text-slate-500">
              Sair
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 pb-20 md:pb-8 overflow-y-auto">
          <Outlet />
        </main>

        <nav className="md:hidden flex border-t border-slate-200 bg-white shrink-0 sticky bottom-0 pb-[env(safe-area-inset-bottom)]">
          {itens.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium ${
                  isActive ? 'text-brand-700' : 'text-slate-500'
                }`
              }
            >
              <item.icon className="h-[18px] w-[18px]" strokeWidth={2} />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
