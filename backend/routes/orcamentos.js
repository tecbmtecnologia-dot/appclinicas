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
async function validarEResolverItens(itens, clinicaId) {
  if (!Array.isArray(itens) || itens.length === 0) return { erro: 'Selecione ao menos um item do catálogo' }
  const resolvidos = []
  for (const item of itens) {
    if (!item || !item.item_id) return { erro: 'Item inválido' }
    const catalogo = await db
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

router.get('/catalogo-itens', async (req, res) => {
  const ativo = req.query.ativo
  let sql = 'SELECT * FROM itens_orcamento_catalogo WHERE clinica_id = ?'
  const params = [req.usuario.clinica_id]
  if (ativo !== undefined) {
    sql += ' AND ativo = ?'
    params.push(ativo === 'true' || ativo === '1' ? 1 : 0)
  }
  sql += ' ORDER BY nome ASC'
  res.json(await db.prepare(sql).all(...params))
})

router.post('/catalogo-itens', GESTAO_CATALOGO, async (req, res) => {
  const { nome, valor } = req.body
  if (!nome || !nome.trim()) return res.status(400).json({ error: 'Nome do item é obrigatório' })
  if (valor === undefined || Number.isNaN(Number(valor))) return res.status(400).json({ error: 'Valor inválido' })

  const id = nanoid()
  await db.prepare(
    `INSERT INTO itens_orcamento_catalogo (id, clinica_id, nome, valor, criado_por) VALUES (?, ?, ?, ?, ?)`,
  ).run(id, req.usuario.clinica_id, nome.trim(), Number(valor), req.usuario.id)

  res.status(201).json(await db.prepare('SELECT * FROM itens_orcamento_catalogo WHERE id = ?').get(id))
})

router.put('/catalogo-itens/:id', GESTAO_CATALOGO, async (req, res) => {
  const existente = await db
    .prepare('SELECT * FROM itens_orcamento_catalogo WHERE id = ? AND clinica_id = ?')
    .get(req.params.id, req.usuario.clinica_id)
  if (!existente) return res.status(404).json({ error: 'Item não encontrado' })

  const nome = req.body.nome !== undefined ? req.body.nome.trim() : existente.nome
  const valor = req.body.valor !== undefined ? Number(req.body.valor) : existente.valor
  const ativo = req.body.ativo !== undefined ? (req.body.ativo ? 1 : 0) : existente.ativo
  if (!nome) return res.status(400).json({ error: 'Nome do item é obrigatório' })
  if (Number.isNaN(valor)) return res.status(400).json({ error: 'Valor inválido' })

  await db.prepare('UPDATE itens_orcamento_catalogo SET nome=?, valor=?, ativo=? WHERE id=?').run(nome, valor, ativo, req.params.id)
  res.json(await db.prepare('SELECT * FROM itens_orcamento_catalogo WHERE id = ?').get(req.params.id))
})

router.delete('/catalogo-itens/:id', GESTAO_CATALOGO, async (req, res) => {
  await db.prepare('DELETE FROM itens_orcamento_catalogo WHERE id = ? AND clinica_id = ?').run(req.params.id, req.usuario.clinica_id)
  res.status(204).end()
})

// Modelo de orçamento = um conjunto de itens do catálogo salvo com um nome,
// pra montar um orçamento novo só selecionando o modelo em vez de escolher
// item por item toda vez. Só guarda item_id+quantidade (nunca preço), os
// valores são sempre resolvidos ao vivo a partir do catálogo (preço atual).
function itensModeloParaTexto(itens) {
  return JSON.stringify(
    itens.map((it) => ({
      item_id: it.item_id,
      quantidade: Number(it.quantidade) > 0 ? Number(it.quantidade) : 1,
    })),
  )
}

async function validarItensModelo(itens, clinicaId) {
  if (!Array.isArray(itens) || itens.length === 0) return { erro: 'Selecione ao menos um item do catálogo' }
  for (const item of itens) {
    if (!item || !item.item_id) return { erro: 'Item inválido' }
    const catalogo = await db
      .prepare('SELECT id FROM itens_orcamento_catalogo WHERE id = ? AND clinica_id = ?')
      .get(item.item_id, clinicaId)
    if (!catalogo) return { erro: 'Item não encontrado no catálogo' }
  }
  return {}
}

async function comItensModeloArray(row) {
  if (!row) return row
  let lista = []
  try {
    lista = row.itens ? JSON.parse(row.itens) : []
  } catch {
    lista = []
  }
  const itens = await Promise.all(
    lista.map(async (it) => {
      const catalogo = await db.prepare('SELECT nome, valor FROM itens_orcamento_catalogo WHERE id = ?').get(it.item_id)
      const quantidade = Number(it.quantidade) > 0 ? Number(it.quantidade) : 1
      return {
        item_id: it.item_id,
        descricao: catalogo ? catalogo.nome : '(item removido do catálogo)',
        valor_unitario: catalogo ? catalogo.valor : 0,
        quantidade,
        valor: catalogo ? catalogo.valor * quantidade : 0,
      }
    }),
  )
  return { ...row, itens }
}

router.get('/modelos', async (req, res) => {
  const ativo = req.query.ativo
  let sql = 'SELECT * FROM orcamento_modelos WHERE clinica_id = ?'
  const params = [req.usuario.clinica_id]
  if (ativo !== undefined) {
    sql += ' AND ativo = ?'
    params.push(ativo === 'true' || ativo === '1' ? 1 : 0)
  }
  sql += ' ORDER BY nome ASC'
  const rows = await db.prepare(sql).all(...params)
  res.json(await Promise.all(rows.map(comItensModeloArray)))
})

router.post('/modelos', GESTAO_CATALOGO, async (req, res) => {
  const { nome, itens } = req.body
  if (!nome || !nome.trim()) return res.status(400).json({ error: 'Nome do modelo é obrigatório' })
  const validacao = await validarItensModelo(itens, req.usuario.clinica_id)
  if (validacao.erro) return res.status(400).json({ error: validacao.erro })

  const id = nanoid()
  await db.prepare(`INSERT INTO orcamento_modelos (id, clinica_id, nome, itens, criado_por) VALUES (?, ?, ?, ?, ?)`).run(
    id,
    req.usuario.clinica_id,
    nome.trim(),
    itensModeloParaTexto(itens),
    req.usuario.id,
  )

  res.status(201).json(await comItensModeloArray(await db.prepare('SELECT * FROM orcamento_modelos WHERE id = ?').get(id)))
})

router.put('/modelos/:id', GESTAO_CATALOGO, async (req, res) => {
  const existente = await db
    .prepare('SELECT * FROM orcamento_modelos WHERE id = ? AND clinica_id = ?')
    .get(req.params.id, req.usuario.clinica_id)
  if (!existente) return res.status(404).json({ error: 'Modelo não encontrado' })

  const nome = req.body.nome !== undefined ? req.body.nome.trim() : existente.nome
  if (!nome) return res.status(400).json({ error: 'Nome do modelo é obrigatório' })

  let itensTexto = existente.itens
  if (req.body.itens !== undefined) {
    const validacao = await validarItensModelo(req.body.itens, req.usuario.clinica_id)
    if (validacao.erro) return res.status(400).json({ error: validacao.erro })
    itensTexto = itensModeloParaTexto(req.body.itens)
  }
  const ativo = req.body.ativo !== undefined ? (req.body.ativo ? 1 : 0) : existente.ativo

  await db.prepare('UPDATE orcamento_modelos SET nome=?, itens=?, ativo=? WHERE id=?').run(nome, itensTexto, ativo, req.params.id)
  res.json(await comItensModeloArray(await db.prepare('SELECT * FROM orcamento_modelos WHERE id = ?').get(req.params.id)))
})

router.delete('/modelos/:id', GESTAO_CATALOGO, async (req, res) => {
  await db.prepare('DELETE FROM orcamento_modelos WHERE id = ? AND clinica_id = ?').run(req.params.id, req.usuario.clinica_id)
  res.status(204).end()
})

router.get('/', async (req, res) => {
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
  const rows = await db.prepare(sql).all(...params)
  res.json(rows.map(comItensArray))
})

router.get('/:id', async (req, res) => {
  const row = await db.prepare(SELECT_JOIN + ' WHERE o.id = ? AND o.clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!row) return res.status(404).json({ error: 'Orçamento não encontrado' })
  res.json(comItensArray(row))
})

router.post('/', GESTAO_ORCAMENTO, async (req, res) => {
  const { paciente_id, titulo, itens, observacoes } = req.body
  if (!paciente_id || !titulo) return res.status(400).json({ error: 'Paciente e título são obrigatórios' })
  const paciente = await db.prepare('SELECT id FROM pacientes WHERE id = ? AND clinica_id = ?').get(paciente_id, req.usuario.clinica_id)
  if (!paciente) return res.status(400).json({ error: 'Paciente inválido' })

  const resolvido = await validarEResolverItens(itens, req.usuario.clinica_id)
  if (resolvido.erro) return res.status(400).json({ error: resolvido.erro })

  const id = nanoid()
  const valorTotal = somarItens(resolvido.itens)
  await db.prepare(
    `INSERT INTO orcamentos (id, clinica_id, paciente_id, titulo, itens, valor_total, observacoes, criado_por)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, req.usuario.clinica_id, paciente_id, titulo, itensParaTexto(resolvido.itens), valorTotal, observacoes || null, req.usuario.id)

  res.status(201).json(comItensArray(await db.prepare(SELECT_JOIN + ' WHERE o.id = ?').get(id)))
})

router.put('/:id', GESTAO_ORCAMENTO, async (req, res) => {
  const existente = await db.prepare('SELECT * FROM orcamentos WHERE id = ? AND clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!existente) return res.status(404).json({ error: 'Orçamento não encontrado' })

  let itensTexto = existente.itens
  let valorTotal = existente.valor_total
  if (req.body.itens !== undefined) {
    const resolvido = await validarEResolverItens(req.body.itens, req.usuario.clinica_id)
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

  await db.prepare(
    `UPDATE orcamentos SET titulo=?, itens=?, valor_total=?, status=?, observacoes=?, atualizado_em=now() WHERE id=?`,
  ).run(merged.titulo, merged.itens, merged.valor_total, merged.status, merged.observacoes, req.params.id)

  res.json(comItensArray(await db.prepare(SELECT_JOIN + ' WHERE o.id = ?').get(req.params.id)))
})

router.delete('/:id', GESTAO_ORCAMENTO, async (req, res) => {
  await db.prepare('DELETE FROM orcamentos WHERE id = ? AND clinica_id = ?').run(req.params.id, req.usuario.clinica_id)
  res.status(204).end()
})

export default router
