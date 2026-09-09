import PDFDocument from 'pdfkit'
import { desenharMarcaDagua, desenharRodapeContato, formatarData } from './pdfDocumentoBase.js'

function moeda(v) {
  return (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function cabecalho(doc, clinica, titulo, subtitulo) {
  doc.on('pageAdded', () => desenharMarcaDagua(doc, clinica))
  desenharMarcaDagua(doc, clinica)

  doc.fontSize(15).font('Helvetica-Bold').text(clinica?.nome ?? 'Clínica', { align: 'left' })
  doc.fontSize(13).font('Helvetica-Bold').text(titulo, { align: 'center' })
  if (subtitulo) {
    doc.fontSize(10).font('Helvetica').fillColor('#555').text(subtitulo, { align: 'center' })
    doc.fillColor('#000')
  }
  doc.moveDown(1.2)
}

function linhaTabela(doc, colunas, y) {
  let x = 40
  colunas.forEach((c) => {
    doc.text(c.texto, x, y, { width: c.largura, align: c.align ?? 'left' })
    x += c.largura
  })
}

export function gerarRelatorioPacientesPDF(res, { clinica, total }) {
  const doc = new PDFDocument({ margin: 40, size: 'A4' })
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', 'inline; filename="relatorio-pacientes.pdf"')
  doc.pipe(res)

  cabecalho(doc, clinica, 'Relatório de Pacientes', `Emitido em ${formatarData(new Date().toISOString().slice(0, 10))}`)

  doc.fontSize(12).font('Helvetica').text('Total de pacientes cadastrados:')
  doc.fontSize(28).font('Helvetica-Bold').text(String(total))

  desenharRodapeContato(doc, clinica)
  doc.end()
}

export function gerarRelatorioCirurgiasPDF(res, { clinica, data_inicio, data_fim, total, total_realizadas, por_dia }) {
  const doc = new PDFDocument({ margin: 40, size: 'A4' })
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', 'inline; filename="relatorio-cirurgias.pdf"')
  doc.pipe(res)

  const periodoTexto =
    data_inicio || data_fim
      ? `Período: ${data_inicio ? formatarData(data_inicio) : 'início'} a ${data_fim ? formatarData(data_fim) : 'hoje'}`
      : 'Período: todas as datas'
  cabecalho(doc, clinica, 'Relatório de Cirurgias', periodoTexto)

  doc.fontSize(11).font('Helvetica-Bold').text(`Total de cirurgias no período: ${total}`)
  doc.text(`Com relatório finalizado: ${total_realizadas}`)
  doc.moveDown(1)

  if (por_dia.length === 0) {
    doc.font('Helvetica').fontSize(10).fillColor('#999').text('Nenhuma cirurgia registrada no período.')
    doc.fillColor('#000')
  } else {
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#555')
    linhaTabela(doc, [{ texto: 'Data', largura: 120 }, { texto: 'Quantidade', largura: 100 }], doc.y)
    doc.fillColor('#000')
    doc.moveDown(0.6)
    doc.moveTo(40, doc.y).lineTo(260, doc.y).strokeColor('#ddd').stroke()
    doc.moveDown(0.4)

    por_dia.forEach((d) => {
      if (doc.y > 760) doc.addPage()
      doc.font('Helvetica').fontSize(9)
      linhaTabela(doc, [{ texto: formatarData(d.data), largura: 120 }, { texto: String(d.quantidade), largura: 100 }], doc.y)
      doc.moveDown(0.5)
    })
  }

  desenharRodapeContato(doc, clinica)
  doc.end()
}

export function gerarRelatorioFinanceiroPDF(res, { clinica, periodo, data_inicio, data_fim, recebiveis, despesas }) {
  const doc = new PDFDocument({ margin: 40, size: 'A4' })
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', 'inline; filename="relatorio-financeiro.pdf"')
  doc.pipe(res)

  const rotulosPeriodo = { dia: 'por dia', semana: 'por semana', mes: 'por mês', ano: 'por ano' }
  const periodoTexto = [
    `Agrupado ${rotulosPeriodo[periodo] ?? periodo}`,
    data_inicio || data_fim
      ? `período de ${data_inicio ? formatarData(data_inicio) : 'início'} a ${data_fim ? formatarData(data_fim) : 'hoje'}`
      : 'todas as datas',
  ].join(' — ')
  cabecalho(doc, clinica, 'Relatório Financeiro', periodoTexto)

  const totalRecebiveis = recebiveis.reduce((s, r) => s + r.valor, 0)
  const totalDespesas = despesas.reduce((s, d) => s + d.valor, 0)

  function tabela(titulo, linhas, total, corTotal) {
    doc.font('Helvetica-Bold').fontSize(11).text(titulo)
    doc.moveDown(0.3)
    if (linhas.length === 0) {
      doc.font('Helvetica').fontSize(9).fillColor('#999').text('Nenhum valor no período.')
      doc.fillColor('#000')
    } else {
      linhas.forEach((l) => {
        if (doc.y > 760) doc.addPage()
        doc.font('Helvetica').fontSize(9)
        linhaTabela(
          doc,
          [
            { texto: l.chave, largura: 150 },
            { texto: moeda(l.valor), largura: 100, align: 'right' },
          ],
          doc.y,
        )
        doc.moveDown(0.5)
      })
    }
    doc.moveDown(0.2)
    doc.font('Helvetica-Bold').fontSize(10).fillColor(corTotal).text(`Total: ${moeda(total)}`)
    doc.fillColor('#000')
    doc.moveDown(1)
  }

  tabela('Recebíveis', recebiveis, totalRecebiveis, '#15803d')
  tabela('Despesas', despesas, totalDespesas, '#b91c1c')

  doc.font('Helvetica-Bold').fontSize(11).text(`Saldo do período: ${moeda(totalRecebiveis - totalDespesas)}`)

  desenharRodapeContato(doc, clinica)
  doc.end()
}
