import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { CalendarDays, ClipboardList, Lock, Mail, ShieldCheck, Stethoscope, Video } from 'lucide-react'
import { Button, Card, Input, Label } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'
import { ApiError } from '../api/client'

const destaques = [
  { icon: CalendarDays, texto: 'Agenda e telemedicina em um só lugar' },
  { icon: ClipboardList, texto: 'Prontuário eletrônico organizado' },
  { icon: ShieldCheck, texto: 'Dados de cada clínica totalmente isolados' },
]

export default function Login() {
  const { usuario, entrar } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (usuario) {
    const destino = (location.state as { from?: string } | null)?.from ?? '/'
    return <Navigate to={destino} replace />
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setEnviando(true)
    try {
      await entrar(email, senha)
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Não foi possível entrar. Verifique se o backend está rodando.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-slate-50">
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-brand-800 px-12 py-12 text-white">
        <div className="absolute inset-0 bg-clinical-pattern text-white/[0.06]" />
        <div
          className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-brand-600/40 blur-3xl"
          aria-hidden
        />

        <div className="relative flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
            <Stethoscope className="h-5 w-5" strokeWidth={2.25} />
          </div>
          <span className="font-bold text-lg tracking-tight">Clínicas</span>
        </div>

        <div className="relative max-w-sm">
          <h1 className="text-3xl font-bold tracking-tight leading-tight mb-4">
            Gestão completa para clínicas de qualquer especialidade.
          </h1>
          <p className="text-brand-100/80 text-sm leading-relaxed">
            Agendamento, prontuário eletrônico, administração e telemedicina em um único sistema —
            com a identidade visual da sua clínica.
          </p>
          <ul className="mt-8 space-y-3">
            {destaques.map((d) => (
              <li key={d.texto} className="flex items-center gap-3 text-sm text-brand-50/90">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <d.icon className="h-4 w-4" strokeWidth={2} />
                </span>
                {d.texto}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center gap-2 text-xs text-brand-100/60">
          <Video className="h-3.5 w-3.5" />
          Funciona instalado como app, no computador e no celular
        </div>
      </div>

      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 justify-center mb-8 lg:hidden">
            <div className="h-10 w-10 rounded-xl bg-brand-700 flex items-center justify-center text-white">
              <Stethoscope className="h-5 w-5" strokeWidth={2.25} />
            </div>
            <span className="font-bold text-slate-900 text-lg">Clínicas</span>
          </div>

          <Card className="p-7">
            <h2 className="text-xl font-bold text-slate-900 mb-1">Entrar</h2>
            <p className="text-sm text-slate-500 mb-6">Acesse com seu e-mail e senha cadastrados.</p>
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <Label>E-mail</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="email"
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-9"
                  />
                </div>
              </div>
              <div>
                <Label>Senha</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    required
                    className="pl-9"
                  />
                </div>
              </div>
              {erro && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{erro}</p>}
              <Button type="submit" className="w-full" disabled={enviando}>
                {enviando ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>
          </Card>
          <p className="text-xs text-slate-400 text-center mt-5">
            Primeiro acesso? Use admin@clinica.local / admin123 e depois troque a senha em Usuários.
          </p>
        </div>
      </div>
    </div>
  )
}
