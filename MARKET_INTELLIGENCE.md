# Market Intelligence

Modulo conceitual: **INTELIGENCIA GOV**. Ele e separado do Radar.

- Radar: oportunidades abertas/futuras.
- Inteligencia: historico publico de fornecedores, compradores, itens, resultados, contratos, precos e cobertura.

## Arquitetura Encontrada

O projeto usa Next.js 16 App Router em `src/app`, Server Components para leitura, Route Handlers para integracoes, Supabase SSR com publishable key e RLS como barreira de autorizacao. `companies` representa empresas de clientes/tenants. `participations` representa gestao de participacoes desses clientes em oportunidades. Essas tabelas nao devem receber historico de mercado publico.

O Radar atual le `opportunities`, usa `src/lib/pncp` e `src/lib/sources/compras-gov.ts`, classifica verticais em `src/lib/classification` e calcula score em `src/lib/scoring.ts`. Prospecção e Radar reaproveitam o acervo de oportunidades abertas/publicadas, nao fatos historicos de resultado.

## Fontes Oficiais

Documentacao consultada em 2026-09-04:

- PNCP Consulta Swagger: `https://pncp.gov.br/api/consulta/swagger-ui/index.html`
- PNCP OpenAPI: `https://pncp.gov.br/api/consulta/v3/api-docs`
- Compras.gov Dados Abertos Swagger: `https://dadosabertos.compras.gov.br/swagger-ui/index.html`
- Compras.gov OpenAPI: `https://dadosabertos.compras.gov.br/v3/api-docs`

Endpoints confirmados para o MVP estruturado:

- Compras.gov itens PNCP 14.133: `GET /modulo-contratacoes/2_consultarItensContratacoes_PNCP_14133`
  - filtros obrigatorios: `dataInclusaoPncpInicial`, `dataInclusaoPncpFinal`
  - paginacao: `pagina`, `tamanhoPagina`
  - filtros uteis: `orgaoEntidadeCnpj`, `codFornecedor`, `materialOuServico`, `codigoClasse`, `codigoGrupo`, `codItemCatalogo`, `temResultado`
- Compras.gov resultados de itens PNCP 14.133: `GET /modulo-contratacoes/3_consultarResultadoItensContratacoes_PNCP_14133`
  - filtros obrigatorios: `dataResultadoPncpInicial`, `dataResultadoPncpFinal`
  - paginacao: `pagina`, `tamanhoPagina`
  - filtros uteis: `orgaoEntidadeCnpj`, `niFornecedor`, `situacaoCompraItemResultadoId`, faixas de valor homologado
- Compras.gov fornecedores: `GET /modulo-fornecedor/1_consultarFornecedor`
  - filtro obrigatorio: `ativo`
  - filtros uteis: `cnpj`, `cpf`, `codigoCnae`, `porteEmpresaId`
- PNCP Consulta: `GET /v1/contratacoes/publicacao`, `GET /v1/contratacoes/proposta`, `GET /v1/contratos`, `GET /v1/atas`

O adapter inicial implementado em `src/lib/market-intelligence/adapters/compras-gov-history.ts` cobre itens e resultados estruturados. Contratos, atas e universo CNPJ aberto ficam em fases posteriores.

## Modelo De Dados

SQL revisavel: `supabase/market-intelligence.sql`.

Tabelas novas:

- `market_suppliers`: fornecedor canonico PJ/PF/estrangeiro/desconhecido.
- `market_supplier_source_ids`: aliases por fonte oficial.
- `market_buyers`: orgao/unidade compradora.
- `market_procurements`: processo canonico.
- `market_procurement_source_ids`: aliases PNCP/Compras.gov.
- `market_procurement_items`: itens, unidade, quantidade e valor estimado.
- `market_results`: resultado/homologacao por item e fornecedor.
- `market_participations`: somente participacao comprovada por fonte estruturada ou documento publico.
- `market_contracts`: contratos estruturados quando fonte estiver integrada.
- `market_source_documents`: ata, termo e documentos oficiais sob demanda.
- `market_ingestion_runs`: observabilidade de sincronizacao.
- `market_ingestion_cursors`: checkpoint incremental.
- `market_supplier_metrics`: agregados para UI.
- `market_lead_scores`: score versionado e explicavel.

