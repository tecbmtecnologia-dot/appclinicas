import { Router } from 'express'
import { nanoid } from 'nanoid'
import { db } from '../db.js'
import { requireRole } from '../auth.js'

// Dados pessoais do próprio usuário logado — nunca filtrados por clínica nem
// visíveis a outros usuários (mesmo admin), sempre por req.usuario.id.
// PJ (consultora, fisioterapeuta etc.) não usa este módulo.
const router = Router()
router.use(requireRole('admin', 'coordenador', 'medico', 'enfermagem', 'financeiro'))

router.get('/resumo', async (req, res) => {
  const { mes, ano } = req.query
  const referencia = mes && ano ? `${ano}-${String(mes).padStart(2, '0')}` : new Date().toISOString().slice(0, 7)

  const { receitas } = await db
    .prepare("SELECT COALESCE(SUM(valor), 0) AS receitas FROM financas_pessoais WHERE usuario_id = ? AND tipo = 'receita' AND substr(data, 1, 7) = ?")
    .get(req.usuario.id, referencia)
  const { despesas } = await db
    .prepare("SELECT COALESCE(SUM(valor), 0) AS despesas FROM financas_pessoais WHERE usuario_id = ? AND tipo = 'despesa' AND substr(data, 1, 7) = ?")
    .get(req.usuario.id, referencia)

  res.json({ referencia, receitas, despesas, saldo: receitas - despesas })
})

router.get('/', async (req, res) => {
  const { data_inicio, data_fim, tipo } = req.query
  let sql = 'SELECT * FROM financas_pessoais WHERE usuario_id = ?'
  const params = [req.usuario.id]
  if (data_inicio) {
    sql += ' AND data >= ?'
    params.push(data_inicio)
  }
  if (data_fim) {
    sql += ' AND data <= ?'
    params.push(data_fim)
  }
  if (tipo) {
    sql += ' AND tipo = ?'
    params.push(tipo)
  }
  sql += ' ORDER BY data DESC'
  res.json(await db.prepare(sql).all(...params))
})

router.post('/', async (req, res) => {
  const { tipo, descricao, categoria, valor, data } = req.body
  if (!['receita', 'despesa'].includes(tipo)) return res.status(400).json({ error: 'Tipo deve ser receita ou despesa' })
  if (!descricao || !valor || !data) return res.status(400).json({ error: 'Descrição, valor e data são obrigatórios' })
  const id = nanoid()
  await db.prepare(
    `INSERT INTO financas_pessoais (id, usuario_id, tipo, descricao, categoria, valor, data) VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, req.usuario.id, tipo, descricao, categoria || null, Number(valor), data)
  res.status(201).json(await db.prepare('SELECT * FROM financas_pessoais WHERE id = ?').get(id))
})

router.put('/:id', async (req, res) => {
  const existente = await db.prepare('SELECT * FROM financas_pessoais WHERE id = ? AND usuario_id = ?').get(req.params.id, req.usuario.id)
  if (!existente) return res.status(404).json({ error: 'Registro não encontrado' })
  if (req.body.tipo && !['receita', 'despesa'].includes(req.body.tipo)) {
    return res.status(400).json({ error: 'Tipo deve ser receita ou despesa' })
  }
  const merged = {
    tipo: req.body.tipo ?? existente.tipo,
    descricao: req.body.descricao ?? existente.descricao,
    categoria: req.body.categoria !== undefined ? req.body.categoria || null : existente.categoria,
    valor: req.body.valor !== undefined ? Number(req.body.valor) : existente.valor,
    data: req.body.data ?? existente.data,
  }
  await db.prepare(`UPDATE financas_pessoais SET tipo=?, descricao=?, categoria=?, valor=?, data=? WHERE id=?`).run(
    merged.tipo,
    merged.descricao,
    merged.categoria,
    merged.valor,
    merged.data,
    req.params.id,
  )
  res.json(await db.prepare('SELECT * FROM financas_pessoais WHERE id = ?').get(req.params.id))
})

router.delete('/:id', async (req, res) => {
  await db.prepare('DELETE FROM financas_pessoais WHERE id = ? AND usuario_id = ?').run(req.params.id, req.usuario.id)
  res.status(204).end()
})

export default router
