import { Router } from 'express'
import { nanoid } from 'nanoid'
import { db } from '../db.js'
import { requireRole } from '../auth.js'

const router = Router()
router.use(requireRole('admin', 'financeiro'))

router.get('/', async (req, res) => {
  const { data_inicio, data_fim, categoria } = req.query
  let sql = 'SELECT * FROM despesas_clinica WHERE clinica_id = ?'
  const params = [req.usuario.clinica_id]
  if (data_inicio) {
    sql += ' AND data >= ?'
    params.push(data_inicio)
  }
  if (data_fim) {
    sql += ' AND data <= ?'
    params.push(data_fim)
  }
  if (categoria) {
    sql += ' AND categoria = ?'
    params.push(categoria)
  }
  sql += ' ORDER BY data DESC'
  res.json(await db.prepare(sql).all(...params))
})

router.post('/', async (req, res) => {
  const { descricao, categoria, valor, data, forma_pagamento, status } = req.body
  if (!descricao || !valor || !data) return res.status(400).json({ error: 'Descrição, valor e data são obrigatórios' })
  const id = nanoid()
  await db.prepare(
    `INSERT INTO despesas_clinica (id, clinica_id, descricao, categoria, valor, data, forma_pagamento, status, criado_por)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, req.usuario.clinica_id, descricao, categoria || null, Number(valor), data, forma_pagamento || null, status || 'pago', req.usuario.id)
  res.status(201).json(await db.prepare('SELECT * FROM despesas_clinica WHERE id = ?').get(id))
})

router.put('/:id', async (req, res) => {
  const existente = await db.prepare('SELECT * FROM despesas_clinica WHERE id = ? AND clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!existente) return res.status(404).json({ error: 'Despesa não encontrada' })
  const merged = {
    descricao: req.body.descricao ?? existente.descricao,
    categoria: req.body.categoria !== undefined ? req.body.categoria || null : existente.categoria,
    valor: req.body.valor !== undefined ? Number(req.body.valor) : existente.valor,
    data: req.body.data ?? existente.data,
    forma_pagamento: req.body.forma_pagamento !== undefined ? req.body.forma_pagamento || null : existente.forma_pagamento,
    status: req.body.status ?? existente.status,
  }
  await db.prepare(`UPDATE despesas_clinica SET descricao=?, categoria=?, valor=?, data=?, forma_pagamento=?, status=? WHERE id=?`).run(
    merged.descricao,
    merged.categoria,
    merged.valor,
    merged.data,
    merged.forma_pagamento,
    merged.status,
    req.params.id,
  )
  res.json(await db.prepare('SELECT * FROM despesas_clinica WHERE id = ?').get(req.params.id))
})

router.delete('/:id', async (req, res) => {
  await db.prepare('DELETE FROM despesas_clinica WHERE id = ? AND clinica_id = ?').run(req.params.id, req.usuario.clinica_id)
  res.status(204).end()
})

export default router
