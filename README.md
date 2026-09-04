# SKULL GOV

PWA SaaS para descobrir, analisar e gerir oportunidades de compras públicas. O V1 responde uma pergunta concreta: **esta licitação pequena de software, perto de Barrinha, cabe na operação e no caixa da empresa?**

## Stack

Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Supabase SSR, API oficial de Dados Abertos do PNCP e PWA com shell offline básico.

## Setup local

Requisitos: Node.js 22.12+ (o desenvolvimento foi validado com Node 24) e npm.

```bash
npm install
Copy-Item .env.example .env.local
npm run dev
```

Preencha `.env.local` com as chaves do projeto Supabase oficial:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

`.env.local` está ignorado. `.env.example` não contém valores. O frontend e o servidor SSR usam somente a publishable key; não existe `service_role` no código.

## Supabase

Projeto oficial: `skull-gov`, ref `kctpcbgaescujhsacqmm`, região `sa-east-1`. O schema não foi alterado por esta entrega. Um administrador deve revisar e aplicar [SUPABASE_REQUIREMENTS.md](./SUPABASE_REQUIREMENTS.md), criar o primeiro usuário e substituir os placeholders pelo UUID e CNPJ reais.

Sem as variáveis, a aplicação abre em modo de configuração com estados vazios reais. Com as variáveis, as páginas internas exigem autenticação e o RLS define o escopo efetivo.

## PNCP

A integração usa apenas `https://pncp.gov.br/api/consulta`, server-side. Não há scraping nem chamada direta do navegador. Timeout, retry moderado, paginação, deduplicação e logs de execução estão documentados em [PNCP_INTEGRATION.md](./PNCP_INTEGRATION.md).

Como `skull_admin`, abra `/radar` e use **Sincronizar PNCP**. A execução padrão consulta SP nos últimos 14 dias, normaliza e faz upsert por `numeroControlePNCP`.

## Qualidade e build

```bash
npm run test
npm run lint
npm run typecheck
npm run build
```

## Estrutura

```text
src/app/                 rotas, páginas e API server-side
src/components/          shell e componentes visuais
src/lib/pncp/            cliente, tipos e normalizador PNCP
src/lib/supabase/        clientes SSR/browser
src/lib/scoring.ts       score e riscos determinísticos
src/lib/data.ts          consultas Supabase paginadas
public/sw.js             offline shell do PWA
```

Leia também [ARCHITECTURE.md](./ARCHITECTURE.md), [SCORING.md](./SCORING.md) e [DEPLOY.md](./DEPLOY.md).

## Deploy

O projeto está preparado para Vercel, mas **não foi implantado**. Variáveis, callbacks do Supabase e checklist estão em [DEPLOY.md](./DEPLOY.md). Nenhum Vercel Cron ou recurso pago foi habilitado.
