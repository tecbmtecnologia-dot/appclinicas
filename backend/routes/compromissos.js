import { Router } from 'express'
import { nanoid } from 'nanoid'
import { db } from '../db.js'
import { requireRole } from '../auth.js'

const router = Router()
// Quem marca a agenda do médico é a recepção/admin/coordenador — médico só lê a própria.
const ESCRITA = requireRole('admin', 'coordenador', 'recepcao')

const SELECT_JOIN = `
  SELECT c.*, m.nome AS medico_nome
  FROM compromissos c
  LEFT JOIN medicos m ON m.id = c.medico_id
`

async function horarioOcupado(clinicaId, medico_id, data_hora, ignorarCompromissoId) {
  const compromisso = await db
    .prepare('SELECT id FROM compromissos WHERE clinica_id = ? AND medico_id = ? AND data_hora = ? AND id != ?')
    .get(clinicaId, medico_id, data_hora, ignorarCompromissoId ?? '')
  if (compromisso) return true
  const consulta = await db
    .prepare(`SELECT id FROM agendamentos WHERE clinica_id = ? AND medico_id = ? AND data_hora = ? AND status != 'cancelado'`)
    .get(clinicaId, medico_id, data_hora)
  return Boolean(consulta)
}

router.get('/', async (req, res) => {
  const { data, mes } = req.query
  // médico só enxerga os próprios compromissos, mesmo que peça outro medico_id
  const medicoId = req.usuario.role === 'medico' ? req.usuario.medico_id : req.query.medico_id
  let sql = SELECT_JOIN + ' WHERE c.clinica_id = ?'
  const params = [req.usuario.clinica_id]
  if (data) {
    sql += ' AND substr(c.data_hora, 1, 10) = ?'
    params.push(data)
  }
  if (mes) {
    sql += ' AND substr(c.data_hora, 1, 7) = ?'
    params.push(mes)
  }
  if (medicoId) {
    sql += ' AND c.medico_id = ?'
    params.push(medicoId)
  }
  sql += ' ORDER BY c.data_hora ASC'
  res.json(await db.prepare(sql).all(...params))
})

router.post('/', ESCRITA, async (req, res) => {
  const { medico_id, titulo, data_hora, observacoes } = req.body
  if (!medico_id || !titulo || !data_hora) {
    return res.status(400).json({ error: 'medico_id, titulo e data_hora são obrigatórios' })
  }
  const medico = await db.prepare('SELECT id FROM medicos WHERE id = ? AND clinica_id = ?').get(medico_id, req.usuario.clinica_id)
  if (!medico) return res.status(400).json({ error: 'Médico inválido' })
  if (await horarioOcupado(req.usuario.clinica_id, medico_id, data_hora)) {
    return res.status(409).json({ error: 'Esse médico já tem uma consulta ou compromisso marcado nesse horário.' })
  }
  const id = nanoid()
  await db.prepare(
    `INSERT INTO compromissos (id, clinica_id, medico_id, titulo, data_hora, observacoes, criado_por) VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, req.usuario.clinica_id, medico_id, titulo, data_hora, observacoes ?? null, req.usuario.id)
  res.status(201).json(await db.prepare(SELECT_JOIN + ' WHERE c.id = ?').get(id))
})

router.put('/:id', ESCRITA, async (req, res) => {
  const existente = await db.prepare('SELECT * FROM compromissos WHERE id = ? AND clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!existente) return res.status(404).json({ error: 'Compromisso não encontrado' })
  const merged = { ...existente, ...req.body }
  if (
    (merged.data_hora !== existente.data_hora || merged.medico_id !== existente.medico_id) &&
    (await horarioOcupado(req.usuario.clinica_id, merged.medico_id, merged.data_hora, req.params.id))
  ) {
    return res.status(409).json({ error: 'Esse médico já tem uma consulta ou compromisso marcado nesse horário.' })
  }
  await db.prepare('UPDATE compromissos SET medico_id=?, titulo=?, data_hora=?, observacoes=? WHERE id=?').run(
    merged.medico_id,
    merged.titulo,
    merged.data_hora,
    merged.observacoes,
    req.params.id,
  )
  res.json(await db.prepare(SELECT_JOIN + ' WHERE c.id = ?').get(req.params.id))
})

router.delete('/:id', ESCRITA, async (req, res) => {
  await db.prepare('DELETE FROM compromissos WHERE id = ? AND clinica_id = ?').run(req.params.id, req.usuario.clinica_id)
  res.status(204).end()
})

export default router
