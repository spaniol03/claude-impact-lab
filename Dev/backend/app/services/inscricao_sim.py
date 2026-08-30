"""Regras da inscricao: valida o payload (dados cadastrais + situacao social + escolhas),
avalia a concorrencia das opcoes e monta o comprovante com protocolo. A gravacao no banco
e feita por `app.services.inscricoes_repo`."""

from __future__ import annotations

import datetime as dt
import logging
import secrets

from app.models.inscricao import (
    Comprovante,
    FormularioRef,
    InscricaoPayload,
    ItemQuestionario,
    PrePreenchimento,
    ProblemaValidacao,
)
from app.services import validacao as v
from app.services.repository import Repository

logger = logging.getLogger("creche-impact-lab.inscricao")

ANO_PROCESSO = 2026


class ValidacaoInscricaoError(Exception):
    def __init__(self, problemas: list[ProblemaValidacao]) -> None:
        self.problemas = problemas
        super().__init__(f"{len(problemas)} problema(s) de validacao")

ORIGENS = [
    "Nunca estudou",
    "Nao estuda atualmente, mas a ultima escola foi municipal do Rio de Janeiro",
    "Estuda ou a ultima escola foi uma escola particular",
    "Estuda em escola municipal do Rio de Janeiro e quer transferencia",
    "Estuda ou a ultima escola foi publica de outro municipio do Estado do Rio",
    "Estuda ou a ultima escola foi publica de outro estado do Brasil",
]

UFS = [
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
    "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO", "Exterior",
]

PAISES = [
    "Brasil", "Argentina", "Bolivia", "Chile", "Colombia", "Paraguai", "Peru", "Uruguai",
    "Venezuela", "Angola", "Cabo Verde", "Guine-Bissau", "Mocambique", "Portugal",
    "Estados Unidos", "Haiti", "Siria", "Outra",
]

TIPOS_DEFICIENCIA = [
    "Altas habilidades/Superdotacao", "Baixa visao", "Deficiencia auditiva",
    "Deficiencia fisica", "Deficiencia intelectual", "Deficiencia multipla",
    "Deficiencia visual/Cegueira", "Surdocegueira", "Deficiencia auditiva/Surdez",
    "Transtorno do Espectro Autista (TEA)", "Visao monocular",
]

TIPOS_RESPONSAVEL = ["Mae", "Pai", "Avo/Avo", "Tio/Tia", "Responsavel legal", "Outro"]

