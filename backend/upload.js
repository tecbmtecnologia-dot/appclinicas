import multer from 'multer'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { nanoid } from 'nanoid'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// Em produção (Render), UPLOADS_DIR aponta para o disco persistente, senão
// usa a pasta local (comportamento atual de desenvolvimento).
const uploadsRoot = process.env.UPLOADS_DIR || path.join(__dirname, 'uploads')

const TIPOS_PERMITIDOS = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])

function criarUploader(subpasta, limiteMB, opcoes = {}) {
  const tiposPermitidos = opcoes.tipos ?? TIPOS_PERMITIDOS
  const extensaoPadrao = opcoes.extensaoPadrao ?? '.png'
  const mensagemErro = opcoes.mensagemErro ?? 'Formato de imagem não suportado (use PNG, JPG ou WEBP)'
  const dir = path.join(uploadsRoot, subpasta)
  fs.mkdirSync(dir, { recursive: true })
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, dir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || extensaoPadrao
      cb(null, `${nanoid()}${ext}`)
    },
  })
  return multer({
    storage,
    limits: { fileSize: limiteMB * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (!tiposPermitidos.has(file.mimetype)) {
        return cb(new Error(mensagemErro))
      }
      cb(null, true)
    },
  })
}

export const uploadLogo = criarUploader('logos', 3)
export const uploadSelfiePonto = criarUploader('pontos', 4)
export const uploadFotoPaciente = criarUploader('pacientes', 4)
export const uploadFotoHistorico = criarUploader('fotos-paciente', 5)
export const uploadFotoUsuario = criarUploader('usuarios', 4)
export const uploadNotaFiscal = criarUploader('notas-fiscais', 8, {
  tipos: new Set(['application/pdf']),
  extensaoPadrao: '.pdf',
  mensagemErro: 'Envie um arquivo PDF',
})
export const uploadContratoPaciente = criarUploader('contratos-paciente', 8, {
  tipos: new Set(['application/pdf']),
  extensaoPadrao: '.pdf',
  mensagemErro: 'Envie um arquivo PDF',
})
export const uploadComprovante = criarUploader('comprovantes', 8, {
  tipos: new Set([...TIPOS_PERMITIDOS, 'application/pdf']),
  extensaoPadrao: '.pdf',
  mensagemErro: 'Envie uma imagem (PNG/JPG/WEBP) ou PDF',
})
