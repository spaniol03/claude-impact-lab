# Mapeamento do site matricula.rio

> Levantamento feito em **30/08/2026** por inspeção do HTML/JS público (sem login, sem envio de
> formulários). O site é o portal de **Inscrição da Matrícula** da Secretaria Municipal de
> Educação do Rio de Janeiro (SME-Rio) — ciclo **Matrícula 2026**.
> URL base: `https://matricula.rio/`

---

## 1. Visão geral

| Item | Valor |
|---|---|
| Finalidade | Inscrição on‑line de alunos novos (Educação Infantil – creche e pré‑escola, Ensino Fundamental, EJA, Educação Especial) na rede municipal |
| Título da página | `.:: Matrícula 2026 - Inscrições On-line ::.` |
| Operação | 24h/dia durante o período oficial de inscrições (calendário da Resolução de Matrícula) |
| Órgão | SME-Rio – Rua Afonso Cavalcanti, 455, Cidade Nova, CEP 20.211-110 |
| Canais de apoio | Unidade Escolar / CRE presencial; WhatsApp auto-atendimento `+55 21 99195-2121`; Portal 1746 |

### Stack técnica (identificada por assinaturas)

| Camada | Tecnologia | Evidência |
|---|---|---|
| Backend | **ASP.NET MVC** (.NET Framework) | cookie `ASP.NET_SessionId`; token `__RequestVerificationToken`; rotas `/{Controller}/{Action}`; página de erro `/Erro?aspxerrorpath=...`; pasta `App_Themes` |
| Proxy / balanceador | **F5 BIG-IP** | cookies `TS01ce2d38`, `TS7180a696027`, `f5_cspm`; header `Server` removido |
| Front-end | jQuery 3.3.1 / 3.4.0, Bootstrap 5.3.3, Bootstrap Icons 1.11.3, Font Awesome 4.7.0 | tags `<script>`/`<link>` |
| Plugins jQuery | `unobtrusive-ajax`, `autocomplete`, `preloaders`, `redirect`, `tablesorter` | `/Scripts/*` |
| Acessibilidade | **VLibras** (`vlibras.gov.br`), barra de acessibilidade "pojo-a11y" (tema iplanrio) | scripts externos |
| Analytics | **Google Analytics 4** — `G-TMRD5Q64DH` (via `googletagmanager.com`) | tag gtag |
| Consentimento de cookies | **CookieYes** | `script.min.js#cookie-law-info`, cookie `cookieyes-consent` |
| Tema visual | assets versionados: `App_Themes/v2025/` (há resquícios de `v2019`) | folhas de estilo |

### Cabeçalhos e cookies observados

- `Cache-Control: private` nas páginas dinâmicas; `X-Frame-Options: SAMEORIGIN` em `/Inscricao/Index`.
- **Não** foram observados `Strict-Transport-Security`, `Content-Security-Policy`, `X-Content-Type-Options` nas respostas testadas.
- HTTP é atendido; o site responde em HTTPS (TLS) normalmente.
- Cookies: `ASP.NET_SessionId` (HttpOnly, SameSite=Lax), `__RequestVerificationToken` (HttpOnly, anti-CSRF, só em `/Inscricao/Index`), `TS01ce2d38` (F5), `cookieyes-consent`, `_ga`/`_gid`/`_ga_*` (GA4).
- **Observação de conformidade:** a listagem de cookies do CookieYes menciona "O Wix define esse cookie" e "PubMatic" — textos genéricos do template do plugin; não há Wix nem PubMatic no site.

### robots.txt / sitemap.xml

- `GET /robots.txt` → **404**
- `GET /sitemap.xml` → **404**
- A página de erro do ASP.NET responde **HTTP 200** (soft-404) e redireciona para `/Erro?aspxerrorpath=<rota>`; portanto rota inexistente ≠ status 404.

---

## 2. Mapa de navegação

