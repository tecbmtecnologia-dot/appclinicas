import { useEffect, useState } from 'react'
import { Navigate, useLocation, useParams } from 'react-router-dom'
import { CalendarDays, ClipboardList, Lock, Mail, ShieldCheck } from 'lucide-react'
import { Button, Card, Input, Label } from '../components/ui'
import { clinicaPublicaApi, type ClinicaPublica } from '../api/clinicaPublica'
import { useAuth } from '../contexts/AuthContext'
import { ApiError } from '../api/client'
import { guardarClinicaAcessada } from '../lib/standalone'

const destaques = [
  { icon: CalendarDays, texto: 'Agenda e telemedicina em um só lugar' },
  { icon: ClipboardList, texto: 'Prontuário eletrônico organizado' },
  { icon: ShieldCheck, texto: 'Dados de cada clínica totalmente isolados' },
]

export default function Login() {
  const { usuario, entrar } = useAuth()
  const location = useLocation()
  const { clinicaSlug } = useParams<{ clinicaSlug?: string }>()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [lembrar, setLembrar] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [clinica, setClinica] = useState<ClinicaPublica | null>(null)

  useEffect(() => {
    if (!clinicaSlug) return
    guardarClinicaAcessada(clinicaSlug)
    clinicaPublicaApi
      .obter(clinicaSlug)
      .then((c) => {
        setClinica(c)
        document.title = `${c.nome} — Entrar`
      })
      .catch(() => {})
  }, [clinicaSlug])

  if (usuario) {
    const destino = (location.state as { from?: string } | null)?.from ?? '/'
    return <Navigate to={destino} replace />
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setEnviando(true)
    try {
      await entrar(email, senha, lembrar)
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Não foi possível entrar. Verifique se o backend está rodando.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="min-h-dvh grid lg:grid-cols-2 bg-slate-50">
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-brand-800 px-12 py-12 text-white">
        <div className="absolute inset-0 bg-clinical-pattern text-white/[0.06]" />
        <div
          className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-brand-600/40 blur-3xl"
          aria-hidden
        />

        <div className="relative flex justify-center">
          <div className="flex items-center gap-2 translate-x-3">
            <img src="/logo-tecbm.png" alt="" className="h-7 w-auto object-contain" />
            <span className="font-bold text-lg tracking-tight">CLÍNICAS</span>
          </div>
        </div>

        <div className="relative max-w-sm my-auto">
          <h1 className="text-3xl font-bold tracking-tight leading-tight mb-4">
            Gestão completa para clínicas de qualquer especialidade.
          </h1>
          <p className="text-sm leading-relaxed text-brand-100/80">
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

      </div>

      <div
        className="flex items-center justify-center px-4 py-12"
        style={{
          paddingTop: 'max(3rem, env(safe-area-inset-top))',
          paddingBottom: 'max(3rem, env(safe-area-inset-bottom))',
        }}
      >
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center text-center gap-2.5 mb-8">
            {clinica?.logo_url ? (
              <>
                <img src={clinica.logo_url} alt="" className="h-16 w-16 rounded-2xl object-cover ring-1 ring-slate-200" />
                <span className="font-bold text-slate-900 text-xl">{clinica.nome}</span>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <img src="/logo-tecbm.png" alt="" className="h-7 w-auto object-contain" />
                <span className="font-bold text-slate-900 text-lg">CLÍNICAS</span>
              </div>
            )}
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
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
                <input type="checkbox" checked={lembrar} onChange={(e) => setLembrar(e.target.checked)} />
                Manter-me conectado neste aparelho
              </label>
              {erro && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{erro}</p>}
              <Button type="submit" className="w-full" disabled={enviando}>
                {enviando ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>
          </Card>
          {!clinicaSlug && (
            <p className="text-xs text-slate-400 text-center mt-5">
              Primeiro acesso? Use admin@clinica.local / admin123 e depois troque a senha em Usuários.
            </p>
          )}
          <p className="flex items-center justify-center gap-1.5 text-[11px] text-slate-700 mt-3">
            Desenvolvido por TECBM - Bruno Martins Tecnologia
            <img src="/logo-tecbm.png" alt="" className="h-4 w-auto object-contain opacity-70" />
          </p>
        </div>
      </div>
    </div>
  )
}
