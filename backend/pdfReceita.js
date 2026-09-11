import PDFDocument from 'pdfkit'
import { desenharCabecalhoLogo, desenharMarcaDagua, desenharRodapeContato, formatarData, registrarFontes } from './pdfDocumentoBase.js'

export function gerarReceitaPDF(res, { prontuario, paciente, medico, clinica }) {
  const doc = new PDFDocument({ margin: 50 })
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `inline; filename="receita-${prontuario.id}.pdf"`)
  doc.pipe(res)
  registrarFontes(doc)

  desenharMarcaDagua(doc, clinica)

  desenharCabecalhoLogo(doc, clinica, 'Receita Médica')
  doc.moveDown(0.5)

  function linha(rotulo, valor) {
    doc.font('Jakarta-Bold').fontSize(10).text(rotulo, { continued: true })
    doc.font('Jakarta').text(`  ${valor || '—'}`)
  }

  linha('Paciente:', paciente?.nome)
  linha('CPF:', paciente?.cpf)
  linha('Data:', formatarData(prontuario.data))
  doc.moveDown(1.2)

  doc.font('Jakarta-Bold').fontSize(11).text('Prescrição')
  doc.moveDown(0.4)
  doc.font('Jakarta').fontSize(11).text(prontuario.prescricao || '—', { lineGap: 4 })
  doc.moveDown(3)

  const larguraAssinatura = 240
  const xAssinatura = (doc.page.width - larguraAssinatura) / 2
  const yAssinatura = doc.y
  doc
    .moveTo(xAssinatura, yAssinatura)
    .lineTo(xAssinatura + larguraAssinatura, yAssinatura)
    .strokeColor('#999')
    .stroke()
  doc.fontSize(10).font('Jakarta').text(medico?.nome ? `Dr(a). ${medico.nome}` : '', xAssinatura, yAssinatura + 4, {
    width: larguraAssinatura,
    align: 'center',
  })
  if (medico?.crm) {
    doc.fontSize(9).fillColor('#555').text(`CRM: ${medico.crm}`, xAssinatura, doc.y, { width: larguraAssinatura, align: 'center' })
    doc.fillColor('#000')
  }

  desenharRodapeContato(doc, clinica)

  doc.end()
}
