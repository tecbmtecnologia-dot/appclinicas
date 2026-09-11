import { Router } from 'express'
import { nanoid } from 'nanoid'
import { db } from '../db.js'
import { requireRole } from '../auth.js'
import { criarNotificacao } from '../notificar.js'
import { gerarRelatorioCirurgiaPDF } from '../pdfRelatorioCirurgia.js'

const router = Router()
const ACESSO = requireRole('admin', 'coordenador', 'medico', 'enfermagem', 'recepcao', 'pj')
const EXCLUSAO = requireRole('admin', 'coordenador')
// Observações financeiras são preenchidas pela coordenação/consultora — outros perfis do relatório
// (médico, enfermagem, recepção) não devem ver nem editar esse campo.
const PODE_FINANCEIRO = new Set(['admin', 'coordenador', 'pj'])

router.use(ACESSO)

const SELECT_JOIN = `
  SELECT c.*, p.nome AS paciente_nome, m.nome AS medico_nome, h.nome AS hospital_nome
  FROM cirurgias c
  LEFT JOIN pacientes p ON p.id = c.paciente_id
  LEFT JOIN medicos m ON m.id = c.medico_id
  LEFT JOIN hospitais h ON h.id = c.hospital_id
`

function ocultarFinanceiroSeNecessario(cirurgia, role) {
  if (!cirurgia || PODE_FINANCEIRO.has(role)) return cirurgia
  const { observacoes_financeiras, ...resto } = cirurgia
  return resto
}

function comAuxiliares(cirurgia) {
  if (!cirurgia) return cirurgia
  const auxiliares = db
    .prepare(
      `SELECT a.id, a.nome, a.funcao FROM cirurgia_auxiliares ca JOIN auxiliares a ON a.id = ca.auxiliar_id WHERE ca.cirurgia_id = ?`,
    )
    .all(cirurgia.id)
  const itens = db
    .prepare(
      `SELECT i.id, i.nome, ci.quantidade FROM cirurgia_itens ci JOIN itens_cirurgia_catalogo i ON i.id = ci.item_id WHERE ci.cirurgia_id = ?`,
    )
    .all(cirurgia.id)
  return { ...cirurgia, auxiliares, itens }
}

function salvarAuxiliares(clinicaId, cirurgiaId, auxiliares) {
  const ids = Array.isArray(auxiliares) ? [...new Set(auxiliares)] : []
  for (const auxiliarId of ids) {
    const auxiliar = db.prepare('SELECT id FROM auxiliares WHERE id = ? AND clinica_id = ?').get(auxiliarId, clinicaId)
    if (!auxiliar) return false
  }
  db.prepare('DELETE FROM cirurgia_auxiliares WHERE cirurgia_id = ?').run(cirurgiaId)
  for (const auxiliarId of ids) {
    db.prepare(`INSERT INTO cirurgia_auxiliares (id, cirurgia_id, auxiliar_id) VALUES (?, ?, ?)`).run(nanoid(), cirurgiaId, auxiliarId)
  }
  return true
}

function salvarItens(clinicaId, cirurgiaId, itens) {
  const lista = Array.isArray(itens) ? itens : []
  for (const it of lista) {
    const item = db.prepare('SELECT id FROM itens_cirurgia_catalogo WHERE id = ? AND clinica_id = ?').get(it.item_id, clinicaId)
    if (!item) return false
  }
  db.prepare('DELETE FROM cirurgia_itens WHERE cirurgia_id = ?').run(cirurgiaId)
  for (const it of lista) {
    const quantidade = Number(it.quantidade) > 0 ? Math.floor(Number(it.quantidade)) : 1
    db.prepare(`INSERT INTO cirurgia_itens (id, cirurgia_id, item_id, quantidade) VALUES (?, ?, ?, ?)`).run(nanoid(), cirurgiaId, it.item_id, quantidade)
  }
  return true
}

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
  res.json(
    db
      .prepare(sql)
      .all(...params)
      .map(comAuxiliares)
      .map((c) => ocultarFinanceiroSeNecessario(c, req.usuario.role)),
  )
})

