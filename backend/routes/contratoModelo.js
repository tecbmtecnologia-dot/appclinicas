import { Router } from 'express'
import { nanoid } from 'nanoid'
import { db } from '../db.js'
import { requireRole } from '../auth.js'
import { gerarContratoPDF } from '../pdfContrato.js'
import { formatarData } from '../pdfDocumentoBase.js'

const router = Router()
// Editar o texto do modelo é tratado como configuração da clínica (mesmo nível de "Minha
// Clínica"/"Modelos de receita" — admin only). Gerar o PDF pra um paciente é uma ação do
// dia a dia, aberta às mesmas roles que já anexam contrato hoje (contratos-paciente.js).
const EDICAO = requireRole('admin')
const GERACAO = requireRole('admin', 'coordenador', 'recepcao')

router.get('/', EDICAO, (req, res) => {
  const modelo = db.prepare('SELECT * FROM contrato_modelo WHERE clinica_id = ?').get(req.usuario.clinica_id)
  res.json({ texto: modelo?.texto || '', updated_at: modelo?.updated_at || null })
})

router.put('/', EDICAO, (req, res) => {
  const { texto } = req.body
  if (typeof texto !== 'string') return res.status(400).json({ error: 'texto é obrigatório' })

  const existente = db.prepare('SELECT id FROM contrato_modelo WHERE clinica_id = ?').get(req.usuario.clinica_id)
  if (existente) {
    db.prepare('UPDATE contrato_modelo SET texto = ?, atualizado_por = ?, updated_at = datetime(\'now\') WHERE id = ?').run(
      texto,
      req.usuario.id,
      existente.id,
    )
  } else {
    db.prepare('INSERT INTO contrato_modelo (id, clinica_id, texto, atualizado_por) VALUES (?, ?, ?, ?)').run(
      nanoid(),
      req.usuario.clinica_id,
      texto,
      req.usuario.id,
    )
  }
  const modelo = db.prepare('SELECT * FROM contrato_modelo WHERE clinica_id = ?').get(req.usuario.clinica_id)
  res.json({ texto: modelo.texto, updated_at: modelo.updated_at })
})

function preencherModelo(texto, { paciente, clinica }) {
  const valores = {
    paciente_nome: paciente.nome,
    paciente_cpf: paciente.cpf,
    paciente_rg: paciente.rg,
    paciente_data_nascimento: paciente.data_nascimento ? formatarData(paciente.data_nascimento) : null,
    paciente_telefone: paciente.telefone,
    paciente_email: paciente.email,
    paciente_endereco: paciente.endereco,
    clinica_nome: clinica?.nome,
    clinica_cnpj: clinica?.cnpj,
    clinica_endereco: clinica?.endereco,
    data_atual: formatarData(new Date().toISOString()),
  }
  return texto.replace(/{{\s*(\w+)\s*}}/g, (match, chave) => {
    const valor = valores[chave]
    return valor === undefined ? match : valor || '—'
  })
}

router.post('/gerar/:pacienteId', GERACAO, (req, res) => {
  const modelo = db.prepare('SELECT * FROM contrato_modelo WHERE clinica_id = ?').get(req.usuario.clinica_id)
  if (!modelo?.texto?.trim()) return res.status(404).json({ error: 'Nenhum modelo de contrato cadastrado ainda' })

  const paciente = db.prepare('SELECT * FROM pacientes WHERE id = ? AND clinica_id = ?').get(req.params.pacienteId, req.usuario.clinica_id)
  if (!paciente) return res.status(404).json({ error: 'Paciente não encontrado' })

  const clinica = db.prepare('SELECT * FROM clinicas WHERE id = ?').get(req.usuario.clinica_id)
  const texto = preencherModelo(modelo.texto, { paciente, clinica })

  gerarContratoPDF(res, { texto, paciente, clinica })
})

export default router
