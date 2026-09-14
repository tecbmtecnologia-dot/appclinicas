# Checklist técnico LGPD — CLÍNICAS

Cruzado com o estado real do sistema em 13/09/2026. Ver `[[projeto-app-clinicas-estado]]` (memória da sessão) pra detalhes de cada item já feito.

## Segurança de acesso
- [x] Autenticação com senha criptografada.
- [x] Controle de acesso por perfil/permissão (admin, médico, enfermagem, recepção, financeiro, coordenador, pj).
- [x] Conexão HTTPS entre app e servidor (Netlify + Render).
- [x] Conexão TLS validada de verdade entre servidor e banco (certificado real do Supabase, corrigido em 2026-09-13 — antes aceitava qualquer certificado).
- [x] Row Level Security habilitado no banco (Supabase, por padrão em todas as tabelas) + revogação de grants desnecessários pros roles `anon`/`authenticated`.
- [x] Role de banco de produção sem privilégio de superusuário/DDL (`app_clinicas`, criado em 2026-09-13 substituindo o role `postgres` admin).

## Auditoria
- [ ] **Falta**: log de quem acessou/alterou prontuário (quem, quando, o quê). Hoje não existe nenhum registro disso — é o item de maior risco pendente, porque dado de saúde exige rastreabilidade de acesso.
- [ ] Falta: log de tentativas de login malsucedidas.

## Direitos do titular (na prática)
- [ ] Falta: forma de exportar os dados de um paciente específico (portabilidade). Hoje só dá pra ver os dados espalhados pela interface, não existe um "exportar tudo".
- [ ] Falta: forma de excluir/anonimizar dados de um paciente a pedido, sem quebrar histórico de outros registros (cirurgia, pagamento) que referenciam esse paciente.
- [x] Parcial: a ficha do paciente (`PacienteDetalhe.tsx`) já reúne praticamente todos os dados dele em um lugar só — facilita implementar exportação no futuro.

## Retenção e backup
- [ ] Falta: política formal de retenção por tipo de dado (hoje não há rotina de expurgo, tudo fica indefinidamente).
- [ ] Falta: confirmar rotina de backup do Postgres/Supabase (verificar no painel do Supabase se backup automático está ativo no plano contratado).

## Consentimento
- [ ] Falta: tela de aceite de termos/política no cadastro do paciente, com registro de data/hora do aceite salvo no banco (hoje o cadastro de paciente não tem nenhum campo de consentimento).
- [ ] Falta: fluxo para coletar o Termo de Consentimento de Dados de Saúde (pode começar em papel/PDF assinado e anexado, como já é feito com contratos — reaproveitar o fluxo de "+ PDF" que já existe na aba Contratos do paciente).

## Governança
- [x] Encarregado (DPO) definido: Bruno Martins da Silva, tecbmtecnologia@gmail.com (documentado na política de privacidade).
- [ ] Falta: plano formal de resposta a incidente (hoje seria reativo, sem procedimento escrito).
- [ ] Falta: assinar o Termo de Operador x Controlador (`termo-operador-controlador.md`) com cada clínica cliente atual e futura.

## Prioridade sugerida pra próxima sessão de código
1. Log de auditoria de acesso/alteração de prontuário (maior risco, exigido por regulação de saúde independente da LGPD).
2. Consentimento no cadastro do paciente (checkbox + timestamp salvo).
3. Exportação/exclusão de dados do paciente (pode ser manual/via suporte no começo, não precisa ser self-service imediatamente).