QUESTIONARIO_CRECHE: list[ItemQuestionario] = [
    ItemQuestionario(
        id="doenca_cronica",
        texto="A crianca e/ou alguem do nucleo familiar tem doenca cronica grave?",
        porque="Ajuda a priorizar familias com maior necessidade de apoio. Se marcar Sim, sera pedido um comprovante (laudo/relatorio medico).",
    ),
    ItemQuestionario(
        id="violencia_domestica",
        texto="A crianca e/ou familiar do convivio diario e vitima de violencia domestica?",
        porque="Situacao de risco tem prioridade na classificacao. Comprovacao por documento da rede de protecao (CREAS, Conselho Tutelar, BO).",
    ),
    ItemQuestionario(
        id="uso_abusivo_substancias",
        texto="Algum membro do nucleo familiar faz uso abusivo de alcool e/ou outras drogas?",
        porque="Compoe o quadro de vulnerabilidade da familia. Comprovacao por relatorio de servico de saude ou assistencia social.",
    ),
    ItemQuestionario(
        id="familiar_privado_liberdade",
        texto="Algum membro do nucleo familiar esta ou esteve privado de liberdade?",
        porque="Considerado na classificacao por vulnerabilidade social. Comprovacao por documento judicial.",
    ),
    ItemQuestionario(
        id="responsavel_menor_18",
        texto="A crianca tem pais ou responsaveis com menos de 18 anos?",
        porque="Maternidade/paternidade na adolescencia tem prioridade. Comprovacao pelo documento de identidade do responsavel.",
    ),
    ItemQuestionario(
        id="responsavel_deficiente",
        texto="A crianca tem pais ou responsaveis com deficiencia?",
        porque="Prioridade na classificacao. Comprovacao por laudo do responsavel.",
    ),
    ItemQuestionario(
        id="refugiado",
        texto="A crianca e refugiada ou solicitante de refugio?",
        porque="Prioridade prevista na politica de matricula. Comprovacao pelo protocolo/carteira de refugio.",
    ),
    ItemQuestionario(
        id="fila_ano_anterior",
        texto="A crianca aguardou em fila de espera no ano anterior sem ter sido atendida?",
        porque="Tempo de espera acumulado conta pontos. Verificado pelo proprio sistema de matricula.",
    ),
    ItemQuestionario(
        id="cadunico",
        texto="A familia e inscrita no CadUnico (Cadastro Unico para Programas Sociais)?",
        porque="Indicador de baixa renda. Parte e confirmada automaticamente pelo Registro Municipal Integrado.",
    ),
    ItemQuestionario(
        id="irmao_rede",
        texto="A crianca tem irmao matriculado na rede publica ou em unidade parceira?",
        porque="Facilita a logistica da familia. Comprovacao pela matricula do irmao.",
    ),
    ItemQuestionario(
        id="familia_monoparental",
        texto="A crianca pertence a familia monoparental (um unico responsavel)?",
        porque="Compoe o quadro de vulnerabilidade. Comprovacao por declaracao e documentos da crianca.",
    ),
    ItemQuestionario(
        id="educacao_especial",
        texto="A crianca e publico-alvo da educacao especial?",
        porque="Garante vaga com o atendimento adequado. Comprovacao por laudo/relatorio.",
    ),
    ItemQuestionario(
        id="pequenos_cariocas",
        texto="A crianca e atendida pelo Programa Pequenos Cariocas?",
        porque="Integracao entre programas municipais. Verificado pelo proprio municipio.",
    ),
    ItemQuestionario(
        id="bolsa_familia",
        texto="A familia faz parte do Programa Bolsa Familia?",
        porque="Indicador de renda. Confirmado automaticamente pelo Registro Municipal Integrado.",
    ),
]

REGRA_GRUPAMENTO = {
    "Bercario I": "crianca nascida em 2025",
    "Bercario II": "crianca nascida em 2024",
    "Maternal I": "crianca nascida em 2023",
    "Maternal II": "crianca nascida em 2022",
}


_NOMES_F = [
    "Ana Clara de Souza", "Maria Alice Rodrigues", "Helena Nogueira Lima",
    "Valentina Ribeiro Costa", "Laura Fernandes Pinto", "Isabela Martins Rocha",
    "Sophia Almeida Barros", "Cecilia Gomes Teixeira",
]
_NOMES_M = [
    "Miguel de Souza", "Arthur Rodrigues Lima", "Heitor Nogueira Costa",
    "Bernardo Ribeiro Pinto", "Davi Fernandes Rocha", "Theo Martins Barros",
    "Gael Almeida Teixeira", "Ravi Gomes Cardoso",
]
_MAES = [
    "Maria da Silva Souza", "Juliana Rodrigues Lima", "Patricia Nogueira Costa",
    "Fernanda Ribeiro Pinto", "Camila Fernandes Rocha", "Aline Martins Barros",
]
_PAIS = [
    "Jose Carlos Souza", "Marcos Antonio Lima", "Paulo Roberto Costa",
    "Luiz Fernando Pinto", "Rafael Augusto Rocha", "Bruno Henrique Barros",
]
_ENDERECOS = [
    ("22071-000", "Avenida Nossa Senhora de Copacabana", "Copacabana"),
    ("22250-040", "Rua Voluntarios da Patria", "Botafogo"),
    ("20520-051", "Rua Conde de Bonfim", "Tijuca"),
    ("21725-003", "Estrada do Cacuia", "Ilha do Governador"),
    ("23052-000", "Avenida Cesario de Melo", "Campo Grande"),
    ("21341-070", "Rua Clarimundo de Melo", "Piedade"),
    ("20950-060", "Rua Sao Francisco Xavier", "Maracana"),
    ("22775-040", "Avenida das Americas", "Barra da Tijuca"),
]


