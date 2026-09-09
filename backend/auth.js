import jwt from 'jsonwebtoken'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data')
const secretPath = path.join(dataDir, '.jwt_secret')

function carregarSegredo() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET
  if (fs.existsSync(secretPath)) return fs.readFileSync(secretPath, 'utf8')
  fs.mkdirSync(path.dirname(secretPath), { recursive: true })
  const segredo = crypto.randomBytes(48).toString('hex')
  fs.writeFileSync(secretPath, segredo)
  return segredo
}

const SECRET = carregarSegredo()

export function assinarToken(usuario, lembrar = false) {
  return jwt.sign(
    { id: usuario.id, nome: usuario.nome, role: usuario.role, clinica_id: usuario.clinica_id ?? null },
    SECRET,
    { expiresIn: lembrar ? '30d' : '12h' },
  )
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Não autenticado' })
  try {
    req.usuario = jwt.verify(token, SECRET)
    next()
  } catch {
    res.status(401).json({ error: 'Sessão inválida ou expirada' })
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.usuario?.role)) {
      return res.status(403).json({ error: 'Sem permissão para esta ação' })
    }
    next()
  }
}

export function requireClinica(req, res, next) {
  if (!req.usuario?.clinica_id) {
    return res.status(403).json({ error: 'Ação disponível apenas para usuários vinculados a uma clínica' })
  }
  next()
}
