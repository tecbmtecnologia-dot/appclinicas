import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'
import { db } from '../db.js'
import { uploadLogo } from '../upload.js'
import { especialidadesParaTexto, comEspecialidadesArray } from '../clinicaUtil.js'
import unidadesRouter from './unidades.js'

const router = Router()

function gerarSlug(nome) {
  return String(nome)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function slugUnico(base) {
  const raiz = base || nanoid(8)
  let slug = raiz
  let i = 1
  while (db.prepare('SELECT id FROM clinicas WHERE slug = ?').get(slug)) {
    i += 1
    slug = `${raiz}-${i}`
  }
  return slug
}

router.get('/', (req, res) => {
  const rows = db
    .prepare(
      `SELECT c.*,
        (SELECT COUNT(*) FROM usuarios u WHERE u.clinica_id = c.id) AS total_usuarios,
        (SELECT COUNT(*) FROM medicos m WHERE m.clinica_id = c.id) AS total_medicos,
        (SELECT COUNT(*) FROM pacientes p WHERE p.clinica_id = c.id) AS total_pacientes
       FROM clinicas c ORDER BY c.nome COLLATE NOCASE`,
    )
    .all()
  res.json(rows.map(comEspecialidadesArray))
})

router.post('/', (req, res) => {
  const { nome, logo_url, cor_primaria, cnpj, endereco, especialidades, latitude, longitude, raio_metros, admin_nome, admin_email, admin_senha } = req.body
  if (!nome) return res.status(400).json({ error: 'Nome da clínica é obrigatório' })

  const querAdmin = admin_nome || admin_email || admin_senha
  if (querAdmin && (!admin_nome || !admin_email || !admin_senha)) {
    return res.status(400).json({ error: 'Para criar o administrador da clínica, informe nome, e-mail e senha' })
  }
  if (admin_senha && admin_senha.length < 6) {
    return res.status(400).json({ error: 'A senha do administrador deve ter ao menos 6 caracteres' })
  }
  const emailNormalizado = admin_email ? String(admin_email).toLowerCase() : null
  if (emailNormalizado) {
    const existente = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(emailNormalizado)
    if (existente) return res.status(409).json({ error: 'Já existe um usuário com este e-mail' })
  }

  const id = nanoid()
  const slug = slugUnico(gerarSlug(nome))
  db.prepare(
    `INSERT INTO clinicas (id, nome, slug, logo_url, cor_primaria, cnpj, endereco, especialidades, latitude, longitude, raio_metros)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    nome,
    slug,
    logo_url || null,
    cor_primaria || null,
    cnpj || null,
    endereco || null,
    especialidadesParaTexto(especialidades),
    latitude != null && latitude !== '' ? Number(latitude) : null,
    longitude != null && longitude !== '' ? Number(longitude) : null,
    raio_metros != null && raio_metros !== '' ? Number(raio_metros) : null,
  )

  if (emailNormalizado) {
    db.prepare(
      `INSERT INTO usuarios (id, clinica_id, nome, email, senha_hash, role) VALUES (?, ?, ?, ?, ?, 'admin')`,
    ).run(nanoid(), id, admin_nome, emailNormalizado, bcrypt.hashSync(admin_senha, 10))
  }

  res.status(201).json(comEspecialidadesArray(db.prepare('SELECT * FROM clinicas WHERE id = ?').get(id)))
})

router.put('/:id', (req, res) => {
  const existente = db.prepare('SELECT * FROM clinicas WHERE id = ?').get(req.params.id)
  if (!existente) return res.status(404).json({ error: 'Clínica não encontrada' })

  const merged = {
    nome: req.body.nome ?? existente.nome,
    logo_url: req.body.logo_url !== undefined ? req.body.logo_url || null : existente.logo_url,
    cor_primaria: req.body.cor_primaria !== undefined ? req.body.cor_primaria || null : existente.cor_primaria,
    cnpj: req.body.cnpj !== undefined ? req.body.cnpj || null : existente.cnpj,
    endereco: req.body.endereco !== undefined ? req.body.endereco || null : existente.endereco,
    especialidades:
      req.body.especialidades !== undefined ? especialidadesParaTexto(req.body.especialidades) : existente.especialidades,
    latitude: req.body.latitude !== undefined ? (req.body.latitude === '' ? null : Number(req.body.latitude)) : existente.latitude,
    longitude: req.body.longitude !== undefined ? (req.body.longitude === '' ? null : Number(req.body.longitude)) : existente.longitude,
    raio_metros:
      req.body.raio_metros !== undefined ? (req.body.raio_metros === '' ? null : Number(req.body.raio_metros)) : existente.raio_metros,
    ativo: req.body.ativo !== undefined ? (req.body.ativo ? 1 : 0) : existente.ativo,
  }

  db.prepare(
    `UPDATE clinicas SET nome=?, logo_url=?, cor_primaria=?, cnpj=?, endereco=?, especialidades=?, latitude=?, longitude=?, raio_metros=?, ativo=? WHERE id=?`,
  ).run(
    merged.nome,
    merged.logo_url,
    merged.cor_primaria,
    merged.cnpj,
    merged.endereco,
    merged.especialidades,
    merged.latitude,
    merged.longitude,
    merged.raio_metros,
    merged.ativo,
    req.params.id,
  )

  res.json(comEspecialidadesArray(db.prepare('SELECT * FROM clinicas WHERE id = ?').get(req.params.id)))
})

router.post('/:id/logo', uploadLogo.single('logo'), (req, res) => {
  const existente = db.prepare('SELECT * FROM clinicas WHERE id = ?').get(req.params.id)
  if (!existente) return res.status(404).json({ error: 'Clínica não encontrada' })
  if (!req.file) return res.status(400).json({ error: 'Envie um arquivo de imagem' })

  const logoUrl = `/uploads/logos/${req.file.filename}`
  db.prepare('UPDATE clinicas SET logo_url = ? WHERE id = ?').run(logoUrl, req.params.id)
  res.json(comEspecialidadesArray(db.prepare('SELECT * FROM clinicas WHERE id = ?').get(req.params.id)))
})

router.use(
  '/:clinicaId/unidades',
  (req, res, next) => {
    req.clinicaId = req.params.clinicaId
    next()
  },
  unidadesRouter,
)

router.delete('/:id', (req, res) => {
  const { total } = db.prepare('SELECT COUNT(*) AS total FROM usuarios WHERE clinica_id = ?').get(req.params.id)
  if (total > 0) {
    return res.status(409).json({ error: 'Remova os usuários desta clínica antes de excluí-la' })
  }
  db.prepare('DELETE FROM unidades WHERE clinica_id = ?').run(req.params.id)
  db.prepare('DELETE FROM clinicas WHERE id = ?').run(req.params.id)
  res.status(204).end()
})

export default router
