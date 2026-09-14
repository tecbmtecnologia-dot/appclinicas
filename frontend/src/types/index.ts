export type EstadoCivil = 'solteiro' | 'casado' | 'divorciado' | 'viuvo' | 'uniao_estavel' | 'outro'
export type CorRaca = 'branca' | 'preta' | 'parda' | 'amarela' | 'indigena' | 'nao_informado'
export type Sexo = 'feminino' | 'masculino' | 'nao_informado'

export interface Paciente {
  id: string
  nome: string
  cpf: string
  rg?: string
  sexo?: Sexo | null
  data_nascimento: string
  telefone: string
  email: string
  convenio: string
  endereco: string
  foto_url?: string | null
  cep?: string | null
  logradouro?: string | null
  numero?: string | null
  complemento?: string | null
  bairro?: string | null
  cidade?: string | null
  estado?: string | null
  estado_civil?: EstadoCivil | null
  data_primeira_consulta?: string | null
  nome_responsavel?: string | null
  nome_mae?: string | null
  profissao?: string | null
  cor_raca?: CorRaca | null
  peso_kg?: number | null
  altura_cm?: number | null
  indicado_por?: string | null
  plano?: string | null
  validade_carteira?: string | null
  cartao_cns?: string | null
  consentimento_lgpd_em?: string | null
  created_at: string
}

export interface DisponibilidadeMedico {
  id: string
  dia_semana: number
  hora_inicio: string
  hora_fim: string
}

export interface Medico {
  id: string
  nome: string
  crm: string
  especialidade: string
  telefone: string
  email: string
  hospitais: { id: string; nome: string }[]
  disponibilidade: DisponibilidadeMedico[]
  intervalo_slot_minutos: number
  created_at: string
}

export interface Hospital {
  id: string
  nome: string
  endereco: string
  telefone: string
  created_at: string
}

export interface Auxiliar {
  id: string
  nome: string
  funcao: string
  telefone: string
  email: string
  created_at: string
}

export type StatusAgendamento = 'agendado' | 'confirmado' | 'cancelado' | 'concluido' | 'faltou'
export type TipoAtendimento = 'presencial' | 'telemedicina'

export interface Agendamento {
  id: string
  paciente_id: string
  medico_id: string
  tipo_procedimento_id?: string | null
  data_hora: string
  status: StatusAgendamento
  tipo: TipoAtendimento
  observacoes?: string
  created_at: string
  paciente_nome?: string
  medico_nome?: string
  tipo_procedimento_nome?: string | null
}

export interface Compromisso {
  id: string
  medico_id: string
  titulo: string
  data_hora: string
  observacoes?: string | null
  created_at: string
  medico_nome?: string
}

export interface ModeloReceita {
  id: string
  usuario_id: string
  nome: string
  texto: string
  created_at: string
}

export interface ModeloExame {
  id: string
  usuario_id: string
  nome: string
  texto: string
  created_at: string
}

export interface ReceitaResumo {
  id: string
  data: string
  medico_nome: string
}

export interface PedidoExameResumo {
  id: string
  data: string
  medico_nome: string
}

export interface ItemCirurgia {
  id: string
  nome: string
  created_at: string
}

export interface TipoProcedimento {
  id: string
  nome: string
  gera_cirurgia: number
  created_at: string
}

export interface SessaoFisioterapia {
  id: string
  paciente_id: string
  paciente_nome?: string
  usuario_id: string
  usuario_nome?: string
  data_hora: string
  observacoes?: string | null
  created_at: string
}

export type TipoFotoPaciente = 'pre_operatorio' | 'pos_operatorio'

export interface FotoPaciente {
  id: string
  paciente_id: string
  tipo: TipoFotoPaciente
  data: string
  foto_url: string
  observacoes?: string | null
  criado_por?: string | null
  created_at: string
}

export interface Prontuario {
  id: string
  paciente_id: string
  medico_id: string
  data: string
  queixa: string
  diagnostico: string
  prescricao: string
  pedido_exames?: string
  evolucao?: string
  observacoes?: string
  created_at: string
  medico_nome?: string
  paciente_nome?: string
}

