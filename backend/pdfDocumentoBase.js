import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const EXTENSOES_SUPORTADAS_PDFKIT = new Set(['.png', '.jpg', '.jpeg'])

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
    if (tipo === 'logo' && clinica.logo_url) {
      const ext = path.extname(clinica.logo_url).toLowerCase()
      if (EXTENSOES_SUPORTADAS_PDFKIT.has(ext)) {
        const caminho = path.join(__dirname, clinica.logo_url.replace(/^\//, ''))
        if (fs.existsSync(caminho)) {
          const tamanho = Math.min(width, height) * 0.6
          doc.opacity(0.12)
          doc.image(caminho, (width - tamanho) / 2, (height - tamanho) / 2, { width: tamanho, height: tamanho })
        }
      }
    } else if (tipo === 'texto' && clinica.marca_dagua_texto) {
      doc.opacity(0.1)
      doc.fillColor('#000').font('Helvetica-Bold').fontSize(54)
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

// Endereço + telefone/e-mail da clínica, fixados perto do rodapé da página atual.
export function desenharRodapeContato(doc, clinica) {
  const partes = [clinica?.endereco, clinica?.telefone, clinica?.email].filter(Boolean)
  if (partes.length === 0) return
  const cursorX = doc.x
  const cursorY = doc.y

  const y = doc.page.height - doc.page.margins.bottom - 20
  doc.fontSize(8).fillColor('#777')
  doc.text(partes.join('  ·  '), doc.page.margins.left, y, {
    width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
    align: 'center',
  })
  doc.fillColor('#000')
  doc.x = cursorX
  doc.y = cursorY
}
