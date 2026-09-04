# Clínicas Médicas — App Desktop e Mobile (PWA)

Sistema de gestão **multi-clínica** (SaaS) com 4 módulos: **agendamento de consultas**,
**prontuário eletrônico**, **gestão administrativa** (usuários, pacientes e médicos) e
**telemedicina** (chat em tempo real). Um único sistema atende várias clínicas
clientes ao mesmo tempo — cada uma só enxerga seus próprios dados, com logotipo e
cor próprios. O front-end é um PWA — instalável tanto no desktop (Windows/Mac/Linux,
via Chrome ou Edge) quanto no celular (Android/iOS, "Adicionar à tela inicial") — e
funciona como um app nativo, sem precisar de loja de aplicativos.

## Estrutura do projeto

```
app-clinicas/
├── backend/     # API local (Node.js + Express + SQLite + Socket.io)
└── frontend/    # App React + Vite + TypeScript + Tailwind (PWA)
```

## Pré-requisitos

- **Node.js 22 ou superior** (o backend usa o módulo nativo `node:sqlite`, sem
  precisar compilar nada). Verifique com `node -v`. Caso esteja em uma versão
  mais antiga, baixe em https://nodejs.org.

## Como rodar (desenvolvimento)

Abra dois terminais.

**Terminal 1 — Backend (API):**
```bash
cd backend
npm install
npm run dev
```
A API sobe em `http://localhost:3001`. O banco de dados SQLite é criado
automaticamente em `backend/data/clinica.db` na primeira execução.

**Terminal 2 — Frontend (App):**
```bash
cd frontend
npm install
npm run dev
```
O app abre em `http://localhost:5173`. As chamadas para `/api/*` e o chat
(`/socket.io`) são automaticamente redirecionadas para o backend (veja
`vite.config.ts`).

## Instalar como app (desktop e mobile)

Com o app rodando (ou já publicado em produção):
- **Desktop (Chrome/Edge):** clique no ícone de instalar que aparece na barra
  de endereço, ou no menu ⋮ → "Instalar app".
- **Celular (Android/Chrome):** menu ⋮ → "Adicionar à tela inicial".
- **iPhone (Safari):** botão de compartilhar → "Adicionar à Tela de Início".

O app abre em janela própria, com ícone e sem a barra do navegador — como um
aplicativo nativo.

## Módulos implementados

- **Login/autenticação**: todo o sistema exige login (JWT). Perfis: administrador
  da plataforma (`super_admin`, gerencia as clínicas clientes), administrador de
  clínica (`admin`, gerencia usuários/médicos/pacientes da própria clínica),
  médico e recepção.
- **Multi-clínica / white-label** (`/plataforma/clinicas`, só para `super_admin`):
  cadastro das clínicas clientes, cada uma com logotipo e cor próprios, e criação
  do primeiro usuário administrador de cada uma. Todos os dados (usuários,
  pacientes, médicos, agendamentos, prontuários) são isolados por clínica.
- **Usuários** (`/administrativo/usuarios`, só para `admin` da clínica): cadastro
  de contas de acesso da clínica (administrador, médico, recepção).
- **Agendamento** (`/agendamento`): criar, listar por dia, concluir e cancelar
  consultas, com tipo presencial ou telemedicina.
- **Prontuário eletrônico** (`/prontuario`): histórico clínico por paciente —
  queixa, diagnóstico, prescrição e observações.
- **Administrativo** (`/administrativo/pacientes` e `/medicos`): cadastro,
  edição e remoção de pacientes e médicos.
- **Telemedicina** (`/telemedicina`): chat em tempo real (Socket.io) vinculado
  a cada consulta marcada como "telemedicina". O histórico de mensagens fica
  salvo no banco.

## Primeiro acesso

Na primeira execução do backend, dois usuários são criados automaticamente
(mostrados no terminal) e uma clínica de exemplo:

- **Administrador da plataforma** (você, o dono do sistema — cadastra as
  clínicas clientes): `super@plataforma.local` / `admin123`
- **Administrador da Clínica Demo** (cadastra usuários, médicos e pacientes
  daquela clínica): `admin@clinica.local` / `admin123`

Troque as duas senhas depois do primeiro acesso (em `Usuários`, para o admin
da clínica; o super admin ainda não tem tela própria de perfil — trocar a
senha dele exige criar um novo usuário via API por enquanto).

## Vendendo para novas clínicas

Entre como administrador da plataforma e vá em **Clínicas** → **+ Nova
clínica**. Informe nome, logotipo (URL de imagem) e cor da marca — e,
opcionalmente, já crie o primeiro usuário administrador daquela clínica na
mesma tela. A partir daí a clínica cliente usa o mesmo sistema, com sua
própria marca, sem enxergar dados de nenhuma outra clínica.

## Próximos passos sugeridos

A base (API, banco multi-clínica, autenticação, PWA e os módulos com CRUD
funcionando) está pronta para você evoluir. Algumas ideias, em ordem de
complexidade:

1. **Upload de logotipo** — hoje o logotipo da clínica é uma URL de imagem;
   um upload direto (ex: para S3/Cloudinary) seria mais prático para o cliente.
2. **Videochamada real na Telemedicina** — hoje é um chat de texto; vídeo via
   WebRTC é um projeto à parte (ex: usando a biblioteca `simple-peer` ou um
   serviço como Daily.co/Twilio Video).
3. **Notificações** (lembrete de consulta por e-mail/SMS/push).
4. **Relatórios e faturamento** (convênios, exportação de dados, cobrança das
   clínicas clientes pela assinatura).
5. **Deploy em produção**: hoje o backend roda localmente com SQLite (ótimo
   para desenvolvimento). Para atender clínicas de verdade pela internet, o
   backend precisaria ser hospedado (ex: Railway, Render, um VPS) com um
   banco como PostgreSQL, e um domínio com HTTPS.

## Dados de exemplo

Entre como admin da Clínica Demo (`admin@clinica.local` / `admin123`) e
cadastre um médico e um paciente primeiro (`Administrativo`), depois use
`Agendamento` para marcar uma consulta — inclusive de telemedicina, para
testar o chat.
