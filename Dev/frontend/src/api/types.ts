/**
 * Contrato da API (espelha app/models/schemas.py do backend).
 * Frontend desacoplado: nada aqui importa do backend em tempo de build;
 * a unica ligacao e o formato JSON destas interfaces.
 */

export type Banda = 'baixa' | 'media' | 'alta';
export type Ano = string; // '2021'..'2025' | 'todos'

export interface Meta {
  gerado_em: string;
  fonte: string;
  anos: number[];
  linhas_query_a: number;
  inscricoes: number;
  unidades: number;
  inscricoes_com_score: number;
  aviso: string;
  definicoes: Record<string, string>;
}

export interface SituacaoSlice {
  situacao: string;
  pct: number;
  n: number;
}
export interface OpcoesSlice {
  n_opcoes: number;
  n_inscricoes: number;
  taxa_confirma_alguma: number;
  media_cancel_sistema: number;
}
export interface Totais {
  inscricoes: number;
  opcoes: number;
  unidades: number;
  confirmados: number;
  em_fila: number;
}
export interface Concentracao {
  pct_fila_top10_unidades: number;
  n_unidades_top10: number;
  n_unidades_com_fila: number;
}
export interface OverviewAno {
  totais: Totais;
  situacao_dist: SituacaoSlice[];
  opcoes_dist: OpcoesSlice[];
  pct_3mais_opcoes: number;
  concentracao_fila: Concentracao;
}

export interface GrupamentoBanda {
  grupamento: string;
  fila: number;
  confirmados: number;
  banda: Banda;
}
export interface Unidade {
  unidade: string;
  nome: string;
  bairro: string;
  endereco: string;
  fila: number;
  confirmados: number;
  cancel_sistema: number;
  total_opcoes: number;
  ratio: number;
  banda: Banda;
  percentil_fila: number;
  top10: boolean;
  grupamentos: GrupamentoBanda[];
}
export interface UnidadesPage {
  ano: Ano;
  total: number;
  itens: Unidade[];
}

export interface OpcaoRef {
  unidade: string;
  nome: string;
  opcao: number;
}
export interface ExemploTravamento {
  aluno: string;
  score: number;
  score_pct: number;
  confirmada_em: OpcaoRef;
  reservas_travadas: OpcaoRef[];
}
export interface CandidatoPromocao {
  aluno: string;
  score: number;
  score_pct: number;
  opcao: number;
  grupamento: string;
}
export interface UnidadeLiberacao {
  unidade: string;
  nome: string;
  travadas: number;
  fila_limpa: number;
  exemplos: ExemploTravamento[];
  promover: CandidatoPromocao[];
}
export interface LiberacaoAno {
  ano: Ano;
  vagas_travadas_total: number;
  inscricoes_multi_reserva: number;
  unidades: UnidadeLiberacao[];
}

export interface AvaliacaoOpcao {
  unidade: string;
  nome: string;
  bairro: string;
  banda: Banda;
  top10: boolean;
  ratio: number;
  fila: number;
  confirmados: number;
  aviso: string | null;
}
export interface ResumoInscricao {
  ano: Ano;
  opcoes: AvaliacaoOpcao[];
  n_alta_concorrencia: number;
  n_top10: number;
  recomendacao: string;
}

/* ---- formulário completo de inscrição (creche) ---- */

export interface ItemQuestionario {
  id: string;
  texto: string;
  porque: string;
}

export interface FormularioRef {
  ano_processo: number;
  origens_candidato: string[];
  ufs: string[];
  paises: string[];
  tipos_deficiencia: string[];
  tipos_responsavel: string[];
  questionario_creche: ItemQuestionario[];
  regra_grupamento: Record<string, string>;
}

export interface ProblemaValidacao {
  campo: string;
  mensagem: string;
}

export interface PrePreenchimento {
  encontrado: boolean;
  fonte: string;
  nome: string;
  data_nascimento: string;
  sexo: 'Masculino' | 'Feminino';
  filiacao1: string;
  filiacao2: string;
  cep: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
}

export interface Comprovante {
  protocolo: string;
  gerado_em: string;
  ano_processo: number;
  grupamento_sugerido: string | null;
  candidato_nome: string;
  responsavel_nome: string;
  opcoes: AvaliacaoOpcao[];
  n_top10: number;
  n_alta_concorrencia: number;
  criterios_a_comprovar: string[];
  recomendacao: string;
  aviso_comparecimento: string;
}

export interface InscricaoResumo {
  protocolo: string;
  criado_em: string;
  situacao: string;
  ano_processo: number;
  grupamento_sugerido: string | null;
  candidato_nome: string;
  responsavel_nome: string;
  n_opcoes: number;
  n_criterios_sim: number;
}

export interface InscricaoDetalhe {
  protocolo: string;
  criado_em: string;
  situacao: string;
  comprovante: Comprovante;
  dados: unknown;
}
