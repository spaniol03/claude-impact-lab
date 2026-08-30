# matricula.rio — Análise de UX, QA, Front-end e Identidade Visual

> Companion do documento [`mapeamento-matricula-rio.md`](mapeamento-matricula-rio.md).
> Levantamento feito em **30/08/2026** por inspeção do HTML/CSS/JS público (sem login, **sem submeter
> formulários**). Portal de Inscrição da Matrícula da SME-Rio — ciclo **Matrícula 2026**.
> URL base: `https://matricula.rio/`
>
> As três "vozes" (Web Developer, QA, UX) são seções distintas. A identidade visual está na §4.
> Onde a análise é inferência (e não fato observado), o texto diz "provável/indício".

---

## 0. Resumo executivo

**O que o site é.** Uma aplicação **ASP.NET MVC server-rendered** com uma única tela pesada
(`/Inscricao/Index`, ~215 KB de HTML) que simula um assistente ("wizard") de 6–8 passos
**mostrando e ocultando `<div>`s** via jQuery. Ao redor dela há 6 telas satélite de consulta e
listagem, todas seguindo o mesmo padrão: `<select>` de bairro que dá `form.submit()` e recarrega a
página inteira. Não há SPA, não há API pública, não há estado no cliente além de campos ocultos.

**Estado geral (nota subjetiva por área):**

| Área | Avaliação | Síntese |
|---|---|---|
| Arquitetura de front-end | ⚠️ Regular | Funciona, mas é frágil: 1 formulário gigante, validação toda em JS de 147 KB, sem build, 3 gerações de CSS coexistindo |
| QA / robustez | ⚠️ Regular | Soft-404, captcha desativado no cliente, dependência síncrona da Receita Federal, sem cabeçalhos de segurança |
| UX / usabilidade | 🔴 Frágil | Formulário longo sem barra de progresso, datas do calendário só em imagem, linguagem jurídica, erros por `alert()` nativo |
| Acessibilidade | 🔴 Frágil | `alt` ausente/genérico, zero ARIA, informação crítica em imagem, contraste não garantido, barra "pojo-a11y" é paliativo |
| Identidade visual | 🔴 Inconsistente | 3+ sistemas tipográficos e ~10 tons de azul quase-iguais sem design tokens; assets versionados `v2019`/`v2025` misturados |

---

## 1. Visão do Web Developer — como o site funciona

### 1.1 Modelo de execução

- **Renderização no servidor.** Cada tela é uma *view* Razor entregue como HTML completo. Navegar =
  novo GET. Filtrar uma lista = POST + página inteira de volta (nada de `fetch`/XHR parcial nas
  telas de consulta).
- **Camada AJAX só existe no formulário de inscrição.** `Scripts/Inscricao.js` (147 KB, não
  minificado) faz `$.ajax` para ~15 *actions* do controller `Inscricao` para preencher selects,
  validar CPF, buscar CEP, etc. (lista completa no doc de mapeamento §3.3).
- **Proteção CSRF** via `__RequestVerificationToken` (só em `/Inscricao/Index`). Convivendo com
  campos `_wpnonce` e `_wp_http_referer` — **resquício de template WordPress** que não faz nada aqui.
- **Sessão** em cookie `ASP.NET_SessionId` (HttpOnly, SameSite=Lax). O progresso do wizard mora na
  sessão do servidor + campos ocultos (`GUID_inscricao`, `Id_Calendario`, `DataServidor`…), não no
  navegador. Fechar a aba no meio = perder tudo (ver QA §2.4).

### 1.2 O "wizard" real

Não são páginas nem passos de verdade: é **um `<form id="idForm">`** com blocos `<div>`/`<fieldset>`
alternados pela função `ShowHide()`. Sequência de blocos e botões que avançam (do `Inscricao.js`):

| # | Bloco (`id`) | Botão que valida e avança | O que acontece |
|---|---|---|---|
| 1 | `#divInicio` | `btnValidar...` (origem + nascimento) | `ValidarCalendario` decide modalidade/série e **se a inscrição está aberta** |
| 2 | `#divInscricao` | `btnValidarNome` | Identificação do candidato; se for da rede → `getMatricula`; creche → `ValidaCPFAlunoCreche` (Receita) |
| 3 | `#div-filiacao` | `btnValidarResponsavel` | Responsável, contatos, NIS, vínculo com irmão |
| 4 | `#div-endereco` | (CEP dispara `GetEndereco`) | Endereço; nº obrigatório, resto autopreenchido |
| 5 | `#div-questionario` / `#div-questionarioimediata` | `btnValidarCreche` | Questionário socioeconômico (até 14 perguntas Sim/Não) |
| 6 | `#fieldPoloDeficiente` / `#fieldPoloDefasado` | — | Só aparecem se `Tipo_Avaliacao` ≠ `SemAvaliacao` |
| 7 | `#fieldEscolaImediata` / `#fieldEscolaAlocacao` | `btnContinuarEscolas` | Até 6 escolas por bairro (`GetEscolas`) + vínculos irmão/responsável por opção |
| 8 | Revisão | `finalizar` → `Finalizar` | Gera comprovante com nº de inscrição |

**Implicações técnicas:**
- O DOM carrega **todos os blocos de uma vez** (candidato + creche + EJA + 60+ + polos + 6 escolas).
  Daí os ~215 KB. Campos irrelevantes existem escondidos e são zerados por JS.
- Sem histórico de navegador por passo: o botão "voltar" do browser sai do formulário inteiro.
- A ordem/visibilidade é decidida por dezenas de flags vindas do servidor
  (`PermitirDeficiente`, `PermitirDefasado`, `SeriesCPFObrigatorio`, `Tipo_Avaliacao`…). Toda a
  regra de negócio de elegibilidade está espalhada entre o controller e o JS.

### 1.3 Validação client-side (do `Inscricao.js`)

- **CPF**: dígitos verificadores + rejeita sequências repetidas. Duas funções (`ValidarCPF`,
  `ValidarCPFAluno`).
- **CPF do candidato a creche**: validado **online contra a Receita Federal** — retorna status
  1 (ok), 2 (não encontrado), 3 (data divergente), 4 (indisponível), 5 (inscrição duplicada),
  6 (RUC com problema).
- **Data de nascimento**: máscara `dd/mm/aaaa`, regex própria, teto de 120 anos, aviso "acima de
  80 anos" — resíduos de formulário genérico (EJA / vaga 60+) reaproveitado para creche.
- **NIS**: dígito verificador (mód. 11). **E-mail / telefone / celular**: regex + tabela de DDDs
  válidos; telefone 8 díg. começando 2–5, celular 9 díg. começando 7–9.
- **Nome do responsável**: sem caracteres especiais, "não podem existir mais do que quatro letras
  repetidas".
- **Regra de igualdade**: "O CPF do candidato não pode ser igual ao CPF do responsável".

### 1.4 Estados de carregamento

`blockWindow()` / `unblockWindow()` cobrem a tela com `#divIMG` (spinner) + classe `windowBlock`
durante cada AJAX. É o único feedback de progresso. Não há *skeleton*, *toast* ou barra.

