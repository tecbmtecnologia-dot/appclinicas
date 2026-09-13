import { Router } from 'express'
import { db } from '../db.js'
import { requireRole } from '../auth.js'
import {
  gerarRelatorioAbsenteismoPDF,
  gerarRelatorioAnaliseFinanceiraPDF,
  gerarRelatorioCancelamentoPDF,
  gerarRelatorioCirurgiasPDF,
  gerarRelatorioConsultasProcedimentosPDF,
  gerarRelatorioContasPDF,
  gerarRelatorioEpidemiologicoPDF,
  gerarRelatorioFinanceiroPDF,
  gerarRelatorioPacientesPDF,
  gerarRelatorioProducaoPDF,
  gerarRelatorioRepassePDF,
  gerarRelatorioVendasProfissionalPDF,
} from '../pdfRelatorios.js'
import { montarReferencia, resumoComissoesClinica } from './comissoes.js'

// Só admin — visão gerencial completa da clínica, não é operacional do dia a dia.
const router = Router()
router.use(requireRole('admin'))

async function buscarRelatorioPacientes(clinicaId) {
  const { total } = await db.prepare('SELECT COUNT(*) AS total FROM pacientes WHERE clinica_id = ?').get(clinicaId)
  return { total }
}

async function buscarRelatorioCirurgias(clinicaId, { data_inicio, data_fim }) {
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

  const { total } = await db.prepare(`SELECT COUNT(*) AS total FROM cirurgias WHERE clinica_id = ?${filtroData}`).get(...params)
  const { total_realizadas } = await db
    .prepare(`SELECT COUNT(*) AS total_realizadas FROM cirurgias WHERE clinica_id = ? AND status = 'pronta'${filtroData}`)
    .get(...params)
  const por_dia = await db
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

// Agrupamento por semana usa o padrão ISO do Postgres (ano-semana ISO, ex: "2024-W21"),
// levemente diferente do %Y-W%W do SQLite (semana começando em domingo) — aceitável pra
// um relatório gerencial, sem equivalente 1:1 direto entre os dois bancos.
function chaveAgrupamento(periodo, coluna) {
  switch (periodo) {
    case 'dia':
      return `substr(${coluna}, 1, 10)`
    case 'semana':
      return `to_char((${coluna})::date, 'IYYY-"W"IW')`
    case 'mes':
      return `substr(${coluna}, 1, 7)`
    case 'ano':
      return `substr(${coluna}, 1, 4)`
    default:
      return null
  }
}

async function buscarRelatorioFinanceiro(clinicaId, periodo, { data_inicio, data_fim }) {
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

  const recebiveis = await db
    .prepare(
      `SELECT ${chaveRecebiveis} AS chave, COALESCE(SUM(valor), 0) AS valor
       FROM pagamentos
       WHERE clinica_id = ? AND status = 'pago'${filtroRecebiveis}
       GROUP BY chave ORDER BY chave ASC`,
    )
    .all(...paramsRecebiveis)
  const despesas = await db
    .prepare(
      `SELECT ${chaveDespesas} AS chave, COALESCE(SUM(valor), 0) AS valor
       FROM despesas_clinica
       WHERE clinica_id = ? AND status = 'pago'${filtroDespesas}
       GROUP BY chave ORDER BY chave ASC`,
    )
    .all(...paramsDespesas)

  return { periodo, recebiveis, despesas }
}

// Produção realizada: um pagamento já recebido = uma linha (paciente + o que foi pago + valor).
// A "descrição" do pagamento já é o texto livre que a recepção/financeiro preenche ao lançá-lo
// (ex.: "Consulta", "Botox"), então serve como procedimento/consulta sem precisar de campo novo.
async function buscarRelatorioProducao(clinicaId, { data_inicio, data_fim }) {
  let filtro = ''
  const params = [clinicaId]
  if (data_inicio) {
    filtro += ' AND pg.data_pagamento >= ?'
    params.push(data_inicio)
  }
  if (data_fim) {
    filtro += ' AND pg.data_pagamento <= ?'
    params.push(data_fim)
  }

  const linhas = await db
    .prepare(
      `SELECT p.nome AS paciente_nome, pg.descricao, pg.valor, pg.data_pagamento
       FROM pagamentos pg
       JOIN pacientes p ON p.id = pg.paciente_id
       WHERE pg.clinica_id = ? AND pg.status = 'pago'${filtro}
       ORDER BY pg.data_pagamento ASC`,
    )
    .all(...params)
  const total = linhas.reduce((s, l) => s + l.valor, 0)
  return { linhas, total }
}

// Contas a pagar e a receber: diferente do relatório "Financeiro" acima (que soma só o que
// já foi pago/recebido), este lista o que está EM ABERTO — pendente ou atrasado — filtrado
// pela data de vencimento, pra saber o que ainda falta receber dos pacientes e pagar de despesas.
async function buscarRelatorioContas(clinicaId, { data_inicio, data_fim }) {
  let filtroReceber = ''
  const paramsReceber = [clinicaId]
  if (data_inicio) {
    filtroReceber += ' AND pg.data_vencimento >= ?'
    paramsReceber.push(data_inicio)
  }
  if (data_fim) {
    filtroReceber += ' AND pg.data_vencimento <= ?'
    paramsReceber.push(data_fim)
  }

  let filtroPagar = ''
  const paramsPagar = [clinicaId]
  if (data_inicio) {
    filtroPagar += ' AND data >= ?'
    paramsPagar.push(data_inicio)
  }
  if (data_fim) {
    filtroPagar += ' AND data <= ?'
    paramsPagar.push(data_fim)
  }

  const aReceber = await db
    .prepare(
      `SELECT p.nome AS paciente_nome, pg.descricao, pg.valor, pg.data_vencimento, pg.status
       FROM pagamentos pg
       JOIN pacientes p ON p.id = pg.paciente_id
       WHERE pg.clinica_id = ? AND pg.status IN ('pendente', 'atrasado')${filtroReceber}
       ORDER BY (pg.data_vencimento IS NULL), pg.data_vencimento ASC`,
    )
    .all(...paramsReceber)
  const aPagar = await db
    .prepare(
      `SELECT descricao, categoria, valor, data, status
       FROM despesas_clinica
       WHERE clinica_id = ? AND status = 'pendente'${filtroPagar}
       ORDER BY data ASC`,
    )
    .all(...paramsPagar)

  return {
    aReceber,
    aPagar,
    totalAReceber: aReceber.reduce((s, l) => s + l.valor, 0),
    totalAPagar: aPagar.reduce((s, l) => s + l.valor, 0),
  }
}

const ROTULOS_SEXO = { feminino: 'Feminino', masculino: 'Masculino', nao_informado: 'Não informado' }
const FAIXAS_ETARIAS = ['0-17', '18-29', '30-44', '45-59', '60+', 'Não informado']

function calcularIdade(dataNascimento, dataReferencia) {
  if (!dataNascimento) return null
  const nasc = new Date(`${dataNascimento.slice(0, 10)}T00:00:00`)
  const ref = new Date(`${dataReferencia.slice(0, 10)}T00:00:00`)
  if (Number.isNaN(nasc.getTime()) || Number.isNaN(ref.getTime())) return null
  let idade = ref.getFullYear() - nasc.getFullYear()
  const diffMes = ref.getMonth() - nasc.getMonth()
  if (diffMes < 0 || (diffMes === 0 && ref.getDate() < nasc.getDate())) idade--
  return idade
}

function faixaEtaria(idade) {
  if (idade == null) return 'Não informado'
  if (idade <= 17) return '0-17'
  if (idade <= 29) return '18-29'
  if (idade <= 44) return '30-44'
  if (idade <= 59) return '45-59'
  return '60+'
}

function contarPor(chave, contadores) {
  contadores.set(chave, (contadores.get(chave) ?? 0) + 1)
}

// Perfil epidemiológico: um atendimento concluído (consulta ou procedimento) = uma linha,
// cruzando sexo/faixa etária do paciente (na data do atendimento) com o que foi realizado.
// Cada agendamento conta uma vez — o mesmo paciente atendido várias vezes aparece várias vezes,
// igual à "Produção realizada", pra manter os totais das três quebras sempre batendo entre si.
async function buscarPerfilEpidemiologico(clinicaId, { data_inicio, data_fim }) {
  let filtro = ''
  const params = [clinicaId]
  if (data_inicio) {
    filtro += ' AND a.data_hora >= ?'
    params.push(data_inicio)
  }
  if (data_fim) {
    filtro += ' AND a.data_hora <= ?'
    params.push(`${data_fim} 23:59:59`)
  }

  const atendimentos = await db
    .prepare(
      `SELECT p.sexo, p.data_nascimento, a.data_hora, COALESCE(tp.nome, 'Consulta') AS procedimento
       FROM agendamentos a
       JOIN pacientes p ON p.id = a.paciente_id
       LEFT JOIN tipos_procedimento tp ON tp.id = a.tipo_procedimento_id
       WHERE a.clinica_id = ? AND a.status = 'concluido'${filtro}`,
    )
    .all(...params)

  const contSexo = new Map()
  const contFaixa = new Map()
  const contProcedimento = new Map()

  atendimentos.forEach((a) => {
    contarPor(a.sexo && ROTULOS_SEXO[a.sexo] ? ROTULOS_SEXO[a.sexo] : 'Não informado', contSexo)
    contarPor(faixaEtaria(calcularIdade(a.data_nascimento, a.data_hora)), contFaixa)
    contarPor(a.procedimento, contProcedimento)
  })

  const porSexo = [...contSexo.entries()].map(([rotulo, quantidade]) => ({ rotulo, quantidade })).sort((a, b) => b.quantidade - a.quantidade)
  const porFaixaEtaria = FAIXAS_ETARIAS.filter((f) => contFaixa.has(f)).map((rotulo) => ({ rotulo, quantidade: contFaixa.get(rotulo) }))
  const porProcedimento = [...contProcedimento.entries()]
    .map(([rotulo, quantidade]) => ({ rotulo, quantidade }))
    .sort((a, b) => b.quantidade - a.quantidade)

  return { total: atendimentos.length, porSexo, porFaixaEtaria, porProcedimento }
}

router.get('/epidemiologico', async (req, res) => {
  res.json(await buscarPerfilEpidemiologico(req.usuario.clinica_id, req.query))
})

router.get('/epidemiologico.pdf', async (req, res) => {
  const clinica = await db.prepare('SELECT * FROM clinicas WHERE id = ?').get(req.usuario.clinica_id)
  const { data_inicio, data_fim } = req.query
  const dados = await buscarPerfilEpidemiologico(req.usuario.clinica_id, req.query)
  gerarRelatorioEpidemiologicoPDF(res, { clinica, data_inicio, data_fim, ...dados })
})

function filtroDataHora(params, data_inicio, data_fim, coluna = 'a.data_hora') {
  let filtro = ''
  if (data_inicio) {
    filtro += ` AND ${coluna} >= ?`
    params.push(data_inicio)
  }
  if (data_fim) {
    filtro += ` AND ${coluna} <= ?`
    params.push(`${data_fim} 23:59:59`)
  }
  return filtro
}

async function buscarAgendamentosComStatus(clinicaId, status, { data_inicio, data_fim }) {
  const params = [clinicaId, status]
  const filtro = filtroDataHora(params, data_inicio, data_fim)
  return db
    .prepare(
      `SELECT p.nome AS paciente_nome, m.nome AS medico_nome, a.data_hora, COALESCE(tp.nome, 'Consulta') AS procedimento
       FROM agendamentos a
       JOIN pacientes p ON p.id = a.paciente_id
       JOIN medicos m ON m.id = a.medico_id
       LEFT JOIN tipos_procedimento tp ON tp.id = a.tipo_procedimento_id
       WHERE a.clinica_id = ? AND a.status = ?${filtro}
       ORDER BY a.data_hora ASC`,
    )
    .all(...params)
}

async function contarAgendamentos(clinicaId, { data_inicio, data_fim }, statusFiltro) {
  const params = [clinicaId]
  let filtro = filtroDataHora(params, data_inicio, data_fim, 'data_hora')
  if (statusFiltro) {
    filtro += ` AND status IN (${statusFiltro.map(() => '?').join(',')})`
    params.push(...statusFiltro)
  }
  const { total } = await db.prepare(`SELECT COUNT(*) AS total FROM agendamentos WHERE clinica_id = ?${filtro}`).get(...params)
  return total
}

// Absenteísmo: agendamentos marcados como "faltou" (paciente não compareceu, ver botão
// "Marcar falta" na Agenda). Taxa = faltas / (faltas + concluídos) — só conta atendimentos
// que realmente deveriam ter acontecido, ignora o que ainda está agendado no futuro ou foi
// cancelado de propósito (isso é o relatório de Cancelamento, abaixo).
async function buscarRelatorioAbsenteismo(clinicaId, filtro) {
  const linhas = await buscarAgendamentosComStatus(clinicaId, 'faltou', filtro)
  const totalRelevante = await contarAgendamentos(clinicaId, filtro, ['faltou', 'concluido'])
  const taxa = totalRelevante > 0 ? (linhas.length / totalRelevante) * 100 : 0
  return { linhas, total: linhas.length, totalRelevante, taxa }
}

router.get('/absenteismo', async (req, res) => {
  res.json(await buscarRelatorioAbsenteismo(req.usuario.clinica_id, req.query))
})

router.get('/absenteismo.pdf', async (req, res) => {
  const clinica = await db.prepare('SELECT * FROM clinicas WHERE id = ?').get(req.usuario.clinica_id)
  const { data_inicio, data_fim } = req.query
  const dados = await buscarRelatorioAbsenteismo(req.usuario.clinica_id, req.query)
  gerarRelatorioAbsenteismoPDF(res, { clinica, data_inicio, data_fim, ...dados })
})

// Cancelamento: agendamentos cancelados. Taxa = cancelados / total de agendamentos criados
// pra acontecer no período (qualquer status) — mede o quanto da agenda "evapora" por cancelamento.
async function buscarRelatorioCancelamento(clinicaId, filtro) {
  const linhas = await buscarAgendamentosComStatus(clinicaId, 'cancelado', filtro)
  const totalGeral = await contarAgendamentos(clinicaId, filtro, null)
  const taxa = totalGeral > 0 ? (linhas.length / totalGeral) * 100 : 0
  return { linhas, total: linhas.length, totalGeral, taxa }
}

router.get('/cancelamento', async (req, res) => {
  res.json(await buscarRelatorioCancelamento(req.usuario.clinica_id, req.query))
})

router.get('/cancelamento.pdf', async (req, res) => {
  const clinica = await db.prepare('SELECT * FROM clinicas WHERE id = ?').get(req.usuario.clinica_id)
  const { data_inicio, data_fim } = req.query
  const dados = await buscarRelatorioCancelamento(req.usuario.clinica_id, req.query)
  gerarRelatorioCancelamentoPDF(res, { clinica, data_inicio, data_fim, ...dados })
})

async function buscarAtendimentosConcluidos(clinicaId, { data_inicio, data_fim }) {
  const params = [clinicaId]
  const filtro = filtroDataHora(params, data_inicio, data_fim)
  return db
    .prepare(
      `SELECT m.nome AS medico_nome, COALESCE(tp.nome, 'Consulta') AS procedimento
       FROM agendamentos a
       JOIN medicos m ON m.id = a.medico_id
       LEFT JOIN tipos_procedimento tp ON tp.id = a.tipo_procedimento_id
       WHERE a.clinica_id = ? AND a.status = 'concluido'${filtro}`,
    )
    .all(...params)
}

// Total de consultas e procedimentos realizados: quantidade de atendimentos concluídos,
// agrupados pelo que foi feito. Mesma base de dados da "Vendas por profissional" abaixo
// (agendamentos concluídos), só que agrupando por procedimento em vez de por médico.
async function buscarRelatorioConsultasProcedimentos(clinicaId, filtro) {
  const atendimentos = await buscarAtendimentosConcluidos(clinicaId, filtro)
  const cont = new Map()
  atendimentos.forEach((a) => contarPor(a.procedimento, cont))
  const porProcedimento = [...cont.entries()].map(([rotulo, quantidade]) => ({ rotulo, quantidade })).sort((a, b) => b.quantidade - a.quantidade)
  return { total: atendimentos.length, porProcedimento }
}

router.get('/consultas-procedimentos', async (req, res) => {
  res.json(await buscarRelatorioConsultasProcedimentos(req.usuario.clinica_id, req.query))
})

router.get('/consultas-procedimentos.pdf', async (req, res) => {
  const clinica = await db.prepare('SELECT * FROM clinicas WHERE id = ?').get(req.usuario.clinica_id)
  const { data_inicio, data_fim } = req.query
  const dados = await buscarRelatorioConsultasProcedimentos(req.usuario.clinica_id, req.query)
  gerarRelatorioConsultasProcedimentosPDF(res, { clinica, data_inicio, data_fim, ...dados })
})

// Vendas por profissional: por decisão do usuário (não existe vínculo entre pagamento e
// profissional no sistema hoje), isso mede QUANTIDADE de atendimentos concluídos por médico,
// não valor em R$. Se pedir o valor de verdade no futuro, precisa criar esse vínculo antes.
async function buscarRelatorioVendasProfissional(clinicaId, filtro) {
  const atendimentos = await buscarAtendimentosConcluidos(clinicaId, filtro)
  const cont = new Map()
  atendimentos.forEach((a) => contarPor(a.medico_nome, cont))
  const porProfissional = [...cont.entries()].map(([rotulo, quantidade]) => ({ rotulo, quantidade })).sort((a, b) => b.quantidade - a.quantidade)
  return { total: atendimentos.length, porProfissional }
}

router.get('/vendas-profissional', async (req, res) => {
  res.json(await buscarRelatorioVendasProfissional(req.usuario.clinica_id, req.query))
})

router.get('/vendas-profissional.pdf', async (req, res) => {
  const clinica = await db.prepare('SELECT * FROM clinicas WHERE id = ?').get(req.usuario.clinica_id)
  const { data_inicio, data_fim } = req.query
  const dados = await buscarRelatorioVendasProfissional(req.usuario.clinica_id, req.query)
  gerarRelatorioVendasProfissionalPDF(res, { clinica, data_inicio, data_fim, ...dados })
})

// Repasse de pagamento: reaproveita o mesmo cálculo do módulo Comissões (fixo mensal +
// comissão por cirurgia + avulsas aprovadas), só que como relatório mensal imprimível —
// única fonte de verdade pra não ter dois lugares calculando comissão de jeitos diferentes.
async function buscarRelatorioRepasse(clinicaId, mes, ano) {
  const referencia = montarReferencia(mes, ano)
  const resumo = await resumoComissoesClinica(clinicaId, referencia)
  const totalGeral = resumo.reduce((s, r) => s + r.total, 0)
  return { referencia, resumo, totalGeral }
}

router.get('/repasse', async (req, res) => {
  res.json(await buscarRelatorioRepasse(req.usuario.clinica_id, req.query.mes, req.query.ano))
})

router.get('/repasse.pdf', async (req, res) => {
  const clinica = await db.prepare('SELECT * FROM clinicas WHERE id = ?').get(req.usuario.clinica_id)
  const dados = await buscarRelatorioRepasse(req.usuario.clinica_id, req.query.mes, req.query.ano)
  gerarRelatorioRepassePDF(res, { clinica, ...dados })
})

const NOMES_MES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

// Análise financeira: os 12 meses do ano, cada um com total recebido (pago) x total gasto
// (pago) e o saldo — visão anual comparativa, diferente do "Financeiro" acima que exige
// escolher um período/intervalo manualmente e mostra as listas separadas, sem saldo por mês.
async function buscarAnaliseFinanceira(clinicaId, ano) {
  const linhasReceitas = await db
    .prepare(
      `SELECT substr(data_pagamento, 6, 2) AS mes, COALESCE(SUM(valor), 0) AS valor
       FROM pagamentos
       WHERE clinica_id = ? AND status = 'pago' AND substr(data_pagamento, 1, 4) = ?
       GROUP BY mes`,
    )
    .all(clinicaId, String(ano))
  const receitasPorMes = new Map(linhasReceitas.map((r) => [r.mes, r.valor]))

  const linhasDespesas = await db
    .prepare(
      `SELECT substr(data, 6, 2) AS mes, COALESCE(SUM(valor), 0) AS valor
       FROM despesas_clinica
       WHERE clinica_id = ? AND status = 'pago' AND substr(data, 1, 4) = ?
       GROUP BY mes`,
    )
    .all(clinicaId, String(ano))
  const despesasPorMes = new Map(linhasDespesas.map((r) => [r.mes, r.valor]))

  const meses = NOMES_MES.map((nome, i) => {
    const chave = String(i + 1).padStart(2, '0')
    const receitas = receitasPorMes.get(chave) ?? 0
    const despesas = despesasPorMes.get(chave) ?? 0
    return { mes: chave, nome, receitas, despesas, saldo: receitas - despesas }
  })

  const totalReceitas = meses.reduce((s, m) => s + m.receitas, 0)
  const totalDespesas = meses.reduce((s, m) => s + m.despesas, 0)
  return { ano: Number(ano), meses, totalReceitas, totalDespesas, totalSaldo: totalReceitas - totalDespesas }
}

router.get('/analise-financeira', async (req, res) => {
  const ano = req.query.ano || new Date().getFullYear()
  res.json(await buscarAnaliseFinanceira(req.usuario.clinica_id, ano))
})

router.get('/analise-financeira.pdf', async (req, res) => {
  const ano = req.query.ano || new Date().getFullYear()
  const clinica = await db.prepare('SELECT * FROM clinicas WHERE id = ?').get(req.usuario.clinica_id)
  const dados = await buscarAnaliseFinanceira(req.usuario.clinica_id, ano)
  gerarRelatorioAnaliseFinanceiraPDF(res, { clinica, ...dados })
})

router.get('/contas', async (req, res) => {
  res.json(await buscarRelatorioContas(req.usuario.clinica_id, req.query))
})

router.get('/contas.pdf', async (req, res) => {
  const clinica = await db.prepare('SELECT * FROM clinicas WHERE id = ?').get(req.usuario.clinica_id)
  const { data_inicio, data_fim } = req.query
  const dados = await buscarRelatorioContas(req.usuario.clinica_id, req.query)
  gerarRelatorioContasPDF(res, { clinica, data_inicio, data_fim, ...dados })
})

router.get('/producao', async (req, res) => {
  res.json(await buscarRelatorioProducao(req.usuario.clinica_id, req.query))
})

router.get('/producao.pdf', async (req, res) => {
  const clinica = await db.prepare('SELECT * FROM clinicas WHERE id = ?').get(req.usuario.clinica_id)
  const { data_inicio, data_fim } = req.query
  const dados = await buscarRelatorioProducao(req.usuario.clinica_id, req.query)
  gerarRelatorioProducaoPDF(res, { clinica, data_inicio, data_fim, ...dados })
})

router.get('/pacientes', async (req, res) => {
  res.json(await buscarRelatorioPacientes(req.usuario.clinica_id))
})

router.get('/pacientes.pdf', async (req, res) => {
  const clinica = await db.prepare('SELECT * FROM clinicas WHERE id = ?').get(req.usuario.clinica_id)
  const { total } = await buscarRelatorioPacientes(req.usuario.clinica_id)
  gerarRelatorioPacientesPDF(res, { clinica, total })
})

router.get('/cirurgias', async (req, res) => {
  res.json(await buscarRelatorioCirurgias(req.usuario.clinica_id, req.query))
})

router.get('/cirurgias.pdf', async (req, res) => {
  const clinica = await db.prepare('SELECT * FROM clinicas WHERE id = ?').get(req.usuario.clinica_id)
  const { data_inicio, data_fim } = req.query
  const dados = await buscarRelatorioCirurgias(req.usuario.clinica_id, req.query)
  gerarRelatorioCirurgiasPDF(res, { clinica, data_inicio, data_fim, ...dados })
})

router.get('/financeiro', async (req, res) => {
  const { periodo = 'mes' } = req.query
  const resultado = await buscarRelatorioFinanceiro(req.usuario.clinica_id, periodo, req.query)
  if (!resultado) return res.status(400).json({ error: 'periodo deve ser dia, semana, mes ou ano' })
  res.json(resultado)
})

router.get('/financeiro.pdf', async (req, res) => {
  const { periodo = 'mes', data_inicio, data_fim } = req.query
  const resultado = await buscarRelatorioFinanceiro(req.usuario.clinica_id, periodo, req.query)
  if (!resultado) return res.status(400).json({ error: 'periodo deve ser dia, semana, mes ou ano' })
  const clinica = await db.prepare('SELECT * FROM clinicas WHERE id = ?').get(req.usuario.clinica_id)
  gerarRelatorioFinanceiroPDF(res, { clinica, data_inicio, data_fim, ...resultado })
})

export default router
