"""Gera os agregados JSON servidos pela API a partir das bases brutas.

Uso:
    cd backend
    python -m app.etl.build_aggregates            # usa CIV_SOURCE_DIR / default
    python -m app.etl.build_aggregates --source "/caminho/para/dadoscreche-main"

Saída (em app/data/):
    meta.json        — metadados da geração
    overview.json    — indicadores de diagnóstico por ano
    unidades.json    — panorama de concorrência por unidade escolar
    liberacao.json   — motor de cruzamento classificação x preferência (Frente 2)

Princípio: nenhum número é inventado — tudo é medido diretamente no recorte lido.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
from pathlib import Path

import numpy as np
import pandas as pd

from app.config import get_settings
from app.etl.sources import (
    iter_query_b_chunks,
    read_query_a,
    read_query_c,
    read_query_d,
)

# nº máximo de unidades detalhadas no painel do servidor (Frente 2) por ano
TOP_UNIDADES_LIBERACAO = 40
EXEMPLOS_POR_UNIDADE = 12
PROMOVER_POR_UNIDADE = 10


def _round(value: float, ndigits: int = 3) -> float:
    return float(np.round(value, ndigits))


def _band_from_ratio(ratio: pd.Series) -> pd.Series:
    """Discretiza a razão fila/confirmado em 3 faixas por tercis (dentro do recorte)."""
    valid = ratio.replace([np.inf, -np.inf], np.nan).dropna()
    if valid.empty:
        return pd.Series(["media"] * len(ratio), index=ratio.index)
    q1, q2 = valid.quantile([1 / 3, 2 / 3])
    bins = [-np.inf, q1, q2, np.inf]
    return pd.cut(ratio.fillna(0), bins=bins, labels=["baixa", "media", "alta"])


# --------------------------------------------------------------------------- #
#  Vulnerabilidade (Query B x Query C)
# --------------------------------------------------------------------------- #
def build_scores(source_dir: Path, catalogo: pd.DataFrame) -> pd.DataFrame:
    """Pontuação de vulnerabilidade por inscrição = soma dos pontos dos critérios confirmados."""
    pontos = {
        (int(r.ano), int(r.ich_perg_id)): int(r.perg_pontuacao)
        for r in catalogo.itertuples(index=False)
    }
    acc: dict[str, int] = {}
    for chunk in iter_query_b_chunks(source_dir):
        chunk = chunk[chunk["confirmado"] == "Sim"].copy()
        if chunk.empty:
            continue
        chunk["ano"] = pd.to_numeric(chunk["ano"], errors="coerce")
        chunk["ich_perg_id"] = pd.to_numeric(chunk["ich_perg_id"], errors="coerce")
        chunk = chunk.dropna(subset=["ano", "ich_perg_id"])
        chunk["pts"] = [
            pontos.get((int(a), int(p)), 0)
            for a, p in zip(chunk["ano"], chunk["ich_perg_id"], strict=False)
        ]
        chunk = chunk[chunk["pts"] > 0]
        if chunk.empty:
            continue
        chunk["insc_id"] = (
            chunk["ano"].astype(int).astype(str)
            + "-"
            + chunk["prm_id"].astype(str)
            + "-"
            + chunk["plm_id"].astype(str)
            + "-"
            + chunk["ipl_id"].astype(str)
        )
        for insc_id, pts in chunk.groupby("insc_id")["pts"].sum().items():
            acc[insc_id] = acc.get(insc_id, 0) + int(pts)

    scores = pd.DataFrame({"insc_id": list(acc.keys()), "score": list(acc.values())})
    if scores.empty:
        scores = pd.DataFrame(columns=["insc_id", "score", "ano"])
        return scores
    scores["ano"] = scores["insc_id"].str.split("-").str[0].astype(int)
    # normaliza para 0..100 pelo p95 do ano (para comparabilidade entre réguas 2021-2025)
    p95 = scores.groupby("ano")["score"].transform(lambda s: max(s.quantile(0.95), 1))
    scores["score_pct"] = (100 * scores["score"] / p95).clip(upper=100).round(1)
    return scores


# --------------------------------------------------------------------------- #
#  Overview (diagnóstico)
# --------------------------------------------------------------------------- #
def build_overview(qa: pd.DataFrame) -> dict:
    anos = sorted(qa["ano"].unique().tolist())
    por_ano: dict[str, dict] = {}

    for ano in [*anos, "todos"]:
        sub = qa if ano == "todos" else qa[qa["ano"] == ano]
        insc = sub.groupby("insc_id").agg(
            n_opcoes=("opcao", "count"),
            n_confirmado=("is_confirmado", "sum"),
            n_cancel_sistema=("is_cancel_sistema", "sum"),
        )
        insc["n_opcoes"] = insc["n_opcoes"].clip(upper=6)

        opcoes_dist = []
        for n in range(1, 7):
            grp = insc[insc["n_opcoes"] == n]
            if grp.empty:
                continue
            opcoes_dist.append(
                {
                    "n_opcoes": n,
                    "n_inscricoes": int(len(grp)),
                    "taxa_confirma_alguma": _round((grp["n_confirmado"] > 0).mean()),
                    "media_cancel_sistema": _round(grp["n_cancel_sistema"].mean()),
                }
            )

        situacao_dist = (
            sub["situacao"].value_counts(normalize=True).round(4).rename_axis("situacao").reset_index(name="pct")
        )
        situacao_abs = sub["situacao"].value_counts()

        # concentração de fila: quanto do total de fila está nas 10% unidades de maior fila
        fila_por_unidade = (
            sub[sub["is_fila"]].groupby("unidade").size().sort_values(ascending=False)
        )
        total_fila = int(fila_por_unidade.sum())
        n_top = max(1, int(np.ceil(len(fila_por_unidade) * 0.10)))
        top_share = (
            _round(fila_por_unidade.head(n_top).sum() / total_fila) if total_fila else 0.0
        )

        n_3mais = int((insc["n_opcoes"] >= 3).sum())

        por_ano[str(ano)] = {
            "totais": {
                "inscricoes": int(len(insc)),
                "opcoes": int(len(sub)),
                "unidades": int(sub["unidade"].nunique()),
                "confirmados": int(situacao_abs.get("Confirmado", 0)),
                "em_fila": total_fila,
            },
            "situacao_dist": [
                {
                    "situacao": row.situacao,
                    "pct": _round(row.pct, 4),
                    "n": int(situacao_abs.get(row.situacao, 0)),
                }
                for row in situacao_dist.itertuples(index=False)
            ],
            "opcoes_dist": opcoes_dist,
            "pct_3mais_opcoes": _round(n_3mais / len(insc)) if len(insc) else 0.0,
            "concentracao_fila": {
                "pct_fila_top10_unidades": top_share,
                "n_unidades_top10": n_top,
                "n_unidades_com_fila": int((fila_por_unidade > 0).sum()),
            },
        }

    return {"anos": anos, "por_ano": por_ano}


# --------------------------------------------------------------------------- #
#  Unidades (concorrência — Frente 1)
# --------------------------------------------------------------------------- #
def build_unidades(qa: pd.DataFrame, enderecos: pd.DataFrame) -> dict:
    anos = sorted(qa["ano"].unique().tolist())
    end_por_codigo = {r.esc_codigo: r for r in enderecos.itertuples(index=False)}
    por_ano: dict[str, list] = {}

    for ano in [*anos, "todos"]:
        sub = qa if ano == "todos" else qa[qa["ano"] == ano]
        base = sub.groupby(["unidade", "nome_unidade"]).agg(
            fila=("is_fila", "sum"),
            confirmados=("is_confirmado", "sum"),
            cancel_sistema=("is_cancel_sistema", "sum"),
            total_opcoes=("opcao", "count"),
        )
        base = base.reset_index()
        base["ratio"] = base["fila"] / base["confirmados"].clip(lower=1)
        base["banda"] = _band_from_ratio(base["ratio"]).astype(str)
        base["percentil_fila"] = base["fila"].rank(pct=True).round(3)
        limite_top10 = base["fila"].quantile(0.90)
        base["top10"] = base["fila"] >= max(limite_top10, 1)

        # bandas por grupamento
        grp = sub.groupby(["unidade", "grupamento"]).agg(
            fila=("is_fila", "sum"), confirmados=("is_confirmado", "sum")
        )
        grp["ratio"] = grp["fila"] / grp["confirmados"].clip(lower=1)
        grp["banda"] = _band_from_ratio(grp["ratio"]).astype(str)
        grp_por_unidade: dict[str, list] = {}
        for (unidade, grupamento), row in grp.iterrows():
            if not grupamento:
                continue
            grp_por_unidade.setdefault(unidade, []).append(
                {
                    "grupamento": grupamento,
                    "fila": int(row.fila),
                    "confirmados": int(row.confirmados),
                    "banda": row.banda,
                }
            )

        registros = []
        for row in base.itertuples(index=False):
            end = end_por_codigo.get(row.unidade)
            bairro = ""
            if end and end.bairro:
                bairro = end.bairro
            else:
                b = sub.loc[sub["unidade"] == row.unidade, "bairro"]
                b = b[b != ""]
                bairro = b.mode().iloc[0] if not b.empty else ""
            registros.append(
                {
                    "unidade": row.unidade,
                    "nome": row.nome_unidade or (end.nome if end else row.unidade),
                    "bairro": bairro,
                    "endereco": (
                        f"{end.logradouro}, {end.numero}".strip(", ")
                        if end and end.logradouro
                        else ""
                    ),
                    "fila": int(row.fila),
                    "confirmados": int(row.confirmados),
                    "cancel_sistema": int(row.cancel_sistema),
                    "total_opcoes": int(row.total_opcoes),
                    "ratio": _round(row.ratio, 2),
                    "banda": row.banda,
                    "percentil_fila": _round(row.percentil_fila, 3),
                    "top10": bool(row.top10),
                    "grupamentos": sorted(
                        grp_por_unidade.get(row.unidade, []),
                        key=lambda g: g["fila"],
                        reverse=True,
                    ),
                }
            )
        registros.sort(key=lambda r: r["fila"], reverse=True)
        por_ano[str(ano)] = registros

    return {"anos": anos, "por_ano": por_ano}


# --------------------------------------------------------------------------- #
#  Liberação (motor de cruzamento — Frente 2)
# --------------------------------------------------------------------------- #
def build_liberacao(qa: pd.DataFrame, scores: pd.DataFrame) -> dict:
    anos = sorted(qa["ano"].unique().tolist())
    score_map = dict(zip(scores["insc_id"], scores["score"], strict=False))
    score_pct_map = dict(zip(scores["insc_id"], scores["score_pct"], strict=False))
    por_ano: dict[str, dict] = {}

    for ano in [*anos, "todos"]:
        sub = qa if ano == "todos" else qa[qa["ano"] == ano]

        confirma_por_insc = sub.groupby("insc_id")["is_confirmado"].any()
        inscricoes_confirmadas = set(confirma_por_insc[confirma_por_insc].index)

        # opção efetivamente confirmada de cada inscrição (a 1ª, se houver várias)
        conf_rows = sub[sub["is_confirmado"]].sort_values("opcao")
        opcao_confirmada = {
            r.insc_id: {"unidade": r.unidade, "nome": r.nome_unidade, "opcao": int(r.opcao)}
            for r in conf_rows.itertuples(index=False)
        }

        # vagas travadas = linhas em fila de inscrições que JÁ têm confirmação em outro lugar
        fila_rows = sub[sub["is_fila"]].copy()
        fila_rows["tem_confirmacao"] = fila_rows["insc_id"].isin(inscricoes_confirmadas)
        travadas = fila_rows[fila_rows["tem_confirmacao"]]

        vagas_travadas_total = int(len(travadas))
        inscricoes_multi = int(travadas["insc_id"].nunique())

        travadas_por_unidade = travadas.groupby(["unidade", "nome_unidade"]).size()
        top_unidades = travadas_por_unidade.sort_values(ascending=False).head(
            TOP_UNIDADES_LIBERACAO
        )

        unidades_payload = []
        for (unidade, nome), n_travadas in top_unidades.items():
            # exemplos de crianças travando vaga nesta unidade
            trav_unidade = travadas[travadas["unidade"] == unidade]
            exemplos = []
            for insc_id, _ in list(trav_unidade.groupby("insc_id"))[:EXEMPLOS_POR_UNIDADE]:
                confirmada = opcao_confirmada.get(insc_id)
                if not confirmada:
                    continue
                reservas = sub[(sub["insc_id"] == insc_id) & (sub["is_fila"])]
                exemplos.append(
                    {
                        "aluno": insc_id,
                        "score": int(score_map.get(insc_id, 0)),
                        "score_pct": float(score_pct_map.get(insc_id, 0.0)),
                        "confirmada_em": {
                            "unidade": confirmada["unidade"],
                            "nome": confirmada["nome"],
                            "opcao": confirmada["opcao"],
                        },
                        "reservas_travadas": [
                            {"unidade": r.unidade, "nome": r.nome_unidade, "opcao": int(r.opcao)}
                            for r in reservas.itertuples(index=False)
                        ],
                    }
                )

            # quem deveria ser promovido: fila "limpa" desta unidade (sem confirmacao alguma)
            fila_limpa = fila_rows[
                (fila_rows["unidade"] == unidade) & (~fila_rows["tem_confirmacao"])
            ].copy()
            fila_limpa["score"] = fila_limpa["insc_id"].map(lambda i: score_map.get(i, 0))
            fila_limpa["score_pct"] = fila_limpa["insc_id"].map(
                lambda i: score_pct_map.get(i, 0.0)
            )
            fila_limpa = fila_limpa.sort_values(
                ["score", "data_criacao"], ascending=[False, True]
            ).drop_duplicates("insc_id")
            promover = [
                {
                    "aluno": r.insc_id,
                    "score": int(r.score),
                    "score_pct": float(r.score_pct),
                    "opcao": int(r.opcao),
                    "grupamento": r.grupamento,
                }
                for r in fila_limpa.head(PROMOVER_POR_UNIDADE).itertuples(index=False)
            ]

            unidades_payload.append(
                {
                    "unidade": unidade,
                    "nome": nome or unidade,
                    "travadas": int(n_travadas),
                    "fila_limpa": int(fila_limpa["insc_id"].nunique()),
                    "exemplos": exemplos,
                    "promover": promover,
                }
            )

        por_ano[str(ano)] = {
            "vagas_travadas_total": vagas_travadas_total,
            "inscricoes_multi_reserva": inscricoes_multi,
            "unidades": unidades_payload,
        }

    return {"anos": anos, "por_ano": por_ano}


# --------------------------------------------------------------------------- #
#  Runner
# --------------------------------------------------------------------------- #
def run(source_dir: Path, out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    print(f"[etl] lendo bases de: {source_dir}")

    qa = read_query_a(source_dir)
    print(f"[etl] Query A: {len(qa):,} linhas / {qa['insc_id'].nunique():,} inscrições")

    catalogo = read_query_c(source_dir)
    enderecos = read_query_d(source_dir)

    print("[etl] calculando pontuação de vulnerabilidade (Query B, em blocos)...")
    scores = build_scores(source_dir, catalogo)
    print(f"[etl] scores calculados para {len(scores):,} inscrições")

    overview = build_overview(qa)
    unidades = build_unidades(qa, enderecos)
    liberacao = build_liberacao(qa, scores)

    meta = {
        "gerado_em": dt.datetime.now(dt.UTC).isoformat(timespec="seconds"),
        "fonte": str(source_dir),
        "anos": overview["anos"],
        "linhas_query_a": int(len(qa)),
        "inscricoes": int(qa["insc_id"].nunique()),
        "unidades": int(qa["unidade"].nunique()),
        "inscricoes_com_score": int(len(scores)),
        "aviso": (
            "Dados anonimizados (aleatorização, generalização, supressão). Indicadores "
            "absolutos não representam a realidade em escala; os padrões relativos são "
            "medidos diretamente no recorte."
        ),
        "definicoes": {
            "fila": "situacao ∈ {Lista de espera, Ativo}",
            "confirmado": "situacao ∈ {Confirmado, Selecionado, Selecionado da lista}",
            "cancelado_sistema": "situacao = 'Cancelado pelo sistema'",
            "banda_concorrencia": "tercis da razão fila/confirmado no recorte",
            "top10": "unidade no decil superior de fila absoluta do recorte",
            "score": "soma dos pontos (Query C) dos critérios confirmados na Query B",
        },
    }

    for name, payload in [
        ("meta", meta),
        ("overview", overview),
        ("unidades", unidades),
        ("liberacao", liberacao),
    ]:
        dest = out_dir / f"{name}.json"
        dest.write_text(json.dumps(payload, ensure_ascii=False, indent=1), encoding="utf-8")
        print(f"[etl] escrito {dest}  ({dest.stat().st_size / 1024:.0f} KB)")

    print("[etl] concluído.")


def main() -> None:
    settings = get_settings()
    parser = argparse.ArgumentParser(description="Gera os agregados JSON da API.")
    parser.add_argument("--source", type=Path, default=settings.source_path)
    parser.add_argument("--out", type=Path, default=settings.data_path)
    args = parser.parse_args()

    source = args.source if args.source.is_absolute() else (Path.cwd() / args.source)
    if not source.exists():
        raise SystemExit(f"Pasta de bases não encontrada: {source}")
    run(source.resolve(), args.out.resolve())


if __name__ == "__main__":
    main()
