# Plano de Resposta a Incidente de Segurança — CLÍNICAS (TECBM)

Última atualização: 14/09/2026

Este documento estabelece o procedimento a seguir em caso de incidente de segurança envolvendo dados pessoais tratados pelo sistema **CLÍNICAS**, desenvolvido pela **TECBM** (BRUNO MARTINS DA SILVA 39943134810, CNPJ 38.030.645/0001-40), em conformidade com a LGPD (art. 48) e com o Termo de Operador de Dados firmado com cada clínica cliente.

Considera-se **incidente de segurança** qualquer evento que comprometa a confidencialidade, integridade ou disponibilidade de dados pessoais tratados pelo Sistema — por exemplo: acesso não autorizado ao banco de dados, vazamento de credenciais, exploração de vulnerabilidade que exponha dados de pacientes ou usuários, perda de dados por falha técnica sem backup, ou comprometimento da infraestrutura (Supabase, Render, Netlify).

## 1. Detecção

Fontes prováveis de detecção:
- Alerta do próprio Supabase/Render/Netlify (ex: pico anômalo de acesso, alerta de segurança da plataforma).
- Log de auditoria de prontuário (`prontuarios_auditoria`) ou de tentativas de login malsucedidas (`login_tentativas`) mostrando padrão anômalo.
- Relato de um usuário da clínica ou de um paciente.
- Descoberta proativa durante manutenção/desenvolvimento (ex: como ocorreu com a correção da validação de certificado TLS e do role de banco em 2026-09-13).

## 2. Passos imediatos (nas primeiras horas)

1. **Conter**: isolar a causa — revogar credencial comprometida, desativar endpoint/função vulnerável, ou aplicar patch, o quanto antes, mesmo antes de entender o incidente por completo.
2. **Preservar evidência**: antes de corrigir definitivamente, registrar (print, log, timestamp) o que foi encontrado — necessário pra avaliar extensão do incidente depois.
3. **Avaliar escopo**: quais tabelas/dados foram (ou podem ter sido) acessados indevidamente, quantos titulares (pacientes/usuários) são potencialmente afetados, e de qual(is) clínica(s) — o Sistema é multi-tenant, então um incidente pode afetar uma clínica só ou várias.
4. **Corrigir a causa raiz**: aplicar a correção definitiva (não só a contenção temporária).

## 3. Avaliação de risco e necessidade de comunicação

Segundo o art. 48 da LGPD, a comunicação à ANPD e ao titular é obrigatória quando o incidente **acarretar risco ou dano relevante** aos titulares. Critérios pra avaliar isso:

- Os dados expostos incluíam dado sensível (saúde) ou dado que facilite fraude (CPF, dados financeiros)?
- Havia mitigação (ex: dado estava criptografado/anonimizado) que reduza o risco real?
- Quantos titulares foram afetados e há indício de uso indevido já ocorrido?

Se a resposta indicar risco relevante, seguir para a comunicação (seção 4). Em caso de dúvida, o encarregado deve tratar como se exigisse comunicação — é a postura mais segura.

## 4. Comunicação

- **À Clínica Contratante (Controladora)**: comunicar **sem demora injustificada**, com todos os fatos apurados até o momento (o que aconteceu, quais dados/titulares, o que já foi feito). Como a TECBM é Operadora e a clínica é Controladora perante o paciente, é a clínica quem decide e executa a comunicação à ANPD e aos titulares, mas a TECBM deve fornecer todo o suporte técnico necessário para isso.
- **À ANPD e aos titulares**: responsabilidade da Clínica Contratante como Controladora, com apoio técnico da TECBM. Prazo: "prazo razoável", sem demora injustificada, conforme regulamentação da ANPD.
- **Conteúdo mínimo da comunicação**: descrição da natureza dos dados afetados, informações sobre os titulares envolvidos, medidas técnicas e de segurança já tomadas, riscos relacionados ao incidente, e medidas que serão adotadas para reverter ou mitigar os efeitos.

## 5. Correção e prevenção de recorrência

1. Aplicar a correção definitiva em produção (patch/deploy).
2. Documentar o incidente: o que aconteceu, causa raiz, dados afetados, correção aplicada, data. Manter esse registro (não precisa ser público, mas precisa existir para eventual auditoria da ANPD ou da clínica).
3. Avaliar se o mesmo tipo de falha existe em outro ponto do Sistema ou em outros produtos da TECBM (prática já seguida — ex: quando a falha de autorização foi encontrada na edge function `gerenciar-contas` do QG Cia Paulista em 2026-09-14, ficou registrado como algo a verificar em outros produtos).
4. Se aplicável, reforçar teste automatizado ou revisão de código para o tipo de falha encontrado.

## 6. Responsável

Todo incidente deve passar pelo Encarregado (DPO) da TECBM:

**Bruno Martins da Silva** — tecbmtecnologia@gmail.com

Como a TECBM hoje não tem equipe própria de segurança nem advogado revisando (decisão explícita do responsável), o próprio DPO conduz a avaliação técnica e jurídica inicial, podendo buscar apoio jurídico externo pontual se o incidente for grave (ex: exposição confirmada de dados sensíveis de saúde em volume relevante).

## 7. Revisão deste plano

Revisar este documento sempre que um incidente real ocorrer (incorporando a lição aprendida) e, no mínimo, uma vez ao ano.

## 8. Foro

Fica eleito o foro da comarca de **São Paulo/SP** para dirimir eventuais controvérsias decorrentes deste documento, com renúncia a qualquer outro, por mais privilegiado que seja.
