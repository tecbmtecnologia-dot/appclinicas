import { Router } from 'express'
import { nanoid } from 'nanoid'
import { db } from '../db.js'

const router = Router()

function slugify(texto) {
  const base = texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  return base || 'perfil'
}

function comClinicaSlug(row, clinicaSlug) {
  return { ...row, clinica_slug: clinicaSlug }
}

router.get('/', async (req, res) => {
  const clinica = await db.prepare('SELECT slug FROM clinicas WHERE id = ?').get(req.usuario.clinica_id)
  const rows = await db
    .prepare('SELECT * FROM perfis_instalacao WHERE clinica_id = ? ORDER BY lower(nome)')
    .all(req.usuario.clinica_id)
  res.json(rows.map((r) => comClinicaSlug(r, clinica?.slug)))
})

router.post('/', async (req, res) => {
  const { nome } = req.body
  if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' })

  const slugBase = slugify(nome)
  let slug = slugBase
  let tentativa = 1
  while (await db.prepare('SELECT id FROM perfis_instalacao WHERE clinica_id = ? AND slug = ?').get(req.usuario.clinica_id, slug)) {
    tentativa += 1
    slug = `${slugBase}-${tentativa}`
  }

  const id = nanoid()
  await db.prepare('INSERT INTO perfis_instalacao (id, clinica_id, nome, slug) VALUES (?, ?, ?, ?)').run(
    id,
    req.usuario.clinica_id,
    nome,
    slug,
  )
  const clinica = await db.prepare('SELECT slug FROM clinicas WHERE id = ?').get(req.usuario.clinica_id)
  res.status(201).json(comClinicaSlug(await db.prepare('SELECT * FROM perfis_instalacao WHERE id = ?').get(id), clinica?.slug))
})

router.put('/:id', async (req, res) => {
  const { nome } = req.body
  if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' })
  const existente = await db.prepare('SELECT id FROM perfis_instalacao WHERE id = ? AND clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!existente) return res.status(404).json({ error: 'Perfil não encontrado' })

  // O slug não muda ao editar o nome — troca o rótulo exibido sem quebrar o
  // link de instalação que já pode ter sido compartilhado/instalado.
  await db.prepare('UPDATE perfis_instalacao SET nome = ? WHERE id = ?').run(nome, req.params.id)
  const clinica = await db.prepare('SELECT slug FROM clinicas WHERE id = ?').get(req.usuario.clinica_id)
  res.json(comClinicaSlug(await db.prepare('SELECT * FROM perfis_instalacao WHERE id = ?').get(req.params.id), clinica?.slug))
})

router.delete('/:id', async (req, res) => {
  await db.prepare('DELETE FROM perfis_instalacao WHERE id = ? AND clinica_id = ?').run(req.params.id, req.usuario.clinica_id)
  res.status(204).end()
})

export default router
