import { Router } from 'express'
import { db } from '../db.js'
import { requireRole } from '../auth.js'

const router = Router()
router.use(requireRole('coordenador'))

function referenciaAtual() {
  return new Date().toISOString().slice(0, 7)
}

// Semana de segunda a domingo que contém hoje.
function limitesSemanaAtual() {
  const hoje = new Date()
  const diaSemana = hoje.getDay()
  const deltaSegunda = diaSemana === 0 ? -6 : 1 - diaSemana
  const segunda = new Date(hoje)
  segunda.setDate(hoje.getDate() + deltaSegunda)
  const domingo = new Date(segunda)
  domingo.setDate(segunda.getDate() + 6)
  const fmt = (d) => d.toISOString().slice(0, 10)
  return { inicio: fmt(segunda), fim: fmt(domingo) }
}

router.get('/resumo', async (req, res) => {
  const clinicaId = req.usuario.clinica_id
  const hoje = new Date()
  const anoAtual = String(hoje.getFullYear())
  const mesAtual = referenciaAtual()
  const { inicio: inicioSemana, fim: fimSemana } = limitesSemanaAtual()

  const { mes, ano } = req.query
  const referenciaFinanceiro = mes && ano ? `${ano}-${String(mes).padStart(2, '0')}` : mesAtual

  const contarCirurgias = async (condicaoData, ...params) => {
    const row = await db
      .prepare(
        `SELECT COUNT(*) AS total FROM cirurgias WHERE clinica_id = ? AND status = 'pronta' AND ${condicaoData}`,
      )
      .get(clinicaId, ...params)
    return row.total
  }

  const cirurgias = {
    semana: await contarCirurgias(
      `substr(COALESCE(data_prevista, created_at), 1, 10) BETWEEN ? AND ?`,
      inicioSemana,
      fimSemana,
    ),
    mes: await contarCirurgias(`substr(COALESCE(data_prevista, created_at), 1, 7) = ?`, mesAtual),
    ano: await contarCirurgias(`substr(COALESCE(data_prevista, created_at), 1, 4) = ?`, anoAtual),
  }

  const contarConsultas = async (condicaoData, ...params) => {
    const row = await db.prepare(`SELECT COUNT(*) AS total FROM agendamentos WHERE clinica_id = ? AND ${condicaoData}`).get(clinicaId, ...params)
    return row.total
  }

  const consultas = {
    semana: await contarConsultas(`substr(data_hora, 1, 10) BETWEEN ? AND ?`, inicioSemana, fimSemana),
    mes: await contarConsultas(`substr(data_hora, 1, 7) = ?`, mesAtual),
    ano: await contarConsultas(`substr(data_hora, 1, 4) = ?`, anoAtual),
    concluidas_mes: await contarConsultas(`status = 'concluido' AND substr(data_hora, 1, 7) = ?`, mesAtual),
  }

  const { total: pacientesTotal } = await db.prepare('SELECT COUNT(*) AS total FROM pacientes WHERE clinica_id = ?').get(clinicaId)

  const { recebido } = await db
    .prepare(
      `SELECT COALESCE(SUM(valor), 0) AS recebido FROM pagamentos WHERE clinica_id = ? AND status = 'pago' AND substr(data_pagamento, 1, 7) = ?`,
    )
    .get(clinicaId, referenciaFinanceiro)
  const { gasto } = await db
    .prepare(
      `SELECT COALESCE(SUM(valor), 0) AS gasto FROM despesas_clinica WHERE clinica_id = ? AND status = 'pago' AND substr(data, 1, 7) = ?`,
    )
    .get(clinicaId, referenciaFinanceiro)

  res.json({
    cirurgias,
    consultas,
    pacientes_total: pacientesTotal,
    financeiro: { referencia: referenciaFinanceiro, recebido, gasto, saldo: recebido - gasto },
  })
})

export default router
