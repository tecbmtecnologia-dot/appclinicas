import PDFDocument from 'pdfkit'
import { desenharCabecalhoLogo, desenharFaixaSecao, desenharMarcaDagua, desenharRodapeContato, formatarData, registrarFontes } from './pdfDocumentoBase.js'

function formatarHoras(h) {
  if (h == null) return '—'
  const sinal = h < 0 ? '-' : ''
  const abs = Math.abs(h)
  const horas = Math.floor(abs)
  const minutos = Math.round((abs - horas) * 60)
  return `${sinal}${horas}h${String(minutos).padStart(2, '0')}`
}

function horaCurta(dataHora) {
  if (!dataHora) return '—'
  return dataHora.slice(11, 16)
}

const COLUNAS = [
  { titulo: 'Data', largura: 60 },
  { titulo: 'Entrada', largura: 65 },
  { titulo: 'Início int.', largura: 65 },
  { titulo: 'Fim int.', largura: 65 },
  { titulo: 'Saída', largura: 65 },
  { titulo: 'Trabalhado', largura: 60 },
  { titulo: 'Previsto', largura: 55 },
  { titulo: 'Saldo do dia', largura: 70 },
]
const MARGEM_ESQUERDA = 40
const LARGURA_TOTAL = COLUNAS.reduce((s, c) => s + c.largura, 0)

function desenharCabecalhoTabela(doc) {
  let x = MARGEM_ESQUERDA
  const y = doc.y
  doc.font('Jakarta-Bold').fontSize(8).fillColor('#555')
  COLUNAS.forEach((c) => {
    doc.text(c.titulo, x, y, { width: c.largura })
    x += c.largura
  })
  doc.fillColor('#000')
  doc.moveDown(0.4)
  doc.moveTo(MARGEM_ESQUERDA, doc.y).lineTo(MARGEM_ESQUERDA + LARGURA_TOTAL, doc.y).strokeColor('#ddd').stroke()
  doc.moveDown(0.3)
}

export function gerarFolhaFrequenciaPDF(res, { clinica, periodo, funcionarios }) {
  const doc = new PDFDocument({ margin: MARGEM_ESQUERDA, size: 'A4' })
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `inline; filename="folha-frequencia-${periodo.inicio}_a_${periodo.fim}.pdf"`)
  doc.pipe(res)
  registrarFontes(doc)

  doc.on('pageAdded', () => desenharMarcaDagua(doc, clinica))
  desenharMarcaDagua(doc, clinica)

  const paleta = desenharCabecalhoLogo(doc, clinica, 'Folha de Frequência')
  doc
    .fontSize(10)
    .font('Jakarta')
    .fillColor('#555')
    .text(`Período: ${formatarData(periodo.inicio)} a ${formatarData(periodo.fim)}`, { align: 'center' })
  doc.fillColor('#000')
  doc.moveDown(0.8)

  funcionarios.forEach((f, idx) => {
    if (idx > 0) doc.addPage()

    desenharFaixaSecao(doc, paleta, f.nome)
    doc
      .fontSize(9)
      .font('Jakarta')
      .fillColor('#555')
      .text(
        f.jornada?.variavel
          ? `Jornada variável (${f.jornada.dias_semana?.length ?? 0} dias) · ${formatarHoras(f.jornada.horas_semana)}/semana`
          : f.jornada
          ? `Jornada: ${f.jornada.entrada}–${f.jornada.saida}${
              f.jornada.inicio_intervalo && f.jornada.fim_intervalo ? ` (int. ${f.jornada.inicio_intervalo}–${f.jornada.fim_intervalo})` : ''
            } · ${formatarHoras(f.jornada.horas_dia)}/dia`
          : 'Jornada não cadastrada — saldo diário não calculado',
      )
    doc.fillColor('#000')
    doc.moveDown(0.3)

    desenharCabecalhoTabela(doc)

    if (f.dias.length === 0) {
      doc.font('Jakarta').fontSize(9).fillColor('#999').text('Nenhuma marcação de ponto neste período.')
      doc.fillColor('#000')
    }

    f.dias.forEach((d) => {
      if (doc.y > 760) {
        doc.addPage()
        desenharCabecalhoTabela(doc)
      }

      let x = MARGEM_ESQUERDA
      const y = doc.y
      doc.font('Jakarta').fontSize(8)
      const valores = [
        formatarData(d.data),
        horaCurta(d.entrada),
        horaCurta(d.inicio_intervalo),
        horaCurta(d.fim_intervalo),
        horaCurta(d.saida),
        formatarHoras(d.trabalhado),
        formatarHoras(d.previsto),
        d.saldo != null ? `${d.saldo > 0 ? '+' : ''}${formatarHoras(d.saldo)}` : d.completo ? '—' : 'sem saída',
      ]
      valores.forEach((v, i) => {
        if (i === 7 && d.saldo != null) doc.fillColor(d.saldo < 0 ? '#b91c1c' : '#15803d')
        if (i === 7 && d.saldo == null && !d.completo) doc.fillColor('#b45309')
        doc.text(v, x, y, { width: COLUNAS[i].largura })
        doc.fillColor('#000')
        x += COLUNAS[i].largura
      })
      doc.moveDown(0.5)
    })

    doc.moveDown(0.3)
    doc.moveTo(MARGEM_ESQUERDA, doc.y).lineTo(MARGEM_ESQUERDA + LARGURA_TOTAL, doc.y).strokeColor('#ddd').stroke()
    doc.moveDown(0.4)

    const t = f.totais
    const comSinal = (h) => (h == null ? '—' : `${h > 0 ? '+' : ''}${formatarHoras(h)}`)
    const corSaldo = (h) => (h == null || h === 0 ? '#000' : h < 0 ? '#b91c1c' : '#15803d')
    doc.font('Jakarta-Bold').fontSize(9)
    doc.text(`Total trabalhado no período: ${formatarHoras(t.horas_trabalhadas)}`)
    if (f.jornada) {
      doc.fillColor('#15803d').text(`Horas positivas no período: +${formatarHoras(t.horas_positivas)}`)
      doc.fillColor('#b91c1c').text(`Horas negativas no período: -${formatarHoras(t.horas_negativas)}`)
      doc.fillColor(corSaldo(t.saldo_periodo)).text(`Saldo do período: ${comSinal(t.saldo_periodo)}`)
      doc.fillColor(corSaldo(t.saldo_anterior)).text(`Saldo dos meses anteriores: ${comSinal(t.saldo_anterior)}`)
      doc.fillColor(corSaldo(t.saldo_acumulado)).text(`Banco de horas acumulado: ${comSinal(t.saldo_acumulado)}`)
      if (f.dias.some((d) => !d.completo)) {
        doc.font('Jakarta').fontSize(8).fillColor('#b45309')
          .text('Dias marcados "sem saída" não entram no saldo até a marcação ser corrigida.')
      }
    }
    doc.fillColor('#000')
  })

  desenharRodapeContato(doc, clinica)
  doc.end()
}
