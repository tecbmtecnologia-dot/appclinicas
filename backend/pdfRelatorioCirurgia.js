import PDFDocument from 'pdfkit'
import {
  COR_TEXTO,
  COR_TEXTO_SUAVE,
  desenharCabecalhoLogo,
  desenharFaixaSecao,
  desenharMarcaDagua,
  desenharRodapeContato,
  enderecoCompleto,
  formatarData,
  registrarFontes,
} from './pdfDocumentoBase.js'

export function gerarRelatorioCirurgiaPDF(res, { cirurgia, paciente, medico, hospital, clinica, auxiliares, itens }) {
  const doc = new PDFDocument({ margin: 50 })
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `inline; filename="relatorio-cirurgico-${cirurgia.id}.pdf"`)
  doc.pipe(res)
  registrarFontes(doc)

  desenharMarcaDagua(doc, clinica)

  const larguraUtil = doc.page.width - doc.page.margins.left - doc.page.margins.right
  const finalizado = cirurgia.status === 'pronta'

  const paleta = desenharCabecalhoLogo(doc, clinica, 'Relatório Cirúrgico')

  const badgeTexto = finalizado ? 'FINALIZADO' : 'RASCUNHO'
  const corBadge = finalizado ? '#059669' : '#b45309'
  doc.font('Jakarta-Bold').fontSize(9)
  const larguraBadge = doc.widthOfString(badgeTexto) + 20
  const xBadge = doc.page.width - doc.page.margins.right - larguraBadge
  const yLinha = doc.y
  doc.roundedRect(xBadge, yLinha, larguraBadge, 16, 8).fill(corBadge)
  doc.fillColor('#fff').text(badgeTexto, xBadge, yLinha + 4, { width: larguraBadge, align: 'center' })

  doc.font('Jakarta').fontSize(9).fillColor(COR_TEXTO_SUAVE)
  doc.text(`Cirurgia #${cirurgia.id}  ·  Gerado em ${new Date().toLocaleString('pt-BR')}`, doc.page.margins.left, yLinha + 3, {
    width: xBadge - doc.page.margins.left - 10,
  })
  doc.fillColor('#000')
  doc.x = doc.page.margins.left
  doc.y = yLinha + 16
  doc.moveDown(0.8)

  function campo(rotulo, valor) {
    const x = doc.page.margins.left
    doc.font('Jakarta-Bold').fontSize(8.5).fillColor(paleta.escura)
    doc.text(rotulo.toUpperCase(), x, doc.y, { width: larguraUtil, characterSpacing: 0.4 })
    doc.font('Jakarta').fontSize(11).fillColor(COR_TEXTO)
    doc.text(valor || '—', x, doc.y + 1, { width: larguraUtil })
    doc.fillColor('#000')
    doc.moveDown(0.65)
  }

  desenharFaixaSecao(doc, paleta, 'Dados do paciente')
  campo('Nome', paciente?.nome)
  campo('CPF', paciente?.cpf)
  campo('RG', paciente?.rg)
  campo('Data de nascimento', formatarData(paciente?.data_nascimento))
  campo('Contato', paciente?.telefone || paciente?.email)
  campo('Endereço', enderecoCompleto(paciente))

  doc.moveDown(0.4)
  desenharFaixaSecao(doc, paleta, 'Dados da cirurgia')
  campo('Procedimento', cirurgia.nome_cirurgia)
  campo('Data prevista', formatarData(cirurgia.data_prevista))
  campo('Hospital', hospital?.nome ?? cirurgia.local_hospital)
  campo('Médico responsável', medico?.nome)
  campo('Auxiliares', auxiliares?.length ? auxiliares.map((a) => (a.funcao ? `${a.nome} (${a.funcao})` : a.nome)).join(', ') : null)
  campo('Equipe', cirurgia.equipe)

  doc.font('Jakarta-Bold').fontSize(8.5).fillColor(paleta.escura)
  doc.text('ITENS USADOS', doc.page.margins.left, doc.y, { characterSpacing: 0.4 })
  doc.fillColor('#000')
  doc.moveDown(0.3)
  if (itens?.length) {
    itens.forEach((i) => {
      const y = doc.y
      doc.fillColor(paleta.primaria).font('Jakarta-Bold').fontSize(11).text('•', doc.page.margins.left, y)
      doc.fillColor(COR_TEXTO).font('Jakarta').fontSize(10.5).text(`${i.nome}  ×${i.quantidade}`, doc.page.margins.left + 14, y, { width: larguraUtil - 14 })
      doc.fillColor('#000')
    })
  } else {
    doc.font('Jakarta').fontSize(10.5).fillColor(COR_TEXTO).text('—')
    doc.fillColor('#000')
  }
  doc.moveDown(0.7)

  doc.font('Jakarta-Bold').fontSize(8.5).fillColor(paleta.escura)
  doc.text('OBSERVAÇÕES CIRÚRGICAS', doc.page.margins.left, doc.y, { characterSpacing: 0.4 })
  doc.fillColor(COR_TEXTO).font('Jakarta').fontSize(10.5)
  doc.text(cirurgia.observacoes || '—', doc.page.margins.left, doc.y + 2, { width: larguraUtil })
  doc.fillColor('#000')
  doc.moveDown(1)

  // Presente só quando o backend liberou o campo pro perfil que pediu o PDF (admin/coordenador/pj) —
  // ausência da chave (undefined) é diferente de campo vazio (null), por isso o teste é explícito.
  if (cirurgia.observacoes_financeiras !== undefined) {
    doc.font('Jakarta-Bold').fontSize(8.5).fillColor(paleta.escura)
    doc.text('OBSERVAÇÕES FINANCEIRAS', doc.page.margins.left, doc.y, { characterSpacing: 0.4 })
    doc.fillColor(COR_TEXTO).font('Jakarta').fontSize(10.5)
    doc.text(cirurgia.observacoes_financeiras || '—', doc.page.margins.left, doc.y + 2, { width: larguraUtil })
    doc.fillColor('#000')
    doc.moveDown(1)
  }

  if (finalizado && cirurgia.finalizado_em) {
    doc.fontSize(8.5).fillColor(COR_TEXTO_SUAVE)
    doc.text(`Finalizado em ${formatarData(cirurgia.finalizado_em)}`)
    doc.fillColor('#000')
  }

  desenharRodapeContato(doc, clinica)

  doc.end()
}
