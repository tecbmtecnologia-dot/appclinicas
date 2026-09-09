import { useEffect, useRef, useState } from 'react'
import { Camera, ImageOff, RotateCcw, Upload } from 'lucide-react'
import { Button } from './ui'

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
        if (blob) {
          setPreviewUrl(URL.createObjectURL(blob))
          onNovaFoto(blob)
        }
      },
      'image/jpeg',
      0.85,
    )
    pararCamera()
  }

  function selecionarArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]
    if (!arquivo) return
    setPreviewUrl(URL.createObjectURL(arquivo))
    onNovaFoto(arquivo)
    e.target.value = ''
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
    </div>
  )
}
