import { Router } from 'express'
import { db } from '../db.js'
import { requireRole } from '../auth.js'
import { gerarRelatorioCirurgiasPDF, gerarRelatorioFinanceiroPDF, gerarRelatorioPacientesPDF } from '../pdfRelatorios.js'

// Só admin — visão gerencial completa da clínica, não é operacional do dia a dia.
const router = Router()
router.use(requireRole('admin'))

function buscarRelatorioPacientes(clinicaId) {
  const { total } = db.prepare('SELECT COUNT(*) AS total FROM pacientes WHERE clinica_id = ?').get(clinicaId)
  return { total }
}

function buscarRelatorioCirurgias(clinicaId, { data_inicio, data_fim }) {
  let filtroData = ''
  const params = [clinicaId]
  if (data_inicio) {
    filtroData += ' AND data_prevista >= ?'
    params.push(data_inicio)
  }
  if (data_fim) {
    filtroData += ' AND data_prevista <= ?'
    params.push(data_fim)
  }

  const { total } = db.prepare(`SELECT COUNT(*) AS total FROM cirurgias WHERE clinica_id = ?${filtroData}`).get(...params)
  const { total_realizadas } = db
    .prepare(`SELECT COUNT(*) AS total_realizadas FROM cirurgias WHERE clinica_id = ? AND status = 'pronta'${filtroData}`)
    .get(...params)
  const por_dia = db
    .prepare(
      `SELECT data_prevista AS data, COUNT(*) AS quantidade
       FROM cirurgias
       WHERE clinica_id = ? AND data_prevista IS NOT NULL${filtroData}
       GROUP BY data_prevista
       ORDER BY data_prevista ASC`,
    )
    .all(...params)

  return { total, total_realizadas, por_dia }
}

function chaveAgrupamento(periodo, coluna) {
  switch (periodo) {
    case 'dia':
      return `substr(${coluna}, 1, 10)`
    case 'semana':
      return `strftime('%Y-W%W', ${coluna})`
    case 'mes':
      return `substr(${coluna}, 1, 7)`
    case 'ano':
      return `substr(${coluna}, 1, 4)`
    default:
      return null
  }
}

function buscarRelatorioFinanceiro(clinicaId, periodo, { data_inicio, data_fim }) {
  const chaveRecebiveis = chaveAgrupamento(periodo, 'data_pagamento')
  const chaveDespesas = chaveAgrupamento(periodo, 'data')
  if (!chaveRecebiveis) return null

  let filtroRecebiveis = ''
  const paramsRecebiveis = [clinicaId]
  if (data_inicio) {
    filtroRecebiveis += ' AND data_pagamento >= ?'
    paramsRecebiveis.push(data_inicio)
  }
  if (data_fim) {
    filtroRecebiveis += ' AND data_pagamento <= ?'
    paramsRecebiveis.push(data_fim)
  }

  let filtroDespesas = ''
  const paramsDespesas = [clinicaId]
  if (data_inicio) {
    filtroDespesas += ' AND data >= ?'
    paramsDespesas.push(data_inicio)
  }
  if (data_fim) {
    filtroDespesas += ' AND data <= ?'
    paramsDespesas.push(data_fim)
  }

  const recebiveis = db
    .prepare(
      `SELECT ${chaveRecebiveis} AS chave, COALESCE(SUM(valor), 0) AS valor
       FROM pagamentos
       WHERE clinica_id = ? AND status = 'pago'${filtroRecebiveis}
       GROUP BY chave ORDER BY chave ASC`,
    )
    .all(...paramsRecebiveis)
  const despesas = db
    .prepare(
      `SELECT ${chaveDespesas} AS chave, COALESCE(SUM(valor), 0) AS valor
       FROM despesas_clinica
       WHERE clinica_id = ? AND status = 'pago'${filtroDespesas}
       GROUP BY chave ORDER BY chave ASC`,
    )
    .all(...paramsDespesas)

  return { periodo, recebiveis, despesas }
}

router.get('/pacientes', (req, res) => {
  res.json(buscarRelatorioPacientes(req.usuario.clinica_id))
})

router.get('/pacientes.pdf', (req, res) => {
  const clinica = db.prepare('SELECT * FROM clinicas WHERE id = ?').get(req.usuario.clinica_id)
  const { total } = buscarRelatorioPacientes(req.usuario.clinica_id)
  gerarRelatorioPacientesPDF(res, { clinica, total })
})

router.get('/cirurgias', (req, res) => {
  res.json(buscarRelatorioCirurgias(req.usuario.clinica_id, req.query))
})

router.get('/cirurgias.pdf', (req, res) => {
  const clinica = db.prepare('SELECT * FROM clinicas WHERE id = ?').get(req.usuario.clinica_id)
  const { data_inicio, data_fim } = req.query
  const dados = buscarRelatorioCirurgias(req.usuario.clinica_id, req.query)
  gerarRelatorioCirurgiasPDF(res, { clinica, data_inicio, data_fim, ...dados })
})

router.get('/financeiro', (req, res) => {
  const { periodo = 'mes' } = req.query
  const resultado = buscarRelatorioFinanceiro(req.usuario.clinica_id, periodo, req.query)
  if (!resultado) return res.status(400).json({ error: 'periodo deve ser dia, semana, mes ou ano' })
  res.json(resultado)
})

router.get('/financeiro.pdf', (req, res) => {
  const { periodo = 'mes', data_inicio, data_fim } = req.query
  const resultado = buscarRelatorioFinanceiro(req.usuario.clinica_id, periodo, req.query)
  if (!resultado) return res.status(400).json({ error: 'periodo deve ser dia, semana, mes ou ano' })
  const clinica = db.prepare('SELECT * FROM clinicas WHERE id = ?').get(req.usuario.clinica_id)
  gerarRelatorioFinanceiroPDF(res, { clinica, data_inicio, data_fim, ...resultado })
})

export default router
