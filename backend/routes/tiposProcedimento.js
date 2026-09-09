import { Router } from 'express'
import { nanoid } from 'nanoid'
import { db } from '../db.js'
import { requireRole } from '../auth.js'

// Catálogo de tipos de procedimento (Consulta, Retorno, Cirurgia etc) por clínica.
// Admin cadastra, qualquer perfil que acessa agendamento pode ler pra selecionar.
const router = Router()
const LEITURA = requireRole('admin', 'coordenador', 'recepcao', 'medico', 'financeiro')
const ESCRITA = requireRole('admin')

router.get('/', LEITURA, (req, res) => {
  const rows = db
    .prepare('SELECT * FROM tipos_procedimento WHERE clinica_id = ? ORDER BY nome COLLATE NOCASE')
    .all(req.usuario.clinica_id)
  res.json(rows)
})

router.post('/', ESCRITA, (req, res) => {
  const { nome, gera_cirurgia } = req.body
  if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' })
  const id = nanoid()
  db.prepare('INSERT INTO tipos_procedimento (id, clinica_id, nome, gera_cirurgia) VALUES (?, ?, ?, ?)').run(
    id,
    req.usuario.clinica_id,
    nome,
    gera_cirurgia ? 1 : 0,
  )
  res.status(201).json(db.prepare('SELECT * FROM tipos_procedimento WHERE id = ?').get(id))
})

router.put('/:id', ESCRITA, (req, res) => {
  const existente = db.prepare('SELECT * FROM tipos_procedimento WHERE id = ? AND clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!existente) return res.status(404).json({ error: 'Tipo de procedimento não encontrado' })
  const nome = req.body.nome ?? existente.nome
  const geraCirurgia = req.body.gera_cirurgia !== undefined ? (req.body.gera_cirurgia ? 1 : 0) : existente.gera_cirurgia
  db.prepare('UPDATE tipos_procedimento SET nome = ?, gera_cirurgia = ? WHERE id = ?').run(nome, geraCirurgia, req.params.id)
  res.json(db.prepare('SELECT * FROM tipos_procedimento WHERE id = ?').get(req.params.id))
})

router.delete('/:id', ESCRITA, (req, res) => {
  const existente = db.prepare('SELECT id FROM tipos_procedimento WHERE id = ? AND clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!existente) return res.status(404).json({ error: 'Tipo de procedimento não encontrado' })
  db.prepare('UPDATE agendamentos SET tipo_procedimento_id = NULL WHERE tipo_procedimento_id = ?').run(req.params.id)
  db.prepare('DELETE FROM tipos_procedimento WHERE id = ?').run(req.params.id)
  res.status(204).end()
})

export default router
