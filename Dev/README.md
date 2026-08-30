# Otimizador de Distribuição de Vagas em Creches

Protótipo do **Claude Impact Lab** para o desafio VTEX / Prefeitura do Rio (SME).
Camada de apoio à decisão **entre a inscrição e a convocação** na Inscrição Creche —
sem alterar o matricula.rio, sem mexer na classificação por vulnerabilidade.

Baseado em [`../Docs/diagnostico_solucao.md`](../Docs/diagnostico_solucao.md) (referência
principal), [`../Docs/prb_creche.md`](../Docs/prb_creche.md) e
[`../Docs/plano_mvp_hackathon.md`](../Docs/plano_mvp_hackathon.md).

**Identidade visual e fluxo de inscrição** seguem
[`../Docs/mock_matricula_mobile.html`](../Docs/mock_matricula_mobile.html): "Matrícula
Carioca", tipografia Poppins, azul institucional único (nav/ação `#034C7F`), inputs
de fundo azul preenchido, barra utilitária + nav com lockup, CTA fixo no rodapé,
mobile-first. O fluxo de inscrição foi reformulado para **começar pelo CPF** (autofill
Receita Federal + RMI, simulado) e condensado em 5 passos.

## Telas

| Rota | Público | O que faz |
|---|---|---|
| `/` | Todos | Diagnóstico com os números medidos na base (por ano) |
| `/inscricao` | Família | **Inscrição na creche** reformulada conforme o mock mobile: Início (banner + "tenha em mãos" + **inscrição por áudio**) → Termo de uso → **CPF primeiro** (busca dados na Receita/RMI simulada, você confirma e completa contato/irmão) → Situação social + questionário → Escolha das creches (sugestões pelo bairro, busca por bairro/nome, checklist com tag "⚠ concorrida", cards com ▲▼) → Revisão → Comprovante. Barra de progresso fina, CTA fixo, rascunho salvo no navegador |
| `/concorrencia` | Família | Consulta pública da concorrência das creches por região (equivale ao "Escolas por região" do site) |
| `/consulta` | Família | Retomar / ver um comprovante pelo número do protocolo (rascunho e comprovantes ficam só no navegador) |
| `/painel-servidor` | Servidor SME/CRE | Motor de cruzamento classificação × preferência: quais reservas liberar e para quem |
| `/sobre` | Todos | Arquitetura e recorte de dados |

Endpoints da inscrição:
- `GET /api/v1/inscricao/formulario` — referência (UFs, países, questionário socioeconômico).
- `GET /api/v1/inscricao/pre-preenchimento?cpf=…` — dados **determinísticos pelo CPF** (nome,
  nascimento, sexo, filiação, endereço). Não há integração real; demonstra o "comece pelo CPF".
- `POST /api/v1/inscricoes` — valida o formulário completo (**dados cadastrais + situação
  social + escolhas**), **grava no banco** e devolve o comprovante com protocolo.
- `GET /api/v1/inscricoes/{protocolo}` — recupera a inscrição (fonte da tela "Consultar
  inscrição").
- `GET /api/v1/inscricoes` — lista as inscrições recebidas (visível no Painel do servidor).

### Onde os dados ficam guardados

| O quê | Onde | Persiste? |
|---|---|---|
| Rascunho (enquanto preenche) | `localStorage` do navegador | só naquele dispositivo |
| Inscrição enviada | **banco do backend** — SQLite `backend/app/data/inscricoes.db` por padrão | sim, servidor |
| Cópia do comprovante | `localStorage` (conveniência offline) | só naquele dispositivo |

O SQLite é um arquivo, sem servidor e **sem credenciais**. Ele guarda dados pessoais de teste,
então **não é versionado** (`.gitignore`). Em produção, `CIV_DB_URL` aponta para o banco da TI
da Prefeitura (`postgresql+psycopg://…`), com controle de acesso e retenção conforme a LGPD.

## Arquitetura — frontend e backend desacoplados

```
Dev/
├── backend/            FastAPI (Python) · ambiente isolado em .venv
│   ├── app/
│   │   ├── main.py         API — lê agregados JSON + banco de inscrições (SQLite)
│   │   ├── api/routes.py   endpoints /api/v1/*
│   │   ├── db.py           engine SQLAlchemy + modelo da tabela `inscricoes`
│   │   ├── services/       regras das duas frentes + gravação/leitura das inscrições
│   │   ├── etl/            pipeline que gera os agregados (pandas) — dependências à parte
│   │   └── data/           agregados *.json (versionados) + inscricoes.db (NÃO versionado)
│   └── tests/
└── frontend/           React + TypeScript + Vite · fala com o backend só por HTTP
    └── src/
        ├── api/            cliente fetch + contrato de tipos (espelha os schemas do backend)
        ├── components/     UI própria (sem framework de componentes; gráficos em SVG)
        └── pages/          VisãoGeral · Inscrição · PainelServidor · Sobre
```

- **Sem acoplamento**: o React não importa nada do Python; o único contrato é o JSON
  da API. Podem ser desenvolvidos, testados e implantados separadamente.
- **Sem credenciais**: a aplicação só consome dados públicos anonimizados. Não há
  segredo a configurar; `.env` (não versionado) só ajusta caminhos e CORS.

## Como rodar

### Atalho (Windows) — `iniciar.bat` / `finalizar.bat`

Na pasta `Dev/`, dê duplo clique em **`iniciar.bat`**: na primeira execução ele cria o
`.venv`, instala as dependências (backend + ETL + npm) e gera os agregados; depois sobe
API e frontend em janelas separadas e abre o navegador. Para encerrar, rode
**`finalizar.bat`** (derruba os processos nas portas 8000 e 5173).

Os passos manuais abaixo continuam válidos para desenvolvimento.

### 1. Backend (porta 8000)

```powershell
cd Dev/backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# runtime da API
pip install -r requirements.txt

# ETL (só na primeira vez ou para regenerar os agregados) — pandas fica isolado aqui
pip install -r requirements-etl.txt
python -m app.etl.build_aggregates      # lê ../../Bases de dados/dadoscreche-main/

uvicorn app.main:app --reload           # http://localhost:8000/docs
```

> Os agregados JSON já vêm versionados em `app/data/`. O passo de ETL só é necessário
> para regenerá-los a partir das bases brutas.

### 2. Frontend (porta 5173)

```powershell
cd Dev/frontend
npm install
copy .env.example .env.local            # opcional; em dev o proxy do Vite já resolve
npm run dev                             # http://localhost:5173
```

O Vite faz proxy de `/api` e `/health` para `localhost:8000` em desenvolvimento.
Em produção, defina `VITE_API_BASE_URL` no build.

## Testes e qualidade

```powershell
# backend
cd Dev/backend
.\.venv\Scripts\python -m pytest        # testes de fumaça da API
.\.venv\Scripts\python -m ruff check app tests

# frontend
cd Dev/frontend
npm run typecheck
npm run lint
npm run build
```

## Princípio inegociável

Nenhum indicador é inventado. Todo número exibido é calculado a partir do recorte real
da base anonimizada. Dados absolutos não representam a realidade em escala — apenas os
padrões relativos. Nenhum dado pessoal é coletado, armazenado ou exibido.
