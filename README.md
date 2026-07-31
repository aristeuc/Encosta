# Encosta · Gestão de Obras

Aplicação de gestão do fluxo "início de obra até à licença/escritura": cronograma com caminho crítico
(CPM), checklist de documentos por atividade, painel com o estado de todas as obras, notificações de
prazos por email/WhatsApp, e ligação a pastas do Google Drive para os documentos.

Baseada na planilha original (abas MANUAL / PROCESSOS / DOCUMENTOS / CRONOGRAMA / FERIADOS): o fluxo
padrão de 43 atividades (Loteamento → Moradias → Termo de Obra → Escritura) está em
`prisma/seed-data/fluxo-obra-padrao.json` e é semeado como um "template" reutilizável — cada obra nova
nasce com uma cópia editável desse fluxo.

## Stack

Next.js (App Router, TypeScript) + Prisma + PostgreSQL. Autenticação própria (email/password, sessão
em cookie assinado). Notificações por email (Nodemailer/SMTP) e WhatsApp (Twilio). Documentos no Google
Drive via Service Account (`googleapis`).

## A correr localmente

1. **Base de dados** — suba um Postgres local:
   ```bash
   docker compose up -d
   ```
   (ou aponte `DATABASE_URL` para qualquer Postgres já existente).

2. **Variáveis de ambiente** — copie `.env.example` para `.env` e preencha pelo menos `DATABASE_URL` e
   `SESSION_SECRET`. Email, WhatsApp e Google Drive são opcionais para arrancar — a app degrada
   graciosamente (regista o que tentou enviar, sem rebentar) enquanto não estiverem configurados.

3. **Instalar, migrar e semear:**
   ```bash
   npm install
   npm run db:migrate   # cria as tabelas
   npm run db:seed      # semeia o fluxo padrão, feriados PT e um utilizador admin
   ```
   O seed imprime o email/password do administrador criado (por omissão
   `admin@encosta.pt` / `muda-esta-password` — mude assim que entrar).

4. **Arrancar:**
   ```bash
   npm run dev
   ```
   Abra http://localhost:3000.

## Testes

```bash
npm test          # motor de cronograma (CPM) e cálculo de dias úteis
npx tsc --noEmit  # verificação de tipos
```

O motor de CPM está validado contra os valores da planilha original (datas de licença, escritura,
fim do fluxo e nº de atividades críticas coincidem exatamente).

## Notificações de prazos

`GET /api/cron/deadline-check` (protegido por `CRON_SECRET`, via header `Authorization: Bearer
<secret>` ou `?secret=`) verifica todas as obras e envia email/WhatsApp a quem estiver atribuído como
responsável de uma atividade cujo prazo esteja a 7, 3 ou 1 dia(s), ou em atraso. `vercel.json` já
agenda isto diariamente às 07:00 UTC quando implantado na Vercel (que injeta o header de autorização
automaticamente a partir da env var `CRON_SECRET`). Fora da Vercel, chame o mesmo endpoint a partir de
qualquer agendador (cron do servidor, GitHub Actions, etc.) ou corra `npm run cron:deadline-check`
localmente.

Cada pessoa precisa de ter email e, opcionalmente, telefone de WhatsApp (formato internacional, ex.
`+351912345678`) — geridos em **Equipa** (`/users`) — e ser atribuída como responsável de uma
atividade na página da obra.

## Google Drive

Crie uma Service Account no Google Cloud com a Drive API ativada, partilhe uma pasta do Drive com o
email dessa conta (permissão de Editor), e preencha `GOOGLE_SERVICE_ACCOUNT_EMAIL`,
`GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` e `GOOGLE_DRIVE_ROOT_FOLDER_ID` no `.env`. A partir daí, cada obra
nova ganha automaticamente uma subpasta, e cada documento da checklist pode ser enviado diretamente
para essa pasta.

## Deploy

Pensado para a Vercel + Postgres gerido (Neon, Vercel Postgres, Supabase, etc.):

```bash
npm run build
npm run db:deploy   # prisma migrate deploy, para produção
```

Configure as mesmas variáveis de ambiente do `.env.example` no painel do projeto na Vercel.