export type Role = 'super_admin' | 'admin' | 'coordenador' | 'medico' | 'enfermagem' | 'recepcao' | 'financeiro' | 'pj'

export interface Usuario {
  id: string
  nome: string
  email: string
  role: Role
  cargo?: string | null
  clinica_id?: string | null
  medico_id?: string | null
  unidade_id?: string | null
  carga_horaria_mensal_horas?: number
  horario_entrada?: string | null
  horario_inicio_intervalo?: string | null
  horario_fim_intervalo?: string | null
  horario_saida?: string | null
  dias_trabalho_semana?: number
  carga_horaria_semanal_horas?: number | null
  jornada_semanal?: Record<string, HorarioDia> | null
  dia_fechamento_folha?: number
  data_admissao?: string | null
  foto_url?: string | null
  sexo?: Sexo | null
  ativo: number
  created_at: string
}

// Código do dia da semana usado em jornada_semanal (mesmo formato no back e no front).
export type DiaSemanaCodigo = 'dom' | 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab'

export interface HorarioDia {
  entrada: string | null
  inicio_intervalo?: string | null
  fim_intervalo?: string | null
  saida: string | null
}

export interface ClinicaResumo {
  id: string
  nome: string
  slug: string
  logo_url?: string | null
  logo_app_url?: string | null
  cor_primaria?: string | null
  modulos_opcionais?: string[]
}

export type TipoMarcaDagua = 'nenhuma' | 'logo' | 'texto'

export interface Clinica extends ClinicaResumo {
  ativo: number
  created_at: string
  cnpj?: string | null
  endereco?: string | null
  telefone?: string | null
  email?: string | null
  especialidades: string[]
  latitude?: number | null
  longitude?: number | null
  raio_metros?: number | null
  marca_dagua_tipo?: TipoMarcaDagua
  marca_dagua_texto?: string | null
  total_usuarios?: number
  total_medicos?: number
  total_pacientes?: number
}

export interface Unidade {
  id: string
  clinica_id: string
  nome: string
  endereco?: string | null
  telefone?: string | null
  latitude?: number | null
  longitude?: number | null
  raio_metros?: number | null
  created_at: string
}

export type TipoPonto = 'entrada' | 'inicio_intervalo' | 'fim_intervalo' | 'saida'
// 'sem_intervalo' só existe no fluxo de bater ponto (não é persistido — vira
// inicio_intervalo + fim_intervalo simultâneos no banco).
export type TipoMarcacaoPonto = TipoPonto | 'sem_intervalo'

export interface Ponto {
  id: string
  clinica_id: string
  usuario_id: string
  usuario_nome?: string
  tipo: TipoPonto
  data_hora: string
  latitude?: number | null
  longitude?: number | null
  distancia_metros?: number | null
  dentro_raio: number
  foto_url?: string | null
  local_referencia?: string | null
  lancado_manualmente?: number
  created_at: string
}

export interface Jornada extends Partial<HorarioDia> {
  horas_dia?: number
  horas_semana?: number
  dias_semana?: DiaSemanaCodigo[]
  // Quando os dias trabalhados têm horários diferentes entre si, não dá pra
  // resumir num entrada/saída único — variavel=true e `dias` traz o detalhe.
  variavel?: boolean
  dias?: Record<string, HorarioDia & { horas_dia: number }>
}

export interface DiaSemanaPonto {
  data: string
  horas_trabalhadas: number
}

export interface ResumoSemana {
  inicio: string
  fim: string
  dias: DiaSemanaPonto[]
  horas_trabalhadas: number
  horas_esperadas: number | null
  saldo: number | null
  jornada: Jornada | null
}

export interface ResumoSemanaUsuario extends ResumoSemana {
  usuario_id: string
  usuario_nome: string
}

export interface SaldoAcumulado {
  // Desde quando o acúmulo conta (admissão, ou data de criação da conta se não tiver admissão cadastrada).
  desde: string
  periodos: number
  meta_total: number
  horas_trabalhadas: number
  saldo: number
}

