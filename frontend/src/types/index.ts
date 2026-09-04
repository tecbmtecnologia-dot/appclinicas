export interface Paciente {
  id: string
  nome: string
  cpf: string
  rg?: string
  data_nascimento: string
  telefone: string
  email: string
  convenio: string
  endereco: string
  created_at: string
}

export interface Medico {
  id: string
  nome: string
  crm: string
  especialidade: string
  telefone: string
  email: string
  created_at: string
}

export type StatusAgendamento = 'agendado' | 'confirmado' | 'cancelado' | 'concluido'
export type TipoAtendimento = 'presencial' | 'telemedicina'

export interface Agendamento {
  id: string
  paciente_id: string
  medico_id: string
  data_hora: string
  status: StatusAgendamento
  tipo: TipoAtendimento
  observacoes?: string
  created_at: string
  paciente_nome?: string
  medico_nome?: string
}

export interface Prontuario {
  id: string
  paciente_id: string
  medico_id: string
  data: string
  queixa: string
  diagnostico: string
  prescricao: string
  observacoes?: string
  created_at: string
  medico_nome?: string
  paciente_nome?: string
}

export type Role = 'super_admin' | 'admin' | 'coordenador' | 'medico' | 'enfermagem' | 'recepcao' | 'financeiro'

export interface Usuario {
  id: string
  nome: string
  email: string
  role: Role
  clinica_id?: string | null
  medico_id?: string | null
  unidade_id?: string | null
  carga_horaria_mensal_horas?: number
  ativo: number
  created_at: string
}

export interface ClinicaResumo {
  id: string
  nome: string
  slug: string
  logo_url?: string | null
  cor_primaria?: string | null
}

export interface Clinica extends ClinicaResumo {
  ativo: number
  created_at: string
  cnpj?: string | null
  endereco?: string | null
  especialidades: string[]
  latitude?: number | null
  longitude?: number | null
  raio_metros?: number | null
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
  created_at: string
}

export interface ResumoPontoUsuario {
  usuario_id: string
  usuario_nome: string
  role: Role
  meta_horas: number
  horas_trabalhadas: number
  saldo_horas: number
  total_registros: number
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
  equipe?: string | null
  observacoes?: string | null
  status: StatusCirurgia
  criado_por?: string | null
  finalizado_por?: string | null
  finalizado_em?: string | null
  created_at: string
  atualizado_em: string
}

export interface ItemOrcamento {
  descricao: string
  valor: number
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
  clinica_id?: string | null
  medico_id?: string | null
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
