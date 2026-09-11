import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  BarChart3,
  Boxes,
  Building,
  Building2,
  CalendarDays,
  ClipboardPlus,
  Clock,
  FileBarChart,
  FileSignature,
  FileText,
  HandCoins,
  LayoutGrid,
  LogOut,
  Menu,
  PackagePlus,
  PieChart,
  PiggyBank,
  Printer,
  Scissors,
  Smartphone,
  Stethoscope,
  UserCog,
  UserCog2,
  Users,
  Users2,
  Video,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import NotificationBell from './NotificationBell'
import { estaEmModoKiosk } from '../lib/standalone'
import type { Role } from '../types'

const navAppInstalado = [{ to: '/ponto', label: 'Ponto', end: true, icon: Clock }]

const navOperacional: { to: string; label: string; end?: boolean; roles?: Role[]; icon: LucideIcon }[] = [
  { to: '/', label: 'Início', end: true, icon: LayoutGrid },
  { to: '/agendamento', label: 'Agendamento', roles: ['admin', 'coordenador', 'recepcao', 'medico', 'financeiro'], icon: CalendarDays },
  { to: '/administrativo/pacientes', label: 'Pacientes', icon: Users },
  { to: '/painel-clinica', label: 'Painel da clínica', roles: ['coordenador'], icon: PieChart },
  { to: '/relatorios', label: 'Relatórios', roles: ['admin'], icon: FileBarChart },
  { to: '/cirurgias', label: 'Cirurgias', roles: ['admin', 'coordenador', 'medico', 'enfermagem', 'recepcao', 'pj'], icon: Scissors },
  { to: '/agenda-fisioterapia', label: 'Minha agenda', roles: ['pj'], icon: CalendarDays },
  { to: '/administrativo/medicos', label: 'Médicos', roles: ['admin', 'coordenador'], icon: Stethoscope },
  { to: '/administrativo/hospitais', label: 'Hospitais', roles: ['admin', 'coordenador'], icon: Building },
  {
    to: '/administrativo/auxiliares',
    label: 'Auxiliares',
    roles: ['admin', 'coordenador', 'enfermagem'],
    icon: UserCog2,
  },
  { to: '/estoque', label: 'Estoque', roles: ['admin', 'coordenador', 'enfermagem'], icon: Boxes },
  { to: '/administrativo/usuarios', label: 'Usuários', roles: ['admin', 'coordenador'], icon: UserCog },
  { to: '/telemedicina', label: 'Telemedicina', roles: ['admin', 'coordenador', 'medico'], icon: Video },
  { to: '/reunioes', label: 'Reuniões', icon: Users2 },
  { to: '/receitas', label: 'Receitas', icon: Printer },
  { to: '/financeiro', label: 'Financeiro', roles: ['admin', 'financeiro', 'medico'], icon: Wallet },
  {
    to: '/financeiro/minhas-financas',
    label: 'Minhas finanças',
    roles: ['admin', 'coordenador', 'medico', 'enfermagem', 'financeiro'],
    icon: PiggyBank,
  },
  { to: '/financeiro/comissoes', label: 'Comissões', roles: ['admin', 'financeiro', 'pj'], icon: HandCoins },
  { to: '/ponto', label: 'Ponto', roles: ['admin', 'enfermagem', 'recepcao', 'financeiro'], icon: Clock },
  { to: '/ponto/relatorio', label: 'Relatório de ponto', roles: ['admin', 'coordenador', 'financeiro'], icon: BarChart3 },
  { to: '/configuracoes/clinica', label: 'Minha Clínica', roles: ['admin'], icon: Building2 },
  { to: '/configuracoes/perfis-instalacao', label: 'Apps da equipe', roles: ['admin'], icon: Smartphone },
  { to: '/configuracoes/modelos-receita', label: 'Modelos de receita', roles: ['admin'], icon: FileSignature },
  { to: '/configuracoes/contrato', label: 'Modelo de contrato', roles: ['admin'], icon: FileText },
  { to: '/configuracoes/itens-cirurgia', label: 'Itens de cirurgia', roles: ['admin'], icon: PackagePlus },
  { to: '/configuracoes/tipos-procedimento', label: 'Tipos de procedimento', roles: ['admin'], icon: ClipboardPlus },
]

const navPlataforma = [
  { to: '/plataforma/clinicas', label: 'Clínicas', end: true, icon: Building2 },
  { to: '/plataforma/perfil', label: 'Meu perfil', end: true, icon: UserCog },
]

const rotulosRole: Record<Role, string> = {
  super_admin: 'Administrador da plataforma',
  admin: 'Administrador',
  coordenador: 'Coordenador(a)',
  medico: 'Médico(a)',
  enfermagem: 'Enfermagem',
  recepcao: 'Recepção',
  financeiro: 'Financeiro',
  pj: 'PJ (comissionado)',
}

