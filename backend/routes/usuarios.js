import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'
import { db } from '../db.js'
import { requireRole } from '../auth.js'
import { uploadFotoUsuario } from '../upload.js'

const router = Router()
const ROLES = ['admin', 'coordenador', 'medico', 'enfermagem', 'recepcao', 'financeiro', 'pj']
const GESTAO = requireRole('admin')
const LEITURA = requireRole('admin', 'coordenador')
const HORA_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/
const DIAS_SEMANA_VALIDOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab']

function horaValida(v) {
  return v === undefined || v === null || v === '' || HORA_REGEX.test(v)
}

// Jornada por dia da semana: { seg: { entrada, inicio_intervalo, fim_intervalo, saida }, ... }
// — só os dias em que a pessoa trabalha aparecem como chave. Substitui o horário
// único antigo (horario_entrada/saida), que valia igual pra todo dia trabalhado.
function jornadaSemanalValida(obj) {
  if (obj === undefined || obj === null) return true
  if (typeof obj !== 'object' || Array.isArray(obj)) return false
  return Object.entries(obj).every(([dia, h]) => {
    if (!DIAS_SEMANA_VALIDOS.includes(dia)) return false
    if (!h || typeof h !== 'object') return false
    return [h.entrada, h.inicio_intervalo, h.fim_intervalo, h.saida].every(horaValida)
  })
}

function jornadaSemanalParaTexto(obj) {
  if (!obj || Object.keys(obj).length === 0) return null
  return JSON.stringify(obj)
}

function comJornadaSemanal(usuario) {
  if (!usuario) return usuario
  return { ...usuario, jornada_semanal: usuario.jornada_semanal ? JSON.parse(usuario.jornada_semanal) : null }
}

