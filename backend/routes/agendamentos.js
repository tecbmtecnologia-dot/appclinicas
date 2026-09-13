import { Router } from 'express'
import { nanoid } from 'nanoid'
import { db } from '../db.js'
import { requireRole } from '../auth.js'

const router = Router()
const ESCRITA = requireRole('admin', 'coordenador', 'recepcao', 'medico')

const SELECT_JOIN = `
  SELECT a.*, p.nome AS paciente_nome, m.nome AS medico_nome, tp.nome AS tipo_procedimento_nome
  FROM agendamentos a
  LEFT JOIN pacientes p ON p.id = a.paciente_id
  LEFT JOIN medicos m ON m.id = a.medico_id
  LEFT JOIN tipos_procedimento tp ON tp.id = a.tipo_procedimento_id
`

async function validarReferencias(clinicaId, paciente_id, medico_id) {
  const paciente = await db.prepare('SELECT id FROM pacientes WHERE id = ? AND clinica_id = ?').get(paciente_id, clinicaId)
  const medico = await db.prepare('SELECT id FROM medicos WHERE id = ? AND clinica_id = ?').get(medico_id, clinicaId)
  return Boolean(paciente) && Boolean(medico)
}

// Quando o tipo de procedimento escolhido está marcado como "gera cirurgia" (configurado
// pelo admin em Configurações → Tipos de procedimento), cria automaticamente um rascunho
// em Cirurgias vinculado a este agendamento — assim consultora/instrumentador e
// fisioterapeuta já encontram o registro pronto pra preencher, sem depender de alguém
// cadastrar a cirurgia manualmente depois. Idempotente: não duplica se já existe.
// Recebe `dbLike` (o `db` normal ou um `tx` de transação) pra poder rodar dentro
// da mesma transação do INSERT/UPDATE do agendamento (ver POST/PUT abaixo).
async function criarCirurgiaAutomatica(dbLike, clinicaId, agendamento, usuarioId) {
  if (!agendamento.tipo_procedimento_id) return
  const tipo = await dbLike
    .prepare('SELECT * FROM tipos_procedimento WHERE id = ? AND clinica_id = ?')
    .get(agendamento.tipo_procedimento_id, clinicaId)
  if (!tipo || !tipo.gera_cirurgia) return
  const jaExiste = await dbLike.prepare('SELECT id FROM cirurgias WHERE agendamento_id = ?').get(agendamento.id)
  if (jaExiste) return
  await dbLike.prepare(
    `INSERT INTO cirurgias (id, clinica_id, paciente_id, medico_id, agendamento_id, nome_cirurgia, data_prevista, criado_por)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    nanoid(),
    clinicaId,
    agendamento.paciente_id,
    agendamento.medico_id,
    agendamento.id,
    tipo.nome,
    agendamento.data_hora.slice(0, 10),
    usuarioId,
  )
}

// Impede marcar dois compromissos/consultas no mesmo horário pro mesmo médico
// (cancelados não contam, já liberaram o horário).
async function horarioOcupado(clinicaId, medico_id, data_hora, ignorarAgendamentoId) {
  const consulta = await db
    .prepare(
      `SELECT id FROM agendamentos WHERE clinica_id = ? AND medico_id = ? AND data_hora = ? AND status != 'cancelado' AND id != ?`,
    )
    .get(clinicaId, medico_id, data_hora, ignorarAgendamentoId ?? '')
  if (consulta) return true
  const compromisso = await db
    .prepare('SELECT id FROM compromissos WHERE clinica_id = ? AND medico_id = ? AND data_hora = ?')
    .get(clinicaId, medico_id, data_hora)
  return Boolean(compromisso)
}

// Um médico sem nenhuma linha em medico_disponibilidade é tratado como "sem restrição
// configurada" (agenda livre, comportamento de antes) — só passa a bloquear fora do horário
// depois que alguém cadastra a disponibilidade dele em Médicos. Não vale pra `compromissos`:
// esses servem justamente pra bloquear a agenda fora do expediente normal (plantão, cirurgia
// externa), então não fazem sentido restritos à mesma janela de atendimento a pacientes.
async function dentroDaDisponibilidade(medico_id, data_hora) {
  const { n: totalConfigurado } = await db.prepare('SELECT COUNT(*) AS n FROM medico_disponibilidade WHERE medico_id = ?').get(medico_id)
  if (totalConfigurado === 0) return true
  const data = data_hora.slice(0, 10)
  const hora = data_hora.slice(11, 16)
  const diaSemana = new Date(`${data}T00:00:00`).getDay()
  const janelas = await db
    .prepare('SELECT hora_inicio, hora_fim FROM medico_disponibilidade WHERE medico_id = ? AND dia_semana = ?')
    .all(medico_id, diaSemana)
  return janelas.some((j) => hora >= j.hora_inicio && hora < j.hora_fim)
}

// Gera os horários de slot (ex.: 08:00, 08:30, ...) dentro das janelas de disponibilidade do
// médico pro dia da semana de `data`, descontando os já ocupados por consulta ou compromisso.
// Retorna `null` quando o médico não tem nenhuma disponibilidade configurada (agenda livre).
async function slotsDoDia(clinicaId, medico_id, data, ignorarAgendamentoId) {
  const medico = await db.prepare('SELECT intervalo_slot_minutos FROM medicos WHERE id = ? AND clinica_id = ?').get(medico_id, clinicaId)
  if (!medico) return []
  const { n: totalConfigurado } = await db.prepare('SELECT COUNT(*) AS n FROM medico_disponibilidade WHERE medico_id = ?').get(medico_id)
  if (totalConfigurado === 0) return null

  const diaSemana = new Date(`${data}T00:00:00`).getDay()
  const janelas = await db
    .prepare('SELECT hora_inicio, hora_fim FROM medico_disponibilidade WHERE medico_id = ? AND dia_semana = ?')
    .all(medico_id, diaSemana)
  if (janelas.length === 0) return []

  const agendamentosDoDia = await db
    .prepare(
      `SELECT substr(data_hora, 12, 5) AS hora FROM agendamentos WHERE clinica_id = ? AND medico_id = ? AND substr(data_hora, 1, 10) = ? AND status != 'cancelado' AND id != ?`,
    )
    .all(clinicaId, medico_id, data, ignorarAgendamentoId ?? '')
  const compromissosDoDia = await db
    .prepare(`SELECT substr(data_hora, 12, 5) AS hora FROM compromissos WHERE clinica_id = ? AND medico_id = ? AND substr(data_hora, 1, 10) = ?`)
    .all(clinicaId, medico_id, data)

  const ocupados = new Set([
    ...agendamentosDoDia.map((r) => r.hora),
    ...compromissosDoDia.map((r) => r.hora),
  ])

  const passo = medico.intervalo_slot_minutos
  const slots = []
  for (const j of janelas) {
    const [hi, mi] = j.hora_inicio.split(':').map(Number)
    const [hf, mf] = j.hora_fim.split(':').map(Number)
    for (let atual = hi * 60 + mi; atual + passo <= hf * 60 + mf; atual += passo) {
      const horaStr = `${String(Math.floor(atual / 60)).padStart(2, '0')}:${String(atual % 60).padStart(2, '0')}`
      if (!ocupados.has(horaStr)) slots.push(horaStr)
    }
  }
  return slots.sort()
}

router.get('/', async (req, res) => {
  const { data, mes, medico_id, paciente_id } = req.query
  let sql = SELECT_JOIN + ' WHERE a.clinica_id = ?'
  const params = [req.usuario.clinica_id]
  if (data) {
    sql += ' AND substr(a.data_hora, 1, 10) = ?'
    params.push(data)
  }
  if (mes) {
    sql += ' AND substr(a.data_hora, 1, 7) = ?'
    params.push(mes)
  }
  if (medico_id) {
    sql += ' AND a.medico_id = ?'
    params.push(medico_id)
  }
  if (paciente_id) {
    sql += ' AND a.paciente_id = ?'
    params.push(paciente_id)
  }
  sql += ' ORDER BY a.data_hora ASC'
  const rows = await db.prepare(sql).all(...params)
  res.json(rows)
})

// Horários disponíveis pra marcar com um médico num dia específico — usado pelo seletor de
// horário no formulário de agendamento. `configurado: false` significa que esse médico ainda
// não tem disponibilidade cadastrada (o front cai de volta pro campo livre de data/hora).
router.get('/disponibilidade', async (req, res) => {
  const { medico_id, data, ignorar_agendamento_id } = req.query
  if (!medico_id || !data) return res.status(400).json({ error: 'medico_id e data são obrigatórios' })
  const slots = await slotsDoDia(req.usuario.clinica_id, medico_id, data, ignorar_agendamento_id)
  if (slots === null) return res.json({ configurado: false, slots: [] })
  res.json({ configurado: true, slots })
})

// Quais dias de um mês têm pelo menos um horário livre com o médico — usado pra sinalizar no
// calendário quais dias dá pra agendar. `configurado: false` = médico sem restrição, calendário
// não precisa desabilitar nenhum dia.
router.get('/dias-disponiveis', async (req, res) => {
  const { medico_id, mes } = req.query
  if (!medico_id || !mes) return res.status(400).json({ error: 'medico_id e mes são obrigatórios' })
  const [ano, m] = mes.split('-').map(Number)
  const totalDias = new Date(ano, m, 0).getDate()
  const dias = []
  let configurado = false
  for (let d = 1; d <= totalDias; d++) {
    const data = `${mes}-${String(d).padStart(2, '0')}`
    const slots = await slotsDoDia(req.usuario.clinica_id, medico_id, data)
    if (slots === null) return res.json({ configurado: false, dias: [] })
    configurado = true
    if (slots.length > 0) dias.push(data)
  }
  res.json({ configurado, dias })
})

router.get('/:id', async (req, res) => {
  const row = await db.prepare(SELECT_JOIN + ' WHERE a.id = ? AND a.clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!row) return res.status(404).json({ error: 'Agendamento não encontrado' })
  res.json(row)
})

router.post('/', ESCRITA, async (req, res) => {
  const { paciente_id, medico_id, data_hora, status, tipo, tipo_procedimento_id, observacoes } = req.body
  if (!paciente_id || !medico_id || !data_hora) {
    return res.status(400).json({ error: 'paciente_id, medico_id e data_hora são obrigatórios' })
  }
  if (!(await validarReferencias(req.usuario.clinica_id, paciente_id, medico_id))) {
    return res.status(400).json({ error: 'Paciente ou médico inválido' })
  }
  if (!(await dentroDaDisponibilidade(medico_id, data_hora))) {
    return res.status(409).json({ error: 'Esse médico não atende nesse dia ou horário.' })
  }
  if (await horarioOcupado(req.usuario.clinica_id, medico_id, data_hora)) {
    return res.status(409).json({ error: 'Esse médico já tem uma consulta ou compromisso marcado nesse horário.' })
  }
  const id = nanoid()
  await db.transaction(async (tx) => {
    await tx.prepare(
      `INSERT INTO agendamentos (id, clinica_id, paciente_id, medico_id, data_hora, status, tipo, tipo_procedimento_id, observacoes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      req.usuario.clinica_id,
      paciente_id,
      medico_id,
      data_hora,
      status ?? 'agendado',
      tipo ?? 'presencial',
      tipo_procedimento_id ?? null,
      observacoes ?? null,
    )
    await criarCirurgiaAutomatica(
      tx,
      req.usuario.clinica_id,
      { id, paciente_id, medico_id, data_hora, tipo_procedimento_id: tipo_procedimento_id ?? null },
      req.usuario.id,
    )
  })()
  res.status(201).json(await db.prepare(SELECT_JOIN + ' WHERE a.id = ?').get(id))
})

