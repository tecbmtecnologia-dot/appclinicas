import { Router } from 'express'
import { nanoid } from 'nanoid'
import { db } from '../db.js'

// Montado tanto em /api/clinicas/:clinicaId/unidades (super_admin) quanto em
// /api/minha-clinica/unidades (admin da própria clínica). Quem monta define req.clinicaId.
const router = Router()

function paraNumero(v) {
  return v != null && v !== '' ? Number(v) : null
}

router.get('/', async (req, res) => {
  const rows = await db
    .prepare('SELECT * FROM unidades WHERE clinica_id = ? ORDER BY lower(nome)')
    .all(req.clinicaId)
  res.json(rows)
})

router.post('/', async (req, res) => {
  const { nome, endereco, telefone, latitude, longitude, raio_metros } = req.body
  if (!nome) return res.status(400).json({ error: 'Nome da unidade é obrigatório' })
  const id = nanoid()
  await db.prepare(
    `INSERT INTO unidades (id, clinica_id, nome, endereco, telefone, latitude, longitude, raio_metros) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, req.clinicaId, nome, endereco ?? null, telefone ?? null, paraNumero(latitude), paraNumero(longitude), paraNumero(raio_metros))
  res.status(201).json(await db.prepare('SELECT * FROM unidades WHERE id = ?').get(id))
})

router.put('/:id', async (req, res) => {
  const existente = await db.prepare('SELECT * FROM unidades WHERE id = ? AND clinica_id = ?').get(req.params.id, req.clinicaId)
  if (!existente) return res.status(404).json({ error: 'Unidade não encontrada' })
  const merged = {
    nome: req.body.nome ?? existente.nome,
    endereco: req.body.endereco !== undefined ? req.body.endereco || null : existente.endereco,
    telefone: req.body.telefone !== undefined ? req.body.telefone || null : existente.telefone,
    latitude: req.body.latitude !== undefined ? paraNumero(req.body.latitude) : existente.latitude,
    longitude: req.body.longitude !== undefined ? paraNumero(req.body.longitude) : existente.longitude,
    raio_metros: req.body.raio_metros !== undefined ? paraNumero(req.body.raio_metros) : existente.raio_metros,
  }
  await db.prepare(`UPDATE unidades SET nome=?, endereco=?, telefone=?, latitude=?, longitude=?, raio_metros=? WHERE id=?`).run(
    merged.nome,
    merged.endereco,
    merged.telefone,
    merged.latitude,
    merged.longitude,
    merged.raio_metros,
    req.params.id,
  )
  res.json(await db.prepare('SELECT * FROM unidades WHERE id = ?').get(req.params.id))
})

router.delete('/:id', async (req, res) => {
  await db.prepare('DELETE FROM unidades WHERE id = ? AND clinica_id = ?').run(req.params.id, req.clinicaId)
  res.status(204).end()
})

export default router
