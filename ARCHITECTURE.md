# Architecture

O fluxo principal é `browser → Next.js Server Component/Route Handler → Supabase ou PNCP → UI`. O navegador nunca consulta o PNCP diretamente e nunca recebe credenciais privilegiadas.

## Camadas

- `src/app`: App Router. Leitura em Server Components, mutações internas em Server Actions e integração externa em Route Handler.
- `src/components`: shell responsivo e componentes visuais; Client Components apenas onde há estado, navegação ou interação.
- `src/lib/pncp`: cliente HTTP oficial, tipos e normalização isolada.
- `src/lib/scoring.ts`: SKULL Score, capital de giro, Competition Risk e explicações determinísticas.
- `src/lib/classification`: regras ponderadas, normalização e classificadores únicos de vertical e elegibilidade. PNCP, Compras.gov, Radar, prospecção, onboarding e clientes consomem a mesma camada.
- `src/lib/supabase`: clientes SSR/browser usando somente URL e publishable key.
- `src/lib/data.ts`: consultas paginadas e limitadas; nenhuma tela carrega milhares de registros.
- `proxy.ts`: renovação de sessão Supabase. Autorização efetiva continua no RLS e nas verificações server-side.

## Multi-tenant

Cada usuário possui `tenant_id` e papel em `profiles`. Empresas pertencem a um tenant. Documentos, participações e alertas derivam o escopo pela empresa. Oportunidades PNCP globais usam `tenant_id = null`; oportunidades privadas futuras podem receber tenant. Policies RLS estão especificadas em `SUPABASE_REQUIREMENTS.md`.

## Sincronização

`POST /api/pncp/sync` exige sessão e `skull_admin`, percorre 14 modalidades, no máximo três páginas de 50 registros por modalidade e execução, normaliza, deduplica por `pncp_id`, calcula scores e faz upsert. O limite mantém a execução compatível com função serverless; execuções subsequentes atualizam os mesmos IDs.

O acervo central nunca descarta uma oportunidade por nicho. A classificação gera `vertical`, confiança, evidências e versão quando as colunas administrativas estão disponíveis; filtros de Radar e prospecção aplicam o classificador novamente como decisão final. `fuel_retail`, `technology` e `architecture_urbanism` são aceitos somente como aliases de dados legados e resolvidos para `fuel_station`, `software` e `architecture`.

## Degradação segura

Sem variáveis do Supabase, o build e a UI funcionam em modo de configuração, sem dados falsos. Com Supabase configurado, rotas do produto exigem autenticação. Indisponibilidade do PNCP gera erro registrado em `sync_runs`; nunca há fallback para mocks.
