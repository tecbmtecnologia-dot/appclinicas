import { DatabaseSync } from 'node:sqlite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.join(__dirname, 'data', 'clinica.db')

export const db = new DatabaseSync(dbPath)

db.exec(`
  CREATE TABLE IF NOT EXISTS clinicas (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    logo_url TEXT,
    cor_primaria TEXT,
    cnpj TEXT,
    endereco TEXT,
    especialidades TEXT,
    latitude REAL,
    longitude REAL,
    raio_metros INTEGER,
    ativo INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS unidades (
    id TEXT PRIMARY KEY,
    clinica_id TEXT NOT NULL REFERENCES clinicas(id),
    nome TEXT NOT NULL,
    endereco TEXT,
    telefone TEXT,
    latitude REAL,
    longitude REAL,
    raio_metros INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS pontos (
    id TEXT PRIMARY KEY,
    clinica_id TEXT NOT NULL REFERENCES clinicas(id),
    usuario_id TEXT NOT NULL REFERENCES usuarios(id),
    tipo TEXT NOT NULL,
    data_hora TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    distancia_metros REAL,
    dentro_raio INTEGER NOT NULL DEFAULT 0,
    foto_url TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS pacientes (
    id TEXT PRIMARY KEY,
    clinica_id TEXT NOT NULL REFERENCES clinicas(id),
    nome TEXT NOT NULL,
    cpf TEXT,
    rg TEXT,
    data_nascimento TEXT,
    telefone TEXT,
    email TEXT,
    convenio TEXT,
    endereco TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS cirurgias (
    id TEXT PRIMARY KEY,
    clinica_id TEXT NOT NULL REFERENCES clinicas(id),
    paciente_id TEXT NOT NULL REFERENCES pacientes(id),
    medico_id TEXT REFERENCES medicos(id),
    nome_cirurgia TEXT NOT NULL,
    data_prevista TEXT,
    local_hospital TEXT,
    equipe TEXT,
    observacoes TEXT,
    status TEXT NOT NULL DEFAULT 'rascunho',
    criado_por TEXT REFERENCES usuarios(id),
    finalizado_por TEXT REFERENCES usuarios(id),
    finalizado_em TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS orcamentos (
    id TEXT PRIMARY KEY,
    clinica_id TEXT NOT NULL REFERENCES clinicas(id),
    paciente_id TEXT NOT NULL REFERENCES pacientes(id),
    titulo TEXT NOT NULL,
    itens TEXT,
    valor_total REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pendente',
    observacoes TEXT,
    criado_por TEXT REFERENCES usuarios(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS pagamentos (
    id TEXT PRIMARY KEY,
    clinica_id TEXT NOT NULL REFERENCES clinicas(id),
    paciente_id TEXT NOT NULL REFERENCES pacientes(id),
    orcamento_id TEXT REFERENCES orcamentos(id),
    descricao TEXT NOT NULL,
    valor REAL NOT NULL,
    forma_pagamento TEXT,
    status TEXT NOT NULL DEFAULT 'pendente',
    data_vencimento TEXT,
    data_pagamento TEXT,
    criado_por TEXT REFERENCES usuarios(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS despesas_clinica (
    id TEXT PRIMARY KEY,
    clinica_id TEXT NOT NULL REFERENCES clinicas(id),
    descricao TEXT NOT NULL,
    categoria TEXT,
    valor REAL NOT NULL,
    data TEXT NOT NULL,
    forma_pagamento TEXT,
    status TEXT NOT NULL DEFAULT 'pago',
    criado_por TEXT REFERENCES usuarios(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS financas_pessoais (
    id TEXT PRIMARY KEY,
    usuario_id TEXT NOT NULL REFERENCES usuarios(id),
    tipo TEXT NOT NULL,
    descricao TEXT NOT NULL,
    categoria TEXT,
    valor REAL NOT NULL,
    data TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS reunioes (
    id TEXT PRIMARY KEY,
    clinica_id TEXT NOT NULL REFERENCES clinicas(id),
    titulo TEXT NOT NULL,
    pauta TEXT,
    data_hora TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'agendada',
    criado_por TEXT REFERENCES usuarios(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS reuniao_participantes (
    id TEXT PRIMARY KEY,
    reuniao_id TEXT NOT NULL REFERENCES reunioes(id),
    usuario_id TEXT NOT NULL REFERENCES usuarios(id)
  );

  CREATE TABLE IF NOT EXISTS notificacoes (
    id TEXT PRIMARY KEY,
    clinica_id TEXT NOT NULL REFERENCES clinicas(id),
    usuario_id TEXT NOT NULL REFERENCES usuarios(id),
    tipo TEXT NOT NULL,
    titulo TEXT NOT NULL,
    mensagem TEXT,
    referencia_tipo TEXT,
    referencia_id TEXT,
    lida INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS medicos (
    id TEXT PRIMARY KEY,
    clinica_id TEXT NOT NULL REFERENCES clinicas(id),
    nome TEXT NOT NULL,
    crm TEXT,
    especialidade TEXT,
    telefone TEXT,
    email TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS agendamentos (
    id TEXT PRIMARY KEY,
    clinica_id TEXT NOT NULL REFERENCES clinicas(id),
    paciente_id TEXT NOT NULL REFERENCES pacientes(id),
    medico_id TEXT NOT NULL REFERENCES medicos(id),
    data_hora TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'agendado',
    tipo TEXT NOT NULL DEFAULT 'presencial',
    observacoes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS prontuarios (
    id TEXT PRIMARY KEY,
    clinica_id TEXT NOT NULL REFERENCES clinicas(id),
    paciente_id TEXT NOT NULL REFERENCES pacientes(id),
    medico_id TEXT NOT NULL REFERENCES medicos(id),
    data TEXT NOT NULL,
    queixa TEXT,
    diagnostico TEXT,
    prescricao TEXT,
    observacoes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS mensagens (
    id TEXT PRIMARY KEY,
    clinica_id TEXT NOT NULL REFERENCES clinicas(id),
    sala TEXT NOT NULL,
    remetente TEXT NOT NULL,
    remetente_tipo TEXT NOT NULL,
    texto TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS usuarios (
    id TEXT PRIMARY KEY,
    clinica_id TEXT REFERENCES clinicas(id),
    nome TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    senha_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'recepcao',
    medico_id TEXT REFERENCES medicos(id),
    unidade_id TEXT REFERENCES unidades(id),
    carga_horaria_mensal_horas REAL NOT NULL DEFAULT 160,
    ativo INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_unidades_clinica ON unidades(clinica_id);
  CREATE INDEX IF NOT EXISTS idx_pontos_clinica ON pontos(clinica_id);
  CREATE INDEX IF NOT EXISTS idx_pontos_usuario ON pontos(usuario_id);
  CREATE INDEX IF NOT EXISTS idx_pontos_data ON pontos(data_hora);
  CREATE INDEX IF NOT EXISTS idx_pacientes_clinica ON pacientes(clinica_id);
  CREATE INDEX IF NOT EXISTS idx_cirurgias_clinica ON cirurgias(clinica_id);
  CREATE INDEX IF NOT EXISTS idx_cirurgias_paciente ON cirurgias(paciente_id);
  CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario ON notificacoes(usuario_id);
  CREATE INDEX IF NOT EXISTS idx_reunioes_clinica ON reunioes(clinica_id);
  CREATE INDEX IF NOT EXISTS idx_reuniao_participantes_reuniao ON reuniao_participantes(reuniao_id);
  CREATE INDEX IF NOT EXISTS idx_reuniao_participantes_usuario ON reuniao_participantes(usuario_id);
  CREATE INDEX IF NOT EXISTS idx_orcamentos_clinica ON orcamentos(clinica_id);
  CREATE INDEX IF NOT EXISTS idx_orcamentos_paciente ON orcamentos(paciente_id);
  CREATE INDEX IF NOT EXISTS idx_pagamentos_clinica ON pagamentos(clinica_id);
  CREATE INDEX IF NOT EXISTS idx_pagamentos_paciente ON pagamentos(paciente_id);
  CREATE INDEX IF NOT EXISTS idx_despesas_clinica ON despesas_clinica(clinica_id);
  CREATE INDEX IF NOT EXISTS idx_financas_pessoais_usuario ON financas_pessoais(usuario_id);
  CREATE INDEX IF NOT EXISTS idx_medicos_clinica ON medicos(clinica_id);
  CREATE INDEX IF NOT EXISTS idx_agendamentos_clinica ON agendamentos(clinica_id);
  CREATE INDEX IF NOT EXISTS idx_agendamentos_data ON agendamentos(data_hora);
  CREATE INDEX IF NOT EXISTS idx_prontuarios_clinica ON prontuarios(clinica_id);
  CREATE INDEX IF NOT EXISTS idx_prontuarios_paciente ON prontuarios(paciente_id);
  CREATE INDEX IF NOT EXISTS idx_mensagens_sala ON mensagens(sala);
  CREATE INDEX IF NOT EXISTS idx_usuarios_clinica ON usuarios(clinica_id);
`)

