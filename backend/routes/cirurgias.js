import { Router } from 'express'
import { nanoid } from 'nanoid'
import { db } from '../db.js'
import { requireRole } from '../auth.js'
import { criarNotificacao } from '../notificar.js'
import { gerarRelatorioCirurgiaPDF } from '../pdfRelatorioCirurgia.js'

const router = Router()
const ACESSO = requireRole('admin', 'coordenador', 'medico', 'enfermagem', 'recepcao')
const EXCLUSAO = requireRole('admin', 'coordenador')

router.use(ACESSO)

const SELECT_JOIN = `
  SELECT c.*, p.nome AS paciente_nome, m.nome AS medico_nome
  FROM cirurgias c
  LEFT JOIN pacientes p ON p.id = c.paciente_id
  LEFT JOIN medicos m ON m.id = c.medico_id
`

router.get('/', (req, res) => {
  const { paciente_id, status } = req.query
  let sql = SELECT_JOIN + ' WHERE c.clinica_id = ?'
  const params = [req.usuario.clinica_id]
  if (paciente_id) {
    sql += ' AND c.paciente_id = ?'
    params.push(paciente_id)
  }
  if (status) {
    sql += ' AND c.status = ?'
    params.push(status)
  }
  sql += ' ORDER BY c.created_at DESC'
  res.json(db.prepare(sql).all(...params))
})

router.get('/:id', (req, res) => {
  const row = db.prepare(SELECT_JOIN + ' WHERE c.id = ? AND c.clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!row) return res.status(404).json({ error: 'Cirurgia não encontrada' })
  res.json(row)
})

router.post('/', (req, res) => {
  const { paciente_id, medico_id, nome_cirurgia, data_prevista, local_hospital, equipe, observacoes } = req.body
  if (!paciente_id || !nome_cirurgia) {
    return res.status(400).json({ error: 'Paciente e nome da cirurgia são obrigatórios' })
  }
  const paciente = db.prepare('SELECT id FROM pacientes WHERE id = ? AND clinica_id = ?').get(paciente_id, req.usuario.clinica_id)
  if (!paciente) return res.status(400).json({ error: 'Paciente inválido' })
  if (medico_id) {
    const medico = db.prepare('SELECT id FROM medicos WHERE id = ? AND clinica_id = ?').get(medico_id, req.usuario.clinica_id)
    if (!medico) return res.status(400).json({ error: 'Médico inválido' })
  }

  const id = nanoid()
  db.prepare(
    `INSERT INTO cirurgias (id, clinica_id, paciente_id, medico_id, nome_cirurgia, data_prevista, local_hospital, equipe, observacoes, criado_por)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    req.usuario.clinica_id,
    paciente_id,
    medico_id || null,
    nome_cirurgia,
    data_prevista || null,
    local_hospital || null,
    equipe || null,
    observacoes || null,
    req.usuario.id,
  )
  res.status(201).json(db.prepare(SELECT_JOIN + ' WHERE c.id = ?').get(id))
})

router.put('/:id', (req, res) => {
  const existente = db.prepare('SELECT * FROM cirurgias WHERE id = ? AND clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!existente) return res.status(404).json({ error: 'Cirurgia não encontrada' })

  if (req.body.medico_id) {
    const medico = db.prepare('SELECT id FROM medicos WHERE id = ? AND clinica_id = ?').get(req.body.medico_id, req.usuario.clinica_id)
    if (!medico) return res.status(400).json({ error: 'Médico inválido' })
  }

  const eraPronta = existente.status === 'pronta'
  const merged = {
    medico_id: req.body.medico_id !== undefined ? req.body.medico_id || null : existente.medico_id,
    nome_cirurgia: req.body.nome_cirurgia ?? existente.nome_cirurgia,
    data_prevista: req.body.data_prevista !== undefined ? req.body.data_prevista || null : existente.data_prevista,
    local_hospital: req.body.local_hospital !== undefined ? req.body.local_hospital || null : existente.local_hospital,
    equipe: req.body.equipe !== undefined ? req.body.equipe || null : existente.equipe,
    observacoes: req.body.observacoes !== undefined ? req.body.observacoes || null : existente.observacoes,
    // Editar um relatório já finalizado volta para rascunho — exige nova finalização (e novo aviso ao médico).
    status: eraPronta ? 'rascunho' : existente.status,
  }

  db.prepare(
    `UPDATE cirurgias SET medico_id=?, nome_cirurgia=?, data_prevista=?, local_hospital=?, equipe=?, observacoes=?, status=?, atualizado_em=datetime('now') WHERE id=?`,
  ).run(
    merged.medico_id,
    merged.nome_cirurgia,
    merged.data_prevista,
    merged.local_hospital,
    merged.equipe,
    merged.observacoes,
    merged.status,
    req.params.id,
  )

  res.json(db.prepare(SELECT_JOIN + ' WHERE c.id = ?').get(req.params.id))
})

router.put('/:id/finalizar', (req, res) => {
  const existente = db.prepare(SELECT_JOIN + ' WHERE c.id = ? AND c.clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!existente) return res.status(404).json({ error: 'Cirurgia não encontrada' })
  if (!existente.medico_id) return res.status(400).json({ error: 'Defina o médico responsável antes de finalizar o relatório' })

  db.prepare(
    `UPDATE cirurgias SET status='pronta', finalizado_por=?, finalizado_em=datetime('now'), atualizado_em=datetime('now') WHERE id=?`,
  ).run(req.usuario.id, req.params.id)

  const medicoUsuario = db
    .prepare("SELECT id FROM usuarios WHERE medico_id = ? AND clinica_id = ? AND ativo = 1 AND role = 'medico'")
    .get(existente.medico_id, req.usuario.clinica_id)

  if (medicoUsuario) {
    criarNotificacao({
      clinicaId: req.usuario.clinica_id,
      usuarioId: medicoUsuario.id,
      tipo: 'relatorio_cirurgico',
      titulo: 'Relatório cirúrgico pronto',
      mensagem: `${existente.nome_cirurgia} — paciente ${existente.paciente_nome}`,
      referenciaTipo: 'cirurgia',
      referenciaId: existente.id,
    })
  }

  res.json(db.prepare(SELECT_JOIN + ' WHERE c.id = ?').get(req.params.id))
})

router.get('/:id/relatorio.pdf', (req, res) => {
  const cirurgia = db.prepare('SELECT * FROM cirurgias WHERE id = ? AND clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!cirurgia) return res.status(404).json({ error: 'Cirurgia não encontrada' })
  const paciente = db.prepare('SELECT * FROM pacientes WHERE id = ?').get(cirurgia.paciente_id)
  const medico = cirurgia.medico_id ? db.prepare('SELECT * FROM medicos WHERE id = ?').get(cirurgia.medico_id) : null
  const clinica = db.prepare('SELECT * FROM clinicas WHERE id = ?').get(req.usuario.clinica_id)
  gerarRelatorioCirurgiaPDF(res, { cirurgia, paciente, medico, clinica })
})

router.delete('/:id', EXCLUSAO, (req, res) => {
  db.prepare('DELETE FROM cirurgias WHERE id = ? AND clinica_id = ?').run(req.params.id, req.usuario.clinica_id)
  res.status(204).end()
})

export default router
