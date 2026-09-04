import { Router } from 'express'
import { db } from '../db.js'
import { uploadLogo } from '../upload.js'
import { especialidadesParaTexto, comEspecialidadesArray } from '../clinicaUtil.js'
import unidadesRouter from './unidades.js'

const router = Router()

router.get('/', (req, res) => {
  const clinica = db.prepare('SELECT * FROM clinicas WHERE id = ?').get(req.usuario.clinica_id)
  if (!clinica) return res.status(404).json({ error: 'Clínica não encontrada' })
  res.json(comEspecialidadesArray(clinica))
})

router.put('/', (req, res) => {
  const existente = db.prepare('SELECT * FROM clinicas WHERE id = ?').get(req.usuario.clinica_id)
  if (!existente) return res.status(404).json({ error: 'Clínica não encontrada' })

  const merged = {
    nome: req.body.nome ?? existente.nome,
    cor_primaria: req.body.cor_primaria !== undefined ? req.body.cor_primaria || null : existente.cor_primaria,
    cnpj: req.body.cnpj !== undefined ? req.body.cnpj || null : existente.cnpj,
    endereco: req.body.endereco !== undefined ? req.body.endereco || null : existente.endereco,
    especialidades:
      req.body.especialidades !== undefined ? especialidadesParaTexto(req.body.especialidades) : existente.especialidades,
    latitude: req.body.latitude !== undefined ? (req.body.latitude === '' ? null : Number(req.body.latitude)) : existente.latitude,
    longitude: req.body.longitude !== undefined ? (req.body.longitude === '' ? null : Number(req.body.longitude)) : existente.longitude,
    raio_metros:
      req.body.raio_metros !== undefined ? (req.body.raio_metros === '' ? null : Number(req.body.raio_metros)) : existente.raio_metros,
  }

  db.prepare(
    `UPDATE clinicas SET nome=?, cor_primaria=?, cnpj=?, endereco=?, especialidades=?, latitude=?, longitude=?, raio_metros=? WHERE id=?`,
  ).run(
    merged.nome,
    merged.cor_primaria,
    merged.cnpj,
    merged.endereco,
    merged.especialidades,
    merged.latitude,
    merged.longitude,
    merged.raio_metros,
    req.usuario.clinica_id,
  )

  res.json(comEspecialidadesArray(db.prepare('SELECT * FROM clinicas WHERE id = ?').get(req.usuario.clinica_id)))
})

router.post('/logo', uploadLogo.single('logo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Envie um arquivo de imagem' })
  const logoUrl = `/uploads/logos/${req.file.filename}`
  db.prepare('UPDATE clinicas SET logo_url = ? WHERE id = ?').run(logoUrl, req.usuario.clinica_id)
  res.json(comEspecialidadesArray(db.prepare('SELECT * FROM clinicas WHERE id = ?').get(req.usuario.clinica_id)))
})

router.use(
  '/unidades',
  (req, res, next) => {
    req.clinicaId = req.usuario.clinica_id
    next()
  },
  unidadesRouter,
)

export default router
