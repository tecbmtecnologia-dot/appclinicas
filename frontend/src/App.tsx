import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { RequireAuth, RequireRole } from './components/RequireAuth'
import { useAuth } from './contexts/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Agenda from './pages/agendamento/Agenda'
import Pacientes from './pages/administrativo/Pacientes'
import PacienteDetalhe from './pages/administrativo/PacienteDetalhe'
import Medicos from './pages/administrativo/Medicos'
import Auxiliares from './pages/administrativo/Auxiliares'
import Hospitais from './pages/administrativo/Hospitais'
import Usuarios from './pages/administrativo/Usuarios'
import Telemedicina from './pages/telemedicina/Telemedicina'
import Clinicas from './pages/plataforma/Clinicas'
import MeuPerfil from './pages/plataforma/MeuPerfil'
import MinhaClinica from './pages/configuracoes/MinhaClinica'
import Ponto from './pages/ponto/Ponto'
import RelatorioPonto from './pages/ponto/RelatorioPonto'
import Cirurgias from './pages/cirurgias/Cirurgias'
import Financeiro from './pages/financeiro/Financeiro'
import MinhasFinancas from './pages/financeiro/MinhasFinancas'
import Reunioes from './pages/reunioes/Reunioes'
import SalaReuniao from './pages/reunioes/SalaReuniao'
import Comissoes from './pages/financeiro/Comissoes'
import PainelDono from './pages/PainelDono'
import PerfisInstalacao from './pages/configuracoes/PerfisInstalacao'
import ModelosReceita from './pages/configuracoes/ModelosReceita'
import ModelosExame from './pages/configuracoes/ModelosExame'
import ModeloContrato from './pages/configuracoes/ModeloContrato'
import Estoque from './pages/estoque/Estoque'
import ItensCirurgia from './pages/configuracoes/ItensCirurgia'
import TiposProcedimento from './pages/configuracoes/TiposProcedimento'
import AgendaFisioterapia from './pages/fisioterapia/AgendaFisioterapia'
import Receitas from './pages/receitas/Receitas'
import PedidosExame from './pages/exames/PedidosExame'
import Instalar from './pages/instalar/Instalar'
import Relatorios from './pages/relatorios/Relatorios'
import PoliticaPrivacidade from './pages/legal/PoliticaPrivacidade'
import TermosUso from './pages/legal/TermosUso'
import TermoConsentimentoPaciente from './pages/legal/TermoConsentimentoPaciente'
import { estaEmModoKiosk } from './lib/standalone'
import type { Role } from './types'

// medico e pj não usam ponto — mantido em um só lugar porque também guarda
// a rota /ponto abaixo (evita loop de redirecionamento no modo kiosk).
const PODE_PONTO: Role[] = ['admin', 'enfermagem', 'recepcao', 'financeiro']

