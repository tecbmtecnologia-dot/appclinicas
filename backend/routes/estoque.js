import { Router } from 'express'
import { nanoid } from 'nanoid'
import { db } from '../db.js'
import { requireRole } from '../auth.js'
import { gerarRelatorioEstoquePDF } from '../pdfRelatorios.js'

const router = Router()
const LEITURA = requireRole('admin', 'coordenador', 'enfermagem')
const ESCRITA = requireRole('admin')
router.use(LEITURA)

function listar(clinicaId) {
  return db
    .prepare('SELECT * FROM estoque_itens WHERE clinica_id = ? ORDER BY (data_validade IS NULL), data_validade ASC, descricao COLLATE NOCASE')
    .all(clinicaId)
}

router.get('/', (req, res) => {
  res.json(listar(req.usuario.clinica_id))
})

router.get('/relatorio.pdf', (req, res) => {
  const clinica = db.prepare('SELECT * FROM clinicas WHERE id = ?').get(req.usuario.clinica_id)
  const itens = listar(req.usuario.clinica_id)
  gerarRelatorioEstoquePDF(res, { clinica, itens })
})

router.post('/', ESCRITA, (req, res) => {
  const { descricao, quantidade, data_validade } = req.body
  if (!descricao || quantidade === undefined || quantidade === null) {
    return res.status(400).json({ error: 'Descrição e quantidade são obrigatórias' })
  }
  const id = nanoid()
  db.prepare(
    `INSERT INTO estoque_itens (id, clinica_id, descricao, quantidade, data_validade, criado_por) VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(id, req.usuario.clinica_id, descricao, Number(quantidade), data_validade || null, req.usuario.id)
  res.status(201).json(db.prepare('SELECT * FROM estoque_itens WHERE id = ?').get(id))
})

router.put('/:id', ESCRITA, (req, res) => {
  const existente = db.prepare('SELECT * FROM estoque_itens WHERE id = ? AND clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!existente) return res.status(404).json({ error: 'Item não encontrado' })

  const merged = {
    descricao: req.body.descricao ?? existente.descricao,
    quantidade: req.body.quantidade !== undefined ? Number(req.body.quantidade) : existente.quantidade,
    data_validade: req.body.data_validade !== undefined ? req.body.data_validade || null : existente.data_validade,
  }
  db.prepare(`UPDATE estoque_itens SET descricao=?, quantidade=?, data_validade=?, atualizado_em=datetime('now') WHERE id=?`).run(
    merged.descricao,
    merged.quantidade,
    merged.data_validade,
    req.params.id,
  )
  res.json(db.prepare('SELECT * FROM estoque_itens WHERE id = ?').get(req.params.id))
})

router.delete('/:id', ESCRITA, (req, res) => {
  db.prepare('DELETE FROM estoque_itens WHERE id = ? AND clinica_id = ?').run(req.params.id, req.usuario.clinica_id)
  res.status(204).end()
})

export default router