### 1.5 Captcha

O endpoint `/Inscricao/ValidarCaptcha` existe, mas **a chamada está comentada no cliente**:

```js
// var validado = ValidaCaptcha();
// return validado;
```

Ou seja: hoje o fluxo depende de o backend ainda exigir captcha, ou o site está **sem proteção
anti-bot no envio**. Ver QA §2.2 (D3) e §2.6.

### 1.6 Travas de reentrada

- `GUID_inscricao` acompanha a inscrição; `GetBloqueiaAtivoGUID` / `GetBloqueiaEscolaGUID` barram
  reabertura.
- Retomada por **ticket/GUID**: `<form id="formTiket">` oculto → `POST /PesquisarVagasTicket/Index`.
- "Já existe uma inscrição válida para esse CPF!" barra duplicidade por CPF do candidato.
- Confirmações críticas usam `confirm()` nativo (`"Dados corretos? Caso encontre erros pressione
  CANCELAR..."`).

### 1.7 Assets e build

- **Sem pipeline de build**: jQuery 3.3.1 **e** 3.4.0 carregados, Bootstrap 5.3.3 + Bootstrap Icons
  + Font Awesome **4.7.0** (2016), plugins jQuery soltos (`autocomplete`, `preloaders`, `redirect`,
  `tablesorter`, `unobtrusive-ajax`).
- **CSS**: ~18 folhas separadas em `/App_Themes/v2025/`, incluindo `style-matricula-1..6.css` e
  `style-14062025.css` (nome = data de patch). Referências a `v2019/imagens/lupaVerde.png` ainda
  vivas dentro da tela de inscrição.
- **Fontes**: `fonts.css` com **16 `@font-face` da família Gotham**, servindo `.eot`/`.svg`
  (suporte a IE8/navegadores de 2012).
- Sem `robots.txt`, sem `sitemap.xml` (404 nos dois).

### 1.8 Pontos frágeis (dev)

1. Um formulário monolítico de ~215 KB com regra de negócio duplicada servidor/cliente.
2. `Inscricao.js` de 147 KB sem minificação nem *sourcemap* — difícil manter.
3. Dependência **síncrona e bloqueante** de serviço externo (Receita Federal) no caminho crítico.
4. Duas versões de jQuery = risco de conflito e peso dobrado.
5. Três+ gerações de tema misturadas (`v2019`, `v2025`, tema "secretarias/iplanrio", tema legado
   Helvetica/Patua One).
6. Rotas inexistentes respondem **HTTP 200** (soft-404) → quebra monitoração e SEO.
7. Nome de arquivo com erro de digitação em produção: `Logo Matricual.png`.

---

## 2. Visão do QA — comportamento, riscos e casos de teste

### 2.1 Mapa de fluxos testáveis

| Fluxo | Entrada | Saída esperada | Observação |
|---|---|---|---|
| Home → Termo → Inscrição | aceitar termo | `/Inscricao/Index` | avanço do termo é só o checkbox "Li e concordo com o termo" — **sem botão explícito** |
| Inscrição completa (creche) | dados válidos | comprovante c/ nº | não exercido (sem submissão) |
| Retomar por ticket | GUID válido | volta ao ponto salvo | `formTiket` |
| Consulta ficha | nº + nascimento **ou** nome + nascimento + filiação | ficha | `/ConsultaInscricao` |
| Resultado creche | idem | classificação | `/ConsultaCreche` |
| Escolas por bairro | `Id_Bairro` | tabela ordenável | `/EscolasEDI` (~150–160 bairros) |
| Locais com internet | `Id_Bairro` | tabela | `/LocalInternet` |
| Rota inválida | qualquer | **200** + `/Erro?aspxerrorpath=` | **não** retorna 404 |

### 2.2 Defeitos e inconsistências observados (sem submeter formulário)

| # | Severidade | Achado | Evidência |
|---|---|---|---|
| D1 | Alta | **Datas do calendário 2026 só existem como imagem** (`calendario-img5.png`, alt "imagem do calendário"). Sem texto alternativo com as datas. | `/Home/Calendario` |
| D2 | Alta | **Soft-404**: rota inexistente → HTTP 200. Ferramentas de teste/monitoração não detectam link quebrado. | `/Calendario`, `/Escolas`, etc. |
| D3 | Alta | **Captcha desabilitado no cliente** (código comentado). | `Inscricao.js` |
| D4 | Média | **Sem cabeçalhos de segurança**: sem `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options`. | headers de resposta |
| D5 | Média | **Ponto único de falha externo**: `ValidaCPFAlunoCreche` depende da Receita ("Receita Federal indisponível. Aguarde alguns minutos e tente novamente!"). Se a Receita cai, ninguém de creche se inscreve. | `Inscricao.js` status 4 |
| D6 | Média | **Formulário genérico reaproveitado**: mensagens "A idade do candidato é acima de 80 anos", teto de 120 anos, campos de EJA/60+/GEO ocultos numa tela de creche. Risco de vazamento de campo errado. | `Inscricao.js` |
| D7 | Média | **CookieYes com texto de outro site**: lista "O Wix define esse cookie", "PubMatic" — não há Wix nem PubMatic. Informação de privacidade incorreta ao titular. | banner de cookies |
| D8 | Baixa | **Campos WordPress órfãos** (`_wpnonce`, `_wp_http_referer`) no form ASP.NET. | HTML `/Inscricao/Index` |
| D9 | Baixa | **Nome de asset com typo** em produção: `Logo Matricual.png`. | `<img>` da home |
| D10 | Baixa | **Duas versões de jQuery** carregadas (3.3.1 e 3.4.0). | `<script>` |
| D11 | Baixa | Termo de Uso diz "Versão 1.1 – maio de 2024" no ciclo 2026 — verificar se está atualizado. | `/Home/TermoUso` |
| D12 | Média | **Erros via `alert()`/`confirm()` nativos** — não são anunciados de forma consistente por leitores de tela, não têm foco gerenciado, e travam a UI. | `Inscricao.js` |

### 2.3 Cenários de teste recomendados (priorizados)

**Elegibilidade / calendário**
- Data de nascimento no limite de cada faixa etária de creche/pré-escola (borda inferior e superior).
- Modalidade com inscrição fechada no calendário → mensagem clara? Bloqueia avanço?
- Servidor com relógio adiantado/atrasado (`DataServidor`).

**CPF / Receita Federal**
- CPF válido não encontrado (status 2); data divergente (status 3); Receita fora do ar (status 4);
  CPF já com inscrição (status 5). Cada um deve dar mensagem acionável e **não** deixar o usuário preso.
- CPF do responsável = CPF do candidato → bloqueio.
- Candidato da rede sem CPF → modal de orientação aparece e o fluxo permite corrigir.

**Vínculos (irmão / responsável / gêmeos)**
- Nº de inscrição de irmão inválido / de outra modalidade.
- Irmão gêmeo: pergunta "escolha a mesma escola" aparece; escolher escolas diferentes → alerta.
- Irmão/responsável estudando em cada uma das 6 opções de escola.