def pre_preenchimento(cpf: str) -> PrePreenchimento:
    """Dados simulados que a Prefeitura ja teria — deterministicos a partir do CPF."""
    digitos = v.apenas_digitos(cpf)
    seed = int(digitos or "0")
    feminino = seed % 2 == 0
    nomes = _NOMES_F if feminino else _NOMES_M
    nome = nomes[seed % len(nomes)]
    ano_nasc = 2022 + (seed % 4)
    mes = (seed // 7) % 12 + 1
    dia = (seed // 31) % 27 + 1
    cep, log, bairro = _ENDERECOS[seed % len(_ENDERECOS)]
    numero = str((seed % 900) + 10)
    return PrePreenchimento(
        encontrado=True,
        fonte="Receita Federal + Registro Municipal Integrado (dados simulados)",
        nome=nome,
        data_nascimento=f"{dia:02d}/{mes:02d}/{ano_nasc}",
        sexo="Feminino" if feminino else "Masculino",
        filiacao1=_MAES[seed % len(_MAES)],
        filiacao2=_PAIS[(seed // 3) % len(_PAIS)],
        cep=cep,
        logradouro=log,
        numero=numero,
        bairro=bairro,
        cidade="Rio de Janeiro",
        uf="RJ",
    )


def formulario_ref() -> FormularioRef:
    return FormularioRef(
        ano_processo=ANO_PROCESSO,
        origens_candidato=ORIGENS,
        ufs=UFS,
        paises=PAISES,
        tipos_deficiencia=TIPOS_DEFICIENCIA,
        tipos_responsavel=TIPOS_RESPONSAVEL,
        questionario_creche=QUESTIONARIO_CRECHE,
        regra_grupamento=REGRA_GRUPAMENTO,
    )


def _validar(p: InscricaoPayload) -> list[ProblemaValidacao]:
    erros: list[ProblemaValidacao] = []

    def add(campo: str, msg: str) -> None:
        erros.append(ProblemaValidacao(campo=campo, mensagem=msg))

    c = p.candidato
    nasc = v.data_br_valida(c.data_nascimento)
    if nasc is None:
        add("candidato.data_nascimento", "Data invalida. Use o formato dd/mm/aaaa.")
    elif nasc.year not in (2022, 2023, 2024, 2025):
        add(
            "candidato.data_nascimento",
            "Para creche em 2026, a crianca precisa ter nascido entre 2022 e 2025.",
        )
    if not v.nome_valido(c.nome):
        add("candidato.nome", "Informe o nome completo, sem abreviacoes nem numeros.")
    if c.tem_cpf and not (c.cpf or "").strip():
        add("candidato.cpf", "Informe o CPF da crianca.")
    if not c.confirma_certidao:
        add(
            "candidato.confirma_certidao",
            "E preciso confirmar que nome, CPF, nascimento e filiacoes estao exatamente como na certidao.",
        )

    for rot, f in (("filiacao1", p.filiacao1), ("filiacao2", p.filiacao2)):
        if f.nao_existente:
            continue
        if not f.nome or not v.nome_valido(f.nome):
            add(f"{rot}.nome", "Informe o nome completo da filiacao ou marque 'nao consta / nao existe'.")

    n = p.naturalidade
    if not n.cidade.strip():
        add("naturalidade.cidade", "Informe a cidade onde a crianca nasceu.")
    if n.uf not in UFS:
        add("naturalidade.uf", "Selecione o estado onde a crianca nasceu.")

    perf = p.perfil
    if perf.deficiencia and not perf.tipos_deficiencia:
        add("perfil.tipos_deficiencia", "Selecione ao menos um tipo de deficiencia.")
    if perf.pais_deficientes and not perf.tipos_deficiencia_responsavel:
        add(
            "perfil.tipos_deficiencia_responsavel",
            "Selecione ao menos um tipo de deficiencia do responsavel.",
        )
    if perf.mae_adolescente:
        if not perf.nome_mae_adolescente:
            add("perfil.nome_mae_adolescente", "Informe o nome da mae adolescente.")
        if v.data_br_valida(perf.data_nasc_mae_adolescente or "") is None:
            add("perfil.data_nasc_mae_adolescente", "Data de nascimento invalida (dd/mm/aaaa).")

    ir = p.irmao
    if ir.possui_irmao_inscrito and not (ir.numero_inscricao_irmao or "").strip():
        add("irmao.numero_inscricao_irmao", "Informe o numero da inscricao do irmao.")

    r = p.responsavel
    if r.tipo not in TIPOS_RESPONSAVEL:
        add("responsavel.tipo", "Selecione o tipo de responsavel.")
    if not v.nome_valido(r.nome):
        add("responsavel.nome", "Informe o nome completo do responsavel.")
    if not (r.cpf or "").strip():
        add("responsavel.cpf", "Informe o CPF do responsavel.")
    elif c.tem_cpf and c.cpf and v.apenas_digitos(c.cpf) == v.apenas_digitos(r.cpf):
        add("responsavel.cpf", "O CPF do responsavel nao pode ser igual ao do candidato.")
    if not v.email_valido(r.email):
        add("responsavel.email", "E-mail invalido. Ele sera o canal de comunicacao com a familia.")
    if r.nis and not v.nis_valido(r.nis):
        add("responsavel.nis", "NIS invalido (11 digitos com digito verificador).")

    e = p.endereco
    if not v.cep_valido(e.cep):
        add("endereco.cep", "CEP invalido (8 digitos).")
    if not e.logradouro.strip():
        add("endereco.logradouro", "Informe o logradouro.")
    if not e.numero.strip():
        add("endereco.numero", "Informe o numero. Se nao houver, escreva 'S/N'.")
    if not e.bairro.strip():
        add("endereco.bairro", "Informe o bairro.")

    ordens = sorted(o.ordem for o in p.opcoes)
    if ordens != list(range(1, len(ordens) + 1)):
        add("opcoes", "As opcoes devem estar numeradas em sequencia a partir de 1.")
    if len({o.unidade for o in p.opcoes}) != len(p.opcoes):
        add("opcoes", "Ha unidades repetidas entre as opcoes.")
    for o in p.opcoes:
        if o.irmao_frequenta and not (o.matricula_irmao or "").strip():
            add(f"opcoes.{o.ordem}.matricula_irmao", "Informe a matricula do irmao nesta escola.")
        if o.responsavel_estuda and not (o.matricula_responsavel or "").strip():
            add(
                f"opcoes.{o.ordem}.matricula_responsavel",
                "Informe a matricula do responsavel nesta escola.",
            )

    return erros


def simular(p: InscricaoPayload, repo: Repository) -> Comprovante:
    """Valida e monta o comprovante. Lanca ValidacaoInscricaoError se invalido."""
    problemas = _validar(p)
    if problemas:
        raise ValidacaoInscricaoError(problemas)

    nasc = v.data_br_valida(p.candidato.data_nascimento)
    grupamento = v.grupamento_sugerido(nasc, ANO_PROCESSO) if nasc else None

    codigos = [o.unidade for o in sorted(p.opcoes, key=lambda x: x.ordem)]
    aval = repo.avaliar_inscricao("todos", codigos)

    criterios = [
        q.pergunta for q in p.questionario if q.resposta
    ]

    protocolo = f"{ANO_PROCESSO}{secrets.randbelow(10**8):08d}"
    logger.info("Comprovante emitido (simulacao) protocolo=%s opcoes=%d", protocolo, len(codigos))

    return Comprovante(
        protocolo=protocolo,
        gerado_em=dt.datetime.now(dt.UTC).isoformat(timespec="seconds"),
        ano_processo=ANO_PROCESSO,
        grupamento_sugerido=grupamento,
        candidato_nome=p.candidato.nome.strip(),
        responsavel_nome=p.responsavel.nome.strip(),
        opcoes=aval["opcoes"],
        n_top10=aval["n_top10"],
        n_alta_concorrencia=aval["n_alta_concorrencia"],
        criterios_a_comprovar=criterios,
        recomendacao=aval["recomendacao"],
        aviso_comparecimento=(
            "Esta e uma simulacao: nenhum dado foi enviado a SME. Na inscricao real, guarde o "
            "numero do protocolo e compareca a uma das unidades escolhidas no prazo do "
            "comprovante, levando os documentos comprobatorios de cada criterio marcado com Sim."
        ),
    )
