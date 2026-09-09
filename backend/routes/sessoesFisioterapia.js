import { Router } from 'express'
import { nanoid } from 'nanoid'
import { db } from '../db.js'
import { requireRole } from '../auth.js'

// Agenda pessoal de quem tem perfil pj (fisioterapeuta/consultora). Cada um só
// vê/mexe nas próprias sessões — admin/coordenador enxergam todas, pra
// acompanhamento. Não tem médico responsável vinculado de propósito (é uma
// marcação simples, não um registro clínico formal como prontuário/agendamento).
const router = Router()
// Leitura acompanha quem vê o Prontuário (a sessão aparece no histórico do paciente
// pra todo mundo que já enxerga esse histórico) — escrita só quem realmente agenda.
const LEITURA = requireRole('admin', 'coordenador', 'medico', 'enfermagem', 'pj')
const ESCRITA = requireRole('admin', 'coordenador', 'pj')

const SELECT_JOIN = `
  SELECT s.*, p.nome AS paciente_nome, u.nome AS usuario_nome
  FROM sessoes_fisioterapia s
  LEFT JOIN pacientes p ON p.id = s.paciente_id
  LEFT JOIN usuarios u ON u.id = s.usuario_id
`

// pj só enxerga a própria agenda; os demais perfis com acesso de leitura (que
// só chegam aqui filtrando por paciente_id, pra montar o histórico) veem todas.
function podeVerTodas(usuario) {
  return usuario.role !== 'pj'
}

router.get('/', LEITURA, (req, res) => {
  const { data, mes, paciente_id } = req.query
  let sql = SELECT_JOIN + ' WHERE s.clinica_id = ?'
  const params = [req.usuario.clinica_id]
  if (!podeVerTodas(req.usuario)) {
    sql += ' AND s.usuario_id = ?'
    params.push(req.usuario.id)
  }
  if (data) {
    sql += ' AND substr(s.data_hora, 1, 10) = ?'
    params.push(data)
  }
  if (mes) {
    sql += ' AND substr(s.data_hora, 1, 7) = ?'
    params.push(mes)
  }
  if (paciente_id) {
    sql += ' AND s.paciente_id = ?'
    params.push(paciente_id)
  }
  sql += ' ORDER BY s.data_hora ASC'
  res.json(db.prepare(sql).all(...params))
})

router.post('/', ESCRITA, (req, res) => {
  const { paciente_id, data_hora, observacoes } = req.body
  if (!paciente_id || !data_hora) {
    return res.status(400).json({ error: 'paciente_id e data_hora são obrigatórios' })
  }
  const paciente = db.prepare('SELECT id FROM pacientes WHERE id = ? AND clinica_id = ?').get(paciente_id, req.usuario.clinica_id)
  if (!paciente) return res.status(400).json({ error: 'Paciente inválido' })

  const id = nanoid()
  db.prepare(
    `INSERT INTO sessoes_fisioterapia (id, clinica_id, paciente_id, usuario_id, data_hora, observacoes)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(id, req.usuario.clinica_id, paciente_id, req.usuario.id, data_hora, observacoes || null)
  res.status(201).json(db.prepare(SELECT_JOIN + ' WHERE s.id = ?').get(id))
})

router.put('/:id', ESCRITA, (req, res) => {
  const existente = db.prepare('SELECT * FROM sessoes_fisioterapia WHERE id = ? AND clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!existente) return res.status(404).json({ error: 'Sessão não encontrada' })
  if (!podeVerTodas(req.usuario) && existente.usuario_id !== req.usuario.id) {
    return res.status(403).json({ error: 'Sem permissão para editar essa sessão' })
  }
  if (req.body.paciente_id) {
    const paciente = db.prepare('SELECT id FROM pacientes WHERE id = ? AND clinica_id = ?').get(req.body.paciente_id, req.usuario.clinica_id)
    if (!paciente) return res.status(400).json({ error: 'Paciente inválido' })
  }
  const merged = {
    paciente_id: req.body.paciente_id ?? existente.paciente_id,
    data_hora: req.body.data_hora ?? existente.data_hora,
    observacoes: req.body.observacoes !== undefined ? req.body.observacoes || null : existente.observacoes,
  }
  db.prepare('UPDATE sessoes_fisioterapia SET paciente_id=?, data_hora=?, observacoes=? WHERE id=?').run(
    merged.paciente_id,
    merged.data_hora,
    merged.observacoes,
    req.params.id,
  )
  res.json(db.prepare(SELECT_JOIN + ' WHERE s.id = ?').get(req.params.id))
})

router.delete('/:id', ESCRITA, (req, res) => {
  const existente = db.prepare('SELECT * FROM sessoes_fisioterapia WHERE id = ? AND clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!existente) return res.status(404).json({ error: 'Sessão não encontrada' })
  if (!podeVerTodas(req.usuario) && existente.usuario_id !== req.usuario.id) {
    return res.status(403).json({ error: 'Sem permissão para remover essa sessão' })
  }
  db.prepare('DELETE FROM sessoes_fisioterapia WHERE id = ?').run(req.params.id)
  res.status(204).end()
})

export default router
