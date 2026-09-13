import { Router } from 'express'
import { nanoid } from 'nanoid'
import { db } from '../db.js'
import { requireRole } from '../auth.js'
import { uploadSelfiePonto } from '../upload.js'
import { gerarFolhaFrequenciaPDF } from '../pdfFolhaFrequencia.js'

const router = Router()
const GESTAO_RH = requireRole('admin', 'coordenador', 'financeiro')
// medico, pj e coordenador não usam ponto (sem controle de jornada/banco de horas pra esses perfis)
const PODE_BATER_PONTO = requireRole('admin', 'enfermagem', 'recepcao', 'financeiro')
const RAIO_PADRAO_METROS = 200
const TIPOS = ['entrada', 'inicio_intervalo', 'fim_intervalo', 'saida']
// Pseudo-tipo: quando a pessoa não consegue parar pro almoço, registra os dois
// marcos (início e fim do intervalo) no mesmo instante — intervalo de duração
// zero, então calcularHorasTrabalhadas conta o período inteiro como trabalhado.
const TIPO_SEM_INTERVALO = 'sem_intervalo'

function distanciaMetros(lat1, lon1, lat2, lon2) {
  const R = 6371000
  const toRad = (v) => (v * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

async function localReferencia(usuario) {
  if (usuario.unidade_id) {
    const unidade = await db.prepare('SELECT * FROM unidades WHERE id = ?').get(usuario.unidade_id)
    if (unidade?.latitude != null && unidade?.longitude != null) {
      return { latitude: unidade.latitude, longitude: unidade.longitude, raio: unidade.raio_metros || RAIO_PADRAO_METROS, nome: unidade.nome }
    }
  }
  const clinica = await db.prepare('SELECT * FROM clinicas WHERE id = ?').get(usuario.clinica_id)
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

// Jornada oficial cadastrada pelo admin (horário de entrada/intervalo/saída) — usada
// só como referência de meta semanal, não altera o cálculo do que foi de fato trabalhado.
function minutosDoHorario(hhmm) {
  if (!hhmm) return null
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

// Dado um horário { entrada, inicio_intervalo, fim_intervalo, saida }, quantas
// horas isso dá num dia. Usado tanto pro horário único antigo quanto por cada
// dia da jornada_semanal nova.
function horasDoHorario(h) {
  const entrada = minutosDoHorario(h?.entrada)
  const saida = minutosDoHorario(h?.saida)
  if (entrada == null || saida == null) return null
  let minutos = saida - entrada
  const inicioIntervalo = minutosDoHorario(h?.inicio_intervalo)
  const fimIntervalo = minutosDoHorario(h?.fim_intervalo)
  if (inicioIntervalo != null && fimIntervalo != null) {
    minutos -= fimIntervalo - inicioIntervalo
  }
  return minutos / 60
}

function jornadaSemanalDoUsuario(usuario) {
  if (!usuario.jornada_semanal) return null
  try {
    const obj = JSON.parse(usuario.jornada_semanal)
    return Object.keys(obj).length > 0 ? obj : null
  } catch {
    return null
  }
}

const MESMO_HORARIO = (a, b) =>
  (a?.entrada || null) === (b?.entrada || null) &&
  (a?.inicio_intervalo || null) === (b?.inicio_intervalo || null) &&
  (a?.fim_intervalo || null) === (b?.fim_intervalo || null) &&
  (a?.saida || null) === (b?.saida || null)

// Jornada pra exibir/calcular meta do usuário. Se ele tem jornada_semanal (horário
// por dia da semana) cadastrada, usa ela — soma as horas de cada dia trabalhado pra
// horas_semana (o que corrige o cálculo antigo, que so multiplicava um horário único
// por uma contagem de dias, sem saber quais dias eram). Se os dias tiverem todos o
// mesmo horário, devolve também entrada/saida/horas_dia no formato antigo (compatível
// com quem já lê esses campos). Sem jornada_semanal, cai no horário único de sempre.
function jornadaDoUsuario(usuario) {
  const semanal = jornadaSemanalDoUsuario(usuario)
  if (semanal) {
    const dias = Object.fromEntries(
      Object.entries(semanal).map(([dia, h]) => [dia, { ...h, horas_dia: horasDoHorario(h) || 0 }]),
    )
    const horasSemana = Math.round(Object.values(dias).reduce((soma, d) => soma + d.horas_dia, 0) * 100) / 100
    const diasSemana = Object.keys(semanal)
    const valores = Object.values(semanal)
    const uniforme = valores.every((h) => MESMO_HORARIO(h, valores[0]))
    if (uniforme) {
      return { ...valores[0], horas_dia: horasDoHorario(valores[0]) || 0, horas_semana: horasSemana, dias_semana: diasSemana }
    }
    return { variavel: true, horas_semana: horasSemana, dias_semana: diasSemana, dias }
  }

  const horasDia = horasDoHorario({
    entrada: usuario.horario_entrada,
    inicio_intervalo: usuario.horario_inicio_intervalo,
    fim_intervalo: usuario.horario_fim_intervalo,
    saida: usuario.horario_saida,
  })
  if (horasDia == null) return null
  return {
    entrada: usuario.horario_entrada,
    inicio_intervalo: usuario.horario_inicio_intervalo,
    fim_intervalo: usuario.horario_fim_intervalo,
    saida: usuario.horario_saida,
    horas_dia: horasDia,
    horas_semana: Math.round(horasDia * (usuario.dias_trabalho_semana || 5) * 100) / 100,
  }
}

// Ciclo de fechamento da folha (ex: fechamento=20 -> período vai do dia 21 do
// mês anterior ao dia 20 do mês de referência), configurável por usuário —
// substitui o mês-calendário puro pra bater com a folha de pagamento real.
function limitesPeriodo(ano, mes, diaFechamento) {
  let mesAnterior = mes - 1
  let anoAnterior = ano
  if (mesAnterior === 0) {
    mesAnterior = 12
    anoAnterior -= 1
  }
  const inicio = `${anoAnterior}-${String(mesAnterior).padStart(2, '0')}-${String(diaFechamento + 1).padStart(2, '0')}`
  const fim = `${ano}-${String(mes).padStart(2, '0')}-${String(diaFechamento).padStart(2, '0')}`
  return { inicio, fim }
}

// Em qual período (ano/mês de referência, ou seja, o mês em que o período
// fecha) uma data cai, dado o dia de fechamento.
function periodoDe(dataISO, diaFechamento) {
  const [ano, mes, dia] = dataISO.split('-').map(Number)
  if (dia > diaFechamento) {
    return mes === 12 ? { ano: ano + 1, mes: 1 } : { ano, mes: mes + 1 }
  }
  return { ano, mes }
}

// Saldo de banco de horas acumulado desde a admissão até o fim do período de
// referência: soma tudo que foi trabalhado menos a meta de cada período já
// iniciado (mesmo o atual, ainda em andamento) — carrega positivo/negativo
// dos meses anteriores pro atual, em vez de zerar todo mês.
async function saldoAcumulado(usuario, anoRef, mesRef) {
  const diaFechamento = usuario.dia_fechamento_folha || 20
  const admissaoISO = usuario.data_admissao || usuario.created_at.slice(0, 10)
  const periodoAdmissao = periodoDe(admissaoISO, diaFechamento)

  const nPeriodos = (anoRef - periodoAdmissao.ano) * 12 + (mesRef - periodoAdmissao.mes) + 1
  if (nPeriodos <= 0) return null

  const { inicio: inicioAdmissao } = limitesPeriodo(periodoAdmissao.ano, periodoAdmissao.mes, diaFechamento)
  const { fim } = limitesPeriodo(anoRef, mesRef, diaFechamento)
  const inicio = admissaoISO > inicioAdmissao ? admissaoISO : inicioAdmissao

  const registros = await db
    .prepare(`SELECT tipo, data_hora FROM pontos WHERE usuario_id = ? AND substr(data_hora, 1, 10) BETWEEN ? AND ?`)
    .all(usuario.id, inicio, fim)

  const horasTrabalhadas = calcularHorasTrabalhadas(registros) / 60
  const metaTotal = nPeriodos * (usuario.carga_horaria_mensal_horas || 0)

  return {
    desde: admissaoISO,
    periodos: nPeriodos,
    meta_total: Math.round(metaTotal * 100) / 100,
    horas_trabalhadas: Math.round(horasTrabalhadas * 100) / 100,
    saldo: Math.round((horasTrabalhadas - metaTotal) * 100) / 100,
  }
}

// Semana de segunda a domingo que contém a data de referência (padrão: hoje).
function limitesSemana(referenciaISO) {
  const ref = new Date(`${referenciaISO}T00:00:00`)
  const diaSemana = ref.getDay()
  const deltaSegunda = diaSemana === 0 ? -6 : 1 - diaSemana
  const segunda = new Date(ref)
  segunda.setDate(ref.getDate() + deltaSegunda)
  const domingo = new Date(segunda)
  domingo.setDate(segunda.getDate() + 6)
  const fmt = (d) => d.toISOString().slice(0, 10)
  return { inicio: fmt(segunda), fim: fmt(domingo) }
}

async function resumoSemana(usuario, referenciaISO) {
  const { inicio, fim } = limitesSemana(referenciaISO || new Date().toISOString().slice(0, 10))
  const registros = await db
    .prepare(
      `SELECT tipo, data_hora FROM pontos WHERE usuario_id = ? AND substr(data_hora, 1, 10) BETWEEN ? AND ? ORDER BY data_hora ASC`,
    )
    .all(usuario.id, inicio, fim)

  const porDia = {}
  for (const r of registros) {
    const dia = r.data_hora.slice(0, 10)
    if (!porDia[dia]) porDia[dia] = []
    porDia[dia].push(r)
  }
  const dias = Object.entries(porDia)
    .map(([data, regs]) => ({ data, horas_trabalhadas: Math.round((calcularHorasTrabalhadas(regs) / 60) * 100) / 100 }))
    .sort((a, b) => a.data.localeCompare(b.data))

  const horasTrabalhadas = Math.round((calcularHorasTrabalhadas(registros) / 60) * 100) / 100
  const jornada = jornadaDoUsuario(usuario)
  // Meta semanal: usa o valor direto cadastrado (carga_horaria_semanal_horas) quando existir;
  // senão usa a soma da jornada (jornada_semanal por dia, quando cadastrada — senão o
  // horário único × dias da semana, calculado em jornadaDoUsuario).
  const horasEsperadas =
    usuario.carga_horaria_semanal_horas != null && usuario.carga_horaria_semanal_horas > 0
      ? usuario.carga_horaria_semanal_horas
      : (jornada?.horas_semana ?? null)

  return {
    inicio,
    fim,
    dias,
    horas_trabalhadas: horasTrabalhadas,
    horas_esperadas: horasEsperadas,
    saldo: horasEsperadas != null ? Math.round((horasTrabalhadas - horasEsperadas) * 100) / 100 : null,
    jornada,
  }
}

router.get('/', PODE_BATER_PONTO, async (req, res) => {
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
  res.json(await db.prepare(sql).all(...params))
})

router.get('/resumo', GESTAO_RH, async (req, res) => {
  const hoje = new Date()
  const mesRef = req.query.mes ? Number(req.query.mes) : hoje.getMonth() + 1
  const anoRef = req.query.ano ? Number(req.query.ano) : hoje.getFullYear()
  const referencia = `${anoRef}-${String(mesRef).padStart(2, '0')}`

  const usuarios = await db.prepare('SELECT * FROM usuarios WHERE clinica_id = ? AND ativo = 1').all(req.usuario.clinica_id)

  const resumo = await Promise.all(usuarios.map(async (u) => {
    // Período de referência = ciclo de fechamento do próprio usuário (ex: 21 do
    // mês anterior a 20 do mês de referência), não o mês-calendário.
    const { inicio, fim } = limitesPeriodo(anoRef, mesRef, u.dia_fechamento_folha || 20)
    const registros = await db
      .prepare(
        `SELECT tipo, data_hora FROM pontos WHERE usuario_id = ? AND substr(data_hora, 1, 10) BETWEEN ? AND ? ORDER BY data_hora ASC`,
      )
      .all(u.id, inicio, fim)
    const minutos = calcularHorasTrabalhadas(registros)
    const horasTrabalhadas = minutos / 60
    const saldoHoras = horasTrabalhadas - u.carga_horaria_mensal_horas
    return {
      usuario_id: u.id,
      usuario_nome: u.nome,
      foto_url: u.foto_url,
      role: u.role,
      periodo: { inicio, fim },
      meta_horas: u.carga_horaria_mensal_horas,
      horas_trabalhadas: Math.round(horasTrabalhadas * 100) / 100,
      saldo_horas: Math.round(saldoHoras * 100) / 100,
      saldo_acumulado: await saldoAcumulado(u, anoRef, mesRef),
      total_registros: registros.length,
      jornada: jornadaDoUsuario(u),
      semana_atual: await resumoSemana(u),
    }
  }))

  res.json({ referencia, resumo })
})

router.get('/semana', PODE_BATER_PONTO, async (req, res) => {
  const alvo =
    req.query.usuario_id && ['admin', 'coordenador', 'financeiro'].includes(req.usuario.role)
      ? req.query.usuario_id
      : req.usuario.id

  const usuario = await db.prepare('SELECT * FROM usuarios WHERE id = ? AND clinica_id = ?').get(alvo, req.usuario.clinica_id)
  if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado' })

  res.json({
    usuario_id: usuario.id,
    usuario_nome: usuario.nome,
    ...(await resumoSemana(usuario, req.query.data)),
  })
})

// Folha de frequência — período de apuração do dia 21 do mês anterior ao dia 20
// do mês de referência (padrão de folha de pagamento usado pela clínica).
// Recepção só enxerga a própria folha (força o filtro pro próprio usuário,
// ignora qualquer tentativa de ver a de outra pessoa); GESTAO_RH vê todo mundo.
router.get('/folha-frequencia.pdf', requireRole('admin', 'coordenador', 'financeiro', 'recepcao'), async (req, res) => {
  const hoje = new Date()
  const mesRef = req.query.mes ? Number(req.query.mes) : hoje.getMonth() + 1
  const anoRef = req.query.ano ? Number(req.query.ano) : hoje.getFullYear()

  // Período mostrado no cabeçalho do PDF: fechamento padrão (dia 20). Cada
  // funcionário pode ter um dia de fechamento próprio (usado no cálculo das
  // horas dele abaixo); a maioria usa o padrão, então o cabeçalho fica correto
  // pra quase todo mundo mesmo quando alguém tem um dia customizado.
  const { inicio, fim } = limitesPeriodo(anoRef, mesRef, 20)

  const usuarios =
    req.usuario.role === 'recepcao'
      ? await db.prepare('SELECT * FROM usuarios WHERE id = ? AND clinica_id = ? AND ativo = 1').all(req.usuario.id, req.usuario.clinica_id)
      : await db.prepare('SELECT * FROM usuarios WHERE clinica_id = ? AND ativo = 1 ORDER BY lower(nome)').all(req.usuario.clinica_id)

  const funcionarios = await Promise.all(usuarios.map(async (u) => {
    const periodoUsuario = limitesPeriodo(anoRef, mesRef, u.dia_fechamento_folha || 20)
    const registros = await db
      .prepare(
        `SELECT tipo, data_hora FROM pontos WHERE usuario_id = ? AND substr(data_hora, 1, 10) BETWEEN ? AND ? ORDER BY data_hora ASC`,
      )
      .all(u.id, periodoUsuario.inicio, periodoUsuario.fim)

    const porDia = {}
    for (const r of registros) {
      const dia = r.data_hora.slice(0, 10)
      if (!porDia[dia]) porDia[dia] = []
      porDia[dia].push(r)
    }

    const jornada = jornadaDoUsuario(u)
    const dias = Object.entries(porDia)
      .map(([data, regs]) => {
        const porTipo = {}
        for (const r of regs) {
          if (!porTipo[r.tipo]) porTipo[r.tipo] = r.data_hora
        }
        const trabalhado = calcularHorasTrabalhadas(regs) / 60
        const saldo = jornada ? trabalhado - jornada.horas_dia : null
        return {
          data,
          entrada: porTipo.entrada || null,
          inicio_intervalo: porTipo.inicio_intervalo || null,
          fim_intervalo: porTipo.fim_intervalo || null,
          saida: porTipo.saida || null,
          trabalhado: Math.round(trabalhado * 100) / 100,
          saldo: saldo != null ? Math.round(saldo * 100) / 100 : null,
        }
      })
      .sort((a, b) => a.data.localeCompare(b.data))

    return { nome: u.nome, jornada, dias }
  }))

  const clinica = await db.prepare('SELECT * FROM clinicas WHERE id = ?').get(req.usuario.clinica_id)
  gerarFolhaFrequenciaPDF(res, { clinica, periodo: { inicio, fim }, funcionarios })
})

router.post('/', PODE_BATER_PONTO, uploadSelfiePonto.single('foto'), async (req, res) => {
  const { tipo, latitude, longitude } = req.body
  if (!TIPOS.includes(tipo) && tipo !== TIPO_SEM_INTERVALO) {
    return res.status(400).json({ error: 'Tipo de marcação inválido' })
  }
  if (!req.file) return res.status(400).json({ error: 'A foto é obrigatória para bater o ponto' })

  const lat = latitude !== undefined && latitude !== '' ? Number(latitude) : null
  const lon = longitude !== undefined && longitude !== '' ? Number(longitude) : null
  if (lat == null || lon == null || Number.isNaN(lat) || Number.isNaN(lon)) {
    return res.status(400).json({ error: 'Não foi possível obter sua localização. Ative o GPS e permita o acesso à localização para bater o ponto.' })
  }

  const usuario = await db.prepare('SELECT * FROM usuarios WHERE id = ?').get(req.usuario.id)
  const ref = await localReferencia(usuario)

  let distancia = null
  let dentroRaio = true
  if (ref) {
    distancia = distanciaMetros(ref.latitude, ref.longitude, lat, lon)
    dentroRaio = distancia <= ref.raio
    if (!dentroRaio) {
      return res.status(403).json({
        error: `Você está fora da área permitida (${Math.round(distancia)}m de ${ref.nome}, raio de ${ref.raio}m). O ponto não foi registrado.`,
      })
    }
  }

  const fotoUrl = `/uploads/pontos/${req.file.filename}`

  async function inserirPonto(tipoReal) {
    const id = nanoid()
    await db.prepare(
      `INSERT INTO pontos (id, clinica_id, usuario_id, tipo, data_hora, latitude, longitude, distancia_metros, dentro_raio, foto_url)
       VALUES (?, ?, ?, ?, now(), ?, ?, ?, ?, ?)`,
    ).run(id, req.usuario.clinica_id, req.usuario.id, tipoReal, lat, lon, distancia, dentroRaio ? 1 : 0, fotoUrl)
    return id
  }

  const idsGerados = []
  if (tipo === TIPO_SEM_INTERVALO) {
    idsGerados.push(await inserirPonto('inicio_intervalo'))
    idsGerados.push(await inserirPonto('fim_intervalo'))
  } else {
    idsGerados.push(await inserirPonto(tipo))
  }

  const registro = await db.prepare('SELECT * FROM pontos WHERE id = ?').get(idsGerados[idsGerados.length - 1])
  res.status(201).json({
    ...registro,
    tipo: tipo === TIPO_SEM_INTERVALO ? TIPO_SEM_INTERVALO : registro.tipo,
    distancia_metros: distancia != null ? Math.round(distancia) : null,
    local_referencia: ref?.nome ?? null,
  })
})

// Lançamento manual pelo RH/admin — sem foto nem geolocalização, pra corrigir
// esquecimentos ou lançar histórico de quem não usa o app.
router.post('/manual', GESTAO_RH, async (req, res) => {
  const { usuario_id, tipo, data, hora } = req.body
  if (!usuario_id || !tipo || !data || !hora) {
    return res.status(400).json({ error: 'usuario_id, tipo, data e hora são obrigatórios' })
  }
  if (!TIPOS.includes(tipo)) return res.status(400).json({ error: 'Tipo de marcação inválido' })

  const usuario = await db.prepare('SELECT id FROM usuarios WHERE id = ? AND clinica_id = ?').get(usuario_id, req.usuario.clinica_id)
  if (!usuario) return res.status(400).json({ error: 'Usuário inválido' })

  const id = nanoid()
  await db.prepare(
    `INSERT INTO pontos (id, clinica_id, usuario_id, tipo, data_hora, dentro_raio, lancado_manualmente, criado_por)
     VALUES (?, ?, ?, ?, ?, 1, 1, ?)`,
  ).run(id, req.usuario.clinica_id, usuario_id, tipo, `${data} ${hora}:00`, req.usuario.id)

  res.status(201).json(await db.prepare('SELECT * FROM pontos WHERE id = ?').get(id))
})

export default router
