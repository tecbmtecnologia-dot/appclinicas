import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { notificacoesApi } from '../api/notificacoes'
import type { Notificacao } from '../types'

const ROTAS_POR_TIPO: Record<string, string> = {
  relatorio_cirurgico: '/cirurgias',
  reuniao: '/reunioes',
}

function tempoRelativo(dataIso: string) {
  const ms = Date.now() - new Date(dataIso.replace(' ', 'T')).getTime()
  const min = Math.floor(ms / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `${min}min atrás`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h atrás`
  return `${Math.floor(h / 24)}d atrás`
}

export default function NotificationBell() {
  const navigate = useNavigate()
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([])
  const [aberto, setAberto] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  function carregar() {
    notificacoesApi.listar().then(setNotificacoes).catch(() => {})
  }

  useEffect(() => {
    carregar()
    const intervalo = setInterval(carregar, 25000)
    return () => clearInterval(intervalo)
  }, [])

  useEffect(() => {
    function aoClicarFora(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setAberto(false)
    }
    document.addEventListener('mousedown', aoClicarFora)
    return () => document.removeEventListener('mousedown', aoClicarFora)
  }, [])

  const naoLidas = notificacoes.filter((n) => !n.lida).length

  async function abrirNotificacao(n: Notificacao) {
    if (!n.lida) {
      await notificacoesApi.marcarLida(n.id)
      setNotificacoes((atual) => atual.map((x) => (x.id === n.id ? { ...x, lida: 1 } : x)))
    }
    setAberto(false)
    const rota = ROTAS_POR_TIPO[n.tipo]
    if (rota) navigate(rota)
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setAberto((v) => !v)}
        className="relative flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
      >
        <Bell className="h-[18px] w-[18px]" strokeWidth={2} />
        {naoLidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {naoLidas > 9 ? '9+' : naoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <div className="absolute right-0 bottom-full mb-2 md:bottom-auto md:top-full md:mt-2 z-50 w-80 max-h-96 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="px-4 py-2.5 border-b border-slate-100 font-semibold text-sm text-slate-700">Notificações</div>
          {notificacoes.length === 0 ? (
            <p className="text-sm text-slate-400 px-4 py-6 text-center">Nenhuma notificação.</p>
          ) : (
            notificacoes.map((n) => (
              <button
                key={n.id}
                onClick={() => abrirNotificacao(n)}
                className={`w-full text-left px-4 py-2.5 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors ${
                  !n.lida ? 'bg-brand-50/50' : ''
                }`}
              >
                <div className="flex items-start gap-2">
                  {!n.lida && <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-brand-600 shrink-0" />}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{n.titulo}</p>
                    {n.mensagem && <p className="text-xs text-slate-500 truncate">{n.mensagem}</p>}
                    <p className="text-[11px] text-slate-400 mt-0.5">{tempoRelativo(n.created_at)}</p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