```
matricula.rio/  (Home / Home/Index)
│
├─ Menu principal
│   ├─ INSCRIÇÃO ................... âncora "#" (abre submenu / seção)
│   ├─ INSCREVA-SE AQUI! ........... /Home/TermoUso  → (aceite) → /Inscricao/Index
│   ├─ CONSULTA INSCRIÇÃO .......... /ConsultaInscricao
│   ├─ RESULTADO CRECHE ............ /ConsultaCreche
│   ├─ CALENDÁRIO .................. /Home/Calendario
│   ├─ CONSULTA CRECHES/ESCOLAS
│   │   POR REGIÃO ................. /EscolasEDI
│   ├─ INSCRIÇÃO COM INTERNET
│   │   GRATUITA .................. /LocalInternet
│   └─ AUTO-ATENDIMENTO ............ api.whatsapp.com/send?phone=5521991952121 (externo)
│
├─ Conteúdo da Home
│   ├─ Banner "Matrícula 2026" (imagem)
│   ├─ Imagem de calendário/datas (calendario-img5.png — datas ficam na imagem, não em texto)
│   └─ FAQ / Perguntas Frequentes (5 perguntas — ver §6)
│
├─ Rodapé
│   ├─ Redes SME: instagram.com/sme_carioca, facebook.com/smecariocarj, twitter.com/sme_carioca
│   ├─ Diário Oficial: doweb.rio.rj.gov.br/portal/visualizacoes/html/7681
│   ├─ Portal 1746: www.1746.rio
│   ├─ Imprensa SME: (21) 2976-2485 / 2498 — assessoriasme@rioeduca.net
│   └─ Links institucionais: prefeitura.rio, educacao.prefeitura.rio, transparencia.prefeitura.rio, carioca.rio
│
└─ /Erro  (página genérica de erro — "Menu")
```

---

## 3. Sitemap – rotas (controllers/actions ASP.NET MVC)

### 3.1 Páginas públicas navegáveis

| Rota | Método | Descrição | Content-Type |
|---|---|---|---|
| `/` · `/Home` · `/Home/Index` | GET | Home: menu, banner, FAQ, rodapé | text/html |
| `/Home/TermoUso` | GET | Termo de Uso + checkbox de aceite; porta de entrada da inscrição | text/html |
| `/Home/Calendario` | GET/POST | Calendário/cronograma da Matrícula 2026 (POST recebe `DataServidor`) | text/html |
| `/Inscricao/Index` | GET/POST | **Formulário/wizard completo de inscrição** (ver §4) | text/html |
| `/ConsultaInscricao` → `/ConsultaInscricao/Index` | GET/POST | Consulta da ficha de inscrição | text/html |
| `/ConsultaCreche` → `/ConsultaCreche/Index` | GET/POST | Consulta do resultado da creche (classificação) | text/html |
| `/EscolasEDI` → `/EscolasEDI/Index` | GET/POST | Relação de Creches, EDIs e Escolas por bairro | text/html |
| `/LocalInternet` → `/LocalInternet/Index` | GET/POST | Locais com internet gratuita para fazer a inscrição, por bairro | text/html |
| `/PesquisarVagasTicket/Index` | POST | Retomada de inscrição por "ticket"/GUID (form `formTiket` oculto na tela de inscrição) | text/html |
| `/Erro` (`?aspxerrorpath=`) | GET | Página de erro genérica | text/html |

### 3.2 Peculiaridade de roteamento

- `GET /Inscricao` (sem `/Index`) **não** cai no controller: retorna um arquivo **`text/css`** (~76 KB) — bundle de estilos servido pela rota estática, que "sombreia" o controller. A tela real é sempre `/Inscricao/Index`.
- Rotas testadas que **não existem** (redirecionam para `/Erro`): `/Calendario`, `/ResultadoCreche`, `/EscolasRegiao`, `/Escolas`, `/Consulta`, `/InscricaoPublica`, `/api`, `/swagger`, `/Home/FAQ`, `/Comprovante`.

### 3.3 Endpoints AJAX do controller `Inscricao` (usados pelo wizard)

Todos chamados via `POST` a partir de `/Scripts/Inscricao.js`:

