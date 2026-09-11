import PDFDocument from 'pdfkit'
import {
  desenharCabecalhoLogo,
  desenharFaixaSecao,
  desenharMarcaDagua,
  desenharRodapeContato,
  desenharSubtitulo,
  formatarData,
  registrarFontes,
} from './pdfDocumentoBase.js'

function moeda(v) {
  return (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function cabecalho(doc, clinica, titulo, subtitulo) {
  doc.on('pageAdded', () => desenharMarcaDagua(doc, clinica))
  desenharMarcaDagua(doc, clinica)

  const paleta = desenharCabecalhoLogo(doc, clinica, titulo)
  if (subtitulo) desenharSubtitulo(doc, subtitulo, { align: 'center' })
  return paleta
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
  registrarFontes(doc)

  const paleta = cabecalho(doc, clinica, 'Relatório de Pacientes', `Emitido em ${formatarData(new Date().toISOString().slice(0, 10))}`)

  doc.fontSize(12).font('Jakarta').fillColor('#000').text('Total de pacientes cadastrados:')
  doc.fontSize(28).font('Jakarta-Bold').fillColor(paleta.primaria).text(String(total))
  doc.fillColor('#000')

  desenharRodapeContato(doc, clinica)
  doc.end()
}

export function gerarRelatorioCirurgiasPDF(res, { clinica, data_inicio, data_fim, total, total_realizadas, por_dia }) {
  const doc = new PDFDocument({ margin: 40, size: 'A4' })
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', 'inline; filename="relatorio-cirurgias.pdf"')
  doc.pipe(res)
  registrarFontes(doc)

  const periodoTexto =
    data_inicio || data_fim
      ? `Período: ${data_inicio ? formatarData(data_inicio) : 'início'} a ${data_fim ? formatarData(data_fim) : 'hoje'}`
      : 'Período: todas as datas'
  const paleta = cabecalho(doc, clinica, 'Relatório de Cirurgias', periodoTexto)

  doc.fontSize(11).font('Jakarta-Bold').text(`Total de cirurgias no período: ${total}`)
  doc.text(`Com relatório finalizado: ${total_realizadas}`)
  doc.moveDown(0.8)

  desenharFaixaSecao(doc, paleta, 'Cirurgias por dia')

  if (por_dia.length === 0) {
    doc.font('Jakarta').fontSize(10).fillColor('#999').text('Nenhuma cirurgia registrada no período.')
    doc.fillColor('#000')
  } else {
    doc.font('Jakarta-Bold').fontSize(9).fillColor('#555')
    linhaTabela(doc, [{ texto: 'Data', largura: 120 }, { texto: 'Quantidade', largura: 100 }], doc.y)
    doc.fillColor('#000')
    doc.moveDown(0.6)
    doc.moveTo(40, doc.y).lineTo(260, doc.y).strokeColor('#ddd').stroke()
    doc.moveDown(0.4)

    por_dia.forEach((d) => {
      if (doc.y > 760) doc.addPage()
      doc.font('Jakarta').fontSize(9)
      linhaTabela(doc, [{ texto: formatarData(d.data), largura: 120 }, { texto: String(d.quantidade), largura: 100 }], doc.y)
      doc.moveDown(0.5)
    })
  }

  desenharRodapeContato(doc, clinica)
  doc.end()
}

export function gerarRelatorioProducaoPDF(res, { clinica, data_inicio, data_fim, linhas, total }) {
  const doc = new PDFDocument({ margin: 40, size: 'A4' })
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', 'inline; filename="relatorio-producao.pdf"')
  doc.pipe(res)
  registrarFontes(doc)

  const periodoTexto =
    data_inicio || data_fim
      ? `Período: ${data_inicio ? formatarData(data_inicio) : 'início'} a ${data_fim ? formatarData(data_fim) : 'hoje'}`
      : 'Período: todas as datas'
  const paleta = cabecalho(doc, clinica, 'Produção Realizada', periodoTexto)

  const colunas = [
    { chave: 'data', texto: 'Data', largura: 65 },
    { chave: 'paciente_nome', texto: 'Paciente', largura: 175 },
    { chave: 'descricao', texto: 'Procedimento / consulta', largura: 175 },
    { chave: 'valor', texto: 'Valor pago', largura: 100, align: 'right' },
  ]

  if (linhas.length === 0) {
    doc.font('Jakarta').fontSize(10).fillColor('#999').text('Nenhum pagamento recebido no período.')
    doc.fillColor('#000')
  } else {
    doc.font('Jakarta-Bold').fontSize(9).fillColor('#555')
    linhaTabela(doc, colunas, doc.y)
    doc.fillColor('#000')
    doc.moveDown(0.6)
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#ddd').stroke()
    doc.moveDown(0.4)

    linhas.forEach((l) => {
      if (doc.y > 750) {
        doc.addPage()
        doc.font('Jakarta-Bold').fontSize(9).fillColor('#555')
        linhaTabela(doc, colunas, doc.y)
        doc.fillColor('#000')
        doc.moveDown(0.6)
        doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#ddd').stroke()
        doc.moveDown(0.4)
      }
      const y = doc.y
      doc.font('Jakarta').fontSize(9)
      linhaTabela(
        doc,
        [
          { texto: formatarData(l.data_pagamento), largura: 65 },
          { texto: l.paciente_nome, largura: 175 },
          { texto: l.descricao, largura: 175 },
          { texto: moeda(l.valor), largura: 100, align: 'right' },
        ],
        y,
      )
      doc.moveDown(0.5)
    })
  }

  doc.moveDown(0.4)
  doc.font('Jakarta-Bold').fontSize(11).fillColor(paleta.primaria).text(`Total do período: ${moeda(total)}`, { align: 'right' })
  doc.fillColor('#000')

  desenharRodapeContato(doc, clinica)
  doc.end()
}

export function gerarRelatorioEstoquePDF(res, { clinica, itens }) {
  const doc = new PDFDocument({ margin: 40, size: 'A4' })
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', 'inline; filename="relatorio-estoque.pdf"')
  doc.pipe(res)
  registrarFontes(doc)

  cabecalho(doc, clinica, 'Relatório de Estoque', `Emitido em ${formatarData(new Date().toISOString().slice(0, 10))}`)

  const colunas = [
    { texto: 'Descrição do item', largura: 280 },
    { texto: 'Validade', largura: 100 },
    { texto: 'Quantidade', largura: 100, align: 'right' },
  ]

  if (itens.length === 0) {
    doc.font('Jakarta').fontSize(10).fillColor('#999').text('Nenhum item cadastrado no estoque.')
    doc.fillColor('#000')
  } else {
    doc.font('Jakarta-Bold').fontSize(9).fillColor('#555')
    linhaTabela(doc, colunas, doc.y)
    doc.fillColor('#000')
    doc.moveDown(0.6)
    doc.moveTo(40, doc.y).lineTo(520, doc.y).strokeColor('#ddd').stroke()
    doc.moveDown(0.4)

    const hoje = new Date().toISOString().slice(0, 10)
    itens.forEach((item) => {
      if (doc.y > 750) {
        doc.addPage()
        doc.font('Jakarta-Bold').fontSize(9).fillColor('#555')
        linhaTabela(doc, colunas, doc.y)
        doc.fillColor('#000')
        doc.moveDown(0.6)
        doc.moveTo(40, doc.y).lineTo(520, doc.y).strokeColor('#ddd').stroke()
        doc.moveDown(0.4)
      }
      const vencido = item.data_validade && item.data_validade < hoje
      doc.font('Jakarta').fontSize(9).fillColor(vencido ? '#b91c1c' : '#000')
      linhaTabela(
        doc,
        [
          { texto: item.descricao, largura: 280 },
          { texto: item.data_validade ? formatarData(item.data_validade) : '—', largura: 100 },
          { texto: String(item.quantidade), largura: 100, align: 'right' },
        ],
        doc.y,
      )
      doc.fillColor('#000')
      doc.moveDown(0.5)
    })
  }

  desenharRodapeContato(doc, clinica)
  doc.end()
}

export function gerarRelatorioAnaliseFinanceiraPDF(res, { clinica, ano, meses, totalReceitas, totalDespesas, totalSaldo }) {
  const doc = new PDFDocument({ margin: 40, size: 'A4' })
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `inline; filename="analise-financeira-${ano}.pdf"`)
  doc.pipe(res)
  registrarFontes(doc)

  const paleta = cabecalho(doc, clinica, 'Análise Financeira da Empresa', `Ano de ${ano} — valores já recebidos/pagos`)

  const colunas = [
    { texto: 'Mês', largura: 100 },
    { texto: 'Receitas', largura: 130, align: 'right' },
    { texto: 'Despesas', largura: 130, align: 'right' },
    { texto: 'Saldo', largura: 130, align: 'right' },
  ]
  doc.font('Jakarta-Bold').fontSize(9).fillColor('#555')
  linhaTabela(doc, colunas, doc.y)
  doc.fillColor('#000')
  doc.moveDown(0.6)
  doc.moveTo(40, doc.y).lineTo(530, doc.y).strokeColor('#ddd').stroke()
  doc.moveDown(0.4)

  const xSaldo = 40 + 100 + 130 + 130

  meses.forEach((m) => {
    const y = doc.y
    doc.font('Jakarta').fontSize(9).fillColor('#000')
    linhaTabela(
      doc,
      [
        { texto: `${m.nome}/${ano}`, largura: 100 },
        { texto: moeda(m.receitas), largura: 130, align: 'right' },
        { texto: moeda(m.despesas), largura: 130, align: 'right' },
      ],
      y,
    )
    doc.fillColor(m.saldo < 0 ? '#b91c1c' : '#000')
    doc.text(moeda(m.saldo), xSaldo, y, { width: 130, align: 'right' })
    doc.fillColor('#000')
    doc.moveDown(0.5)
  })

  doc.moveDown(0.3)
  doc.moveTo(40, doc.y).lineTo(530, doc.y).strokeColor('#ddd').stroke()
  doc.moveDown(0.4)

  const yTotal = doc.y
  doc.font('Jakarta-Bold').fontSize(10).fillColor('#000')
  linhaTabela(
    doc,
    [
      { texto: 'Total do ano', largura: 100 },
      { texto: moeda(totalReceitas), largura: 130, align: 'right' },
      { texto: moeda(totalDespesas), largura: 130, align: 'right' },
    ],
    yTotal,
  )
  doc.fillColor(totalSaldo < 0 ? '#b91c1c' : paleta.primaria)
  doc.text(moeda(totalSaldo), xSaldo, yTotal, { width: 130, align: 'right' })
  doc.fillColor('#000')
  doc.moveDown(1)

  desenharRodapeContato(doc, clinica)
  doc.end()
}

export function gerarRelatorioEpidemiologicoPDF(res, { clinica, data_inicio, data_fim, total, porSexo, porFaixaEtaria, porProcedimento }) {
  const doc = new PDFDocument({ margin: 40, size: 'A4' })
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', 'inline; filename="perfil-epidemiologico.pdf"')
  doc.pipe(res)
  registrarFontes(doc)

  const periodoTexto =
    data_inicio || data_fim
      ? `Período: ${data_inicio ? formatarData(data_inicio) : 'início'} a ${data_fim ? formatarData(data_fim) : 'hoje'}`
      : 'Período: todas as datas'
  const paleta = cabecalho(doc, clinica, 'Perfil Epidemiológico', periodoTexto)

  doc.font('Jakarta-Bold').fontSize(11).fillColor(paleta.primaria).text(`Total de atendimentos concluídos: ${total}`)
  doc.fillColor('#000')
  doc.moveDown(0.8)

  function tabelaDistribuicao(titulo, linhas, larguraRotulo) {
    desenharFaixaSecao(doc, paleta, titulo)
    if (linhas.length === 0) {
      doc.font('Jakarta').fontSize(9).fillColor('#999').text('Nenhum atendimento no período.')
      doc.fillColor('#000')
    } else {
      linhas.forEach((l) => {
        if (doc.y > 750) doc.addPage()
        const percentual = total > 0 ? ((l.quantidade / total) * 100).toFixed(1) : '0.0'
        doc.font('Jakarta').fontSize(9).fillColor('#000')
        linhaTabela(
          doc,
          [
            { texto: l.rotulo, largura: larguraRotulo },
            { texto: String(l.quantidade), largura: 60, align: 'right' },
            { texto: `${percentual}%`, largura: 60, align: 'right' },
          ],
          doc.y,
        )
        doc.moveDown(0.5)
      })
    }
    doc.moveDown(0.8)
  }

  tabelaDistribuicao('Por sexo', porSexo, 260)
  tabelaDistribuicao('Por faixa etária', porFaixaEtaria, 260)
  tabelaDistribuicao('Procedimentos e/ou consultas realizados', porProcedimento, 260)

  desenharRodapeContato(doc, clinica)
  doc.end()
}

function periodoTextoAgenda(data_inicio, data_fim) {
  return data_inicio || data_fim
    ? `Período: ${data_inicio ? formatarData(data_inicio) : 'início'} a ${data_fim ? formatarData(data_fim) : 'hoje'}`
    : 'Período: todas as datas'
}

// Tabela Data/Paciente/Médico/Procedimento — usada por Absenteísmo e Cancelamento, que
// listam agendamentos com um status específico exatamente com as mesmas colunas.
function tabelaAgendamentos(doc, linhas) {
  const colunas = [
    { texto: 'Data/Hora', largura: 95 },
    { texto: 'Paciente', largura: 145 },
    { texto: 'Médico', largura: 145 },
    { texto: 'Procedimento/Consulta', largura: 130 },
  ]
  if (linhas.length === 0) {
    doc.font('Jakarta').fontSize(9).fillColor('#999').text('Nenhum registro no período.')
    doc.fillColor('#000')
    return
  }
  doc.font('Jakarta-Bold').fontSize(9).fillColor('#555')
  linhaTabela(doc, colunas, doc.y)
  doc.fillColor('#000')
  doc.moveDown(0.6)
  doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#ddd').stroke()
  doc.moveDown(0.4)

  linhas.forEach((l) => {
    if (doc.y > 740) {
      doc.addPage()
      doc.font('Jakarta-Bold').fontSize(9).fillColor('#555')
      linhaTabela(doc, colunas, doc.y)
      doc.fillColor('#000')
      doc.moveDown(0.6)
      doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#ddd').stroke()
      doc.moveDown(0.4)
    }
    doc.font('Jakarta').fontSize(9).fillColor('#000')
    linhaTabela(
      doc,
      [
        { texto: `${formatarData(l.data_hora)} ${l.data_hora.slice(11, 16)}`, largura: 95 },
        { texto: l.paciente_nome, largura: 145 },
        { texto: `Dr(a). ${l.medico_nome}`, largura: 145 },
        { texto: l.procedimento, largura: 130 },
      ],
      doc.y,
    )
    doc.moveDown(0.5)
  })
}

export function gerarRelatorioAbsenteismoPDF(res, { clinica, data_inicio, data_fim, linhas, total, totalRelevante, taxa }) {
  const doc = new PDFDocument({ margin: 40, size: 'A4' })
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', 'inline; filename="relatorio-absenteismo.pdf"')
  doc.pipe(res)
  registrarFontes(doc)

  const paleta = cabecalho(doc, clinica, 'Absenteísmo', periodoTextoAgenda(data_inicio, data_fim))
  doc.font('Jakarta-Bold').fontSize(11).fillColor(paleta.primaria)
  doc.text(`Faltas no período: ${total}  ·  Taxa de absenteísmo: ${taxa.toFixed(1)}% (sobre ${totalRelevante} atendimentos)`)
  doc.fillColor('#000')
  doc.moveDown(0.8)

  tabelaAgendamentos(doc, linhas)

  desenharRodapeContato(doc, clinica)
  doc.end()
}

export function gerarRelatorioCancelamentoPDF(res, { clinica, data_inicio, data_fim, linhas, total, totalGeral, taxa }) {
  const doc = new PDFDocument({ margin: 40, size: 'A4' })
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', 'inline; filename="relatorio-cancelamento.pdf"')
  doc.pipe(res)
  registrarFontes(doc)

  const paleta = cabecalho(doc, clinica, 'Cancelamento', periodoTextoAgenda(data_inicio, data_fim))
  doc.font('Jakarta-Bold').fontSize(11).fillColor(paleta.primaria)
  doc.text(`Cancelamentos no período: ${total}  ·  Taxa de cancelamento: ${taxa.toFixed(1)}% (sobre ${totalGeral} agendamentos)`)
  doc.fillColor('#000')
  doc.moveDown(0.8)

  tabelaAgendamentos(doc, linhas)

  desenharRodapeContato(doc, clinica)
  doc.end()
}

// Tabela Rótulo/Quantidade/% — usada por "Total de consultas e procedimentos" e "Vendas
// por profissional", que são a mesma base (agendamentos concluídos) agrupada de formas
// diferentes (por procedimento, por médico).
function tabelaContagem(doc, linhas, total) {
  if (linhas.length === 0) {
    doc.font('Jakarta').fontSize(9).fillColor('#999').text('Nenhum atendimento no período.')
    doc.fillColor('#000')
    return
  }
  linhas.forEach((l) => {
    if (doc.y > 750) doc.addPage()
    const percentual = total > 0 ? ((l.quantidade / total) * 100).toFixed(1) : '0.0'
    doc.font('Jakarta').fontSize(9).fillColor('#000')
    linhaTabela(
      doc,
      [
        { texto: l.rotulo, largura: 320 },
        { texto: String(l.quantidade), largura: 80, align: 'right' },
        { texto: `${percentual}%`, largura: 80, align: 'right' },
      ],
      doc.y,
    )
    doc.moveDown(0.5)
  })
}

export function gerarRelatorioConsultasProcedimentosPDF(res, { clinica, data_inicio, data_fim, total, porProcedimento }) {
  const doc = new PDFDocument({ margin: 40, size: 'A4' })
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', 'inline; filename="relatorio-consultas-procedimentos.pdf"')
  doc.pipe(res)
  registrarFontes(doc)

  const paleta = cabecalho(doc, clinica, 'Total de Consultas e Procedimentos Realizados', periodoTextoAgenda(data_inicio, data_fim))
  doc.font('Jakarta-Bold').fontSize(11).fillColor(paleta.primaria).text(`Total realizado no período: ${total}`)
  doc.fillColor('#000')
  doc.moveDown(0.8)

  desenharFaixaSecao(doc, paleta, 'Por procedimento/consulta')
  tabelaContagem(doc, porProcedimento, total)

  desenharRodapeContato(doc, clinica)
  doc.end()
}

export function gerarRelatorioVendasProfissionalPDF(res, { clinica, data_inicio, data_fim, total, porProfissional }) {
  const doc = new PDFDocument({ margin: 40, size: 'A4' })
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', 'inline; filename="relatorio-vendas-profissional.pdf"')
  doc.pipe(res)
  registrarFontes(doc)

  const paleta = cabecalho(doc, clinica, 'Vendas por Profissional', periodoTextoAgenda(data_inicio, data_fim))
  doc.font('Jakarta').fontSize(9).fillColor('#777').text('Quantidade de consultas/procedimentos concluídos por profissional (não é valor em R$).')
  doc.fillColor('#000')
  doc.moveDown(0.4)
  doc.font('Jakarta-Bold').fontSize(11).fillColor(paleta.primaria).text(`Total realizado no período: ${total}`)
  doc.fillColor('#000')
  doc.moveDown(0.8)

  desenharFaixaSecao(doc, paleta, 'Por profissional')
  tabelaContagem(doc, porProfissional, total)

  desenharRodapeContato(doc, clinica)
  doc.end()
}

export function gerarRelatorioRepassePDF(res, { clinica, referencia, resumo, totalGeral }) {
  const doc = new PDFDocument({ margin: 40, size: 'A4' })
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `inline; filename="repasse-${referencia}.pdf"`)
  doc.pipe(res)
  registrarFontes(doc)

  const paleta = cabecalho(doc, clinica, 'Repasse de Pagamento', `Competência ${referencia}`)

  const colunas = [
    { texto: 'Profissional', largura: 175 },
    { texto: 'Fixo mensal', largura: 90, align: 'right' },
    { texto: 'Procedimentos', largura: 90, align: 'right' },
    { texto: 'Avulsas aprov.', largura: 90, align: 'right' },
    { texto: 'Total', largura: 70, align: 'right' },
  ]

  if (resumo.length === 0) {
    doc.font('Jakarta').fontSize(10).fillColor('#999').text('Nenhum profissional com repasse nesta competência.')
    doc.fillColor('#000')
  } else {
    doc.font('Jakarta-Bold').fontSize(9).fillColor('#555')
    linhaTabela(doc, colunas, doc.y)
    doc.fillColor('#000')
    doc.moveDown(0.6)
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#ddd').stroke()
    doc.moveDown(0.4)

    resumo.forEach((r) => {
      if (doc.y > 740) doc.addPage()
      doc.font('Jakarta').fontSize(9).fillColor('#000')
      linhaTabela(
        doc,
        [
          { texto: r.usuario_nome, largura: 175 },
          { texto: moeda(r.valor_fixo_mensal), largura: 90, align: 'right' },
          { texto: moeda(r.total_procedimentos), largura: 90, align: 'right' },
          { texto: moeda(r.total_avulsas_aprovadas), largura: 90, align: 'right' },
          { texto: moeda(r.total), largura: 70, align: 'right' },
        ],
        doc.y,
      )
      doc.moveDown(0.5)
    })
  }

  doc.moveDown(0.4)
  doc.font('Jakarta-Bold').fontSize(11).fillColor(paleta.primaria).text(`Total geral do repasse: ${moeda(totalGeral)}`, { align: 'right' })
  doc.fillColor('#000')

  desenharRodapeContato(doc, clinica)
  doc.end()
}

