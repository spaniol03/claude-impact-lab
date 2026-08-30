"""Leitura das bases brutas (CSV/CSV.GZ) com tratamento de encoding e cabecalho.

As bases de inscricao/classificacao foram anonimizadas e chegam com codificacao mista
(BOM UTF-8 + corpo latin-1 ja com perda de acentos em parte dos nomes). Lemos como
UTF-8 com `errors="replace"` e normalizamos texto para exibicao.
"""

from __future__ import annotations

import re
from pathlib import Path

import pandas as pd

# ---- categorizacao de `situacao` (Query A) --------------------------------

SITUACAO_FILA = {"Lista de espera", "Ativo"}
SITUACAO_CONFIRMADO = {"Confirmado", "Selecionado", "Selecionado da lista"}
SITUACAO_CANCELADO_SISTEMA = {"Cancelado pelo sistema"}

_WS_RE = re.compile(r"\s+")
_MOJIBAKE_RE = re.compile("[�-]")
# U+FFFD (replacement char ja presente na fonte) + bytes de controle C1 remanescentes.
_BOM = "﻿"


def clean_text(value: object) -> str:
    """Remove residuos de acentuacao perdida na anonimizacao e normaliza espacos.

    As bases ja chegam com parte dos acentos substituidos por U+FFFD (+ byte de
    controle). Nao ha como recuperar a letra original; removemos o ruido para
    manter os nomes legiveis.
    """
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return ""
    text = _MOJIBAKE_RE.sub("", str(value))
    return _WS_RE.sub(" ", text).strip()


def _strip_bom_columns(df: pd.DataFrame) -> pd.DataFrame:
    df.columns = [str(c).strip().lstrip(_BOM) for c in df.columns]
    return df


def read_query_a(source_dir: Path) -> pd.DataFrame:
    """Query A - uma linha por opcao de creche dentro de uma inscricao (837k linhas)."""
    path = source_dir / "Bases IC_ ClassificadoseFila" / "01_QueryA_InscricoesPorAno.csv.gz"
    df = pd.read_csv(
        path,
        sep=";",
        encoding="utf-8",
        encoding_errors="replace",
        dtype={
            "ano": "int16",
            "prm_id": "int32",
            "plm_id": "int32",
            "ipl_id": "int64",
            "opcao": "int8",
            "unidade": "string",
        },
    )
    df = _strip_bom_columns(df)
    for col in ("nome_unidade", "grupamento", "horario", "bairro", "situacao"):
        df[col] = df[col].map(clean_text)
    df["data_criacao"] = pd.to_datetime(df["data_criacao"], errors="coerce")
    df["insc_id"] = (
        df["ano"].astype(str)
        + "-"
        + df["prm_id"].astype(str)
        + "-"
        + df["plm_id"].astype(str)
        + "-"
        + df["ipl_id"].astype(str)
    )
    df["is_fila"] = df["situacao"].isin(SITUACAO_FILA)
    df["is_confirmado"] = df["situacao"].isin(SITUACAO_CONFIRMADO)
    df["is_cancel_sistema"] = df["situacao"].isin(SITUACAO_CANCELADO_SISTEMA)
    return df


def read_query_c(source_dir: Path) -> pd.DataFrame:
    """Query C - catalogo de perguntas e regua de pontuacao por processo."""
    path = source_dir / "Bases IC_ ClassificadoseFila" / "03_QueryC_PerguntasComDescricao.csv"
    df = pd.read_csv(path, sep=";", encoding="utf-8", encoding_errors="replace")
    df = _strip_bom_columns(df)
    df["pergunta_texto"] = df["pergunta_texto"].map(clean_text)
    df["perg_pontuacao"] = (
        pd.to_numeric(df["perg_pontuacao"], errors="coerce").fillna(0).astype(int)
    )
    return df[["ano", "ich_perg_id", "perg_id", "pergunta_texto", "perg_pontuacao"]]


def iter_query_b_chunks(source_dir: Path, chunksize: int = 500_000):
    """Query B - respostas socioeconomicas em formato longo (4,3M linhas). Lida em blocos."""
    path = source_dir / "Bases IC_ ClassificadoseFila" / "02_QueryB_RespostasSocioEconomicas.csv.gz"
    reader = pd.read_csv(
        path,
        sep=";",
        encoding="utf-8",
        encoding_errors="replace",
        usecols=lambda c: c.strip().lstrip(_BOM)
        in {"ano", "prm_id", "plm_id", "ipl_id", "ich_perg_id", "resposta", "confirmado"},
        dtype=str,
        chunksize=chunksize,
    )
    for chunk in reader:
        yield _strip_bom_columns(chunk)


def read_query_d(source_dir: Path) -> pd.DataFrame:
    """Query D - enderecos das unidades. Arquivo SEM cabecalho; colunas por posicao."""
    path = source_dir / "Bases IC_ ClassificadoseFila" / "04_UnidadesEscolaresComEndereco.csv"
    df = pd.read_csv(
        path,
        sep=";",
        header=None,
        encoding="utf-8",
        encoding_errors="replace",
        dtype=str,
        keep_default_na=False,
    )
    df = df.rename(
        columns={
            1: "esc_codigo",
            2: "nome",
            4: "logradouro",
            5: "numero",
            7: "bairro",
            8: "cep",
        }
    )
    for col in ("nome", "logradouro", "numero", "bairro", "cep"):
        df[col] = df[col].map(lambda v: "" if v == "NULL" else clean_text(v))
    return df[["esc_codigo", "nome", "logradouro", "numero", "bairro", "cep"]]
