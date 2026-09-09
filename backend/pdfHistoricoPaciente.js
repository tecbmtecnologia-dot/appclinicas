import PDFDocument from 'pdfkit'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { desenharMarcaDagua, desenharRodapeContato, enderecoCompleto, formatarData } from './pdfDocumentoBase.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const EXTENSOES_SUPORTADAS_PDFKIT = new Set(['.png', '.jpg', '.jpeg'])

const ROTULOS_ESTADO_CIVIL = {
  solteiro: 'Solteiro(a)',
  casado: 'Casado(a)',
  divorciado: 'Divorciado(a)',
  viuvo: 'Viúvo(a)',
  uniao_estavel: 'União estável',
  outro: 'Outro',
}
const ROTULOS_COR_RACA = {
  branca: 'Branca',
  preta: 'Preta',
  parda: 'Parda',
  amarela: 'Amarela',
  indigena: 'Indígena',
  nao_informado: 'Não informado',
}
const ROTULOS_TIPO_FOTO = { pre_operatorio: 'Pré-operatório', pos_operatorio: 'Pós-operatório' }

function pesoAltura(p) {
  if (!p.peso_kg && !p.altura_cm) return null
  return `${p.peso_kg ? `${p.peso_kg}kg` : '—'} / ${p.altura_cm ? `${p.altura_cm}cm` : '—'}`
}

export function gerarHistoricoPacientePDF(res, { paciente, registros, fotos, clinica }) {
  const doc = new PDFDocument({ margin: 50 })
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `inline; filename="historico-${paciente.id}.pdf"`)
  doc.pipe(res)

  doc.on('pageAdded', () => desenharMarcaDagua(doc, clinica))
  desenharMarcaDagua(doc, clinica)

  doc.fontSize(16).font('Helvetica-Bold').text(clinica?.nome ?? 'Clínica', { align: 'left' })
  if (clinica?.cnpj) doc.fontSize(9).font('Helvetica').fillColor('#555').text(`CNPJ: ${clinica.cnpj}`)
  doc.fillColor('#000')
  doc.moveDown(1)
  doc.fontSize(14).font('Helvetica-Bold').text('Histórico Completo do Paciente', { align: 'center' })
  doc.moveDown(1.2)

  function linha(rotulo, valor) {
    if (!valor) return
    doc.font('Helvetica-Bold').fontSize(10).text(rotulo, { continued: true })
    doc.font('Helvetica').text(`  ${valor}`)
  }

  doc.fontSize(11).font('Helvetica-Bold').text('Dados cadastrais')
  doc.moveDown(0.3)
  linha('Nome:', paciente.nome)
  linha('CPF:', paciente.cpf)
  linha('RG:', paciente.rg)
  linha('Data de nascimento:', formatarData(paciente.data_nascimento))
  linha('Telefone:', paciente.telefone)
  linha('E-mail:', paciente.email)
  linha('Endereço:', enderecoCompleto(paciente))
  linha('Estado civil:', paciente.estado_civil ? ROTULOS_ESTADO_CIVIL[paciente.estado_civil] : null)
  linha('Profissão:', paciente.profissao)
  linha('Cor/raça:', paciente.cor_raca ? ROTULOS_COR_RACA[paciente.cor_raca] : null)
  linha('Peso/Altura:', pesoAltura(paciente))
  linha('Nome do responsável:', paciente.nome_responsavel)
  linha('Indicado por:', paciente.indicado_por)
  linha('Convênio:', paciente.convenio)
  linha('Plano:', paciente.plano)
  linha('Validade da carteirinha:', formatarData(paciente.validade_carteira))
  linha('Cartão CNS:', paciente.cartao_cns)
  linha('Primeira consulta:', formatarData(paciente.data_primeira_consulta))
  doc.moveDown(1)

  doc.fontSize(11).font('Helvetica-Bold').text(`Prontuário (${registros.length} registro${registros.length === 1 ? '' : 's'})`)
  doc.moveDown(0.3)
  if (registros.length === 0) {
    doc.font('Helvetica').fontSize(10).text('Nenhum registro de prontuário.')
  } else {
    for (const r of registros) {
      doc.font('Helvetica-Bold').fontSize(10).text(`${formatarData(r.data)} — Dr(a). ${r.medico_nome ?? '—'}`)
      doc.font('Helvetica').fontSize(10)
      if (r.queixa) doc.text(`Queixa: ${r.queixa}`)
      if (r.diagnostico) doc.text(`Diagnóstico: ${r.diagnostico}`)
      if (r.prescricao) doc.text(`Prescrição: ${r.prescricao}`)
      if (r.evolucao) doc.text(`Evolução: ${r.evolucao}`)
      if (r.observacoes) doc.text(`Observações: ${r.observacoes}`)
      doc.moveDown(0.8)
    }
  }
  doc.moveDown(0.5)

  doc.fontSize(11).font('Helvetica-Bold').text(`Fotos (${fotos.length})`)
  doc.moveDown(0.3)
  if (fotos.length === 0) {
    doc.font('Helvetica').fontSize(10).text('Nenhuma foto registrada.')
  } else {
    for (const f of fotos) {
      const espacoRestante = doc.page.height - doc.page.margins.bottom - doc.y
      if (espacoRestante < 170) doc.addPage()

      doc.font('Helvetica-Bold').fontSize(10).text(`${ROTULOS_TIPO_FOTO[f.tipo] ?? f.tipo} — ${formatarData(f.data)}`)
      if (f.observacoes) {
        doc.font('Helvetica').fontSize(9).fillColor('#555').text(f.observacoes)
        doc.fillColor('#000')
      }
      doc.moveDown(0.2)

      const ext = path.extname(f.foto_url).toLowerCase()
      const caminho = path.join(__dirname, f.foto_url.replace(/^\//, ''))
      if (EXTENSOES_SUPORTADAS_PDFKIT.has(ext) && fs.existsSync(caminho)) {
        try {
          doc.image(caminho, { fit: [200, 150] })
        } catch {
          doc.font('Helvetica').fontSize(9).fillColor('#a00').text('(não foi possível carregar esta imagem)')
          doc.fillColor('#000')
        }
      } else {
        doc.font('Helvetica').fontSize(9).fillColor('#a00').text('(formato de imagem não suportado neste PDF)')
        doc.fillColor('#000')
      }
      doc.moveDown(1)
    }
  }

  desenharRodapeContato(doc, clinica)
  doc.end()
}
