import express from 'express'
import cors from 'cors'
import { createServer } from 'node:http'
import { Server } from 'socket.io'
import { nanoid } from 'nanoid'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { db } from './db.js'

import pacientesRouter from './routes/pacientes.js'
import medicosRouter from './routes/medicos.js'
import auxiliaresRouter from './routes/auxiliares.js'
import hospitaisRouter from './routes/hospitais.js'
import itensCirurgiaRouter from './routes/itensCirurgia.js'
import tiposProcedimentoRouter from './routes/tiposProcedimento.js'
import sessoesFisioterapiaRouter from './routes/sessoesFisioterapia.js'
import agendamentosRouter from './routes/agendamentos.js'
import compromissosRouter from './routes/compromissos.js'
import relatoriosRouter from './routes/relatorios.js'
import prontuariosRouter from './routes/prontuarios.js'
import mensagensRouter from './routes/mensagens.js'
import authRouter from './routes/auth.js'
import usuariosRouter from './routes/usuarios.js'
import clinicasRouter from './routes/clinicas.js'
import minhaClinicaRouter from './routes/minhaClinica.js'
import pontosRouter from './routes/pontos.js'
import cirurgiasRouter from './routes/cirurgias.js'
import notificacoesRouter from './routes/notificacoes.js'
import orcamentosRouter from './routes/orcamentos.js'
import pagamentosRouter from './routes/pagamentos.js'
import despesasRouter from './routes/despesas.js'
import financasPessoaisRouter from './routes/financasPessoais.js'
import financeiroResumoRouter from './routes/financeiroResumo.js'
import reunioesRouter from './routes/reunioes.js'
import comissoesRouter from './routes/comissoes.js'
import perfisInstalacaoRouter from './routes/perfisInstalacao.js'
import dashboardRouter from './routes/dashboard.js'
import modelosReceitaRouter from './routes/modelosReceita.js'
import notasFiscaisPacienteRouter from './routes/notasFiscaisPaciente.js'
import contratosPacienteRouter from './routes/contratosPaciente.js'
import contratoModeloRouter from './routes/contratoModelo.js'
import estoqueRouter from './routes/estoque.js'
import fotosPacienteRouter from './routes/fotosPaciente.js'
import { requireAuth, requireRole, requireClinica } from './auth.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT || 3001
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, 'uploads')

// Em produção, restrinja via CORS_ORIGIN (uma ou mais origens separadas por
// vírgula, ex: "https://seu-site.netlify.app"). Sem essa env var, libera tudo
// (comportamento atual, usado em desenvolvimento local).
const origensPermitidas = process.env.CORS_ORIGIN?.split(',').map((o) => o.trim())

const app = express()
app.use(cors(origensPermitidas ? { origin: origensPermitidas } : {}))
app.use(express.json())
app.use('/uploads', express.static(UPLOADS_DIR))

app.get('/api/health', (req, res) => res.json({ ok: true }))

// Endpoints públicos (sem login) que alimentam o manifest.webmanifest dinâmico
// por perfil de instalação — o navegador lê isso antes de qualquer autenticação,
// no momento em que a pessoa instala o PWA na tela inicial do celular.
function tipoImagemPorUrl(url) {
  const ext = url?.split('.').pop()?.toLowerCase()
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
  if (ext === 'svg') return 'image/svg+xml'
  if (ext === 'webp') return 'image/webp'
  return 'image/png'
}

function buscarClinicaEPerfil(clinicaSlug, perfilSlug) {
  const clinica = db.prepare('SELECT * FROM clinicas WHERE slug = ?').get(clinicaSlug)
  if (!clinica) return null
  const perfil = db.prepare('SELECT * FROM perfis_instalacao WHERE clinica_id = ? AND slug = ?').get(clinica.id, perfilSlug)
  if (!perfil) return null
  return { clinica, perfil }
}

app.get('/api/clinica-publica/:clinicaSlug', (req, res) => {
  const clinica = db.prepare('SELECT * FROM clinicas WHERE slug = ? AND ativo = 1').get(req.params.clinicaSlug)
  if (!clinica) return res.status(404).json({ error: 'Clínica não encontrada' })
  res.json({ nome: clinica.nome, logo_url: clinica.logo_app_url || clinica.logo_url, cor_primaria: clinica.cor_primaria })
})

