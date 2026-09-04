# PNCP integration

Fonte exclusiva de contratações: API pública oficial de consulta do PNCP.

- Base: `https://pncp.gov.br/api/consulta`
- Publicações: `GET /v1/contratacoes/publicacao`
- Propostas abertas: `GET /v1/contratacoes/proposta` (cliente implementado e disponível para evolução do radar)
- Manual oficial: <https://www.gov.br/pncp/pt-br/pncp/manuais>
- Swagger oficial de consultas: <https://pncp.gov.br/api/consulta/swagger-ui/index.html>

O V1 sincroniza publicações de SP dos últimos 14 dias por padrão. `codigoModalidadeContratacao` é obrigatório, por isso as 14 modalidades são consultadas separadamente. Cada chamada usa timeout de 15 segundos, pausa curta entre páginas e até dois retries com backoff apenas para falhas transitórias/429/5xx. Respostas 204 viram página vazia. A paginação é limitada por execução para respeitar o tempo de função serverless.

O cliente oferece cache server-side de 5 minutos para leituras públicas. A sincronização desativa esse cache explicitamente para persistir a versão mais recente; o banco passa a ser o cache durável servido às telas.

Campos são normalizados em `src/lib/pncp/pncp-normalizer.ts`. `numeroControlePNCP` é a chave de deduplicação. O link canônico usa CNPJ, ano e sequencial extraídos do controle PNCP. Dados ausentes permanecem `null` ou “não informado”; não são inferidos como fatos.

Em 3 de setembro de 2026 a API oficial não respondeu ao teste direto dentro de 30 segundos. O código trata indisponibilidade sem mock e registra falhas. A integração deve ser testada novamente quando o serviço estiver disponível.

Não há scraping do site PNCP, nem endpoint de escrita/manutenção, nem chamada PNCP no navegador.