router.get('/:id', (req, res) => {
  const row = db.prepare(SELECT_JOIN + ' WHERE c.id = ? AND c.clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!row) return res.status(404).json({ error: 'Cirurgia não encontrada' })
  res.json(ocultarFinanceiroSeNecessario(comAuxiliares(row), req.usuario.role))
})

router.post('/', (req, res) => {
  const { paciente_id, medico_id, nome_cirurgia, data_prevista, hospital_id, local_hospital, equipe, observacoes, observacoes_financeiras, auxiliares, itens } = req.body
  if (!paciente_id || !nome_cirurgia) {
    return res.status(400).json({ error: 'Paciente e nome da cirurgia são obrigatórios' })
  }
  const paciente = db.prepare('SELECT id FROM pacientes WHERE id = ? AND clinica_id = ?').get(paciente_id, req.usuario.clinica_id)
  if (!paciente) return res.status(400).json({ error: 'Paciente inválido' })
  if (medico_id) {
    const medico = db.prepare('SELECT id FROM medicos WHERE id = ? AND clinica_id = ?').get(medico_id, req.usuario.clinica_id)
    if (!medico) return res.status(400).json({ error: 'Médico inválido' })
  }
  if (hospital_id) {
    const hospital = db.prepare('SELECT id FROM hospitais WHERE id = ? AND clinica_id = ?').get(hospital_id, req.usuario.clinica_id)
    if (!hospital) return res.status(400).json({ error: 'Hospital inválido' })
  }

  const id = nanoid()
  db.prepare(
    `INSERT INTO cirurgias (id, clinica_id, paciente_id, medico_id, nome_cirurgia, data_prevista, hospital_id, local_hospital, equipe, observacoes, observacoes_financeiras, criado_por)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    req.usuario.clinica_id,
    paciente_id,
    medico_id || null,
    nome_cirurgia,
    data_prevista || null,
    hospital_id || null,
    local_hospital || null,
    equipe || null,
    observacoes || null,
    PODE_FINANCEIRO.has(req.usuario.role) ? observacoes_financeiras || null : null,
    req.usuario.id,
  )
  if (!salvarAuxiliares(req.usuario.clinica_id, id, auxiliares)) {
    return res.status(400).json({ error: 'Um dos auxiliares é inválido' })
  }
  if (!salvarItens(req.usuario.clinica_id, id, itens)) {
    return res.status(400).json({ error: 'Um dos itens é inválido' })
  }
  res.status(201).json(ocultarFinanceiroSeNecessario(comAuxiliares(db.prepare(SELECT_JOIN + ' WHERE c.id = ?').get(id)), req.usuario.role))
})

router.put('/:id', (req, res) => {
  const existente = db.prepare('SELECT * FROM cirurgias WHERE id = ? AND clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!existente) return res.status(404).json({ error: 'Cirurgia não encontrada' })

  if (req.body.medico_id) {
    const medico = db.prepare('SELECT id FROM medicos WHERE id = ? AND clinica_id = ?').get(req.body.medico_id, req.usuario.clinica_id)
    if (!medico) return res.status(400).json({ error: 'Médico inválido' })
  }
  if (req.body.hospital_id) {
    const hospital = db.prepare('SELECT id FROM hospitais WHERE id = ? AND clinica_id = ?').get(req.body.hospital_id, req.usuario.clinica_id)
    if (!hospital) return res.status(400).json({ error: 'Hospital inválido' })
  }

  const eraPronta = existente.status === 'pronta'
  const merged = {
    medico_id: req.body.medico_id !== undefined ? req.body.medico_id || null : existente.medico_id,
    nome_cirurgia: req.body.nome_cirurgia ?? existente.nome_cirurgia,
    data_prevista: req.body.data_prevista !== undefined ? req.body.data_prevista || null : existente.data_prevista,
    hospital_id: req.body.hospital_id !== undefined ? req.body.hospital_id || null : existente.hospital_id,
    local_hospital: req.body.local_hospital !== undefined ? req.body.local_hospital || null : existente.local_hospital,
    equipe: req.body.equipe !== undefined ? req.body.equipe || null : existente.equipe,
    observacoes: req.body.observacoes !== undefined ? req.body.observacoes || null : existente.observacoes,
    // Só quem tem permissão financeira pode alterar esse campo — outros perfis mandando o campo no corpo são ignorados.
    observacoes_financeiras: PODE_FINANCEIRO.has(req.usuario.role)
      ? req.body.observacoes_financeiras !== undefined
        ? req.body.observacoes_financeiras || null
        : existente.observacoes_financeiras
      : existente.observacoes_financeiras,
    // Editar um relatório já finalizado volta para rascunho — exige nova finalização (e novo aviso ao médico).
    status: eraPronta ? 'rascunho' : existente.status,
  }

  db.prepare(
    `UPDATE cirurgias SET medico_id=?, nome_cirurgia=?, data_prevista=?, hospital_id=?, local_hospital=?, equipe=?, observacoes=?, observacoes_financeiras=?, status=?, atualizado_em=datetime('now') WHERE id=?`,
  ).run(
    merged.medico_id,
    merged.nome_cirurgia,
    merged.data_prevista,
    merged.hospital_id,
    merged.local_hospital,
    merged.equipe,
    merged.observacoes,
    merged.observacoes_financeiras,
    merged.status,
    req.params.id,
  )

  if (req.body.auxiliares !== undefined && !salvarAuxiliares(req.usuario.clinica_id, req.params.id, req.body.auxiliares)) {
    return res.status(400).json({ error: 'Um dos auxiliares é inválido' })
  }
  if (req.body.itens !== undefined && !salvarItens(req.usuario.clinica_id, req.params.id, req.body.itens)) {
    return res.status(400).json({ error: 'Um dos itens é inválido' })
  }

  res.json(ocultarFinanceiroSeNecessario(comAuxiliares(db.prepare(SELECT_JOIN + ' WHERE c.id = ?').get(req.params.id)), req.usuario.role))
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

  res.json(ocultarFinanceiroSeNecessario(db.prepare(SELECT_JOIN + ' WHERE c.id = ?').get(req.params.id), req.usuario.role))
})

router.get('/:id/relatorio.pdf', (req, res) => {
  const cirurgia = db.prepare('SELECT * FROM cirurgias WHERE id = ? AND clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!cirurgia) return res.status(404).json({ error: 'Cirurgia não encontrada' })
  const paciente = db.prepare('SELECT * FROM pacientes WHERE id = ?').get(cirurgia.paciente_id)
  const medico = cirurgia.medico_id ? db.prepare('SELECT * FROM medicos WHERE id = ?').get(cirurgia.medico_id) : null
  const hospital = cirurgia.hospital_id ? db.prepare('SELECT * FROM hospitais WHERE id = ?').get(cirurgia.hospital_id) : null
  const clinica = db.prepare('SELECT * FROM clinicas WHERE id = ?').get(req.usuario.clinica_id)
  const { auxiliares, itens } = comAuxiliares(cirurgia)
  const cirurgiaFiltrada = ocultarFinanceiroSeNecessario(cirurgia, req.usuario.role)
  gerarRelatorioCirurgiaPDF(res, { cirurgia: cirurgiaFiltrada, paciente, medico, hospital, clinica, auxiliares, itens })
})

router.delete('/:id', EXCLUSAO, (req, res) => {
  db.prepare('DELETE FROM cirurgia_auxiliares WHERE cirurgia_id = ?').run(req.params.id)
  db.prepare('DELETE FROM cirurgia_itens WHERE cirurgia_id = ?').run(req.params.id)
  db.prepare('DELETE FROM cirurgias WHERE id = ? AND clinica_id = ?').run(req.params.id, req.usuario.clinica_id)
  res.status(204).end()
})

export default router
