import { Router } from 'express'
import { nanoid } from 'nanoid'
import { db } from '../db.js'
import { requireRole } from '../auth.js'

const router = Router()
const GESTAO = requireRole('admin', 'coordenador')

router.get('/', async (req, res) => {
  const rows = await db.prepare('SELECT * FROM auxiliares WHERE clinica_id = ? ORDER BY lower(nome)').all(req.usuario.clinica_id)
  res.json(rows)
})

router.get('/:id', async (req, res) => {
  const row = await db.prepare('SELECT * FROM auxiliares WHERE id = ? AND clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!row) return res.status(404).json({ error: 'Auxiliar não encontrado' })
  res.json(row)
})

router.post('/', GESTAO, async (req, res) => {
  const { nome, funcao, telefone, email } = req.body
  if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' })
  const id = nanoid()
  await db.prepare(
    `INSERT INTO auxiliares (id, clinica_id, nome, funcao, telefone, email) VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(id, req.usuario.clinica_id, nome, funcao ?? null, telefone ?? null, email ?? null)
  res.status(201).json(await db.prepare('SELECT * FROM auxiliares WHERE id = ?').get(id))
})

router.put('/:id', GESTAO, async (req, res) => {
  const existente = await db.prepare('SELECT * FROM auxiliares WHERE id = ? AND clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!existente) return res.status(404).json({ error: 'Auxiliar não encontrado' })
  const merged = { ...existente, ...req.body }
  await db.prepare(`UPDATE auxiliares SET nome=?, funcao=?, telefone=?, email=? WHERE id=?`).run(
    merged.nome,
    merged.funcao,
    merged.telefone,
    merged.email,
    req.params.id,
  )
  res.json(await db.prepare('SELECT * FROM auxiliares WHERE id = ?').get(req.params.id))
})

router.delete('/:id', GESTAO, async (req, res) => {
  await db.prepare('DELETE FROM auxiliares WHERE id = ? AND clinica_id = ?').run(req.params.id, req.usuario.clinica_id)
  res.status(204).end()
})

export default router
