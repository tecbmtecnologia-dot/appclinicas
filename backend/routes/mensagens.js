import { Router } from 'express'
import { db } from '../db.js'
import { requireRole } from '../auth.js'

const router = Router()

router.get('/', requireRole('admin', 'coordenador', 'medico'), (req, res) => {
  const { sala } = req.query
  if (!sala) return res.status(400).json({ error: 'Parâmetro sala é obrigatório' })
  const rows = db
    .prepare('SELECT * FROM mensagens WHERE sala = ? AND clinica_id = ? ORDER BY created_at ASC')
    .all(sala, req.usuario.clinica_id)
  res.json(rows)
})

export default router
