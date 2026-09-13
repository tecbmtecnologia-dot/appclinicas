import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CheckCircle2, MoreVertical, Share, SquarePlus, Smartphone, TriangleAlert } from 'lucide-react'
import { Button, Card } from '../../components/ui'
import { instalarApi } from '../../api/instalar'
import { ApiError } from '../../api/client'
import type { InstalarInfo } from '../../types'

// Evento não-padrão do Chrome/Android — a lib de tipos do TS não o inclui.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function aplicarMetadadosInstalacao(info: InstalarInfo, clinicaSlug: string, perfilSlug: string) {
  document.title = `${info.perfil_nome} — ${info.clinica_nome}`

  let manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null
  if (!manifestLink) {
    manifestLink = document.createElement('link')
    manifestLink.rel = 'manifest'
    document.head.appendChild(manifestLink)
  }
  manifestLink.setAttribute('href', `/api/manifest/${clinicaSlug}/${perfilSlug}`)

  let appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]') as HTMLMetaElement | null
  if (!appleTitle) {
    appleTitle = document.createElement('meta')
    appleTitle.setAttribute('name', 'apple-mobile-web-app-title')
    document.head.appendChild(appleTitle)
  }
  appleTitle.setAttribute('content', info.perfil_nome)

  if (!document.querySelector('meta[name="apple-mobile-web-app-capable"]')) {
    const meta = document.createElement('meta')
    meta.setAttribute('name', 'apple-mobile-web-app-capable')
    meta.setAttribute('content', 'yes')
    document.head.appendChild(meta)
  }

  if (info.logo_url) {
    let appleIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement | null
    if (!appleIcon) {
      appleIcon = document.createElement('link')
      appleIcon.rel = 'apple-touch-icon'
      document.head.appendChild(appleIcon)
    }
    appleIcon.setAttribute('href', info.logo_url)
  }
}

// WhatsApp, Instagram, Facebook etc. abrem links num navegador embutido sem
// as opções de instalar PWA (o menu ⋮ deles nem tem "Instalar app" nem
// "Adicionar à tela inicial") — precisa abrir no navegador de verdade antes.
function abriuEmNavegadorEmbutido() {
  const ua = navigator.userAgent || ''
  return /FBAN|FBAV|Instagram|WhatsApp|Line\/|MicroMessenger|; ?wv\)/i.test(ua)
}

function detectarIOS() {
  const ua = navigator.userAgent || ''
  if (/iPhone|iPad|iPod/.test(ua)) return true
  // iPadOS 13+ se identifica como "Macintosh" no user agent, só dá pra
  // diferenciar de um Mac de verdade pela presença de tela touch.
  return /Macintosh/.test(ua) && navigator.maxTouchPoints > 1
}

function detectarStandalone() {
  const navigatorIOS = navigator as Navigator & { standalone?: boolean }
  return window.matchMedia('(display-mode: standalone)').matches || navigatorIOS.standalone === true
}

