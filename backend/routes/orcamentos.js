import { Router } from 'express'
import { nanoid } from 'nanoid'
import { db } from '../db.js'
import { requireRole } from '../auth.js'

const router = Router()
const ACESSO = requireRole('admin', 'recepcao', 'financeiro')
const GESTAO = requireRole('admin', 'financeiro')
router.use(ACESSO)

const SELECT_JOIN = `
  SELECT o.*, p.nome AS paciente_nome
  FROM orcamentos o
  LEFT JOIN pacientes p ON p.id = o.paciente_id
`

function itensParaTexto(itens) {
  if (Array.isArray(itens)) return JSON.stringify(itens)
  if (typeof itens === 'string') return itens
  return null
}

function comItensArray(row) {
  if (!row) return row
  let itens = []
  try {
    itens = row.itens ? JSON.parse(row.itens) : []
  } catch {
    itens = []
  }
  return { ...row, itens }
}

function somarItens(itens) {
  if (!Array.isArray(itens)) return 0
  return itens.reduce((soma, item) => soma + (Number(item.valor) || 0), 0)
}

router.get('/', (req, res) => {
  const { paciente_id, status } = req.query
  let sql = SELECT_JOIN + ' WHERE o.clinica_id = ?'
  const params = [req.usuario.clinica_id]
  if (paciente_id) {
    sql += ' AND o.paciente_id = ?'
    params.push(paciente_id)
  }
  if (status) {
    sql += ' AND o.status = ?'
    params.push(status)
  }
  sql += ' ORDER BY o.created_at DESC'
  res.json(db.prepare(sql).all(...params).map(comItensArray))
})

router.get('/:id', (req, res) => {
  const row = db.prepare(SELECT_JOIN + ' WHERE o.id = ? AND o.clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!row) return res.status(404).json({ error: 'Orçamento não encontrado' })
  res.json(comItensArray(row))
})

router.post('/', GESTAO, (req, res) => {
  const { paciente_id, titulo, itens, observacoes } = req.body
  if (!paciente_id || !titulo) return res.status(400).json({ error: 'Paciente e título são obrigatórios' })
  const paciente = db.prepare('SELECT id FROM pacientes WHERE id = ? AND clinica_id = ?').get(paciente_id, req.usuario.clinica_id)
  if (!paciente) return res.status(400).json({ error: 'Paciente inválido' })

  const id = nanoid()
  const valorTotal = somarItens(itens)
  db.prepare(
    `INSERT INTO orcamentos (id, clinica_id, paciente_id, titulo, itens, valor_total, observacoes, criado_por)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, req.usuario.clinica_id, paciente_id, titulo, itensParaTexto(itens), valorTotal, observacoes || null, req.usuario.id)

  res.status(201).json(comItensArray(db.prepare(SELECT_JOIN + ' WHERE o.id = ?').get(id)))
})

router.put('/:id', GESTAO, (req, res) => {
  const existente = db.prepare('SELECT * FROM orcamentos WHERE id = ? AND clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!existente) return res.status(404).json({ error: 'Orçamento não encontrado' })

  const itensNovos = req.body.itens !== undefined ? req.body.itens : JSON.parse(existente.itens || '[]')
  const merged = {
    titulo: req.body.titulo ?? existente.titulo,
    itens: itensParaTexto(itensNovos),
    valor_total: req.body.itens !== undefined ? somarItens(itensNovos) : existente.valor_total,
    status: req.body.status ?? existente.status,
    observacoes: req.body.observacoes !== undefined ? req.body.observacoes || null : existente.observacoes,
  }

  db.prepare(
    `UPDATE orcamentos SET titulo=?, itens=?, valor_total=?, status=?, observacoes=?, atualizado_em=datetime('now') WHERE id=?`,
  ).run(merged.titulo, merged.itens, merged.valor_total, merged.status, merged.observacoes, req.params.id)

  res.json(comItensArray(db.prepare(SELECT_JOIN + ' WHERE o.id = ?').get(req.params.id)))
})

router.delete('/:id', GESTAO, (req, res) => {
  db.prepare('DELETE FROM orcamentos WHERE id = ? AND clinica_id = ?').run(req.params.id, req.usuario.clinica_id)
  res.status(204).end()
})

export default router
