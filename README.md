# TecBM Clínicas — Sistema de Gestão para Clínicas Médicas (SaaS)

Plataforma **multi-clínica (SaaS / white-label)** para gestão de clínicas médicas: agenda, prontuário, cirurgias, financeiro, estoque, ponto eletrônico e telemedicina. Um único sistema atende várias clínicas clientes ao mesmo tempo, cada uma com seu logotipo e sua cor, e cada clínica enxerga somente os próprios dados.

O front-end é um **PWA** instalável no computador (Chrome/Edge) e no celular (Android/iOS), e funciona como um app nativo, sem loja de aplicativos.

🔗 **Em produção:** https://tecbmclinicas.netlify.app  
_O acesso exige login, porque o sistema guarda dados de saúde. Posso apresentar o sistema funcionando em uma chamada._

---

## Módulos

**Atendimento**
- **Agenda** de consultas e de fisioterapia, presencial ou telemedicina
- **Prontuário eletrônico** com histórico clínico do paciente e fotos
- **Receitas** e **pedidos de exame** a partir de modelos da clínica, gerados em PDF
- **Telemedicina** com chat em tempo real (Socket.io) vinculado à consulta
- **Sala de reunião** com videochamada (WebRTC)

**Cirurgias**
- Agendamento por hospital, equipe de auxiliares e itens usados
- Relatório da cirurgia em PDF

**Administrativo e financeiro**
- Pacientes, médicos, auxiliares, hospitais e usuários
- Contratos do paciente a partir de modelo editável, gerados em PDF
- Orçamentos, pagamentos, despesas, comissões dos médicos e relatórios
- Controle de estoque
- Etiqueta e pulseira de identificação do paciente em PDF

**Ponto eletrônico**
- Marcação de ponto com foto e localização
- Banco de horas pela jornada, com saldo diário e acúmulo dos meses anteriores
- Folha de frequência em PDF

**Plataforma (dono do SaaS)**
- Cadastro das clínicas clientes, cada uma com sua marca, e criação dos administradores de cada uma
- Links de instalação do app por perfil (médico, recepção etc.) com o nome da clínica

## Segurança e LGPD

- Autenticação JWT com senhas em bcrypt e perfis de acesso: super admin, admin da clínica, médico e recepção
- Isolamento dos dados por clínica em todas as rotas da API
- **Log de auditoria** de acesso e alteração de prontuário
- **Log de tentativas de login malsucedidas**
- **Exportação e anonimização** dos dados do paciente (direitos do titular na LGPD)
- Termo de consentimento do paciente, política de privacidade e termos de uso
- Banco Postgres sem acesso pela API pública (RLS ativo, sem políticas): só o back-end acessa, por conexão com TLS validado
- CORS restrito à origem do front-end

## Tecnologias

| Camada | Stack |
|---|---|
| Front-end | React 19, TypeScript, Vite, Tailwind CSS 4, React Router 7, vite-plugin-pwa |
| Back-end | Node.js, Express 5, Socket.io, JWT, bcrypt, Multer (uploads), PDFKit (receitas, exames, contratos, relatórios e mais) |
| Banco | PostgreSQL (Supabase) |
| Deploy | Front-end no Netlify (com Edge Function) · API no Render · deploy contínuo pelo GitHub |

## Arquitetura

```
 PWA (React + TS) ──► Netlify ──/api/*, /uploads/*──► API Node/Express (Render) ──► Postgres (Supabase)
        │                                                    ▲
        └──────────── Socket.io (chat da telemedicina) ──────┘
```

O Netlify repassa `/api` e `/uploads` para a API, então o front-end e a API parecem ter a mesma origem. Uma Edge Function entrega o manifest certo para os links de instalação por clínica.

## Estrutura

```
├── backend/    # API: rotas, geração de PDFs, autenticação, schema Postgres
└── frontend/   # PWA React + TypeScript
```

## Rodando localmente

```bash
# API
cd backend
cp .env.example .env    # DATABASE_URL do Postgres, JWT_SECRET etc.
npm install && npm run dev        # http://localhost:3001

# Front-end (outro terminal)
cd frontend
npm install && npm run dev        # http://localhost:5173
```

Na primeira execução, o back-end cria uma clínica de demonstração e os usuários iniciais. Defina senhas próprias antes de usar em produção.

---

Desenvolvido por **Bruno Martins da Silva** — [TEC BM Tecnologia](https://github.com/tecbmtecnologia-dot)
