import { Router } from 'express'
import { nanoid } from 'nanoid'
import { db } from '../db.js'
import { requireRole } from '../auth.js'

const router = Router()
const ACESSO = requireRole('admin', 'financeiro', 'medico')
const GESTAO_ORCAMENTO = requireRole('admin', 'financeiro', 'medico')
const GESTAO_CATALOGO = requireRole('admin', 'financeiro')
router.use(ACESSO)

const SELECT_JOIN = `
  SELECT o.*, p.nome AS paciente_nome
  FROM orcamentos o
  LEFT JOIN pacientes p ON p.id = o.paciente_id
`

function itensParaTexto(itens) {
  if (Array.isArray(itens)) return JSON.stringify(itens)
  if (typeof itens === 'string') return itens
  return null
}

function comItensArray(row) {
  if (!row) return row
  let itens = []
  try {
    itens = row.itens ? JSON.parse(row.itens) : []
  } catch {
    itens = []
  }
  return { ...row, itens }
}

function somarItens(itens) {
  if (!Array.isArray(itens)) return 0
  return itens.reduce((soma, item) => soma + (Number(item.valor) || 0), 0)
}

// Itens de orçamento só podem vir do catálogo (nada de descrição/valor livres) —
// resolve item_id -> {descricao, valor} a partir do catálogo, ignorando qualquer
// valor enviado pelo cliente, para o preço não poder ser adulterado.
function validarEResolverItens(itens, clinicaId) {
  if (!Array.isArray(itens) || itens.length === 0) return { erro: 'Selecione ao menos um item do catálogo' }
  const resolvidos = []
  for (const item of itens) {
    if (!item || !item.item_id) return { erro: 'Item inválido' }
    const catalogo = db
      .prepare('SELECT * FROM itens_orcamento_catalogo WHERE id = ? AND clinica_id = ? AND ativo = 1')
      .get(item.item_id, clinicaId)
    if (!catalogo) return { erro: 'Item não encontrado no catálogo' }
    const quantidade = Number(item.quantidade) > 0 ? Number(item.quantidade) : 1
    resolvidos.push({
      item_id: catalogo.id,
      descricao: catalogo.nome,
      valor_unitario: catalogo.valor,
      quantidade,
      valor: catalogo.valor * quantidade,
    })
  }
  return { itens: resolvidos }
}

router.get('/catalogo-itens', (req, res) => {
  const ativo = req.query.ativo
  let sql = 'SELECT * FROM itens_orcamento_catalogo WHERE clinica_id = ?'
  const params = [req.usuario.clinica_id]
  if (ativo !== undefined) {
    sql += ' AND ativo = ?'
    params.push(ativo === 'true' || ativo === '1' ? 1 : 0)
  }
  sql += ' ORDER BY nome ASC'
  res.json(db.prepare(sql).all(...params))
})

router.post('/catalogo-itens', GESTAO_CATALOGO, (req, res) => {
  const { nome, valor } = req.body
  if (!nome || !nome.trim()) return res.status(400).json({ error: 'Nome do item é obrigatório' })
  if (valor === undefined || Number.isNaN(Number(valor))) return res.status(400).json({ error: 'Valor inválido' })

  const id = nanoid()
  db.prepare(
    `INSERT INTO itens_orcamento_catalogo (id, clinica_id, nome, valor, criado_por) VALUES (?, ?, ?, ?, ?)`,
  ).run(id, req.usuario.clinica_id, nome.trim(), Number(valor), req.usuario.id)

  res.status(201).json(db.prepare('SELECT * FROM itens_orcamento_catalogo WHERE id = ?').get(id))
})

router.put('/catalogo-itens/:id', GESTAO_CATALOGO, (req, res) => {
  const existente = db
    .prepare('SELECT * FROM itens_orcamento_catalogo WHERE id = ? AND clinica_id = ?')
    .get(req.params.id, req.usuario.clinica_id)
  if (!existente) return res.status(404).json({ error: 'Item não encontrado' })

  const nome = req.body.nome !== undefined ? req.body.nome.trim() : existente.nome
  const valor = req.body.valor !== undefined ? Number(req.body.valor) : existente.valor
  const ativo = req.body.ativo !== undefined ? (req.body.ativo ? 1 : 0) : existente.ativo
  if (!nome) return res.status(400).json({ error: 'Nome do item é obrigatório' })
  if (Number.isNaN(valor)) return res.status(400).json({ error: 'Valor inválido' })

  db.prepare('UPDATE itens_orcamento_catalogo SET nome=?, valor=?, ativo=? WHERE id=?').run(nome, valor, ativo, req.params.id)
  res.json(db.prepare('SELECT * FROM itens_orcamento_catalogo WHERE id = ?').get(req.params.id))
})