export function gerarRelatorioContasPDF(res, { clinica, data_inicio, data_fim, aReceber, aPagar, totalAReceber, totalAPagar }) {
  const doc = new PDFDocument({ margin: 40, size: 'A4' })
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', 'inline; filename="relatorio-contas.pdf"')
  doc.pipe(res)
  registrarFontes(doc)

  const periodoTexto =
    data_inicio || data_fim
      ? `Vencimento de ${data_inicio ? formatarData(data_inicio) : 'início'} a ${data_fim ? formatarData(data_fim) : 'hoje'}`
      : 'Todas as datas de vencimento'
  const paleta = cabecalho(doc, clinica, 'Contas a Pagar e a Receber', periodoTexto)

  const rotuloStatus = { pendente: 'Pendente', atrasado: 'Atrasado' }
  const hoje = new Date().toISOString().slice(0, 10)

  desenharFaixaSecao(doc, paleta, 'Contas a receber (pacientes)')
  if (aReceber.length === 0) {
    doc.font('Jakarta').fontSize(9).fillColor('#999').text('Nada em aberto no período.')
    doc.fillColor('#000')
  } else {
    const colunas = [
      { texto: 'Paciente', largura: 145 },
      { texto: 'Descrição', largura: 130 },
      { texto: 'Vencimento', largura: 70 },
      { texto: 'Status', largura: 65 },
      { texto: 'Valor', largura: 65, align: 'right' },
    ]
    doc.font('Jakarta-Bold').fontSize(9).fillColor('#555')
    linhaTabela(doc, colunas, doc.y)
    doc.fillColor('#000')
    doc.moveDown(0.6)
    doc.moveTo(40, doc.y).lineTo(515, doc.y).strokeColor('#ddd').stroke()
    doc.moveDown(0.4)

    aReceber.forEach((l) => {
      if (doc.y > 740) doc.addPage()
      const atrasado = l.status === 'atrasado' || (l.data_vencimento && l.data_vencimento < hoje)
      doc.font('Jakarta').fontSize(9).fillColor(atrasado ? '#b91c1c' : '#000')
      linhaTabela(
        doc,
        [
          { texto: l.paciente_nome, largura: 145 },
          { texto: l.descricao, largura: 130 },
          { texto: l.data_vencimento ? formatarData(l.data_vencimento) : '—', largura: 70 },
          { texto: rotuloStatus[l.status] ?? l.status, largura: 65 },
          { texto: moeda(l.valor), largura: 65, align: 'right' },
        ],
        doc.y,
      )
      doc.fillColor('#000')
      doc.moveDown(0.5)
    })
  }
  doc.moveDown(0.2)
  doc.font('Jakarta-Bold').fontSize(10).fillColor('#15803d').text(`Total a receber: ${moeda(totalAReceber)}`, { align: 'right' })
  doc.fillColor('#000')
  doc.moveDown(1)

  desenharFaixaSecao(doc, paleta, 'Contas a pagar (despesas da clínica)')
  if (aPagar.length === 0) {
    doc.font('Jakarta').fontSize(9).fillColor('#999').text('Nada em aberto no período.')
    doc.fillColor('#000')
  } else {
    const colunas = [
      { texto: 'Descrição', largura: 200 },
      { texto: 'Categoria', largura: 110 },
      { texto: 'Vencimento', largura: 90 },
      { texto: 'Valor', largura: 75, align: 'right' },
    ]
    doc.font('Jakarta-Bold').fontSize(9).fillColor('#555')
    linhaTabela(doc, colunas, doc.y)
    doc.fillColor('#000')
    doc.moveDown(0.6)
    doc.moveTo(40, doc.y).lineTo(515, doc.y).strokeColor('#ddd').stroke()
    doc.moveDown(0.4)

    aPagar.forEach((l) => {
      if (doc.y > 740) doc.addPage()
      const atrasado = l.data < hoje
      doc.font('Jakarta').fontSize(9).fillColor(atrasado ? '#b91c1c' : '#000')
      linhaTabela(
        doc,
        [
          { texto: l.descricao, largura: 200 },
          { texto: l.categoria || '—', largura: 110 },
          { texto: formatarData(l.data), largura: 90 },
          { texto: moeda(l.valor), largura: 75, align: 'right' },
        ],
        doc.y,
      )
      doc.fillColor('#000')
      doc.moveDown(0.5)
    })
  }
  doc.moveDown(0.2)
  doc.font('Jakarta-Bold').fontSize(10).fillColor('#b91c1c').text(`Total a pagar: ${moeda(totalAPagar)}`, { align: 'right' })
  doc.fillColor('#000')

  desenharRodapeContato(doc, clinica)
  doc.end()
}

