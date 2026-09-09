import PDFDocument from 'pdfkit'
import { desenharMarcaDagua, desenharRodapeContato, formatarData } from './pdfDocumentoBase.js'

export function gerarReceitaPDF(res, { prontuario, paciente, medico, clinica }) {
  const doc = new PDFDocument({ margin: 50 })
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `inline; filename="receita-${prontuario.id}.pdf"`)
  doc.pipe(res)

  desenharMarcaDagua(doc, clinica)

  doc.fontSize(15).font('Helvetica-Bold').text(clinica?.nome ?? 'Clínica', { align: 'center' })
  if (clinica?.cnpj) doc.fontSize(9).font('Helvetica').fillColor('#555').text(`CNPJ: ${clinica.cnpj}`, { align: 'center' })
  doc.fillColor('#000')
  doc.moveDown(1.2)

  doc.fontSize(14).font('Helvetica-Bold').text('Receita Médica', { align: 'center' })
  doc.moveDown(1.5)

  function linha(rotulo, valor) {
    doc.font('Helvetica-Bold').fontSize(10).text(rotulo, { continued: true })
    doc.font('Helvetica').text(`  ${valor || '—'}`)
  }

  linha('Paciente:', paciente?.nome)
  linha('CPF:', paciente?.cpf)
  linha('Data:', formatarData(prontuario.data))
  doc.moveDown(1.2)

  doc.font('Helvetica-Bold').fontSize(11).text('Prescrição')
  doc.moveDown(0.4)
  doc.font('Helvetica').fontSize(11).text(prontuario.prescricao || '—', { lineGap: 4 })
  doc.moveDown(3)

  const larguraAssinatura = 240
  const xAssinatura = (doc.page.width - larguraAssinatura) / 2
  const yAssinatura = doc.y
  doc
    .moveTo(xAssinatura, yAssinatura)
    .lineTo(xAssinatura + larguraAssinatura, yAssinatura)
    .strokeColor('#999')
    .stroke()
  doc.fontSize(10).font('Helvetica').text(medico?.nome ? `Dr(a). ${medico.nome}` : '', xAssinatura, yAssinatura + 4, {
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
