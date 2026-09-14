import { Router } from 'express'
import { nanoid } from 'nanoid'
import { db } from '../db.js'
import { requireRole } from '../auth.js'
import { uploadContratoPaciente } from '../upload.js'

const router = Router()
const ESCRITA = requireRole('admin', 'coordenador', 'recepcao')
const EXCLUSAO = requireRole('admin', 'coordenador')
router.use(requireRole('admin', 'coordenador', 'recepcao', 'financeiro'))

router.get('/', async (req, res) => {
  const { paciente_id } = req.query
  if (!paciente_id) return res.status(400).json({ error: 'paciente_id é obrigatório' })
  const rows = await db
    .prepare('SELECT * FROM contratos_paciente WHERE clinica_id = ? AND paciente_id = ? ORDER BY created_at DESC')
    .all(req.usuario.clinica_id, paciente_id)
  res.json(rows)
})

const TIPOS_VALIDOS = ['contrato', 'termo_saude']

router.post('/', ESCRITA, uploadContratoPaciente.single('arquivo'), async (req, res) => {
  const { paciente_id, descricao, tipo } = req.body
  if (!paciente_id) return res.status(400).json({ error: 'paciente_id é obrigatório' })
  if (!req.file) return res.status(400).json({ error: 'Envie um arquivo PDF' })
  if (tipo && !TIPOS_VALIDOS.includes(tipo)) return res.status(400).json({ error: 'Tipo inválido' })

  const paciente = await db.prepare('SELECT id FROM pacientes WHERE id = ? AND clinica_id = ?').get(paciente_id, req.usuario.clinica_id)
  if (!paciente) return res.status(400).json({ error: 'Paciente inválido' })

  const id = nanoid()
  const arquivoUrl = `/uploads/contratos-paciente/${req.file.filename}`
  await db.prepare(
    `INSERT INTO contratos_paciente (id, clinica_id, paciente_id, tipo, descricao, arquivo_url, nome_arquivo, criado_por)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, req.usuario.clinica_id, paciente_id, tipo || 'contrato', descricao || null, arquivoUrl, req.file.originalname, req.usuario.id)

  res.status(201).json(await db.prepare('SELECT * FROM contratos_paciente WHERE id = ?').get(id))
})

router.delete('/:id', EXCLUSAO, async (req, res) => {
  await db.prepare('DELETE FROM contratos_paciente WHERE id = ? AND clinica_id = ?').run(req.params.id, req.usuario.clinica_id)
  res.status(204).end()
})

export default router