export function gerarRelatorioFinanceiroPDF(res, { clinica, periodo, data_inicio, data_fim, recebiveis, despesas }) {
  const doc = new PDFDocument({ margin: 40, size: 'A4' })
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', 'inline; filename="relatorio-financeiro.pdf"')
  doc.pipe(res)
  registrarFontes(doc)

  const rotulosPeriodo = { dia: 'por dia', semana: 'por semana', mes: 'por mês', ano: 'por ano' }
  const periodoTexto = [
    `Agrupado ${rotulosPeriodo[periodo] ?? periodo}`,
    data_inicio || data_fim
      ? `período de ${data_inicio ? formatarData(data_inicio) : 'início'} a ${data_fim ? formatarData(data_fim) : 'hoje'}`
      : 'todas as datas',
  ].join(' — ')
  const paleta = cabecalho(doc, clinica, 'Relatório Financeiro', periodoTexto)

  const totalRecebiveis = recebiveis.reduce((s, r) => s + r.valor, 0)
  const totalDespesas = despesas.reduce((s, d) => s + d.valor, 0)

  function tabela(titulo, linhas, total, corTotal) {
    desenharFaixaSecao(doc, paleta, titulo)
    if (linhas.length === 0) {
      doc.font('Jakarta').fontSize(9).fillColor('#999').text('Nenhum valor no período.')
      doc.fillColor('#000')
    } else {
      linhas.forEach((l) => {
        if (doc.y > 760) doc.addPage()
        doc.font('Jakarta').fontSize(9)
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
    doc.font('Jakarta-Bold').fontSize(10).fillColor(corTotal).text(`Total: ${moeda(total)}`)
    doc.fillColor('#000')
    doc.moveDown(1)
  }

  tabela('Recebíveis', recebiveis, totalRecebiveis, '#15803d')
  tabela('Despesas', despesas, totalDespesas, '#b91c1c')

  doc.font('Jakarta-Bold').fontSize(11).text(`Saldo do período: ${moeda(totalRecebiveis - totalDespesas)}`)

  desenharRodapeContato(doc, clinica)
  doc.end()
}
