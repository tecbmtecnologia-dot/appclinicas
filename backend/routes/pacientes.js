import { Router } from 'express'
import { nanoid } from 'nanoid'
import { db } from '../db.js'
import { requireRole } from '../auth.js'
import { uploadFotoPaciente } from '../upload.js'
import { gerarEtiquetaPacientePDF } from '../pdfEtiquetaPaciente.js'
import { gerarPulseiraPapelPDF, gerarPulseiraTermicaPDF } from '../pdfPulseiraPaciente.js'

const router = Router()
const ESCRITA = requireRole('admin', 'coordenador', 'recepcao')
const EXCLUSAO = requireRole('admin', 'coordenador', 'recepcao')

const CAMPOS_BASE = ['nome', 'cpf', 'rg', 'data_nascimento', 'telefone', 'email', 'convenio', 'endereco']
const CAMPOS_EXTRA = [
  'sexo',
  'cep',
  'logradouro',
  'numero',
  'complemento',
  'bairro',
  'cidade',
  'estado',
  'estado_civil',
  'data_primeira_consulta',
  'nome_responsavel',
  'nome_mae',
  'profissao',
  'cor_raca',
  'peso_kg',
  'altura_cm',
  'indicado_por',
  'plano',
  'validade_carteira',
  'cartao_cns',
]
const CAMPOS_TODOS = [...CAMPOS_BASE, ...CAMPOS_EXTRA]
const CAMPOS_NUMERICOS = new Set(['peso_kg', 'altura_cm'])

function valorCampo(campo, valor) {
  if (valor === undefined || valor === null || valor === '') return null
  return CAMPOS_NUMERICOS.has(campo) ? Number(valor) : valor
}

router.get('/', async (req, res) => {
  const rows = await db.prepare('SELECT * FROM pacientes WHERE clinica_id = ? ORDER BY lower(nome)').all(req.usuario.clinica_id)
  res.json(rows)
})

router.get('/:id', async (req, res) => {
  const row = await db.prepare('SELECT * FROM pacientes WHERE id = ? AND clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!row) return res.status(404).json({ error: 'Paciente não encontrado' })
  res.json(row)
})

router.get('/:id/etiqueta.pdf', async (req, res) => {
  const paciente = await db.prepare('SELECT * FROM pacientes WHERE id = ? AND clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!paciente) return res.status(404).json({ error: 'Paciente não encontrado' })
  gerarEtiquetaPacientePDF(res, { paciente })
})

router.get('/:id/pulseira-papel.pdf', async (req, res) => {
  const paciente = await db.prepare('SELECT * FROM pacientes WHERE id = ? AND clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!paciente) return res.status(404).json({ error: 'Paciente não encontrado' })
  const clinica = await db.prepare('SELECT * FROM clinicas WHERE id = ?').get(req.usuario.clinica_id)
  gerarPulseiraPapelPDF(res, { paciente, clinica })
})

router.get('/:id/pulseira-termica.pdf', async (req, res) => {
  const paciente = await db.prepare('SELECT * FROM pacientes WHERE id = ? AND clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!paciente) return res.status(404).json({ error: 'Paciente não encontrado' })
  gerarPulseiraTermicaPDF(res, { paciente })
})

router.post('/', ESCRITA, async (req, res) => {
  const { nome } = req.body
  if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' })
  const id = nanoid()
  const valores = CAMPOS_TODOS.map((campo) => valorCampo(campo, req.body[campo]))
  await db.prepare(
    `INSERT INTO pacientes (id, clinica_id, ${CAMPOS_TODOS.join(', ')}) VALUES (?, ?, ${CAMPOS_TODOS.map(() => '?').join(', ')})`,
  ).run(id, req.usuario.clinica_id, ...valores)
  res.status(201).json(await db.prepare('SELECT * FROM pacientes WHERE id = ?').get(id))
})

router.put('/:id', ESCRITA, async (req, res) => {
  const existente = await db.prepare('SELECT * FROM pacientes WHERE id = ? AND clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!existente) return res.status(404).json({ error: 'Paciente não encontrado' })
  const valores = CAMPOS_TODOS.map((campo) => (req.body[campo] !== undefined ? valorCampo(campo, req.body[campo]) : existente[campo]))
  await db.prepare(`UPDATE pacientes SET ${CAMPOS_TODOS.map((c) => `${c}=?`).join(', ')} WHERE id=?`).run(...valores, req.params.id)
  res.json(await db.prepare('SELECT * FROM pacientes WHERE id = ?').get(req.params.id))
})

router.post('/:id/foto', ESCRITA, uploadFotoPaciente.single('foto'), async (req, res) => {
  const existente = await db.prepare('SELECT id FROM pacientes WHERE id = ? AND clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!existente) return res.status(404).json({ error: 'Paciente não encontrado' })
  if (!req.file) return res.status(400).json({ error: 'Envie um arquivo de imagem' })
  const fotoUrl = `/uploads/pacientes/${req.file.filename}`
  await db.prepare('UPDATE pacientes SET foto_url = ? WHERE id = ?').run(fotoUrl, req.params.id)
  res.json(await db.prepare('SELECT * FROM pacientes WHERE id = ?').get(req.params.id))
})

// Tabelas com paciente_id NOT NULL REFERENCES pacientes(id) — a FK é aplicada
// de verdade pelo Postgres, então excluir um paciente com qualquer um desses
// registros falha com erro de banco cru. Checamos antes pra devolver uma
// mensagem que a recepção entenda, em vez de deixar estourar "erro interno do servidor".
const TABELAS_VINCULADAS = [
  { tabela: 'agendamentos', rotulo: 'agendamentos' },
  { tabela: 'prontuarios', rotulo: 'registros de prontuário' },
  { tabela: 'cirurgias', rotulo: 'cirurgias' },
  { tabela: 'orcamentos', rotulo: 'orçamentos' },
  { tabela: 'pagamentos', rotulo: 'pagamentos' },
  { tabela: 'fotos_paciente', rotulo: 'fotos' },
  { tabela: 'notas_fiscais_paciente', rotulo: 'notas fiscais' },
  { tabela: 'contratos_paciente', rotulo: 'contratos' },
]

async function vinculosDoPaciente(pacienteId) {
  const rotulos = []
  for (const { tabela, rotulo } of TABELAS_VINCULADAS) {
    const existe = await db.prepare(`SELECT 1 FROM ${tabela} WHERE paciente_id = ? LIMIT 1`).get(pacienteId)
    if (existe) rotulos.push(rotulo)
  }
  return rotulos
}

router.delete('/:id', EXCLUSAO, async (req, res) => {
  const existente = await db.prepare('SELECT id FROM pacientes WHERE id = ? AND clinica_id = ?').get(req.params.id, req.usuario.clinica_id)
  if (!existente) return res.status(404).json({ error: 'Paciente não encontrado' })

  const vinculos = await vinculosDoPaciente(req.params.id)
  if (vinculos.length > 0) {
    return res.status(400).json({
      error: `Não é possível excluir: este paciente tem ${vinculos.join(', ')} registrados. Remova esses registros primeiro, ou mantenha o cadastro dele sem excluir.`,
    })
  }

  await db.prepare('DELETE FROM pacientes WHERE id = ? AND clinica_id = ?').run(req.params.id, req.usuario.clinica_id)
  res.status(204).end()
})

export default router