export interface ResumoPontoUsuario {
  usuario_id: string
  usuario_nome: string
  foto_url?: string | null
  role: Role
  periodo?: { inicio: string; fim: string }
  meta_horas: number
  horas_trabalhadas: number
  saldo_horas: number
  saldo_acumulado: SaldoAcumulado | null
  total_registros: number
  jornada: Jornada | null
  semana_atual: ResumoSemana
}

export interface ResumoPonto {
  referencia: string
  resumo: ResumoPontoUsuario[]
}

export type StatusCirurgia = 'rascunho' | 'pronta'

export interface Cirurgia {
  id: string
  clinica_id: string
  paciente_id: string
  paciente_nome?: string
  medico_id?: string | null
  medico_nome?: string | null
  nome_cirurgia: string
  data_prevista?: string | null
  local_hospital?: string | null
  hospital_id?: string | null
  hospital_nome?: string | null
  equipe?: string | null
  observacoes?: string | null
  observacoes_financeiras?: string | null
  auxiliares: { id: string; nome: string; funcao: string | null }[]
  itens: { id: string; nome: string; quantidade: number }[]
  status: StatusCirurgia
  criado_por?: string | null
  finalizado_por?: string | null
  finalizado_em?: string | null
  created_at: string
  atualizado_em: string
}

export interface ItemOrcamento {
  item_id: string
  descricao: string
  valor_unitario: number
  quantidade: number
  valor: number
}

export interface ItemOrcamentoCatalogo {
  id: string
  clinica_id: string
  nome: string
  valor: number
  ativo: number
  criado_por?: string | null
  created_at: string
}

export interface ModeloOrcamento {
  id: string
  clinica_id: string
  nome: string
  itens: ItemOrcamento[]
  ativo: number
  criado_por?: string | null
  created_at: string
}

export type StatusOrcamento = 'pendente' | 'aprovado' | 'recusado'

export interface Orcamento {
  id: string
  clinica_id: string
  paciente_id: string
  paciente_nome?: string
  titulo: string
  itens: ItemOrcamento[]
  valor_total: number
  status: StatusOrcamento
  observacoes?: string | null
  criado_por?: string | null
  created_at: string
  atualizado_em: string
}

export type StatusPagamento = 'pendente' | 'pago' | 'atrasado'

export interface Pagamento {
  id: string
  clinica_id: string
  paciente_id: string
  paciente_nome?: string
  orcamento_id?: string | null
  descricao: string
  valor: number
  forma_pagamento?: string | null
  status: StatusPagamento
  data_vencimento?: string | null
  data_pagamento?: string | null
  comprovante_url?: string | null
  criado_por?: string | null
  created_at: string
}

export interface DespesaClinica {
  id: string
  clinica_id: string
  descricao: string
  categoria?: string | null
  valor: number
  data: string
  forma_pagamento?: string | null
  status: 'pago' | 'pendente'
  criado_por?: string | null
  created_at: string
}

export type TipoFinancaPessoal = 'receita' | 'despesa'

export interface FinancaPessoal {
  id: string
  usuario_id: string
  tipo: TipoFinancaPessoal
  descricao: string
  categoria?: string | null
  valor: number
  data: string
  created_at: string
}

export interface ResumoDashboard {
  cirurgias: { semana: number; mes: number; ano: number }
  consultas: { semana: number; mes: number; ano: number; concluidas_mes: number }
  pacientes_total: number
  financeiro: { referencia: string; recebido: number; gasto: number; saldo: number }
}

export interface NotaFiscalPaciente {
  id: string
  paciente_id: string
  descricao?: string | null
  arquivo_url: string
  nome_arquivo?: string | null
  criado_por?: string | null
  created_at: string
}

export interface EstoqueItem {
  id: string
  descricao: string
  quantidade: number
  data_validade?: string | null
  created_at: string
  atualizado_em: string
}

export interface ContratoModelo {
  texto: string
  updated_at?: string | null
}

export interface ContratoPaciente {
  id: string
  paciente_id: string
  descricao?: string | null
  arquivo_url: string
  nome_arquivo?: string | null
  criado_por?: string | null
  created_at: string
}