function semSenha(usuario) {
  if (!usuario) return usuario
  const { senha_hash, ...resto } = comJornadaSemanal(usuario)
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
  const {
    nome,
    email,
    senha,
    role,
    cargo,
    medico_id,
    unidade_id,
    carga_horaria_mensal_horas,
    carga_horaria_semanal_horas,
    horario_entrada,
    horario_inicio_intervalo,
    horario_fim_intervalo,
    horario_saida,
    dias_trabalho_semana,
    jornada_semanal,
  } = req.body
  if (!nome || !email || !senha) return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios' })
  if (senha.length < 6) return res.status(400).json({ error: 'A senha deve ter ao menos 6 caracteres' })
  if (!ROLES.includes(role)) return res.status(400).json({ error: 'Perfil inválido' })
  if (![horario_entrada, horario_inicio_intervalo, horario_fim_intervalo, horario_saida].every(horaValida)) {
    return res.status(400).json({ error: 'Horário inválido — use o formato HH:MM' })
  }
  if (!jornadaSemanalValida(jornada_semanal)) {
    return res.status(400).json({ error: 'Jornada semanal inválida' })
  }

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
    `INSERT INTO usuarios (id, clinica_id, nome, email, senha_hash, role, cargo, medico_id, unidade_id, carga_horaria_mensal_horas,
       carga_horaria_semanal_horas, horario_entrada, horario_inicio_intervalo, horario_fim_intervalo, horario_saida, dias_trabalho_semana, jornada_semanal)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    req.usuario.clinica_id,
    nome,
    emailNormalizado,
    hash,
    role,
    cargo || null,
    medico_id || null,
    unidade_id || null,
    carga_horaria_mensal_horas || 160,
    carga_horaria_semanal_horas || null,
    horario_entrada || null,
    horario_inicio_intervalo || null,
    horario_fim_intervalo || null,
    horario_saida || null,
    dias_trabalho_semana || 5,
    jornadaSemanalParaTexto(jornada_semanal),
  )

  res.status(201).json(semSenha(db.prepare('SELECT * FROM usuarios WHERE id = ?').get(id)))
})

router.put('/:id', GESTAO, (req, res) => {
  const existente = db.prepare('SELECT * FROM usuarios WHERE id = ? AND clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!existente) return res.status(404).json({ error: 'Usuário não encontrado' })

  const {
    nome,
    email,
    senha,
    role,
    cargo,
    medico_id,
    unidade_id,
    carga_horaria_mensal_horas,
    carga_horaria_semanal_horas,
    ativo,
    horario_entrada,
    horario_inicio_intervalo,
    horario_fim_intervalo,
    horario_saida,
    dias_trabalho_semana,
    jornada_semanal,
  } = req.body
  if (role && !ROLES.includes(role)) return res.status(400).json({ error: 'Perfil inválido' })
  if (senha && senha.length < 6) return res.status(400).json({ error: 'A senha deve ter ao menos 6 caracteres' })
  if (![horario_entrada, horario_inicio_intervalo, horario_fim_intervalo, horario_saida].every(horaValida)) {
    return res.status(400).json({ error: 'Horário inválido — use o formato HH:MM' })
  }
  if (!jornadaSemanalValida(jornada_semanal)) {
    return res.status(400).json({ error: 'Jornada semanal inválida' })
  }

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
    cargo: cargo !== undefined ? cargo || null : existente.cargo,
    medico_id: medicoId,
    unidade_id: unidadeId,
    carga_horaria_mensal_horas: carga_horaria_mensal_horas ?? existente.carga_horaria_mensal_horas,
    carga_horaria_semanal_horas:
      carga_horaria_semanal_horas !== undefined ? carga_horaria_semanal_horas || null : existente.carga_horaria_semanal_horas,
    ativo: ativo !== undefined ? (ativo ? 1 : 0) : existente.ativo,
    horario_entrada: horario_entrada !== undefined ? horario_entrada || null : existente.horario_entrada,
    horario_inicio_intervalo:
      horario_inicio_intervalo !== undefined ? horario_inicio_intervalo || null : existente.horario_inicio_intervalo,
    horario_fim_intervalo: horario_fim_intervalo !== undefined ? horario_fim_intervalo || null : existente.horario_fim_intervalo,
    horario_saida: horario_saida !== undefined ? horario_saida || null : existente.horario_saida,
    dias_trabalho_semana: dias_trabalho_semana ?? existente.dias_trabalho_semana,
    jornada_semanal: jornada_semanal !== undefined ? jornadaSemanalParaTexto(jornada_semanal) : existente.jornada_semanal,
  }

  db.prepare(
    `UPDATE usuarios SET nome=?, email=?, senha_hash=?, role=?, cargo=?, medico_id=?, unidade_id=?, carga_horaria_mensal_horas=?,
       carga_horaria_semanal_horas=?, ativo=?, horario_entrada=?, horario_inicio_intervalo=?, horario_fim_intervalo=?,
       horario_saida=?, dias_trabalho_semana=?, jornada_semanal=? WHERE id=?`,
  ).run(
    merged.nome,
    merged.email,
    merged.senha_hash,
    merged.role,
    merged.cargo,
    merged.medico_id,
    merged.unidade_id,
    merged.carga_horaria_mensal_horas,
    merged.carga_horaria_semanal_horas,
    merged.ativo,
    merged.horario_entrada,
    merged.horario_inicio_intervalo,
    merged.horario_fim_intervalo,
    merged.horario_saida,
    merged.dias_trabalho_semana,
    merged.jornada_semanal,
    req.params.id,
  )

  res.json(semSenha(db.prepare('SELECT * FROM usuarios WHERE id = ?').get(req.params.id)))
})

router.post('/:id/foto', GESTAO, uploadFotoUsuario.single('foto'), (req, res) => {
  const existente = db.prepare('SELECT id FROM usuarios WHERE id = ? AND clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!existente) return res.status(404).json({ error: 'Usuário não encontrado' })
  if (!req.file) return res.status(400).json({ error: 'Envie um arquivo de imagem' })
  const fotoUrl = `/uploads/usuarios/${req.file.filename}`
  db.prepare('UPDATE usuarios SET foto_url = ? WHERE id = ?').run(fotoUrl, req.params.id)
  res.json(semSenha(db.prepare('SELECT * FROM usuarios WHERE id = ?').get(req.params.id)))
})

router.delete('/:id', GESTAO, (req, res) => {
  if (req.usuario.id === req.params.id) {
    return res.status(400).json({ error: 'Você não pode remover seu próprio usuário' })
  }
  const { total } = db.prepare('SELECT COUNT(*) AS total FROM pontos WHERE usuario_id = ?').get(req.params.id)
  if (total > 0) {
    return res.status(409).json({
      error: 'Este usuário já tem registros de ponto — desative-o em vez de excluir, pra manter o histórico.',
    })
  }
  db.prepare('DELETE FROM usuarios WHERE id = ? AND clinica_id = ?').run(req.params.id, req.usuario.clinica_id)
  res.status(204).end()
})

export default router
