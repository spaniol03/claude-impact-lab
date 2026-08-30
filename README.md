# Hackeamento para Otimização da Classificação das Vagas nas Escolas

**Claude Impact Lab 2026 · Desafio VTEX / Prefeitura do Rio — Secretaria Municipal de Educação (SME)**

## 👥 Equipe nº 16

- Daniel Almeida
- Marco Aurélio Alencastro
- Anna Bruzaca
- Vanessa Márcia de Paula

---

## 💡 Resumo

Este projeto propõe uma solução para **otimizar a distribuição de vagas em creches** da
rede municipal do Rio, reduzindo o tempo de espera das famílias e o número de vagas
ociosas — **sem alterar o `matricula.rio` e sem substituir os critérios oficiais de
classificação e vulnerabilidade**.

No processo atual cada criança seleciona até **5 unidades de preferência** e a fila é
resolvida unidade por unidade, de forma isolada. Uma mesma criança ocupa várias filas ao
mesmo tempo enquanto aguarda convocação: algumas creches ficam afogadas em fila enquanto
vagas já livres em outras esperam dias para serem preenchidas.

A proposta adiciona uma **camada de apoio à decisão entre a inscrição e a convocação**,
com duas frentes:

1. **Frente família** — no momento da inscrição, mostrar a concorrência histórica de cada
   creche (faixa baixa / média / alta + marca de "muito concorrida") para a família montar
   um conjunto de opções mais equilibrado. Nenhuma opção é proibida.
2. **Frente servidor** — para o servidor SME/CRE, cruzar classificação × preferência ×
   vagas e indicar **quais reservas liberar e para quem**, encurtando a fila de terceiros.

### Fluxo conceitual

```text
Famílias realizam a inscrição
            ↓
Selecionam até 5 unidades  ──►  veem a concorrência de cada creche (Frente família)
            ↓
Preferências + Classificação oficial + Vagas disponíveis
            ↓
Cruzamento classificação × preferência (Frente servidor)
            ↓
Reservas travadas são liberadas mais rápido
            ↓
Próximas famílias avançam
```

---

## 🗂️ Estrutura do repositório

```text
claude-impact-lab/
├── README.md                     ← este arquivo (visão geral do projeto)
├── LICENSE                        ← MIT
│
├── Dev/                           ← A APLICAÇÃO (protótipo funcional) — ver Dev/README.md
│   ├── README.md                     documentação técnica da aplicação
│   ├── iniciar.bat / finalizar.bat   atalhos Windows (sobem/derrubam API + frontend)
│   ├── backend/                       API FastAPI (Python) — agregados + banco de inscrições
│   └── frontend/                      SPA React + TypeScript + Vite
│
├── Docs/                          ← DIAGNÓSTICO, REQUISITOS E PROTÓTIPOS
│   ├── diagnostico_solucao.md            dores priorizadas + solução recomendada (ref. principal)
│   ├── prb_creche.md / .html             Product Requirements Brief do problema
│   ├── comparativo_rankeamento_escolas.md  medição A/B do efeito do "rankeamento de escolas"
│   ├── plano_mvp_hackathon.md            roadmap de execução do MVP (sem código)
│   ├── stack_tecnologica.md              decisão de stack e arquitetura
│   ├── guia_bases.html                   guia de leitura das bases de dados
│   ├── mock_matricula_mobile.html        protótipo navegável do fluxo mobile de inscrição
│   ├── Otimizador_Inteligente_..._Creches.pdf   proposta original recebida
│   ├── Gravação de Tela 2026-08-30 ....mov      walkthrough do protótipo
│   └── WhatsApp .../                     fotos da apresentação do desafio (evento VTEX)
│
├── Analise_site/                  ← ENGENHARIA REVERSA DO matricula.rio
│   ├── mapeamento-matricula-rio.md       telas, campos e fluxos do portal oficial
│   └── analise-ux-qa-identidade-matricula-rio.md   UX / QA / front-end / identidade visual
│
├── Bases de dados/               ← DADOS DO DESAFIO (anonimizados, fornecidos pela SME)
│   └── dadoscreche-main/
│       ├── Bases IC_ ClassificadoseFila/   Query A/B/C + unidades escolares + dicionário
│       ├── OferecimentosEvagas/            oferta de vagas e parceiras 2021–2025
│       ├── Microáreas_SME_revisãoIPP/      shapefile de microáreas
│       └── README.md                       descrição e acesso rápido aos dados
│
└── mock_matricula_mobile_acessibilidadefinalizada/
    └── mock_matricula_mobile.html   versão do mock com a passada de acessibilidade concluída
```

