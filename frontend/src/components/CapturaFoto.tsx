import { useEffect, useRef, useState } from 'react'
import { Camera, ImageOff, RotateCcw, Upload, ZoomIn, ZoomOut } from 'lucide-react'
import { Button } from './ui'

// Ajuste de zoom/posição depois de escolher a imagem (câmera ou arquivo) —
// arrasta pra reposicionar e o slider pra dar zoom, antes de confirmar o
// recorte final. Funciona igual em mouse (desktop) e toque (mobile) porque
// usa Pointer Events, que unificam os dois.
function ModalAjusteFoto({
  imagemUrl,
  formato,
  onCancelar,
  onConfirmar,
}: {
  imagemUrl: string
  formato: 'circulo' | 'quadrado'
  onCancelar: () => void
  onConfirmar: (blob: Blob) => void
}) {
  const TAMANHO = 260
  const SAIDA = 480
  const imgRef = useRef<HTMLImageElement>(null)
  const [dimensoes, setDimensoes] = useState<{ w: number; h: number } | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const arrastando = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)

  const baseScale = dimensoes ? Math.max(TAMANHO / dimensoes.w, TAMANHO / dimensoes.h) : 1
  const escala = baseScale * zoom
  const dispW = dimensoes ? dimensoes.w * escala : TAMANHO
  const dispH = dimensoes ? dimensoes.h * escala : TAMANHO
  const maxPanX = Math.max(0, (dispW - TAMANHO) / 2)
  const maxPanY = Math.max(0, (dispH - TAMANHO) / 2)

  function limitar(p: { x: number; y: number }) {
    return {
      x: Math.min(maxPanX, Math.max(-maxPanX, p.x)),
      y: Math.min(maxPanY, Math.max(-maxPanY, p.y)),
    }
  }

  // Sempre que o zoom (ou a imagem) muda, o quanto dá pra arrastar também muda —
  // reencaixa a posição atual dentro do novo limite pra nunca sobrar espaço vazio.
  useEffect(() => {
    setPan((p) => limitar(p))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, dimensoes])

  function aoCarregarImagem() {
    const img = imgRef.current
    if (img) setDimensoes({ w: img.naturalWidth, h: img.naturalHeight })
  }

  function aoPressionar(e: React.PointerEvent<HTMLDivElement>) {
    arrastando.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  function aoMover(e: React.PointerEvent<HTMLDivElement>) {
    if (!arrastando.current) return
    const dx = e.clientX - arrastando.current.x
    const dy = e.clientY - arrastando.current.y
    setPan(limitar({ x: arrastando.current.panX + dx, y: arrastando.current.panY + dy }))
  }
  function aoSoltar() {
    arrastando.current = null
  }

  function confirmar() {
    const img = imgRef.current
    if (!img || !dimensoes) return
    // Ponto (0,0) do container, convertido pro espaço da imagem original —
    // é dali que recorta o quadrado final que vai virar a foto salva.
    const offsetX = (TAMANHO - dispW) / 2 + pan.x
    const offsetY = (TAMANHO - dispH) / 2 + pan.y
    const sx = -offsetX / escala
    const sy = -offsetY / escala
    const sw = TAMANHO / escala
    const sh = TAMANHO / escala
    const canvas = document.createElement('canvas')
    canvas.width = SAIDA
    canvas.height = SAIDA
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, SAIDA, SAIDA)
    canvas.toBlob((blob) => blob && onConfirmar(blob), 'image/jpeg', 0.9)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-5 w-full max-w-sm space-y-4">
        <p className="font-semibold text-slate-800">Ajustar foto</p>
        <div
          className={`relative mx-auto overflow-hidden bg-slate-900 touch-none select-none ${
            formato === 'circulo' ? 'rounded-full' : 'rounded-xl'
          }`}
          style={{ width: TAMANHO, height: TAMANHO, cursor: 'grab' }}
          onPointerDown={aoPressionar}
          onPointerMove={aoMover}
          onPointerUp={aoSoltar}
          onPointerLeave={aoSoltar}
        >
          <img
            ref={imgRef}
            src={imagemUrl}
            onLoad={aoCarregarImagem}
            draggable={false}
            alt=""
            className="absolute top-1/2 left-1/2 max-w-none select-none pointer-events-none"
            style={{
              width: dispW,
              height: dispH,
              transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px)`,
            }}
          />
        </div>
        <div className="flex items-center gap-2">
          <ZoomOut className="h-4 w-4 text-slate-400 shrink-0" />
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 accent-brand-600"
          />
          <ZoomIn className="h-4 w-4 text-slate-400 shrink-0" />
        </div>
        <p className="text-xs text-slate-400 text-center">Arraste a imagem pra reposicionar</p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onCancelar}>
            Cancelar
          </Button>
          <Button type="button" onClick={confirmar}>
            Usar esta foto
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function CapturaFoto({
  fotoAtualUrl,
  onNovaFoto,
  formato = 'circulo',
}: {
  fotoAtualUrl?: string | null
  onNovaFoto: (blob: Blob) => void
  formato?: 'circulo' | 'quadrado'
}) {
  const [streamAtivo, setStreamAtivo] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [imagemParaAjustar, setImagemParaAjustar] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  async function ativarCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setStreamAtivo(true)
    } catch {
      alert('Não foi possível acessar a câmera. Você pode enviar uma foto do dispositivo.')
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
    canvas.getContext('2d')?.drawImage(video, 0, 0)
    canvas.toBlob(
      (blob) => {
        if (blob) setImagemParaAjustar(URL.createObjectURL(blob))
      },
      'image/jpeg',
      0.9,
    )
    pararCamera()
  }

  function selecionarArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]
    if (!arquivo) return
    setImagemParaAjustar(URL.createObjectURL(arquivo))
    e.target.value = ''
  }

  function aoConfirmarAjuste(blob: Blob) {
    setPreviewUrl(URL.createObjectURL(blob))
    onNovaFoto(blob)
    setImagemParaAjustar(null)
  }

  const mostrarPreview = previewUrl ?? fotoAtualUrl
  const formaClasse = formato === 'circulo' ? 'rounded-full' : 'rounded-lg'

  return (
    <div className="flex items-center gap-4">
      <div
        className={`h-20 w-20 shrink-0 overflow-hidden bg-slate-100 flex items-center justify-center ring-1 ring-slate-200 ${formaClasse}`}
      >
        {mostrarPreview ? (
          <img src={mostrarPreview} alt="" className="h-full w-full object-cover" />
        ) : (
          <ImageOff className="h-8 w-8 text-slate-300" />
        )}
      </div>
      <div className="flex-1 space-y-2">
        {streamAtivo ? (
          <>
            <video ref={videoRef} muted playsInline className="w-full max-w-[220px] rounded-lg aspect-video object-cover bg-slate-900" />
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={tirarFoto}>
                <Camera className="h-3.5 w-3.5" /> Capturar
              </Button>
              <Button type="button" variant="ghost" onClick={pararCamera}>
                Cancelar
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={ativarCamera}>
              <Camera className="h-3.5 w-3.5" /> Tirar foto
            </Button>
            <Button type="button" variant="secondary" onClick={() => inputRef.current?.click()}>
              <Upload className="h-3.5 w-3.5" /> Enviar imagem
            </Button>
            {mostrarPreview && (
              <Button type="button" variant="ghost" onClick={() => setPreviewUrl(null)}>
                <RotateCcw className="h-3.5 w-3.5" /> Remover
              </Button>
            )}
          </div>
        )}
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={selecionarArquivo} />
      </div>
      <canvas ref={canvasRef} className="hidden" />

      {imagemParaAjustar && (
        <ModalAjusteFoto
          imagemUrl={imagemParaAjustar}
          formato={formato}
          onCancelar={() => setImagemParaAjustar(null)}
          onConfirmar={aoConfirmarAjuste}
        />
      )}
    </div>
  )
}