type ItemNav = { to: string; label: string; end?: boolean; roles?: Role[]; icon: LucideIcon }

function ConteudoMenu({
  itens,
  usuario,
  ehPlataforma,
  nomeMarca,
  logoUrl,
  sair,
  aoNavegar,
  aoFechar,
}: {
  itens: ItemNav[]
  usuario: ReturnType<typeof useAuth>['usuario']
  ehPlataforma: boolean
  nomeMarca: string
  logoUrl?: string | null
  sair: () => void
  aoNavegar?: () => void
  aoFechar?: () => void
}) {
  return (
    <>
      <div
        className="flex items-center justify-between gap-2.5 px-5 pb-5 border-b border-slate-100"
        style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top))' }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="h-9 w-9 rounded-xl object-cover ring-1 ring-slate-200 shrink-0" />
          ) : (
            <img src="/logo-tecbm.png" alt="" className="h-9 w-9 object-contain shrink-0" />
          )}
          <span className="font-bold tracking-tight text-slate-900 truncate">{nomeMarca}</span>
        </div>
        {aoFechar && (
          <button onClick={aoFechar} className="shrink-0 p-1 text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        )}
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {itens.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={aoNavegar}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
              }`
            }
          >
            <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div
        className="px-4 pt-4 border-t border-slate-100"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        {usuario && (
          <div className="mb-3 px-1 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-700 truncate">{usuario.nome}</p>
              <p className="text-xs text-slate-400">{usuario.cargo || rotulosRole[usuario.role]}</p>
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
        <p className="mt-3 px-1 flex items-center justify-center gap-1 text-[10px] text-slate-700">
          Desenvolvido por TECBM - Bruno Martins Tecnologia
          <img src="/logo-tecbm.png" alt="" className="h-3.5 w-auto object-contain" />
        </p>
      </div>
    </>
  )
}

export default function Layout() {
  const { usuario, sair } = useAuth()
  const [menuAberto, setMenuAberto] = useState(false)
  const ehPlataforma = usuario?.role === 'super_admin'
  const itens = estaEmModoKiosk()
    ? navAppInstalado
    : ehPlataforma
      ? navPlataforma
      : navOperacional.filter((item) => !item.roles || (usuario && item.roles.includes(usuario.role)))
  const nomeMarca = usuario?.clinica?.nome ?? 'CLÍNICAS'
  const logoUrl = usuario?.clinica?.logo_url

  return (
    <div className="flex min-h-dvh bg-app">
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
        <ConteudoMenu
          itens={itens}
          usuario={usuario}
          ehPlataforma={ehPlataforma}
          nomeMarca={nomeMarca}
          logoUrl={logoUrl}
          sair={sair}
        />
      </aside>

      {menuAberto && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenuAberto(false)} aria-hidden />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[80%] flex flex-col bg-white shadow-xl">
            <ConteudoMenu
              itens={itens}
              usuario={usuario}
              ehPlataforma={ehPlataforma}
              nomeMarca={nomeMarca}
              logoUrl={logoUrl}
              sair={sair}
              aoNavegar={() => setMenuAberto(false)}
              aoFechar={() => setMenuAberto(false)}
            />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 h-dvh md:h-auto md:min-h-dvh">
        <header
          className="flex md:hidden items-center justify-between border-b border-slate-200 bg-white px-4 pb-3 shrink-0"
          style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setMenuAberto(true)} className="shrink-0 p-1 -ml-1 text-slate-600">
              <Menu className="h-6 w-6" strokeWidth={2} />
            </button>
            <div className="flex items-center gap-2 min-w-0">
              {logoUrl ? (
                <img src={logoUrl} alt="" className="h-7 w-7 rounded-lg object-cover ring-1 ring-slate-200 shrink-0" />
              ) : (
                <img src="/logo-tecbm.png" alt="" className="h-7 w-7 object-contain shrink-0" />
              )}
              <span className="font-bold text-slate-900 truncate">{nomeMarca}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {!ehPlataforma && <NotificationBell />}
            <button onClick={sair} className="text-xs font-medium text-slate-500">
              Sair
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <Outlet />
        </main>

        <footer
          className="md:hidden shrink-0 border-t border-slate-200 bg-white px-4 py-2"
          style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
        >
          <p className="flex items-center justify-center gap-1 text-[10px] text-slate-700">
            Desenvolvido por TECBM - Bruno Martins Tecnologia
            <img src="/logo-tecbm.png" alt="" className="h-3.5 w-auto object-contain" />
          </p>
        </footer>
      </div>
    </div>
  )
}
