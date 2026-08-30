"""Carrega os agregados JSON e expõe consultas para as rotas da API.

Os agregados são gerados pelo ETL (`app.etl.build_aggregates`). Em runtime a API
NÃO toca nas bases brutas nem usa pandas — só lê estes JSON, uma vez, em memória.
"""

from __future__ import annotations

import json
from functools import cached_property
from pathlib import Path

from app.config import get_settings

_ARQUIVOS = ("meta", "overview", "unidades", "liberacao")


class DadosIndisponiveisError(RuntimeError):
    """Agregados ainda não foram gerados. Rode: python -m app.etl.build_aggregates"""


class Repository:
    def __init__(self, data_dir: Path) -> None:
        self._dir = data_dir

    def _load(self, nome: str) -> dict:
        caminho = self._dir / f"{nome}.json"
        if not caminho.exists():
            raise DadosIndisponiveisError(
                f"Arquivo ausente: {caminho}. Gere os agregados com "
                "`python -m app.etl.build_aggregates`."
            )
        return json.loads(caminho.read_text(encoding="utf-8"))

    @cached_property
    def meta(self) -> dict:
        return self._load("meta")

    @cached_property
    def overview(self) -> dict:
        return self._load("overview")

    @cached_property
    def unidades(self) -> dict:
        return self._load("unidades")

    @cached_property
    def liberacao(self) -> dict:
        return self._load("liberacao")

    @property
    def disponivel(self) -> bool:
        return all((self._dir / f"{n}.json").exists() for n in _ARQUIVOS)

    # ---- consultas ------------------------------------------------------- #
    def anos_validos(self) -> list[str]:
        return [str(a) for a in self.overview["anos"]] + ["todos"]

    def _check_ano(self, ano: str) -> str:
        if ano not in self.anos_validos():
            raise KeyError(ano)
        return ano

    def overview_ano(self, ano: str) -> dict:
        return self.overview["por_ano"][self._check_ano(ano)]

    def liberacao_ano(self, ano: str) -> dict:
        payload = dict(self.liberacao["por_ano"][self._check_ano(ano)])
        payload["ano"] = ano
        return payload

    def unidades_ano(self, ano: str) -> list[dict]:
        return self.unidades["por_ano"][self._check_ano(ano)]

    def listar_unidades(
        self,
        ano: str,
        busca: str | None = None,
        banda: str | None = None,
        limite: int = 100,
        offset: int = 0,
    ) -> tuple[int, list[dict]]:
        itens = self.unidades_ano(ano)
        if busca:
            termo = busca.strip().lower()
            itens = [
                u
                for u in itens
                if termo in u["nome"].lower() or termo in u["bairro"].lower()
            ]
        if banda:
            itens = [u for u in itens if u["banda"] == banda]
        total = len(itens)
        return total, itens[offset : offset + limite]

    def unidade(self, ano: str, codigo: str) -> dict | None:
        return next((u for u in self.unidades_ano(ano) if u["unidade"] == codigo), None)

    # ---- Frente 1: avaliação de uma inscrição simulada ------------------ #
    def avaliar_inscricao(self, ano: str, codigos: list[str]) -> dict:
        ano = self._check_ano(ano)
        avaliacoes = []
        for codigo in codigos[:5]:
            u = self.unidade(ano, codigo)
            if u is None:
                continue
            aviso = None
            if u["top10"]:
                aviso = (
                    "Esta é uma das ~10% de unidades mais concorridas da rede — juntas "
                    "elas concentram a maior parte da fila de espera. Marcar mais opções "
                    "concorridas não aumenta sua chance de confirmação."
                )
            elif u["banda"] == "alta":
                aviso = (
                    "Unidade de alta concorrência no histórico "
                    "(muita fila para poucas confirmações)."
                )
            avaliacoes.append(
                {
                    "unidade": u["unidade"],
                    "nome": u["nome"],
                    "bairro": u["bairro"],
                    "banda": u["banda"],
                    "top10": u["top10"],
                    "ratio": u["ratio"],
                    "fila": u["fila"],
                    "confirmados": u["confirmados"],
                    "aviso": aviso,
                }
            )
        n_alta = sum(1 for a in avaliacoes if a["banda"] == "alta")
        n_top10 = sum(1 for a in avaliacoes if a["top10"])
        if not avaliacoes:
            recomendacao = "Selecione ao menos uma unidade para ver a análise de concorrência."
        elif n_top10 == len(avaliacoes):
            recomendacao = (
                "Todas as suas opções estão entre as mais concorridas da rede. Considere "
                "incluir ao menos uma unidade de concorrência menor — isso não reduz sua "
                "prioridade por vulnerabilidade e aumenta a chance de uma convocação rápida."
            )
        elif n_alta or n_top10:
            recomendacao = (
                "Você tem opções de concorrência variada — bom equilíbrio. A ordem de "
                "preferência e os critérios de classificação continuam valendo como hoje."
            )
        else:
            recomendacao = (
                "Suas opções têm concorrência baixa a média no histórico — perfil "
                "favorável a uma convocação mais rápida."
            )
        return {
            "ano": ano,
            "opcoes": avaliacoes,
            "n_alta_concorrencia": n_alta,
            "n_top10": n_top10,
            "recomendacao": recomendacao,
        }


_repo: Repository | None = None


def get_repository() -> Repository:
    global _repo
    if _repo is None:
        _repo = Repository(get_settings().data_path)
    return _repo
