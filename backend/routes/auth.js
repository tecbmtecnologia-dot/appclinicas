import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { db } from '../db.js'
import { assinarToken, requireAuth } from '../auth.js'

const router = Router()

function clinicaPublica(clinica) {
  if (!clinica) return null
  return { id: clinica.id, nome: clinica.nome, slug: clinica.slug, logo_url: clinica.logo_url, cor_primaria: clinica.cor_primaria }
}

router.post('/login', (req, res) => {
  const { email, senha } = req.body
  if (!email || !senha) return res.status(400).json({ error: 'E-mail e senha são obrigatórios' })

  const usuario = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(String(email).toLowerCase())
  if (!usuario || !usuario.ativo || !bcrypt.compareSync(senha, usuario.senha_hash)) {
    return res.status(401).json({ error: 'E-mail ou senha inválidos' })
  }

  const clinica = usuario.clinica_id ? db.prepare('SELECT * FROM clinicas WHERE id = ?').get(usuario.clinica_id) : null
  if (usuario.clinica_id && (!clinica || !clinica.ativo)) {
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
      clinica_id: usuario.clinica_id,
      clinica: clinicaPublica(clinica),
    },
  })
})

router.get('/me', requireAuth, (req, res) => {
  const usuario = db.prepare('SELECT id, nome, email, role, clinica_id, ativo FROM usuarios WHERE id = ?').get(req.usuario.id)
  if (!usuario || !usuario.ativo) return res.status(401).json({ error: 'Usuário não encontrado' })
  const clinica = usuario.clinica_id ? db.prepare('SELECT * FROM clinicas WHERE id = ?').get(usuario.clinica_id) : null
  res.json({ ...usuario, clinica: clinicaPublica(clinica) })
})

export default router
