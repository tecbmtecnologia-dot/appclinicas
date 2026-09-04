import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'
import { db } from '../db.js'
import { requireRole } from '../auth.js'

const router = Router()
const ROLES = ['admin', 'coordenador', 'medico', 'enfermagem', 'recepcao', 'financeiro']
const GESTAO = requireRole('admin')
const LEITURA = requireRole('admin', 'coordenador')

function semSenha(usuario) {
  if (!usuario) return usuario
  const { senha_hash, ...resto } = usuario
  return resto
}

// Lista leve (id, nome, role) para qualquer funcionário da clínica escolher
// colegas em recursos colaborativos (ex: convidar para reunião).
router.get('/colegas', (req, res) => {
  const rows = db
    .prepare("SELECT id, nome, role FROM usuarios WHERE clinica_id = ? AND ativo = 1 ORDER BY nome COLLATE NOCASE")
    .all(req.usuario.clinica_id)
  res.json(rows)
})

router.get('/', LEITURA, (req, res) => {
  const rows = db.prepare('SELECT * FROM usuarios WHERE clinica_id = ? ORDER BY nome COLLATE NOCASE').all(req.usuario.clinica_id)
  res.json(rows.map(semSenha))
})

router.post('/', GESTAO, (req, res) => {
  const { nome, email, senha, role, medico_id, unidade_id, carga_horaria_mensal_horas } = req.body
  if (!nome || !email || !senha) return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios' })
  if (senha.length < 6) return res.status(400).json({ error: 'A senha deve ter ao menos 6 caracteres' })
  if (!ROLES.includes(role)) return res.status(400).json({ error: 'Perfil inválido' })

  const emailNormalizado = String(email).toLowerCase()
  const existente = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(emailNormalizado)
  if (existente) return res.status(409).json({ error: 'Já existe um usuário com este e-mail' })

  if (medico_id) {
    const medico = db.prepare('SELECT id FROM medicos WHERE id = ? AND clinica_id = ?').get(medico_id, req.usuario.clinica_id)
    if (!medico) return res.status(400).json({ error: 'Médico inválido' })
  }
  if (unidade_id) {
    const unidade = db.prepare('SELECT id FROM unidades WHERE id = ? AND clinica_id = ?').get(unidade_id, req.usuario.clinica_id)
    if (!unidade) return res.status(400).json({ error: 'Unidade inválida' })
  }

  const id = nanoid()
  const hash = bcrypt.hashSync(senha, 10)
  db.prepare(
    `INSERT INTO usuarios (id, clinica_id, nome, email, senha_hash, role, medico_id, unidade_id, carga_horaria_mensal_horas)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    req.usuario.clinica_id,
    nome,
    emailNormalizado,
    hash,
    role,
    medico_id || null,
    unidade_id || null,
    carga_horaria_mensal_horas || 160,
  )

  res.status(201).json(semSenha(db.prepare('SELECT * FROM usuarios WHERE id = ?').get(id)))
})

router.put('/:id', GESTAO, (req, res) => {
  const existente = db.prepare('SELECT * FROM usuarios WHERE id = ? AND clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!existente) return res.status(404).json({ error: 'Usuário não encontrado' })

  const { nome, email, senha, role, medico_id, unidade_id, carga_horaria_mensal_horas, ativo } = req.body
  if (role && !ROLES.includes(role)) return res.status(400).json({ error: 'Perfil inválido' })
  if (senha && senha.length < 6) return res.status(400).json({ error: 'A senha deve ter ao menos 6 caracteres' })

  const emailNormalizado = email ? String(email).toLowerCase() : existente.email
  if (emailNormalizado !== existente.email) {
    const duplicado = db.prepare('SELECT id FROM usuarios WHERE email = ? AND id != ?').get(emailNormalizado, req.params.id)
    if (duplicado) return res.status(409).json({ error: 'Já existe um usuário com este e-mail' })
  }

  let medicoId = existente.medico_id
  if (medico_id !== undefined) {
    if (medico_id) {
      const medico = db.prepare('SELECT id FROM medicos WHERE id = ? AND clinica_id = ?').get(medico_id, req.usuario.clinica_id)
      if (!medico) return res.status(400).json({ error: 'Médico inválido' })
      medicoId = medico_id
    } else {
      medicoId = null
    }
  }

  let unidadeId = existente.unidade_id
  if (unidade_id !== undefined) {
    if (unidade_id) {
      const unidade = db.prepare('SELECT id FROM unidades WHERE id = ? AND clinica_id = ?').get(unidade_id, req.usuario.clinica_id)
      if (!unidade) return res.status(400).json({ error: 'Unidade inválida' })
      unidadeId = unidade_id
    } else {
      unidadeId = null
    }
  }

  const merged = {
    nome: nome ?? existente.nome,
    email: emailNormalizado,
    senha_hash: senha ? bcrypt.hashSync(senha, 10) : existente.senha_hash,
    role: role ?? existente.role,
    medico_id: medicoId,
    unidade_id: unidadeId,
    carga_horaria_mensal_horas: carga_horaria_mensal_horas ?? existente.carga_horaria_mensal_horas,
    ativo: ativo !== undefined ? (ativo ? 1 : 0) : existente.ativo,
  }

  db.prepare(
    `UPDATE usuarios SET nome=?, email=?, senha_hash=?, role=?, medico_id=?, unidade_id=?, carga_horaria_mensal_horas=?, ativo=? WHERE id=?`,
  ).run(
    merged.nome,
    merged.email,
    merged.senha_hash,
    merged.role,
    merged.medico_id,
    merged.unidade_id,
    merged.carga_horaria_mensal_horas,
    merged.ativo,
    req.params.id,
  )

  res.json(semSenha(db.prepare('SELECT * FROM usuarios WHERE id = ?').get(req.params.id)))
})

router.delete('/:id', GESTAO, (req, res) => {
  if (req.usuario.id === req.params.id) {
    return res.status(400).json({ error: 'Você não pode remover seu próprio usuário' })
  }
  db.prepare('DELETE FROM usuarios WHERE id = ? AND clinica_id = ?').run(req.params.id, req.usuario.clinica_id)
  res.status(204).end()
})

export default router
