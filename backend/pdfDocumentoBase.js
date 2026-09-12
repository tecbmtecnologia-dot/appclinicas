import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const EXTENSOES_SUPORTADAS_PDFKIT = new Set(['.png', '.jpg', '.jpeg'])
// Mesma lógica de upload.js/server.js: em produção (Render) os uploads ficam no disco
// persistente (UPLOADS_DIR), não dentro da pasta do backend — usar __dirname aqui faria
// o PDF nunca achar o logo em produção, mesmo com o arquivo salvo corretamente.
const UPLOADS_ROOT = process.env.UPLOADS_DIR || path.join(__dirname, 'uploads')

const FONTE_REGULAR = path.join(__dirname, 'fonts/PlusJakartaSans-Regular.ttf')
const FONTE_SEMIBOLD = path.join(__dirname, 'fonts/PlusJakartaSans-SemiBold.ttf')
const FONTE_BOLD = path.join(__dirname, 'fonts/PlusJakartaSans-Bold.ttf')

// Mesma fonte usada na interface web (Plus Jakarta Sans) — chamar uma vez por documento,
// logo após criar o PDFDocument, antes de qualquer `.font(...)`.
export function registrarFontes(doc) {
  doc.registerFont('Jakarta', FONTE_REGULAR)
  doc.registerFont('Jakarta-SemiBold', FONTE_SEMIBOLD)
  doc.registerFont('Jakarta-Bold', FONTE_BOLD)
}

const COR_PRIMARIA_PADRAO = '#0f766e'
export const COR_TEXTO = '#1e293b'
export const COR_TEXTO_SUAVE = '#64748b'

function hexParaRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '')
  if (!m) return null
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)]
}