---

## 🤖 Onde o Claude entra

**Durante a construção.** O Claude foi a ferramenta de trabalho para transformar o briefing
e as bases em produto: análise dos dados anonimizados, redação do diagnóstico e do PRB,
definição dos fluxos, engenharia reversa do `matricula.rio`, prototipação da interface e
implementação do backend e do frontend em `Dev/`.

**Dentro da aplicação.** O protótipo **não faz chamadas à API do Claude em runtime**. Toda
a inteligência exibida é determinística e reproduzível a partir do recorte real da base:
os agregados de concorrência vêm de um ETL sobre as Queries A/B/C, o autofill "comece pelo
CPF" é uma simulação estável por CPF (sem integração com Receita Federal / RMI) e a jornada
por áudio segue um roteiro fixo. A jornada por áudio usa o **reconhecimento de voz do
navegador** (Web Speech API) e uma **voz de leitura** (TTS StreamElements, com fallback para
o `speechSynthesis` local) — recursos de acessibilidade que rodam no cliente, sem enviar
dados a um serviço próprio. Isso mantém o **princípio inegociável**: nenhum indicador é
inventado e nenhum dado pessoal real é coletado, armazenado ou exibido.

---

## 🚀 A aplicação (`Dev/`)

SPA **React + TypeScript + Vite** conversando por HTTP com uma **API FastAPI**. Frontend e
backend são desacoplados: o único contrato é o JSON da API. Identidade visual "Matrícula
Carioca" (Poppins, azul institucional único `#034C7F`, mobile-first), derivada de
[`Docs/mock_matricula_mobile.html`](Docs/mock_matricula_mobile.html).

### Telas (rotas do frontend)

| Rota | Público | O que faz |
|---|---|---|
| `/` | Todos | **Diagnóstico** com os números medidos na base, por ano de processo |
| `/inscricao` | Família | **Inscrição na creche** em 5 passos: Início (+ **inscrição por voz** — assistente que fala e ouve, para acessibilidade) → Termo → **CPF primeiro** (autofill simulado) → Situação social + questionário → Escolha das creches (sugestão por bairro, busca, faixa de concorrência baixa/média/alta, ordenação ▲▼) → Revisão → Comprovante. Progresso fino, CTA fixo, rascunho no navegador |
| `/concorrencia` | Família | **Escolas por região** — consulta pública da concorrência das creches |
| `/consulta` | Família | Retomar / ver um comprovante pelo número do protocolo |
| `/painel-servidor` | Servidor SME/CRE | Motor de cruzamento classificação × preferência: quais reservas liberar e para quem + inscrições recebidas |
| `/sobre` | Todos | Arquitetura e recorte de dados |

### Endpoints da API (`/api/v1`)

| Método | Rota | Para quê |
|---|---|---|
| `GET` | `/meta`, `/anos` | metadados do recorte |
| `GET` | `/overview?ano=` | agregados do diagnóstico |
| `GET` | `/unidades`, `/unidades/{codigo}` | concorrência por unidade (filtro por busca / faixa) |
| `GET` | `/inscricao/avaliar?unidades=` | avalia um conjunto de até 5 opções |
| `GET` | `/liberacao?ano=` | reservas travadas e candidatos a promover (Frente servidor) |
| `GET` | `/inscricao/formulario` | referência para montar o formulário (UFs, países, questionário) |
| `GET` | `/inscricao/pre-preenchimento?cpf=` | dados **determinísticos pelo CPF** (simulação Receita/RMI) |
| `POST` | `/inscricoes` | valida o formulário completo, **grava no banco** e devolve o comprovante |
| `GET` | `/inscricoes` | lista as inscrições recebidas (Painel do servidor) |
| `GET` | `/inscricoes/{protocolo}` | recupera uma inscrição (tela "Consultar inscrição") |

### Estrutura de `Dev/`

