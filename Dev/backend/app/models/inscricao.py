"""Modelos do formulario de inscricao simulada (Frente 1).

Reproduz os campos do assistente do matricula.rio (Anexos A e B da analise de UX),
com escopo em CRECHE. Ao enviar, o payload e validado, o comprovante e emitido e a
inscricao e gravada no banco (SQLite por padrao) indexada pelo protocolo.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from app.models.schemas import AvaliacaoOpcao, ProblemaValidacao

__all__ = ["ProblemaValidacao"]

Sn = bool  # Sim/Nao


class Candidato(BaseModel):
    origem: str
    matricula_rede: str | None = None
    data_nascimento: str = Field(description="dd/mm/aaaa")
    nome: str
    tem_cpf: bool = True
    cpf: str | None = None
    sexo: Literal["Masculino", "Feminino"] | None = None
    confirma_certidao: bool = False


class Filiacao(BaseModel):
    nome: str | None = None
    nao_existente: bool = False
    data_nascimento: str | None = None
    consta_certidao: bool | None = None


class Naturalidade(BaseModel):
    nacionalidade: Literal["Brasileiro(a)", "Naturalizado(a)", "Outra nacionalidade"]
    pais: str = "Brasil"
    uf: str
    cidade: str
    refugiado: Sn = False


class PerfilEspecial(BaseModel):
    deficiencia: Sn = False
    tipos_deficiencia: list[str] = Field(default_factory=list)
    cadeira_rodas: Sn = False
    candidato_emoc: Sn = False
    pais_60mais: Sn = False
    pais_deficientes: Sn = False
    tipos_deficiencia_responsavel: list[str] = Field(default_factory=list)
    mae_adolescente: Sn = False
    nome_mae_adolescente: str | None = None
    data_nasc_mae_adolescente: str | None = None


class Irmao(BaseModel):
    possui_irmao_inscrito: Sn = False
    numero_inscricao_irmao: str | None = None
    gemeo: Sn = False


class Responsavel(BaseModel):
    tipo: str
    nome: str
    cpf: str
    ddd_telefone: str | None = None
    telefone: str | None = None
    ddd_celular: str | None = None
    celular: str | None = None
    email: str
    nis: str | None = None


class Endereco(BaseModel):
    cep: str
    logradouro: str
    numero: str
    complemento: str | None = None
    bairro: str
    cidade: str = "Rio de Janeiro"
    uf: str = "RJ"


class RespostaQuestionario(BaseModel):
    id: str
    pergunta: str
    resposta: Sn


class OpcaoEscola(BaseModel):
    ordem: int = Field(ge=1, le=5)
    unidade: str
    esteve_lista_espera: Sn = False
    irmao_frequenta: Sn = False
    matricula_irmao: str | None = None
    responsavel_estuda: Sn = False
    matricula_responsavel: str | None = None


class InscricaoPayload(BaseModel):
    candidato: Candidato
    filiacao1: Filiacao
    filiacao2: Filiacao
    naturalidade: Naturalidade
    perfil: PerfilEspecial
    irmao: Irmao
    responsavel: Responsavel
    endereco: Endereco
    questionario: list[RespostaQuestionario] = Field(default_factory=list)
    opcoes: list[OpcaoEscola] = Field(min_length=1, max_length=5)


class Comprovante(BaseModel):
    protocolo: str
    gerado_em: str
    ano_processo: int
    grupamento_sugerido: str | None
    candidato_nome: str
    responsavel_nome: str
    opcoes: list[AvaliacaoOpcao]
    n_top10: int
    n_alta_concorrencia: int
    criterios_a_comprovar: list[str]
    recomendacao: str
    aviso_comparecimento: str


class InscricaoResumo(BaseModel):
    protocolo: str
    criado_em: str
    situacao: str
    ano_processo: int
    grupamento_sugerido: str | None
    candidato_nome: str
    responsavel_nome: str
    n_opcoes: int
    n_criterios_sim: int


class InscricaoDetalhe(BaseModel):
    protocolo: str
    criado_em: str
    situacao: str
    comprovante: Comprovante
    dados: InscricaoPayload


# ---- dados de referencia para o frontend renderizar o formulario ----------- #
class ItemQuestionario(BaseModel):
    id: str
    texto: str
    porque: str


class PrePreenchimento(BaseModel):
    """Dados que a Prefeitura ja teria (Receita Federal + Registro Municipal Integrado).

    SIMULADO e deterministico a partir do CPF — nao ha integracao real. Serve para
    demonstrar o fluxo 'comece pelo CPF' proposto no mock mobile.
    """

    encontrado: bool
    fonte: str
    nome: str
    data_nascimento: str
    sexo: Literal["Masculino", "Feminino"]
    filiacao1: str
    filiacao2: str
    cep: str
    logradouro: str
    numero: str
    bairro: str
    cidade: str
    uf: str


class FormularioRef(BaseModel):
    ano_processo: int
    origens_candidato: list[str]
    ufs: list[str]
    paises: list[str]
    tipos_deficiencia: list[str]
    tipos_responsavel: list[str]
    questionario_creche: list[ItemQuestionario]
    regra_grupamento: dict[str, str]
