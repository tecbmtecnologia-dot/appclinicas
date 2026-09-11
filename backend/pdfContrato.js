import PDFDocument from 'pdfkit'
import { desenharCabecalhoLogo, desenharMarcaDagua, desenharRodapeContato, registrarFontes } from './pdfDocumentoBase.js'

export function gerarContratoPDF(res, { texto, paciente, clinica }) {
  const doc = new PDFDocument({ margin: 50 })
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `inline; filename="contrato-${paciente.id}.pdf"`)
  doc.pipe(res)
  registrarFontes(doc)

  desenharMarcaDagua(doc, clinica)

  desenharCabecalhoLogo(doc, clinica, 'Contrato de Prestação de Serviços')
  doc.moveDown(0.8)

  doc.font('Jakarta').fontSize(10.5).fillColor('#1e293b')
  const paragrafos = texto.split(/\n{2,}/)
  paragrafos.forEach((paragrafo, i) => {
    doc.text(paragrafo.trim(), { align: 'justify', lineGap: 3 })
    if (i < paragrafos.length - 1) doc.moveDown(0.8)
  })
  doc.fillColor('#000')

  doc.moveDown(3)
  if (doc.y > doc.page.height - doc.page.margins.bottom - 90) doc.addPage()

  const largura = 220
  const xEsquerda = doc.page.margins.left
  const xDireita = doc.page.width - doc.page.margins.right - largura
  const y = doc.y

  function assinatura(x, rotulo, nome) {
    doc.moveTo(x, y).lineTo(x + largura, y).strokeColor('#999').stroke()
    doc.fontSize(9.5).font('Jakarta').fillColor('#333').text(nome || '', x, y + 4, { width: largura, align: 'center' })
    doc.fontSize(8.5).fillColor('#777').text(rotulo, x, doc.y + 2, { width: largura, align: 'center' })
    doc.fillColor('#000')
  }

  assinatura(xEsquerda, 'CONTRATADA', clinica?.nome)
  assinatura(xDireita, 'CONTRATANTE', paciente?.nome)

  desenharRodapeContato(doc, clinica)

  doc.end()
}
