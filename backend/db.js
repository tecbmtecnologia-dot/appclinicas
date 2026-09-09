import { DatabaseSync } from 'node:sqlite'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// Em produção (Render), DATA_DIR aponta para o disco persistente, senão usa
// a pasta local (comportamento atual de desenvolvimento).
const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data')
fs.mkdirSync(dataDir, { recursive: true })
const dbPath = path.join(dataDir, 'clinica.db')

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
    agendamento_id TEXT REFERENCES agendamentos(id),
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

  CREATE TABLE IF NOT EXISTS itens_orcamento_catalogo (
    id TEXT PRIMARY KEY,
    clinica_id TEXT NOT NULL REFERENCES clinicas(id),
    nome TEXT NOT NULL,
    valor REAL NOT NULL DEFAULT 0,
    ativo INTEGER NOT NULL DEFAULT 1,
    criado_por TEXT REFERENCES usuarios(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
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
    comprovante_url TEXT,
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
    usuario_id_referencia TEXT REFERENCES usuarios(id),
    competencia TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS comissoes_config (
    usuario_id TEXT PRIMARY KEY REFERENCES usuarios(id),
    clinica_id TEXT NOT NULL REFERENCES clinicas(id),
    valor_fixo_mensal REAL NOT NULL DEFAULT 0,
    atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS cirurgia_participantes (
    id TEXT PRIMARY KEY,
    cirurgia_id TEXT NOT NULL REFERENCES cirurgias(id),
    usuario_id TEXT NOT NULL REFERENCES usuarios(id),
    valor_comissao REAL NOT NULL DEFAULT 0,
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

  CREATE TABLE IF NOT EXISTS hospitais (
    id TEXT PRIMARY KEY,
    clinica_id TEXT NOT NULL REFERENCES clinicas(id),
    nome TEXT NOT NULL,
    endereco TEXT,
    telefone TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS medico_hospitais (
    id TEXT PRIMARY KEY,
    medico_id TEXT NOT NULL REFERENCES medicos(id),
    hospital_id TEXT NOT NULL REFERENCES hospitais(id)
  );

  CREATE TABLE IF NOT EXISTS itens_cirurgia_catalogo (
    id TEXT PRIMARY KEY,
    clinica_id TEXT NOT NULL REFERENCES clinicas(id),
    nome TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS cirurgia_itens (
    id TEXT PRIMARY KEY,
    cirurgia_id TEXT NOT NULL REFERENCES cirurgias(id),
    item_id TEXT NOT NULL REFERENCES itens_cirurgia_catalogo(id)
  );

  CREATE TABLE IF NOT EXISTS auxiliares (
    id TEXT PRIMARY KEY,
    clinica_id TEXT NOT NULL REFERENCES clinicas(id),
    nome TEXT NOT NULL,
    funcao TEXT,
    telefone TEXT,
    email TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS cirurgia_auxiliares (
    id TEXT PRIMARY KEY,
    cirurgia_id TEXT NOT NULL REFERENCES cirurgias(id),
    auxiliar_id TEXT NOT NULL REFERENCES auxiliares(id)
  );

  CREATE TABLE IF NOT EXISTS tipos_procedimento (
    id TEXT PRIMARY KEY,
    clinica_id TEXT NOT NULL REFERENCES clinicas(id),
    nome TEXT NOT NULL,
    gera_cirurgia INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS agendamentos (
    id TEXT PRIMARY KEY,
    clinica_id TEXT NOT NULL REFERENCES clinicas(id),
    paciente_id TEXT NOT NULL REFERENCES pacientes(id),
    medico_id TEXT NOT NULL REFERENCES medicos(id),
    tipo_procedimento_id TEXT REFERENCES tipos_procedimento(id),
    data_hora TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'agendado',
    tipo TEXT NOT NULL DEFAULT 'presencial',
    observacoes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Compromissos do médico sem paciente vinculado (reunião, cirurgia externa,
  -- bloqueio de agenda etc.) — marcado pela recepção junto com os agendamentos,
  -- aparece junto na agenda do médico pra não dar horário duplicado.
  CREATE TABLE IF NOT EXISTS compromissos (
    id TEXT PRIMARY KEY,
    clinica_id TEXT NOT NULL REFERENCES clinicas(id),
    medico_id TEXT NOT NULL REFERENCES medicos(id),
    titulo TEXT NOT NULL,
    data_hora TEXT NOT NULL,
    observacoes TEXT,
    criado_por TEXT REFERENCES usuarios(id),
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
    evolucao TEXT,
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

  CREATE TABLE IF NOT EXISTS perfis_instalacao (
    id TEXT PRIMARY KEY,
    clinica_id TEXT NOT NULL REFERENCES clinicas(id),
    nome TEXT NOT NULL,
    slug TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS fotos_paciente (
    id TEXT PRIMARY KEY,
    clinica_id TEXT NOT NULL REFERENCES clinicas(id),
    paciente_id TEXT NOT NULL REFERENCES pacientes(id),
    tipo TEXT NOT NULL,
    data TEXT NOT NULL,
    foto_url TEXT NOT NULL,
    observacoes TEXT,
    criado_por TEXT REFERENCES usuarios(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Agenda pessoal de quem tem perfil pj (fisioterapeuta/consultora) — sem
  -- médico responsável vinculado (ao contrário de agendamentos/prontuários),
  -- é só uma marcação simples: "eu vou atender esse paciente nesse horário",
  -- que também aparece no histórico do paciente como uma anotação.
  CREATE TABLE IF NOT EXISTS sessoes_fisioterapia (
    id TEXT PRIMARY KEY,
    clinica_id TEXT NOT NULL REFERENCES clinicas(id),
    paciente_id TEXT NOT NULL REFERENCES pacientes(id),
    usuario_id TEXT NOT NULL REFERENCES usuarios(id),
    data_hora TEXT NOT NULL,
    observacoes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS notas_fiscais_paciente (
    id TEXT PRIMARY KEY,
    clinica_id TEXT NOT NULL REFERENCES clinicas(id),
    paciente_id TEXT NOT NULL REFERENCES pacientes(id),
    descricao TEXT,
    arquivo_url TEXT NOT NULL,
    nome_arquivo TEXT,
    criado_por TEXT REFERENCES usuarios(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS contratos_paciente (
    id TEXT PRIMARY KEY,
    clinica_id TEXT NOT NULL REFERENCES clinicas(id),
    paciente_id TEXT NOT NULL REFERENCES pacientes(id),
    descricao TEXT,
    arquivo_url TEXT NOT NULL,
    nome_arquivo TEXT,
    criado_por TEXT REFERENCES usuarios(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS comissoes_avulsas (
    id TEXT PRIMARY KEY,
    clinica_id TEXT NOT NULL REFERENCES clinicas(id),
    usuario_id TEXT NOT NULL REFERENCES usuarios(id),
    data TEXT NOT NULL,
    paciente_nome TEXT,
    nome_cirurgia TEXT,
    descricao TEXT,
    valor REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendente',
    observacao_aprovacao TEXT,
    criado_por TEXT REFERENCES usuarios(id),
    aprovado_por TEXT REFERENCES usuarios(id),
    aprovado_em TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS modelos_receita (
    id TEXT PRIMARY KEY,
    clinica_id TEXT NOT NULL REFERENCES clinicas(id),
    usuario_id TEXT NOT NULL REFERENCES usuarios(id),
    nome TEXT NOT NULL,
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
  CREATE INDEX IF NOT EXISTS idx_itens_orcamento_catalogo_clinica ON itens_orcamento_catalogo(clinica_id);
  CREATE INDEX IF NOT EXISTS idx_pagamentos_clinica ON pagamentos(clinica_id);
  CREATE INDEX IF NOT EXISTS idx_pagamentos_paciente ON pagamentos(paciente_id);
  CREATE INDEX IF NOT EXISTS idx_despesas_clinica ON despesas_clinica(clinica_id);
  CREATE INDEX IF NOT EXISTS idx_comissoes_config_clinica ON comissoes_config(clinica_id);
  CREATE INDEX IF NOT EXISTS idx_cirurgia_participantes_cirurgia ON cirurgia_participantes(cirurgia_id);
  CREATE INDEX IF NOT EXISTS idx_cirurgia_participantes_usuario ON cirurgia_participantes(usuario_id);
  CREATE INDEX IF NOT EXISTS idx_financas_pessoais_usuario ON financas_pessoais(usuario_id);
  CREATE INDEX IF NOT EXISTS idx_medicos_clinica ON medicos(clinica_id);
  CREATE INDEX IF NOT EXISTS idx_agendamentos_clinica ON agendamentos(clinica_id);
  CREATE INDEX IF NOT EXISTS idx_agendamentos_data ON agendamentos(data_hora);
  CREATE INDEX IF NOT EXISTS idx_compromissos_medico ON compromissos(medico_id);
  CREATE INDEX IF NOT EXISTS idx_compromissos_data ON compromissos(data_hora);
  CREATE INDEX IF NOT EXISTS idx_prontuarios_clinica ON prontuarios(clinica_id);
  CREATE INDEX IF NOT EXISTS idx_prontuarios_paciente ON prontuarios(paciente_id);
  CREATE INDEX IF NOT EXISTS idx_mensagens_sala ON mensagens(sala);
  CREATE INDEX IF NOT EXISTS idx_usuarios_clinica ON usuarios(clinica_id);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_perfis_instalacao_slug ON perfis_instalacao(clinica_id, slug);
  CREATE INDEX IF NOT EXISTS idx_modelos_receita_usuario ON modelos_receita(usuario_id);
  CREATE INDEX IF NOT EXISTS idx_itens_cirurgia_catalogo_clinica ON itens_cirurgia_catalogo(clinica_id);
  CREATE INDEX IF NOT EXISTS idx_cirurgia_itens_cirurgia ON cirurgia_itens(cirurgia_id);
  CREATE INDEX IF NOT EXISTS idx_hospitais_clinica ON hospitais(clinica_id);
  CREATE INDEX IF NOT EXISTS idx_medico_hospitais_medico ON medico_hospitais(medico_id);
  CREATE INDEX IF NOT EXISTS idx_auxiliares_clinica ON auxiliares(clinica_id);
  CREATE INDEX IF NOT EXISTS idx_cirurgia_auxiliares_cirurgia ON cirurgia_auxiliares(cirurgia_id);
  CREATE INDEX IF NOT EXISTS idx_comissoes_avulsas_usuario ON comissoes_avulsas(usuario_id);
  CREATE INDEX IF NOT EXISTS idx_comissoes_avulsas_clinica ON comissoes_avulsas(clinica_id);
  CREATE INDEX IF NOT EXISTS idx_notas_fiscais_paciente ON notas_fiscais_paciente(paciente_id);
  CREATE INDEX IF NOT EXISTS idx_contratos_paciente ON contratos_paciente(paciente_id);
  CREATE INDEX IF NOT EXISTS idx_fotos_paciente_paciente ON fotos_paciente(paciente_id);
  CREATE INDEX IF NOT EXISTS idx_tipos_procedimento_clinica ON tipos_procedimento(clinica_id);
  CREATE INDEX IF NOT EXISTS idx_sessoes_fisioterapia_paciente ON sessoes_fisioterapia(paciente_id);
  CREATE INDEX IF NOT EXISTS idx_sessoes_fisioterapia_usuario ON sessoes_fisioterapia(usuario_id);
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
  ['marca_dagua_tipo', "TEXT NOT NULL DEFAULT 'nenhuma'"],
  ['marca_dagua_texto', 'TEXT'],
  ['telefone', 'TEXT'],
  ['email', 'TEXT'],
])

migrarColunas('unidades', [
  ['latitude', 'REAL'],
  ['longitude', 'REAL'],
  ['raio_metros', 'INTEGER'],
])

migrarColunas('usuarios', [
  ['unidade_id', 'TEXT'],
  ['carga_horaria_mensal_horas', 'REAL NOT NULL DEFAULT 160'],
  ['horario_entrada', 'TEXT'],
  ['horario_inicio_intervalo', 'TEXT'],
  ['horario_fim_intervalo', 'TEXT'],
  ['horario_saida', 'TEXT'],
  ['dias_trabalho_semana', 'INTEGER NOT NULL DEFAULT 5'],
  ['foto_url', 'TEXT'],
  ['carga_horaria_semanal_horas', 'REAL'],
  ['cargo', 'TEXT'],
])

migrarColunas('pontos', [
  ['lancado_manualmente', 'INTEGER NOT NULL DEFAULT 0'],
  ['criado_por', 'TEXT'],
])

migrarColunas('prontuarios', [
  ['evolucao', 'TEXT'],
  ['criado_por', 'TEXT REFERENCES usuarios(id)'],
])

migrarColunas('cirurgias', [['hospital_id', 'TEXT REFERENCES hospitais(id)']])

migrarColunas('cirurgia_itens', [['quantidade', 'INTEGER NOT NULL DEFAULT 1']])

migrarColunas('comissoes_avulsas', [
  ['paciente_nome', 'TEXT'],
  ['nome_cirurgia', 'TEXT'],
])

migrarColunas('pacientes', [
  ['rg', 'TEXT'],
  ['foto_url', 'TEXT'],
  ['cep', 'TEXT'],
  ['logradouro', 'TEXT'],
  ['numero', 'TEXT'],
  ['complemento', 'TEXT'],
  ['bairro', 'TEXT'],
  ['cidade', 'TEXT'],
  ['estado', 'TEXT'],
  ['estado_civil', 'TEXT'],
  ['data_primeira_consulta', 'TEXT'],
  ['nome_responsavel', 'TEXT'],
  ['profissao', 'TEXT'],
  ['cor_raca', 'TEXT'],
  ['peso_kg', 'REAL'],
  ['altura_cm', 'REAL'],
  ['indicado_por', 'TEXT'],
  ['plano', 'TEXT'],
  ['validade_carteira', 'TEXT'],
  ['cartao_cns', 'TEXT'],
])

migrarColunas('pagamentos', [['comprovante_url', 'TEXT']])

migrarColunas('agendamentos', [['tipo_procedimento_id', 'TEXT REFERENCES tipos_procedimento(id)']])

migrarColunas('tipos_procedimento', [['gera_cirurgia', 'INTEGER NOT NULL DEFAULT 0']])

migrarColunas('cirurgias', [['agendamento_id', 'TEXT REFERENCES agendamentos(id)']])

migrarColunas('despesas_clinica', [
  ['usuario_id_referencia', 'TEXT'],
  ['competencia', 'TEXT'],
])

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