app.get('/api/instalar-info/:clinicaSlug/:perfilSlug', (req, res) => {
  const encontrado = buscarClinicaEPerfil(req.params.clinicaSlug, req.params.perfilSlug)
  if (!encontrado) return res.status(404).json({ error: 'Link de instalação não encontrado' })
  res.json({
    clinica_nome: encontrado.clinica.nome,
    logo_url: encontrado.clinica.logo_app_url || encontrado.clinica.logo_url,
    cor_primaria: encontrado.clinica.cor_primaria,
    perfil_nome: encontrado.perfil.nome,
  })
})

app.get('/api/manifest/:clinicaSlug/:perfilSlug', (req, res) => {
  const { clinicaSlug, perfilSlug } = req.params
  const encontrado = buscarClinicaEPerfil(clinicaSlug, perfilSlug)
  if (!encontrado) return res.status(404).json({ error: 'Link de instalação não encontrado' })
  const { clinica, perfil } = encontrado
  const logoClinica = clinica.logo_app_url || clinica.logo_url

  // Logo enviado pela clínica é um upload livre (o usuário manda qualquer
  // proporção/resolução), não garantidamente quadrado nem no tamanho exato
  // declarado — anunciar "192x192"/"512x512" quando o arquivo real não bate
  // com isso faz navegadores mais rígidos (inclusive o "Adicionar à Tela de
  // Início" do iOS) descartarem o ícone por não corresponder ao que foi
  // declarado. "any" é o valor correto do spec pra "serve em qualquer
  // tamanho, eu escalo". Só o ícone padrão do app (bundled, tamanho real
  // conhecido) usa sizes fixo — e evitamos "maskable" pro logo da clínica,
  // que corta agressivamente em formas (círculo etc.) e fica ruim numa foto
  // retangular qualquer.
  const icons = logoClinica
    ? [{ src: logoClinica, sizes: 'any', type: tipoImagemPorUrl(logoClinica) }]
    : [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ]

  res.set('Content-Type', 'application/manifest+json')
  res.json({
    id: `/instalar/${clinicaSlug}/${perfilSlug}`,
    name: `${perfil.nome} — ${clinica.nome}`,
    short_name: perfil.nome.slice(0, 20),
    description: `App da equipe ${clinica.nome}`,
    start_url: `/ponto?perfil=${perfilSlug}&clinica=${clinicaSlug}`,
    scope: '/',
    display: 'standalone',
    background_color: '#f8fafc',
    theme_color: clinica.cor_primaria || '#0e6f68',
    icons,
  })
})

app.use('/api/auth', authRouter)

app.use('/api/pacientes', requireAuth, requireClinica, pacientesRouter)
app.use('/api/medicos', requireAuth, requireClinica, medicosRouter)
app.use('/api/auxiliares', requireAuth, requireClinica, auxiliaresRouter)
app.use('/api/hospitais', requireAuth, requireClinica, hospitaisRouter)
app.use('/api/itens-cirurgia', requireAuth, requireClinica, itensCirurgiaRouter)
app.use('/api/tipos-procedimento', requireAuth, requireClinica, tiposProcedimentoRouter)
app.use('/api/sessoes-fisioterapia', requireAuth, requireClinica, sessoesFisioterapiaRouter)
app.use('/api/agendamentos', requireAuth, requireClinica, agendamentosRouter)
app.use('/api/compromissos', requireAuth, requireClinica, compromissosRouter)
app.use('/api/relatorios', requireAuth, requireClinica, relatoriosRouter)
app.use('/api/prontuarios', requireAuth, requireClinica, prontuariosRouter)
app.use('/api/mensagens', requireAuth, requireClinica, mensagensRouter)
app.use('/api/usuarios', requireAuth, requireClinica, usuariosRouter)
app.use('/api/minha-clinica', requireAuth, requireClinica, requireRole('admin'), minhaClinicaRouter)
app.use('/api/pontos', requireAuth, requireClinica, pontosRouter)
app.use('/api/cirurgias', requireAuth, requireClinica, cirurgiasRouter)
app.use('/api/notificacoes', requireAuth, requireClinica, notificacoesRouter)
app.use('/api/orcamentos', requireAuth, requireClinica, orcamentosRouter)
app.use('/api/pagamentos', requireAuth, requireClinica, pagamentosRouter)
app.use('/api/despesas', requireAuth, requireClinica, despesasRouter)
app.use('/api/financas-pessoais', requireAuth, requireClinica, financasPessoaisRouter)
app.use('/api/financeiro', requireAuth, requireClinica, financeiroResumoRouter)
app.use('/api/reunioes', requireAuth, requireClinica, reunioesRouter)
app.use('/api/comissoes', requireAuth, requireClinica, comissoesRouter)
app.use('/api/perfis-instalacao', requireAuth, requireClinica, requireRole('admin'), perfisInstalacaoRouter)
app.use('/api/dashboard', requireAuth, requireClinica, dashboardRouter)
app.use('/api/modelos-receita', requireAuth, requireClinica, modelosReceitaRouter)
app.use('/api/notas-fiscais-paciente', requireAuth, requireClinica, notasFiscaisPacienteRouter)
app.use('/api/contratos-paciente', requireAuth, requireClinica, contratosPacienteRouter)
app.use('/api/contrato-modelo', requireAuth, requireClinica, contratoModeloRouter)
app.use('/api/estoque', requireAuth, requireClinica, estoqueRouter)
app.use('/api/fotos-paciente', requireAuth, requireClinica, fotosPacienteRouter)
app.use('/api/clinicas', requireAuth, requireRole('super_admin'), clinicasRouter)

