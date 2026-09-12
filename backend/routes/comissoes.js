import { Router } from 'express'
import { nanoid } from 'nanoid'
import { db } from '../db.js'
import { requireRole } from '../auth.js'

const router = Router()
const GESTAO = requireRole('admin', 'financeiro')
// Aprovar/editar participação em cirurgia (valor final + anotação) — coordenador
// entra aqui também, mas só para isso (o resto da tela de comissões continua
// fora do alcance dela, ver App.tsx/Layout.tsx).
const GESTAO_PARTICIPANTES = requireRole('admin', 'financeiro', 'coordenador')
// Quem pode vincular uma participação: gestão de sempre + a própria pessoa
// (ex: consultora/fisioterapeuta) lançando a própria comissão, que fica
// pendente até alguém de GESTAO_PARTICIPANTES aprovar.
const CRIACAO_PARTICIPANTE = requireRole('admin', 'financeiro', 'coordenador', 'pj')

function referenciaAtual() {
  return new Date().toISOString().slice(0, 7)
}

export function montarReferencia(mes, ano) {
  return mes && ano ? `${ano}-${String(mes).padStart(2, '0')}` : referenciaAtual()
}

// Comissão do mês = valor fixo mensal combinado (consultoria) + soma dos valores
// negociados caso a caso por cirurgia em que a pessoa participou (instrumentação etc.).
// O mês de competência do procedimento usa a data prevista da cirurgia; se não houver,
// cai para a data em que a participação foi lançada.
export function calcularComissao(clinicaId, usuarioId, referencia) {
  const config = db.prepare('SELECT valor_fixo_mensal FROM comissoes_config WHERE usuario_id = ?').get(usuarioId)
  const valorFixoMensal = config?.valor_fixo_mensal ?? 0

  const procedimentos = db
    .prepare(
      `SELECT cp.id, cp.cirurgia_id, cp.valor_comissao, cp.status AS status_participante, cp.observacao,
              c.nome_cirurgia, c.data_prevista, c.status
       FROM cirurgia_participantes cp
       JOIN cirurgias c ON c.id = cp.cirurgia_id
       WHERE cp.usuario_id = ? AND c.clinica_id = ?
         AND substr(COALESCE(c.data_prevista, cp.created_at), 1, 7) = ?
       ORDER BY COALESCE(c.data_prevista, cp.created_at) ASC`,
    )
    .all(usuarioId, clinicaId, referencia)

  // Participação pendente (auto-lançada, ex: consultora/fisioterapeuta) só entra
  // no total depois de aprovada — mesma regra já usada nas comissões avulsas.
  const totalProcedimentos = procedimentos
    .filter((p) => p.status_participante === 'aprovada')
    .reduce((s, p) => s + p.valor_comissao, 0)

  // Comissões avulsas: lançadas pela própria pessoa (ex: paciente de convênio que
  // não está cadastrado no sistema) — só entram no total depois de aprovadas.
  const avulsas = db
    .prepare(
      `SELECT * FROM comissoes_avulsas WHERE clinica_id = ? AND usuario_id = ? AND substr(data, 1, 7) = ? ORDER BY data DESC`,
    )
    .all(clinicaId, usuarioId, referencia)
  const totalAvulsasAprovadas = avulsas.filter((a) => a.status === 'aprovada').reduce((s, a) => s + a.valor, 0)

  // Extras: reembolso/despesa própria (ex: condução) sem ligação a paciente/cirurgia
  // — mesma regra, só conta depois de aprovado.
  const extras = db
    .prepare(`SELECT * FROM comissoes_extras WHERE clinica_id = ? AND usuario_id = ? AND substr(data, 1, 7) = ? ORDER BY data DESC`)
    .all(clinicaId, usuarioId, referencia)
  const totalExtrasAprovados = extras.filter((e) => e.status === 'aprovada').reduce((s, e) => s + e.valor, 0)

  return {
    valor_fixo_mensal: valorFixoMensal,
    procedimentos,
    total_procedimentos: totalProcedimentos,
    avulsas,
    total_avulsas_aprovadas: totalAvulsasAprovadas,
    extras,
    total_extras_aprovados: totalExtrasAprovados,
    total: valorFixoMensal + totalProcedimentos + totalAvulsasAprovadas + totalExtrasAprovados,
  }
}

