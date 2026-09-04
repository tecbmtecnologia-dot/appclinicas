import { Router } from 'express'
import { db } from '../db.js'

const router = Router()

router.get('/', (req, res) => {
  const rows = db
    .prepare('SELECT * FROM notificacoes WHERE usuario_id = ? ORDER BY created_at DESC LIMIT 50')
    .all(req.usuario.id)
  res.json(rows)
})

router.put('/:id/lida', (req, res) => {
  db.prepare('UPDATE notificacoes SET lida = 1 WHERE id = ? AND usuario_id = ?').run(req.params.id, req.usuario.id)
  res.json(db.prepare('SELECT * FROM notificacoes WHERE id = ?').get(req.params.id))
})

router.put('/lidas', (req, res) => {
  db.prepare('UPDATE notificacoes SET lida = 1 WHERE usuario_id = ? AND lida = 0').run(req.usuario.id)
  res.status(204).end()
})

export default router