```text
Dev/
├── backend/                       FastAPI · ambiente isolado em .venv
│   ├── app/
│   │   ├── main.py                    monta a app + CORS
│   │   ├── config.py                  Settings (prefixo CIV_, sem segredos)
│   │   ├── api/routes.py              endpoints /api/v1/*
│   │   ├── db.py                      engine SQLAlchemy + sessão
│   │   ├── models/                    schemas.py (contrato JSON) · inscricao.py (payload/ORM)
│   │   ├── services/                  repository (agregados) · inscricao_sim · inscricoes_repo · validacao
│   │   ├── etl/                       build_aggregates.py + sources.py (pandas, deps à parte)
│   │   └── data/                      agregados *.json (versionados) · inscricoes.db (NÃO versionado)
│   ├── tests/                         testes de fumaça da API (pytest)
│   └── requirements*.txt              runtime · etl · dev · lock
└── frontend/                      React + TS + Vite
    └── src/
        ├── api/                       cliente fetch + tipos (espelham os schemas do backend)
        ├── components/                Layout, campos de formulário, UI (gráficos em SVG puro)
        ├── pages/                     VisaoGeral · Inscricao · Concorrencia · Consulta · PainelServidor · Sobre
        │   └── inscricao/             passos do wizard: Home · Termo · Identificacao · Social · Escolas · Revisao · Comprovante · Audio
        ├── forms/                     schema · passos · validação · storage (rascunho no localStorage)
        ├── hooks/                     useApi · useWizard
        └── styles/                    tokens.css + global.css (identidade "Matrícula Carioca")
```

### Onde os dados ficam

| O quê | Onde | Persiste? |
|---|---|---|
| Rascunho da inscrição | `localStorage` do navegador | só naquele dispositivo |
| Inscrição enviada | banco do backend — SQLite `backend/app/data/inscricoes.db` por padrão | sim, no servidor |
| Cópia do comprovante | `localStorage` | só naquele dispositivo |

O SQLite é um arquivo, sem servidor e **sem credenciais**; guarda dados de teste, então
**não é versionado**. Em produção, `CIV_DB_URL` aponta para um Postgres da TI da Prefeitura,
com controle de acesso e retenção conforme a LGPD.

---

## 🛠️ Como rodar

### Atalho (Windows)

Na pasta `Dev/`, execute **`iniciar.bat`**: na primeira vez cria o `.venv`, instala as
dependências (backend + ETL + npm) e gera os agregados; depois sobe API e frontend em
janelas separadas e abre o navegador. Para encerrar, rode **`finalizar.bat`** (derruba as
portas 8000 e 5173).

### Manual

```powershell
# 1. Backend (porta 8000)
cd Dev/backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
pip install -r requirements-etl.txt          # só na 1ª vez / para regenerar agregados
python -m app.etl.build_aggregates           # lê ../../Bases de dados/dadoscreche-main/
uvicorn app.main:app --reload                # http://localhost:8000/docs

# 2. Frontend (porta 5173)
cd Dev/frontend
npm install
npm run dev                                  # http://localhost:5173 (proxy /api → 8000)
```

Os agregados JSON já vêm versionados em `backend/app/data/` — o ETL só é necessário para
regenerá-los a partir das bases brutas. Em produção, defina `VITE_API_BASE_URL` no build.

### Testes e qualidade

```powershell
# backend
cd Dev/backend
.\.venv\Scripts\python -m pytest
.\.venv\Scripts\python -m ruff check app tests

# frontend
cd Dev/frontend
npm run typecheck
npm run lint
npm run build
```

---

## 🔗 Links

- **Aplicação:** _[adicionar URL do deploy]_
- **Repositório:** <https://github.com/spaniol03/claude-impact-lab>
- **Vídeo demo:** _[adicionar link]_ · walkthrough local em [`Docs/`](Docs/) (`Gravação de Tela 2026-08-30 ....mov`)

---

## 🧭 Princípio inegociável

Nenhum indicador é inventado. Todo número exibido é calculado a partir do recorte real da
base anonimizada — dados absolutos não representam a realidade em escala, apenas os padrões
relativos. Nenhum dado pessoal é coletado, armazenado ou exibido.

## 🚧 Status

**Em desenvolvimento.** A interface e as funcionalidades representam a primeira versão da
solução e podem evoluir. Licença [MIT](LICENSE).
