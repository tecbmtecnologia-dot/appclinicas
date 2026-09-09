import { Router } from 'express'
import { nanoid } from 'nanoid'
import { db } from '../db.js'
import { requireRole } from '../auth.js'
import { uploadComprovante } from '../upload.js'

const router = Router()
const ACESSO = requireRole('admin', 'recepcao', 'financeiro')
router.use(ACESSO)

const SELECT_JOIN = `
  SELECT pg.*, p.nome AS paciente_nome
  FROM pagamentos pg
  LEFT JOIN pacientes p ON p.id = pg.paciente_id
`

router.get('/', (req, res) => {
  const { paciente_id, status, data_inicio, data_fim } = req.query
  let sql = SELECT_JOIN + ' WHERE pg.clinica_id = ?'
  const params = [req.usuario.clinica_id]
  if (paciente_id) {
    sql += ' AND pg.paciente_id = ?'
    params.push(paciente_id)
  }
  if (status) {
    sql += ' AND pg.status = ?'
    params.push(status)
  }
  if (data_inicio) {
    sql += " AND coalesce(pg.data_pagamento, pg.data_vencimento) >= ?"
    params.push(data_inicio)
  }
  if (data_fim) {
    sql += " AND coalesce(pg.data_pagamento, pg.data_vencimento) <= ?"
    params.push(data_fim)
  }
  sql += ' ORDER BY coalesce(pg.data_vencimento, pg.created_at) DESC'
  res.json(db.prepare(sql).all(...params))
})

router.post('/', (req, res) => {
  const { paciente_id, orcamento_id, descricao, valor, forma_pagamento, status, data_vencimento, data_pagamento } = req.body
  if (!paciente_id || !descricao || !valor) {
    return res.status(400).json({ error: 'Paciente, descrição e valor são obrigatórios' })
  }
  const paciente = db.prepare('SELECT id FROM pacientes WHERE id = ? AND clinica_id = ?').get(paciente_id, req.usuario.clinica_id)
  if (!paciente) return res.status(400).json({ error: 'Paciente inválido' })
  if (orcamento_id) {
    const orcamento = db.prepare('SELECT id FROM orcamentos WHERE id = ? AND clinica_id = ?').get(orcamento_id, req.usuario.clinica_id)
    if (!orcamento) return res.status(400).json({ error: 'Orçamento inválido' })
  }

  const id = nanoid()
  const statusFinal = status || 'pendente'
  db.prepare(
    `INSERT INTO pagamentos (id, clinica_id, paciente_id, orcamento_id, descricao, valor, forma_pagamento, status, data_vencimento, data_pagamento, criado_por)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    req.usuario.clinica_id,
    paciente_id,
    orcamento_id || null,
    descricao,
    Number(valor),
    forma_pagamento || null,
    statusFinal,
    data_vencimento || null,
    statusFinal === 'pago' ? data_pagamento || new Date().toISOString().slice(0, 10) : data_pagamento || null,
    req.usuario.id,
  )
  res.status(201).json(db.prepare(SELECT_JOIN + ' WHERE pg.id = ?').get(id))
})

router.put('/:id', (req, res) => {
  const existente = db.prepare('SELECT * FROM pagamentos WHERE id = ? AND clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!existente) return res.status(404).json({ error: 'Pagamento não encontrado' })

  const merged = {
    descricao: req.body.descricao ?? existente.descricao,
    valor: req.body.valor !== undefined ? Number(req.body.valor) : existente.valor,
    forma_pagamento: req.body.forma_pagamento !== undefined ? req.body.forma_pagamento || null : existente.forma_pagamento,
    status: req.body.status ?? existente.status,
    data_vencimento: req.body.data_vencimento !== undefined ? req.body.data_vencimento || null : existente.data_vencimento,
    data_pagamento: req.body.data_pagamento !== undefined ? req.body.data_pagamento || null : existente.data_pagamento,
  }
  if (merged.status === 'pago' && !merged.data_pagamento) {
    merged.data_pagamento = new Date().toISOString().slice(0, 10)
  }

  db.prepare(
    `UPDATE pagamentos SET descricao=?, valor=?, forma_pagamento=?, status=?, data_vencimento=?, data_pagamento=? WHERE id=?`,
  ).run(merged.descricao, merged.valor, merged.forma_pagamento, merged.status, merged.data_vencimento, merged.data_pagamento, req.params.id)

  res.json(db.prepare(SELECT_JOIN + ' WHERE pg.id = ?').get(req.params.id))
})

router.post('/:id/comprovante', uploadComprovante.single('comprovante'), (req, res) => {
  const existente = db.prepare('SELECT id FROM pagamentos WHERE id = ? AND clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!existente) return res.status(404).json({ error: 'Pagamento não encontrado' })
  if (!req.file) return res.status(400).json({ error: 'Envie uma imagem ou PDF' })
  const comprovanteUrl = `/uploads/comprovantes/${req.file.filename}`
  db.prepare('UPDATE pagamentos SET comprovante_url = ? WHERE id = ?').run(comprovanteUrl, req.params.id)
  res.json(db.prepare(SELECT_JOIN + ' WHERE pg.id = ?').get(req.params.id))
})

router.delete('/:id', requireRole('admin', 'financeiro'), (req, res) => {
  db.prepare('DELETE FROM pagamentos WHERE id = ? AND clinica_id = ?').run(req.params.id, req.usuario.clinica_id)
  res.status(204).end()
})

export default router
