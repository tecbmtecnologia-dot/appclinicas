import { useEffect, useRef, useState } from 'react'
import { Camera, CheckCircle2, Clock, FileDown, MapPin, RotateCcw } from 'lucide-react'
import { Badge, Button, Card, PageHeader } from '../../components/ui'
import { pontosApi } from '../../api/pontos'
import { useAuth } from '../../contexts/AuthContext'
import { ApiError } from '../../api/client'
import type { Ponto as PontoType, ResumoSemanaUsuario, TipoMarcacaoPonto, TipoPonto } from '../../types'

function formatarHoras(h: number) {
  const sinal = h < 0 ? '-' : ''
  const abs = Math.abs(h)
  const horas = Math.floor(abs)
  const minutos = Math.round((abs - horas) * 60)
  return `${sinal}${horas}h${String(minutos).padStart(2, '0')}`
}

function formatarDiaCurto(iso: string) {
  const d = new Date(`${iso}T00:00:00`)
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
}

function SemanaAtual() {
  const [dados, setDados] = useState<ResumoSemanaUsuario | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    pontosApi
      .semana()
      .then(setDados)
      .finally(() => setCarregando(false))
  }, [])

  if (carregando) return <p className="text-sm text-slate-400">Carregando...</p>
  if (!dados) return null

  return (
    <Card className="p-5">
      <p className="text-sm font-semibold text-slate-700 mb-3">Esta semana</p>
      <div className="space-y-1.5 mb-3">
        {dados.dias.map((d) => (
          <div key={d.data} className="flex items-center justify-between text-sm">
            <span className="text-slate-500 capitalize">{formatarDiaCurto(d.data)}</span>
            <span className="font-medium text-slate-700">{formatarHoras(d.horas_trabalhadas)}</span>
          </div>
        ))}
        {dados.dias.length === 0 && <p className="text-sm text-slate-400">Nenhuma marcação nesta semana ainda.</p>}
      </div>
      <div className="border-t border-slate-100 pt-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-800">Total da semana</span>
        <span className="font-bold text-slate-800">{formatarHoras(dados.horas_trabalhadas)}</span>
      </div>
      {dados.horas_esperadas != null && (
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-slate-400">Meta da semana (jornada cadastrada)</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">{formatarHoras(dados.horas_esperadas)}</span>
            <Badge tone={dados.saldo != null && dados.saldo < 0 ? 'red' : 'green'}>
              {dados.saldo != null && dados.saldo > 0 ? '+' : ''}
              {dados.saldo != null ? formatarHoras(dados.saldo) : '—'}
            </Badge>
          </div>
        </div>
      )}
    </Card>
  )
}

const ROTULOS_TIPO: Record<TipoPonto, string> = {
  entrada: 'Entrada',
  inicio_intervalo: 'Início do intervalo',
  fim_intervalo: 'Fim do intervalo',
  saida: 'Saída',
}

const ROTULOS_MARCACAO: Record<TipoMarcacaoPonto, string> = {
  ...ROTULOS_TIPO,
  sem_intervalo: 'Sem intervalo hoje',
}

const SEQUENCIA: Record<TipoPonto | 'nenhum', TipoPonto> = {
  nenhum: 'entrada',
  entrada: 'inicio_intervalo',
  inicio_intervalo: 'fim_intervalo',
  fim_intervalo: 'saida',
  saida: 'entrada',
}

function hoje() {
  return new Date().toISOString().slice(0, 10)
}

function horario(dataHora: string) {
  return new Date(dataHora.replace(' ', 'T')).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function obterLocalizacao(): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000 },
    )
  })
}

