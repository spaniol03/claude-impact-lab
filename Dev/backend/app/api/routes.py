"""Rotas da API — v1.

As rotas de diagnóstico/concorrência servem agregados anonimizados. As rotas
`/inscricoes` recebem e devolvem os dados do formulário (uso previsto do sistema),
gravados no banco configurado.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db import get_session
from app.models import schemas
from app.models.inscricao import (
    Comprovante,
    FormularioRef,
    InscricaoDetalhe,
    InscricaoPayload,
    InscricaoResumo,
    PrePreenchimento,
)
from app.services import inscricao_sim, inscricoes_repo
from app.services.inscricao_sim import ValidacaoInscricaoError
from app.services.repository import get_repository

SessionDep = Annotated[Session, Depends(get_session)]

router = APIRouter(prefix="/api/v1")

AnoParam = Annotated[str, Query(description="Ano do processo (2021-2025) ou 'todos'.")]


def _repo():
    repo = get_repository()
    if not repo.disponivel:
        raise HTTPException(
            status_code=503,
            detail=(
                "Agregados ainda não gerados. Rode `python -m app.etl.build_aggregates` "
                "no backend."
            ),
        )
    return repo


def _validar_ano(repo, ano: str) -> str:
    if ano not in repo.anos_validos():
        raise HTTPException(
            status_code=422,
            detail=f"Ano inválido: {ano!r}. Use um de {repo.anos_validos()}.",
        )
    return ano


@router.get("/meta", response_model=schemas.Meta, tags=["meta"])
def get_meta() -> dict:
    return _repo().meta


@router.get("/anos", tags=["meta"])
def get_anos() -> dict:
    return {"anos": _repo().anos_validos()}


@router.get("/overview", response_model=schemas.OverviewAno, tags=["diagnóstico"])
def get_overview(ano: AnoParam = "todos") -> dict:
    repo = _repo()
    return repo.overview_ano(_validar_ano(repo, ano))


@router.get("/unidades", response_model=schemas.UnidadesPage, tags=["concorrência"])
def get_unidades(
    ano: AnoParam = "todos",
    busca: Annotated[str | None, Query(description="Filtra por nome ou bairro.")] = None,
    banda: Annotated[
        str | None, Query(description="baixa | media | alta")
    ] = None,
    limite: Annotated[int, Query(ge=1, le=1000)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> dict:
    repo = _repo()
    _validar_ano(repo, ano)
    if banda and banda not in ("baixa", "media", "alta"):
        raise HTTPException(status_code=422, detail="banda deve ser baixa, media ou alta.")
    total, itens = repo.listar_unidades(ano, busca, banda, limite, offset)
    return {"ano": ano, "total": total, "itens": itens}


@router.get(
    "/unidades/{codigo}", response_model=schemas.Unidade, tags=["concorrência"]
)
def get_unidade(codigo: str, ano: AnoParam = "todos") -> dict:
    repo = _repo()
    _validar_ano(repo, ano)
    unidade = repo.unidade(ano, codigo)
    if unidade is None:
        raise HTTPException(status_code=404, detail=f"Unidade {codigo!r} não encontrada.")
    return unidade


@router.get(
    "/inscricao/avaliar", response_model=schemas.ResumoInscricao, tags=["Frente 1 · família"]
)
def avaliar_inscricao(
    unidades: Annotated[
        str, Query(description="Códigos de unidade separados por vírgula (até 5).")
    ],
    ano: AnoParam = "todos",
) -> dict:
    repo = _repo()
    _validar_ano(repo, ano)
    codigos = [c.strip() for c in unidades.split(",") if c.strip()]
    if not codigos:
        raise HTTPException(status_code=422, detail="Informe ao menos um código de unidade.")
    if len(codigos) > 5:
        raise HTTPException(status_code=422, detail="No máximo 5 opções, como no matricula.rio.")
    return repo.avaliar_inscricao(ano, codigos)


@router.get(
    "/liberacao", response_model=schemas.LiberacaoAno, tags=["Frente 2 · servidor"]
)
def get_liberacao(ano: AnoParam = "todos") -> dict:
    repo = _repo()
    return repo.liberacao_ano(_validar_ano(repo, ano))


@router.get(
    "/inscricao/formulario", response_model=FormularioRef, tags=["Frente 1 · família"]
)
def get_formulario() -> FormularioRef:
    """Dados de referência para o frontend renderizar o formulário completo de creche."""
    return inscricao_sim.formulario_ref()


@router.get(
    "/inscricao/pre-preenchimento",
    response_model=PrePreenchimento,
    tags=["Frente 1 · família"],
)
def get_pre_preenchimento(
    cpf: Annotated[str, Query(min_length=1, description="CPF da criança.")],
) -> PrePreenchimento:
    """SIMULA a consulta Receita Federal + RMI: devolve dados determinísticos pelo CPF.

    Não há integração real — o fluxo 'comece pelo CPF' do mock mobile é demonstrado
    com dados de exemplo estáveis por CPF.
    """
    return inscricao_sim.pre_preenchimento(cpf)


@router.post(
    "/inscricoes",
    response_model=Comprovante,
    status_code=201,
    tags=["Frente 1 · família"],
    responses={422: {"description": "Problemas de validação", "model": schemas.ProblemasValidacao}},
)
def registrar_inscricao(payload: InscricaoPayload, session: SessionDep) -> Comprovante:
    """Valida o formulário completo (dados cadastrais + situação social + escolhas),
    **grava a inscrição no banco** e devolve o comprovante com protocolo."""
    repo = _repo()
    try:
        comprovante = inscricao_sim.simular(payload, repo)
    except ValidacaoInscricaoError as exc:
        raise HTTPException(
            status_code=422,
            detail={"problemas": [p.model_dump() for p in exc.problemas]},
        ) from exc
    inscricoes_repo.salvar(session, payload, comprovante)
    return comprovante


@router.get(
    "/inscricoes",
    response_model=list[InscricaoResumo],
    tags=["Frente 2 · servidor"],
)
def listar_inscricoes(
    session: SessionDep,
    limite: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[InscricaoResumo]:
    """Inscrições recebidas neste protótipo. Sem autenticação — numa implantação real,
    esta rota seria restrita ao servidor SME/CRE."""
    return inscricoes_repo.listar(session, limite, offset)


@router.get(
    "/inscricoes/{protocolo}",
    response_model=InscricaoDetalhe,
    tags=["Frente 1 · família"],
)
def obter_inscricao(protocolo: str, session: SessionDep) -> InscricaoDetalhe:
    """Consulta uma inscrição pelo número do protocolo (dados + comprovante)."""
    detalhe = inscricoes_repo.buscar(session, protocolo)
    if detalhe is None:
        raise HTTPException(status_code=404, detail=f"Protocolo {protocolo!r} não encontrado.")
    return detalhe
