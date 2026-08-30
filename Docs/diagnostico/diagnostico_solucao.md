# Diagnóstico e Solução — Vagas em Creches

**Claude Impact Lab · Prefeitura do Rio / SME · Desafio VTEX**

Consolidação do briefing oficial do desafio (3 eixos: Planejamento, Inscrição/Classificação, Convocação), da proposta de MVP recebida e das evidências quantitativas extraídas da base de 837.179 opções de inscrição (2021–2025). Este documento traz as dores priorizadas e a solução recomendada para atacá-las dentro do tempo de um hackathon.

Papéis aplicados na análise: consultoria de dados, análise de requisitos, gestão de projeto e UX.

---

## Contexto — O briefing oficial, eixo por eixo

A SME organiza o desafio em 3 etapas operacionais, geridas pelo nível central + 11 CREs + 872 unidades escolares. É nessas etapas que a própria Prefeitura já aponta onde a lógica quebra — e os dados confirmam quantitativamente dois desses pontos.

### Eixo 1 — Planejamento

O planejamento de vagas se ancora, prioritariamente, na demanda histórica — a fila do ano anterior como bússola. Cada CRE ajusta a oferta com base na sua realidade local, sem um sinal territorial ou preditivo mais fino.

**Onde quebra:** um modelo só retrospectivo não antecipa onde a demanda vai se concentrar — e os dados mostram que ela se concentra muito: 57,8% da fila de espera do sistema está em apenas 10% das unidades.

### Eixo 2 — Inscrição e Classificação

Família se inscreve e escolhe até 5 unidades no matricula.rio, sem qualquer critério de distância ou território. A classificação roda por total de escolhas por unidade — não por CPF — e o sistema chega a ofertar até 5 vagas para o mesmo CPF simultaneamente.

**Onde quebra:** escolha livre sem filtro geográfico gera opções inviáveis (creches longe de casa) que viram cancelamento certo; e classificar por unidade em vez de por família cria pontos cegos na convocação. Isso bate com o que vemos na base: quem marca 5 opções gera 24× mais cancelamentos pelo sistema do que quem marca 1, sem qualquer ganho na taxa de confirmação final (~54–58% em todos os casos).

### Eixo 3 — Convocação

Hoje é manual e lento: quando surge vaga, a escola faz 1 tentativa de contato por dia durante 3 dias (telefone, e-mail, WhatsApp ou SMS); a família tem 3 dias úteis para confirmar, com possível extensão de +1 dia mediante justificativa.

**Onde quebra:** não localizar a família ou não obter resposta a tempo retira a criança da lista e passa a vaga adiante — manual, repetitivo, e com potencial claro de automação. Cada tentativa é 1 dia a mais de vaga parada.

> A jornada completa do cidadão: inscrição (CPF + até 5 opções) → comprovação de critérios de vulnerabilidade (CadÚnico/Bolsa Família via Registro Municipal Integrado) → classificação publicada em Diário Oficial → confirmação de matrícula → lista de espera com períodos de convocação. O **Registro Municipal Integrado** já confirma parte dos critérios via datalake, o que é uma peça de infraestrutura que a solução pode reaproveitar.

---

## Diagnóstico — As 4 dores priorizadas

Cruzando o briefing com a base `01_QueryA_InscricoesPorAno` (837.179 linhas, 343.308 inscrições, 872 unidades). Ordenadas por severidade × facilidade de comprovação com os dados disponíveis.

**Números-chave:**
- **57,8%** da fila de espera concentrada em 10% das unidades (88 de 872)
- **24×** mais cancelamentos pelo sistema ao marcar 5 opções vs. 1, sem ganho de confirmação
- **3+3+1 dias** de tentativa de contato + confirmação + extensão, manuais, por vaga liberada

### 01 · Classificação por unidade, não por criança — "vagas fantasmas" reservadas — `crítica`

O sistema classifica e distribui vagas olhando cada opção isoladamente, oferecendo até 5 vagas para o mesmo CPF ao mesmo tempo. Uma criança pode estar simultaneamente "ativa" ou "em lista de espera" em várias unidades, travando fila para outras famílias enquanto sua situação não se resolve.

- **Evidência:** quem marca **5 opções** gera em média **2,40 cancelamentos pelo sistema**; quem marca **1 opção** gera **0,10** — 24× mais reservas que nunca viram matrícula, sem qualquer diferença na taxa de confirmação (~55%).

