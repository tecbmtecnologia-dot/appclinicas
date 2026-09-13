// Aplica um arquivo .sql (schema.postgres.sql ou constraints.postgres.sql) contra
// o Postgres apontado por DATABASE_URL. Uso:
//   node scripts/aplicar-schema.js ../schema.postgres.sql
//   node scripts/aplicar-schema.js ../constraints.postgres.sql
import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const { Pool } = pg
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const arquivo = process.argv[2]
if (!arquivo) {
  console.error('Uso: node scripts/aplicar-schema.js <caminho-do-arquivo.sql>')
  process.exit(1)
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL não definida (backend/.env).')
  process.exit(1)
}

const sql = fs.readFileSync(path.resolve(__dirname, arquivo), 'utf8')
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })

console.log(`Aplicando ${arquivo} (${sql.length} caracteres)...`)
await pool.query(sql)
console.log('Concluído.')
await pool.end()
