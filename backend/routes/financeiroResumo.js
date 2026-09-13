import { Router } from 'express'
import { db } from '../db.js'
import { requireRole } from '../auth.js'

const router = Router()
router.use(requireRole('admin', 'financeiro'))

router.get('/resumo', async (req, res) => {
  const { mes, ano } = req.query
  const referencia = mes && ano ? `${ano}-${String(mes).padStart(2, '0')}` : new Date().toISOString().slice(0, 7)
  const clinicaId = req.usuario.clinica_id

  const { recebido } = await db
    .prepare("SELECT COALESCE(SUM(valor), 0) AS recebido FROM pagamentos WHERE clinica_id = ? AND status = 'pago' AND substr(data_pagamento, 1, 7) = ?")
    .get(clinicaId, referencia)
  const { a_receber } = await db
    .prepare("SELECT COALESCE(SUM(valor), 0) AS a_receber FROM pagamentos WHERE clinica_id = ? AND status IN ('pendente','atrasado') AND substr(coalesce(data_vencimento, ''), 1, 7) = ?")
    .get(clinicaId, referencia)
  const { gasto } = await db
    .prepare("SELECT COALESCE(SUM(valor), 0) AS gasto FROM despesas_clinica WHERE clinica_id = ? AND status = 'pago' AND substr(data, 1, 7) = ?")
    .get(clinicaId, referencia)
  const { a_pagar } = await db
    .prepare("SELECT COALESCE(SUM(valor), 0) AS a_pagar FROM despesas_clinica WHERE clinica_id = ? AND status = 'pendente' AND substr(data, 1, 7) = ?")
    .get(clinicaId, referencia)
  const { total_orcado } = await db
    .prepare("SELECT COALESCE(SUM(valor_total), 0) AS total_orcado FROM orcamentos WHERE clinica_id = ? AND substr(created_at, 1, 7) = ?")
    .get(clinicaId, referencia)

  res.json({
    referencia,
    recebido,
    a_receber,
    gasto,
    a_pagar,
    saldo: recebido - gasto,
    total_orcado,
  })
})

export default router