## Dicionario

- `normalized_cnpj`: 14 digitos, sem mascara, chave canonica PJ.
- `masked_document`: representacao segura para PF ou exibicao.
- `homologated_value`: valor homologado. Nao significa faturado, empenhado ou pago.
- `contracted_value`: valor contratado, somente se fonte de contrato comprovar.
- `coverage_status`: cobertura do processo.
- `participant_coverage_status`: qualidade da cobertura de participantes.
- `data_quality`: `official_structured`, `official_document`, `inferred` ou `unavailable`.
- `raw_hash`: hash do payload relevante para auditoria/reprocessamento.

## Definicoes

Participacao existe somente com evidencia de participante. Resultado vencedor nao cria participante perdedor nem comprova todos os participantes do processo. Quando a fonte estruturada traz apenas vencedor/homologacao, `market_results` e preenchida e `market_participations` permanece vazia.

Vitoria e um resultado homologado/adjudicado associado a fornecedor e item. Certames vencidos e itens vencidos sao metricas separadas; 70 itens em um unico pregao nao viram 70 licitacoes.

Taxa de vitoria fica `null` quando `participant_coverage_status` nao e `complete`.

## PF/PJ E LGPD

O MVP comercial foca PJ. CNPJ e normalizado; CNPJ formatado fica na UI. PF pode ser modelada quando aparecer em fonte publica, mas CPF integral nao deve ser exposto nem usado em lead score comercial. Dados de socios/QSA nao fazem parte do MVP.

## Sync

Fluxo esperado:

fontes oficiais -> job -> normalizacao -> Supabase -> agregados -> UI

A UI `/inteligencia` consulta somente Supabase. Pesquisa do usuario nao chama dezenas de APIs externas.

Jobs devem registrar source, resource, periodo, cursor, vistos, inseridos, atualizados, falhas e resumo de erro em `market_ingestion_runs`. `market_ingestion_cursors` guarda checkpoint por fonte/recurso/recorte.

Backfill inicial recomendado: SP ou recorte regional, 24 meses em janelas pequenas. Nao executar backfill nacional pesado em request HTTP de usuario.

## Como Executar

1. Revisar `supabase/market-intelligence.sql`.
2. Aplicar no SQL Editor do projeto Supabase oficial.
3. Validar RLS como `skull_admin` e como usuario cliente.
4. Executar backfill controlado usando adapter Compras.gov historico em worker/cron a ser criado.
5. Recalcular `market_supplier_metrics` e `market_lead_scores`.
6. Abrir `/inteligencia`.

## Testes

Rodar:

```bash
npm run test
npm run lint
npm run typecheck
npm run build
```

Cobertura atual dos testes unitarios:

- normalizacao de CNPJ;
- mascara de CPF;
- dedupe de PJ por CNPJ;
- normalizacao de item e resultado Compras.gov;
- resultado nao cria participacao;
- delta de preco apenas com unidade compativel;
- metrica separando certames e itens;
- taxa de vitoria `null` sem cobertura completa;
- lead score bloqueado para PF;
- linguagem correta para “nao encontrado nas fontes cobertas”;
- parser documental recusando sessao ativa ou documento sem URL publica.

## Limitacoes E Proximos Passos

- Persistencia de ingestao ainda deve ser conectada a um Route Handler/worker dedicado antes de backfill real.
- Contratos PNCP/Compras.gov ainda nao foram normalizados.
- Parser de Ata/Termo de Julgamento nao foi implementado; deve ser fase separada e sob demanda.
- Concorrentes recorrentes dependem de co-participacao comprovada.
- Universo empresarial local via CNPJ aberto ainda nao foi importado.
- Full-text/pg_trgm e PostGIS devem ser avaliados somente apos confirmar extensoes disponiveis.