export default function Ponto() {
  const { usuario } = useAuth()
  const [registrosHoje, setRegistrosHoje] = useState<PontoType[]>([])
  const [carregando, setCarregando] = useState(true)
  const [tipoSelecionado, setTipoSelecionado] = useState<TipoMarcacaoPonto | null>(null)
  const [streamAtivo, setStreamAtivo] = useState(false)
  const [fotoUrl, setFotoUrl] = useState<string | null>(null)
  const [fotoBlob, setFotoBlob] = useState<Blob | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState<(Omit<PontoType, 'tipo'> & { tipo: TipoMarcacaoPonto }) | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  function carregar() {
    setCarregando(true)
    pontosApi
      .listar({ data_inicio: hoje(), data_fim: hoje() })
      .then(setRegistrosHoje)
      .finally(() => setCarregando(false))
  }

  useEffect(carregar, [])

  useEffect(() => {
    const ultimo = registrosHoje[0]
    setTipoSelecionado(SEQUENCIA[ultimo?.tipo ?? 'nenhum'])
  }, [registrosHoje])

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  async function ativarCamera() {
    setErro(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setStreamAtivo(true)
    } catch {
      setErro('Não foi possível acessar a câmera. A foto é obrigatória para bater o ponto — permita o acesso e tente novamente.')
    }
  }

  function pararCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setStreamAtivo(false)
  }

  function tirarFoto() {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx?.drawImage(video, 0, 0)
    canvas.toBlob((blob) => {
      if (blob) {
        setFotoBlob(blob)
        setFotoUrl(URL.createObjectURL(blob))
      }
    }, 'image/jpeg', 0.85)
    pararCamera()
  }

  function refazerFoto() {
    setFotoBlob(null)
    setFotoUrl(null)
    ativarCamera()
  }

  async function baterPonto() {
    if (!tipoSelecionado || !fotoBlob) return
    setEnviando(true)
    setErro(null)
    setResultado(null)
    try {
      const posicao = await obterLocalizacao()
      if (!posicao) {
        setErro('Não foi possível obter sua localização. Ative o GPS e permita o acesso à localização para bater o ponto.')
        return
      }
      const registro = await pontosApi.bater({
        tipo: tipoSelecionado,
        latitude: posicao.coords.latitude,
        longitude: posicao.coords.longitude,
        foto: fotoBlob,
      })
      setResultado(registro)
      setFotoBlob(null)
      setFotoUrl(null)
      carregar()
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Erro ao registrar o ponto.')
    } finally {
      setEnviando(false)
    }
  }

  const mesAtual = new Date()

  return (
    <div>
      <PageHeader
        title="Ponto eletrônico"
        subtitle="Registre entrada, intervalo e saída"
        icon={Clock}
        action={
          usuario?.role === 'recepcao' ? (
            <Button
              variant="secondary"
              onClick={() =>
                pontosApi
                  .abrirFolhaFrequenciaPdf(mesAtual.getMonth() + 1, mesAtual.getFullYear())
                  .catch(() => alert('Erro ao gerar a folha de frequência.'))
              }
            >
              <FileDown className="h-3.5 w-3.5" /> Minha folha de frequência (PDF)
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <p className="text-sm font-semibold text-slate-700 mb-3">Tipo de marcação</p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {(Object.keys(ROTULOS_TIPO) as TipoPonto[]).map((tipo) => (
              <button
                key={tipo}
                onClick={() => setTipoSelecionado(tipo)}
                className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                  tipoSelecionado === tipo
                    ? 'border-brand-600 bg-brand-50 text-brand-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {ROTULOS_TIPO[tipo]}
              </button>
            ))}
          </div>
          {tipoSelecionado === 'inicio_intervalo' && (
            <button
              type="button"
              onClick={() => setTipoSelecionado('sem_intervalo')}
              className="text-xs font-medium text-brand-700 hover:text-brand-800 -mt-2 mb-4"
            >
              Não vou conseguir parar pro almoço hoje
            </button>
          )}
          {tipoSelecionado === 'sem_intervalo' && (
            <div className="-mt-2 mb-4 flex items-center justify-between rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
              <p className="text-xs text-amber-800">Vai registrar que não fez intervalo — esse período conta como trabalhado.</p>
              <button
                type="button"
                onClick={() => setTipoSelecionado('inicio_intervalo')}
                className="text-xs font-medium text-amber-800 underline shrink-0 ml-2"
              >
                Cancelar
              </button>
            </div>
          )}

          <div className="rounded-xl bg-slate-50 border border-slate-200 overflow-hidden mb-3">
            {fotoUrl ? (
              <img src={fotoUrl} alt="Selfie" className="w-full aspect-video object-cover" />
            ) : (
              <video ref={videoRef} muted playsInline className={`w-full aspect-video object-cover ${streamAtivo ? '' : 'hidden'}`} />
            )}
            {!streamAtivo && !fotoUrl && (
              <div className="aspect-video flex items-center justify-center text-slate-400 text-sm">
                Nenhuma foto capturada
              </div>
            )}
          </div>
          <canvas ref={canvasRef} className="hidden" />

          <div className="flex gap-2 mb-4">
            {!streamAtivo && !fotoUrl && (
              <Button type="button" variant="secondary" onClick={ativarCamera}>
                <Camera className="h-4 w-4" /> Ativar câmera
              </Button>
            )}
            {streamAtivo && (
              <Button type="button" variant="secondary" onClick={tirarFoto}>
                <Camera className="h-4 w-4" /> Tirar foto
              </Button>
            )}
            {fotoUrl && (
              <Button type="button" variant="ghost" onClick={refazerFoto}>
                <RotateCcw className="h-4 w-4" /> Refazer
              </Button>
            )}
          </div>

          <Button className="w-full justify-center" onClick={baterPonto} disabled={!tipoSelecionado || !fotoBlob || enviando}>
            {enviando ? 'Registrando...' : `Bater ponto — ${tipoSelecionado ? ROTULOS_MARCACAO[tipoSelecionado] : ''}`}
          </Button>
          {!fotoBlob && <p className="text-xs text-slate-400 mt-2 text-center">Tire a foto pra poder bater o ponto.</p>}

          {erro && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-3">{erro}</p>}

          {resultado && (
            <div className="mt-3 rounded-lg border px-3 py-2 text-sm flex items-start gap-2 border-emerald-200 bg-emerald-50 text-emerald-800">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">{ROTULOS_MARCACAO[resultado.tipo]} registrada às {horario(resultado.data_hora)}</p>
                {resultado.distancia_metros != null && (
                  <p>Dentro do raio de {resultado.local_referencia ?? 'atendimento'} ({resultado.distancia_metros}m).</p>
                )}
              </div>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <p className="text-sm font-semibold text-slate-700 mb-3">Hoje</p>
          {carregando ? (
            <p className="text-sm text-slate-400">Carregando...</p>
          ) : registrosHoje.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhuma marcação hoje ainda.</p>
          ) : (
            <div className="space-y-2">
              {[...registrosHoje].reverse().map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                  <div className="flex items-center gap-2">
                    {r.foto_url && <img src={r.foto_url} alt="" className="h-8 w-8 rounded-full object-cover" />}
                    <div>
                      <p className="text-sm font-medium text-slate-700">{ROTULOS_TIPO[r.tipo]}</p>
                      <p className="text-xs text-slate-400 flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {r.distancia_metros != null ? `${Math.round(r.distancia_metros)}m` : 'sem localização'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-800">{horario(r.data_hora)}</p>
                    <Badge tone={r.dentro_raio ? 'green' : 'amber'}>{r.dentro_raio ? 'No local' : 'Fora do raio'}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <SemanaAtual />
      </div>
    </div>
  )
}
