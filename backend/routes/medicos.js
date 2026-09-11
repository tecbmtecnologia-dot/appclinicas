import { Router } from 'express'
import { nanoid } from 'nanoid'
import { db } from '../db.js'
import { requireRole } from '../auth.js'

const router = Router()
const GESTAO = requireRole('admin', 'coordenador')

function comHospitais(medico) {
  if (!medico) return medico
  const hospitais = db
    .prepare(`SELECT h.id, h.nome FROM medico_hospitais mh JOIN hospitais h ON h.id = mh.hospital_id WHERE mh.medico_id = ?`)
    .all(medico.id)
  const disponibilidade = db
    .prepare('SELECT id, dia_semana, hora_inicio, hora_fim FROM medico_disponibilidade WHERE medico_id = ? ORDER BY dia_semana')
    .all(medico.id)
  return { ...medico, hospitais, disponibilidade }
}

const DIA_SEMANA_VALIDO = new Set([0, 1, 2, 3, 4, 5, 6])
const HORA_VALIDA = /^([01]\d|2[0-3]):[0-5]\d$/

function salvarDisponibilidade(medicoId, disponibilidade) {
  const lista = Array.isArray(disponibilidade) ? disponibilidade : []
  for (const d of lista) {
    if (!DIA_SEMANA_VALIDO.has(Number(d.dia_semana))) return false
    if (!HORA_VALIDA.test(d.hora_inicio) || !HORA_VALIDA.test(d.hora_fim)) return false
    if (d.hora_inicio >= d.hora_fim) return false
  }
  db.prepare('DELETE FROM medico_disponibilidade WHERE medico_id = ?').run(medicoId)
  for (const d of lista) {
    db.prepare(`INSERT INTO medico_disponibilidade (id, medico_id, dia_semana, hora_inicio, hora_fim) VALUES (?, ?, ?, ?, ?)`).run(
      nanoid(),
      medicoId,
      Number(d.dia_semana),
      d.hora_inicio,
      d.hora_fim,
    )
  }
  return true
}

function salvarHospitais(clinicaId, medicoId, hospitais) {
  const ids = Array.isArray(hospitais) ? [...new Set(hospitais)] : []
  for (const hospitalId of ids) {
    const hospital = db.prepare('SELECT id FROM hospitais WHERE id = ? AND clinica_id = ?').get(hospitalId, clinicaId)
    if (!hospital) return false
  }
  db.prepare('DELETE FROM medico_hospitais WHERE medico_id = ?').run(medicoId)
  for (const hospitalId of ids) {
    db.prepare(`INSERT INTO medico_hospitais (id, medico_id, hospital_id) VALUES (?, ?, ?)`).run(nanoid(), medicoId, hospitalId)
  }
  return true
}

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM medicos WHERE clinica_id = ? ORDER BY nome COLLATE NOCASE').all(req.usuario.clinica_id)
  res.json(rows.map(comHospitais))
})

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM medicos WHERE id = ? AND clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!row) return res.status(404).json({ error: 'Médico não encontrado' })
  res.json(comHospitais(row))
})

router.post('/', GESTAO, (req, res) => {
  const { nome, crm, especialidade, telefone, email, hospitais, disponibilidade, intervalo_slot_minutos } = req.body
  if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' })
  const id = nanoid()
  db.prepare(
    `INSERT INTO medicos (id, clinica_id, nome, crm, especialidade, telefone, email, intervalo_slot_minutos) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    req.usuario.clinica_id,
    nome,
    crm ?? null,
    especialidade ?? null,
    telefone ?? null,
    email ?? null,
    Number(intervalo_slot_minutos) > 0 ? Number(intervalo_slot_minutos) : 30,
  )
  if (!salvarHospitais(req.usuario.clinica_id, id, hospitais)) {
    return res.status(400).json({ error: 'Um dos hospitais é inválido' })
  }
  if (!salvarDisponibilidade(id, disponibilidade)) {
    return res.status(400).json({ error: 'Um dos horários de disponibilidade é inválido' })
  }
  res.status(201).json(comHospitais(db.prepare('SELECT * FROM medicos WHERE id = ?').get(id)))
})

router.put('/:id', GESTAO, (req, res) => {
  const existente = db.prepare('SELECT * FROM medicos WHERE id = ? AND clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!existente) return res.status(404).json({ error: 'Médico não encontrado' })
  const merged = { ...existente, ...req.body }
  db.prepare(`UPDATE medicos SET nome=?, crm=?, especialidade=?, telefone=?, email=?, intervalo_slot_minutos=? WHERE id=?`).run(
    merged.nome,
    merged.crm,
    merged.especialidade,
    merged.telefone,
    merged.email,
    Number(merged.intervalo_slot_minutos) > 0 ? Number(merged.intervalo_slot_minutos) : 30,
    req.params.id,
  )
  if (req.body.hospitais !== undefined && !salvarHospitais(req.usuario.clinica_id, req.params.id, req.body.hospitais)) {
    return res.status(400).json({ error: 'Um dos hospitais é inválido' })
  }
  if (req.body.disponibilidade !== undefined && !salvarDisponibilidade(req.params.id, req.body.disponibilidade)) {
    return res.status(400).json({ error: 'Um dos horários de disponibilidade é inválido' })
  }
  res.json(comHospitais(db.prepare('SELECT * FROM medicos WHERE id = ?').get(req.params.id)))
})

router.delete('/:id', GESTAO, (req, res) => {
  db.prepare('DELETE FROM medico_hospitais WHERE medico_id = ?').run(req.params.id)
  db.prepare('DELETE FROM medico_disponibilidade WHERE medico_id = ?').run(req.params.id)
  db.prepare('DELETE FROM medicos WHERE id = ? AND clinica_id = ?').run(req.params.id, req.usuario.clinica_id)
  res.status(204).end()
})

export default router
