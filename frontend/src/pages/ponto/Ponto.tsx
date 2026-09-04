import { useEffect, useRef, useState } from 'react'
import { Camera, CheckCircle2, Clock, MapPin, RotateCcw, XCircle } from 'lucide-react'
import { Badge, Button, Card, PageHeader } from '../../components/ui'
import { pontosApi } from '../../api/pontos'
import { ApiError } from '../../api/client'
import type { Ponto as PontoType, TipoPonto } from '../../types'

const ROTULOS_TIPO: Record<TipoPonto, string> = {
  entrada: 'Entrada',
  inicio_intervalo: 'Início do intervalo',
  fim_intervalo: 'Fim do intervalo',
  saida: 'Saída',
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
  const [registrosHoje, setRegistrosHoje] = useState<PontoType[]>([])
  const [carregando, setCarregando] = useState(true)
  const [tipoSelecionado, setTipoSelecionado] = useState<TipoPonto | null>(null)
  const [streamAtivo, setStreamAtivo] = useState(false)
  const [fotoUrl, setFotoUrl] = useState<string | null>(null)
  const [fotoBlob, setFotoBlob] = useState<Blob | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState<PontoType | null>(null)
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
      setErro('Não foi possível acessar a câmera. Você ainda pode bater o ponto sem foto.')
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
    if (!tipoSelecionado) return
    setEnviando(true)
    setErro(null)
    setResultado(null)
    try {
      const posicao = await obterLocalizacao()
      const registro = await pontosApi.bater({
        tipo: tipoSelecionado,
        latitude: posicao?.coords.latitude,
        longitude: posicao?.coords.longitude,
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

  return (
    <div>
      <PageHeader title="Ponto eletrônico" subtitle="Registre entrada, intervalo e saída" icon={Clock} />

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

          <Button className="w-full justify-center" onClick={baterPonto} disabled={!tipoSelecionado || enviando}>
            {enviando ? 'Registrando...' : `Bater ponto — ${tipoSelecionado ? ROTULOS_TIPO[tipoSelecionado] : ''}`}
          </Button>

          {erro && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-3">{erro}</p>}

          {resultado && (
            <div
              className={`mt-3 rounded-lg border px-3 py-2 text-sm flex items-start gap-2 ${
                resultado.dentro_raio ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'
              }`}
            >
              {resultado.dentro_raio ? <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" /> : <XCircle className="h-4 w-4 mt-0.5 shrink-0" />}
              <div>
                <p className="font-medium">{ROTULOS_TIPO[resultado.tipo]} registrada às {horario(resultado.data_hora)}</p>
                {resultado.distancia_metros != null ? (
                  <p>
                    {resultado.dentro_raio
                      ? `Dentro do raio de ${resultado.local_referencia ?? 'atendimento'} (${resultado.distancia_metros}m).`
                      : `Fora do raio esperado (${resultado.distancia_metros}m de ${resultado.local_referencia ?? 'atendimento'}) — sinalizado para o RH.`}
                  </p>
                ) : (
                  <p>Localização não verificada.</p>
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
    </div>
  )
}
