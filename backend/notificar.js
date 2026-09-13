import { nanoid } from 'nanoid'
import { db } from './db.js'

export async function criarNotificacao({ clinicaId, usuarioId, tipo, titulo, mensagem, referenciaTipo, referenciaId }) {
  const id = nanoid()
  await db.prepare(
    `INSERT INTO notificacoes (id, clinica_id, usuario_id, tipo, titulo, mensagem, referencia_tipo, referencia_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, clinicaId, usuarioId, tipo, titulo, mensagem ?? null, referenciaTipo ?? null, referenciaId ?? null)
  return await db.prepare('SELECT * FROM notificacoes WHERE id = ?').get(id)
}