**Endereço**
- CEP inexistente; CEP de outro município; CEP sem logradouro (autopreenchimento parcial).
- Número obrigatório: enviar em branco, com letra, com 0.

**Sessão / reentrada**
- Timeout de sessão no passo 5 → o que acontece ao clicar "Finalizar"?
- Abrir a inscrição em duas abas; voltar pelo botão do navegador; recarregar (F5) no meio.
- Retomar por ticket/GUID após bloqueio (`GetBloqueiaAtivoGUID`).
- Duplo clique em "Finalizar" (a proteção é só `ShowHide()` desabilitando botão — testar corrida).

**Listagens**
- Bairro sem nenhuma unidade; bairro com centenas de linhas (performance do `tablesorter`, sem paginação).
- Ordenar cada coluna; acentuação/ordenação de "ÁGUA SANTA" vs "ABOLIÇÃO".

**Carga**
- Abertura das inscrições (pico): `/Inscricao/Index` de 215 KB × milhares simultâneos + rajada de
  chamadas à Receita.

### 2.4 Riscos de perda de dados

- Todo o progresso vive na sessão do servidor. **Não há rascunho local nem "salvar e continuar
  depois"** explícito na UI (só o mecanismo interno de ticket/GUID). Queda de conexão, timeout ou
  fechar a aba = recomeçar. Para um formulário desse tamanho, com público de baixa
  familiaridade digital, é o maior risco de abandono.

### 2.5 Compatibilidade

- `.eot`/`.svg` nas fontes e Font Awesome 4.7 sugerem meta de suporte a navegadores antigos —
  mas Bootstrap 5.3 **não** suporta IE. Alvo real provável: Chrome/Edge/Safari atuais + Android
  WebView. Testar em Android antigo (público usa lan house / celular emprestado — ver §3).

### 2.6 Segurança de aplicação (superfície observável)

- CSRF coberto (`__RequestVerificationToken`).
- **Anti-bot ausente/incerto** no envio (D3).
- **Sem CSP** → qualquer XSS refletido/armazenado tem impacto máximo. Preocupante numa página que
  coleta CPF, NIS, endereço e telefone.
- **Sem HSTS** → downgrade para HTTP possível na primeira visita.
- Página de erro ASP.NET responde 200 e ecoa `aspxerrorpath` — verificar se não reflete conteúdo
  do usuário.
- Enumeração: `/ConsultaInscricao` e `/ConsultaCreche` permitem buscar por **nome + data +
  filiação**. Testar *rate limiting* e resposta a tentativas em massa (dados de menores).

---

## 3. Visão do UX — navegação e usabilidade

### 3.1 Quem usa e em que contexto

Responsáveis por crianças de 0–5 anos (creche/pré) e por alunos do fundamental/EJA/educação
especial. Parte relevante do público:
- tem **baixa familiaridade digital**;
- acessa por **celular**, muitas vezes emprestado ou em local público (o próprio site oferece
  "INSCRIÇÃO COM INTERNET GRATUITA" e atendimento presencial na escola/CRE);
- está sob **pressão** (vaga é escassa, processo é classificatório).

Esse perfil torna cada fricção de usabilidade mais cara do que seria num público geral.

### 3.2 Arquitetura de informação e navegação

```
Home
├─ Barra de menu (enxuta): INSCRIÇÃO · ESCOLAS POR REGIÃO
├─ Bloco de acesso rápido (botões):
│   INSCREVA-SE AQUI! · CONSULTA INSCRIÇÃO · RESULTADO CRECHE ·
│   CONSULTA CRECHES/ESCOLAS POR REGIÃO · INTERNET GRATUITA · AUTO-ATENDIMENTO (WhatsApp)
├─ Banner "Matrícula 2026" (imagem)
├─ Imagem de calendário (datas dentro da imagem)
├─ FAQ (5 perguntas)
└─ Rodapé institucional (redes SME, DO, 1746, contatos)
```

**Fluxo de inscrição, do ponto de vista do usuário:**

1. Clica "INSCREVA-SE AQUI!".
2. Cai no **Termo de Uso** — 11 seções em linguagem jurídica, sem resumo. Precisa marcar
   *"Li e concordo com o termo"*. Não há botão "Continuar" claramente rotulado ao lado do checkbox.
3. Entra no formulão. A partir daqui é uma sequência de seções (candidato → responsável →
   endereço → questionário → escolas → revisão) **sem indicação de "passo X de Y"** e sem
   possibilidade de pular e voltar livremente.
4. Em vários pontos, um `alert()` do navegador interrompe (CPF, comunicação por e-mail,
   necessidade de comparecer à escola com documentos).
5. Escolhe até 6 escolas, cada uma com sub-perguntas de vínculo.
6. Tela de revisão longa → "Finalizar" → comprovante. **Atenção à data do comprovante** (frase
   do próprio site) — o comparecimento presencial com documentos ainda é obrigatório.

### 3.3 Avaliação heurística (Nielsen) — resumida

| Heurística | Situação | Nota |
|---|---|---|
| Visibilidade do status do sistema | Só spinner de tela cheia. Sem barra de progresso do wizard, sem "salvo automaticamente". | 🔴 |
| Correspondência com o mundo real | Boa parte da linguagem é institucional/jurídica ("público-alvo da educação especial", "família monoparental", "arcabouço legal"). | ⚠️ |
| Controle e liberdade do usuário | Não dá para navegar entre passos à vontade; "voltar" do navegador destrói o formulário; sem "salvar rascunho" visível. | 🔴 |
| Consistência e padrões | Vários azuis e fontes diferentes entre telas; botões com formatos distintos (pill, arredondado 10px, retangular). | ⚠️ |
| Prevenção de erro | `confirm()` antes de cancelar; máscaras de campo. Mas erros só aparecem **depois** de tentar avançar. | ⚠️ |
| Reconhecimento em vez de memorização | Usuário precisa saber de cor: nº de matrícula do irmão, NIS, nº de inscrição do irmão, CEP. | ⚠️ |
| Flexibilidade / eficiência | "Buscar código" (matrícula), autopreenchimento de CEP, autocomplete de bairro ajudam. | 🟢 |
| Estética e design minimalista | Formulário denso; muitos campos condicionais; blocos de alerta em caixa-alta. | ⚠️ |
| Ajuda a reconhecer/recuperar de erros | Mensagens via `alert()` nativo, texto às vezes cru ("CPF inválido.\nReinicie inscrição!"). Sem foco no campo com erro, sem resumo de erros. | 🔴 |
| Ajuda e documentação | FAQ curto (5 itens) + WhatsApp + presencial + CRE. Boa rede de apoio **fora** do site; ajuda contextual **dentro** do site é fraca. | ⚠️ |

### 3.4 Principais problemas de usabilidade (priorizados)

**P1 — Calendário só em imagem.** A informação mais buscada ("quando abre? até quando?") está
dentro de um PNG. Ilegível para leitor de tela, não dá zoom com nitidez, não copia, não indexa.
→ *Publicar as datas em texto/HTML (tabela), com a imagem como complemento.*

