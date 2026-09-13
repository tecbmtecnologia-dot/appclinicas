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

async function comAuxiliares(cirurgia) {
  if (!cirurgia) return cirurgia
  const auxiliares = await db
    .prepare(
      `SELECT a.id, a.nome, a.funcao FROM cirurgia_auxiliares ca JOIN auxiliares a ON a.id = ca.auxiliar_id WHERE ca.cirurgia_id = ?`,
    )
    .all(cirurgia.id)
  const itens = await db
    .prepare(
      `SELECT i.id, i.nome, ci.quantidade FROM cirurgia_itens ci JOIN itens_cirurgia_catalogo i ON i.id = ci.item_id WHERE ci.cirurgia_id = ?`,
    )
    .all(cirurgia.id)
  return { ...cirurgia, auxiliares, itens }
}

// Recebem `dbLike` (o `db` normal ou um `tx` de transação) pra poderem rodar
// dentro da mesma transação do INSERT/UPDATE da cirurgia (ver POST/PUT abaixo) —
// cirurgia + auxiliares + itens têm que ser tudo ou nada.
async function salvarAuxiliares(dbLike, clinicaId, cirurgiaId, auxiliares) {
  const ids = Array.isArray(auxiliares) ? [...new Set(auxiliares)] : []
  for (const auxiliarId of ids) {
    const auxiliar = await dbLike.prepare('SELECT id FROM auxiliares WHERE id = ? AND clinica_id = ?').get(auxiliarId, clinicaId)
    if (!auxiliar) return false
  }
  await dbLike.prepare('DELETE FROM cirurgia_auxiliares WHERE cirurgia_id = ?').run(cirurgiaId)
  for (const auxiliarId of ids) {
    await dbLike.prepare(`INSERT INTO cirurgia_auxiliares (id, cirurgia_id, auxiliar_id) VALUES (?, ?, ?)`).run(nanoid(), cirurgiaId, auxiliarId)
  }
  return true
}

async function salvarItens(dbLike, clinicaId, cirurgiaId, itens) {
  const lista = Array.isArray(itens) ? itens : []
  for (const it of lista) {
    const item = await dbLike.prepare('SELECT id FROM itens_cirurgia_catalogo WHERE id = ? AND clinica_id = ?').get(it.item_id, clinicaId)
    if (!item) return false
  }
  await dbLike.prepare('DELETE FROM cirurgia_itens WHERE cirurgia_id = ?').run(cirurgiaId)
  for (const it of lista) {
    const quantidade = Number(it.quantidade) > 0 ? Math.floor(Number(it.quantidade)) : 1
    await dbLike.prepare(`INSERT INTO cirurgia_itens (id, cirurgia_id, item_id, quantidade) VALUES (?, ?, ?, ?)`).run(nanoid(), cirurgiaId, it.item_id, quantidade)
  }
  return true
}

const ERRO_AUXILIAR_INVALIDO = 'AUXILIAR_INVALIDO'
const ERRO_ITEM_INVALIDO = 'ITEM_INVALIDO'

router.get('/', async (req, res) => {
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
  const rows = await db.prepare(sql).all(...params)
  const comAux = await Promise.all(rows.map(comAuxiliares))
  res.json(comAux.map((c) => ocultarFinanceiroSeNecessario(c, req.usuario.role)))
})

