# Stack Tecnológica — Recomendação (planejamento, sem código)

> **Tipo de documento:** recomendação técnica de stack e arquitetura de front-end/back-end.
> **Relacionado a:** [`diagnostico_solucao.md`](diagnostico_solucao.md) (dores priorizadas), [`prb_creche.md`](prb_creche.md) (solução proposta) e [`plano_mvp_hackathon.md`](plano_mvp_hackathon.md) (roadmap de horas).
> **Escopo:** apenas decisão de tecnologia e estrutura — nenhuma implementação foi feita a partir deste documento.
> **Requisitos do pedido:** aplicação responsiva, intuitiva, adaptável a desktop e mobile, com identidade visual alinhada ao **matricula.rio** (portal oficial de matrícula da Prefeitura do Rio).

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

**Conclusão para nós:** não existe uma "stack" do matricula.rio para copiar — a stack deles é legada e não deve orientar a nossa. O que devemos replicar é a **linguagem visual de confiança institucional**: azul de governo, branco, hierarquia clara, tom sóbrio — não os componentes técnicos.

> ⚠️ **Ação pendente antes da build:** capturar prints reais do matricula.rio (ou o manual de marca "Carioca Digital", se existir) para extrair o hex exato do azul institucional e a fonte oficial, se houver uma definida pela Prefeitura. Este documento assume um azul de governo genérico até essa validação.

---

## 2. Critérios de decisão

Ordenados por peso na escolha, dado o contexto de hackathon com entrega em horas:

1. **Velocidade de entrega dentro do tempo de hackathon** — critério mais pesado. Qualquer stack que exija setup de infraestrutura (backend dedicado, banco de dados gerenciado, deploy complexo) compete diretamente com o tempo de construir as duas frentes do PRB.
2. **Responsividade nativa** — a interface precisa funcionar bem em mobile sem retrabalho manual de CSS por breakpoint.
3. **Fidelidade visual fácil de ajustar** — a stack não pode dificultar aplicar uma paleta/tipografia específica depois que validarmos a identidade real do matricula.rio.
4. **Consumo direto dos dados já tratados** (CSV/Parquet da Query A, agregações calculadas) — sem exigir um backend robusto para servir os dados.
5. **Familiaridade da equipe** — o time já trabalhou com Python/Pandas na análise das bases; reaproveitar essa linguagem no MVP reduz a curva de troca de contexto no meio do hackathon.

---

## 3. Recomendação principal

### Streamlit (Python) + componentes customizados

**Por quê:** é a mesma linha já sugerida no roadmap de MVP do PDF original (`Otimizador_Inteligente_Distribuicao_Vagas_Creches.pdf`), e resolve o critério mais pesado (velocidade) sem abrir mão de responsividade básica. Streamlit renderiza para desktop e mobile automaticamente (layout em coluna única quando a tela é estreita), e consome os DataFrames de Pandas que já usamos na análise sem camada intermediária.

| Necessidade | Como o Streamlit atende |
|---|---|
| Consumir dados tratados | Lê CSV/Parquet direto com Pandas — zero backend adicional |
| Responsivo | Grid nativo (`st.columns`) que empilha em telas estreitas |
| Identidade visual | Suporta CSS customizado via `st.markdown(..., unsafe_allow_html=True)` ou arquivo `.streamlit/config.toml` para cores base — permite aplicar a paleta do matricula.rio sem trocar de framework |
| Interatividade das 2 frentes | Widgets prontos (`selectbox`, `multiselect`, tabelas interativas) cobrem tanto o formulário de inscrição simulado (Frente 1) quanto a tela de fila de liberação (Frente 2) |
| Tempo de setup | Roda com `streamlit run app.py`, sem configurar servidor, autenticação ou build step |

**Limite honesto:** Streamlit não dá controle pixel-a-pixel de UI como um framework de front-end dedicado — para um MVP de hackathon isso é aceitável; para uma v2 pós-hackathon (ver seção 5), a recomendação muda.

