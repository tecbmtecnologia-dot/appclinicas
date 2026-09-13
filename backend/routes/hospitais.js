import { Router } from 'express'
import { nanoid } from 'nanoid'
import { db } from '../db.js'
import { requireRole } from '../auth.js'

const router = Router()
const GESTAO = requireRole('admin', 'coordenador')

router.get('/', async (req, res) => {
  const rows = await db.prepare('SELECT * FROM hospitais WHERE clinica_id = ? ORDER BY lower(nome)').all(req.usuario.clinica_id)
  res.json(rows)
})

router.get('/:id', async (req, res) => {
  const row = await db.prepare('SELECT * FROM hospitais WHERE id = ? AND clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!row) return res.status(404).json({ error: 'Hospital não encontrado' })
  res.json(row)
})

router.post('/', GESTAO, async (req, res) => {
  const { nome, endereco, telefone } = req.body
  if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' })
  const id = nanoid()
  await db.prepare(
    `INSERT INTO hospitais (id, clinica_id, nome, endereco, telefone) VALUES (?, ?, ?, ?, ?)`,
  ).run(id, req.usuario.clinica_id, nome, endereco ?? null, telefone ?? null)
  res.status(201).json(await db.prepare('SELECT * FROM hospitais WHERE id = ?').get(id))
})

router.put('/:id', GESTAO, async (req, res) => {
  const existente = await db.prepare('SELECT * FROM hospitais WHERE id = ? AND clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!existente) return res.status(404).json({ error: 'Hospital não encontrado' })
  const merged = { ...existente, ...req.body }
  await db.prepare(`UPDATE hospitais SET nome=?, endereco=?, telefone=? WHERE id=?`).run(
    merged.nome,
    merged.endereco,
    merged.telefone,
    req.params.id,
  )
  res.json(await db.prepare('SELECT * FROM hospitais WHERE id = ?').get(req.params.id))
})

router.delete('/:id', GESTAO, async (req, res) => {
  await db.prepare('DELETE FROM medico_hospitais WHERE hospital_id = ?').run(req.params.id)
  await db.prepare('DELETE FROM hospitais WHERE id = ? AND clinica_id = ?').run(req.params.id, req.usuario.clinica_id)
  res.status(204).end()
})

export default router
