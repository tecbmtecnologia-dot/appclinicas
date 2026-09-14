# Termo de Tratamento de Dados Pessoais (Operador x Controlador) — CLÍNICAS

Este é o contrato que a TECBM deveria apresentar/assinar com **cada clínica** que contrata o sistema CLÍNICAS, além do contrato comercial de licenciamento. Formaliza que a clínica é dona da decisão sobre os dados dos pacientes, e a TECBM só processa tecnicamente.

---

**CONTRATANTE / CONTROLADORA:** [NOME DA CLÍNICA], CNPJ [CNPJ DA CLÍNICA], doravante "Controladora".

**CONTRATADA / OPERADORA:** TECBM (BRUNO MARTINS DA SILVA 39943134810), CNPJ 38.030.645/0001-40, e-mail tecbmtecnologia@gmail.com, doravante "Operadora".

## 1. Objeto

A Operadora fornece à Controladora o sistema **CLÍNICAS**, através do qual a Controladora insere, armazena e processa dados pessoais e dados sensíveis de saúde de seus pacientes ("Titulares"). A Operadora trata esses dados exclusivamente para viabilizar o funcionamento técnico do sistema, por conta e ordem da Controladora.

## 2. Papéis das partes

- A **Controladora** (clínica) é responsável por obter o consentimento e/ou base legal dos pacientes (ver Termo de Consentimento de Dados de Saúde), definir finalidades de uso dos dados e responder perante os pacientes e a ANPD.
- A **Operadora** (TECBM) trata os dados apenas conforme as funcionalidades do sistema, não podendo usá-los para finalidade própria, revendê-los ou compartilhá-los fora do necessário à operação técnica.

## 3. Obrigações da Operadora

- Tratar os dados apenas para viabilizar o funcionamento do sistema CLÍNICAS.
- Manter as medidas de segurança já implementadas no sistema: controle de acesso por perfil de usuário (admin, médico, enfermagem, recepção, financeiro, coordenador), senha criptografada, conexão HTTPS/TLS, RLS no banco de dados.
- Manter sigilo sobre os dados tratados, inclusive após o encerramento do contrato.
- Notificar a Controladora em até 48 horas da ciência de qualquer incidente de segurança que possa afetar dados de pacientes, com informações suficientes para a Controladora cumprir suas obrigações de comunicação à ANPD/pacientes.
- Auxiliar a Controladora a atender solicitações de pacientes quanto a seus direitos (acesso, correção, exclusão), dentro das funcionalidades disponíveis no sistema.
- Ao final do contrato, eliminar ou devolver os dados à Controladora, salvo obrigação legal de retenção (ex: prontuário).
- Utilizar como subprocessadores apenas: **Supabase** (banco de dados, hospedado na região Oregon/EUA) e **Render** (servidor de aplicação) e **Netlify** (hospedagem do frontend) — sujeitos a obrigações contratuais de segurança compatíveis com este Termo. Qualquer novo subprocessador relevante será comunicado à Controladora.

## 4. Obrigações da Controladora

- Garantir base legal e, quando aplicável, consentimento específico dos pacientes para tratamento de dados de saúde, utilizando o Termo de Consentimento fornecido junto ao sistema (ou equivalente próprio).
- Não inserir no sistema dados além do necessário para o atendimento e gestão da clínica.
- Comunicar à Operadora qualquer solicitação de paciente relacionada a seus dados que exija suporte técnico.
- Garantir que apenas colaboradores autorizados tenham login no sistema, com perfil de acesso compatível com sua função.

## 5. Transferência internacional de dados

Os dados são armazenados em servidor de banco de dados localizado nos Estados Unidos (Supabase, região Oregon). A Controladora está ciente dessa transferência internacional, necessária para a prestação do serviço, e concorda com ela nos termos deste contrato.

## 6. Incidentes de segurança

Em caso de incidente que envolva dados tratados no sistema, a parte que tomar conhecimento comunicará a outra em até 48 horas, cooperando para mitigar riscos e cumprir obrigações legais de comunicação.

## 7. Vigência e efeitos do encerramento

Este Termo vigora enquanto durar o contrato de licenciamento do sistema CLÍNICAS. Encerrado o contrato, a Operadora eliminará ou devolverá os dados pessoais tratados por conta da Controladora, ressalvada a guarda de prontuário exigida por regulamentação de saúde.

## 8. Foro

Fica eleito o foro da comarca de **São Paulo/SP**.

[LOCAL], [DATA]

_______________________________________
Controladora — [NOME DA CLÍNICA]

_______________________________________
Operadora — TECBM (Bruno Martins da Silva)
