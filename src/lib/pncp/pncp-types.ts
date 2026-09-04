export interface PncpPage<T> {
  data: T[];
  totalRegistros: number;
  totalPaginas: number;
  numeroPagina: number;
  paginasRestantes: number;
  empty: boolean;
}

export interface PncpContracting {
  numeroControlePNCP?: string;
  numeroCompra?: string;
  anoCompra?: number;
  processo?: string;
  objetoCompra?: string;
  valorTotalEstimado?: number | null;
  dataPublicacaoPncp?: string;
  dataAberturaProposta?: string | null;
  dataEncerramentoProposta?: string | null;
  dataAtualizacao?: string | null;
  linkSistemaOrigem?: string | null;
  modalidadeNome?: string;
  modoDisputaNome?: string | null;
  situacaoCompraNome?: string;
  srp?: boolean;
  orgaoEntidade?: { cnpj?: string; razaoSocial?: string; poderId?: string; esferaId?: string };
  unidadeOrgao?: { codigoUnidade?: string; nomeUnidade?: string; codigoIbge?: string; municipioNome?: string; ufSigla?: string };
}

export interface PncpQuery {
  startDate: string;
  endDate: string;
  modalityCode: number;
  page?: number;
  pageSize?: number;
  state?: string;
  municipalityIbgeCode?: string;
}
