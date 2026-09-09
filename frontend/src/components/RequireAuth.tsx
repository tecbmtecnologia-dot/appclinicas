import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getClinicaInstalada } from '../lib/standalone'
import type { Role } from '../types'

export function RequireAuth() {
  const { usuario, carregando } = useAuth()
  if (carregando) return null
  if (!usuario) {
    const clinicaSlug = getClinicaInstalada()
    return <Navigate to={clinicaSlug ? `/entrar/${clinicaSlug}` : '/login'} replace />
  }
  return <Outlet />
}

export function RequireRole({ roles }: { roles: Role[] }) {
  const { usuario } = useAuth()
  if (!usuario || !roles.includes(usuario.role)) return <Navigate to="/" replace />
  return <Outlet />
}
