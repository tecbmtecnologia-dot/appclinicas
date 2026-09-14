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
- [x] Log de quem acessou/alterou prontuário (quem, quando, o quê) — implementado em 2026-09-14. Tabela `prontuarios_auditoria`, gravada em toda leitura/criação/edição/exclusão de prontuário (`routes/prontuarios.js`), consultável na aba "Auditoria" da ficha do paciente (admin/coordenador).
- [x] Log de tentativas de login malsucedidas — implementado em 2026-09-14. Tabela `login_tentativas` (e-mail, motivo, IP, data/hora), seção colapsável na tela Usuários (admin/coordenador veem só a própria clínica; super_admin vê tudo).

## Direitos do titular (na prática)
- [x] Exportação dos dados de um paciente (portabilidade) — implementado em 2026-09-14. Botão "Exportar dados (LGPD)" na aba Dados da ficha do paciente (admin/coordenador), baixa um JSON com cadastro + prontuários + agendamentos + cirurgias + orçamentos + pagamentos + fotos + notas fiscais + contratos + sessões de fisioterapia.
- [x] Exclusão/anonimização de dados de um paciente a pedido — implementado em 2026-09-14 como **anonimização** (não exclusão física): apaga nome/CPF/RG/telefone/e-mail/endereço/foto etc., mantém prontuário e registros financeiros vinculados ao cadastro anonimizado. Decisão: prontuário médico tem retenção legal obrigatória (Resolução CFM) independente da LGPD, e apagar pagamento/nota fiscal quebraria o registro contábil da clínica — confirmado explicitamente com o usuário antes de implementar.
- [x] A ficha do paciente (`PacienteDetalhe.tsx`) reúne praticamente todos os dados dele em um lugar só.

## Retenção e backup
- [x] Política formal de retenção por tipo de dado — documento criado em 14/09/2026 (`politica-retencao-backup.md`, nesta pasta).
- [x] Backup automático confirmado em 14/09/2026: projeto Supabase no plano **Pro**, backup diário com retenção de 7 dias. PITR não confirmado como contratado (add-on separado, não bloqueante). Ver seção 3 de `politica-retencao-backup.md`.

## Consentimento
- [x] Tela de aceite de termos/política no cadastro do paciente, com registro de data/hora salvo no banco — em produção desde 2026-09-13 (checkbox em `Pacientes.tsx`/`PacienteDetalhe.tsx`, coluna `pacientes.consentimento_lgpd_em`, rotas públicas `/privacidade`, `/termos`, `/termo-consentimento-paciente`). Ainda não confirmado o teste do fluxo de escrita (POST/PUT paciente) com dado real em produção.
- [ ] Falta: fluxo para coletar o Termo de Consentimento de Dados de Saúde (pode começar em papel/PDF assinado e anexado, como já é feito com contratos — reaproveitar o fluxo de "+ PDF" que já existe na aba Contratos do paciente).

## Governança
- [x] Encarregado (DPO) definido: Bruno Martins da Silva, tecbmtecnologia@gmail.com (documentado na política de privacidade).
- [x] Plano formal de resposta a incidente — documento criado em 14/09/2026 (`plano-resposta-incidente.md`, nesta pasta).
- [ ] Falta: assinar o Termo de Operador x Controlador (`termo-operador-controlador.md`) com cada clínica cliente atual e futura — providência jurídica/comercial, não código.

## Prioridade sugerida pra próxima sessão de código
1. ~~Log de auditoria de acesso/alteração de prontuário~~ — feito em 2026-09-14.
2. ~~Consentimento no cadastro do paciente (checkbox + timestamp salvo)~~ — já estava feito antes desta sessão (ver seção Consentimento acima, campo `consentimento_lgpd_em` em `pacientes`).
3. ~~Exportação/exclusão de dados do paciente~~ — feito em 2026-09-14 (exportação em JSON + anonimização, ver seção "Direitos do titular" acima).

**Atualizado em 14/09/2026**: log de tentativas de login malsucedidas, política formal de retenção/backup (incluindo backup confirmado no Supabase Pro) e plano de resposta a incidente foram fechados (documentos criados nesta pasta). O que resta agora (nenhum é código): (1) fluxo pra coletar o Termo de Consentimento de Dados de Saúde assinado — ver seção Consentimento; (2) assinar o Termo de Operador×Controlador com cada clínica cliente (providência jurídica/comercial do Bruno).
