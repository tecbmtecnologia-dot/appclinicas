import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { authApi } from '../api/auth'
import { clearToken, getToken, setToken } from '../api/client'
import type { UsuarioLogado } from '../types'

interface AuthContextValue {
  usuario: UsuarioLogado | null
  carregando: boolean
  entrar: (email: string, senha: string) => Promise<void>
  sair: () => void
  atualizarUsuario: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const VARIAVEIS_MARCA = ['--color-brand-500', '--color-brand-600', '--color-brand-700', '--color-brand-800']

function aplicarMarca(cor?: string | null) {
  const raiz = document.documentElement.style
  if (cor) {
    VARIAVEIS_MARCA.forEach((v) => raiz.setProperty(v, cor))
  } else {
    VARIAVEIS_MARCA.forEach((v) => raiz.removeProperty(v))
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioLogado | null>(null)
  const [carregando, setCarregando] = useState(true)

  function sair() {
    clearToken()
    setUsuario(null)
  }

  useEffect(() => {
    if (!getToken()) {
      setCarregando(false)
      return
    }
    authApi
      .me()
      .then(setUsuario)
      .catch(() => clearToken())
      .finally(() => setCarregando(false))
  }, [])

  useEffect(() => {
    window.addEventListener('sessao-expirada', sair)
    return () => window.removeEventListener('sessao-expirada', sair)
  }, [])

  useEffect(() => {
    aplicarMarca(usuario?.clinica?.cor_primaria)
  }, [usuario?.clinica?.cor_primaria])

  async function entrar(email: string, senha: string) {
    const { token, usuario: dados } = await authApi.login(email, senha)
    setToken(token)
    setUsuario(dados)
  }

  async function atualizarUsuario() {
    const dados = await authApi.me()
    setUsuario(dados)
  }

  return (
    <AuthContext.Provider value={{ usuario, carregando, entrar, sair, atualizarUsuario }}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
