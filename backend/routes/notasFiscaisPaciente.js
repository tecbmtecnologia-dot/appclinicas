import { Router } from 'express'
import { nanoid } from 'nanoid'
import { db } from '../db.js'
import { requireRole } from '../auth.js'
import { uploadNotaFiscal } from '../upload.js'

const router = Router()
const ACESSO = requireRole('admin', 'recepcao', 'financeiro')
const EXCLUSAO = requireRole('admin', 'financeiro')
router.use(ACESSO)

router.get('/', (req, res) => {
  const { paciente_id } = req.query
  if (!paciente_id) return res.status(400).json({ error: 'paciente_id é obrigatório' })
  const rows = db
    .prepare('SELECT * FROM notas_fiscais_paciente WHERE clinica_id = ? AND paciente_id = ? ORDER BY created_at DESC')
    .all(req.usuario.clinica_id, paciente_id)
  res.json(rows)
})

router.post('/', uploadNotaFiscal.single('arquivo'), (req, res) => {
  const { paciente_id, descricao } = req.body
  if (!paciente_id) return res.status(400).json({ error: 'paciente_id é obrigatório' })
  if (!req.file) return res.status(400).json({ error: 'Envie um arquivo PDF' })

  const paciente = db.prepare('SELECT id FROM pacientes WHERE id = ? AND clinica_id = ?').get(paciente_id, req.usuario.clinica_id)
  if (!paciente) return res.status(400).json({ error: 'Paciente inválido' })

  const id = nanoid()
  const arquivoUrl = `/uploads/notas-fiscais/${req.file.filename}`
  db.prepare(
    `INSERT INTO notas_fiscais_paciente (id, clinica_id, paciente_id, descricao, arquivo_url, nome_arquivo, criado_por)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, req.usuario.clinica_id, paciente_id, descricao || null, arquivoUrl, req.file.originalname, req.usuario.id)

  res.status(201).json(db.prepare('SELECT * FROM notas_fiscais_paciente WHERE id = ?').get(id))
})

router.delete('/:id', EXCLUSAO, (req, res) => {
  db.prepare('DELETE FROM notas_fiscais_paciente WHERE id = ? AND clinica_id = ?').run(req.params.id, req.usuario.clinica_id)
  res.status(204).end()
})

export default router
