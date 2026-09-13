import { Router } from 'express'
import { nanoid } from 'nanoid'
import { db } from '../db.js'
import { criarNotificacao } from '../notificar.js'

// Reuniões são um espaço interno da equipe — qualquer perfil da clínica participa.
const router = Router()

async function comParticipantes(reuniao) {
  if (!reuniao) return reuniao
  const participantes = await db
    .prepare(
      `SELECT u.id, u.nome FROM reuniao_participantes rp JOIN usuarios u ON u.id = rp.usuario_id WHERE rp.reuniao_id = ?`,
    )
    .all(reuniao.id)
  return { ...reuniao, participantes }
}

function podeGerenciar(req, reuniao) {
  return req.usuario.role === 'admin' || req.usuario.id === reuniao.criado_por
}

router.get('/', async (req, res) => {
  const { data_inicio, data_fim } = req.query
  let sql = 'SELECT * FROM reunioes WHERE clinica_id = ?'
  const params = [req.usuario.clinica_id]
  if (data_inicio) {
    sql += ' AND substr(data_hora, 1, 10) >= ?'
    params.push(data_inicio)
  }
  if (data_fim) {
    sql += ' AND substr(data_hora, 1, 10) <= ?'
    params.push(data_fim)
  }
  sql += ' ORDER BY data_hora ASC'
  const rows = await db.prepare(sql).all(...params)
  res.json(await Promise.all(rows.map(comParticipantes)))
})

router.get('/:id', async (req, res) => {
  const row = await db.prepare('SELECT * FROM reunioes WHERE id = ? AND clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!row) return res.status(404).json({ error: 'Reunião não encontrada' })
  res.json(await comParticipantes(row))
})

router.post('/', async (req, res) => {
  const { titulo, pauta, data_hora, participantes } = req.body
  if (!titulo || !data_hora) return res.status(400).json({ error: 'Título e data/hora são obrigatórios' })

  const idsParticipantes = Array.isArray(participantes) ? [...new Set(participantes)] : []
  for (const usuarioId of idsParticipantes) {
    const usuario = await db.prepare('SELECT id FROM usuarios WHERE id = ? AND clinica_id = ?').get(usuarioId, req.usuario.clinica_id)
    if (!usuario) return res.status(400).json({ error: 'Um dos participantes é inválido' })
  }
  if (!idsParticipantes.includes(req.usuario.id)) idsParticipantes.push(req.usuario.id)

  const id = nanoid()
  await db.prepare(`INSERT INTO reunioes (id, clinica_id, titulo, pauta, data_hora, criado_por) VALUES (?, ?, ?, ?, ?, ?)`).run(
    id,
    req.usuario.clinica_id,
    titulo,
    pauta || null,
    data_hora,
    req.usuario.id,
  )
  for (const usuarioId of idsParticipantes) {
    await db.prepare(`INSERT INTO reuniao_participantes (id, reuniao_id, usuario_id) VALUES (?, ?, ?)`).run(nanoid(), id, usuarioId)
  }
  for (const usuarioId of idsParticipantes) {
    if (usuarioId === req.usuario.id) continue
    await criarNotificacao({
      clinicaId: req.usuario.clinica_id,
      usuarioId,
      tipo: 'reuniao',
      titulo: 'Você foi convidado para uma reunião',
      mensagem: titulo,
      referenciaTipo: 'reuniao',
      referenciaId: id,
    })
  }

  res.status(201).json(await comParticipantes(await db.prepare('SELECT * FROM reunioes WHERE id = ?').get(id)))
})

router.put('/:id', async (req, res) => {
  const existente = await db.prepare('SELECT * FROM reunioes WHERE id = ? AND clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!existente) return res.status(404).json({ error: 'Reunião não encontrada' })
  if (!podeGerenciar(req, existente)) return res.status(403).json({ error: 'Apenas quem criou a reunião (ou o admin) pode editá-la' })

  const merged = {
    titulo: req.body.titulo ?? existente.titulo,
    pauta: req.body.pauta !== undefined ? req.body.pauta || null : existente.pauta,
    data_hora: req.body.data_hora ?? existente.data_hora,
    status: req.body.status ?? existente.status,
  }
  await db.prepare(`UPDATE reunioes SET titulo=?, pauta=?, data_hora=?, status=? WHERE id=?`).run(
    merged.titulo,
    merged.pauta,
    merged.data_hora,
    merged.status,
    req.params.id,
  )

  if (Array.isArray(req.body.participantes)) {
    await db.prepare('DELETE FROM reuniao_participantes WHERE reuniao_id = ?').run(req.params.id)
    const ids = [...new Set(req.body.participantes)]
    if (!ids.includes(existente.criado_por)) ids.push(existente.criado_por)
    for (const usuarioId of ids) {
      await db.prepare(`INSERT INTO reuniao_participantes (id, reuniao_id, usuario_id) VALUES (?, ?, ?)`).run(nanoid(), req.params.id, usuarioId)
    }
  }

  res.json(await comParticipantes(await db.prepare('SELECT * FROM reunioes WHERE id = ?').get(req.params.id)))
})

router.put('/:id/encerrar', async (req, res) => {
  const existente = await db.prepare('SELECT * FROM reunioes WHERE id = ? AND clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!existente) return res.status(404).json({ error: 'Reunião não encontrada' })
  await db.prepare("UPDATE reunioes SET status = 'encerrada' WHERE id = ?").run(req.params.id)
  res.json(await comParticipantes(await db.prepare('SELECT * FROM reunioes WHERE id = ?').get(req.params.id)))
})

router.delete('/:id', async (req, res) => {
  const existente = await db.prepare('SELECT * FROM reunioes WHERE id = ? AND clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!existente) return res.status(404).json({ error: 'Reunião não encontrada' })
  if (!podeGerenciar(req, existente)) return res.status(403).json({ error: 'Apenas quem criou a reunião (ou o admin) pode removê-la' })
  await db.prepare('DELETE FROM reuniao_participantes WHERE reuniao_id = ?').run(req.params.id)
  await db.prepare('DELETE FROM reunioes WHERE id = ?').run(req.params.id)
  res.status(204).end()
})

export default router