router.put('/:id', ESCRITA, async (req, res) => {
  const existente = await db.prepare('SELECT * FROM agendamentos WHERE id = ? AND clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!existente) return res.status(404).json({ error: 'Agendamento não encontrado' })
  const merged = { ...existente, ...req.body }
  if (!(await validarReferencias(req.usuario.clinica_id, merged.paciente_id, merged.medico_id))) {
    return res.status(400).json({ error: 'Paciente ou médico inválido' })
  }
  const mudouHorarioOuMedico = merged.data_hora !== existente.data_hora || merged.medico_id !== existente.medico_id
  if (mudouHorarioOuMedico && merged.status !== 'cancelado' && !(await dentroDaDisponibilidade(merged.medico_id, merged.data_hora))) {
    return res.status(409).json({ error: 'Esse médico não atende nesse dia ou horário.' })
  }
  if (
    mudouHorarioOuMedico &&
    merged.status !== 'cancelado' &&
    (await horarioOcupado(req.usuario.clinica_id, merged.medico_id, merged.data_hora, req.params.id))
  ) {
    return res.status(409).json({ error: 'Esse médico já tem uma consulta ou compromisso marcado nesse horário.' })
  }
  await db.transaction(async (tx) => {
    await tx.prepare(
      `UPDATE agendamentos SET paciente_id=?, medico_id=?, data_hora=?, status=?, tipo=?, tipo_procedimento_id=?, observacoes=? WHERE id=?`,
    ).run(
      merged.paciente_id,
      merged.medico_id,
      merged.data_hora,
      merged.status,
      merged.tipo,
      merged.tipo_procedimento_id ?? null,
      merged.observacoes,
      req.params.id,
    )
    await criarCirurgiaAutomatica(
      tx,
      req.usuario.clinica_id,
      {
        id: req.params.id,
        paciente_id: merged.paciente_id,
        medico_id: merged.medico_id,
        data_hora: merged.data_hora,
        tipo_procedimento_id: merged.tipo_procedimento_id ?? null,
      },
      req.usuario.id,
    )
  })()
  res.json(await db.prepare(SELECT_JOIN + ' WHERE a.id = ?').get(req.params.id))
})

router.delete('/:id', requireRole('admin', 'coordenador', 'recepcao'), async (req, res) => {
  await db.prepare('DELETE FROM agendamentos WHERE id = ? AND clinica_id = ?').run(req.params.id, req.usuario.clinica_id)
  res.status(204).end()
})

export default router
