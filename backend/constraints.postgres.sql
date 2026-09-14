-- Foreign keys, adicionadas depois de schema.postgres.sql já ter criado todas
-- as tabelas E depois dos dados já terem sido carregados (script
-- scripts/migrar-para-postgres.js). Cada constraint roda isolada num bloco
-- DO com EXCEPTION: se algum dado órfão pré-existente (o SQLite nunca validou
-- FK de verdade) impedir uma constraint específica, ela é pulada com um aviso
-- em vez de travar o restante do script — decisão explícita do plano de
-- migração (não vamos brigar com dados órfãos nesta etapa).
-- Rodar uma única vez, depois da carga de dados.

DO $$ BEGIN ALTER TABLE unidades ADD CONSTRAINT fk_unidades_clinica FOREIGN KEY (clinica_id) REFERENCES clinicas(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_unidades_clinica: %', SQLERRM; END $$;

DO $$ BEGIN ALTER TABLE usuarios ADD CONSTRAINT fk_usuarios_clinica FOREIGN KEY (clinica_id) REFERENCES clinicas(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_usuarios_clinica: %', SQLERRM; END $$;
DO $$ BEGIN ALTER TABLE usuarios ADD CONSTRAINT fk_usuarios_medico FOREIGN KEY (medico_id) REFERENCES medicos(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_usuarios_medico: %', SQLERRM; END $$;
DO $$ BEGIN ALTER TABLE usuarios ADD CONSTRAINT fk_usuarios_unidade FOREIGN KEY (unidade_id) REFERENCES unidades(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_usuarios_unidade: %', SQLERRM; END $$;

DO $$ BEGIN ALTER TABLE medicos ADD CONSTRAINT fk_medicos_clinica FOREIGN KEY (clinica_id) REFERENCES clinicas(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_medicos_clinica: %', SQLERRM; END $$;

DO $$ BEGIN ALTER TABLE hospitais ADD CONSTRAINT fk_hospitais_clinica FOREIGN KEY (clinica_id) REFERENCES clinicas(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_hospitais_clinica: %', SQLERRM; END $$;

DO $$ BEGIN ALTER TABLE medico_hospitais ADD CONSTRAINT fk_medico_hospitais_medico FOREIGN KEY (medico_id) REFERENCES medicos(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_medico_hospitais_medico: %', SQLERRM; END $$;
DO $$ BEGIN ALTER TABLE medico_hospitais ADD CONSTRAINT fk_medico_hospitais_hospital FOREIGN KEY (hospital_id) REFERENCES hospitais(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_medico_hospitais_hospital: %', SQLERRM; END $$;

DO $$ BEGIN ALTER TABLE medico_disponibilidade ADD CONSTRAINT fk_medico_disponibilidade_medico FOREIGN KEY (medico_id) REFERENCES medicos(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_medico_disponibilidade_medico: %', SQLERRM; END $$;

DO $$ BEGIN ALTER TABLE pontos ADD CONSTRAINT fk_pontos_clinica FOREIGN KEY (clinica_id) REFERENCES clinicas(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_pontos_clinica: %', SQLERRM; END $$;
DO $$ BEGIN ALTER TABLE pontos ADD CONSTRAINT fk_pontos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_pontos_usuario: %', SQLERRM; END $$;

DO $$ BEGIN ALTER TABLE pacientes ADD CONSTRAINT fk_pacientes_clinica FOREIGN KEY (clinica_id) REFERENCES clinicas(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_pacientes_clinica: %', SQLERRM; END $$;

DO $$ BEGIN ALTER TABLE tipos_procedimento ADD CONSTRAINT fk_tipos_procedimento_clinica FOREIGN KEY (clinica_id) REFERENCES clinicas(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_tipos_procedimento_clinica: %', SQLERRM; END $$;

DO $$ BEGIN ALTER TABLE agendamentos ADD CONSTRAINT fk_agendamentos_clinica FOREIGN KEY (clinica_id) REFERENCES clinicas(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_agendamentos_clinica: %', SQLERRM; END $$;
DO $$ BEGIN ALTER TABLE agendamentos ADD CONSTRAINT fk_agendamentos_paciente FOREIGN KEY (paciente_id) REFERENCES pacientes(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_agendamentos_paciente: %', SQLERRM; END $$;
DO $$ BEGIN ALTER TABLE agendamentos ADD CONSTRAINT fk_agendamentos_medico FOREIGN KEY (medico_id) REFERENCES medicos(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_agendamentos_medico: %', SQLERRM; END $$;
DO $$ BEGIN ALTER TABLE agendamentos ADD CONSTRAINT fk_agendamentos_tipo_procedimento FOREIGN KEY (tipo_procedimento_id) REFERENCES tipos_procedimento(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_agendamentos_tipo_procedimento: %', SQLERRM; END $$;

DO $$ BEGIN ALTER TABLE compromissos ADD CONSTRAINT fk_compromissos_clinica FOREIGN KEY (clinica_id) REFERENCES clinicas(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_compromissos_clinica: %', SQLERRM; END $$;
DO $$ BEGIN ALTER TABLE compromissos ADD CONSTRAINT fk_compromissos_medico FOREIGN KEY (medico_id) REFERENCES medicos(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_compromissos_medico: %', SQLERRM; END $$;
DO $$ BEGIN ALTER TABLE compromissos ADD CONSTRAINT fk_compromissos_criado_por FOREIGN KEY (criado_por) REFERENCES usuarios(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_compromissos_criado_por: %', SQLERRM; END $$;

DO $$ BEGIN ALTER TABLE cirurgias ADD CONSTRAINT fk_cirurgias_clinica FOREIGN KEY (clinica_id) REFERENCES clinicas(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_cirurgias_clinica: %', SQLERRM; END $$;
DO $$ BEGIN ALTER TABLE cirurgias ADD CONSTRAINT fk_cirurgias_paciente FOREIGN KEY (paciente_id) REFERENCES pacientes(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_cirurgias_paciente: %', SQLERRM; END $$;
DO $$ BEGIN ALTER TABLE cirurgias ADD CONSTRAINT fk_cirurgias_medico FOREIGN KEY (medico_id) REFERENCES medicos(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_cirurgias_medico: %', SQLERRM; END $$;
DO $$ BEGIN ALTER TABLE cirurgias ADD CONSTRAINT fk_cirurgias_agendamento FOREIGN KEY (agendamento_id) REFERENCES agendamentos(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_cirurgias_agendamento: %', SQLERRM; END $$;
DO $$ BEGIN ALTER TABLE cirurgias ADD CONSTRAINT fk_cirurgias_hospital FOREIGN KEY (hospital_id) REFERENCES hospitais(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_cirurgias_hospital: %', SQLERRM; END $$;
DO $$ BEGIN ALTER TABLE cirurgias ADD CONSTRAINT fk_cirurgias_criado_por FOREIGN KEY (criado_por) REFERENCES usuarios(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_cirurgias_criado_por: %', SQLERRM; END $$;
DO $$ BEGIN ALTER TABLE cirurgias ADD CONSTRAINT fk_cirurgias_finalizado_por FOREIGN KEY (finalizado_por) REFERENCES usuarios(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_cirurgias_finalizado_por: %', SQLERRM; END $$;

DO $$ BEGIN ALTER TABLE cirurgia_participantes ADD CONSTRAINT fk_cirurgia_participantes_cirurgia FOREIGN KEY (cirurgia_id) REFERENCES cirurgias(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_cirurgia_participantes_cirurgia: %', SQLERRM; END $$;
DO $$ BEGIN ALTER TABLE cirurgia_participantes ADD CONSTRAINT fk_cirurgia_participantes_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_cirurgia_participantes_usuario: %', SQLERRM; END $$;
DO $$ BEGIN ALTER TABLE cirurgia_participantes ADD CONSTRAINT fk_cirurgia_participantes_criado_por FOREIGN KEY (criado_por) REFERENCES usuarios(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_cirurgia_participantes_criado_por: %', SQLERRM; END $$;
DO $$ BEGIN ALTER TABLE cirurgia_participantes ADD CONSTRAINT fk_cirurgia_participantes_aprovado_por FOREIGN KEY (aprovado_por) REFERENCES usuarios(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_cirurgia_participantes_aprovado_por: %', SQLERRM; END $$;

DO $$ BEGIN ALTER TABLE itens_cirurgia_catalogo ADD CONSTRAINT fk_itens_cirurgia_catalogo_clinica FOREIGN KEY (clinica_id) REFERENCES clinicas(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_itens_cirurgia_catalogo_clinica: %', SQLERRM; END $$;

DO $$ BEGIN ALTER TABLE cirurgia_itens ADD CONSTRAINT fk_cirurgia_itens_cirurgia FOREIGN KEY (cirurgia_id) REFERENCES cirurgias(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_cirurgia_itens_cirurgia: %', SQLERRM; END $$;
DO $$ BEGIN ALTER TABLE cirurgia_itens ADD CONSTRAINT fk_cirurgia_itens_item FOREIGN KEY (item_id) REFERENCES itens_cirurgia_catalogo(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_cirurgia_itens_item: %', SQLERRM; END $$;

DO $$ BEGIN ALTER TABLE auxiliares ADD CONSTRAINT fk_auxiliares_clinica FOREIGN KEY (clinica_id) REFERENCES clinicas(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_auxiliares_clinica: %', SQLERRM; END $$;

DO $$ BEGIN ALTER TABLE cirurgia_auxiliares ADD CONSTRAINT fk_cirurgia_auxiliares_cirurgia FOREIGN KEY (cirurgia_id) REFERENCES cirurgias(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_cirurgia_auxiliares_cirurgia: %', SQLERRM; END $$;
DO $$ BEGIN ALTER TABLE cirurgia_auxiliares ADD CONSTRAINT fk_cirurgia_auxiliares_auxiliar FOREIGN KEY (auxiliar_id) REFERENCES auxiliares(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_cirurgia_auxiliares_auxiliar: %', SQLERRM; END $$;

DO $$ BEGIN ALTER TABLE itens_orcamento_catalogo ADD CONSTRAINT fk_itens_orcamento_catalogo_clinica FOREIGN KEY (clinica_id) REFERENCES clinicas(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_itens_orcamento_catalogo_clinica: %', SQLERRM; END $$;
DO $$ BEGIN ALTER TABLE itens_orcamento_catalogo ADD CONSTRAINT fk_itens_orcamento_catalogo_criado_por FOREIGN KEY (criado_por) REFERENCES usuarios(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_itens_orcamento_catalogo_criado_por: %', SQLERRM; END $$;

DO $$ BEGIN ALTER TABLE orcamento_modelos ADD CONSTRAINT fk_orcamento_modelos_clinica FOREIGN KEY (clinica_id) REFERENCES clinicas(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_orcamento_modelos_clinica: %', SQLERRM; END $$;
DO $$ BEGIN ALTER TABLE orcamento_modelos ADD CONSTRAINT fk_orcamento_modelos_criado_por FOREIGN KEY (criado_por) REFERENCES usuarios(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_orcamento_modelos_criado_por: %', SQLERRM; END $$;

DO $$ BEGIN ALTER TABLE orcamentos ADD CONSTRAINT fk_orcamentos_clinica FOREIGN KEY (clinica_id) REFERENCES clinicas(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_orcamentos_clinica: %', SQLERRM; END $$;
DO $$ BEGIN ALTER TABLE orcamentos ADD CONSTRAINT fk_orcamentos_paciente FOREIGN KEY (paciente_id) REFERENCES pacientes(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_orcamentos_paciente: %', SQLERRM; END $$;
DO $$ BEGIN ALTER TABLE orcamentos ADD CONSTRAINT fk_orcamentos_criado_por FOREIGN KEY (criado_por) REFERENCES usuarios(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_orcamentos_criado_por: %', SQLERRM; END $$;

DO $$ BEGIN ALTER TABLE pagamentos ADD CONSTRAINT fk_pagamentos_clinica FOREIGN KEY (clinica_id) REFERENCES clinicas(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_pagamentos_clinica: %', SQLERRM; END $$;
DO $$ BEGIN ALTER TABLE pagamentos ADD CONSTRAINT fk_pagamentos_paciente FOREIGN KEY (paciente_id) REFERENCES pacientes(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_pagamentos_paciente: %', SQLERRM; END $$;
DO $$ BEGIN ALTER TABLE pagamentos ADD CONSTRAINT fk_pagamentos_orcamento FOREIGN KEY (orcamento_id) REFERENCES orcamentos(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_pagamentos_orcamento: %', SQLERRM; END $$;
DO $$ BEGIN ALTER TABLE pagamentos ADD CONSTRAINT fk_pagamentos_criado_por FOREIGN KEY (criado_por) REFERENCES usuarios(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_pagamentos_criado_por: %', SQLERRM; END $$;

DO $$ BEGIN ALTER TABLE despesas_clinica ADD CONSTRAINT fk_despesas_clinica_clinica FOREIGN KEY (clinica_id) REFERENCES clinicas(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_despesas_clinica_clinica: %', SQLERRM; END $$;
DO $$ BEGIN ALTER TABLE despesas_clinica ADD CONSTRAINT fk_despesas_clinica_criado_por FOREIGN KEY (criado_por) REFERENCES usuarios(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_despesas_clinica_criado_por: %', SQLERRM; END $$;

DO $$ BEGIN ALTER TABLE comissoes_config ADD CONSTRAINT fk_comissoes_config_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_comissoes_config_usuario: %', SQLERRM; END $$;
DO $$ BEGIN ALTER TABLE comissoes_config ADD CONSTRAINT fk_comissoes_config_clinica FOREIGN KEY (clinica_id) REFERENCES clinicas(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_comissoes_config_clinica: %', SQLERRM; END $$;

DO $$ BEGIN ALTER TABLE comissoes_avulsas ADD CONSTRAINT fk_comissoes_avulsas_clinica FOREIGN KEY (clinica_id) REFERENCES clinicas(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_comissoes_avulsas_clinica: %', SQLERRM; END $$;
DO $$ BEGIN ALTER TABLE comissoes_avulsas ADD CONSTRAINT fk_comissoes_avulsas_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_comissoes_avulsas_usuario: %', SQLERRM; END $$;
DO $$ BEGIN ALTER TABLE comissoes_avulsas ADD CONSTRAINT fk_comissoes_avulsas_criado_por FOREIGN KEY (criado_por) REFERENCES usuarios(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_comissoes_avulsas_criado_por: %', SQLERRM; END $$;
DO $$ BEGIN ALTER TABLE comissoes_avulsas ADD CONSTRAINT fk_comissoes_avulsas_aprovado_por FOREIGN KEY (aprovado_por) REFERENCES usuarios(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_comissoes_avulsas_aprovado_por: %', SQLERRM; END $$;

DO $$ BEGIN ALTER TABLE comissoes_extras ADD CONSTRAINT fk_comissoes_extras_clinica FOREIGN KEY (clinica_id) REFERENCES clinicas(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_comissoes_extras_clinica: %', SQLERRM; END $$;
DO $$ BEGIN ALTER TABLE comissoes_extras ADD CONSTRAINT fk_comissoes_extras_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_comissoes_extras_usuario: %', SQLERRM; END $$;
DO $$ BEGIN ALTER TABLE comissoes_extras ADD CONSTRAINT fk_comissoes_extras_criado_por FOREIGN KEY (criado_por) REFERENCES usuarios(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_comissoes_extras_criado_por: %', SQLERRM; END $$;
DO $$ BEGIN ALTER TABLE comissoes_extras ADD CONSTRAINT fk_comissoes_extras_aprovado_por FOREIGN KEY (aprovado_por) REFERENCES usuarios(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_comissoes_extras_aprovado_por: %', SQLERRM; END $$;

DO $$ BEGIN ALTER TABLE financas_pessoais ADD CONSTRAINT fk_financas_pessoais_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_financas_pessoais_usuario: %', SQLERRM; END $$;

DO $$ BEGIN ALTER TABLE estoque_itens ADD CONSTRAINT fk_estoque_itens_clinica FOREIGN KEY (clinica_id) REFERENCES clinicas(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_estoque_itens_clinica: %', SQLERRM; END $$;
DO $$ BEGIN ALTER TABLE estoque_itens ADD CONSTRAINT fk_estoque_itens_criado_por FOREIGN KEY (criado_por) REFERENCES usuarios(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_estoque_itens_criado_por: %', SQLERRM; END $$;

DO $$ BEGIN ALTER TABLE reunioes ADD CONSTRAINT fk_reunioes_clinica FOREIGN KEY (clinica_id) REFERENCES clinicas(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_reunioes_clinica: %', SQLERRM; END $$;
DO $$ BEGIN ALTER TABLE reunioes ADD CONSTRAINT fk_reunioes_criado_por FOREIGN KEY (criado_por) REFERENCES usuarios(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_reunioes_criado_por: %', SQLERRM; END $$;

DO $$ BEGIN ALTER TABLE reuniao_participantes ADD CONSTRAINT fk_reuniao_participantes_reuniao FOREIGN KEY (reuniao_id) REFERENCES reunioes(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_reuniao_participantes_reuniao: %', SQLERRM; END $$;
DO $$ BEGIN ALTER TABLE reuniao_participantes ADD CONSTRAINT fk_reuniao_participantes_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_reuniao_participantes_usuario: %', SQLERRM; END $$;

DO $$ BEGIN ALTER TABLE notificacoes ADD CONSTRAINT fk_notificacoes_clinica FOREIGN KEY (clinica_id) REFERENCES clinicas(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_notificacoes_clinica: %', SQLERRM; END $$;
DO $$ BEGIN ALTER TABLE notificacoes ADD CONSTRAINT fk_notificacoes_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_notificacoes_usuario: %', SQLERRM; END $$;

DO $$ BEGIN ALTER TABLE prontuarios ADD CONSTRAINT fk_prontuarios_clinica FOREIGN KEY (clinica_id) REFERENCES clinicas(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_prontuarios_clinica: %', SQLERRM; END $$;
DO $$ BEGIN ALTER TABLE prontuarios ADD CONSTRAINT fk_prontuarios_paciente FOREIGN KEY (paciente_id) REFERENCES pacientes(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_prontuarios_paciente: %', SQLERRM; END $$;
DO $$ BEGIN ALTER TABLE prontuarios ADD CONSTRAINT fk_prontuarios_medico FOREIGN KEY (medico_id) REFERENCES medicos(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_prontuarios_medico: %', SQLERRM; END $$;
DO $$ BEGIN ALTER TABLE prontuarios ADD CONSTRAINT fk_prontuarios_criado_por FOREIGN KEY (criado_por) REFERENCES usuarios(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_prontuarios_criado_por: %', SQLERRM; END $$;

-- Sem FK pra prontuario_id/usuario_id (de propósito — ver comentário no schema.postgres.sql):
-- a linha de auditoria precisa sobreviver mesmo se o prontuário ou o usuário forem removidos depois.
DO $$ BEGIN ALTER TABLE prontuarios_auditoria ADD CONSTRAINT fk_prontuarios_auditoria_clinica FOREIGN KEY (clinica_id) REFERENCES clinicas(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_prontuarios_auditoria_clinica: %', SQLERRM; END $$;

DO $$ BEGIN ALTER TABLE mensagens ADD CONSTRAINT fk_mensagens_clinica FOREIGN KEY (clinica_id) REFERENCES clinicas(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_mensagens_clinica: %', SQLERRM; END $$;

DO $$ BEGIN ALTER TABLE perfis_instalacao ADD CONSTRAINT fk_perfis_instalacao_clinica FOREIGN KEY (clinica_id) REFERENCES clinicas(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_perfis_instalacao_clinica: %', SQLERRM; END $$;

DO $$ BEGIN ALTER TABLE fotos_paciente ADD CONSTRAINT fk_fotos_paciente_clinica FOREIGN KEY (clinica_id) REFERENCES clinicas(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_fotos_paciente_clinica: %', SQLERRM; END $$;
DO $$ BEGIN ALTER TABLE fotos_paciente ADD CONSTRAINT fk_fotos_paciente_paciente FOREIGN KEY (paciente_id) REFERENCES pacientes(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_fotos_paciente_paciente: %', SQLERRM; END $$;
DO $$ BEGIN ALTER TABLE fotos_paciente ADD CONSTRAINT fk_fotos_paciente_criado_por FOREIGN KEY (criado_por) REFERENCES usuarios(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_fotos_paciente_criado_por: %', SQLERRM; END $$;

DO $$ BEGIN ALTER TABLE sessoes_fisioterapia ADD CONSTRAINT fk_sessoes_fisioterapia_clinica FOREIGN KEY (clinica_id) REFERENCES clinicas(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_sessoes_fisioterapia_clinica: %', SQLERRM; END $$;
DO $$ BEGIN ALTER TABLE sessoes_fisioterapia ADD CONSTRAINT fk_sessoes_fisioterapia_paciente FOREIGN KEY (paciente_id) REFERENCES pacientes(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_sessoes_fisioterapia_paciente: %', SQLERRM; END $$;
DO $$ BEGIN ALTER TABLE sessoes_fisioterapia ADD CONSTRAINT fk_sessoes_fisioterapia_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_sessoes_fisioterapia_usuario: %', SQLERRM; END $$;

DO $$ BEGIN ALTER TABLE notas_fiscais_paciente ADD CONSTRAINT fk_notas_fiscais_paciente_clinica FOREIGN KEY (clinica_id) REFERENCES clinicas(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_notas_fiscais_paciente_clinica: %', SQLERRM; END $$;
DO $$ BEGIN ALTER TABLE notas_fiscais_paciente ADD CONSTRAINT fk_notas_fiscais_paciente_paciente FOREIGN KEY (paciente_id) REFERENCES pacientes(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_notas_fiscais_paciente_paciente: %', SQLERRM; END $$;
DO $$ BEGIN ALTER TABLE notas_fiscais_paciente ADD CONSTRAINT fk_notas_fiscais_paciente_criado_por FOREIGN KEY (criado_por) REFERENCES usuarios(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_notas_fiscais_paciente_criado_por: %', SQLERRM; END $$;

DO $$ BEGIN ALTER TABLE contratos_paciente ADD CONSTRAINT fk_contratos_paciente_clinica FOREIGN KEY (clinica_id) REFERENCES clinicas(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_contratos_paciente_clinica: %', SQLERRM; END $$;
DO $$ BEGIN ALTER TABLE contratos_paciente ADD CONSTRAINT fk_contratos_paciente_paciente FOREIGN KEY (paciente_id) REFERENCES pacientes(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_contratos_paciente_paciente: %', SQLERRM; END $$;
DO $$ BEGIN ALTER TABLE contratos_paciente ADD CONSTRAINT fk_contratos_paciente_criado_por FOREIGN KEY (criado_por) REFERENCES usuarios(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_contratos_paciente_criado_por: %', SQLERRM; END $$;

DO $$ BEGIN ALTER TABLE contrato_modelo ADD CONSTRAINT fk_contrato_modelo_clinica FOREIGN KEY (clinica_id) REFERENCES clinicas(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_contrato_modelo_clinica: %', SQLERRM; END $$;
DO $$ BEGIN ALTER TABLE contrato_modelo ADD CONSTRAINT fk_contrato_modelo_atualizado_por FOREIGN KEY (atualizado_por) REFERENCES usuarios(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_contrato_modelo_atualizado_por: %', SQLERRM; END $$;

DO $$ BEGIN ALTER TABLE modelos_receita ADD CONSTRAINT fk_modelos_receita_clinica FOREIGN KEY (clinica_id) REFERENCES clinicas(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_modelos_receita_clinica: %', SQLERRM; END $$;
DO $$ BEGIN ALTER TABLE modelos_receita ADD CONSTRAINT fk_modelos_receita_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_modelos_receita_usuario: %', SQLERRM; END $$;

DO $$ BEGIN ALTER TABLE modelos_exame ADD CONSTRAINT fk_modelos_exame_clinica FOREIGN KEY (clinica_id) REFERENCES clinicas(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_modelos_exame_clinica: %', SQLERRM; END $$;
DO $$ BEGIN ALTER TABLE modelos_exame ADD CONSTRAINT fk_modelos_exame_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id); EXCEPTION WHEN others THEN RAISE NOTICE 'Falhou fk_modelos_exame_usuario: %', SQLERRM; END $$;
