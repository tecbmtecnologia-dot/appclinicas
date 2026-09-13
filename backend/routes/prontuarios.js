import { Router } from 'express'
import { nanoid } from 'nanoid'
import { db } from '../db.js'
import { requireRole } from '../auth.js'
import { gerarReceitaPDF } from '../pdfReceita.js'
import { gerarPedidoExamesPDF } from '../pdfPedidoExames.js'
import { gerarHistoricoPacientePDF } from '../pdfHistoricoPaciente.js'

const router = Router()
const ACESSO = requireRole('admin', 'coordenador', 'medico', 'enfermagem', 'pj')
const CRIACAO = requireRole('admin', 'coordenador', 'medico', 'enfermagem', 'pj', 'recepcao')
const EDICAO = requireRole('admin', 'coordenador', 'medico')
// Receita/pedido de exames — fisioterapeuta e consultora (role pj) não têm mais
// acesso a esses documentos, nem pra ver/imprimir os já emitidos.
const DOCUMENTOS = requireRole('admin', 'coordenador', 'medico', 'enfermagem', 'recepcao', 'financeiro')

const SELECT_JOIN = `
  SELECT pr.*, m.nome AS medico_nome, p.nome AS paciente_nome, u.role AS criado_por_role
  FROM prontuarios pr
  LEFT JOIN medicos m ON m.id = pr.medico_id
  LEFT JOIN pacientes p ON p.id = pr.paciente_id
  LEFT JOIN usuarios u ON u.id = pr.criado_por
`

async function validarReferencias(clinicaId, paciente_id, medico_id) {
  const paciente = await db.prepare('SELECT id FROM pacientes WHERE id = ? AND clinica_id = ?').get(paciente_id, clinicaId)
  const medico = await db.prepare('SELECT id FROM medicos WHERE id = ? AND clinica_id = ?').get(medico_id, clinicaId)
  return Boolean(paciente) && Boolean(medico)
}

// Enfermagem/pj (evolução) só enxergam a própria evolução — não a de colegas
// do mesmo grupo. Registros de médico/admin/coordenador continuam visíveis
// pra todo mundo, já que fazem parte do histórico clínico completo.
function filtrarEvolucoesDeOutrem(registros, usuario) {
  if (!['enfermagem', 'pj'].includes(usuario.role)) return registros
  return registros.filter(
    (r) => !['enfermagem', 'pj'].includes(r.criado_por_role) || r.criado_por === usuario.id,
  )
}

router.get('/', ACESSO, async (req, res) => {
  const { paciente_id } = req.query
  let sql = SELECT_JOIN + ' WHERE pr.clinica_id = ?'
  const params = [req.usuario.clinica_id]
  if (paciente_id) {
    sql += ' AND pr.paciente_id = ?'
    params.push(paciente_id)
  }
  sql += ' ORDER BY pr.data DESC'
  const registros = filtrarEvolucoesDeOutrem(await db.prepare(sql).all(...params), req.usuario)
  res.json(registros)
})

router.get('/:id', ACESSO, async (req, res) => {
  const row = await db.prepare(SELECT_JOIN + ' WHERE pr.id = ? AND pr.clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!row || filtrarEvolucoesDeOutrem([row], req.usuario).length === 0) {
    return res.status(404).json({ error: 'Prontuário não encontrado' })
  }
  res.json(row)
})

