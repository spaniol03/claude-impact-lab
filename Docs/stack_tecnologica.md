# Stack Tecnológica — Recomendação (planejamento, sem código)

> **Tipo de documento:** recomendação técnica de stack e arquitetura de front-end/back-end.
> **Relacionado a:** [`diagnostico_solucao.md`](diagnostico_solucao.md) (dores priorizadas), [`prb_creche.md`](prb_creche.md) (solução proposta) e [`plano_mvp_hackathon.md`](plano_mvp_hackathon.md) (roadmap de horas).
> **Escopo:** apenas decisão de tecnologia e estrutura — nenhuma implementação foi feita a partir deste documento.
> **Requisitos do pedido:** aplicação responsiva, intuitiva, adaptável a desktop e mobile, com identidade visual alinhada ao **matricula.rio** (portal oficial de matrícula da Prefeitura do Rio), com qualidade de interface acima do que um framework de prototipagem rápida entrega por padrão.
> **Revisão:** substitui a recomendação anterior (Streamlit) por **FastAPI + HTML/CSS/JS**, decisão tomada para priorizar qualidade visual e controle de UI sobre velocidade pura de setup.

---

## 1. O que o matricula.rio nos diz sobre identidade visual

Inspeção do site oficial (`matricula.rio`) mostra um **portal de governo clássico**, não uma aplicação moderna:

| Aspecto | O que foi observado |
|---|---|
| Paleta | Azul institucional sobre fundo branco — esquema típico de portais públicos brasileiros |
| Tipografia | Fontes de sistema (sem web font própria identificada) |
| Layout | Header com múltiplos logos (Prefeitura.Rio, Carioca Digital, 1746.rio), menu de duas camadas, hero com calendário e CTAs, cards de FAQ, rodapé multi-seção |
| Componentes | Navegação por links simples, ícones de rede social em barra horizontal, botão de atendimento via WhatsApp |
| Stack detectada | Extensões `.aspx` e caminho `App_Themes/v2025/imagens` — indica back-end **ASP.NET** legado; nenhum indício de framework de front-end moderno |

**Conclusão para nós:** não existe uma "stack" do matricula.rio para copiar — a stack deles é legada e não deve orientar a nossa. O que devemos replicar é a **linguagem visual de confiança institucional**: azul de governo, branco, hierarquia clara, tom sóbrio — não os componentes técnicos. Como estamos livres da stack legada, podemos entregar essa mesma linguagem visual com uma qualidade de execução mais alta (tipografia cuidada, espaçamento consistente, responsividade real) do que o portal original.

> ⚠️ **Ação pendente antes da build:** capturar prints reais do matricula.rio (ou o manual de marca "Carioca Digital", se existir) para extrair o hex exato do azul institucional e a fonte oficial, se houver uma definida pela Prefeitura. Este documento assume um azul de governo genérico até essa validação.

---

## 2. Critérios de decisão

Ordenados por peso na escolha:

1. **Qualidade e controle de interface** — critério que motivou a revisão desta recomendação. A aplicação precisa parecer um produto acabado, não um protótipo de dashboard — isso pesa mais do que economizar tempo de setup.
2. **Responsividade real** — funcionar bem em mobile e desktop com layout pensado para os dois, não apenas "não quebrar".
3. **Fidelidade visual à identidade do matricula.rio** — a stack não pode limitar tipografia, espaçamento ou paleta customizados.
4. **Consumo direto dos dados já tratados** (CSV/Parquet da Query A, agregações calculadas) — o back-end deve servir esses dados sem retrabalho de formato.
5. **Velocidade de entrega dentro do tempo de hackathon** — ainda importa, mas deixou de ser o critério dominante nesta revisão.
6. **Familiaridade da equipe** — o time já trabalhou com Python/Pandas na análise das bases; manter Python no back-end preserva esse investimento.

---

## 3. Recomendação principal

### FastAPI (back-end) + HTML/CSS/JS servido via Jinja2 (front-end)

**Por quê:** dá controle total sobre HTML e CSS — o que Streamlit não oferece — mantendo Python (e portanto Pandas) no back-end, sem introduzir um segundo processo de build como React exigiria. O FastAPI serve os templates HTML diretamente (via Jinja2), então **um único processo** roda a aplicação inteira: sem SPA, sem etapa de compilação de front-end, sem CORS entre serviços separados.

| Peça | Papel |
|---|---|
| **FastAPI** | Serve as rotas HTML (via Jinja2) e expõe os cálculos já feitos em Pandas (índice de concorrência, motor de cruzamento) — tanto para renderizar página quanto, se necessário, como endpoints JSON para atualizações parciais |
| **Jinja2** | Motor de templates do próprio FastAPI — permite reaproveitar um layout-base (header, navegação, rodapé) entre as duas telas sem duplicar HTML |
| **CSS puro (ou um pré-processador simples, se preferirem)** | Estrutura de grid/flexbox responsiva feita à mão, com media queries para os breakpoints de mobile e desktop — controle total da identidade visual do matricula.rio |
| **JavaScript vanilla** | Interações leves nas duas telas (atualizar o aviso de concorrência ao trocar a unidade escolhida, expandir/recolher a fila de liberação) sem framework de front-end |

