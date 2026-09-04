import { Router } from 'express'
import { nanoid } from 'nanoid'
import { db } from '../db.js'
import { requireRole } from '../auth.js'

const router = Router()
const ACESSO = requireRole('admin', 'coordenador', 'medico', 'enfermagem')
const EDICAO = requireRole('admin', 'coordenador', 'medico')

router.use(ACESSO)

const SELECT_JOIN = `
  SELECT pr.*, m.nome AS medico_nome, p.nome AS paciente_nome
  FROM prontuarios pr
  LEFT JOIN medicos m ON m.id = pr.medico_id
  LEFT JOIN pacientes p ON p.id = pr.paciente_id
`

function validarReferencias(clinicaId, paciente_id, medico_id) {
  const paciente = db.prepare('SELECT id FROM pacientes WHERE id = ? AND clinica_id = ?').get(paciente_id, clinicaId)
  const medico = db.prepare('SELECT id FROM medicos WHERE id = ? AND clinica_id = ?').get(medico_id, clinicaId)
  return Boolean(paciente) && Boolean(medico)
}

router.get('/', (req, res) => {
  const { paciente_id } = req.query
  let sql = SELECT_JOIN + ' WHERE pr.clinica_id = ?'
  const params = [req.usuario.clinica_id]
  if (paciente_id) {
    sql += ' AND pr.paciente_id = ?'
    params.push(paciente_id)
  }
  sql += ' ORDER BY pr.data DESC'
  res.json(db.prepare(sql).all(...params))
})

router.get('/:id', (req, res) => {
  const row = db.prepare(SELECT_JOIN + ' WHERE pr.id = ? AND pr.clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!row) return res.status(404).json({ error: 'Prontuário não encontrado' })
  res.json(row)
})

router.post('/', (req, res) => {
  const { paciente_id, medico_id, data, queixa, diagnostico, prescricao, observacoes } = req.body
  if (!paciente_id || !medico_id || !data) {
    return res.status(400).json({ error: 'paciente_id, medico_id e data são obrigatórios' })
  }
  if (!validarReferencias(req.usuario.clinica_id, paciente_id, medico_id)) {
    return res.status(400).json({ error: 'Paciente ou médico inválido' })
  }
  const ehEnfermagem = req.usuario.role === 'enfermagem'
  if (ehEnfermagem && !observacoes) {
    return res.status(400).json({ error: 'Descreva a evolução no campo de observações' })
  }
  const id = nanoid()
  db.prepare(
    `INSERT INTO prontuarios (id, clinica_id, paciente_id, medico_id, data, queixa, diagnostico, prescricao, observacoes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    req.usuario.clinica_id,
    paciente_id,
    medico_id,
    data,
    queixa ?? null,
    ehEnfermagem ? null : diagnostico ?? null,
    ehEnfermagem ? null : prescricao ?? null,
    observacoes ?? null,
  )
  res.status(201).json(db.prepare(SELECT_JOIN + ' WHERE pr.id = ?').get(id))
})

router.put('/:id', EDICAO, (req, res) => {
  const existente = db.prepare('SELECT * FROM prontuarios WHERE id = ? AND clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!existente) return res.status(404).json({ error: 'Prontuário não encontrado' })
  const merged = { ...existente, ...req.body }
  if (!validarReferencias(req.usuario.clinica_id, merged.paciente_id, merged.medico_id)) {
    return res.status(400).json({ error: 'Paciente ou médico inválido' })
  }
  db.prepare(
    `UPDATE prontuarios SET paciente_id=?, medico_id=?, data=?, queixa=?, diagnostico=?, prescricao=?, observacoes=? WHERE id=?`,
  ).run(
    merged.paciente_id,
    merged.medico_id,
    merged.data,
    merged.queixa,
    merged.diagnostico,
    merged.prescricao,
    merged.observacoes,
    req.params.id,
  )
  res.json(db.prepare(SELECT_JOIN + ' WHERE pr.id = ?').get(req.params.id))
})

router.delete('/:id', EDICAO, (req, res) => {
  db.prepare('DELETE FROM prontuarios WHERE id = ? AND clinica_id = ?').run(req.params.id, req.usuario.clinica_id)
  res.status(204).end()
})

export default router