**P2 — Formulário longo sem orientação de progresso.** Nenhum "Passo 3 de 8", nenhuma estimativa
de tempo, nenhuma lista do que ter em mãos antes de começar.
→ *Adicionar barra de passos + checklist inicial de documentos/números (CPF, NIS, matrícula do irmão, CEP).*

**P3 — Sem rascunho/retomada visível.** Existe o mecanismo de ticket, mas o usuário não sabe.
→ *Expor "sua inscrição foi salva — anote este código para continuar depois" de forma proeminente.*

**P4 — Erros nativos (`alert`/`confirm`).** Bloqueiam, não têm hierarquia visual, não levam ao campo.
→ *Substituir por mensagens inline junto ao campo + um resumo no topo com links âncora.*

**P5 — Termo de Uso como muro.** 11 seções jurídicas logo na entrada, sem TL;DR.
→ *Resumo em linguagem simples no topo ("o que coletamos, para quê, seus direitos") + texto completo abaixo.*

**P6 — Linguagem.** Perguntas do questionário socioeconômico são sensíveis e ditas de forma seca
("Existe algum membro do núcleo familiar que é presidiário ou ex-presidiário?"). Sem explicar por
que se pergunta nem que a resposta precisa ser comprovada até ver o cabeçalho.
→ *Micro-texto empático + explicação do uso do dado em cada bloco sensível.*

**P7 — Descoberta de escolas fora do fluxo.** Para escolher bem as 6 opções, o usuário idealmente
consulta `/EscolasEDI` **antes**, em outra aba. O formulário não traz endereço/telefone da escola
inline no momento da escolha (só nome no `<select>`).
→ *Mostrar ficha resumida da escola (endereço, distância, polo) ao selecionar.*

**P8 — Caixa-alta em alertas e títulos** ("* ATENÇÃO!...") prejudica leitura e "grita".

### 3.5 O que funciona bem (não regredir)

- Rede de apoio no rodapé/FAQ: WhatsApp de autoatendimento, atendimento presencial, CRE, 1746.
- Autopreenchimento de endereço por CEP e autocomplete de bairro.
- "Buscar código" para quem esqueceu a matrícula.
- Duas formas de consultar a ficha (por nº ou por nome+filiação) — reduz exclusão de quem perdeu o número.
- Operação 24/7 no período e mensagem honesta de que o comparecimento presencial com documentos ainda é necessário.
- Presença de **skip-link** ("Ir para o conteúdo"), VLibras e barra de acessibilidade — intenção correta (execução fraca, ver §4.9).

### 3.6 Mobile

- Menu principal some abaixo de 768px; entra um menu secundário/hambúrguer (`style-menu2.css`,
  breakpoints 1080/480/320px) com posicionamento por coordenada fixa (`left: 83%; top: 55px`) —
  frágil a variações de viewport.
- Tabelas de `/EscolasEDI` e `/LocalInternet` têm 5–6 colunas: em telas estreitas provavelmente
  exigem *scroll* horizontal (não verificado ao vivo).
- Formulário de 215 KB + 147 KB de JS em 3G/4G lotado (lan house, celular antigo) = espera longa
  antes do primeiro campo.

---

## 4. Identidade visual — levantamento

> **Achado transversal:** não existe um sistema de design único. Convivem **pelo menos três
> camadas** de identidade, aplicadas por folhas de estilo diferentes carregadas na mesma página:
>
> 1. **Camada "Matrícula/SME" (Gotham)** — `fonts.css`, `style-interno.css`, `style-matricula-*.css`.
> 2. **Camada "Governo do Rio / Secretarias / iplanrio" (Cera Pro + Museo Sans)** —
>    `style-geral.css`, `style-menu2.css`, `style-footer.css`.
> 3. **Camada legada (Helvetica Neue / Patua One / Eras ITC)** — `StyleSheet.css`.
>
> O resultado é ~10 azuis quase idênticos e 3 sistemas tipográficos disputando os mesmos elementos.

### 4.1 Logotipos e marcas

| Asset | Uso | Alt observado |
|---|---|---|
| `logotipo-topo.png` | Barra superior, link p/ Prefeitura | "Vá para o Portal da Prefeitura…" |
| `Logo Matricual.png` *(sic — erro de digitação no nome do arquivo)* | Logo "Matrícula Rio" no topo | "Logo do Matrícula Rio" |
| `RIOPREFEITURA-SME-horizontal-azul.png` | assinatura SME | — |
| `logo-sme-rodape.png` | rodapé | mínimo/ausente |
| `logo-matricula-branco-rodape.png` | rodapé (versão negativa) | mínimo/ausente |
| `acessoainfo.png` / `acessoainfo` | selo "Acesso à Informação" | — |
| `Banner-Digital-Matrícula-2026.png` | hero da home e do calendário | — |
| `do-pe.jpg` | rodapé (Diário Oficial?) | **sem `alt`** |

Ícones sociais: Instagram, Facebook, Twitter/X, **YouTube** (o YouTube aparece no header atual mas
não estava no mapeamento anterior — indício de atualização recente do header).

### 4.2 Paleta de cores (consolidada de todas as folhas)

**Azuis (institucional — sem padronização):**

| Hex | Onde aparece | Papel |
|---|---|---|
| `#12bbef` (`--azure`) | tema secretarias, `.prefeiturario` | azul-claro de marca "Rio" |
| `#1BB5DA` | `style-menu2` (fundo de submenu) | menu |
| `#008FBE` | `style-menu2` (fundo do menu) | menu |
| `#008EB7` | `style-menu2` (borda) | menu |
| `#00c0f4` | barra pojo-a11y, `style-matricula-1` | acessibilidade / destaque |
| `#24C0F1` / `#24c0f3` | `StyleSheet.css` (hover de link legado) | legado |
| `#028fbe` / `#088fb8` | `style-interno` texto secundário, `.form-label` | rótulos de formulário |
| `#14A7DB` / `#00aeef` / `#14aacc` | hovers de card / option | interação |
| `#004a80` (`--header-blue`) | títulos, dropdown, `.texto-titulo-azul` | azul-título A |
| `#00508a` (`--deep-sea-blue`) | `.TextosTtitulos`, `#wrapper-acesso` | azul-título B |
| `#034C7F` | `.btn-continuar`, `.form-select`, `.accordion` | azul de ação |
| `#014A7F` | `.card-title` | azul-título C |
| `#02467A` | `StyleSheet.css` legado | azul-título D |
| `#09336F` | hover de link no rodapé interno | rodapé |
| `#3B79A5` | faixa "Acesso à Informação" no rodapé | rodapé |
| `#00516e` / `#00516e` | `option` de select | formulário |
| gradiente `#42b9eb → #004a80` | selects e cartões do rodapé | decorativo |

→ **Pelo menos 6 azuis diferentes fazem o papel de "azul de título"** (`#004a80`, `#00508a`,
`#014A7F`, `#02467A`, `#034C7F`, `#09336F`). Diferenças imperceptíveis, mas sem token único.