export default function Instalar() {
  const { clinicaSlug, perfilSlug } = useParams<{ clinicaSlug: string; perfilSlug: string }>()
  const [info, setInfo] = useState<InstalarInfo | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [instalando, setInstalando] = useState(false)
  const [instalado, setInstalado] = useState(detectarStandalone)
  const [recusado, setRecusado] = useState(false)

  useEffect(() => {
    if (!clinicaSlug || !perfilSlug) return
    setCarregando(true)
    instalarApi
      .info(clinicaSlug, perfilSlug)
      .then((dados) => {
        setInfo(dados)
        aplicarMetadadosInstalacao(dados, clinicaSlug, perfilSlug)
      })
      .catch((err) => setErro(err instanceof ApiError ? err.message : 'Link de instalação não encontrado.'))
      .finally(() => setCarregando(false))
  }, [clinicaSlug, perfilSlug])

  useEffect(() => {
    const aoDisponibilizar = (evento: Event) => {
      evento.preventDefault()
      setDeferredPrompt(evento as BeforeInstallPromptEvent)
    }
    const aoInstalar = () => {
      setInstalado(true)
      setDeferredPrompt(null)
    }
    window.addEventListener('beforeinstallprompt', aoDisponibilizar)
    window.addEventListener('appinstalled', aoInstalar)
    return () => {
      window.removeEventListener('beforeinstallprompt', aoDisponibilizar)
      window.removeEventListener('appinstalled', aoInstalar)
    }
  }, [])

  async function instalarAgora() {
    if (!deferredPrompt) return
    setInstalando(true)
    setRecusado(false)
    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'dismissed') setRecusado(true)
    } finally {
      // O evento só pode ser usado uma vez.
      setDeferredPrompt(null)
      setInstalando(false)
    }
  }

  const ehIOS = detectarIOS()

  return (
    <div
      className="min-h-dvh flex items-center justify-center bg-slate-50 p-4"
      style={{
        paddingTop: 'max(1rem, env(safe-area-inset-top))',
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
      }}
    >
      <Card className="w-full max-w-sm p-6 text-center">
        {carregando ? (
          <p className="text-sm text-slate-400">Carregando...</p>
        ) : erro || !info ? (
          <p className="text-sm text-red-600">{erro ?? 'Link de instalação não encontrado.'}</p>
        ) : (
          <>
            {info.logo_url ? (
              <img src={info.logo_url} alt="" className="h-16 w-16 rounded-2xl object-cover ring-1 ring-slate-200 mx-auto mb-4" />
            ) : (
              <img src="/logo-tecbm.png" alt="" className="h-16 w-16 object-contain mx-auto mb-4" />
            )}
            <h1 className="text-lg font-bold text-slate-900">{info.perfil_nome}</h1>
            <p className="text-sm text-slate-500 mb-6">{info.clinica_nome}</p>

            {instalado ? (
              <div className="text-left text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6 flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600" />
                <span>App já instalado neste aparelho. É só abrir pelo ícone na tela inicial.</span>
              </div>
            ) : abriuEmNavegadorEmbutido() ? (
              <div className="text-left text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-2">
                <TriangleAlert className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />
                <span>
                  Você abriu esse link pelo WhatsApp, Instagram ou outro app parecido — esse navegador interno não
                  tem a opção de instalar. Toque nos "⋮" (ou no ícone de abrir no navegador) dessa tela e escolha
                  <strong> "Abrir no navegador"</strong> (ou "Abrir no Chrome"/"Abrir no Safari") antes de continuar.
                </span>
              </div>
            ) : deferredPrompt ? (
              <div className="mb-6">
                <Button
                  className="w-full justify-center gap-2"
                  onClick={instalarAgora}
                  disabled={instalando}
                >
                  <Smartphone className="h-4 w-4" />
                  {instalando ? 'Instalando...' : 'Instalar agora'}
                </Button>
                <p className="text-xs text-slate-400 mt-2">
                  Vai aparecer um popup do próprio Android pedindo pra confirmar — é só tocar em "Instalar".
                </p>
              </div>
            ) : (
              <div className="text-left text-sm text-slate-600 space-y-4 bg-slate-50 rounded-xl p-4 mb-6">
                {recusado && (
                  <p className="text-xs text-amber-700 -mt-1 mb-1">
                    Instalação cancelada. Pode tentar de novo pelo passo abaixo quando quiser.
                  </p>
                )}
                {ehIOS ? (
                  <>
                    <p className="font-semibold text-slate-800">Como instalar no iPhone/iPad:</p>
                    <p className="flex items-start gap-3">
                      <span className="shrink-0 h-5 w-5 rounded-full bg-brand-700 text-white text-xs font-bold flex items-center justify-center">1</span>
                      <span className="flex items-center gap-1.5">
                        Toque no ícone de <Share className="h-4 w-4 inline text-brand-700" /> <strong>Compartilhar</strong> (barra de baixo do Safari).
                      </span>
                    </p>
                    <p className="flex items-start gap-3">
                      <span className="shrink-0 h-5 w-5 rounded-full bg-brand-700 text-white text-xs font-bold flex items-center justify-center">2</span>
                      <span className="flex items-center gap-1.5">
                        Escolha <SquarePlus className="h-4 w-4 inline text-brand-700" /> <strong>"Adicionar à Tela de Início"</strong>.
                      </span>
                    </p>
                    <p className="text-xs text-slate-400">
                      O iPhone não deixa nenhum app instalar sozinho sem essa confirmação — é uma regra da Apple, vale pra qualquer site.
                    </p>
                  </>
                ) : (
                  <p className="flex items-start gap-2">
                    <MoreVertical className="h-4 w-4 mt-0.5 shrink-0 text-brand-700" />
                    <span>
                      Toque no menu (⋮) do navegador e escolha <strong>"Instalar app"</strong> ou "Adicionar à tela inicial".
                      Se essas opções não aparecerem, você provavelmente está num navegador embutido (WhatsApp,
                      Instagram etc.) — abra o link no Chrome de verdade primeiro.
                    </span>
                  </p>
                )}
              </div>
            )}

            <Link to={`/entrar/${clinicaSlug}`}>
              <Button variant={instalado ? 'primary' : 'ghost'} className="w-full justify-center">
                Entrar no sistema
              </Button>
            </Link>
          </>
        )}
      </Card>
    </div>
  )
}
