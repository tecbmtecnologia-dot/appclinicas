// Script de migração de dados: SQLite local (backend/data/clinica.db) -> Postgres (Supabase).
// Roda uma única vez (ou de novo, com segurança, graças ao ON CONFLICT DO NOTHING),
// depois de já ter aplicado schema.postgres.sql no banco Postgres novo.
// Uso:
//   DATABASE_URL="postgresql://...pooler.supabase.com:5432/postgres" node scripts/migrar-para-postgres.js
//
// Não precisa rodar constraints.postgres.sql antes deste script — de propósito,
// pra não travar a carga por causa de dados órfãos pré-existentes. Rode
// constraints.postgres.sql DEPOIS deste script.

import 'dotenv/config'
import { DatabaseSync } from 'node:sqlite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const { Pool } = pg
const __dirname = path.dirname(fileURLToPath(import.meta.url))

if (!process.env.DATABASE_URL) {
  console.error('Defina DATABASE_URL (connection string do Supabase) antes de rodar este script.')
  process.exit(1)
}

const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data')
const dbPath = path.join(dataDir, 'clinica.db')

const sqlite = new DatabaseSync(dbPath, { readOnly: true })
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })

const tabelas = sqlite
  .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`)
  .all()
  .map((r) => r.name)

console.log(`Encontradas ${tabelas.length} tabelas no SQLite: ${tabelas.join(', ')}`)

let totalLinhas = 0

for (const tabela of tabelas) {
  const linhas = sqlite.prepare(`SELECT * FROM ${tabela}`).all()
  if (linhas.length === 0) {
    console.log(`${tabela}: 0 linhas, pulando.`)
    continue
  }

  const colunas = Object.keys(linhas[0])
  const placeholders = colunas.map((_, i) => `$${i + 1}`).join(', ')
  const colunasSql = colunas.join(', ')
  const chavePrimaria = tabela === 'comissoes_config' ? 'usuario_id' : 'id'
  const sql = `INSERT INTO ${tabela} (${colunasSql}) VALUES (${placeholders}) ON CONFLICT (${chavePrimaria}) DO NOTHING`

  let inseridas = 0
  for (const linha of linhas) {
    const valores = colunas.map((c) => linha[c])
    const resultado = await pool.query(sql, valores)
    inseridas += resultado.rowCount
  }
  console.log(`${tabela}: ${inseridas}/${linhas.length} linhas inseridas.`)
  totalLinhas += inseridas
}

console.log(`Concluído. ${totalLinhas} linhas migradas no total.`)
console.log('Agora rode constraints.postgres.sql (Supabase SQL editor ou psql) para ativar as foreign keys.')

await pool.end()
sqlite.close()
