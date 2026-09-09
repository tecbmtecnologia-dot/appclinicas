import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig, type Plugin } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Serve um HTML com título/ícone/manifest já corretos para cada link de
// instalação (/instalar/:clinicaSlug/:perfilSlug), em vez de trocar via JS
// depois do carregamento — o iOS "Adicionar à Tela de Início" só respeita
// os meta tags presentes no HTML servido, não alterações feitas depois via JS.
function instalarMetaPlugin(): Plugin {
  return {
    name: 'instalar-meta-html',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const match = req.url?.match(/^\/instalar\/([^/?]+)\/([^/?]+)/)
        if (!match) return next()
        const [, clinicaSlug, perfilSlug] = match
        try {
          const r = await fetch(`http://localhost:3001/api/instalar-info/${clinicaSlug}/${perfilSlug}`)
          if (!r.ok) return next()
          const info = (await r.json()) as { perfil_nome: string; clinica_nome: string; logo_url?: string | null }

          const raw = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8')
          let html = await server.transformIndexHtml(req.url!, raw)

          const titulo = `${info.perfil_nome} — ${info.clinica_nome}`
          html = html
            .replace(/<title>.*?<\/title>/, `<title>${titulo}</title>`)
            .replace(
              '<link rel="manifest" href="/manifest.webmanifest">',
              `<link rel="manifest" href="/api/manifest/${clinicaSlug}/${perfilSlug}">`,
            )
            .replace(
              '<link rel="apple-touch-icon" href="/icons/icon-192.png" />',
              `<link rel="apple-touch-icon" href="${info.logo_url || '/icons/icon-192.png'}" />`,
            )
            .replace(
              '</head>',
              `<meta name="apple-mobile-web-app-title" content="${info.perfil_nome}" /><meta name="apple-mobile-web-app-capable" content="yes" /></head>`,
            )

          res.setHeader('Content-Type', 'text/html')
          res.end(html)
        } catch {
          next()
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    instalarMetaPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'CLÍNICAS',
        short_name: 'CLÍNICAS',
        description: 'Sistema de gestão para clínicas médicas: agendamento, prontuário, administrativo e telemedicina.',
        theme_color: '#0e6f68',
        background_color: '#f8fafc',
        display: 'standalone',
        start_url: '/ponto',
        scope: '/',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        // API calls should always go to the network, never be cached as app-shell
        navigateFallbackDenylist: [/^\/api\//],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
  server: {
    host: true,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
      },
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
