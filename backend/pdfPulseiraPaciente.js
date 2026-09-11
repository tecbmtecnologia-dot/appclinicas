import PDFDocument from 'pdfkit'
import { formatarData, registrarFontes } from './pdfDocumentoBase.js'

const MM_PARA_PT = 2.8346456693
const mm = (v) => v * MM_PARA_PT

function textoPulseira(paciente) {
  const nascimento = paciente.data_nascimento ? formatarData(paciente.data_nascimento) : '—'
  return {
    nome: paciente.nome,
    linha2: `Nasc: ${nascimento} · Mãe: ${paciente.nome_mae || '—'}`,
  }
}

// Pulseira de papel: tira comprida numa folha A4 paisagem, pra imprimir em impressora
// comum, recortar pela linha tracejada e fechar ao redor do pulso com fita — decisão
// explícita do usuário (junto com a versão térmica abaixo, pediu as duas). A info se
// repete 3x ao longo da tira porque, enrolada no pulso, só uma parte fica visível
// por vez dependendo do ângulo.
export function gerarPulseiraPapelPDF(res, { paciente, clinica }) {
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 40 })
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `inline; filename="pulseira-${paciente.id}.pdf"`)
  doc.pipe(res)
  registrarFontes(doc)

  const { nome, linha2 } = textoPulseira(paciente)

  doc.font('Jakarta-Bold').fontSize(13).fillColor('#000').text('Pulseira de identificação', 40, 40)
  doc.font('Jakarta').fontSize(9).fillColor('#666')
  doc.text(
    `${clinica?.nome ?? ''} — recorte pela linha tracejada e feche as pontas ao redor do pulso com fita adesiva.`,
    40,
    doc.y + 2,
  )
  doc.fillColor('#000')

  const stripX = 40
  const stripY = 110
  const stripLarguraMm = 260
  const stripAlturaMm = 22
  const stripLargura = mm(stripLarguraMm)
  const stripAltura = mm(stripAlturaMm)
  const repeticoes = 3
  const colLargura = stripLargura / repeticoes

  doc.save()
  doc.dash(3, { space: 2 })
  doc.rect(stripX, stripY, stripLargura, stripAltura).strokeColor('#999').stroke()
  doc.restore()

  for (let i = 0; i < repeticoes; i++) {
    const colX = stripX + i * colLargura
    if (i > 0) {
      doc.save()
      doc.dash(2, { space: 2 })
      doc.moveTo(colX, stripY).lineTo(colX, stripY + stripAltura).strokeColor('#ccc').stroke()
      doc.restore()
    }
    const padX = colX + 8
    const largura = colLargura - 16
    doc.font('Jakarta-Bold').fontSize(9).fillColor('#000').text(nome, padX, stripY + 5, { width: largura, height: 12, ellipsis: true })
    doc.font('Jakarta').fontSize(7).fillColor('#333').text(linha2, padX, stripY + 16, { width: largura, height: 10, ellipsis: true })
  }
  doc.fillColor('#000')

  doc.font('Jakarta').fontSize(8).fillColor('#999').text('Circunferência do pulso adulto médio: ~16 a 20 cm.', stripX, stripY + stripAltura + 10)
  doc.fillColor('#000')

  doc.end()
}

// Pulseira térmica: tira estreita e comprida (25x200mm), pensada pra impressora de
// pulseira hospitalar dedicada (não impressora comum) — mesma info repetida 2x.
export function gerarPulseiraTermicaPDF(res, { paciente }) {
  const largura = mm(200)
  const altura = mm(25)
  const doc = new PDFDocument({ size: [largura, altura], margin: 6 })
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `inline; filename="pulseira-termica-${paciente.id}.pdf"`)
  doc.pipe(res)
  registrarFontes(doc)

  const { nome, linha2 } = textoPulseira(paciente)
  const repeticoes = 2
  const colLargura = (largura - 12) / repeticoes

  for (let i = 0; i < repeticoes; i++) {
    const padX = 6 + i * colLargura
    const larguraTexto = colLargura - 10
    doc.font('Jakarta-Bold').fontSize(9).fillColor('#000').text(nome, padX, 6, { width: larguraTexto, height: 12, ellipsis: true })
    doc.font('Jakarta').fontSize(7).fillColor('#222').text(linha2, padX, 18, { width: larguraTexto, height: 10, ellipsis: true })
    if (i > 0) {
      doc.save()
      doc.dash(2, { space: 2 })
      doc.moveTo(padX - 5, 4).lineTo(padX - 5, altura - 4).strokeColor('#ccc').stroke()
      doc.restore()
    }
  }
  doc.fillColor('#000')

  doc.end()
}