router.get('/:id', async (req, res) => {
  const row = await db.prepare(SELECT_JOIN + ' WHERE c.id = ? AND c.clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!row) return res.status(404).json({ error: 'Cirurgia não encontrada' })
  res.json(ocultarFinanceiroSeNecessario(await comAuxiliares(row), req.usuario.role))
})

router.post('/', async (req, res) => {
  const { paciente_id, medico_id, nome_cirurgia, data_prevista, hospital_id, local_hospital, equipe, observacoes, observacoes_financeiras, auxiliares, itens } = req.body
  if (!paciente_id || !nome_cirurgia) {
    return res.status(400).json({ error: 'Paciente e nome da cirurgia são obrigatórios' })
  }
  const paciente = await db.prepare('SELECT id FROM pacientes WHERE id = ? AND clinica_id = ?').get(paciente_id, req.usuario.clinica_id)
  if (!paciente) return res.status(400).json({ error: 'Paciente inválido' })
  if (medico_id) {
    const medico = await db.prepare('SELECT id FROM medicos WHERE id = ? AND clinica_id = ?').get(medico_id, req.usuario.clinica_id)
    if (!medico) return res.status(400).json({ error: 'Médico inválido' })
  }
  if (hospital_id) {
    const hospital = await db.prepare('SELECT id FROM hospitais WHERE id = ? AND clinica_id = ?').get(hospital_id, req.usuario.clinica_id)
    if (!hospital) return res.status(400).json({ error: 'Hospital inválido' })
  }

  const id = nanoid()
  try {
    await db.transaction(async (tx) => {
      await tx.prepare(
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
      if (!(await salvarAuxiliares(tx, req.usuario.clinica_id, id, auxiliares))) {
        throw Object.assign(new Error('Auxiliar inválido'), { codigo: ERRO_AUXILIAR_INVALIDO })
      }
      if (!(await salvarItens(tx, req.usuario.clinica_id, id, itens))) {
        throw Object.assign(new Error('Item inválido'), { codigo: ERRO_ITEM_INVALIDO })
      }
    })()
  } catch (erro) {
    if (erro.codigo === ERRO_AUXILIAR_INVALIDO) return res.status(400).json({ error: 'Um dos auxiliares é inválido' })
    if (erro.codigo === ERRO_ITEM_INVALIDO) return res.status(400).json({ error: 'Um dos itens é inválido' })
    throw erro
  }
  res.status(201).json(ocultarFinanceiroSeNecessario(await comAuxiliares(await db.prepare(SELECT_JOIN + ' WHERE c.id = ?').get(id)), req.usuario.role))
})

router.put('/:id', async (req, res) => {
  const existente = await db.prepare('SELECT * FROM cirurgias WHERE id = ? AND clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!existente) return res.status(404).json({ error: 'Cirurgia não encontrada' })

  if (req.body.medico_id) {
    const medico = await db.prepare('SELECT id FROM medicos WHERE id = ? AND clinica_id = ?').get(req.body.medico_id, req.usuario.clinica_id)
    if (!medico) return res.status(400).json({ error: 'Médico inválido' })
  }
  if (req.body.hospital_id) {
    const hospital = await db.prepare('SELECT id FROM hospitais WHERE id = ? AND clinica_id = ?').get(req.body.hospital_id, req.usuario.clinica_id)
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

  try {
    await db.transaction(async (tx) => {
      await tx.prepare(
        `UPDATE cirurgias SET medico_id=?, nome_cirurgia=?, data_prevista=?, hospital_id=?, local_hospital=?, equipe=?, observacoes=?, observacoes_financeiras=?, status=?, atualizado_em=now() WHERE id=?`,
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

      if (req.body.auxiliares !== undefined && !(await salvarAuxiliares(tx, req.usuario.clinica_id, req.params.id, req.body.auxiliares))) {
        throw Object.assign(new Error('Auxiliar inválido'), { codigo: ERRO_AUXILIAR_INVALIDO })
      }
      if (req.body.itens !== undefined && !(await salvarItens(tx, req.usuario.clinica_id, req.params.id, req.body.itens))) {
        throw Object.assign(new Error('Item inválido'), { codigo: ERRO_ITEM_INVALIDO })
      }
    })()
  } catch (erro) {
    if (erro.codigo === ERRO_AUXILIAR_INVALIDO) return res.status(400).json({ error: 'Um dos auxiliares é inválido' })
    if (erro.codigo === ERRO_ITEM_INVALIDO) return res.status(400).json({ error: 'Um dos itens é inválido' })
    throw erro
  }

  res.json(ocultarFinanceiroSeNecessario(await comAuxiliares(await db.prepare(SELECT_JOIN + ' WHERE c.id = ?').get(req.params.id)), req.usuario.role))
})

router.put('/:id/finalizar', async (req, res) => {
  const existente = await db.prepare(SELECT_JOIN + ' WHERE c.id = ? AND c.clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!existente) return res.status(404).json({ error: 'Cirurgia não encontrada' })
  if (!existente.medico_id) return res.status(400).json({ error: 'Defina o médico responsável antes de finalizar o relatório' })

  await db.prepare(
    `UPDATE cirurgias SET status='pronta', finalizado_por=?, finalizado_em=now(), atualizado_em=now() WHERE id=?`,
  ).run(req.usuario.id, req.params.id)

  const medicoUsuario = await db
    .prepare("SELECT id FROM usuarios WHERE medico_id = ? AND clinica_id = ? AND ativo = 1 AND role = 'medico'")
    .get(existente.medico_id, req.usuario.clinica_id)

  if (medicoUsuario) {
    await criarNotificacao({
      clinicaId: req.usuario.clinica_id,
      usuarioId: medicoUsuario.id,
      tipo: 'relatorio_cirurgico',
      titulo: 'Relatório cirúrgico pronto',
      mensagem: `${existente.nome_cirurgia} — paciente ${existente.paciente_nome}`,
      referenciaTipo: 'cirurgia',
      referenciaId: existente.id,
    })
  }

  res.json(ocultarFinanceiroSeNecessario(await db.prepare(SELECT_JOIN + ' WHERE c.id = ?').get(req.params.id), req.usuario.role))
})

router.get('/:id/relatorio.pdf', async (req, res) => {
  const cirurgia = await db.prepare('SELECT * FROM cirurgias WHERE id = ? AND clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!cirurgia) return res.status(404).json({ error: 'Cirurgia não encontrada' })
  const paciente = await db.prepare('SELECT * FROM pacientes WHERE id = ?').get(cirurgia.paciente_id)
  const medico = cirurgia.medico_id ? await db.prepare('SELECT * FROM medicos WHERE id = ?').get(cirurgia.medico_id) : null
  const hospital = cirurgia.hospital_id ? await db.prepare('SELECT * FROM hospitais WHERE id = ?').get(cirurgia.hospital_id) : null
  const clinica = await db.prepare('SELECT * FROM clinicas WHERE id = ?').get(req.usuario.clinica_id)
  const { auxiliares, itens } = await comAuxiliares(cirurgia)
  const cirurgiaFiltrada = ocultarFinanceiroSeNecessario(cirurgia, req.usuario.role)
  gerarRelatorioCirurgiaPDF(res, { cirurgia: cirurgiaFiltrada, paciente, medico, hospital, clinica, auxiliares, itens })
})

router.delete('/:id', EXCLUSAO, async (req, res) => {
  await db.prepare('DELETE FROM cirurgia_auxiliares WHERE cirurgia_id = ?').run(req.params.id)
  await db.prepare('DELETE FROM cirurgia_itens WHERE cirurgia_id = ?').run(req.params.id)
  await db.prepare('DELETE FROM cirurgias WHERE id = ? AND clinica_id = ?').run(req.params.id, req.usuario.clinica_id)
  res.status(204).end()
})

export default router
