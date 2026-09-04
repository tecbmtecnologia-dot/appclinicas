import multer from 'multer'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { nanoid } from 'nanoid'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const TIPOS_PERMITIDOS = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])

function criarUploader(subpasta, limiteMB) {
  const dir = path.join(__dirname, 'uploads', subpasta)
  fs.mkdirSync(dir, { recursive: true })
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, dir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.png'
      cb(null, `${nanoid()}${ext}`)
    },
  })
  return multer({
    storage,
    limits: { fileSize: limiteMB * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (!TIPOS_PERMITIDOS.has(file.mimetype)) {
        return cb(new Error('Formato de imagem não suportado (use PNG, JPG ou WEBP)'))
      }
      cb(null, true)
    },
  })
}

export const uploadLogo = criarUploader('logos', 3)
export const uploadSelfiePonto = criarUploader('pontos', 4)
