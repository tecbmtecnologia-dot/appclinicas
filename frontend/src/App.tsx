import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { RequireAuth, RequireRole } from './components/RequireAuth'
import { useAuth } from './contexts/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Agenda from './pages/agendamento/Agenda'
import Prontuario from './pages/prontuario/Prontuario'
import Pacientes from './pages/administrativo/Pacientes'
import Medicos from './pages/administrativo/Medicos'
import Usuarios from './pages/administrativo/Usuarios'
import Telemedicina from './pages/telemedicina/Telemedicina'
import Clinicas from './pages/plataforma/Clinicas'
import MinhaClinica from './pages/configuracoes/MinhaClinica'
import Ponto from './pages/ponto/Ponto'
import RelatorioPonto from './pages/ponto/RelatorioPonto'
import Cirurgias from './pages/cirurgias/Cirurgias'
import Financeiro from './pages/financeiro/Financeiro'
import MinhasFinancas from './pages/financeiro/MinhasFinancas'
import Reunioes from './pages/reunioes/Reunioes'
import SalaReuniao from './pages/reunioes/SalaReuniao'

function Inicio() {
  const { usuario } = useAuth()
  if (usuario?.role === 'super_admin') return <Navigate to="/plataforma/clinicas" replace />
  return <Dashboard />
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Inicio />} />
          <Route element={<RequireRole roles={['super_admin']} />}>
            <Route path="/plataforma/clinicas" element={<Clinicas />} />
          </Route>
          <Route
            element={
              <RequireRole roles={['admin', 'coordenador', 'medico', 'enfermagem', 'recepcao', 'financeiro']} />
            }
          >
            <Route element={<RequireRole roles={['admin', 'coordenador', 'recepcao', 'medico', 'financeiro']} />}>
              <Route path="/agendamento" element={<Agenda />} />
            </Route>
            <Route element={<RequireRole roles={['admin', 'coordenador', 'medico', 'enfermagem']} />}>
              <Route path="/prontuario" element={<Prontuario />} />
            </Route>
            <Route path="/administrativo/pacientes" element={<Pacientes />} />
            <Route path="/reunioes" element={<Reunioes />} />
            <Route path="/reunioes/:id/sala" element={<SalaReuniao />} />
            <Route element={<RequireRole roles={['admin', 'coordenador', 'medico', 'enfermagem', 'recepcao']} />}>
              <Route path="/cirurgias" element={<Cirurgias />} />
            </Route>
            <Route path="/financeiro/minhas-financas" element={<MinhasFinancas />} />
            <Route element={<RequireRole roles={['admin', 'recepcao', 'financeiro']} />}>
              <Route path="/financeiro" element={<Financeiro />} />
            </Route>
            <Route path="/ponto" element={<Ponto />} />
            <Route element={<RequireRole roles={['admin', 'coordenador', 'financeiro']} />}>
              <Route path="/ponto/relatorio" element={<RelatorioPonto />} />
            </Route>
            <Route element={<RequireRole roles={['admin', 'coordenador', 'recepcao', 'medico']} />}>
              <Route path="/administrativo/medicos" element={<Medicos />} />
            </Route>
            <Route element={<RequireRole roles={['admin', 'coordenador', 'medico']} />}>
              <Route path="/telemedicina" element={<Telemedicina />} />
            </Route>
            <Route element={<RequireRole roles={['admin', 'coordenador']} />}>
              <Route path="/administrativo/usuarios" element={<Usuarios />} />
            </Route>
            <Route element={<RequireRole roles={['admin']} />}>
              <Route path="/configuracoes/clinica" element={<MinhaClinica />} />
            </Route>
          </Route>
        </Route>
      </Route>
    </Routes>
  )
}

export default App