router.get('/minhas', (req, res) => {
  const referencia = montarReferencia(req.query.mes, req.query.ano)
  res.json({ referencia, ...calcularComissao(req.usuario.clinica_id, req.usuario.id, referencia) })
})

export function resumoComissoesClinica(clinicaId, referencia) {
  const usuarios = db
    .prepare(
      `SELECT DISTINCT u.id, u.nome, u.role
       FROM usuarios u
       LEFT JOIN comissoes_config cc ON cc.usuario_id = u.id
       LEFT JOIN cirurgia_participantes cp ON cp.usuario_id = u.id
       LEFT JOIN cirurgias c ON c.id = cp.cirurgia_id AND c.clinica_id = u.clinica_id
       LEFT JOIN comissoes_avulsas ca ON ca.usuario_id = u.id AND ca.clinica_id = u.clinica_id AND substr(ca.data, 1, 7) = ?
       WHERE u.clinica_id = ? AND u.ativo = 1
         AND (
           cc.valor_fixo_mensal > 0
           OR (cp.id IS NOT NULL AND substr(COALESCE(c.data_prevista, cp.created_at), 1, 7) = ?)
           OR ca.id IS NOT NULL
         )
       ORDER BY u.nome COLLATE NOCASE`,
    )
    .all(referencia, clinicaId, referencia)

  return usuarios.map((u) => ({
    usuario_id: u.id,
    usuario_nome: u.nome,
    role: u.role,
    ...calcularComissao(clinicaId, u.id, referencia),
  }))
}

router.get('/', GESTAO, (req, res) => {
  const referencia = montarReferencia(req.query.mes, req.query.ano)
  res.json({ referencia, resumo: resumoComissoesClinica(req.usuario.clinica_id, referencia) })
})

router.get('/todas-comissionadas', GESTAO, (req, res) => {
  const rows = db
    .prepare(
      `SELECT id, nome, role FROM usuarios WHERE clinica_id = ? AND ativo = 1 ORDER BY nome COLLATE NOCASE`,
    )
    .all(req.usuario.clinica_id)
  res.json(rows)
})

router.put('/:usuario_id/fixo', GESTAO, (req, res) => {
  const usuario = db.prepare('SELECT id FROM usuarios WHERE id = ? AND clinica_id = ?').get(req.params.usuario_id, req.usuario.clinica_id)
  if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado' })
  const valor = Number(req.body.valor_fixo_mensal) || 0
  const existente = db.prepare('SELECT usuario_id FROM comissoes_config WHERE usuario_id = ?').get(req.params.usuario_id)
  if (existente) {
    db.prepare(`UPDATE comissoes_config SET valor_fixo_mensal = ?, atualizado_em = datetime('now') WHERE usuario_id = ?`).run(
      valor,
      req.params.usuario_id,
    )
  } else {
    db.prepare(`INSERT INTO comissoes_config (usuario_id, clinica_id, valor_fixo_mensal) VALUES (?, ?, ?)`).run(
      req.params.usuario_id,
      req.usuario.clinica_id,
      valor,
    )
  }
  res.json({ usuario_id: req.params.usuario_id, valor_fixo_mensal: valor })
})

router.get('/participantes', GESTAO_PARTICIPANTES, (req, res) => {
  const { cirurgia_id } = req.query
  if (!cirurgia_id) return res.status(400).json({ error: 'cirurgia_id é obrigatório' })
  const cirurgia = db.prepare('SELECT id FROM cirurgias WHERE id = ? AND clinica_id = ?').get(cirurgia_id, req.usuario.clinica_id)
  if (!cirurgia) return res.status(404).json({ error: 'Cirurgia não encontrada' })
  const rows = db
    .prepare(
      `SELECT cp.*, u.nome AS usuario_nome FROM cirurgia_participantes cp
       JOIN usuarios u ON u.id = cp.usuario_id WHERE cp.cirurgia_id = ? ORDER BY cp.created_at ASC`,
    )
    .all(cirurgia_id)
  res.json(rows)
})

