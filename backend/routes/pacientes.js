import { Router } from 'express'
import { nanoid } from 'nanoid'
import { db } from '../db.js'
import { requireRole } from '../auth.js'

const router = Router()
const ESCRITA = requireRole('admin', 'coordenador', 'recepcao')
const EXCLUSAO = requireRole('admin', 'coordenador')

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM pacientes WHERE clinica_id = ? ORDER BY nome COLLATE NOCASE').all(req.usuario.clinica_id)
  res.json(rows)
})

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM pacientes WHERE id = ? AND clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!row) return res.status(404).json({ error: 'Paciente não encontrado' })
  res.json(row)
})

router.post('/', ESCRITA, (req, res) => {
  const { nome, cpf, rg, data_nascimento, telefone, email, convenio, endereco } = req.body
  if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' })
  const id = nanoid()
  db.prepare(
    `INSERT INTO pacientes (id, clinica_id, nome, cpf, rg, data_nascimento, telefone, email, convenio, endereco)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    req.usuario.clinica_id,
    nome,
    cpf ?? null,
    rg ?? null,
    data_nascimento ?? null,
    telefone ?? null,
    email ?? null,
    convenio ?? null,
    endereco ?? null,
  )
  res.status(201).json(db.prepare('SELECT * FROM pacientes WHERE id = ?').get(id))
})

router.put('/:id', ESCRITA, (req, res) => {
  const existente = db.prepare('SELECT * FROM pacientes WHERE id = ? AND clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!existente) return res.status(404).json({ error: 'Paciente não encontrado' })
  const merged = { ...existente, ...req.body }
  db.prepare(
    `UPDATE pacientes SET nome=?, cpf=?, rg=?, data_nascimento=?, telefone=?, email=?, convenio=?, endereco=? WHERE id=?`,
  ).run(
    merged.nome,
    merged.cpf,
    merged.rg,
    merged.data_nascimento,
    merged.telefone,
    merged.email,
    merged.convenio,
    merged.endereco,
    req.params.id,
  )
  res.json(db.prepare('SELECT * FROM pacientes WHERE id = ?').get(req.params.id))
})

router.delete('/:id', EXCLUSAO, (req, res) => {
  db.prepare('DELETE FROM pacientes WHERE id = ? AND clinica_id = ?').run(req.params.id, req.usuario.clinica_id)
  res.status(204).end()
})

export default router
