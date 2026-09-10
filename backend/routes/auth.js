import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { db } from '../db.js'
import { assinarToken, requireAuth } from '../auth.js'

const router = Router()

function clinicaPublica(clinica) {
  if (!clinica) return null
  return {
    id: clinica.id,
    nome: clinica.nome,
    slug: clinica.slug,
    logo_url: clinica.logo_url,
    cor_primaria: clinica.cor_primaria,
    modulos_opcionais: clinica.modulos_opcionais ? clinica.modulos_opcionais.split(',').map((s) => s.trim()).filter(Boolean) : [],
  }
}

router.post('/login', (req, res) => {
  const { email, senha, lembrar } = req.body
  if (!email || !senha) return res.status(400).json({ error: 'E-mail e senha são obrigatórios' })

  const usuario = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(String(email).toLowerCase())
  if (!usuario || !usuario.ativo || !bcrypt.compareSync(senha, usuario.senha_hash)) {
    return res.status(401).json({ error: 'E-mail ou senha inválidos' })
  }

  const clinica = usuario.clinica_id ? db.prepare('SELECT * FROM clinicas WHERE id = ?').get(usuario.clinica_id) : null
  if (usuario.clinica_id && (!clinica || !clinica.ativo)) {
    return res.status(403).json({ error: 'Esta clínica está inativa. Entre em contato com o suporte.' })
  }

  const token = assinarToken(usuario, Boolean(lembrar))
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
      clinica: clinicaPublica(clinica),
    },
  })
})

router.get('/me', requireAuth, (req, res) => {
  const usuario = db.prepare('SELECT id, nome, email, role, cargo, clinica_id, medico_id, ativo FROM usuarios WHERE id = ?').get(req.usuario.id)
  if (!usuario || !usuario.ativo) return res.status(401).json({ error: 'Usuário não encontrado' })
  const clinica = usuario.clinica_id ? db.prepare('SELECT * FROM clinicas WHERE id = ?').get(usuario.clinica_id) : null
  res.json({ ...usuario, clinica: clinicaPublica(clinica) })
})

router.put('/me', requireAuth, (req, res) => {
  const existente = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(req.usuario.id)
  if (!existente) return res.status(404).json({ error: 'Usuário não encontrado' })

  const { nome, email, senha } = req.body
  if (senha && senha.length < 6) return res.status(400).json({ error: 'A senha deve ter ao menos 6 caracteres' })

  const emailNormalizado = email ? String(email).toLowerCase() : existente.email
  if (emailNormalizado !== existente.email) {
    const duplicado = db.prepare('SELECT id FROM usuarios WHERE email = ? AND id != ?').get(emailNormalizado, existente.id)
    if (duplicado) return res.status(409).json({ error: 'Já existe um usuário com este e-mail' })
  }

  const merged = {
    nome: nome || existente.nome,
    email: emailNormalizado,
    senha_hash: senha ? bcrypt.hashSync(senha, 10) : existente.senha_hash,
  }

  db.prepare('UPDATE usuarios SET nome=?, email=?, senha_hash=? WHERE id=?').run(
    merged.nome,
    merged.email,
    merged.senha_hash,
    existente.id,
  )

  const clinica = existente.clinica_id ? db.prepare('SELECT * FROM clinicas WHERE id = ?').get(existente.clinica_id) : null
  res.json({
    id: existente.id,
    nome: merged.nome,
    email: merged.email,
    role: existente.role,
    cargo: existente.cargo,
    clinica_id: existente.clinica_id,
    medico_id: existente.medico_id,
    ativo: existente.ativo,
    clinica: clinicaPublica(clinica),
  })
})

export default router