// Participações que a própria pessoa lançou e ainda esperam aprovação de
// admin/financeiro/coordenador — mesma ideia das comissões avulsas pendentes.
router.get('/participantes/pendentes', GESTAO_PARTICIPANTES, (req, res) => {
  const rows = db
    .prepare(
      `SELECT cp.*, u.nome AS usuario_nome, u.role AS usuario_role, c.nome_cirurgia, c.data_prevista, p.nome AS paciente_nome
       FROM cirurgia_participantes cp
       JOIN usuarios u ON u.id = cp.usuario_id
       JOIN cirurgias c ON c.id = cp.cirurgia_id
       LEFT JOIN pacientes p ON p.id = c.paciente_id
       WHERE c.clinica_id = ? AND cp.status = 'pendente'
       ORDER BY cp.created_at ASC`,
    )
    .all(req.usuario.clinica_id)
  res.json(rows)
})

router.post('/participantes', CRIACAO_PARTICIPANTE, (req, res) => {
  const { cirurgia_id, valor_comissao } = req.body
  const ehAutoLancamento = req.usuario.role === 'pj'
  // Consultora/fisioterapeuta só lança a própria comissão — ignora qualquer
  // usuario_id enviado no corpo, mesmo que tentem forçar outro.
  const usuario_id = ehAutoLancamento ? req.usuario.id : req.body.usuario_id
  if (!cirurgia_id || !usuario_id) return res.status(400).json({ error: 'cirurgia_id e usuario_id são obrigatórios' })
  const cirurgia = db.prepare('SELECT id FROM cirurgias WHERE id = ? AND clinica_id = ?').get(cirurgia_id, req.usuario.clinica_id)
  if (!cirurgia) return res.status(400).json({ error: 'Cirurgia inválida' })
  const usuario = db.prepare('SELECT id FROM usuarios WHERE id = ? AND clinica_id = ?').get(usuario_id, req.usuario.clinica_id)
  if (!usuario) return res.status(400).json({ error: 'Usuário inválido' })
  const id = nanoid()
  if (ehAutoLancamento) {
    db.prepare(
      `INSERT INTO cirurgia_participantes (id, cirurgia_id, usuario_id, valor_comissao, criado_por, status)
       VALUES (?, ?, ?, ?, ?, 'pendente')`,
    ).run(id, cirurgia_id, usuario_id, Number(valor_comissao) || 0, req.usuario.id)
  } else {
    db.prepare(
      `INSERT INTO cirurgia_participantes (id, cirurgia_id, usuario_id, valor_comissao, criado_por, status, aprovado_por, aprovado_em)
       VALUES (?, ?, ?, ?, ?, 'aprovada', ?, datetime('now'))`,
    ).run(id, cirurgia_id, usuario_id, Number(valor_comissao) || 0, req.usuario.id, req.usuario.id)
  }
  res.status(201).json(db.prepare('SELECT * FROM cirurgia_participantes WHERE id = ?').get(id))
})

router.put('/participantes/:id', GESTAO_PARTICIPANTES, (req, res) => {
  const existente = db
    .prepare(`SELECT cp.* FROM cirurgia_participantes cp JOIN cirurgias c ON c.id = cp.cirurgia_id WHERE cp.id = ? AND c.clinica_id = ?`)
    .get(req.params.id, req.usuario.clinica_id)
  if (!existente) return res.status(404).json({ error: 'Participação não encontrada' })
  const merged = {
    valor_comissao: req.body.valor_comissao !== undefined ? Number(req.body.valor_comissao) || 0 : existente.valor_comissao,
    observacao: req.body.observacao !== undefined ? req.body.observacao || null : existente.observacao,
  }
  db.prepare('UPDATE cirurgia_participantes SET valor_comissao = ?, observacao = ? WHERE id = ?').run(
    merged.valor_comissao,
    merged.observacao,
    req.params.id,
  )
  res.json(db.prepare('SELECT * FROM cirurgia_participantes WHERE id = ?').get(req.params.id))
})