| Endpoint | Função |
|---|---|
| `/Inscricao/ValidarCaptcha` | Valida o captcha antes de prosseguir |
| `/Inscricao/ValidarCalendario` | Verifica se a modalidade/série está com inscrição aberta no calendário |
| `/Inscricao/getMatricula` | Busca dados do aluno pela matrícula (rede municipal) |
| `/Inscricao/getPesquisaAluno` | Pesquisa aluno (nome/data) |
| `/Inscricao/ValidaCPFAlunoCreche` | Valida CPF do candidato a creche (obrigatório) |
| `/Inscricao/ValidarMovimentacaoOrigemAluno` | Regras de movimentação/transferência conforme escola de origem |
| `/Inscricao/GetMovimentacaoETransferencia` | Opções de movimentação/transferência |
| `/Inscricao/GetDadosSeriesOrigem` | Séries de origem do aluno |
| `/Inscricao/getInscricaoIrmao` / `/Inscricao/getMatriculaIrmao` | Vínculo com irmão já inscrito/matriculado (critério de prioridade) |
| `/Inscricao/GetEndereco` | Autocompletar endereço por CEP |
| `/Inscricao/GetEscolas` | Lista escolas/séries por bairro (até 6 opções de escola) |
| `/Inscricao/GetDadosEscolaPolos` | Dados de escola e polos |
| `/Inscricao/GetPolosDeficientes` | Polos de avaliação para candidatos com deficiência |
| `/Inscricao/GetPolosDefasados` | Polos de avaliação para alunos em distorção idade-série |
| `/Inscricao/GetBloqueiaAtivoGUID` / `/Inscricao/GetBloqueiaEscolaGUID` | Trava de reentrada / bloqueio por GUID de inscrição |
| `/Inscricao/ValidarCalendario` | (idem acima) |
| `/Inscricao/Finalizar` | Finaliza a inscrição e gera o comprovante/número |

Serviços externos referenciados no mesmo JS: `servicos.receita.fazenda.gov.br/Servicos/CPF/...` e
`gov.br/pt-br/servicos/inscrever-no-cpf` (orientação para tirar CPF; não é integração server-side).

### 3.4 Assets estáticos

- CSS: `/App_Themes/v2025/` → `normalize.css`, `fonts.css`, `StyleSheet.css`, `style.min.css`, `theme.min.css`, `style-geral.css`, `style-interno.css`, `style-footer.css`, `style-menu2.css`, `style-14062025.css`, `style-matricula-1..6.css`.
- JS: `/App_Themes/v2025/script/script.min.js`, `/Scripts/Inscricao.js`, `/Scripts/jquery-3.3.1.js`, `/Scripts/jquery.autocomplete.min.js`, `/Scripts/jquery.preloaders.js`, `/Scripts/jquery.redirect.js`, `/Scripts/jquery.unobtrusive-ajax.js`, `/Scripts/jquery.tablesorter.min.js`.
- Imagens: `/App_Themes/v2025/imagens/` → `Banner-Digital-Matrícula-2026.png`, `calendario-img5.png`, `Logo Matricual.png`, `logotipo-topo.png`, `RIOPREFEITURA-SME-horizontal-azul.png`, `logo-sme-rodape.png`, `logo-matricula-branco-rodape.png`, ícones de redes sociais, `icone-whatsapp-btn.png`, `do-pe.jpg`, `acessoainfo.png`.

---

## 4. Tela de Inscrição (`/Inscricao/Index`) — fluxo e campos

**Porta de entrada:** botão "INSCREVA-SE AQUI!" → `/Home/TermoUso` (checkbox de aceite + `DataServidor` oculto, POST para `/Home/Calendario`) → `/Inscricao/Index`.

Página única (~215 KB) com um wizard em passos controlado por JS. Dois `<form>`:
- `#idForm` → `POST /Inscricao/Index` (dados da inscrição)
- `#formTiket` (oculto) → `POST /PesquisarVagasTicket/Index` (retomar por ticket/GUID)

Anti-CSRF: campo `__RequestVerificationToken`. Campos `_wpnonce` / `_wp_http_referer` aparecem
(resquício de template; o ASP.NET usa o RequestVerificationToken).

