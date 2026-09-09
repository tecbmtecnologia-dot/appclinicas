import { Router } from 'express'
import { nanoid } from 'nanoid'
import { db } from '../db.js'
import { requireRole } from '../auth.js'

const router = Router()
const ESCRITA = requireRole('admin', 'coordenador', 'recepcao', 'medico')

const SELECT_JOIN = `
  SELECT a.*, p.nome AS paciente_nome, m.nome AS medico_nome, tp.nome AS tipo_procedimento_nome
  FROM agendamentos a
  LEFT JOIN pacientes p ON p.id = a.paciente_id
  LEFT JOIN medicos m ON m.id = a.medico_id
  LEFT JOIN tipos_procedimento tp ON tp.id = a.tipo_procedimento_id
`

function validarReferencias(clinicaId, paciente_id, medico_id) {
  const paciente = db.prepare('SELECT id FROM pacientes WHERE id = ? AND clinica_id = ?').get(paciente_id, clinicaId)
  const medico = db.prepare('SELECT id FROM medicos WHERE id = ? AND clinica_id = ?').get(medico_id, clinicaId)
  return Boolean(paciente) && Boolean(medico)
}

// Quando o tipo de procedimento escolhido está marcado como "gera cirurgia" (configurado
// pelo admin em Configurações → Tipos de procedimento), cria automaticamente um rascunho
// em Cirurgias vinculado a este agendamento — assim consultora/instrumentador e
// fisioterapeuta já encontram o registro pronto pra preencher, sem depender de alguém
// cadastrar a cirurgia manualmente depois. Idempotente: não duplica se já existe.
function criarCirurgiaAutomatica(clinicaId, agendamento, usuarioId) {
  if (!agendamento.tipo_procedimento_id) return
  const tipo = db
    .prepare('SELECT * FROM tipos_procedimento WHERE id = ? AND clinica_id = ?')
    .get(agendamento.tipo_procedimento_id, clinicaId)
  if (!tipo || !tipo.gera_cirurgia) return
  const jaExiste = db.prepare('SELECT id FROM cirurgias WHERE agendamento_id = ?').get(agendamento.id)
  if (jaExiste) return
  db.prepare(
    `INSERT INTO cirurgias (id, clinica_id, paciente_id, medico_id, agendamento_id, nome_cirurgia, data_prevista, criado_por)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    nanoid(),
    clinicaId,
    agendamento.paciente_id,
    agendamento.medico_id,
    agendamento.id,
    tipo.nome,
    agendamento.data_hora.slice(0, 10),
    usuarioId,
  )
}

// Impede marcar dois compromissos/consultas no mesmo horário pro mesmo médico
// (cancelados não contam, já liberaram o horário).
function horarioOcupado(clinicaId, medico_id, data_hora, ignorarAgendamentoId) {
  const consulta = db
    .prepare(
      `SELECT id FROM agendamentos WHERE clinica_id = ? AND medico_id = ? AND data_hora = ? AND status != 'cancelado' AND id != ?`,
    )
    .get(clinicaId, medico_id, data_hora, ignorarAgendamentoId ?? '')
  if (consulta) return true
  const compromisso = db
    .prepare('SELECT id FROM compromissos WHERE clinica_id = ? AND medico_id = ? AND data_hora = ?')
    .get(clinicaId, medico_id, data_hora)
  return Boolean(compromisso)
}

router.get('/', (req, res) => {
  const { data, mes, medico_id, paciente_id } = req.query
  let sql = SELECT_JOIN + ' WHERE a.clinica_id = ?'
  const params = [req.usuario.clinica_id]
  if (data) {
    sql += ' AND substr(a.data_hora, 1, 10) = ?'
    params.push(data)
  }
  if (mes) {
    sql += ' AND substr(a.data_hora, 1, 7) = ?'
    params.push(mes)
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
  const { paciente_id, medico_id, data_hora, status, tipo, tipo_procedimento_id, observacoes } = req.body
  if (!paciente_id || !medico_id || !data_hora) {
    return res.status(400).json({ error: 'paciente_id, medico_id e data_hora são obrigatórios' })
  }
  if (!validarReferencias(req.usuario.clinica_id, paciente_id, medico_id)) {
    return res.status(400).json({ error: 'Paciente ou médico inválido' })
  }
  if (horarioOcupado(req.usuario.clinica_id, medico_id, data_hora)) {
    return res.status(409).json({ error: 'Esse médico já tem uma consulta ou compromisso marcado nesse horário.' })
  }
  const id = nanoid()
  db.prepare(
    `INSERT INTO agendamentos (id, clinica_id, paciente_id, medico_id, data_hora, status, tipo, tipo_procedimento_id, observacoes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    req.usuario.clinica_id,
    paciente_id,
    medico_id,
    data_hora,
    status ?? 'agendado',
    tipo ?? 'presencial',
    tipo_procedimento_id ?? null,
    observacoes ?? null,
  )
  criarCirurgiaAutomatica(
    req.usuario.clinica_id,
    { id, paciente_id, medico_id, data_hora, tipo_procedimento_id: tipo_procedimento_id ?? null },
    req.usuario.id,
  )
  res.status(201).json(db.prepare(SELECT_JOIN + ' WHERE a.id = ?').get(id))
})

router.put('/:id', ESCRITA, (req, res) => {
  const existente = db.prepare('SELECT * FROM agendamentos WHERE id = ? AND clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!existente) return res.status(404).json({ error: 'Agendamento não encontrado' })
  const merged = { ...existente, ...req.body }
  if (!validarReferencias(req.usuario.clinica_id, merged.paciente_id, merged.medico_id)) {
    return res.status(400).json({ error: 'Paciente ou médico inválido' })
  }
  if (
    (merged.data_hora !== existente.data_hora || merged.medico_id !== existente.medico_id) &&
    merged.status !== 'cancelado' &&
    horarioOcupado(req.usuario.clinica_id, merged.medico_id, merged.data_hora, req.params.id)
  ) {
    return res.status(409).json({ error: 'Esse médico já tem uma consulta ou compromisso marcado nesse horário.' })
  }
  db.prepare(
    `UPDATE agendamentos SET paciente_id=?, medico_id=?, data_hora=?, status=?, tipo=?, tipo_procedimento_id=?, observacoes=? WHERE id=?`,
  ).run(
    merged.paciente_id,
    merged.medico_id,
    merged.data_hora,
    merged.status,
    merged.tipo,
    merged.tipo_procedimento_id ?? null,
    merged.observacoes,
    req.params.id,
  )
  criarCirurgiaAutomatica(
    req.usuario.clinica_id,
    {
      id: req.params.id,
      paciente_id: merged.paciente_id,
      medico_id: merged.medico_id,
      data_hora: merged.data_hora,
      tipo_procedimento_id: merged.tipo_procedimento_id ?? null,
    },
    req.usuario.id,
  )
  res.json(db.prepare(SELECT_JOIN + ' WHERE a.id = ?').get(req.params.id))
})

router.delete('/:id', requireRole('admin', 'coordenador', 'recepcao'), (req, res) => {
  db.prepare('DELETE FROM agendamentos WHERE id = ? AND clinica_id = ?').run(req.params.id, req.usuario.clinica_id)
  res.status(204).end()
})

export default router