// Aprovar já permite ajustar valor/anotação no mesmo passo — é a coordenação
// (ou admin/financeiro) decidindo o valor final a pagar, não só um "sim/não".
router.put('/participantes/:id/aprovar', GESTAO_PARTICIPANTES, (req, res) => {
  const existente = db
    .prepare(`SELECT cp.* FROM cirurgia_participantes cp JOIN cirurgias c ON c.id = cp.cirurgia_id WHERE cp.id = ? AND c.clinica_id = ?`)
    .get(req.params.id, req.usuario.clinica_id)
  if (!existente) return res.status(404).json({ error: 'Participação não encontrada' })
  const valor = req.body.valor_comissao !== undefined ? Number(req.body.valor_comissao) || 0 : existente.valor_comissao
  const observacao = req.body.observacao !== undefined ? req.body.observacao || null : existente.observacao
  db.prepare(
    `UPDATE cirurgia_participantes SET valor_comissao=?, observacao=?, status='aprovada', aprovado_por=?, aprovado_em=datetime('now') WHERE id=?`,
  ).run(valor, observacao, req.usuario.id, req.params.id)
  res.json(db.prepare('SELECT * FROM cirurgia_participantes WHERE id = ?').get(req.params.id))
})

router.put('/participantes/:id/recusar', GESTAO_PARTICIPANTES, (req, res) => {
  const existente = db
    .prepare(`SELECT cp.id FROM cirurgia_participantes cp JOIN cirurgias c ON c.id = cp.cirurgia_id WHERE cp.id = ? AND c.clinica_id = ?`)
    .get(req.params.id, req.usuario.clinica_id)
  if (!existente) return res.status(404).json({ error: 'Participação não encontrada' })
  const observacao = req.body.observacao !== undefined ? req.body.observacao || null : null
  db.prepare(
    `UPDATE cirurgia_participantes SET status='recusada', observacao=?, aprovado_por=?, aprovado_em=datetime('now') WHERE id=?`,
  ).run(observacao, req.usuario.id, req.params.id)
  res.json(db.prepare('SELECT * FROM cirurgia_participantes WHERE id = ?').get(req.params.id))
})

router.delete('/participantes/:id', GESTAO_PARTICIPANTES, (req, res) => {
  const existente = db
    .prepare(`SELECT cp.* FROM cirurgia_participantes cp JOIN cirurgias c ON c.id = cp.cirurgia_id WHERE cp.id = ? AND c.clinica_id = ?`)
    .get(req.params.id, req.usuario.clinica_id)
  if (!existente) return res.status(404).json({ error: 'Participação não encontrada' })
  db.prepare('DELETE FROM cirurgia_participantes WHERE id = ?').run(req.params.id)
  res.status(204).end()
})

// A própria pessoa pode remover uma participação que ela mesma lançou,
// enquanto ainda estiver pendente — mesma regra das comissões avulsas.
router.delete('/participantes/:id/meu', requireRole('pj'), (req, res) => {
  const existente = db
    .prepare(`SELECT cp.* FROM cirurgia_participantes cp JOIN cirurgias c ON c.id = cp.cirurgia_id WHERE cp.id = ? AND c.clinica_id = ?`)
    .get(req.params.id, req.usuario.clinica_id)
  if (!existente) return res.status(404).json({ error: 'Participação não encontrada' })
  if (existente.usuario_id !== req.usuario.id || existente.status !== 'pendente') {
    return res.status(403).json({ error: 'Você só pode remover suas próprias participações enquanto estiverem pendentes' })
  }
  db.prepare('DELETE FROM cirurgia_participantes WHERE id = ?').run(req.params.id)
  res.status(204).end()
})

// Comissão avulsa: pra procedimentos de paciente que não está cadastrado no
// sistema (ex: convênio) — a própria pessoa lança e fica pendente até
// admin/financeiro aprovar. Só entra no total (e no "lançar como despesa")
// depois de aprovada.
router.get('/avulsas', (req, res) => {
  const podeVerTodos = ['admin', 'financeiro'].includes(req.usuario.role)
  let sql = `SELECT ca.*, u.nome AS usuario_nome FROM comissoes_avulsas ca JOIN usuarios u ON u.id = ca.usuario_id WHERE ca.clinica_id = ?`
  const params = [req.usuario.clinica_id]
  if (podeVerTodos) {
    if (req.query.usuario_id) {
      sql += ' AND ca.usuario_id = ?'
      params.push(req.query.usuario_id)
    }
  } else {
    sql += ' AND ca.usuario_id = ?'
    params.push(req.usuario.id)
  }
  if (req.query.status) {
    sql += ' AND ca.status = ?'
    params.push(req.query.status)
  }
  sql += ' ORDER BY ca.data DESC, ca.created_at DESC'
  res.json(db.prepare(sql).all(...params))
})

