import PDFDocument from 'pdfkit'

function formatarData(valor) {
  if (!valor) return '—'
  const d = new Date(valor.includes('T') || valor.includes(' ') ? valor.replace(' ', 'T') : `${valor}T00:00:00`)
  if (Number.isNaN(d.getTime())) return valor
  return d.toLocaleDateString('pt-BR')
}

export function gerarRelatorioCirurgiaPDF(res, { cirurgia, paciente, medico, clinica }) {
  const doc = new PDFDocument({ margin: 50 })
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `inline; filename="relatorio-cirurgico-${cirurgia.id}.pdf"`)
  doc.pipe(res)

  doc.fontSize(16).font('Helvetica-Bold').text(clinica?.nome ?? 'Clínica', { align: 'left' })
  if (clinica?.cnpj) doc.fontSize(9).font('Helvetica').fillColor('#555').text(`CNPJ: ${clinica.cnpj}`)
  if (clinica?.endereco) doc.fontSize(9).fillColor('#555').text(clinica.endereco)
  doc.moveDown(1)
  doc.fillColor('#000')

  doc.fontSize(14).font('Helvetica-Bold').text('Relatório Cirúrgico', { align: 'center' })
  doc.moveDown(1.2)

  function linha(rotulo, valor) {
    doc.font('Helvetica-Bold').fontSize(10).text(rotulo, { continued: true })
    doc.font('Helvetica').text(`  ${valor || '—'}`)
  }

  doc.fontSize(11).font('Helvetica-Bold').text('Dados do paciente')
  doc.moveDown(0.3)
  linha('Nome:', paciente?.nome)
  linha('CPF:', paciente?.cpf)
  linha('RG:', paciente?.rg)
  linha('Data de nascimento:', formatarData(paciente?.data_nascimento))
  linha('Contato:', paciente?.telefone || paciente?.email)
  doc.moveDown(1)

  doc.fontSize(11).font('Helvetica-Bold').text('Dados da cirurgia')
  doc.moveDown(0.3)
  linha('Procedimento:', cirurgia.nome_cirurgia)
  linha('Data prevista:', formatarData(cirurgia.data_prevista))
  linha('Local/Hospital:', cirurgia.local_hospital)
  linha('Médico responsável:', medico?.nome)
  linha('Equipe:', cirurgia.equipe)
  doc.moveDown(0.5)
  doc.font('Helvetica-Bold').fontSize(10).text('Observações:')
  doc.font('Helvetica').fontSize(10).text(cirurgia.observacoes || '—')
  doc.moveDown(1)

  doc.fontSize(9).fillColor('#777')
  doc.text(`Status: ${cirurgia.status === 'pronta' ? 'Relatório finalizado' : 'Rascunho'}`)
  if (cirurgia.finalizado_em) doc.text(`Finalizado em: ${formatarData(cirurgia.finalizado_em)}`)
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`)

  doc.end()
}