router.delete('/catalogo-itens/:id', GESTAO_CATALOGO, (req, res) => {
  db.prepare('DELETE FROM itens_orcamento_catalogo WHERE id = ? AND clinica_id = ?').run(req.params.id, req.usuario.clinica_id)
  res.status(204).end()
})

router.get('/', (req, res) => {
  const { paciente_id, status } = req.query
  let sql = SELECT_JOIN + ' WHERE o.clinica_id = ?'
  const params = [req.usuario.clinica_id]
  if (paciente_id) {
    sql += ' AND o.paciente_id = ?'
    params.push(paciente_id)
  }
  if (status) {
    sql += ' AND o.status = ?'
    params.push(status)
  }
  sql += ' ORDER BY o.created_at DESC'
  res.json(db.prepare(sql).all(...params).map(comItensArray))
})

router.get('/:id', (req, res) => {
  const row = db.prepare(SELECT_JOIN + ' WHERE o.id = ? AND o.clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!row) return res.status(404).json({ error: 'Orçamento não encontrado' })
  res.json(comItensArray(row))
})

router.post('/', GESTAO_ORCAMENTO, (req, res) => {
  const { paciente_id, titulo, itens, observacoes } = req.body
  if (!paciente_id || !titulo) return res.status(400).json({ error: 'Paciente e título são obrigatórios' })
  const paciente = db.prepare('SELECT id FROM pacientes WHERE id = ? AND clinica_id = ?').get(paciente_id, req.usuario.clinica_id)
  if (!paciente) return res.status(400).json({ error: 'Paciente inválido' })

  const resolvido = validarEResolverItens(itens, req.usuario.clinica_id)
  if (resolvido.erro) return res.status(400).json({ error: resolvido.erro })

  const id = nanoid()
  const valorTotal = somarItens(resolvido.itens)
  db.prepare(
    `INSERT INTO orcamentos (id, clinica_id, paciente_id, titulo, itens, valor_total, observacoes, criado_por)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, req.usuario.clinica_id, paciente_id, titulo, itensParaTexto(resolvido.itens), valorTotal, observacoes || null, req.usuario.id)

  res.status(201).json(comItensArray(db.prepare(SELECT_JOIN + ' WHERE o.id = ?').get(id)))
})

router.put('/:id', GESTAO_ORCAMENTO, (req, res) => {
  const existente = db.prepare('SELECT * FROM orcamentos WHERE id = ? AND clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!existente) return res.status(404).json({ error: 'Orçamento não encontrado' })

  let itensTexto = existente.itens
  let valorTotal = existente.valor_total
  if (req.body.itens !== undefined) {
    const resolvido = validarEResolverItens(req.body.itens, req.usuario.clinica_id)
    if (resolvido.erro) return res.status(400).json({ error: resolvido.erro })
    itensTexto = itensParaTexto(resolvido.itens)
    valorTotal = somarItens(resolvido.itens)
  }

  const merged = {
    titulo: req.body.titulo ?? existente.titulo,
    itens: itensTexto,
    valor_total: valorTotal,
    status: req.body.status ?? existente.status,
    observacoes: req.body.observacoes !== undefined ? req.body.observacoes || null : existente.observacoes,
  }

  db.prepare(
    `UPDATE orcamentos SET titulo=?, itens=?, valor_total=?, status=?, observacoes=?, atualizado_em=datetime('now') WHERE id=?`,
  ).run(merged.titulo, merged.itens, merged.valor_total, merged.status, merged.observacoes, req.params.id)

  res.json(comItensArray(db.prepare(SELECT_JOIN + ' WHERE o.id = ?').get(req.params.id)))
})

router.delete('/:id', GESTAO_ORCAMENTO, (req, res) => {
  db.prepare('DELETE FROM orcamentos WHERE id = ? AND clinica_id = ?').run(req.params.id, req.usuario.clinica_id)
  res.status(204).end()
})

export default router
