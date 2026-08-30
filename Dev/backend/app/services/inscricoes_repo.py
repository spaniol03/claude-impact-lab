"""Gravação e leitura das inscrições enviadas (tabela `inscricoes`)."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import InscricaoRegistro
from app.models.inscricao import (
    Comprovante,
    InscricaoDetalhe,
    InscricaoPayload,
    InscricaoResumo,
)


def salvar(
    session: Session, payload: InscricaoPayload, comprovante: Comprovante
) -> InscricaoRegistro:
    registro = InscricaoRegistro(
        protocolo=comprovante.protocolo,
        ano_processo=comprovante.ano_processo,
        grupamento_sugerido=comprovante.grupamento_sugerido,
        candidato_nome=comprovante.candidato_nome,
        responsavel_nome=comprovante.responsavel_nome,
        n_opcoes=len(payload.opcoes),
        n_criterios_sim=len(comprovante.criterios_a_comprovar),
        dados_json=payload.model_dump_json(),
        comprovante_json=comprovante.model_dump_json(),
    )
    session.add(registro)
    session.commit()
    session.refresh(registro)
    return registro


def _iso(dt_val) -> str:
    return dt_val.isoformat(timespec="seconds")


def buscar(session: Session, protocolo: str) -> InscricaoDetalhe | None:
    reg = session.get(InscricaoRegistro, protocolo.strip())
    if reg is None:
        return None
    return InscricaoDetalhe(
        protocolo=reg.protocolo,
        criado_em=_iso(reg.criado_em),
        situacao=reg.situacao,
        comprovante=Comprovante.model_validate_json(reg.comprovante_json),
        dados=InscricaoPayload.model_validate_json(reg.dados_json),
    )


def listar(session: Session, limite: int = 50, offset: int = 0) -> list[InscricaoResumo]:
    stmt = (
        select(InscricaoRegistro)
        .order_by(InscricaoRegistro.criado_em.desc())
        .limit(limite)
        .offset(offset)
    )
    return [
        InscricaoResumo(
            protocolo=r.protocolo,
            criado_em=_iso(r.criado_em),
            situacao=r.situacao,
            ano_processo=r.ano_processo,
            grupamento_sugerido=r.grupamento_sugerido,
            candidato_nome=r.candidato_nome,
            responsavel_nome=r.responsavel_nome,
            n_opcoes=r.n_opcoes,
            n_criterios_sim=r.n_criterios_sim,
        )
        for r in session.scalars(stmt)
    ]


def contar(session: Session) -> int:
    return session.query(InscricaoRegistro).count()
