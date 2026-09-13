import { Router } from 'express'
import { nanoid } from 'nanoid'
import { db } from '../db.js'
import { requireRole } from '../auth.js'

// Modelos de receita agora são da clínica (cadastrados pelo admin) —
// todo médico/coordenador da clínica vê a mesma lista ao prescrever.
const router = Router()
const LEITURA = requireRole('admin', 'coordenador', 'medico')
const ESCRITA = requireRole('admin')

router.get('/', LEITURA, async (req, res) => {
  const rows = await db
    .prepare('SELECT * FROM modelos_receita WHERE clinica_id = ? ORDER BY lower(nome)')
    .all(req.usuario.clinica_id)
  res.json(rows)
})

router.post('/', ESCRITA, async (req, res) => {
  const { nome, texto } = req.body
  if (!nome || !texto) return res.status(400).json({ error: 'Nome e texto são obrigatórios' })
  const id = nanoid()
  await db.prepare(
    `INSERT INTO modelos_receita (id, clinica_id, usuario_id, nome, texto) VALUES (?, ?, ?, ?, ?)`,
  ).run(id, req.usuario.clinica_id, req.usuario.id, nome, texto)
  res.status(201).json(await db.prepare('SELECT * FROM modelos_receita WHERE id = ?').get(id))
})

router.put('/:id', ESCRITA, async (req, res) => {
  const existente = await db.prepare('SELECT * FROM modelos_receita WHERE id = ? AND clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!existente) return res.status(404).json({ error: 'Modelo não encontrado' })
  const merged = {
    nome: req.body.nome ?? existente.nome,
    texto: req.body.texto ?? existente.texto,
  }
  await db.prepare('UPDATE modelos_receita SET nome=?, texto=? WHERE id=?').run(merged.nome, merged.texto, req.params.id)
  res.json(await db.prepare('SELECT * FROM modelos_receita WHERE id = ?').get(req.params.id))
})

router.delete('/:id', ESCRITA, async (req, res) => {
  await db.prepare('DELETE FROM modelos_receita WHERE id = ? AND clinica_id = ?').run(req.params.id, req.usuario.clinica_id)
  res.status(204).end()
})

export default router