### 02 · Escolha sem critério territorial gera opções inviáveis — `crítica`

A família escolhe livremente até 5 unidades no matricula.rio, sem checagem de distância. Isso é apontado pela própria SME como ponto crítico do fluxo: opções longe de casa quase sempre viram cancelamento, mas ocupam posição na fila até esse desfecho.

- **Evidência:** **39,0%** de todas as opções da base terminam em "Cancelado pelo sistema" — a maior fatia entre todos os desfechos possíveis, maior até que "Confirmado" (23,0%).

### 03 · Demanda extremamente desigual entre unidades — algumas afogadas, outras vazias — `alta`

O planejamento por CRE, ancorado na fila histórica, não corrige a desigualdade: algumas unidades acumulam milhares de registros em espera enquanto outras (majoritariamente parceiras) mal preenchem sua meta.

- **Evidência:** **808 de 872 unidades (92,7%)** têm ao menos 1 registro em lista de espera, mas a unidade mais pressionada da base tem fila de **5.320** contra apenas **314 confirmados** — enquanto dezenas de unidades têm fila ≤5 com centenas de confirmados.

### 04 · Convocação manual multiplica o tempo de vaga parada — `alta`

Cada vaga liberada exige contato manual repetido (1 tentativa/dia por até 3 dias) e aguarda até 4 dias úteis de resposta da família — processo hoje sem rastreio automatizado, plenamente reconhecido pela própria SME como "onde a agilidade falta".

- **Evidência:** até **7 dias corridos** de janela manual por tentativa de convocação (não contando indisponibilidade de contato) — tempo em que a vaga permanece indisponível para a próxima criança da fila.

---

## Stakeholders — Quem sente cada dor

| Quem | Dor |
|---|---|
| 🏛️ SME / nível central | Planeja oferta com visão só retrospectiva; não tem visibilidade agregada de onde a fila é real vs. artificial. |
| 🏢 CREs e escolas | Sobrecarregadas com convocação manual e retrabalho de contato repetido para vagas que talvez nem sejam preenchidas. |
| 👨‍👩‍👧 Famílias na fila | Aguardam vagas que, na prática, já estavam ociosas — atraso e risco de desistência por falta de resposta a tempo. |

---

## Recomendação — Otimizador de Distribuição de Vagas

Entre as opções possíveis (mudar o formulário de inscrição, criar um índice preditivo de planejamento, ou reformar o processo de convocação), a que ataca a causa raiz mais barata e mais rápida de entregar é uma **camada de otimização entre inscrição e convocação** — sem mexer em política pública, sem exigir mudança de lei ou de sistema legado.

### Otimizador Inteligente de Distribuição de Vagas *(recomendado)*

A família continua escolhendo livremente suas até 5 creches. Um algoritmo de alocação entra **depois da inscrição e antes da convocação**, olhando o conjunto de inscrições e vagas de uma vez — não fila por fila isolada — para sugerir a distribuição que preenche mais vagas, mais rápido, sem violar a ordem de prioridade por vulnerabilidade.

**Pilares do motor:**

| Pilar | Descrição |
|---|---|
| Preferências | Ordem das opções 1 a 5 da família, preservada como está hoje |
| Classificação oficial | Critérios e pontuação de vulnerabilidade continuam intocados |
| Vagas reais | Quantidade disponível por unidade, grupamento e turno |
| Compatibilidade | Grupamento etário, turno e demais restrições respeitadas |

**Princípios:**

- Não altera critérios de vulnerabilidade nem decide quem "merece" a vaga — só resolve o problema de alocação combinatória que hoje é tratado fila a fila.
- Não retira da família a liberdade de escolha — ela continua indicando até 5 opções normalmente.
- Resolve por criança (CPF), não por unidade isolada — elimina o cenário de 5 vagas ofertadas ao mesmo CPF ao mesmo tempo.
- Atua como camada adicional de eficiência operacional sobre o processo existente — sem exigir reforma de sistema legado.

### Mecanismo — como resolve a dor nº 1

**Hoje (fila por unidade, isolada):** cada criança reserva em várias unidades ao mesmo tempo (ex.: Ana → A→B→C→D→E, Bruno → A→C→F, Carla → B→D); só uma opção confirma, o resto vira cancelamento tardio pelo sistema.

