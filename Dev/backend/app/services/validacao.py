"""Validadores de campo que reproduzem as regras do matricula.rio (Inscricao.js, secao 1.3
da analise de UX). Usados tanto para validar o payload da simulacao quanto documentados
para o frontend replicar a mesma checagem em tempo real.

Nenhuma dessas funcoes acessa servico externo. O site real valida CPF on-line na Receita
Federal; aqui a checagem e apenas de digito verificador (formato), como convem a um
prototipo sem integracao.
"""

from __future__ import annotations

import re
from datetime import date

_SO_DIGITOS = re.compile(r"\D+")


def apenas_digitos(valor: str) -> str:
    return _SO_DIGITOS.sub("", valor or "")


def nis_valido(valor: str) -> bool:
    """NIS/PIS - digito verificador modulo 11 (mesma regra citada na analise)."""
    nis = apenas_digitos(valor)
    if len(nis) != 11:
        return False
    pesos = [3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    soma = sum(int(nis[i]) * pesos[i] for i in range(10))
    resto = soma % 11
    dig = 0 if resto < 2 else 11 - resto
    return dig == int(nis[10])


def data_br_valida(valor: str) -> date | None:
    """dd/mm/aaaa, com teto de 120 anos - como a mascara do site."""
    m = re.fullmatch(r"(\d{2})/(\d{2})/(\d{4})", valor or "")
    if not m:
        return None
    dia, mes, ano = (int(x) for x in m.groups())
    try:
        d = date(ano, mes, dia)
    except ValueError:
        return None
    hoje = date.today()
    if d > hoje or (hoje.year - ano) > 120:
        return None
    return d


def email_valido(valor: str) -> bool:
    return bool(re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", valor or ""))


def cep_valido(valor: str) -> bool:
    return len(apenas_digitos(valor)) == 8


def nome_valido(valor: str) -> bool:
    """Sem caracteres especiais; nao mais que 4 letras repetidas em sequencia."""
    v = (valor or "").strip()
    if len(v) < 5 or not re.fullmatch(r"[A-Za-zÀ-ÿ' ]+", v):
        return False
    return not re.search(r"(.)\1{4,}", v.lower())


def grupamento_sugerido(nascimento: date, ano_processo: int = 2026) -> str | None:
    """Grupamento de creche sugerido a partir do ano de nascimento (ciclo 2026)."""
    mapa = {1: "Bercario I", 2: "Bercario II", 3: "Maternal I", 4: "Maternal II"}
    return mapa.get(ano_processo - nascimento.year)