**Neutros:** `#181818`/`#333333`/`#000` (texto), `#424242` (`--greyish-brown`) e
`rgba(72,72,72,.68)` (texto secundário), `#81868a` (`--steel-grey`), `#888888` (links "mais
buscados"), `#363636` (`--header-grey`), `#ededed`/`#f4f4f4`/`#E7E7E7`/`#DDD` (fundos), `#afdde7`
(fundo azul suave), `#ffffff`.

**Acento não-azul:** `#6BB642` (verde — legado, "sucesso"), `#4579fb` (azul-royal em tags),
`#FF0000` (vermelho de erro — legado).

### 4.3 Tipografia

| Camada | Famílias declaradas | Onde |
|---|---|---|
| Matrícula/SME | **Gotham** (16 pesos: Thin→Black, + itálicos, + `GothamBook`) | `fonts.css`; `style-interno` usa `Gotham-Medium/Bold/Book` |
| Secretarias/iplanrio | **Cera Pro** (`cera_proregular`, `cera_probold`, `cera_problack`) + **Museo Sans** (`museo_sans300/500`) | `style-geral`, `style-footer` |
| Legado | **Helvetica Neue** (stack), **Patua One**, **Eras ITC** | `StyleSheet.css` |

- **Base:** `body { font-size: 16px !important; }` (tema secretarias) vs `12pt` em inputs
  (`style-interno`) — dois sistemas de unidade.
- **Títulos:** `.TextosTtitulos` / `.TitleMaisBuscados` → `cera_problack`, **39.5px**, weight 900,
  cor `#00508a`. `.card-title` → `cera_probold` 20px `#014A7F`.
- **Rótulos de formulário:** `.form-label` → `Cera_probold` 18px `#088fb8`.
- **Menu:** `cera_probold` 13px, weight 700, branco.
- **Risco real:** as folhas novas pedem Cera Pro / Museo Sans, mas **só há `@font-face` de Gotham**
  hospedado. Se Cera Pro / Museo Sans não carregam de outra origem, o site cai no fallback
  `sans-serif` do sistema — ou seja, a tipografia "de marca" pode não estar aparecendo como
  desenhada. Confirmar em produção.
- `.eot`/`.svg` nas fontes Gotham = configuração para navegadores pré-2013 (peso morto hoje).

### 4.4 Iconografia

- **Bootstrap Icons 1.11.3** (atual) + **Font Awesome 4.7.0** (2016, descontinuado) —
  dois icon sets.
- Ícones de UI legados como **imagens PNG** (`lupaVerde.png` de `v2019`, `seta-formulario.png`,
  `icone-whatsapp-btn.png`) em vez de fonte/SVG.
- Ícones sociais como PNGs individuais.

### 4.5 Componentes de UI

| Componente | Estilo observado |
|---|---|
| Botão primário (secretarias) | `.btn-continuar` — fundo `#034C7F`, texto branco, `border-radius: 10px`, `font-weight: bolder` |
| Botão de ação (tema matrícula) | `.botaoAction` — fundo `#004a80`, `height: 45px`, `Gotham-Bold`, cantos retos |
| Botão legado | `.button` — fundo `#008CBA`, `padding: 10px 14px`, cantos retos |
| Select (secretarias) | fundo `#034C7F`, texto branco, **`border-radius: 50px`** (pill), negrito |
| Select (tema matrícula) | gradiente `#42b9eb→#004a80` + seta PNG, `border-radius: 25px`, texto branco |
| Input | `.form-control` — `height: 34px`, borda `1px #ccc`, `border-radius: 4px` |
| Card notícia | `width: 327px` fixo, `border-radius: 20px`, fundo `rgba(129,134,138,.33)`, imagem `object-fit: cover` |
| Accordion (FAQ) | Bootstrap accordion, `--bs-accordion-active-bg: #034C7F`, ativo branco sobre azul |
| Tabela (`#rt1`/`tablesorter`) | `border-collapse`, cabeçalho com borda inferior 2px `#ddd`, linha `1px #ddd`, `padding: 8px` — sem zebra, sem paginação |
| Navbar | `height: 53px` (secretarias) / 78–98px (menu2) — **dois valores** |

→ **3 estilos de botão** e **2 de select** coexistem. Raio de canto varia entre 4px, 10px, 15px,
20px, 25px e 50px conforme a folha.

### 4.6 Layout e grid

- Tema legado: container `max-width: 862px; margin: 0 auto` (estreito, herança de layout antigo).
- Tema secretarias: Bootstrap 5 (grid de 12, breakpoints padrão 576/768/992/1200).
- Rodapé: flex, colunas 33/67% em tablet, reordenação por `order` no mobile, faixa branca
  decorativa de 15px.
- Breakpoints citados nas folhas: 320, 480, 575, 767/768, 906, 991, 1080px — **não padronizados**
  entre camadas.

### 4.7 Imagem e ilustração

- Comunicação-chave (banner, **calendário/datas**) entregue como **PNG rasterizado** — não
  responsivo de verdade, não acessível, não versionável como texto.
- Fotografia/ilustração praticamente ausente fora do banner.

### 4.8 Tom de voz / linguagem

- **Institucional-jurídico** no Termo e nas asserções ("arcabouço legal", "titular", "agente
  público").
- **Imperativo em caixa-alta** nos alertas ("* ATENÇÃO! Todo o critério sinalizado abaixo com
  'sim' deverá ser comprovado.").
- **Direto/seco** nas mensagens de erro do JS ("CPF inválido.\nReinicie inscrição!").
- **Cordial** no FAQ e no autoatendimento.
- Não há um guia de voz único; o registro muda por tela.

### 4.9 Acessibilidade como parte da identidade

- **VLibras** (janela de Libras do gov.br) — presente.
- **Barra "pojo-a11y"** (tema *Pojo Accessibility*, origem WordPress) com toggle `#00c0f4`,
  posicionada a `top: 160px`. Oferece ajustes de contraste/fonte/foco — mas é um *overlay*
  paliativo, não acessibilidade nativa.
- **Skip-link** "Ir para o conteúdo" (`#content`) presente (aparece 2×).
- **Lacunas:** `alt` ausente (`do-pe.jpg`) ou genérico ("imagem do calendário"); **zero ARIA**
  (`role`, `aria-label`, `aria-describedby`, `aria-live`) no formulário; erros por `alert()` sem
  `aria-live`; informação essencial (datas) em imagem; contraste dos muitos azuis claros
  (`#12bbef`, `#00c0f4`, `#028fbe`) sobre branco **não** garante 4.5:1 para texto normal —
  precisa auditoria.
- `html lang` não confirmado no trecho inspecionado — verificar `lang="pt-BR"`.

---

## 5. Recomendações priorizadas

### Prioridade 1 — impacto direto no cidadão (fazer antes do próximo ciclo)

1. **Publicar o calendário em texto/HTML** (tabela de etapas e datas). Manter a imagem só como reforço.
2. **Barra de progresso + checklist inicial** no formulário de inscrição ("passo X de Y" + "tenha em mãos: CPF, NIS, matrícula do irmão, CEP").
3. **Erros inline** junto ao campo + resumo no topo com âncoras; aposentar `alert()`/`confirm()` no caminho crítico.
4. **Retomada visível**: mostrar o código de continuação com destaque e instruções.
5. **Resumo em linguagem simples** no topo do Termo de Uso e antes do questionário socioeconômico.

### Prioridade 2 — robustez / QA

6. Corrigir **soft-404** (retornar 404 real em rota inexistente).
7. Reativar/confirmar **proteção anti-bot** no envio (D3).
8. Adicionar **CSP, HSTS, X-Content-Type-Options**.
9. **Degradação graciosa** quando a Receita Federal cai (fila/retentativa assíncrona, permitir concluir e validar depois).
10. Corrigir o **texto de cookies do CookieYes** (remover menções a Wix/PubMatic).
11. Limpar campos órfãos (`_wpnonce`, `_wp_http_referer`), unificar jQuery, renomear `Logo Matricual.png`.

### Prioridade 3 — identidade visual / dívida técnica

12. **Definir design tokens** (um azul-título, um azul-ação, um azul-link, uma escala de cinza, um raio de canto, uma escala tipográfica) e refatorar as ~18 folhas para consumi-los.
13. **Decidir a tipografia**: Gotham *ou* Cera Pro — e garantir que os `@font-face` da escolhida realmente carregam. Remover a camada Helvetica/Patua/Eras.
14. Unificar **um icon set** (Bootstrap Icons), remover Font Awesome 4.7, converter ícones-PNG legados.
15. Consolidar CSS num **pipeline de build** (bundle + minificação + versionamento por hash); idem para `Inscricao.js`.
16. Auditoria WCAG 2.1 AA completa (contraste, ARIA no formulário, foco, `alt`, `lang`).

---

## 6. Limitações desta análise

- Feita **sem autenticação e sem submeter formulários**. Telas de resultado (comprovante,
  classificação, listas preenchidas) e o comportamento real de validação server-side **não** foram
  exercidos — as descrições de fluxo vêm do HTML e do `Inscricao.js`.
- As folhas de estilo foram lidas via extração de texto; alguns valores podem ter sido resumidos
  pela ferramenta de leitura. Recomenda-se conferência direta no navegador (DevTools) para a
  auditoria de tokens e contraste.
- O header pode variar conforme o período do calendário (dentro/fora da janela de inscrições);
  o levantamento reflete o estado em **30/08/2026**.
- Divergências pontuais com [`mapeamento-matricula-rio.md`](mapeamento-matricula-rio.md) (ex.: itens
  de menu, ícone do YouTube) indicam que o site recebeu ajustes entre as duas coletas.

---

## Anexo A — Perguntas do formulário de inscrição (transcrição literal)

> Coletado em **30/08/2026** de `/Inscricao/Index` (HTML renderizado, sem submissão).

### A.1 Seção do candidato (Sim/Não)

1. Possui deficiência, transtornos globais do desenvolvimento ou altas habilidades / superdotação?
2. Deseja se candidatar a uma Escola Municipal Olímpica Carioca? *(EMOC)*
3. Candidato tem pais ou responsáveis com idade igual ou superior a sessenta anos?
4. Candidato tem pais ou responsáveis deficientes?
5. A mãe do candidato é adolescente (menor 18 anos)?
6. O candidato é refugiado?
7. O candidato faz uso contínuo de cadeira de rodas? (SIM/NÃO)
8. Tem irmão com inscrição online realizada?

### A.2 Questionário socioeconômico / Critérios classificatórios (creche)

Cabeçalho exibido: *"Atenção! Todo o critério sinalizado abaixo com 'sim' deverá ser comprovado."*
Campos `pergunta_creche_0` … `pergunta_creche_13`.

| # | Pergunta (texto literal) |
|---|---|
| 1 | A criança e/ou alguém do núcleo familiar apresentam doenças crônicas graves? (SIM/NÃO) |
| 2 | A criança e/ou familiar do seu convívio diário é vitima de violência doméstica? (SIM/NÃO) |
| 3 | Existe algum membro do núcleo familiar que faz uso abusivo de drogas e/ou alcoól? (SIM/NÃO) |
| 4 | Existe algum membro do núcleo familiar que é presidiário ou ex-presidiário? (SIM/NÃO) |
| 5 | O Candidato possui pais ou responsáveis com idade menor que 18 anos? (SIM/NÃO) |
| 6 | Candidato tem pais ou responsáveis deficientes ? (SIM/NÃO) |
| 7 | O candidato é refugiado? (SIM/NÃO) |
| 8 | Criança aguardou em fila de espera no ano anterior sem ter sido atendida? (SIM/NÃO) |
| 9 | Criança cuja família seja inscrita no CadÚnico (Cadastro Único para Programas Sociais)? (SIM/NÃO) |
| 10 | O Candidato possui irmão matriculado na rede pública ou parceria? (SIM/NÃO) |
| 11 | A criança pertence a família monoparental? (SIM/NÃO) |
| 12 | A criança é público-alvo da educação especial? (SIM/NÃO) |
| 13 | A Criança é público do Programa Pequenos Cariocas? (SIM/NÃO) |
| 14 | Faz parte do programa bolsa família? (SIM/NÃO) |

### A.3 Por opção de escola (repetido para cada uma das até 6 escolas)

1. Esteve na lista de espera desta creche? Sim / Não
2. Possui irmão frequentando esta escola? Sim / Não
3. O responsável pelo candidato estuda nesta escola? Sim / Não

### A.4 Modal "Consultar Matrícula do Aluno"

- Consta filiação na certidão de nascimento? → **Consta** / **Não consta**

### A.5 Observações

- Perguntas **repetidas** entre A.1 e A.2 (refugiado; pais 60+/deficientes; pais menores de 18):
  provável redundância do formulário.
- A **pontuação de cada critério não é exibida** no site — o texto remete à Resolução de Matrícula
  e ao Diário Oficial.
- O campo `pergunta_imediata_0` (Questionário Imediato) existe no HTML, mas o texto da pergunta
  não foi renderizado nesta inspeção — só se aplica a modalidades de matrícula imediata (não-creche).
- As 5 perguntas do **FAQ da home** estão transcritas na íntegra em
  [`mapeamento-matricula-rio.md`](mapeamento-matricula-rio.md) §7.

---

## Anexo B — Campos cadastrais e escolha de escolas (mapeamento)

> Coletado em **30/08/2026** de `/Inscricao/Index` (HTML renderizado, sem submissão). Os nomes
> técnicos (`name=`) vêm do mapeamento em [`mapeamento-matricula-rio.md`](mapeamento-matricula-rio.md) §4;
> quando o `name` não pôde ser confirmado, a célula traz "—".
> Legenda de obrigatoriedade: **\*** = obrigatório · **\*\*** = obrigatório condicional · vazio = opcional.

### B.1 Origem do candidato e escolaridade

| Campo (label) | `name` | Tipo | Obr. | Opções / observações |
|---|---|---|---|---|
| Origem do Candidato | `Id_MovimentacaoOrigem` | select | \* | 7 opções: "Estuda ou sua última escola foi uma escola particular" · "Estuda em escola municipal do Rio de Janeiro e quer transferência de escola" · "Estuda em escola municipal do Rio de Janeiro e quer mudar para Educação de Jovens e Adultos" · "Estuda ou sua última escola foi uma escola pública de outro estado do Brasil" · "Estuda ou sua última escola foi uma escola pública de outro município do Estado do Rio de Janeiro" · "Não estuda atualmente, mas sua última escola foi uma escola municipal do Rio de Janeiro" · "Nunca estudou" |
| Matrícula do aluno na Rede Municipal | `matricula` | texto + botão "Buscar Código" | \* (em branco se nunca estudou) | Ajuda: *"Todos os alunos que estudam ou já estudaram na Rede Pública Municipal da Cidade do Rio de Janeiro possuem um código (Matrícula). Se você não lembra, utilize 'buscar código' para saber qual é o código. Se você nunca estudou na Rede Pública Municipal da Cidade do Rio de Janeiro, deixe este campo em branco e prossiga."* |
| Matrícula (transferência) | `matriculaTransferencia` | texto | condic. | Aparece nos fluxos de transferência |
| Escolaridade pretendida para 2026 | `Id_SerieAtributo` | select | \* | Placeholder "Selecione uma escolaridade" |
| Série de origem / continuidade | `id_fazer_inscricao_continua`, `Id_SerieAtributo` | hidden/select | — | Preenchido por `GetDadosSeriesOrigem` |

### B.2 Identificação do candidato

| Campo (label) | `name` | Tipo | Obr. | Opções / observações |
|---|---|---|---|---|
| Data de nascimento | `dat_nascim` | data (dd/mm/aaaa) | \* | Dispara `ValidarCalendario`; máscara com teto de 120 anos |
| Nome completo do Candidato | `nome` | texto | \* | Ajuda: "(Digite sem abreviação)" |
| CPF do candidato | `CPF` / `CPFValidado` | texto (máscara CPF) | \* | Creche: validado on-line na Receita Federal (`ValidaCPFAlunoCreche`). Aviso: *"Candidato da rede municipal DEVE informar o número CPF do candidato"* |
| Candidato não possui CPF | `cpfnaoconsta` / `cpg` | checkbox | — | Abre orientação p/ providenciar CPF (Receita, Correios, BB, Caixa) |
| Sexo | `sexo` | radio | | "Masculino" / "Feminino" |
| Confirmo dados conforme a Certidão de Nascimento | — | radio | \* | "Nome completo, Número do CPF, Data de nascimento e Nomes das filiações" → "Sim" / "Não". JS bloqueia se "Não": *"Não é permitido seguir a inscrição se os dados do candidato não forem exatamente como constam na certidão"* |

### B.3 Filiação

| Campo (label) | `name` | Tipo | Obr. | Opções / observações |
|---|---|---|---|---|
| Filiação 1 (nome completo) | `nom_mae` | texto | \* | Instrução: "Preencha abaixo o nome completo de cada uma das filiações" |
| Filiação 1 consta na Certidão? | — | radio | | "Consta" / "Não consta" |
| Filiação 1 não existente | `Filiacao1NaoExistente` | checkbox | — | |
| Data de nascimento da Filiação 1 | `dat_nascim_filiacao1` | data | \* | |
| Filiação 2 (nome completo) | `nom_pai` | texto | \* | |
| Filiação 2 consta na Certidão? | — | radio | | "Consta" / "Não consta" |
| Filiação 2 não existente | `Filiacao2NaoExistente` | checkbox | — | |
| Data de nascimento da Filiação 2 | — | data | | Sem asterisco nesta seção |

### B.4 Nacionalidade e naturalidade

| Campo (label) | `name` | Tipo | Obr. | Opções / observações |
|---|---|---|---|---|
| Nacionalidade | `TipoNacionalidade` | radio | \* | "Brasileiro(a)" / "Naturalizado(a)" / "Outra nacionalidade" |
| País de nacionalidade | `Id_Nacionalidade` | select | \* | ~246 países (Afeganistão … Zimbábue), inclui "Brasil" |
| Estado onde nasceu | `UF` | select | \* | 26 UFs + "Distrito Federal" + "Exterior" |
| Cidade onde nasceu | `Naturalidade` | texto | \* | |
| O candidato é refugiado? | `Refugiado` | radio | \* | "Não" / "Sim" |

### B.5 Perfis especiais

| Campo (label) | `name` | Tipo | Obr. | Opções / observações |
|---|---|---|---|---|
| Possui deficiência, transtornos globais do desenvolvimento ou altas habilidades / superdotação? | `is_deficiente` | radio | \* | "Sim" / "Não" |
| Escolha uma das opções abaixo (tipo de deficiência do candidato) | `ListaTipoDeficienciaSelecionada` | checkbox (múltipla) | \* se acima = Sim | 11 tipos: "Altas habilidades/Superdotação" · "Baixa visão" · "Deficiência auditiva" · "DF Deficiência Física" · "DI Deficiência Intelectual" · "DMU Deficiência Múltipla" · "DV Deficiência Visual/Cegueira" · "SC Surdocegueira" · "SU Deficiência Auditiva/Surdez" · "TEA Transtorno do Espectro Autista" · "Visão monocular" |
| O candidato faz uso contínuo de cadeira de rodas? (SIM/NÃO) | — | radio | \* | "Sim" / "Não" |
| Deseja se candidatar a uma Escola Municipal Olímpica Carioca? | `is_GEO` | radio | \* | "Sim" / "Não" (EMOC / Ginásio Experimental Olímpico) |
| Candidato tem pais ou responsáveis com idade igual ou superior a sessenta anos? | `is_SESSENTAANOS` | radio | \* | "Sim" / "Não" |
| Candidato tem pais ou responsáveis deficientes? | `is_deficienteresponsavel` | radio | \* | "Sim" / "Não" |
| Escolha uma das opções abaixo (deficiência do responsável) | `ListaTipoDeficienciaResponsavelSelecionada` | select/checkbox | \* se acima = Sim | mesmos 11 tipos |
| A mãe do candidato é adolescente (menor 18 anos)? | `is_MaeAdolescente` | radio | \* | "Sim" / "Não" |
| Nome da mãe adolescente | `nome_mae_adolescente` | texto | \* (condic.) | aparece se mãe adolescente = Sim |
| Data de nascimento da mãe adolescente | `dat_nascim_mae_adolescente` | data | \* (condic.) | idem |

### B.6 Irmão / gemelaridade

| Campo (label) | `name` | Tipo | Obr. | Opções / observações |
|---|---|---|---|---|
| Tem irmão com inscrição online realizada? | `ind_possui_irmao` | radio | \* | "Sim" / "Não" |
| Número da inscrição do irmão | `num_inscr_irmao` | texto | \* (condic.) | validado por `getInscricaoIrmao`; campo adjacente "Nome:" preenchido pelo sistema |
| ID interno da inscrição do irmão | `id_inscr_irmao` | hidden | — | |
| Irmão gêmeo | `id_irmao_gemeo` | hidden/radio | — | JS pergunta *"O irmão que participa do processo on-line é também seu irmão Gêmeo?"* e sugere *"Quando possível, escolha a mesma escola para os irmãos gêmeos"* |

### B.7 Responsável e contato

| Campo (label) | `name` | Tipo | Obr. | Opções / observações |
|---|---|---|---|---|
| Tipo Responsável | `tipo_responsavel` | select | \* | Opções não expostas no HTML público (carregadas via `GetDadosSeriesOrigem` → `TipoResponsavelList`) |
| Nome | `nome_responsavel` | texto | \* | Sem caracteres especiais; "não podem existir mais do que quatro letras repetidas" |
| CPF | `CpfResponsavel` | texto (máscara) | \* | Não pode ser igual ao CPF do candidato |
| DDD (telefone) | `ddd_fone_responsavel` | numérico | \*\* | "É obrigatório preencher ou telefone ou celular" |
| Telefone Responsável | `num_fone_responsavel` | numérico | \*\* | 8 dígitos, inicia 2–5 |
| DDD (celular/WhatsApp) | `ddd_cel_responsavel` | numérico | \*\* | |
| WhatsApp | `num_cel_responsavel` | numérico | \*\* | 9 dígitos, inicia 7–9 |
| E-mail | `email_inscr` | e-mail | \* | *"Este endereço de e-mail e número de telefone serão utilizados como meios de comunicação direta com o responsável"* |
| NIS Responsável | `NIS` | texto | | dígito verificador mód. 11 |

### B.8 Endereço

| Campo (label) | `name` | Tipo | Obr. | Opções / observações |
|---|---|---|---|---|
| CEP | `CEP` | numérico | \* | "(somente números)"; dispara `GetEndereco` |
| (id do endereço/CEP) | `Id_EnderecoCEP` | hidden | — | retornado por `GetEndereco` |
| Logradouro | `logradouro_endereco` | texto | | autopreenchido |
| Número | `NumeroEndereco` | numérico | \* | |
| Complemento | `ComplementoEndereco` | texto | | |
| Bairro | `bairro_endereco` | texto | | autopreenchido |
| Cidade | `cidade_endereco` | texto | | autopreenchido |
| UF | `uf_endereco` | texto | | autopreenchido |

### B.9 Escolha de escolas (até 6 opções)

Cabeçalho da seção: **"Unidades escolares"** — *"Selecione um bairro e em seguida selecione a
escola desejada em cada uma das opções exibidas."*

- São **até 6 opções de escola**: a principal (`Id_EscolaSerie` + `ddlBairrosEscola`) e as réplicas
  **1 a 5** (`Id_EscolaSerie1..5` + `ddlBairrosEscola1..5`).
- Cada opção tem: um `<select>` de **bairro**, um `<select>` de **escola/série** (carregado por
  `GetEscolas` após escolher o bairro) e o link **"Consultar por Bairro"**, que abre a
  relação de unidades com colunas **Designação · Nome · Endereço · Bairro · Referência**.
- A pergunta **EMOC** ("Deseja se candidatar a uma Escola Municipal Olímpica Carioca?") aparece
  **só na 1ª opção**.

**Perguntas de vínculo — por opção de escola:**

| Pergunta (label) | `name` (n = índice da escola) | Tipo | Obr. | Campo condicional |
|---|---|---|---|---|
| Esteve na lista de espera desta creche? | `participou_lista_creche{n}` | radio Sim/Não | \* | — (só nas réplicas 1–5) |
| Possui irmão frequentando esta escola? | `ind_irmao_escola{n}` | radio Sim/Não | \* | "Informe o número da matrícula do irmão matriculado nesta escola:" → `cod_aluno_irmao_escola{n}` + "Nome:" |
| O responsável pelo candidato estuda nesta escola? | `ind_resp_aluno_escola{n}` | radio Sim/Não | \* | "Informe o número da matrícula do responsável matriculado nesta escola:" → `cod_aluno_responsavel_escola{n}` + "Nome:" |

> Nota: nas opções **Escola 4** e **Escola 5** o rótulo do campo de matrícula do irmão aparece como
> "Matrícula Aluno (da rede municipal) do irmão:" — pequena inconsistência de rótulo entre as réplicas.

### B.10 Polos de avaliação

Aparecem apenas quando `GetDadosEscolaPolos` retorna `Tipo_Avaliacao` ≠ `SemAvaliacao`.

| Seção | Select de bairro | Select de polo | Tabela |
|---|---|---|---|
| **Polo de Avaliação de Deficiência** | `ddlBairrosPoloDeficiente` | `Id_PoloAvaliacaoDeficiente` (\*) | Designação · Nome · Endereço · Bairro · Referência |
| **Polo de Avaliação** (distorção idade-série / "defasado") | `ddlBairrosPoloDefasado` | `Id_PoloAvaliacaoDefasado` (\*) | Designação · Nome · Endereço · Bairro · Referência |

Instrução em ambas: *"Selecione um bairro e em seguida selecione o polo de avaliação desejado"* +
link "Consultar por Bairro". Polos carregados por `GetPolosDeficientes` / `GetPolosDefasados`.

### B.11 Revisão e finalização

- Bloco de revisão com todo o conteúdo preenchido e as instruções:
  *"Confira seus dados e clique em Finalizar no fim da página"* e
  *"Antes de clicar no botão 'Finalizar Inscrição', por favor, confira atentamente seus dados,
  mostrados acima."*
- Botão **"Finalizar Inscrição"** → `POST /Inscricao/Finalizar` → comprovante com número de inscrição.
- Antes/depois, modais de `alert()`: comunicação por e-mail/telefone; *"Será necessário o
  comparecimento em uma das unidades escolhidas, levando os documentos comprobatórios"*;
  *"Fique atento a data do comprovante de inscrição!"*.

### B.12 Campos de contexto (ocultos)

`Id_Calendario`, `Id_Calendario_Aval_Deficiente`, `Id_Calendario_Aval_Defasado`,
`Id_Calendario_Teste_Fisico_GEO`, `Id_Calendario_LEI`, `Id_Tipo_Aluno`, `TipoVaga`, `statusAluno`,
`GUID_inscricao`, `DataServidor`, `id_escola_atualSGA`, `CPFReceita`, `__RequestVerificationToken`
(anti-CSRF) e os órfãos `_wpnonce` / `_wp_http_referer` (resíduo de template).

### B.13 Observações e inconsistências

- **Redundância de coleta:** deficiência do candidato, deficiência dos pais, pais 60+, mãe
  adolescente, refugiado e "irmão matriculado" são perguntados **duas vezes** — uma na seção de
  perfil do candidato (B.5/B.6) e outra no questionário socioeconômico (Anexo A.2).
- **Formulário genérico reaproveitado:** campos de EJA, "60+" e GEO/EMOC continuam presentes
  (ocultos) numa inscrição de creche; validação aceita idade de até 120 anos.
- **`Tipo Responsável`** não tem as opções no HTML estático — dependência de AJAX para renderizar
  um campo obrigatório.
- **Autopreenchimento parcial de endereço:** se o CEP não retornar logradouro/bairro, o usuário
  fica com campos vazios e sem edição óbvia (são marcados como não-obrigatórios).
- **Escolha de escola sem contexto:** o `<select>` mostra só o nome; endereço/telefone/polo só
  aparecem via "Consultar por Bairro" (link que interrompe o preenchimento).
