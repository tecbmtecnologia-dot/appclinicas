import type { Context } from 'https://edge.netlify.com'

// Equivalente em produção do plugin `instalarMetaPlugin` do vite.config.ts.
// Aquele plugin só roda no `vite dev` (hook configureServer); o HTML que o
// Netlify serve em produção é o dist/index.html estático, então sem isto
// toda instalação em produção mostrava o manifest genérico "CLÍNICAS" e,
// por o Chrome/Android avaliar a instalabilidade com base no manifest do
// carregamento inicial (não em trocas via JS depois que a página já
// carregou), a opção "Instalar app" no menu ⋮ podia nem aparecer.
const BACKEND_URL = 'https://app-clinicas-backend.onrender.com'

function escapeHtml(valor: string) {
  return valor
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export default async (request: Request, context: Context) => {
  const url = new URL(request.url)
  const match = url.pathname.match(/^\/instalar\/([^/?]+)\/([^/?]+)/)
  if (!match) return context.next()

  const [, clinicaSlug, perfilSlug] = match

  const response = await context.next()
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('text/html')) return response

  try {
    const infoResponse = await fetch(
      `${BACKEND_URL}/api/instalar-info/${encodeURIComponent(clinicaSlug)}/${encodeURIComponent(perfilSlug)}`,
    )
    if (!infoResponse.ok) return response

    const info = (await infoResponse.json()) as {
      perfil_nome: string
      clinica_nome: string
      logo_url?: string | null
    }

    const html = await response.text()
    const titulo = escapeHtml(`${info.perfil_nome} — ${info.clinica_nome}`)
    const perfilNomeEscapado = escapeHtml(info.perfil_nome)
    const iconeHref = escapeHtml(info.logo_url || '/icons/icon-192.png')

    const novoHtml = html
      .replace(/<title>.*?<\/title>/, `<title>${titulo}</title>`)
      .replace(
        /<link rel="manifest" href="[^"]*"\s*\/?>/,
        `<link rel="manifest" href="/api/manifest/${clinicaSlug}/${perfilSlug}">`,
      )
      .replace(
        /<link rel="apple-touch-icon" href="[^"]*"\s*\/?>/,
        `<link rel="apple-touch-icon" href="${iconeHref}" />`,
      )
      .replace(
        '</head>',
        `<meta name="apple-mobile-web-app-title" content="${perfilNomeEscapado}" /><meta name="apple-mobile-web-app-capable" content="yes" /></head>`,
      )

    return new Response(novoHtml, response)
  } catch {
    return response
  }
}

export const config = { path: '/instalar/:clinicaSlug/:perfilSlug' }
