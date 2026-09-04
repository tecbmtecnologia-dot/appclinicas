import { Router } from 'express'
import { nanoid } from 'nanoid'
import { db } from '../db.js'
import { requireRole } from '../auth.js'
import { uploadSelfiePonto } from '../upload.js'

const router = Router()
const GESTAO_RH = requireRole('admin', 'coordenador', 'financeiro')
const RAIO_PADRAO_METROS = 200
const TIPOS = ['entrada', 'inicio_intervalo', 'fim_intervalo', 'saida']

function distanciaMetros(lat1, lon1, lat2, lon2) {
  const R = 6371000
  const toRad = (v) => (v * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function localReferencia(usuario) {
  if (usuario.unidade_id) {
    const unidade = db.prepare('SELECT * FROM unidades WHERE id = ?').get(usuario.unidade_id)
    if (unidade?.latitude != null && unidade?.longitude != null) {
      return { latitude: unidade.latitude, longitude: unidade.longitude, raio: unidade.raio_metros || RAIO_PADRAO_METROS, nome: unidade.nome }
    }
  }
  const clinica = db.prepare('SELECT * FROM clinicas WHERE id = ?').get(usuario.clinica_id)
  if (clinica?.latitude != null && clinica?.longitude != null) {
    return { latitude: clinica.latitude, longitude: clinica.longitude, raio: clinica.raio_metros || RAIO_PADRAO_METROS, nome: clinica.nome }
  }
  return null
}

function calcularHorasTrabalhadas(registros) {
  let abertura = null
  let minutos = 0
  for (const r of registros) {
    const momento = new Date(r.data_hora).getTime()
    if (r.tipo === 'entrada' || r.tipo === 'fim_intervalo') {
      abertura = momento
    } else if (r.tipo === 'saida' || r.tipo === 'inicio_intervalo') {
      if (abertura != null) {
        minutos += (momento - abertura) / 60000
        abertura = null
      }
    }
  }
  return minutos
}

router.get('/', (req, res) => {
  const alvo = req.query.usuario_id && ['admin', 'coordenador', 'financeiro'].includes(req.usuario.role)
    ? req.query.usuario_id
    : req.usuario.id

  let sql = 'SELECT p.*, u.nome AS usuario_nome FROM pontos p JOIN usuarios u ON u.id = p.usuario_id WHERE p.clinica_id = ? AND p.usuario_id = ?'
  const params = [req.usuario.clinica_id, alvo]
  if (req.query.data_inicio) {
    sql += ' AND substr(p.data_hora, 1, 10) >= ?'
    params.push(req.query.data_inicio)
  }
  if (req.query.data_fim) {
    sql += ' AND substr(p.data_hora, 1, 10) <= ?'
    params.push(req.query.data_fim)
  }
  sql += ' ORDER BY p.data_hora DESC'
  res.json(db.prepare(sql).all(...params))
})

router.get('/resumo', GESTAO_RH, (req, res) => {
  const { mes, ano } = req.query
  const referencia = mes && ano ? `${ano}-${String(mes).padStart(2, '0')}` : new Date().toISOString().slice(0, 7)

  const usuarios = db
    .prepare('SELECT id, nome, role, carga_horaria_mensal_horas FROM usuarios WHERE clinica_id = ? AND ativo = 1')
    .all(req.usuario.clinica_id)

  const resumo = usuarios.map((u) => {
    const registros = db
      .prepare(
        `SELECT tipo, data_hora FROM pontos WHERE usuario_id = ? AND substr(data_hora, 1, 7) = ? ORDER BY data_hora ASC`,
      )
      .all(u.id, referencia)
    const minutos = calcularHorasTrabalhadas(registros)
    const horasTrabalhadas = minutos / 60
    const saldoHoras = horasTrabalhadas - u.carga_horaria_mensal_horas
    return {
      usuario_id: u.id,
      usuario_nome: u.nome,
      role: u.role,
      meta_horas: u.carga_horaria_mensal_horas,
      horas_trabalhadas: Math.round(horasTrabalhadas * 100) / 100,
      saldo_horas: Math.round(saldoHoras * 100) / 100,
      total_registros: registros.length,
    }
  })

  res.json({ referencia, resumo })
})

router.post('/', uploadSelfiePonto.single('foto'), (req, res) => {
  const { tipo, latitude, longitude } = req.body
  if (!TIPOS.includes(tipo)) return res.status(400).json({ error: 'Tipo de marcação inválido' })

  const usuario = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(req.usuario.id)
  const ref = localReferencia(usuario)

  const lat = latitude !== undefined ? Number(latitude) : null
  const lon = longitude !== undefined ? Number(longitude) : null

  let distancia = null
  let dentroRaio = true
  if (ref && lat != null && lon != null && !Number.isNaN(lat) && !Number.isNaN(lon)) {
    distancia = distanciaMetros(ref.latitude, ref.longitude, lat, lon)
    dentroRaio = distancia <= ref.raio
  }

  const id = nanoid()
  const fotoUrl = req.file ? `/uploads/pontos/${req.file.filename}` : null
  db.prepare(
    `INSERT INTO pontos (id, clinica_id, usuario_id, tipo, data_hora, latitude, longitude, distancia_metros, dentro_raio, foto_url)
     VALUES (?, ?, ?, ?, datetime('now'), ?, ?, ?, ?, ?)`,
  ).run(
    id,
    req.usuario.clinica_id,
    req.usuario.id,
    tipo,
    lat,
    lon,
    distancia,
    dentroRaio ? 1 : 0,
    fotoUrl,
  )

  const registro = db.prepare('SELECT * FROM pontos WHERE id = ?').get(id)
  res.status(201).json({
    ...registro,
    distancia_metros: distancia != null ? Math.round(distancia) : null,
    local_referencia: ref?.nome ?? null,
  })
})

export default router
