import { Router } from 'express'
import { nanoid } from 'nanoid'
import { db } from '../db.js'
import { requireRole } from '../auth.js'

// Catálogo opcional por clínica — nem toda clínica usa. Admin cadastra,
// qualquer perfil que acessa cirurgias pode ler pra selecionar.
const router = Router()
const LEITURA = requireRole('admin', 'coordenador', 'medico', 'enfermagem', 'recepcao', 'pj')
const ESCRITA = requireRole('admin')

router.get('/', LEITURA, async (req, res) => {
  const rows = await db.prepare('SELECT * FROM itens_cirurgia_catalogo WHERE clinica_id = ? ORDER BY lower(nome)').all(req.usuario.clinica_id)
  res.json(rows)
})

router.post('/', ESCRITA, async (req, res) => {
  const { nome } = req.body
  if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' })
  const id = nanoid()
  await db.prepare(`INSERT INTO itens_cirurgia_catalogo (id, clinica_id, nome) VALUES (?, ?, ?)`).run(id, req.usuario.clinica_id, nome)
  res.status(201).json(await db.prepare('SELECT * FROM itens_cirurgia_catalogo WHERE id = ?').get(id))
})

router.put('/:id', ESCRITA, async (req, res) => {
  const existente = await db.prepare('SELECT * FROM itens_cirurgia_catalogo WHERE id = ? AND clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!existente) return res.status(404).json({ error: 'Item não encontrado' })
  const nome = req.body.nome ?? existente.nome
  await db.prepare('UPDATE itens_cirurgia_catalogo SET nome=? WHERE id=?').run(nome, req.params.id)
  res.json(await db.prepare('SELECT * FROM itens_cirurgia_catalogo WHERE id = ?').get(req.params.id))
})

router.delete('/:id', ESCRITA, async (req, res) => {
  await db.prepare('DELETE FROM cirurgia_itens WHERE item_id = ?').run(req.params.id)
  await db.prepare('DELETE FROM itens_cirurgia_catalogo WHERE id = ? AND clinica_id = ?').run(req.params.id, req.usuario.clinica_id)
  res.status(204).end()
})

export default router