function migrarColunas(tabela, colunas) {
  const existentes = db.prepare(`PRAGMA table_info(${tabela})`).all().map((c) => c.name)
  for (const [coluna, tipo] of colunas) {
    if (!existentes.includes(coluna)) {
      db.exec(`ALTER TABLE ${tabela} ADD COLUMN ${coluna} ${tipo}`)
    }
  }
}

migrarColunas('clinicas', [
  ['cnpj', 'TEXT'],
  ['endereco', 'TEXT'],
  ['especialidades', 'TEXT'],
  ['latitude', 'REAL'],
  ['longitude', 'REAL'],
  ['raio_metros', 'INTEGER'],
])

migrarColunas('unidades', [
  ['latitude', 'REAL'],
  ['longitude', 'REAL'],
  ['raio_metros', 'INTEGER'],
])

migrarColunas('usuarios', [
  ['unidade_id', 'TEXT'],
  ['carga_horaria_mensal_horas', 'REAL NOT NULL DEFAULT 160'],
])

migrarColunas('pacientes', [['rg', 'TEXT']])

const { total } = db.prepare('SELECT COUNT(*) AS total FROM usuarios').get()
if (total === 0) {
  const senha = 'admin123'
  const clinicaId = nanoid()
  db.prepare(
    `INSERT INTO clinicas (id, nome, slug, cor_primaria) VALUES (?, 'Clínica Demo', 'demo', '#0f766e')`,
  ).run(clinicaId)

  db.prepare(
    `INSERT INTO usuarios (id, clinica_id, nome, email, senha_hash, role) VALUES (?, NULL, 'Administrador da Plataforma', 'super@plataforma.local', ?, 'super_admin')`,
  ).run(nanoid(), bcrypt.hashSync(senha, 10))

  db.prepare(
    `INSERT INTO usuarios (id, clinica_id, nome, email, senha_hash, role) VALUES (?, ?, 'Administrador', 'admin@clinica.local', ?, 'admin')`,
  ).run(nanoid(), clinicaId, bcrypt.hashSync(senha, 10))

  console.log('Usuário da plataforma (gerencia as clínicas) -> super@plataforma.local / admin123')
  console.log('Usuário admin da Clínica Demo -> admin@clinica.local / admin123')
  console.log('Troque essas senhas depois do primeiro acesso.')
}
