-- Schema Postgres (Supabase) equivalente ao schema SQLite de db.js.
-- Sem FOREIGN KEY inline de propósito (evita problema de ordem de criação —
-- várias tabelas referenciam `usuarios`, que só existia por último no schema
-- SQLite). As FKs são adicionadas depois, uma por uma, em constraints.postgres.sql.
-- Rodar este arquivo uma única vez contra o banco Postgres novo (vazio).

CREATE TABLE IF NOT EXISTS clinicas (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  logo_app_url TEXT,
  cor_primaria TEXT,
  cnpj TEXT,
  endereco TEXT,
  especialidades TEXT,
  latitude REAL,
  longitude REAL,
  raio_metros INTEGER,
  marca_dagua_tipo TEXT NOT NULL DEFAULT 'nenhuma',
  marca_dagua_texto TEXT,
  telefone TEXT,
  email TEXT,
  modulos_opcionais TEXT,
  ativo INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS unidades (
  id TEXT PRIMARY KEY,
  clinica_id TEXT NOT NULL,
  nome TEXT NOT NULL,
  endereco TEXT,
  telefone TEXT,
  latitude REAL,
  longitude REAL,
  raio_metros INTEGER,
  created_at TEXT NOT NULL DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS usuarios (
  id TEXT PRIMARY KEY,
  clinica_id TEXT,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  senha_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'recepcao',
  medico_id TEXT,
  unidade_id TEXT,
  carga_horaria_mensal_horas REAL NOT NULL DEFAULT 160,
  horario_entrada TEXT,
  horario_inicio_intervalo TEXT,
  horario_fim_intervalo TEXT,
  horario_saida TEXT,
  dias_trabalho_semana INTEGER NOT NULL DEFAULT 5,
  foto_url TEXT,
  carga_horaria_semanal_horas REAL,
  cargo TEXT,
  jornada_semanal TEXT,
  dia_fechamento_folha INTEGER NOT NULL DEFAULT 20,
  data_admissao TEXT,
  sexo TEXT,
  ativo INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS medicos (
  id TEXT PRIMARY KEY,
  clinica_id TEXT NOT NULL,
  nome TEXT NOT NULL,
  crm TEXT,
  especialidade TEXT,
  telefone TEXT,
  email TEXT,
  intervalo_slot_minutos INTEGER NOT NULL DEFAULT 30,
  created_at TEXT NOT NULL DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS hospitais (
  id TEXT PRIMARY KEY,
  clinica_id TEXT NOT NULL,
  nome TEXT NOT NULL,
  endereco TEXT,
  telefone TEXT,
  created_at TEXT NOT NULL DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS medico_hospitais (
  id TEXT PRIMARY KEY,
  medico_id TEXT NOT NULL,
  hospital_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS medico_disponibilidade (
  id TEXT PRIMARY KEY,
  medico_id TEXT NOT NULL,
  dia_semana INTEGER NOT NULL,
  hora_inicio TEXT NOT NULL,
  hora_fim TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pontos (
  id TEXT PRIMARY KEY,
  clinica_id TEXT NOT NULL,
  usuario_id TEXT NOT NULL,
  tipo TEXT NOT NULL,
  data_hora TEXT NOT NULL,
  latitude REAL,
  longitude REAL,
  distancia_metros REAL,
  dentro_raio INTEGER NOT NULL DEFAULT 0,
  foto_url TEXT,
  lancado_manualmente INTEGER NOT NULL DEFAULT 0,
  criado_por TEXT,
  editado_por TEXT,
  editado_em TEXT,
  created_at TEXT NOT NULL DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS pacientes (
  id TEXT PRIMARY KEY,
  clinica_id TEXT NOT NULL,
  nome TEXT NOT NULL,
  cpf TEXT,
  rg TEXT,
  data_nascimento TEXT,
  telefone TEXT,
  email TEXT,
  convenio TEXT,
  endereco TEXT,
  sexo TEXT,
  foto_url TEXT,
  cep TEXT,
  logradouro TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  estado_civil TEXT,
  data_primeira_consulta TEXT,
  nome_responsavel TEXT,
  nome_mae TEXT,
  profissao TEXT,
  cor_raca TEXT,
  peso_kg REAL,
  altura_cm REAL,
  indicado_por TEXT,
  plano TEXT,
  validade_carteira TEXT,
  cartao_cns TEXT,
  consentimento_lgpd_em TIMESTAMPTZ,
  dados_anonimizados_em TIMESTAMPTZ,
  created_at TEXT NOT NULL DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS tipos_procedimento (
  id TEXT PRIMARY KEY,
  clinica_id TEXT NOT NULL,
  nome TEXT NOT NULL,
  gera_cirurgia INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS agendamentos (
  id TEXT PRIMARY KEY,
  clinica_id TEXT NOT NULL,
  paciente_id TEXT NOT NULL,
  medico_id TEXT NOT NULL,
  tipo_procedimento_id TEXT,
  data_hora TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'agendado',
  tipo TEXT NOT NULL DEFAULT 'presencial',
  observacoes TEXT,
  created_at TEXT NOT NULL DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS compromissos (
  id TEXT PRIMARY KEY,
  clinica_id TEXT NOT NULL,
  medico_id TEXT NOT NULL,
  titulo TEXT NOT NULL,
  data_hora TEXT NOT NULL,
  observacoes TEXT,
  criado_por TEXT,
  created_at TEXT NOT NULL DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS cirurgias (
  id TEXT PRIMARY KEY,
  clinica_id TEXT NOT NULL,
  paciente_id TEXT NOT NULL,
  medico_id TEXT,
  agendamento_id TEXT,
  hospital_id TEXT,
  nome_cirurgia TEXT NOT NULL,
  data_prevista TEXT,
  local_hospital TEXT,
  equipe TEXT,
  observacoes TEXT,
  observacoes_financeiras TEXT,
  status TEXT NOT NULL DEFAULT 'rascunho',
  criado_por TEXT,
  finalizado_por TEXT,
  finalizado_em TEXT,
  created_at TEXT NOT NULL DEFAULT (now()::text),
  atualizado_em TEXT NOT NULL DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS cirurgia_participantes (
  id TEXT PRIMARY KEY,
  cirurgia_id TEXT NOT NULL,
  usuario_id TEXT NOT NULL,
  valor_comissao REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'aprovada',
  observacao TEXT,
  aprovado_por TEXT,
  aprovado_em TEXT,
  criado_por TEXT,
  created_at TEXT NOT NULL DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS itens_cirurgia_catalogo (
  id TEXT PRIMARY KEY,
  clinica_id TEXT NOT NULL,
  nome TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS cirurgia_itens (
  id TEXT PRIMARY KEY,
  cirurgia_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS auxiliares (
  id TEXT PRIMARY KEY,
  clinica_id TEXT NOT NULL,
  nome TEXT NOT NULL,
  funcao TEXT,
  telefone TEXT,
  email TEXT,
  created_at TEXT NOT NULL DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS cirurgia_auxiliares (
  id TEXT PRIMARY KEY,
  cirurgia_id TEXT NOT NULL,
  auxiliar_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS itens_orcamento_catalogo (
  id TEXT PRIMARY KEY,
  clinica_id TEXT NOT NULL,
  nome TEXT NOT NULL,
  valor REAL NOT NULL DEFAULT 0,
  ativo INTEGER NOT NULL DEFAULT 1,
  criado_por TEXT,
  created_at TEXT NOT NULL DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS orcamento_modelos (
  id TEXT PRIMARY KEY,
  clinica_id TEXT NOT NULL,
  nome TEXT NOT NULL,
  itens TEXT NOT NULL,
  ativo INTEGER NOT NULL DEFAULT 1,
  criado_por TEXT,
  created_at TEXT NOT NULL DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS orcamentos (
  id TEXT PRIMARY KEY,
  clinica_id TEXT NOT NULL,
  paciente_id TEXT NOT NULL,
  titulo TEXT NOT NULL,
  itens TEXT,
  valor_total REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pendente',
  observacoes TEXT,
  criado_por TEXT,
  created_at TEXT NOT NULL DEFAULT (now()::text),
  atualizado_em TEXT NOT NULL DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS pagamentos (
  id TEXT PRIMARY KEY,
  clinica_id TEXT NOT NULL,
  paciente_id TEXT NOT NULL,
  orcamento_id TEXT,
  descricao TEXT NOT NULL,
  valor REAL NOT NULL,
  forma_pagamento TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  data_vencimento TEXT,
  data_pagamento TEXT,
  comprovante_url TEXT,
  criado_por TEXT,
  created_at TEXT NOT NULL DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS despesas_clinica (
  id TEXT PRIMARY KEY,
  clinica_id TEXT NOT NULL,
  descricao TEXT NOT NULL,
  categoria TEXT,
  valor REAL NOT NULL,
  data TEXT NOT NULL,
  forma_pagamento TEXT,
  status TEXT NOT NULL DEFAULT 'pago',
  criado_por TEXT,
  usuario_id_referencia TEXT,
  competencia TEXT,
  created_at TEXT NOT NULL DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS comissoes_config (
  usuario_id TEXT PRIMARY KEY,
  clinica_id TEXT NOT NULL,
  valor_fixo_mensal REAL NOT NULL DEFAULT 0,
  atualizado_em TEXT NOT NULL DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS comissoes_avulsas (
  id TEXT PRIMARY KEY,
  clinica_id TEXT NOT NULL,
  usuario_id TEXT NOT NULL,
  data TEXT NOT NULL,
  paciente_nome TEXT,
  nome_cirurgia TEXT,
  descricao TEXT,
  valor REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  observacao_aprovacao TEXT,
  criado_por TEXT,
  aprovado_por TEXT,
  aprovado_em TEXT,
  created_at TEXT NOT NULL DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS comissoes_extras (
  id TEXT PRIMARY KEY,
  clinica_id TEXT NOT NULL,
  usuario_id TEXT NOT NULL,
  data TEXT NOT NULL,
  descricao TEXT NOT NULL,
  valor REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  observacao_aprovacao TEXT,
  criado_por TEXT,
  aprovado_por TEXT,
  aprovado_em TEXT,
  created_at TEXT NOT NULL DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS financas_pessoais (
  id TEXT PRIMARY KEY,
  usuario_id TEXT NOT NULL,
  tipo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  categoria TEXT,
  valor REAL NOT NULL,
  data TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS estoque_itens (
  id TEXT PRIMARY KEY,
  clinica_id TEXT NOT NULL,
  descricao TEXT NOT NULL,
  quantidade REAL NOT NULL DEFAULT 0,
  data_validade TEXT,
  criado_por TEXT,
  created_at TEXT NOT NULL DEFAULT (now()::text),
  atualizado_em TEXT NOT NULL DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS reunioes (
  id TEXT PRIMARY KEY,
  clinica_id TEXT NOT NULL,
  titulo TEXT NOT NULL,
  pauta TEXT,
  data_hora TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'agendada',
  criado_por TEXT,
  created_at TEXT NOT NULL DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS reuniao_participantes (
  id TEXT PRIMARY KEY,
  reuniao_id TEXT NOT NULL,
  usuario_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notificacoes (
  id TEXT PRIMARY KEY,
  clinica_id TEXT NOT NULL,
  usuario_id TEXT NOT NULL,
  tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  mensagem TEXT,
  referencia_tipo TEXT,
  referencia_id TEXT,
  lida INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS prontuarios (
  id TEXT PRIMARY KEY,
  clinica_id TEXT NOT NULL,
  paciente_id TEXT NOT NULL,
  medico_id TEXT NOT NULL,
  data TEXT NOT NULL,
  queixa TEXT,
  diagnostico TEXT,
  prescricao TEXT,
  evolucao TEXT,
  observacoes TEXT,
  criado_por TEXT,
  pedido_exames TEXT,
  created_at TEXT NOT NULL DEFAULT (now()::text)
);

-- Log de tentativas de login malsucedidas (LGPD/segurança — ajuda a detectar tentativa de
-- força bruta). `clinica_id` fica nulo quando o e-mail não bate com nenhum usuário
-- cadastrado (não dá pra saber de qual clínica seria); sem FK de propósito, mesmo raciocínio
-- de `prontuarios_auditoria` logo abaixo.
CREATE TABLE IF NOT EXISTS login_tentativas (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  clinica_id TEXT,
  motivo TEXT NOT NULL,
  ip TEXT,
  created_at TEXT NOT NULL DEFAULT (now()::text)
);

-- Log de acesso/alteração de prontuário (LGPD + rastreabilidade exigida em dado de
-- saúde). Guarda nome/role de quem acessou NA HORA (não faz join com `usuarios`
-- pra ler agora) — assim o registro continua correto mesmo se o usuário depois
-- mudar de nome/cargo ou for removido do sistema. Sem FK pra prontuario_id/
-- usuario_id de propósito: a linha de auditoria não pode desaparecer nem travar
-- a exclusão de um prontuário ou de um usuário.
CREATE TABLE IF NOT EXISTS prontuarios_auditoria (
  id TEXT PRIMARY KEY,
  clinica_id TEXT NOT NULL,
  prontuario_id TEXT,
  paciente_id TEXT NOT NULL,
  usuario_id TEXT,
  usuario_nome TEXT,
  usuario_role TEXT,
  acao TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS mensagens (
  id TEXT PRIMARY KEY,
  clinica_id TEXT NOT NULL,
  sala TEXT NOT NULL,
  remetente TEXT NOT NULL,
  remetente_tipo TEXT NOT NULL,
  texto TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS perfis_instalacao (
  id TEXT PRIMARY KEY,
  clinica_id TEXT NOT NULL,
  nome TEXT NOT NULL,
  slug TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS fotos_paciente (
  id TEXT PRIMARY KEY,
  clinica_id TEXT NOT NULL,
  paciente_id TEXT NOT NULL,
  tipo TEXT NOT NULL,
  data TEXT NOT NULL,
  foto_url TEXT NOT NULL,
  observacoes TEXT,
  criado_por TEXT,
  created_at TEXT NOT NULL DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS sessoes_fisioterapia (
  id TEXT PRIMARY KEY,
  clinica_id TEXT NOT NULL,
  paciente_id TEXT NOT NULL,
  usuario_id TEXT NOT NULL,
  data_hora TEXT NOT NULL,
  observacoes TEXT,
  created_at TEXT NOT NULL DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS notas_fiscais_paciente (
  id TEXT PRIMARY KEY,
  clinica_id TEXT NOT NULL,
  paciente_id TEXT NOT NULL,
  descricao TEXT,
  arquivo_url TEXT NOT NULL,
  nome_arquivo TEXT,
  criado_por TEXT,
  created_at TEXT NOT NULL DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS contratos_paciente (
  id TEXT PRIMARY KEY,
  clinica_id TEXT NOT NULL,
  paciente_id TEXT NOT NULL,
  descricao TEXT,
  arquivo_url TEXT NOT NULL,
  nome_arquivo TEXT,
  criado_por TEXT,
  created_at TEXT NOT NULL DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS contrato_modelo (
  id TEXT PRIMARY KEY,
  clinica_id TEXT NOT NULL UNIQUE,
  texto TEXT NOT NULL DEFAULT '',
  atualizado_por TEXT,
  updated_at TEXT NOT NULL DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS modelos_receita (
  id TEXT PRIMARY KEY,
  clinica_id TEXT NOT NULL,
  usuario_id TEXT NOT NULL,
  nome TEXT NOT NULL,
  texto TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS modelos_exame (
  id TEXT PRIMARY KEY,
  clinica_id TEXT NOT NULL,
  usuario_id TEXT NOT NULL,
  nome TEXT NOT NULL,
  texto TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (now()::text)
);

-- Índices (mesmos do schema SQLite original)
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
CREATE INDEX IF NOT EXISTS idx_orcamento_modelos_clinica ON orcamento_modelos(clinica_id);
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
CREATE INDEX IF NOT EXISTS idx_prontuarios_auditoria_clinica ON prontuarios_auditoria(clinica_id);
CREATE INDEX IF NOT EXISTS idx_prontuarios_auditoria_paciente ON prontuarios_auditoria(paciente_id);
CREATE INDEX IF NOT EXISTS idx_prontuarios_auditoria_created_at ON prontuarios_auditoria(created_at);
CREATE INDEX IF NOT EXISTS idx_login_tentativas_email ON login_tentativas(email);
CREATE INDEX IF NOT EXISTS idx_login_tentativas_clinica ON login_tentativas(clinica_id);
CREATE INDEX IF NOT EXISTS idx_login_tentativas_created_at ON login_tentativas(created_at);
CREATE INDEX IF NOT EXISTS idx_mensagens_sala ON mensagens(sala);
CREATE INDEX IF NOT EXISTS idx_usuarios_clinica ON usuarios(clinica_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_perfis_instalacao_slug ON perfis_instalacao(clinica_id, slug);
CREATE INDEX IF NOT EXISTS idx_modelos_receita_usuario ON modelos_receita(usuario_id);
CREATE INDEX IF NOT EXISTS idx_modelos_exame_usuario ON modelos_exame(usuario_id);
CREATE INDEX IF NOT EXISTS idx_itens_cirurgia_catalogo_clinica ON itens_cirurgia_catalogo(clinica_id);
CREATE INDEX IF NOT EXISTS idx_cirurgia_itens_cirurgia ON cirurgia_itens(cirurgia_id);
CREATE INDEX IF NOT EXISTS idx_hospitais_clinica ON hospitais(clinica_id);
CREATE INDEX IF NOT EXISTS idx_medico_hospitais_medico ON medico_hospitais(medico_id);
CREATE INDEX IF NOT EXISTS idx_auxiliares_clinica ON auxiliares(clinica_id);
CREATE INDEX IF NOT EXISTS idx_cirurgia_auxiliares_cirurgia ON cirurgia_auxiliares(cirurgia_id);
CREATE INDEX IF NOT EXISTS idx_comissoes_avulsas_usuario ON comissoes_avulsas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_comissoes_avulsas_clinica ON comissoes_avulsas(clinica_id);
CREATE INDEX IF NOT EXISTS idx_comissoes_extras_usuario ON comissoes_extras(usuario_id);
CREATE INDEX IF NOT EXISTS idx_comissoes_extras_clinica ON comissoes_extras(clinica_id);
CREATE INDEX IF NOT EXISTS idx_notas_fiscais_paciente ON notas_fiscais_paciente(paciente_id);
CREATE INDEX IF NOT EXISTS idx_contratos_paciente ON contratos_paciente(paciente_id);
CREATE INDEX IF NOT EXISTS idx_fotos_paciente_paciente ON fotos_paciente(paciente_id);
CREATE INDEX IF NOT EXISTS idx_tipos_procedimento_clinica ON tipos_procedimento(clinica_id);
CREATE INDEX IF NOT EXISTS idx_sessoes_fisioterapia_paciente ON sessoes_fisioterapia(paciente_id);
CREATE INDEX IF NOT EXISTS idx_sessoes_fisioterapia_usuario ON sessoes_fisioterapia(usuario_id);