**Com o otimizador (visão de conjunto):** o algoritmo aloca no máximo 1 vaga por criança, respeitando a ordem de preferência e a classificação oficial — ex.: Ana → B (2ª preferência), Bruno → A (1ª preferência), Carla → D (2ª preferência). Só a combinação final passa a ser decidida em conjunto; classificação oficial e ordem de preferência continuam preservadas.

Este é exatamente o exemplo simplificado descrito na proposta de MVP recebida (`Otimizador_Inteligente_Distribuicao_Vagas_Creches.pdf`), conectado às evidências calculadas na base real.

---

## Execução — Roadmap de entrega (MVP em ~3h)

| Fase | Entrega |
|---|---|
| **0–30 min** | Entender tabelas, chaves e regras. Selecionar um recorte consistente (ex.: 1 ano/processo, unidades de uma CRE) usando o dicionário de dados já validado nas Queries A–D. |
| **30–90 min** | Algoritmo de alocação + cenário base. Implementar alocação simples (ex.: greedy por prioridade oficial + preferência) e calcular os indicadores do cenário atual (vagas ociosas, filas, tempo). |
| **90–135 min** | Interface Streamlit. 3 telas: Visão Geral (inscrições/opções/vagas/unidades), Problema (unidades com maior/menor pressão), Simular Distribuição (botão "Otimizar" comparando antes × depois). |
| **135–165 min** | Antes × Depois e indicadores de impacto. Vagas preenchidas, crianças alocadas, % atendido na 1ª/2ª/demais preferências, vagas restantes — todos calculados a partir do recorte real, nenhum número inventado. |
| **165–180 min** | Testar demo e narrativa do pitch. Validar o fluxo fim a fim e preparar a mensagem central: liberdade de escolha e critérios oficiais preservados, ganho de eficiência na camada de distribuição. |

> Fora do escopo do MVP de 3h, mas relevantes para uma v2: automação da convocação (Eixo 3) e um índice preditivo de planejamento territorial (Eixo 1) — ambos exigem integração de sistemas que o hackathon não comporta.

---

## Validação — Como medir se funcionou

| Métrica | Descrição |
|---|---|
| ⏱ Tempo até resolução | Dias entre criação da inscrição e desfecho final (confirmação ou cancelamento definitivo), comparando cenário base × otimizado. |
| 📭 Vagas ociosas simultâneas | Nº de unidades com meta não preenchida enquanto há fila ativa em outra unidade no mesmo processo. |
| 🎯 % atendido na 1ª/2ª preferência | Mostra que otimizar não significa ignorar a vontade da família — o objetivo é preencher mais rápido, não realocar contra a preferência. |
| 🔁 Cancelamentos pelo sistema evitados | Redução do indicador que hoje é 39% de todas as opções — o maior desfecho da base. |

> Princípio inegociável da proposta original: **nenhum número de impacto deve ser inventado**. Todo percentual apresentado no pitch precisa vir do recorte de dados efetivamente analisado.

---

## Limites — Riscos e o que a solução não faz

| Limite | Por quê |
|---|---|
| Não altera critérios de vulnerabilidade | Decisão de política pública, fora do escopo técnico — o otimizador só resolve a combinação final entre preferência e vaga. |
| Não decide "quem merece" a vaga | Ordem de prioridade oficial é um input do algoritmo, nunca um output alterado por ele. |
| Query A não tem data de resolução, só data de criação | A métrica de "tempo até resolução" fica mais precisa com uma futura extração trazendo timestamp de mudança de status — hoje é estimada, não exata. |
| Não dispensa a automação da convocação (Eixo 3) | Mesmo com alocação ótima, se o contato final com a família continuar manual, parte do ganho de tempo se perde na etapa seguinte. |
| Não é ML/agente — é otimização combinatória | Escolha deliberada da proposta original: mais explicável, mais rápido de validar e defender no pitch do que um modelo de caixa-preta. |

---

*Diagnóstico consolidado a partir de: briefing oficial do desafio (slides SME/VTEX), `Otimizador_Inteligente_Distribuicao_Vagas_Creches.pdf`, e análise quantitativa da base `01_QueryA_InscricoesPorAno.csv.gz` (837.179 linhas, 2021–2025). Dados anonimizados — indicadores absolutos não representam a realidade em escala; os padrões relativos citados foram medidos diretamente na base.*