app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' })
})

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.name === 'MulterError' || /imagem|PDF/i.test(err.message || '')) {
    return res.status(400).json({ error: err.message })
  }
  console.error(err)
  res.status(500).json({ error: 'Erro interno do servidor' })
})

const httpServer = createServer(app)
const io = new Server(httpServer, {
  path: '/socket.io',
  cors: { origin: origensPermitidas ?? '*' },
})

io.on('connection', (socket) => {
  socket.on('entrar-sala', (sala) => {
    socket.join(sala)
  })

  socket.on('enviar-mensagem', ({ sala, remetente, remetente_tipo, texto }) => {
    if (!sala || !texto) return
    const agendamento = db.prepare('SELECT clinica_id FROM agendamentos WHERE id = ?').get(sala)
    if (!agendamento) return
    const mensagem = {
      id: nanoid(),
      sala,
      remetente: remetente ?? 'Anônimo',
      remetente_tipo: remetente_tipo ?? 'paciente',
      texto,
      clinica_id: agendamento.clinica_id,
      created_at: new Date().toISOString(),
    }
    db.prepare(
      `INSERT INTO mensagens (id, sala, remetente, remetente_tipo, texto, clinica_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      mensagem.id,
      mensagem.sala,
      mensagem.remetente,
      mensagem.remetente_tipo,
      mensagem.texto,
      mensagem.clinica_id,
      mensagem.created_at,
    )
    io.to(sala).emit('nova-mensagem', mensagem)
  })

  // Sinalização WebRTC (mesh) para as salas de reunião — o servidor só repassa
  // offer/answer/ice-candidate entre os participantes, o vídeo/áudio vai direto (P2P).
  function salaReuniao(reuniaoId) {
    return `reuniao:${reuniaoId}`
  }

  socket.on('reuniao:entrar', ({ reuniaoId, usuarioId, nome }) => {
    if (!reuniaoId) return
    const sala = salaReuniao(reuniaoId)
    const existentes = []
    const idsNaSala = io.sockets.adapter.rooms.get(sala)
    if (idsNaSala) {
      for (const socketId of idsNaSala) {
        const outro = io.sockets.sockets.get(socketId)
        if (outro?.data?.reuniao) {
          existentes.push({ socketId, usuarioId: outro.data.reuniao.usuarioId, nome: outro.data.reuniao.nome })
        }
      }
    }
    socket.data.reuniao = { reuniaoId, usuarioId, nome }
    socket.join(sala)
    socket.emit('reuniao:participantes-atuais', existentes)
    socket.to(sala).emit('reuniao:novo-participante', { socketId: socket.id, usuarioId, nome })
  })

  socket.on('reuniao:sinal', ({ destino, tipo, dados }) => {
    if (!destino) return
    io.to(destino).emit('reuniao:sinal', { origem: socket.id, tipo, dados })
  })

  function sairDaReuniao() {
    const info = socket.data.reuniao
    if (!info) return
    const sala = salaReuniao(info.reuniaoId)
    socket.leave(sala)
    socket.to(sala).emit('reuniao:participante-saiu', { socketId: socket.id })
    delete socket.data.reuniao
  }

  socket.on('reuniao:sair', sairDaReuniao)
  socket.on('disconnect', sairDaReuniao)
})

httpServer.listen(PORT, () => {
  console.log(`API + Socket.io rodando em http://localhost:${PORT}`)
})