### Blocos de campos identificados

| Bloco | Campos (nomes) |
|---|---|
| Contexto/calendário (hidden) | `Id_Calendario`, `Id_Calendario_Aval_Deficiente`, `Id_Calendario_Aval_Defasado`, `Id_Calendario_Teste_Fisico_GEO`, `Id_Calendario_LEI`, `Id_Tipo_Aluno`, `TipoVaga`, `statusAluno`, `GUID_inscricao`, `DataServidor`, `id_escola_atualSGA`, `CPFReceita` |
| Aluno já na rede | `matricula`, `matriculaTransferencia`, `Id_MovimentacaoOrigem`, `Id_SerieAtributo`, `id_fazer_inscricao_continua` |
| Deficiência do candidato | `is_deficiente` (sim/não), `ListaTipoDeficienciaSelecionada` (11 tipos) |
| Perfis especiais | `is_GEO` (ginásio experimental/olímpico), `is_SESSENTAANOS`, `is_MaeAdolescente` + `nome_mae_adolescente`, `dat_nascim_mae_adolescente` |
| Deficiência do responsável | `is_deficienteresponsavel`, `ListaTipoDeficienciaResponsavelSelecionada` (11 tipos) |
| Identificação do candidato | `dat_nascim`, `CPF`, `CPFValidado`, `cpg`/`cpfnaoconsta`, `nome`, `sexo`, `nom_mae`, `nom_pai`, `Filiacao1NaoExistente`, `dat_nascim_filiacao1`, `Filiacao2NaoExistente` |
| Nacionalidade | `TipoNacionalidade`, `Id_Nacionalidade`, `UF`, `Naturalidade`, `Refugiado` |
| Irmão / gemelaridade | `ind_possui_irmao`, `num_inscr_irmao`, `id_inscr_irmao`, `id_irmao_gemeo` |
| Responsável / contato | `tipo_responsavel`, `nome_responsavel`, `CpfResponsavel`, `ddd_fone_responsavel`, `num_fone_responsavel`, `ddd_cel_responsavel`, `num_cel_responsavel`, `email_inscr`, `NIS` |
| Endereço | `CEP`, `Id_EnderecoCEP`, `logradouro_endereco`, `NumeroEndereco`, `ComplementoEndereco`, `bairro_endereco`, `cidade_endereco`, `uf_endereco` |
| Questionário imediato | `pergunta_imediata_0` / `RespostaQuestionarioImediata` |
| Questionário de creche | `pergunta_creche_0..13` / `RespostaQuestionarioCreche` (critérios socioeconômicos de prioridade) |
| Escolha de vagas | `Id_EscolaSerie` + `ddlBairrosEscola` e réplicas `Id_EscolaSerie1..5` + `ddlBairrosEscola1..5` (até 6 opções) |
| Vínculos por opção de escola | `participou_lista_creche{n}`, `ind_irmao_escola{n}` + `cod_aluno_irmao_escola{n}`, `ind_resp_aluno_escola{n}` + `cod_aluno_responsavel_escola{n}` |
| Polos de avaliação | `Id_PoloAvaliacaoDeficiente` + `ddlBairrosPoloDeficiente`, `Id_PoloAvaliacaoDefasado` + `ddlBairrosPoloDefasado` |
| Botões | `pesquisar`, `voltar`, `enviarFormX`, `alterar`, `cancelar`, `finalizar` |

### Passos (inferidos pela ordem dos blocos + endpoints)

1. Aceite do Termo de Uso.
2. Captcha (`ValidarCaptcha`) + data de nascimento → `ValidarCalendario` define modalidade/série e se a inscrição está aberta.
3. Aluno da rede? → `getMatricula` / `ValidarMovimentacaoOrigemAluno` / `GetDadosSeriesOrigem`.
4. Dados do candidato (CPF obrigatório p/ creche → `ValidaCPFAlunoCreche`), filiação, nacionalidade.
5. Perfis especiais (deficiência, GEO, mãe adolescente, 60+) e polos de avaliação (`GetPolosDeficientes` / `GetPolosDefasados`).
6. Responsável, contato, NIS.
7. Endereço (`GetEndereco` por CEP).
8. Questionário de creche / questionário imediato (critérios de prioridade).
9. Escolha de até 6 escolas por bairro (`GetEscolas` / `GetDadosEscolaPolos`) + vínculos (irmão/responsável).
10. Revisão → `Finalizar` → comprovante com número de inscrição.

