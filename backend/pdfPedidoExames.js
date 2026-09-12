import PDFDocument from 'pdfkit'
import {
  desenharAssinaturaMedico,
  desenharCabecalhoLogo,
  desenharMarcaDagua,
  desenharRodapeContato,
  formatarData,
  registrarFontes,
} from './pdfDocumentoBase.js'

export function gerarPedidoExamesPDF(res, { prontuario, paciente, medico, clinica }) {
  const doc = new PDFDocument({ margin: 50 })
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `inline; filename="pedido-exames-${prontuario.id}.pdf"`)
  doc.pipe(res)
  registrarFontes(doc)

  desenharMarcaDagua(doc, clinica)

  desenharCabecalhoLogo(doc, clinica, 'Pedido de Exames')
  doc.moveDown(0.5)

  function linha(rotulo, valor) {
    doc.font('Jakarta-Bold').fontSize(10).text(rotulo, { continued: true })
    doc.font('Jakarta').text(`  ${valor || '—'}`)
  }

  linha('Paciente:', paciente?.nome)
  linha('CPF:', paciente?.cpf)
  linha('Data:', formatarData(prontuario.data))
  doc.moveDown(1.2)

  doc.font('Jakarta-Bold').fontSize(11).text('Exames solicitados')
  doc.moveDown(0.4)
  doc.font('Jakarta').fontSize(11).text(prontuario.pedido_exames || '—', { lineGap: 4 })

  desenharAssinaturaMedico(doc, medico)
  desenharRodapeContato(doc, clinica)

  doc.end()
}