function Inicio() {
  const { usuario } = useAuth()
  if (usuario?.role === 'super_admin') return <Navigate to="/plataforma/clinicas" replace />
  if (estaEmModoKiosk() && usuario && PODE_PONTO.includes(usuario.role)) return <Navigate to="/ponto" replace />
  return <Dashboard />
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/entrar/:clinicaSlug" element={<Login />} />
      <Route path="/instalar/:clinicaSlug/:perfilSlug" element={<Instalar />} />
      <Route path="/privacidade" element={<PoliticaPrivacidade />} />
      <Route path="/termos" element={<TermosUso />} />
      <Route path="/termo-consentimento-paciente" element={<TermoConsentimentoPaciente />} />
      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Inicio />} />
          <Route element={<RequireRole roles={['super_admin']} />}>
            <Route path="/plataforma/clinicas" element={<Clinicas />} />
            <Route path="/plataforma/perfil" element={<MeuPerfil />} />
          </Route>
          <Route
            element={
              <RequireRole roles={['admin', 'coordenador', 'medico', 'enfermagem', 'recepcao', 'financeiro', 'pj']} />
            }
          >
            <Route element={<RequireRole roles={['admin', 'coordenador', 'recepcao', 'medico', 'financeiro']} />}>
              <Route path="/agendamento" element={<Agenda />} />
            </Route>
            <Route path="/administrativo/pacientes" element={<Pacientes />} />
            <Route path="/administrativo/pacientes/:id" element={<PacienteDetalhe />} />
            <Route element={<RequireRole roles={['coordenador']} />}>
              <Route path="/painel-clinica" element={<PainelDono />} />
            </Route>
            <Route path="/reunioes" element={<Reunioes />} />
            <Route element={<RequireRole roles={['admin', 'coordenador', 'medico', 'enfermagem', 'recepcao', 'financeiro']} />}>
              <Route path="/receitas" element={<Receitas />} />
              <Route path="/exames" element={<PedidosExame />} />
            </Route>
            <Route path="/meu-perfil" element={<MeuPerfil />} />
            <Route path="/reunioes/:id/sala" element={<SalaReuniao />} />
            <Route element={<RequireRole roles={['admin', 'coordenador', 'medico', 'enfermagem', 'recepcao', 'pj']} />}>
              <Route path="/cirurgias" element={<Cirurgias />} />
            </Route>
            <Route element={<RequireRole roles={['admin', 'coordenador', 'medico', 'enfermagem', 'financeiro']} />}>
              <Route path="/financeiro/minhas-financas" element={<MinhasFinancas />} />
            </Route>
            <Route element={<RequireRole roles={['admin', 'financeiro', 'medico']} />}>
              <Route path="/financeiro" element={<Financeiro />} />
            </Route>
            <Route element={<RequireRole roles={['admin', 'financeiro', 'pj', 'coordenador']} />}>
              <Route path="/financeiro/comissoes" element={<Comissoes />} />
            </Route>
            <Route element={<RequireRole roles={PODE_PONTO} />}>
              <Route path="/ponto" element={<Ponto />} />
            </Route>
            <Route element={<RequireRole roles={['admin', 'coordenador', 'financeiro']} />}>
              <Route path="/ponto/relatorio" element={<RelatorioPonto />} />
            </Route>
            <Route element={<RequireRole roles={['admin', 'coordenador']} />}>
              <Route path="/administrativo/medicos" element={<Medicos />} />
            </Route>
            <Route element={<RequireRole roles={['admin', 'coordenador']} />}>
              <Route path="/administrativo/hospitais" element={<Hospitais />} />
            </Route>
            <Route element={<RequireRole roles={['admin', 'coordenador', 'enfermagem']} />}>
              <Route path="/administrativo/auxiliares" element={<Auxiliares />} />
              <Route path="/estoque" element={<Estoque />} />
            </Route>
            <Route element={<RequireRole roles={['admin', 'coordenador', 'medico']} />}>
              <Route path="/telemedicina" element={<Telemedicina />} />
            </Route>
            <Route element={<RequireRole roles={['admin', 'coordenador', 'pj']} />}>
              <Route path="/agenda-fisioterapia" element={<AgendaFisioterapia />} />
            </Route>
            <Route element={<RequireRole roles={['admin', 'coordenador']} />}>
              <Route path="/administrativo/usuarios" element={<Usuarios />} />
            </Route>
            <Route element={<RequireRole roles={['admin']} />}>
              <Route path="/relatorios" element={<Relatorios />} />
              <Route path="/configuracoes/clinica" element={<MinhaClinica />} />
              <Route path="/configuracoes/perfis-instalacao" element={<PerfisInstalacao />} />
              <Route path="/configuracoes/modelos-receita" element={<ModelosReceita />} />
              <Route path="/configuracoes/modelos-exame" element={<ModelosExame />} />
              <Route path="/configuracoes/contrato" element={<ModeloContrato />} />
              <Route path="/configuracoes/itens-cirurgia" element={<ItensCirurgia />} />
              <Route path="/configuracoes/tipos-procedimento" element={<TiposProcedimento />} />
            </Route>
          </Route>
        </Route>
      </Route>
    </Routes>
  )
}

export default App
