"""Testes de fumaça da API. Requerem os agregados gerados (python -m app.etl.build_aggregates)."""

import pytest


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_openapi(client):
    assert client.get("/openapi.json").status_code == 200


@pytest.fixture(autouse=True)
def _skip_sem_dados(agregados_disponiveis):
    if not agregados_disponiveis:
        pytest.skip("Agregados nao gerados; rode python -m app.etl.build_aggregates")


def test_meta(client):
    body = client.get("/api/v1/meta").json()
    assert body["inscricoes"] > 0
    assert 2021 in body["anos"]


def test_anos(client):
    anos = client.get("/api/v1/anos").json()["anos"]
    assert "todos" in anos


def test_overview_todos(client):
    body = client.get("/api/v1/overview", params={"ano": "todos"}).json()
    assert body["totais"]["unidades"] == 872
    assert 0 < body["pct_3mais_opcoes"] < 1
    # cancelamento pelo sistema cresce monotonicamente com o nº de opções
    medias = [d["media_cancel_sistema"] for d in body["opcoes_dist"] if d["n_opcoes"] <= 5]
    assert medias == sorted(medias)


def test_overview_ano_invalido(client):
    assert client.get("/api/v1/overview", params={"ano": "1999"}).status_code == 422


def test_unidades_lista_e_busca(client):
    body = client.get("/api/v1/unidades", params={"ano": "todos", "limite": 5}).json()
    assert body["total"] > 100
    assert len(body["itens"]) == 5
    assert body["itens"][0]["fila"] >= body["itens"][-1]["fila"]  # ordenado por fila desc

    filtrado = client.get(
        "/api/v1/unidades", params={"ano": "todos", "banda": "alta", "limite": 3}
    ).json()
    assert all(u["banda"] == "alta" for u in filtrado["itens"])


def test_inscricao_avaliar(client):
    lista = client.get("/api/v1/unidades", params={"ano": "todos", "limite": 3}).json()["itens"]
    codigos = ",".join(u["unidade"] for u in lista)
    body = client.get(
        "/api/v1/inscricao/avaliar", params={"ano": "todos", "unidades": codigos}
    ).json()
    assert len(body["opcoes"]) == 3
    assert "recomendacao" in body


def test_inscricao_avaliar_limite_5(client):
    r = client.get(
        "/api/v1/inscricao/avaliar",
        params={"ano": "todos", "unidades": "a,b,c,d,e,f"},
    )
    assert r.status_code == 422


def test_liberacao(client):
    body = client.get("/api/v1/liberacao", params={"ano": "todos"}).json()
    assert body["vagas_travadas_total"] >= 0
    assert isinstance(body["unidades"], list)


def test_formulario_ref(client):
    body = client.get("/api/v1/inscricao/formulario").json()
    assert body["ano_processo"] == 2026
    assert len(body["questionario_creche"]) == 14
    assert "RJ" in body["ufs"]


def test_pre_preenchimento_deterministico(client):
    cpf = "390.533.447-05"
    a = client.get("/api/v1/inscricao/pre-preenchimento", params={"cpf": cpf})
    b = client.get("/api/v1/inscricao/pre-preenchimento", params={"cpf": "39053344705"})
    assert a.status_code == 200
    assert a.json() == b.json()  # mesmo CPF -> mesmos dados
    assert a.json()["encontrado"] is True
    assert a.json()["uf"] == "RJ"
    # sem validação de CPF: qualquer valor não-vazio retorna dados de exemplo
    assert client.get(
        "/api/v1/inscricao/pre-preenchimento", params={"cpf": "111"}
    ).status_code == 200


def _payload_valido(client) -> dict:
    lista = client.get("/api/v1/unidades", params={"ano": "todos", "limite": 2}).json()["itens"]
    return {
        "candidato": {
            "origem": "Nunca estudou",
            "data_nascimento": "15/03/2023",
            "nome": "Maria Alice Souza Lima",
            "tem_cpf": True,
            "cpf": "390.533.447-05",
            "sexo": "Feminino",
            "confirma_certidao": True,
        },
        "filiacao1": {
            "nome": "Joana Souza Lima",
            "nao_existente": False,
            "data_nascimento": "10/05/1995",
            "consta_certidao": True,
        },
        "filiacao2": {"nao_existente": True, "nome": None, "consta_certidao": None},
        "naturalidade": {
            "nacionalidade": "Brasileiro(a)",
            "pais": "Brasil",
            "uf": "RJ",
            "cidade": "Rio de Janeiro",
            "refugiado": False,
        },
        "perfil": {},
        "irmao": {},
        "responsavel": {
            "tipo": "Mae",
            "nome": "Joana Souza Lima",
            "cpf": "111.444.777-35",
            "ddd_celular": "21",
            "celular": "998887766",
            "email": "joana@example.com",
        },
        "endereco": {
            "cep": "20931-001",
            "logradouro": "Rua do Exemplo",
            "numero": "100",
            "bairro": "Caju",
        },
        "questionario": [
            {"id": "cadunico", "pergunta": "A familia e inscrita no CadUnico?", "resposta": True}
        ],
        "opcoes": [
            {"ordem": 1, "unidade": lista[0]["unidade"]},
            {"ordem": 2, "unidade": lista[1]["unidade"]},
        ],
    }


def test_registrar_e_consultar(client):
    r = client.post("/api/v1/inscricoes", json=_payload_valido(client))
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["protocolo"].startswith("2026")
    assert body["grupamento_sugerido"] == "Maternal I"
    assert len(body["opcoes"]) == 2
    assert body["criterios_a_comprovar"]

    # persiste e pode ser recuperada pelo protocolo
    det = client.get(f"/api/v1/inscricoes/{body['protocolo']}")
    assert det.status_code == 200
    assert det.json()["comprovante"]["protocolo"] == body["protocolo"]
    assert det.json()["dados"]["candidato"]["nome"] == "Maria Alice Souza Lima"
    # situação social gravada
    assert any(q["resposta"] for q in det.json()["dados"]["questionario"])

    # aparece na listagem
    lista = client.get("/api/v1/inscricoes").json()
    assert any(i["protocolo"] == body["protocolo"] for i in lista)

    assert client.get("/api/v1/inscricoes/nao-existe").status_code == 404


def test_registrar_invalido(client):
    p = _payload_valido(client)
    p["candidato"]["nome"] = "Ab"  # muito curto
    p["responsavel"]["email"] = "invalido"
    r = client.post("/api/v1/inscricoes", json=p)
    assert r.status_code == 422
    campos = {x["campo"] for x in r.json()["detail"]["problemas"]}
    assert "candidato.nome" in campos
    assert "responsavel.email" in campos
