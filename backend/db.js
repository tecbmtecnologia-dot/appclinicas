import pg from 'pg'
import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const { Pool } = pg
const __dirname = path.dirname(fileURLToPath(import.meta.url))
// CA raiz do Supabase (mesmo certificado público para todos os projetos —
// baixado de Project Settings -> Database -> SSL Configuration). Sem isso o
// driver aceitaria qualquer certificado (risco de man-in-the-middle);
// com isso, a conexão só fecha com um servidor que apresente um certificado
// assinado por essa CA.
const supabaseCa = fs.readFileSync(path.join(__dirname, 'supabase-ca.crt'), 'utf8')

// COUNT(*)/SUM em bigint (ex: contagens) voltam do Postgres como string por
// padrão do driver, pra não perder precisão acima de Number.MAX_SAFE_INTEGER.
// Não é um risco real pra volume de dados de uma clínica — e o código (herdado
// do SQLite) espera número puro nesses campos (comparações, somas, JSON pro
// frontend). Reconfigura só os OIDs 20 (int8/bigint) e 1700 (numeric) globalmente.
pg.types.setTypeParser(20, (v) => (v === null ? null : Number(v)))
pg.types.setTypeParser(1700, (v) => (v === null ? null : Number(v)))

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL não definida. Configure a connection string do Supabase (Session pooler) em backend/.env.',
  )
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { ca: supabaseCa, rejectUnauthorized: true },
})

// Traduz os placeholders `?` (estilo node:sqlite/better-sqlite3, usados em
// todas as rotas) para `$1, $2, ...` (estilo pg), sem precisar editar as
// ~404 strings SQL espalhadas nas rotas.
function paraPlaceholdersPg(sql) {
  let n = 0
  return sql.replace(/\?/g, () => `$${++n}`)
}

function normalizarParams(args) {
  if (args.length === 1 && Array.isArray(args[0])) return args[0]
  return args
}

function prepareCom(executor) {
  return (sql) => {
    const texto = paraPlaceholdersPg(sql)
    return {
      async get(...args) {
        const { rows } = await executor.query(texto, normalizarParams(args))
        return rows[0]
      },
      async all(...args) {
        const { rows } = await executor.query(texto, normalizarParams(args))
        return rows
      },
      async run(...args) {
        const resultado = await executor.query(texto, normalizarParams(args))
        return { changes: resultado.rowCount }
      },
    }
  }
}

export const db = {
  prepare: prepareCom(pool),
  async exec(sql) {
    await pool.query(sql)
  },
  // db.transaction(async (tx) => { ...tx.prepare(...)... }) — tx tem a mesma
  // API (prepare/get/all/run), mas roda tudo dentro de BEGIN/COMMIT/ROLLBACK
  // num client dedicado do pool.
  transaction(fn) {
    return async (...args) => {
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        const tx = { prepare: prepareCom(client) }
        const resultado = await fn(tx, ...args)
        await client.query('COMMIT')
        return resultado
      } catch (erro) {
        await client.query('ROLLBACK')
        throw erro
      } finally {
        client.release()
      }
    }
  },
}

const { rows } = await pool.query('SELECT COUNT(*)::int AS total FROM usuarios')
if (rows[0].total === 0) {
  const senha = 'admin123'
  const clinicaId = nanoid()
  await pool.query(
    `INSERT INTO clinicas (id, nome, slug, cor_primaria) VALUES ($1, 'Clínica Demo', 'demo', '#0f766e')`,
    [clinicaId],
  )

  await pool.query(
    `INSERT INTO usuarios (id, clinica_id, nome, email, senha_hash, role) VALUES ($1, NULL, 'Administrador da Plataforma', 'super@plataforma.local', $2, 'super_admin')`,
    [nanoid(), bcrypt.hashSync(senha, 10)],
  )

  await pool.query(
    `INSERT INTO usuarios (id, clinica_id, nome, email, senha_hash, role) VALUES ($1, $2, 'Administrador', 'admin@clinica.local', $3, 'admin')`,
    [nanoid(), clinicaId, bcrypt.hashSync(senha, 10)],
  )

  console.log('Usuário da plataforma (gerencia as clínicas) -> super@plataforma.local / admin123')
  console.log('Usuário admin da Clínica Demo -> admin@clinica.local / admin123')
  console.log('Troque essas senhas depois do primeiro acesso.')
}