function misturar(hex, alvo, quantidade) {
  const a = hexParaRgb(hex)
  const b = hexParaRgb(alvo)
  if (!a || !b) return hex
  const canal = (i) => Math.round(a[i] + (b[i] - a[i]) * quantidade)
  return `#${[canal(0), canal(1), canal(2)].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

// Deriva um tom claro (fundo de seção) e um escuro (texto sobre esse fundo) a partir da cor
// cadastrada em Configurações → Minha Clínica, pra qualquer relatório usar a mesma identidade visual.
export function paletaClinica(clinica) {
  const primaria = hexParaRgb(clinica?.cor_primaria) ? clinica.cor_primaria : COR_PRIMARIA_PADRAO
  return {
    primaria,
    escura: misturar(primaria, '#000000', 0.35),
    clara: misturar(primaria, '#ffffff', 0.92),
  }
}

function caminhoLogo(clinica) {
  if (!clinica?.logo_url) return null
  const ext = path.extname(clinica.logo_url).toLowerCase()
  if (!EXTENSOES_SUPORTADAS_PDFKIT.has(ext)) return null
  const relativo = clinica.logo_url.replace(/^\/?uploads\//, '')
  const caminho = path.join(UPLOADS_ROOT, relativo)
  return fs.existsSync(caminho) ? caminho : null
}

// Cabeçalho da primeira página: logo da clínica (ou, na ausência dele, um selo com a
// primeira letra do nome, na cor cadastrada) no canto superior direito, e o título do
// relatório à esquerda — sem faixa colorida de fundo nem nome da clínica em texto.
export function desenharCabecalhoLogo(doc, clinica, titulo) {
  const paleta = paletaClinica(clinica)
  const tamanho = 54
  const y = 24
  const x = doc.page.width - doc.page.margins.right - tamanho

  const logo = caminhoLogo(clinica)
  if (logo) {
    try {
      doc.image(logo, x, y, { fit: [tamanho, tamanho], align: 'center', valign: 'center' })
    } catch {
      desenharSeloIniciais(doc, clinica, paleta, x, y, tamanho)
    }
  } else {
    desenharSeloIniciais(doc, clinica, paleta, x, y, tamanho)
  }

  doc.fillColor(COR_TEXTO).font('Jakarta-Bold').fontSize(19)
  doc.text(titulo, doc.page.margins.left, y + tamanho / 2 - 9, { width: x - doc.page.margins.left - 16 })
  doc.fillColor('#000')

  doc.x = doc.page.margins.left
  doc.y = y + tamanho + 16
  return paleta
}

function desenharSeloIniciais(doc, clinica, paleta, x, y, tamanho) {
  const letra = (clinica?.nome?.trim()?.[0] ?? 'C').toUpperCase()
  doc.roundedRect(x, y, tamanho, tamanho, 10).fill(paleta.primaria)
  doc.fillColor('#fff').font('Jakarta-Bold').fontSize(tamanho * 0.5)
  doc.text(letra, x, y + tamanho * 0.22, { width: tamanho, align: 'center' })
  doc.fillColor('#000')
}

// Linha discreta abaixo da faixa de título (ex.: período do relatório, data de emissão).
export function desenharSubtitulo(doc, texto, opts) {
  doc.font('Jakarta').fontSize(9).fillColor(COR_TEXTO_SUAVE).text(texto, opts)
  doc.fillColor('#000')
  doc.moveDown(0.8)
}

// Cabeçalho de seção com barra lateral e fundo levemente tingidos na cor da clínica —
// mesmo estilo em todos os relatórios que têm blocos de conteúdo nomeados.
export function desenharFaixaSecao(doc, paleta, titulo) {
  const x = doc.page.margins.left
  const y = doc.y
  const larguraUtil = doc.page.width - doc.page.margins.left - doc.page.margins.right
  const altura = 22
  doc.rect(x, y, larguraUtil, altura).fill(paleta.clara)
  doc.rect(x, y, 3.5, altura).fill(paleta.primaria)
  doc.fillColor(paleta.escura).font('Jakarta-SemiBold').fontSize(10.5)
  doc.text(titulo.toUpperCase(), x + 14, y + 6.5, { characterSpacing: 0.3 })
  doc.fillColor('#000')
  doc.x = x
  doc.y = y + altura + 12
}

export function enderecoCompleto(p) {
  if (!p) return null
  if (p.logradouro) {
    const partes = [
      `${p.logradouro}${p.numero ? `, ${p.numero}` : ''}`,
      p.complemento,
      p.bairro,
      p.cidade && p.estado ? `${p.cidade}/${p.estado}` : p.cidade || p.estado,
      p.cep ? `CEP ${p.cep}` : null,
    ].filter(Boolean)
    return partes.join(' - ')
  }
  return p.endereco || null
}

export function formatarData(valor) {
  if (!valor) return '—'
  const d = new Date(valor.includes('T') || valor.includes(' ') ? valor.replace(' ', 'T') : `${valor}T00:00:00`)
  if (Number.isNaN(d.getTime())) return valor
  return d.toLocaleDateString('pt-BR')
}

// Desenhada antes do resto do conteúdo — no PDF, o que é pintado primeiro fica
// atrás do que vem depois, então a marca d'água precisa entrar logo no início.
export function desenharMarcaDagua(doc, clinica) {
  const tipo = clinica?.marca_dagua_tipo
  if (!tipo || tipo === 'nenhuma') return
  const { width, height } = doc.page
  const cursorX = doc.x
  const cursorY = doc.y

  doc.save()
  try {
    const logo = tipo === 'logo' ? caminhoLogo(clinica) : null
    if (logo) {
      const tamanho = Math.min(width, height) * 0.6
      doc.opacity(0.12)
      doc.image(logo, (width - tamanho) / 2, (height - tamanho) / 2, { width: tamanho, height: tamanho })
    } else if (tipo === 'texto' && clinica.marca_dagua_texto) {
      doc.opacity(0.1)
      doc.fillColor('#000').font('Jakarta-Bold').fontSize(54)
      doc.rotate(-45, { origin: [width / 2, height / 2] })
      doc.text(clinica.marca_dagua_texto, 0, height / 2 - 30, { width, align: 'center' })
    }
  } catch {
    // marca d'água é decorativa — qualquer falha (arquivo ausente/corrompido) não deve derrubar o PDF
  }
  doc.restore()
  // save()/restore() só cobre o estado gráfico do PDF (rotação/opacidade) — o cursor de
  // texto do pdfkit (doc.x/doc.y) é à parte e fica onde a marca d'água o deixou, então
  // precisa ser recolocado manualmente pra não bagunçar o layout do conteúdo real.
  doc.x = cursorX
  doc.y = cursorY
}

// Linha de assinatura do médico, ancorada perto do rodapé da página em vez de logo
// depois do conteúdo — sem isso, um texto curto (ex.: receita de 1 linha) deixava a
// assinatura lá no meio da página, longe de onde o médico realmente assina no papel.
// Se o conteúdo for longo o suficiente para já passar desse ponto, cede e desenha
// logo abaixo do conteúdo (com uma folga) pra não sobrepor o texto.
export function desenharAssinaturaMedico(doc, medico) {
  const largura = 240
  const x = (doc.page.width - largura) / 2
  const yAncoragem = doc.page.height - doc.page.margins.bottom - 90
  const y = Math.max(doc.y + 20, yAncoragem)

  doc.moveTo(x, y).lineTo(x + largura, y).strokeColor('#999').stroke()
  doc.fillColor('#000').fontSize(10).font('Jakarta').text(medico?.nome ? `Dr(a). ${medico.nome}` : '', x, y + 4, {
    width: largura,
    align: 'center',
  })
  if (medico?.crm) {
    doc.fontSize(9).fillColor('#555').text(`CRM: ${medico.crm}`, x, doc.y, { width: largura, align: 'center' })
    doc.fillColor('#000')
  }
}

// Endereço + telefone/e-mail da clínica, fixados perto do rodapé da página atual.
// `incluirEndereco: false` tira o endereço do rodapé (mantendo telefone/e-mail) —
// usado no relatório cirúrgico, que não deve exibir o endereço da clínica.
export function desenharRodapeContato(doc, clinica, { incluirEndereco = true } = {}) {
  const partes = [incluirEndereco ? clinica?.endereco : null, clinica?.telefone, clinica?.email].filter(Boolean)
  if (partes.length === 0) return
  const cursorX = doc.x
  const cursorY = doc.y

  const y = doc.page.height - doc.page.margins.bottom - 20
  doc.font('Jakarta').fontSize(8).fillColor('#777')
  doc.text(partes.join('  ·  '), doc.page.margins.left, y, {
    width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
    align: 'center',
  })
  doc.fillColor('#000')
  doc.x = cursorX
  doc.y = cursorY
}
