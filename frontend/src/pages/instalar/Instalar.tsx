import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Smartphone, TriangleAlert } from 'lucide-react'
import { Button, Card } from '../../components/ui'
import { instalarApi } from '../../api/instalar'
import { ApiError } from '../../api/client'
import type { InstalarInfo } from '../../types'

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

export default function Instalar() {
  const { clinicaSlug, perfilSlug } = useParams<{ clinicaSlug: string; perfilSlug: string }>()
  const [info, setInfo] = useState<InstalarInfo | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)

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

            {abriuEmNavegadorEmbutido() && (
              <div className="text-left text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex items-start gap-2">
                <TriangleAlert className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />
                <span>
                  Você abriu esse link pelo WhatsApp, Instagram ou outro app parecido — esse navegador interno não
                  tem a opção de instalar. Toque nos "⋮" (ou no ícone de abrir no navegador) dessa tela e escolha
                  <strong> "Abrir no navegador"</strong> (ou "Abrir no Chrome") antes de continuar.
                </span>
              </div>
            )}

            <div className="text-left text-sm text-slate-600 space-y-3 bg-slate-50 rounded-xl p-4 mb-6">
              <p className="flex items-start gap-2">
                <Smartphone className="h-4 w-4 mt-0.5 shrink-0 text-brand-700" />
                <span>
                  <strong>Android:</strong> toque no menu (⋮) do navegador e escolha "Instalar app" ou "Adicionar à tela inicial".
                  Se essas opções não aparecerem, você provavelmente está num navegador embutido (WhatsApp,
                  Instagram etc.) — abra o link no Chrome de verdade primeiro.
                </span>
              </p>
              <p className="flex items-start gap-2">
                <Smartphone className="h-4 w-4 mt-0.5 shrink-0 text-brand-700" />
                <span>
                  <strong>iPhone (Safari):</strong> toque em Compartilhar e escolha "Adicionar à Tela de Início".
                </span>
              </p>
            </div>

            <Link to={`/entrar/${clinicaSlug}`}>
              <Button className="w-full justify-center">Entrar no sistema</Button>
            </Link>
          </>
        )}
      </Card>
    </div>
  )
}