---

## 5. Telas de consulta e listagem

### `/ConsultaInscricao` — "Consulta Ficha de Inscrição"
- `POST /ConsultaInscricao/Index`.
- Campos: `inscricaoDoCandidato`, `dat_nascim`, `nomeDoCandidato`, `temCandidatoFiliacao` (radio Consta/Não consta), `filiacaoCandidato`, `DataServidor`.
- Regra exibida: informar **Nº da Inscrição + Data de Nascimento** OU **Nome + Data de Nascimento + Nome da Filiação**.

### `/ConsultaCreche` — "Consulta Resultado Creche"
- `POST /ConsultaCreche/Index`.
- Mesmos campos da consulta de inscrição (`inscricaoDoCandidato`, `dat_nascim`, `nomeDoCandidato`, `temCandidatoFiliacao`, `filiacaoCandidato`).
- Mostra o resultado do processo classificatório da creche.

### `/EscolasEDI` — "Relação de Creches, EDIs e Escolas"
- `POST /EscolasEDI/Index`; `<select name="Id_Bairro">` dispara `form.submit()` on-change; resultado ordenável (`tablesorter`).
- Colunas: Designação, Nome, Endereço, Referência, Bairro, Polo.
- Dropdown com **~160 bairros** do município do Rio (valores numéricos `Id_Bairro`, ex.: `20`=Botafogo, `24`=Copacabana, `128`=Barra da Tijuca, `144`=Campo Grande…).
- Campo oculto `Id_EscolaSerie`.

### `/LocalInternet` — "Lista Locais de Internet Gratuita"
- `POST /LocalInternet/Index`; mesmo padrão de `<select name="Id_Bairro">` + submit.
- Colunas: Designação, Nome, Endereço, Referência, Bairro.

### `/Home/Calendario` — "Calendário"
- Página com o banner "Matrícula 2026" e o cronograma. As **datas específicas de cada etapa
  estão renderizadas em imagem** (`calendario-img5.png` / `Banner-Digital-Matrícula-2026.png`),
  não em texto — não foi possível extrair as datas por scraping de texto.

---

## 6. Fluxo de dados / privacidade (LGPD)

### Dados pessoais coletados no formulário de inscrição
- **Do candidato:** nome, data de nascimento, sexo, CPF, nacionalidade/naturalidade/UF, condição de refugiado, deficiência (tipo), filiação (nomes de pai/mãe e datas), vínculo com irmão.
- **Do responsável:** nome, CPF, tipo de vínculo, telefone fixo e celular, e-mail, **NIS**, deficiência (tipo), condição de mãe adolescente, 60+.
- **Endereço** completo (CEP, logradouro, número, complemento, bairro, cidade, UF).
- **Respostas de questionário socioeconômico** (creche/imediato) — base dos critérios de prioridade.
- Metadados: `DataServidor`, `GUID_inscricao`, IP/sessão (ASP.NET), GA4.

### Base legal declarada no Termo de Uso
- Lei 13.709/2018 (LGPD), Lei 12.527/2011 (LAI), Lei 12.965/2014 (Marco Civil), Lei 13.460/2017 (usuários de serviços públicos).
- Responsabilidade do usuário: veracidade dos dados, sigilo de credenciais.
- Compartilhamento: mediante ordem judicial ou investigação de ilícito/ameaça ao sistema.
- Classificação de vaga em creche: **processo classificatório por critérios de prioridade** (não sorteio, não ordem de inscrição); critérios não comprovados são desconsiderados. Detalhes na **Resolução de Matrícula** e no **Diário Oficial**.

