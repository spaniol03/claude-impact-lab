"""Modelos Pydantic das respostas da API — contrato consumido pelo frontend."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel

Banda = Literal["baixa", "media", "alta"]


class Meta(BaseModel):
    gerado_em: str
    fonte: str
    anos: list[int]
    linhas_query_a: int
    inscricoes: int
    unidades: int
    inscricoes_com_score: int
    aviso: str
    definicoes: dict[str, str]


# ---- overview -------------------------------------------------------------- #
class SituacaoSlice(BaseModel):
    situacao: str
    pct: float
    n: int


class OpcoesSlice(BaseModel):
    n_opcoes: int
    n_inscricoes: int
    taxa_confirma_alguma: float
    media_cancel_sistema: float


class Totais(BaseModel):
    inscricoes: int
    opcoes: int
    unidades: int
    confirmados: int
    em_fila: int


class Concentracao(BaseModel):
    pct_fila_top10_unidades: float
    n_unidades_top10: int
    n_unidades_com_fila: int


class OverviewAno(BaseModel):
    totais: Totais
    situacao_dist: list[SituacaoSlice]
    opcoes_dist: list[OpcoesSlice]
    pct_3mais_opcoes: float
    concentracao_fila: Concentracao


# ---- unidades ------------------------------------------------------------- #
class GrupamentoBanda(BaseModel):
    grupamento: str
    fila: int
    confirmados: int
    banda: Banda


class Unidade(BaseModel):
    unidade: str
    nome: str
    bairro: str
    endereco: str
    fila: int
    confirmados: int
    cancel_sistema: int
    total_opcoes: int
    ratio: float
    banda: Banda
    percentil_fila: float
    top10: bool
    grupamentos: list[GrupamentoBanda]


class UnidadesPage(BaseModel):
    ano: str
    total: int
    itens: list[Unidade]


# ---- liberação (Frente 2) ----------------------------------------------- #
class OpcaoRef(BaseModel):
    unidade: str
    nome: str
    opcao: int


class ExemploTravamento(BaseModel):
    aluno: str
    score: int
    score_pct: float
    confirmada_em: OpcaoRef
    reservas_travadas: list[OpcaoRef]


class CandidatoPromocao(BaseModel):
    aluno: str
    score: int
    score_pct: float
    opcao: int
    grupamento: str


class UnidadeLiberacao(BaseModel):
    unidade: str
    nome: str
    travadas: int
    fila_limpa: int
    exemplos: list[ExemploTravamento]
    promover: list[CandidatoPromocao]


class LiberacaoAno(BaseModel):
    ano: str
    vagas_travadas_total: int
    inscricoes_multi_reserva: int
    unidades: list[UnidadeLiberacao]


# ---- inscrição (Frente 1) --------------------------------------------- #
class AvaliacaoOpcao(BaseModel):
    unidade: str
    nome: str
    bairro: str
    banda: Banda
    top10: bool
    ratio: float
    fila: int
    confirmados: int
    aviso: str | None


class ResumoInscricao(BaseModel):
    ano: str
    opcoes: list[AvaliacaoOpcao]
    n_alta_concorrencia: int
    n_top10: int
    recomendacao: str


class ProblemaValidacao(BaseModel):
    campo: str
    mensagem: str


class ProblemasValidacao(BaseModel):
    detail: dict[str, list[ProblemaValidacao]]
