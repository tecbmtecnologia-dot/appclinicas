import PDFDocument from 'pdfkit'
import { formatarData, registrarFontes } from './pdfDocumentoBase.js'

// Etiqueta pequena pra impressora de etiqueta adesiva dedicada (tipo Zebra/Elgin),
// não uma folha A4 — decisão explícita do usuário. 70x40mm dá espaço confortável
// pra nome completo (às vezes longo) + nascimento + filiação em 3 linhas.
const MM_PARA_PT = 2.8346456693
const LARGURA = 70 * MM_PARA_PT
const ALTURA = 40 * MM_PARA_PT

export function gerarEtiquetaPacientePDF(res, { paciente }) {
  const doc = new PDFDocument({ size: [LARGURA, ALTURA], margin: 8 })
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `inline; filename="etiqueta-${paciente.id}.pdf"`)
  doc.pipe(res)
  registrarFontes(doc)

  const largura = LARGURA - 16

  doc.font('Jakarta-Bold').fontSize(10.5).fillColor('#000').text(paciente.nome, { width: largura, lineGap: 1 })
  doc.moveDown(0.4)
  doc.font('Jakarta').fontSize(8.5).fillColor('#222')
  doc.text(`Nasc.: ${paciente.data_nascimento ? formatarData(paciente.data_nascimento) : '—'}`, { width: largura })
  doc.text(`Filiação: ${paciente.nome_mae || '—'}`, { width: largura })
  doc.fillColor('#000')

  doc.end()
}
