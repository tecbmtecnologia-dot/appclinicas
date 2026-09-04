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
import agendamentosRouter from './routes/agendamentos.js'
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
import { requireAuth, requireRole, requireClinica } from './auth.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT || 3001

const app = express()
app.use(cors())
app.use(express.json())
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

app.get('/api/health', (req, res) => res.json({ ok: true }))

app.use('/api/auth', authRouter)

app.use('/api/pacientes', requireAuth, requireClinica, pacientesRouter)
app.use('/api/medicos', requireAuth, requireClinica, medicosRouter)
app.use('/api/agendamentos', requireAuth, requireClinica, agendamentosRouter)
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
app.use('/api/clinicas', requireAuth, requireRole('super_admin'), clinicasRouter)

app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' })
})

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.name === 'MulterError' || /imagem/.test(err.message || '')) {
    return res.status(400).json({ error: err.message })
  }
  console.error(err)
  res.status(500).json({ error: 'Erro interno do servidor' })
})

const httpServer = createServer(app)
const io = new Server(httpServer, {
  path: '/socket.io',
  cors: { origin: '*' },
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