router.post('/avulsas', (req, res) => {
  const { data, paciente_nome, nome_cirurgia, descricao, valor, usuario_id } = req.body
  if (!data || !paciente_nome || !nome_cirurgia || !valor) {
    return res.status(400).json({ error: 'Data, paciente, nome da cirurgia e valor são obrigatórios' })
  }

  const podeEscolherOutro = ['admin', 'financeiro'].includes(req.usuario.role)
  const alvoId = podeEscolherOutro && usuario_id ? usuario_id : req.usuario.id
  if (alvoId !== req.usuario.id) {
    const alvo = db.prepare('SELECT id FROM usuarios WHERE id = ? AND clinica_id = ?').get(alvoId, req.usuario.clinica_id)
    if (!alvo) return res.status(400).json({ error: 'Usuário inválido' })
  }

  const id = nanoid()
  db.prepare(
    `INSERT INTO comissoes_avulsas (id, clinica_id, usuario_id, data, paciente_nome, nome_cirurgia, descricao, valor, criado_por)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, req.usuario.clinica_id, alvoId, data, paciente_nome, nome_cirurgia, descricao || '', Number(valor), req.usuario.id)

  res.status(201).json(db.prepare('SELECT * FROM comissoes_avulsas WHERE id = ?').get(id))
})

router.put('/avulsas/:id', (req, res) => {
  const existente = db.prepare('SELECT * FROM comissoes_avulsas WHERE id = ? AND clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!existente) return res.status(404).json({ error: 'Lançamento não encontrado' })
  const ehGestor = ['admin', 'financeiro'].includes(req.usuario.role)
  const ehDono = existente.usuario_id === req.usuario.id
  if (!ehGestor && !(ehDono && existente.status === 'pendente')) {
    return res.status(403).json({ error: 'Você só pode editar seus próprios lançamentos enquanto estiverem pendentes' })
  }
  const merged = {
    data: req.body.data ?? existente.data,
    paciente_nome: req.body.paciente_nome ?? existente.paciente_nome,
    nome_cirurgia: req.body.nome_cirurgia ?? existente.nome_cirurgia,
    descricao: req.body.descricao !== undefined ? req.body.descricao || '' : existente.descricao,
    valor: req.body.valor !== undefined ? Number(req.body.valor) : existente.valor,
  }
  db.prepare('UPDATE comissoes_avulsas SET data=?, paciente_nome=?, nome_cirurgia=?, descricao=?, valor=? WHERE id=?').run(
    merged.data,
    merged.paciente_nome,
    merged.nome_cirurgia,
    merged.descricao,
    merged.valor,
    req.params.id,
  )
  res.json(db.prepare('SELECT * FROM comissoes_avulsas WHERE id = ?').get(req.params.id))
})

router.delete('/avulsas/:id', (req, res) => {
  const existente = db.prepare('SELECT * FROM comissoes_avulsas WHERE id = ? AND clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!existente) return res.status(404).json({ error: 'Lançamento não encontrado' })
  const ehGestor = ['admin', 'financeiro'].includes(req.usuario.role)
  const ehDono = existente.usuario_id === req.usuario.id
  if (!ehGestor && !(ehDono && existente.status === 'pendente')) {
    return res.status(403).json({ error: 'Você só pode remover seus próprios lançamentos enquanto estiverem pendentes' })
  }
  db.prepare('DELETE FROM comissoes_avulsas WHERE id = ?').run(req.params.id)
  res.status(204).end()
})

router.put('/avulsas/:id/aprovar', GESTAO, (req, res) => {
  const existente = db.prepare('SELECT * FROM comissoes_avulsas WHERE id = ? AND clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!existente) return res.status(404).json({ error: 'Lançamento não encontrado' })
  db.prepare(`UPDATE comissoes_avulsas SET status='aprovada', aprovado_por=?, aprovado_em=datetime('now') WHERE id=?`).run(
    req.usuario.id,
    req.params.id,
  )
  res.json(db.prepare('SELECT * FROM comissoes_avulsas WHERE id = ?').get(req.params.id))
})

router.put('/avulsas/:id/recusar', GESTAO, (req, res) => {
  const existente = db.prepare('SELECT * FROM comissoes_avulsas WHERE id = ? AND clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!existente) return res.status(404).json({ error: 'Lançamento não encontrado' })
  db.prepare(
    `UPDATE comissoes_avulsas SET status='recusada', aprovado_por=?, aprovado_em=datetime('now'), observacao_aprovacao=? WHERE id=?`,
  ).run(req.usuario.id, req.body.observacao || null, req.params.id)
  res.json(db.prepare('SELECT * FROM comissoes_avulsas WHERE id = ?').get(req.params.id))
})

// Extra/reembolso (ex: condução) — igual às avulsas, mas sem paciente/cirurgia,
// só uma descrição livre + valor. Aprovação aqui inclui coordenador (mesma
// pessoa que já aprova a participação em cirurgia da consultora/fisioterapeuta).
router.get('/extras', (req, res) => {
  const podeVerTodos = ['admin', 'financeiro', 'coordenador'].includes(req.usuario.role)
  let sql = `SELECT ce.*, u.nome AS usuario_nome FROM comissoes_extras ce JOIN usuarios u ON u.id = ce.usuario_id WHERE ce.clinica_id = ?`
  const params = [req.usuario.clinica_id]
  if (podeVerTodos) {
    if (req.query.usuario_id) {
      sql += ' AND ce.usuario_id = ?'
      params.push(req.query.usuario_id)
    }
  } else {
    sql += ' AND ce.usuario_id = ?'
    params.push(req.usuario.id)
  }
  if (req.query.status) {
    sql += ' AND ce.status = ?'
    params.push(req.query.status)
  }
  sql += ' ORDER BY ce.data DESC, ce.created_at DESC'
  res.json(db.prepare(sql).all(...params))
})

router.post('/extras', (req, res) => {
  const { data, descricao, valor, usuario_id } = req.body
  if (!data || !descricao || !valor) {
    return res.status(400).json({ error: 'Data, descrição e valor são obrigatórios' })
  }

  const podeEscolherOutro = ['admin', 'financeiro'].includes(req.usuario.role)
  const alvoId = podeEscolherOutro && usuario_id ? usuario_id : req.usuario.id
  if (alvoId !== req.usuario.id) {
    const alvo = db.prepare('SELECT id FROM usuarios WHERE id = ? AND clinica_id = ?').get(alvoId, req.usuario.clinica_id)
    if (!alvo) return res.status(400).json({ error: 'Usuário inválido' })
  }

  const id = nanoid()
  db.prepare(
    `INSERT INTO comissoes_extras (id, clinica_id, usuario_id, data, descricao, valor, criado_por) VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, req.usuario.clinica_id, alvoId, data, descricao, Number(valor), req.usuario.id)

  res.status(201).json(db.prepare('SELECT * FROM comissoes_extras WHERE id = ?').get(id))
})

