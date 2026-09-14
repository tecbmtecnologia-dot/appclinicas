import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'
import { db } from '../db.js'
import { assinarToken, requireAuth, requireRole } from '../auth.js'
import { uploadFotoUsuario } from '../upload.js'

const router = Router()

// Registra tentativa de login malsucedida (LGPD/segurança — rastro pra detectar força
// bruta). Nunca deixa uma falha aqui derrubar a resposta de erro real do login.
async function registrarTentativaFalha(email, clinicaId, motivo, req) {
  try {
    await db.prepare(
      `INSERT INTO login_tentativas (id, email, clinica_id, motivo, ip) VALUES (?, ?, ?, ?, ?)`,
    ).run(nanoid(), String(email || '').toLowerCase(), clinicaId ?? null, motivo, req.ip)
  } catch (erro) {
    console.error('Falha ao registrar tentativa de login:', erro)
  }
}

function clinicaPublica(clinica) {
  if (!clinica) return null
  return {
    id: clinica.id,
    nome: clinica.nome,
    slug: clinica.slug,
    logo_url: clinica.logo_url,
    logo_app_url: clinica.logo_app_url,
    cor_primaria: clinica.cor_primaria,
    modulos_opcionais: clinica.modulos_opcionais ? clinica.modulos_opcionais.split(',').map((s) => s.trim()).filter(Boolean) : [],
  }
}

router.post('/login', async (req, res) => {
  const { email, senha } = req.body
  if (!email || !senha) return res.status(400).json({ error: 'E-mail e senha são obrigatórios' })

  const usuario = await db.prepare('SELECT * FROM usuarios WHERE email = ?').get(String(email).toLowerCase())
  if (!usuario || !usuario.ativo) {
    await registrarTentativaFalha(email, null, usuario ? 'usuario_inativo' : 'usuario_nao_encontrado', req)
    return res.status(401).json({ error: 'E-mail ou senha inválidos' })
  }
  if (!bcrypt.compareSync(senha, usuario.senha_hash)) {
    await registrarTentativaFalha(email, usuario.clinica_id, 'senha_invalida', req)
    return res.status(401).json({ error: 'E-mail ou senha inválidos' })
  }

  const clinica = usuario.clinica_id ? await db.prepare('SELECT * FROM clinicas WHERE id = ?').get(usuario.clinica_id) : null
  if (usuario.clinica_id && (!clinica || !clinica.ativo)) {
    await registrarTentativaFalha(email, usuario.clinica_id, 'clinica_inativa', req)
    return res.status(403).json({ error: 'Esta clínica está inativa. Entre em contato com o suporte.' })
  }

  const token = assinarToken(usuario)
  res.json({
    token,
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      role: usuario.role,
      cargo: usuario.cargo,
      clinica_id: usuario.clinica_id,
      medico_id: usuario.medico_id,
      sexo: usuario.sexo,
      foto_url: usuario.foto_url,
      clinica: clinicaPublica(clinica),
    },
  })
})

router.get('/me', requireAuth, async (req, res) => {
  const usuario = await db
    .prepare('SELECT id, nome, email, role, cargo, clinica_id, medico_id, sexo, foto_url, ativo FROM usuarios WHERE id = ?')
    .get(req.usuario.id)
  if (!usuario || !usuario.ativo) return res.status(401).json({ error: 'Usuário não encontrado' })
  const clinica = usuario.clinica_id ? await db.prepare('SELECT * FROM clinicas WHERE id = ?').get(usuario.clinica_id) : null
  res.json({ ...usuario, clinica: clinicaPublica(clinica) })
})

router.put('/me', requireAuth, async (req, res) => {
  const existente = await db.prepare('SELECT * FROM usuarios WHERE id = ?').get(req.usuario.id)
  if (!existente) return res.status(404).json({ error: 'Usuário não encontrado' })

  const { nome, email, senha, sexo } = req.body
  if (senha && senha.length < 6) return res.status(400).json({ error: 'A senha deve ter ao menos 6 caracteres' })

  const emailNormalizado = email ? String(email).toLowerCase() : existente.email
  if (emailNormalizado !== existente.email) {
    const duplicado = await db.prepare('SELECT id FROM usuarios WHERE email = ? AND id != ?').get(emailNormalizado, existente.id)
    if (duplicado) return res.status(409).json({ error: 'Já existe um usuário com este e-mail' })
  }

  const merged = {
    nome: nome || existente.nome,
    email: emailNormalizado,
    senha_hash: senha ? bcrypt.hashSync(senha, 10) : existente.senha_hash,
    sexo: sexo !== undefined ? sexo || null : existente.sexo,
  }

  await db.prepare('UPDATE usuarios SET nome=?, email=?, senha_hash=?, sexo=? WHERE id=?').run(
    merged.nome,
    merged.email,
    merged.senha_hash,
    merged.sexo,
    existente.id,
  )

  const clinica = existente.clinica_id ? await db.prepare('SELECT * FROM clinicas WHERE id = ?').get(existente.clinica_id) : null
  res.json({
    id: existente.id,
    nome: merged.nome,
    email: merged.email,
    role: existente.role,
    cargo: existente.cargo,
    clinica_id: existente.clinica_id,
    medico_id: existente.medico_id,
    sexo: merged.sexo,
    ativo: existente.ativo,
    clinica: clinicaPublica(clinica),
  })
})

router.post('/me/foto', requireAuth, uploadFotoUsuario.single('foto'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Envie um arquivo de imagem' })
  const fotoUrl = `/uploads/usuarios/${req.file.filename}`
  await db.prepare('UPDATE usuarios SET foto_url = ? WHERE id = ?').run(fotoUrl, req.usuario.id)
  const usuario = await db
    .prepare('SELECT id, nome, email, role, cargo, clinica_id, medico_id, sexo, foto_url, ativo FROM usuarios WHERE id = ?')
    .get(req.usuario.id)
  const clinica = usuario.clinica_id ? await db.prepare('SELECT * FROM clinicas WHERE id = ?').get(usuario.clinica_id) : null
  res.json({ ...usuario, clinica: clinicaPublica(clinica) })
})

router.get('/tentativas-login', requireAuth, requireRole('super_admin', 'admin', 'coordenador'), async (req, res) => {
  // super_admin (plataforma) vê tudo; admin/coordenador de uma clínica só veem tentativas
  // já vinculadas à própria clínica (e-mail que não bate com nenhum usuário fica sem
  // clinica_id — só a plataforma vê essas, não é possível atribuir a uma clínica específica).
  const rows =
    req.usuario.role === 'super_admin'
      ? await db.prepare('SELECT email, motivo, ip, created_at FROM login_tentativas ORDER BY created_at DESC LIMIT 200').all()
      : await db
          .prepare('SELECT email, motivo, ip, created_at FROM login_tentativas WHERE clinica_id = ? ORDER BY created_at DESC LIMIT 200')
          .all(req.usuario.clinica_id)
  res.json(rows)
})

export default router