router.post('/', CRIACAO, async (req, res) => {
  const { paciente_id, medico_id, data, queixa, diagnostico, prescricao, pedido_exames, evolucao, observacoes } = req.body
  if (!paciente_id || !medico_id || !data) {
    return res.status(400).json({ error: 'paciente_id, medico_id e data são obrigatórios' })
  }
  if (!(await validarReferencias(req.usuario.clinica_id, paciente_id, medico_id))) {
    return res.status(400).json({ error: 'Paciente ou médico inválido' })
  }
  const restritoEvolucao = ['enfermagem', 'pj'].includes(req.usuario.role)
  if (restritoEvolucao && !evolucao) {
    return res.status(400).json({ error: 'Descreva a evolução' })
  }
  // Recepção só pode emitir receita/pedido de exames em nome de um médico (quando ele
  // não está na clínica), sem acesso a queixa/diagnóstico/evolução/observações do
  // prontuário clínico.
  const restritoReceita = req.usuario.role === 'recepcao'
  if (restritoReceita && !prescricao && !pedido_exames) {
    return res.status(400).json({ error: 'Descreva a prescrição ou o pedido de exames' })
  }
  const id = nanoid()
  await db.prepare(
    `INSERT INTO prontuarios (id, clinica_id, paciente_id, medico_id, data, queixa, diagnostico, prescricao, pedido_exames, evolucao, observacoes, criado_por)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    req.usuario.clinica_id,
    paciente_id,
    medico_id,
    data,
    restritoReceita ? null : queixa ?? null,
    restritoEvolucao || restritoReceita ? null : diagnostico ?? null,
    restritoEvolucao ? null : prescricao ?? null,
    restritoEvolucao ? null : pedido_exames ?? null,
    restritoReceita ? null : evolucao ?? null,
    restritoReceita ? null : observacoes ?? null,
    req.usuario.id,
  )
  res.status(201).json(await db.prepare(SELECT_JOIN + ' WHERE pr.id = ?').get(id))
})

router.get('/paciente/:pacienteId/receitas', DOCUMENTOS, async (req, res) => {
  // Liberada pra maior parte dos perfis da clínica (recepção, financeiro etc.) —
  // só expõe o necessário para localizar e imprimir a receita, sem diagnóstico/
  // evolução/queixa do prontuário. Fisioterapeuta/consultora (pj) não têm acesso.
  const paciente = await db.prepare('SELECT id FROM pacientes WHERE id = ? AND clinica_id = ?').get(req.params.pacienteId, req.usuario.clinica_id)
  if (!paciente) return res.status(404).json({ error: 'Paciente não encontrado' })

  const rows = await db
    .prepare(
      `SELECT pr.id, pr.data, m.nome AS medico_nome
       FROM prontuarios pr
       LEFT JOIN medicos m ON m.id = pr.medico_id
       WHERE pr.paciente_id = ? AND pr.clinica_id = ? AND pr.prescricao IS NOT NULL AND pr.prescricao != ''
       ORDER BY pr.data DESC`,
    )
    .all(req.params.pacienteId, req.usuario.clinica_id)
  res.json(rows)
})

router.get('/paciente/:pacienteId/pedidos-exames', DOCUMENTOS, async (req, res) => {
  // Liberada pra maior parte dos perfis da clínica (recepção, financeiro etc.) —
  // só expõe o necessário para localizar e imprimir o pedido de exames, sem
  // diagnóstico/evolução/queixa do prontuário. Fisioterapeuta/consultora (pj) não
  // têm acesso.
  const paciente = await db.prepare('SELECT id FROM pacientes WHERE id = ? AND clinica_id = ?').get(req.params.pacienteId, req.usuario.clinica_id)
  if (!paciente) return res.status(404).json({ error: 'Paciente não encontrado' })

  const rows = await db
    .prepare(
      `SELECT pr.id, pr.data, m.nome AS medico_nome
       FROM prontuarios pr
       LEFT JOIN medicos m ON m.id = pr.medico_id
       WHERE pr.paciente_id = ? AND pr.clinica_id = ? AND pr.pedido_exames IS NOT NULL AND pr.pedido_exames != ''
       ORDER BY pr.data DESC`,
    )
    .all(req.params.pacienteId, req.usuario.clinica_id)
  res.json(rows)
})

router.get('/paciente/:pacienteId/historico.pdf', ACESSO, async (req, res) => {
  const paciente = await db.prepare('SELECT * FROM pacientes WHERE id = ? AND clinica_id = ?').get(req.params.pacienteId, req.usuario.clinica_id)
  if (!paciente) return res.status(404).json({ error: 'Paciente não encontrado' })

  const registros = filtrarEvolucoesDeOutrem(
    await db.prepare(SELECT_JOIN + ' WHERE pr.paciente_id = ? AND pr.clinica_id = ? ORDER BY pr.data ASC').all(req.params.pacienteId, req.usuario.clinica_id),
    req.usuario,
  )
  const fotos = await db
    .prepare('SELECT * FROM fotos_paciente WHERE paciente_id = ? AND clinica_id = ? ORDER BY data ASC')
    .all(req.params.pacienteId, req.usuario.clinica_id)
  const clinica = await db.prepare('SELECT * FROM clinicas WHERE id = ?').get(req.usuario.clinica_id)

  gerarHistoricoPacientePDF(res, { paciente, registros, fotos, clinica })
})

router.get('/:id/receita.pdf', DOCUMENTOS, async (req, res) => {
  const prontuario = await db.prepare('SELECT * FROM prontuarios WHERE id = ? AND clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!prontuario) return res.status(404).json({ error: 'Prontuário não encontrado' })
  if (!prontuario.prescricao) return res.status(400).json({ error: 'Este registro não tem prescrição' })
  const paciente = await db.prepare('SELECT * FROM pacientes WHERE id = ?').get(prontuario.paciente_id)
  const medico = await db.prepare('SELECT * FROM medicos WHERE id = ?').get(prontuario.medico_id)
  const clinica = await db.prepare('SELECT * FROM clinicas WHERE id = ?').get(req.usuario.clinica_id)
  gerarReceitaPDF(res, { prontuario, paciente, medico, clinica })
})

router.get('/:id/pedido-exames.pdf', DOCUMENTOS, async (req, res) => {
  const prontuario = await db.prepare('SELECT * FROM prontuarios WHERE id = ? AND clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!prontuario) return res.status(404).json({ error: 'Prontuário não encontrado' })
  if (!prontuario.pedido_exames) return res.status(400).json({ error: 'Este registro não tem pedido de exames' })
  const paciente = await db.prepare('SELECT * FROM pacientes WHERE id = ?').get(prontuario.paciente_id)
  const medico = await db.prepare('SELECT * FROM medicos WHERE id = ?').get(prontuario.medico_id)
  const clinica = await db.prepare('SELECT * FROM clinicas WHERE id = ?').get(req.usuario.clinica_id)
  gerarPedidoExamesPDF(res, { prontuario, paciente, medico, clinica })
})

router.put('/:id', EDICAO, async (req, res) => {
  const existente = await db.prepare('SELECT * FROM prontuarios WHERE id = ? AND clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!existente) return res.status(404).json({ error: 'Prontuário não encontrado' })
  const merged = { ...existente, ...req.body }
  if (!(await validarReferencias(req.usuario.clinica_id, merged.paciente_id, merged.medico_id))) {
    return res.status(400).json({ error: 'Paciente ou médico inválido' })
  }
  await db.prepare(
    `UPDATE prontuarios SET paciente_id=?, medico_id=?, data=?, queixa=?, diagnostico=?, prescricao=?, pedido_exames=?, evolucao=?, observacoes=? WHERE id=?`,
  ).run(
    merged.paciente_id,
    merged.medico_id,
    merged.data,
    merged.queixa,
    merged.diagnostico,
    merged.prescricao,
    merged.pedido_exames,
    merged.evolucao,
    merged.observacoes,
    req.params.id,
  )
  res.json(await db.prepare(SELECT_JOIN + ' WHERE pr.id = ?').get(req.params.id))
})

router.delete('/:id', EDICAO, async (req, res) => {
  await db.prepare('DELETE FROM prontuarios WHERE id = ? AND clinica_id = ?').run(req.params.id, req.usuario.clinica_id)
  res.status(204).end()
})

export default router
