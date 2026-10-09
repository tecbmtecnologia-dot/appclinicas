import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'
import { db } from '../db.js'
import { uploadLogo } from '../upload.js'
import { especialidadesParaTexto, comEspecialidadesArray, modulosParaTexto } from '../clinicaUtil.js'
import unidadesRouter from './unidades.js'

const router = Router()
// Mesma lista de routes/usuarios.js (super_admin não é criado por aqui).
const ROLES_CLINICA = ['admin', 'coordenador', 'medico', 'enfermagem', 'recepcao', 'financeiro', 'pj']

function gerarSlug(nome) {
  return String(nome)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

async function slugUnico(base) {
  const raiz = base || nanoid(8)
  let slug = raiz
  let i = 1
  while (await db.prepare('SELECT id FROM clinicas WHERE slug = ?').get(slug)) {
    i += 1
    slug = `${raiz}-${i}`
  }
  return slug
}

router.get('/', async (req, res) => {
  const rows = await db
    .prepare(
      `SELECT c.*,
        (SELECT COUNT(*) FROM usuarios u WHERE u.clinica_id = c.id) AS total_usuarios,
        (SELECT COUNT(*) FROM medicos m WHERE m.clinica_id = c.id) AS total_medicos,
        (SELECT COUNT(*) FROM pacientes p WHERE p.clinica_id = c.id) AS total_pacientes
       FROM clinicas c ORDER BY lower(c.nome)`,
    )
    .all()
  res.json(rows.map(comEspecialidadesArray))
})

router.post('/', async (req, res) => {
  const { nome, logo_url, cor_primaria, cnpj, endereco, especialidades, modulos_opcionais, latitude, longitude, raio_metros, admin_nome, admin_email, admin_senha } = req.body
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
    const existente = await db.prepare('SELECT id FROM usuarios WHERE email = ?').get(emailNormalizado)
    if (existente) return res.status(409).json({ error: 'Já existe um usuário com este e-mail' })
  }

  const id = nanoid()
  const slug = await slugUnico(gerarSlug(nome))
  await db.prepare(
    `INSERT INTO clinicas (id, nome, slug, logo_url, cor_primaria, cnpj, endereco, especialidades, modulos_opcionais, latitude, longitude, raio_metros)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    nome,
    slug,
    logo_url || null,
    cor_primaria || null,
    cnpj || null,
    endereco || null,
    especialidadesParaTexto(especialidades),
    modulosParaTexto(modulos_opcionais),
    latitude != null && latitude !== '' ? Number(latitude) : null,
    longitude != null && longitude !== '' ? Number(longitude) : null,
    raio_metros != null && raio_metros !== '' ? Number(raio_metros) : null,
  )

  if (emailNormalizado) {
    await db.prepare(
      `INSERT INTO usuarios (id, clinica_id, nome, email, senha_hash, role) VALUES (?, ?, ?, ?, ?, 'admin')`,
    ).run(nanoid(), id, admin_nome, emailNormalizado, bcrypt.hashSync(admin_senha, 10))
  }

  res.status(201).json(comEspecialidadesArray(await db.prepare('SELECT * FROM clinicas WHERE id = ?').get(id)))
})

router.put('/:id', async (req, res) => {
  const existente = await db.prepare('SELECT * FROM clinicas WHERE id = ?').get(req.params.id)
  if (!existente) return res.status(404).json({ error: 'Clínica não encontrada' })

  let slug = existente.slug
  if (req.body.slug !== undefined && req.body.slug !== null && String(req.body.slug).trim() !== '') {
    const slugLimpo = gerarSlug(req.body.slug)
    if (!slugLimpo) return res.status(400).json({ error: 'Link inválido' })
    if (slugLimpo !== existente.slug) {
      const emUso = await db.prepare('SELECT id FROM clinicas WHERE slug = ? AND id != ?').get(slugLimpo, req.params.id)
      if (emUso) return res.status(409).json({ error: 'Já existe uma clínica usando este link' })
      slug = slugLimpo
    }
  }

  const merged = {
    nome: req.body.nome ?? existente.nome,
    slug,
    logo_url: req.body.logo_url !== undefined ? req.body.logo_url || null : existente.logo_url,
    cor_primaria: req.body.cor_primaria !== undefined ? req.body.cor_primaria || null : existente.cor_primaria,
    cnpj: req.body.cnpj !== undefined ? req.body.cnpj || null : existente.cnpj,
    endereco: req.body.endereco !== undefined ? req.body.endereco || null : existente.endereco,
    especialidades:
      req.body.especialidades !== undefined ? especialidadesParaTexto(req.body.especialidades) : existente.especialidades,
    modulos_opcionais:
      req.body.modulos_opcionais !== undefined ? modulosParaTexto(req.body.modulos_opcionais) : existente.modulos_opcionais,
    latitude: req.body.latitude !== undefined ? (req.body.latitude === '' ? null : Number(req.body.latitude)) : existente.latitude,
    longitude: req.body.longitude !== undefined ? (req.body.longitude === '' ? null : Number(req.body.longitude)) : existente.longitude,
    raio_metros:
      req.body.raio_metros !== undefined ? (req.body.raio_metros === '' ? null : Number(req.body.raio_metros)) : existente.raio_metros,
    ativo: req.body.ativo !== undefined ? (req.body.ativo ? 1 : 0) : existente.ativo,
  }

  await db.prepare(
    `UPDATE clinicas SET nome=?, slug=?, logo_url=?, cor_primaria=?, cnpj=?, endereco=?, especialidades=?, modulos_opcionais=?, latitude=?, longitude=?, raio_metros=?, ativo=? WHERE id=?`,
  ).run(
    merged.nome,
    merged.slug,
    merged.logo_url,
    merged.cor_primaria,
    merged.cnpj,
    merged.endereco,
    merged.especialidades,
    merged.modulos_opcionais,
    merged.latitude,
    merged.longitude,
    merged.raio_metros,
    merged.ativo,
    req.params.id,
  )

  res.json(comEspecialidadesArray(await db.prepare('SELECT * FROM clinicas WHERE id = ?').get(req.params.id)))
})

router.post('/:id/logo', uploadLogo.single('logo'), async (req, res) => {
  const existente = await db.prepare('SELECT * FROM clinicas WHERE id = ?').get(req.params.id)
  if (!existente) return res.status(404).json({ error: 'Clínica não encontrada' })
  if (!req.file) return res.status(400).json({ error: 'Envie um arquivo de imagem' })

  const logoUrl = `/uploads/logos/${req.file.filename}`
  await db.prepare('UPDATE clinicas SET logo_url = ? WHERE id = ?').run(logoUrl, req.params.id)
  res.json(comEspecialidadesArray(await db.prepare('SELECT * FROM clinicas WHERE id = ?').get(req.params.id)))
})

// Usuários de uma clínica (só super_admin, montado em /api/clinicas) — pra
// consultar o login de cada um e resetar senha sem precisar entrar na clínica.
router.get('/:id/usuarios', async (req, res) => {
  const rows = await db
    .prepare(
      `SELECT id, nome, email, role, cargo, ativo, created_at FROM usuarios
       WHERE clinica_id = ? ORDER BY lower(nome)`,
    )
    .all(req.params.id)
  res.json(rows)
})

// Cadastro básico (nome/e-mail/senha/perfil) — jornada, médico vinculado etc.
// continuam sendo ajustados pelo admin dentro da própria clínica.
router.post('/:id/usuarios', async (req, res) => {
  const { nome, email, senha, role } = req.body
  if (!nome || !email || !senha) return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios' })
  if (String(senha).length < 6) return res.status(400).json({ error: 'A senha deve ter ao menos 6 caracteres' })
  if (!ROLES_CLINICA.includes(role)) return res.status(400).json({ error: 'Perfil inválido' })

  const clinica = await db.prepare('SELECT id FROM clinicas WHERE id = ?').get(req.params.id)
  if (!clinica) return res.status(404).json({ error: 'Clínica não encontrada' })

  const emailNormalizado = String(email).trim().toLowerCase()
  const existente = await db.prepare('SELECT id FROM usuarios WHERE email = ?').get(emailNormalizado)
  if (existente) return res.status(409).json({ error: 'Já existe um usuário com este e-mail' })

  const id = nanoid()
  await db
    .prepare('INSERT INTO usuarios (id, clinica_id, nome, email, senha_hash, role) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, req.params.id, nome, emailNormalizado, bcrypt.hashSync(String(senha), 10), role)

  res
    .status(201)
    .json(await db.prepare('SELECT id, nome, email, role, cargo, ativo, created_at FROM usuarios WHERE id = ?').get(id))
})

router.put('/:id/usuarios/:usuarioId/senha', async (req, res) => {
  const { senha } = req.body
  if (!senha || String(senha).length < 6) {
    return res.status(400).json({ error: 'A nova senha deve ter ao menos 6 caracteres' })
  }
  const usuario = await db
    .prepare('SELECT id FROM usuarios WHERE id = ? AND clinica_id = ?')
    .get(req.params.usuarioId, req.params.id)
  if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado nesta clínica' })

  await db.prepare('UPDATE usuarios SET senha_hash = ? WHERE id = ?').run(bcrypt.hashSync(String(senha), 10), usuario.id)
  res.status(204).end()
})

router.use(
  '/:clinicaId/unidades',
  (req, res, next) => {
    req.clinicaId = req.params.clinicaId
    next()
  },
  unidadesRouter,
)

router.delete('/:id', async (req, res) => {
  const { total } = await db.prepare('SELECT COUNT(*) AS total FROM usuarios WHERE clinica_id = ?').get(req.params.id)
  if (total > 0) {
    return res.status(409).json({ error: 'Remova os usuários desta clínica antes de excluí-la' })
  }
  await db.prepare('DELETE FROM unidades WHERE clinica_id = ?').run(req.params.id)
  await db.prepare('DELETE FROM clinicas WHERE id = ?').run(req.params.id)
  res.status(204).end()
})

export default router
