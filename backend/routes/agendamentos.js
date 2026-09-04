import { Router } from 'express'
import { nanoid } from 'nanoid'
import { db } from '../db.js'
import { requireRole } from '../auth.js'

const router = Router()
const ESCRITA = requireRole('admin', 'coordenador', 'recepcao', 'medico')

const SELECT_JOIN = `
  SELECT a.*, p.nome AS paciente_nome, m.nome AS medico_nome
  FROM agendamentos a
  LEFT JOIN pacientes p ON p.id = a.paciente_id
  LEFT JOIN medicos m ON m.id = a.medico_id
`

function validarReferencias(clinicaId, paciente_id, medico_id) {
  const paciente = db.prepare('SELECT id FROM pacientes WHERE id = ? AND clinica_id = ?').get(paciente_id, clinicaId)
  const medico = db.prepare('SELECT id FROM medicos WHERE id = ? AND clinica_id = ?').get(medico_id, clinicaId)
  return Boolean(paciente) && Boolean(medico)
}

router.get('/', (req, res) => {
  const { data, medico_id, paciente_id } = req.query
  let sql = SELECT_JOIN + ' WHERE a.clinica_id = ?'
  const params = [req.usuario.clinica_id]
  if (data) {
    sql += ' AND substr(a.data_hora, 1, 10) = ?'
    params.push(data)
  }
  if (medico_id) {
    sql += ' AND a.medico_id = ?'
    params.push(medico_id)
  }
  if (paciente_id) {
    sql += ' AND a.paciente_id = ?'
    params.push(paciente_id)
  }
  sql += ' ORDER BY a.data_hora ASC'
  const rows = db.prepare(sql).all(...params)
  res.json(rows)
})

router.get('/:id', (req, res) => {
  const row = db.prepare(SELECT_JOIN + ' WHERE a.id = ? AND a.clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!row) return res.status(404).json({ error: 'Agendamento não encontrado' })
  res.json(row)
})

router.post('/', ESCRITA, (req, res) => {
  const { paciente_id, medico_id, data_hora, status, tipo, observacoes } = req.body
  if (!paciente_id || !medico_id || !data_hora) {
    return res.status(400).json({ error: 'paciente_id, medico_id e data_hora são obrigatórios' })
  }
  if (!validarReferencias(req.usuario.clinica_id, paciente_id, medico_id)) {
    return res.status(400).json({ error: 'Paciente ou médico inválido' })
  }
  const id = nanoid()
  db.prepare(
    `INSERT INTO agendamentos (id, clinica_id, paciente_id, medico_id, data_hora, status, tipo, observacoes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, req.usuario.clinica_id, paciente_id, medico_id, data_hora, status ?? 'agendado', tipo ?? 'presencial', observacoes ?? null)
  res.status(201).json(db.prepare(SELECT_JOIN + ' WHERE a.id = ?').get(id))
})

router.put('/:id', ESCRITA, (req, res) => {
  const existente = db.prepare('SELECT * FROM agendamentos WHERE id = ? AND clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!existente) return res.status(404).json({ error: 'Agendamento não encontrado' })
  const merged = { ...existente, ...req.body }
  if (!validarReferencias(req.usuario.clinica_id, merged.paciente_id, merged.medico_id)) {
    return res.status(400).json({ error: 'Paciente ou médico inválido' })
  }
  db.prepare(
    `UPDATE agendamentos SET paciente_id=?, medico_id=?, data_hora=?, status=?, tipo=?, observacoes=? WHERE id=?`,
  ).run(merged.paciente_id, merged.medico_id, merged.data_hora, merged.status, merged.tipo, merged.observacoes, req.params.id)
  res.json(db.prepare(SELECT_JOIN + ' WHERE a.id = ?').get(req.params.id))
})

router.delete('/:id', requireRole('admin', 'coordenador', 'recepcao'), (req, res) => {
  db.prepare('DELETE FROM agendamentos WHERE id = ? AND clinica_id = ?').run(req.params.id, req.usuario.clinica_id)
  res.status(204).end()
})

export default router
