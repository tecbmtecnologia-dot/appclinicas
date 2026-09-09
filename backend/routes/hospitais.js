import { Router } from 'express'
import { nanoid } from 'nanoid'
import { db } from '../db.js'
import { requireRole } from '../auth.js'

const router = Router()
const GESTAO = requireRole('admin', 'coordenador')

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM hospitais WHERE clinica_id = ? ORDER BY nome COLLATE NOCASE').all(req.usuario.clinica_id)
  res.json(rows)
})

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM hospitais WHERE id = ? AND clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!row) return res.status(404).json({ error: 'Hospital não encontrado' })
  res.json(row)
})

router.post('/', GESTAO, (req, res) => {
  const { nome, endereco, telefone } = req.body
  if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' })
  const id = nanoid()
  db.prepare(
    `INSERT INTO hospitais (id, clinica_id, nome, endereco, telefone) VALUES (?, ?, ?, ?, ?)`,
  ).run(id, req.usuario.clinica_id, nome, endereco ?? null, telefone ?? null)
  res.status(201).json(db.prepare('SELECT * FROM hospitais WHERE id = ?').get(id))
})

router.put('/:id', GESTAO, (req, res) => {
  const existente = db.prepare('SELECT * FROM hospitais WHERE id = ? AND clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!existente) return res.status(404).json({ error: 'Hospital não encontrado' })
  const merged = { ...existente, ...req.body }
  db.prepare(`UPDATE hospitais SET nome=?, endereco=?, telefone=? WHERE id=?`).run(
    merged.nome,
    merged.endereco,
    merged.telefone,
    req.params.id,
  )
  res.json(db.prepare('SELECT * FROM hospitais WHERE id = ?').get(req.params.id))
})

router.delete('/:id', GESTAO, (req, res) => {
  db.prepare('DELETE FROM medico_hospitais WHERE hospital_id = ?').run(req.params.id)
  db.prepare('DELETE FROM hospitais WHERE id = ? AND clinica_id = ?').run(req.params.id, req.usuario.clinica_id)
  res.status(204).end()
})

export default router