---

## 4. Alternativa caso already exista preferência por front-end web "de verdade"

### React (Vite) + Tailwind CSS + API leve em Python (FastAPI)

Use esta rota **somente se** já houver alguém no time confortável com React e o tempo de hackathon permitir a etapa extra de conectar front-end a uma API.

| Peça | Papel |
|---|---|
| **React + Vite** | Interface das duas frentes (tela de inscrição simulada, tela de fila de liberação) |
| **Tailwind CSS** | Sistema de utilitários que torna trivial aplicar breakpoints responsivos (`sm:`, `md:`, `lg:`) e a paleta customizada do matricula.rio via `tailwind.config.js` |
| **FastAPI (Python)** | API mínima que expõe os cálculos já feitos em Pandas (índice de concorrência, motor de cruzamento) como endpoints JSON |

**Trade-off:** mais fiel a uma aplicação "de produto" e mais fácil de evoluir para produção depois — mas exige orquestrar 2 processos (front + API) durante a demo, o que é risco desnecessário em um MVP de poucas horas.

---

## 5. Recomendação faseada

| Horizonte | Stack | Racional |
|---|---|---|
| **MVP de hackathon (agora)** | Streamlit + Pandas | Menor caminho entre dado tratado e tela navegável; equipe já domina a linguagem |
| **V2 pós-hackathon** | React + Tailwind + FastAPI | Quando a aplicação precisar de autenticação, múltiplos usuários simultâneos (servidor da CRE vs. família) e integração real com sistemas da SME |
| **Produção (se aprovado pela SME)** | A decidir com a equipe de TI da Prefeitura | Provavelmente precisa se integrar ao ecossistema ASP.NET/.NET já existente no matricula.rio — decisão que não cabe ao hackathon definir sozinho |

---

## 6. Como aplicar a identidade visual do matricula.rio (qualquer que seja a stack)

Independente da escolha entre Streamlit ou React, a aplicação da identidade segue os mesmos passos:

1. **Confirmar a paleta oficial** — validar hex exato do azul institucional e de eventuais cores de destaque (o fetch inicial não conseguiu extrair valores exatos; recomenda-se print + inspeção de CSS do site real, ou consultar um manual de marca da Prefeitura, se existir).
2. **Tipografia de sistema como fallback seguro** — como o matricula.rio não expõe uma web font própria, usar uma pilha de fontes de sistema (`-apple-system, "Segoe UI", Roboto, sans-serif`) já entrega familiaridade visual sem risco de carregar fonte errada.
3. **Tom institucional nos componentes** — botões sólidos em azul, cantos levemente arredondados (não totalmente retos, não excessivamente arredondados), hierarquia tipográfica sóbria — evitar linguagem visual de "startup" (gradientes vibrantes, ilustrações grandes) que destoaria do contexto de governo.
4. **Responsividade mobile-first** — dado que famílias provavelmente acessam via celular (o próprio fluxo oficial já usa WhatsApp/SMS como canal), testar a tela de inscrição simulada (Frente 1) primeiro em viewport mobile, não desktop.

---

## 7. Decisões em aberto antes da build

1. **Confirmar com a equipe:** alguém tem experiência prévia com React, ou o hackathon deve ir direto para Streamlit sem essa decisão intermediária?
2. **Validar a paleta real** do matricula.rio/Carioca Digital antes de codar — evita retrabalho de estilo no meio da demo.
3. **Definir se a demo roda localmente** (`streamlit run`, compartilhando tela) **ou precisa de link público** (ex.: Streamlit Community Cloud) — isso muda o tempo reservado para deploy na Fase 3 do [`plano_mvp_hackathon.md`](plano_mvp_hackathon.md).

---

*Documento de planejamento — Claude Impact Lab 2026, dataset Inscrição Creche do Rio. Recomendação técnica; nenhuma implementação foi realizada a partir dele.*