router.put('/extras/:id', (req, res) => {
  const existente = db.prepare('SELECT * FROM comissoes_extras WHERE id = ? AND clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!existente) return res.status(404).json({ error: 'Lançamento não encontrado' })
  const ehGestor = ['admin', 'financeiro', 'coordenador'].includes(req.usuario.role)
  const ehDono = existente.usuario_id === req.usuario.id
  if (!ehGestor && !(ehDono && existente.status === 'pendente')) {
    return res.status(403).json({ error: 'Você só pode editar seus próprios lançamentos enquanto estiverem pendentes' })
  }
  const merged = {
    data: req.body.data ?? existente.data,
    descricao: req.body.descricao ?? existente.descricao,
    valor: req.body.valor !== undefined ? Number(req.body.valor) : existente.valor,
  }
  db.prepare('UPDATE comissoes_extras SET data=?, descricao=?, valor=? WHERE id=?').run(
    merged.data,
    merged.descricao,
    merged.valor,
    req.params.id,
  )
  res.json(db.prepare('SELECT * FROM comissoes_extras WHERE id = ?').get(req.params.id))
})

router.delete('/extras/:id', (req, res) => {
  const existente = db.prepare('SELECT * FROM comissoes_extras WHERE id = ? AND clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!existente) return res.status(404).json({ error: 'Lançamento não encontrado' })
  const ehGestor = ['admin', 'financeiro', 'coordenador'].includes(req.usuario.role)
  const ehDono = existente.usuario_id === req.usuario.id
  if (!ehGestor && !(ehDono && existente.status === 'pendente')) {
    return res.status(403).json({ error: 'Você só pode remover seus próprios lançamentos enquanto estiverem pendentes' })
  }
  db.prepare('DELETE FROM comissoes_extras WHERE id = ?').run(req.params.id)
  res.status(204).end()
})

router.get('/extras/pendentes', GESTAO_PARTICIPANTES, (req, res) => {
  const rows = db
    .prepare(
      `SELECT ce.*, u.nome AS usuario_nome, u.role AS usuario_role FROM comissoes_extras ce
       JOIN usuarios u ON u.id = ce.usuario_id WHERE ce.clinica_id = ? AND ce.status = 'pendente'
       ORDER BY ce.data DESC, ce.created_at DESC`,
    )
    .all(req.usuario.clinica_id)
  res.json(rows)
})

router.put('/extras/:id/aprovar', GESTAO_PARTICIPANTES, (req, res) => {
  const existente = db.prepare('SELECT * FROM comissoes_extras WHERE id = ? AND clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!existente) return res.status(404).json({ error: 'Lançamento não encontrado' })
  const valor = req.body.valor !== undefined ? Number(req.body.valor) || 0 : existente.valor
  const observacao = req.body.observacao !== undefined ? req.body.observacao || null : existente.observacao_aprovacao
  db.prepare(
    `UPDATE comissoes_extras SET valor=?, observacao_aprovacao=?, status='aprovada', aprovado_por=?, aprovado_em=datetime('now') WHERE id=?`,
  ).run(valor, observacao, req.usuario.id, req.params.id)
  res.json(db.prepare('SELECT * FROM comissoes_extras WHERE id = ?').get(req.params.id))
})

router.put('/extras/:id/recusar', GESTAO_PARTICIPANTES, (req, res) => {
  const existente = db.prepare('SELECT * FROM comissoes_extras WHERE id = ? AND clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!existente) return res.status(404).json({ error: 'Lançamento não encontrado' })
  db.prepare(
    `UPDATE comissoes_extras SET status='recusada', aprovado_por=?, aprovado_em=datetime('now'), observacao_aprovacao=? WHERE id=?`,
  ).run(req.usuario.id, req.body.observacao || null, req.params.id)
  res.json(db.prepare('SELECT * FROM comissoes_extras WHERE id = ?').get(req.params.id))
})

router.post('/lancar', GESTAO, (req, res) => {
  const { usuario_id, mes, ano } = req.body
  if (!usuario_id) return res.status(400).json({ error: 'usuario_id é obrigatório' })
  const usuario = db.prepare('SELECT id, nome FROM usuarios WHERE id = ? AND clinica_id = ?').get(usuario_id, req.usuario.clinica_id)
  if (!usuario) return res.status(400).json({ error: 'Usuário inválido' })
  const referencia = montarReferencia(mes, ano)

  const jaLancado = db
    .prepare(
      `SELECT id FROM despesas_clinica WHERE clinica_id = ? AND categoria = 'comissao' AND usuario_id_referencia = ? AND competencia = ?`,
    )
    .get(req.usuario.clinica_id, usuario_id, referencia)
  if (jaLancado) {
    return res.status(409).json({ error: `Já existe uma despesa de comissão lançada para ${usuario.nome} em ${referencia}` })
  }

  const { total } = calcularComissao(req.usuario.clinica_id, usuario_id, referencia)
  if (total <= 0) return res.status(400).json({ error: 'Não há comissão a lançar para este período' })

  const id = nanoid()
  db.prepare(
    `INSERT INTO despesas_clinica (id, clinica_id, descricao, categoria, valor, data, status, criado_por, usuario_id_referencia, competencia)
     VALUES (?, ?, ?, 'comissao', ?, ?, 'pendente', ?, ?, ?)`,
  ).run(id, req.usuario.clinica_id, `Comissão — ${usuario.nome} (${referencia})`, total, `${referencia}-01`, req.usuario.id, usuario_id, referencia)

  res.status(201).json(db.prepare('SELECT * FROM despesas_clinica WHERE id = ?').get(id))
})

export default router
