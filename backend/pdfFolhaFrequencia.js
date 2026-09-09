import PDFDocument from 'pdfkit'
import { desenharMarcaDagua, desenharRodapeContato, formatarData } from './pdfDocumentoBase.js'

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
  { titulo: 'Trabalhado', largura: 70 },
  { titulo: 'Saldo do dia', largura: 75 },
]
const MARGEM_ESQUERDA = 40
const LARGURA_TOTAL = COLUNAS.reduce((s, c) => s + c.largura, 0)

function desenharCabecalhoTabela(doc) {
  let x = MARGEM_ESQUERDA
  const y = doc.y
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#555')
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

  doc.on('pageAdded', () => desenharMarcaDagua(doc, clinica))
  desenharMarcaDagua(doc, clinica)

  doc.fontSize(15).font('Helvetica-Bold').text(clinica?.nome ?? 'Clínica', { align: 'left' })
  doc.fontSize(13).font('Helvetica-Bold').text('Folha de Frequência', { align: 'center' })
  doc
    .fontSize(10)
    .font('Helvetica')
    .fillColor('#555')
    .text(`Período: ${formatarData(periodo.inicio)} a ${formatarData(periodo.fim)}`, { align: 'center' })
  doc.fillColor('#000')
  doc.moveDown(1.2)

  funcionarios.forEach((f, idx) => {
    if (idx > 0) doc.addPage()

    doc.fontSize(12).font('Helvetica-Bold').text(f.nome)
    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#555')
      .text(
        f.jornada
          ? `Jornada: ${f.jornada.entrada}–${f.jornada.saida}${
              f.jornada.inicio_intervalo && f.jornada.fim_intervalo ? ` (int. ${f.jornada.inicio_intervalo}–${f.jornada.fim_intervalo})` : ''
            } · ${formatarHoras(f.jornada.horas_dia)}/dia`
          : 'Jornada não cadastrada — saldo diário não calculado',
      )
    doc.fillColor('#000')
    doc.moveDown(0.5)

    desenharCabecalhoTabela(doc)

    let totalTrabalhado = 0
    let totalPositivo = 0
    let totalNegativo = 0

    if (f.dias.length === 0) {
      doc.font('Helvetica').fontSize(9).fillColor('#999').text('Nenhuma marcação de ponto neste período.')
      doc.fillColor('#000')
    }

    f.dias.forEach((d) => {
      if (doc.y > 760) {
        doc.addPage()
        desenharCabecalhoTabela(doc)
      }

      let x = MARGEM_ESQUERDA
      const y = doc.y
      doc.font('Helvetica').fontSize(8)
      const valores = [
        formatarData(d.data),
        horaCurta(d.entrada),
        horaCurta(d.inicio_intervalo),
        horaCurta(d.fim_intervalo),
        horaCurta(d.saida),
        formatarHoras(d.trabalhado),
        d.saldo != null ? formatarHoras(d.saldo) : '—',
      ]
      valores.forEach((v, i) => {
        if (i === 6 && d.saldo != null) doc.fillColor(d.saldo < 0 ? '#b91c1c' : '#15803d')
        doc.text(v, x, y, { width: COLUNAS[i].largura })
        doc.fillColor('#000')
        x += COLUNAS[i].largura
      })
      doc.moveDown(0.5)

      totalTrabalhado += d.trabalhado
      if (d.saldo != null) {
        if (d.saldo > 0) totalPositivo += d.saldo
        else if (d.saldo < 0) totalNegativo += Math.abs(d.saldo)
      }
    })

    doc.moveDown(0.3)
    doc.moveTo(MARGEM_ESQUERDA, doc.y).lineTo(MARGEM_ESQUERDA + LARGURA_TOTAL, doc.y).strokeColor('#ddd').stroke()
    doc.moveDown(0.4)

    doc.font('Helvetica-Bold').fontSize(9)
    doc.text(`Total trabalhado no período: ${formatarHoras(totalTrabalhado)}`)
    doc.fillColor('#15803d').text(`Horas positivas (saldo a favor): ${formatarHoras(totalPositivo)}`)
    doc.fillColor('#b91c1c').text(`Horas negativas (saldo devedor): ${formatarHoras(totalNegativo)}`)
    doc.fillColor('#000')
  })

  desenharRodapeContato(doc, clinica)
  doc.end()
}
