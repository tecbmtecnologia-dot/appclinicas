# Política de Retenção de Dados e Backup — CLÍNICAS (TECBM)

Última atualização: 14/09/2026

Este documento define, para o sistema **CLÍNICAS** desenvolvido pela **TECBM** (BRUNO MARTINS DA SILVA 39943134810, CNPJ 38.030.645/0001-40), por quanto tempo cada tipo de dado é mantido e como é feito o backup, em conformidade com a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 — LGPD), em especial o princípio da necessidade (art. 6º, III) e o direito de eliminação do titular (art. 18, VI).

## 1. Prazos de retenção por tipo de dado

| Tipo de dado | Prazo de retenção | Base do prazo |
|---|---|---|
| Prontuário médico e evolução clínica | Mínimo 20 anos a partir do último registro | Resolução CFM nº 1.821/2007 (guarda de prontuário em suporte digital) |
| Receitas, prescrições, fotos clínicas (pré/pós-operatório) | Mesmo prazo do prontuário (parte integrante dele) | Resolução CFM nº 1.821/2007 |
| Dados financeiros da clínica (pagamentos, orçamentos, comissões, notas fiscais) | 5 anos | Prazo decadencial/prescricional fiscal e trabalhista (CTN art. 173/174; legislação tributária) |
| Contratos assinados pelo paciente | Mesmo prazo dos dados financeiros vinculados, ou do prontuário, o que for maior | Segurança jurídica em eventual disputa |
| Dados cadastrais do paciente (nome, CPF, telefone, endereço) | Enquanto o prontuário ou registro financeiro vinculado existir; anonimizados a pedido do titular antes disso, quando não houver óbice legal | LGPD art. 16 combinado com a retenção legal acima |
| Dados de usuários/colaboradores da clínica (login, perfil, ponto eletrônico) | Duração do vínculo + 5 anos (prazo prescricional trabalhista, CLT art. 11) | CLT art. 11 |
| Log de auditoria de prontuário (`prontuarios_auditoria`) | Mesmo prazo do prontuário a que se refere | Rastreabilidade exigida durante toda a vida do prontuário |
| Log de tentativas de login malsucedidas (`login_tentativas`) | 12 meses, com expurgo automático | Finalidade é detecção de abuso recente; não há razão pra retenção indefinida |

## 2. Como a eliminação/anonimização é feita na prática

- **Paciente**: a clínica pode anonimizar o cadastro do paciente pelo próprio Sistema (aba Dados da ficha do paciente, ver `[[projeto-app-clinicas-estado]]`). Isso remove nome/CPF/RG/telefone/e-mail/endereço/foto, mas **mantém prontuário e registros financeiros vinculados ao cadastro anonimizado**, porque apagá-los violaria a retenção legal acima.
- **Usuário/colaborador**: ao desligar um colaborador, a clínica deve manter o registro de acesso pelo prazo trabalhista acima antes de considerar remoção; hoje isso é feito desativando o acesso, não apagando o histórico.
- **Log de login malsucedido**: hoje não há expurgo automático implementado — é um item técnico futuro (rotina de limpeza de registros com mais de 12 meses), não bloqueante para a conformidade atual porque o log já cumpre sua finalidade de auditoria de segurança recente.

## 3. Backup

- O banco de dados de produção roda no **Supabase** (Postgres gerenciado), no plano **Pro**, **confirmado em 14/09/2026**.
- O plano Pro inclui **backup automático diário, com retenção de 7 dias** (rotativo — cada novo backup diário substitui o mais antigo com mais de 7 dias). Consultado em Project Settings → Database → Backups no painel do projeto.
- **Point-in-Time Recovery (PITR)** — restauração para um instante específico, não só para o snapshot diário — é um add-on pago separado, **não incluído por padrão no Pro**. Não confirmado se está contratado; se o Sistema evoluir para volume/criticidade maior, vale considerar contratar.
- Retenção de 7 dias é considerada suficiente para o volume/porte atual do Sistema, mas deve ser revista se a clínica cliente exigir contratualmente uma janela de recuperação maior.

**Recomendação de verificação periódica**: a cada revisão deste documento (ver seção 4), confirmar novamente no painel se o plano e a retenção continuam os mesmos, pois mudança de plano (upgrade/downgrade) altera esses números sem aviso automático neste documento.

## 4. Revisão

Este documento deve ser revisado sempre que: (a) novo tipo de dado sensível passar a ser tratado pelo Sistema, (b) a legislação de guarda de prontuário ou fiscal for alterada, ou (c) o plano de Supabase/infraestrutura mudar.

## 5. Encarregado (DPO)

**Bruno Martins da Silva** — tecbmtecnologia@gmail.com

## 6. Foro

Fica eleito o foro da comarca de **São Paulo/SP** para dirimir eventuais controvérsias decorrentes deste documento, com renúncia a qualquer outro, por mais privilegiado que seja.
