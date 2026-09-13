import { Router } from 'express'
import { nanoid } from 'nanoid'
import { db } from '../db.js'
import { requireRole } from '../auth.js'
import { uploadFotoHistorico } from '../upload.js'

const router = Router()
const ACESSO = requireRole('admin', 'coordenador', 'medico', 'enfermagem', 'pj')
const EXCLUSAO = requireRole('admin', 'coordenador', 'medico')
const TIPOS = ['pre_operatorio', 'pos_operatorio']

router.use(ACESSO)

router.get('/', async (req, res) => {
  const { paciente_id } = req.query
  if (!paciente_id) return res.status(400).json({ error: 'paciente_id é obrigatório' })
  const rows = await db
    .prepare('SELECT * FROM fotos_paciente WHERE clinica_id = ? AND paciente_id = ? ORDER BY data DESC, created_at DESC')
    .all(req.usuario.clinica_id, paciente_id)
  res.json(rows)
})

router.post('/', uploadFotoHistorico.single('foto'), async (req, res) => {
  const { paciente_id, tipo, data, observacoes } = req.body
  if (!paciente_id || !tipo || !data) return res.status(400).json({ error: 'paciente_id, tipo e data são obrigatórios' })
  if (!TIPOS.includes(tipo)) return res.status(400).json({ error: 'Tipo inválido' })
  if (!req.file) return res.status(400).json({ error: 'Envie um arquivo de imagem' })

  const paciente = await db.prepare('SELECT id FROM pacientes WHERE id = ? AND clinica_id = ?').get(paciente_id, req.usuario.clinica_id)
  if (!paciente) return res.status(400).json({ error: 'Paciente inválido' })

  const id = nanoid()
  const fotoUrl = `/uploads/fotos-paciente/${req.file.filename}`
  await db.prepare(
    `INSERT INTO fotos_paciente (id, clinica_id, paciente_id, tipo, data, foto_url, observacoes, criado_por)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, req.usuario.clinica_id, paciente_id, tipo, data, fotoUrl, observacoes || null, req.usuario.id)

  res.status(201).json(await db.prepare('SELECT * FROM fotos_paciente WHERE id = ?').get(id))
})

router.delete('/:id', EXCLUSAO, async (req, res) => {
  await db.prepare('DELETE FROM fotos_paciente WHERE id = ? AND clinica_id = ?').run(req.params.id, req.usuario.clinica_id)
  res.status(204).end()
})

export default router