### Integrações / terceiros
| Terceiro | Uso |
|---|---|
| Google Analytics 4 (`G-TMRD5Q64DH`) | métricas de uso |
| Google Tag Manager | carregamento do gtag |
| VLibras (gov.br) | tradução Libras |
| CookieYes | banner de consentimento |
| CDNs: `ajax.googleapis.com`, `cdn.jsdelivr.net`, `cdnjs.cloudflare.com` | jQuery, Bootstrap, ícones |
| `iplanrio.prefeitura.rio` | tema/JS da barra de acessibilidade e rodapé institucional |
| Receita Federal / gov.br | links externos de orientação sobre CPF |
| WhatsApp (`5521991952121`) | auto-atendimento |
| Sistemas internos referenciados | `SGA` (aluno ativo), `SICI` (estrutura da prefeitura), `SGE`-like séries/escolas |

---

## 7. FAQ da Home (texto integral)

**1. Posso ir até a CRE ou diretamente à escola, uma vez que não encontrei a vaga no site?**
Sim. No entanto, durante o período de inscrições, todo o trâmite precisa ser feito pelo site
matricula.rio. Se o responsável não tiver acesso à Internet, ele pode buscar auxílio presencial
em uma Unidade Escolar próxima ou na Coordenadoria Regional de Educação (CRE) da sua região.

**2. Qual será o horário de funcionamento do site matricula.rio?**
O site matricula.rio funciona 24 horas por dia, todos os dias (inclusive sábados, domingos e
feriados) durante o período de inscrições, conforme o calendário oficial.

**3. Quem não tiver Internet, como fazer para acessar o site?**
O responsável pode procurar atendimento presencial em uma escola municipal próxima ou na
Coordenadoria Regional de Educação (CRE) de sua região para obter ajuda.

**4. Como será feita a distribuição das vagas nas creches públicas municipais?**
A distribuição é realizada por processo classificatório que considera diversos critérios de
prioridade — não é sorteio nem por ordem de inscrição. As prioridades e pontuações completas
estão descritas no site Matrícula.Rio e no Diário Oficial do Rio.

**5. O que acontece quando o responsável que solicita vaga em creche não consegue comprovar um
ou mais itens dos critérios de prioridade?**
Os critérios de prioridade não comprovados serão desconsiderados no processo de classificação.
Consulte os critérios previstos na Resolução de matrícula.

---

## 8. Links externos citados no site

| Destino | URL |
|---|---|
| Prefeitura do Rio | https://prefeitura.rio/ |
| SME – Educação | https://educacao.prefeitura.rio/ |
| Transparência Rio | https://transparencia.prefeitura.rio/ |
| Carioca Digital | https://carioca.rio/ |
| Portal 1746 | https://www.1746.rio/ |
| Diário Oficial (DO Rio) | https://doweb.rio.rj.gov.br/portal/visualizacoes/html/7681/ |
| Estrutura da Prefeitura (SICI) | http://sici.rio.rj.gov.br/PAG/principal.aspx |
| WhatsApp auto-atendimento | https://api.whatsapp.com/send/?phone=5521991952121 |
| Instagram SME | https://www.instagram.com/sme_carioca/ |
| Facebook SME | https://www.facebook.com/smecariocarj/ |
| Twitter/X SME | https://www.twitter.com/sme_carioca/ |
| Receita – inscrição no CPF | https://www.gov.br/pt-br/servicos/inscrever-no-cpf |

---

## 9. Limitações deste mapeamento

- Feito **sem autenticação e sem submeter formulários** — telas de resultado (comprovante,
  classificação, listas de escolas preenchidas) não foram exercidas; os campos vêm da estrutura HTML/JS.
- O ASP.NET responde **200 + página de erro** para rotas inválidas; a existência de rotas foi
  inferida por ausência de redirecionamento para `/Erro`. Pode haver actions internas (só POST/AJAX)
  não listadas.
- **Datas do calendário 2026** estão em imagem — não capturadas como texto. Ver `calendario-img5.png`
  e `Banner-Digital-Matrícula-2026.png`, ou a Resolução de Matrícula no Diário Oficial.
- Conteúdo sujeito a mudança a cada ciclo de matrícula (tema `App_Themes/v2025`).