| Necessidade | Como esta stack atende |
|---|---|
| Consumir dados tratados | Lê CSV/Parquet direto com Pandas dentro das rotas do FastAPI — zero camada intermediária |
| Responsivo | CSS com breakpoints definidos por nós, não herdados de um framework — controle real do comportamento mobile vs. desktop |
| Identidade visual | HTML/CSS puro dá controle total de tipografia, espaçamento, cores — sem lutar contra convenções de um framework de prototipagem |
| Interatividade das 2 frentes | JS vanilla + endpoints FastAPI cobrem tanto o aviso dinâmico de concorrência (Frente 1) quanto a atualização da fila de liberação (Frente 2) |
| Processo único | `uvicorn app:app` sobe back-end e front-end juntos — nenhuma orquestração extra na hora da demo |

**Trade-off assumido conscientemente:** exige escrever HTML/CSS à mão (ou com apoio de um assistente de código), em vez de ganhar componentes prontos como no Streamlit. Isso custa mais tempo de implementação — o ganho é qualidade de interface e fidelidade à identidade visual pedida.

---

## 4. Estrutura das duas telas dentro do mesmo projeto

Um único projeto FastAPI, duas rotas com públicos e propósitos distintos, layout-base compartilhado (header/rodapé com a identidade do matricula.rio):

| Rota | Público | Conteúdo |
|---|---|---|
| `/inscricao` | Família (usuário externo) | Formulário simulado de escolha de até 5 unidades, com aviso de concorrência por opção — Frente 1 do PRB |
| `/painel-servidor` | Servidor SME/CRE (usuário interno) | Fila de liberação: crianças já confirmadas em outro lugar e quem deveria ser promovido nas vagas que elas ainda travam — Frente 2 do PRB |

Manter as duas no mesmo projeto (em vez de duas aplicações separadas) permite compartilhar o layout-base, a paleta e os dados carregados uma única vez — reduz retrabalho e mantém a navegação coerente para quem for demonstrar as duas telas em sequência no pitch.

---

## 5. Alternativa descartada: React + Tailwind + FastAPI

Ainda é uma opção válida em cenários com mais tempo e alguém no time confortável com React, mas foi **descartada para este momento** porque exige orquestrar 2 processos (front-end com build step + API) — complexidade extra que não se paga no tempo de hackathon, já que HTML/CSS/JS servido pelo próprio FastAPI já entrega o nível de controle visual desejado sem essa divisão.

Fica registrada como candidata natural para a v2 pós-hackathon (seção 6), quando a aplicação crescer o suficiente para justificar um front-end desacoplado.

---

## 6. Recomendação faseada

| Horizonte | Stack | Racional |
|---|---|---|
| **MVP de hackathon (agora)** | FastAPI + Jinja2 + HTML/CSS/JS | Controle total de interface e identidade visual, processo único, sem build step, mantendo Python/Pandas no back-end |
| **V2 pós-hackathon** | Manter FastAPI como API + migrar front-end para React/Tailwind | Quando a aplicação precisar de autenticação, múltiplos usuários simultâneos (servidor da CRE vs. família) e telas mais dinâmicas do que HTML servido no servidor comporta bem |
| **Produção (se aprovado pela SME)** | A decidir com a equipe de TI da Prefeitura | Provavelmente precisa se integrar ao ecossistema ASP.NET/.NET já existente no matricula.rio — decisão que não cabe ao hackathon definir sozinho |

---

## 7. Como aplicar a identidade visual do matricula.rio

1. **Confirmar a paleta oficial** — validar hex exato do azul institucional e de eventuais cores de destaque (o fetch inicial não conseguiu extrair valores exatos; recomenda-se print + inspeção de CSS do site real, ou consultar um manual de marca da Prefeitura, se existir).
2. **Tipografia de sistema como fallback seguro** — como o matricula.rio não expõe uma web font própria, usar uma pilha de fontes de sistema (`-apple-system, "Segoe UI", Roboto, sans-serif`) já entrega familiaridade visual sem risco de carregar fonte errada; podemos refinar com uma web font discreta se quisermos elevar o acabamento acima do portal original.
3. **Tom institucional nos componentes** — botões sólidos em azul, cantos levemente arredondados (não totalmente retos, não excessivamente arredondados), hierarquia tipográfica sóbria — evitar linguagem visual de "startup" (gradientes vibrantes, ilustrações grandes) que destoaria do contexto de governo.
4. **Responsividade mobile-first** — dado que famílias provavelmente acessam via celular (o próprio fluxo oficial já usa WhatsApp/SMS como canal), desenhar e testar a tela `/inscricao` primeiro em viewport mobile, depois adaptar para desktop.
5. **Layout-base único** — construir o header/navegação/rodapé uma vez (Jinja2 permite herança de template) e reaproveitar nas duas rotas, garantindo que a identidade visual seja idêntica entre a tela da família e a do servidor.

---

## 8. Decisões em aberto antes da build

1. **Validar a paleta real** do matricula.rio/Carioca Digital antes de codar — evita retrabalho de estilo no meio da demo.
2. **Definir se algum CSS utilitário leve** (ex.: um framework de classes utilitárias sem build step, como Pico.css ou similar) entra como base, ou se o CSS será 100% escrito à mão — afeta quanto tempo reservar para estilo no roadmap.
3. **Definir se a demo roda localmente** (`uvicorn`, compartilhando tela) **ou precisa de link público** (ex.: deploy simples em algum serviço gratuito) — isso muda o tempo reservado para deploy na Fase 3 do [`plano_mvp_hackathon.md`](plano_mvp_hackathon.md).
4. **Confirmar que ninguém no time prefere já ir de React** — dado que a complexidade de orquestração foi o motivo de descartar essa rota agora; se o tempo disponível for maior do que o esperado, vale reconsiderar.

---

*Documento de planejamento — Claude Impact Lab 2026, dataset Inscrição Creche do Rio. Recomendação técnica; nenhuma implementação foi realizada a partir dele.*