export interface ResumoFinanceiroClinica {
  referencia: string
  recebido: number
  a_receber: number
  gasto: number
  a_pagar: number
  saldo: number
  total_orcado: number
}

export interface ResumoFinancasPessoais {
  referencia: string
  receitas: number
  despesas: number
  saldo: number
}

export interface ParticipanteCirurgiaComissao {
  id: string
  cirurgia_id: string
  usuario_id: string
  usuario_nome?: string
  usuario_role?: Role
  valor_comissao: number
  status: StatusComissaoAvulsa
  observacao?: string | null
  aprovado_por?: string | null
  aprovado_em?: string | null
  nome_cirurgia?: string
  data_prevista?: string | null
  paciente_nome?: string | null
  created_at: string
}

export interface ProcedimentoComissao {
  id: string
  cirurgia_id: string
  valor_comissao: number
  status_participante: StatusComissaoAvulsa
  observacao?: string | null
  nome_cirurgia: string
  data_prevista?: string | null
  status: StatusCirurgia
}

export type StatusComissaoAvulsa = 'pendente' | 'aprovada' | 'recusada'

export interface ComissaoAvulsa {
  id: string
  usuario_id: string
  usuario_nome?: string
  data: string
  paciente_nome: string
  nome_cirurgia: string
  descricao?: string | null
  valor: number
  status: StatusComissaoAvulsa
  observacao_aprovacao?: string | null
  criado_por?: string | null
  aprovado_por?: string | null
  aprovado_em?: string | null
  created_at: string
}

export interface ComissaoExtra {
  id: string
  usuario_id: string
  usuario_nome?: string
  usuario_role?: Role
  data: string
  descricao: string
  valor: number
  status: StatusComissaoAvulsa
  observacao_aprovacao?: string | null
  criado_por?: string | null
  aprovado_por?: string | null
  aprovado_em?: string | null
  created_at: string
}

export interface ResumoComissaoUsuario {
  usuario_id: string
  usuario_nome: string
  role: Role
  valor_fixo_mensal: number
  procedimentos: ProcedimentoComissao[]
  total_procedimentos: number
  avulsas: ComissaoAvulsa[]
  total_avulsas_aprovadas: number
  extras: ComissaoExtra[]
  total_extras_aprovados: number
  total: number
}

export interface MinhaComissao {
  referencia: string
  valor_fixo_mensal: number
  procedimentos: ProcedimentoComissao[]
  total_procedimentos: number
  avulsas: ComissaoAvulsa[]
  total_avulsas_aprovadas: number
  extras: ComissaoExtra[]
  total_extras_aprovados: number
  total: number
}

export interface ResumoComissoes {
  referencia: string
  resumo: ResumoComissaoUsuario[]
}

export type StatusReuniao = 'agendada' | 'em_andamento' | 'encerrada' | 'cancelada'

export interface ParticipanteReuniao {
  id: string
  nome: string
}

export interface Reuniao {
  id: string
  clinica_id: string
  titulo: string
  pauta?: string | null
  data_hora: string
  status: StatusReuniao
  criado_por?: string | null
  created_at: string
  participantes: ParticipanteReuniao[]
}

export interface PerfilInstalacao {
  id: string
  clinica_id: string
  nome: string
  slug: string
  clinica_slug?: string
  created_at: string
}

export interface InstalarInfo {
  clinica_nome: string
  logo_url?: string | null
  cor_primaria?: string | null
  perfil_nome: string
}

export interface Notificacao {
  id: string
  clinica_id: string
  usuario_id: string
  tipo: string
  titulo: string
  mensagem?: string | null
  referencia_tipo?: string | null
  referencia_id?: string | null
  lida: number
  created_at: string
}

export interface UsuarioLogado {
  id: string
  nome: string
  email: string
  role: Role
  cargo?: string | null
  clinica_id?: string | null
  medico_id?: string | null
  sexo?: Sexo | null
  foto_url?: string | null
  clinica?: ClinicaResumo | null
}

export interface Mensagem {
  id: string
  sala: string
  remetente: string
  remetente_tipo: 'paciente' | 'medico'
  texto: string
  created_at: string
}
