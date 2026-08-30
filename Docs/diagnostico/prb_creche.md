# Distribuição de Vagas em Creches

**Product Requirements Brief · Rascunho de trabalho**

Cada criança pode reservar até 5 vagas simultâneas durante o processo de inscrição, com prioridade definida por um critério de vulnerabilidade. A hipótese deste PRB é que essa combinação — múltiplas reservas + fila hierárquica de vulnerabilidade sem mecanismo de liberação rápida — produz vagas ociosas em algumas unidades enquanto outras acumulam fila, alongando o tempo entre inscrição e convocação.

- **Escopo dos dados** · Processos 2021–2025 (179/181/184/194/195)
- **Base** · `01_QueryA_InscricoesPorAno` · 837.179 linhas
- **Status** · Problema validado com dados anonimizados · solução em aberto

---

## 1. Definição do problema

### 01 · Qual é o problema?

Na Inscrição Creche, cada criança pode indicar **até 5 opções** de unidade, e cada opção fica "reservada" na fila daquela unidade até ser resolvida (confirmada ou cancelada). A classificação prioriza critérios de **vulnerabilidade** — mas não existe hoje um mecanismo que libere rapidamente as demais reservas de uma criança assim que uma delas é confirmada. Como hipótese, isso gera vagas ociosas em algumas unidades e candidaturas em excesso (fila artificialmente inflada) em outras, dependendo de quão concentrada é a demanda por escola.

**Mecanismo hipotetizado:** 1 criança gera até 5 reservas simultâneas em unidades diferentes; apenas uma é confirmada, as outras 4 ficam presas até cancelamento pelo sistema — enquanto isso, outra criança na fila daquela unidade aguarda a vaga que, na prática, já estava livre.

### 02 · Quem é afetado?

| Afetado | Como é afetado |
|---|---|
| **Prefeitura** | Planejamento de rede e alocação de recursos distorcidos por fila que não reflete demanda real |
| **Servidores (SME/CREs)** | Precisam gerir manualmente o descompasso entre confirmação e vagas presas |
| **Famílias na fila** | Ficam em segundo plano aguardando uma vaga que já estava, na prática, disponível |

### 03 · Qual o contexto?

No **intervalo entre a inscrição e a convocação** — o período em que a criança está com opções em aberto (situação `Lista de espera` ou `Ativo`) até que o processo resolva cada uma delas para `Confirmado`, `Selecionado` ou algum tipo de cancelamento.

### Qual é o impacto?

| Impacto | Descrição |
|---|---|
| ↑ Tempo | Processo de convocação se estende enquanto vagas "presas" não são liberadas |
| Fila × Ociosidade | Unidades com fila longa convivem, no mesmo processo, com unidades de baixa procura |
| Desistência | Espera prolongada é gatilho plausível para famílias desistirem da rede pública |

### 04 · Quais evidências temos?

Análise sobre `01_QueryA_InscricoesPorAno.csv.gz` (837.179 linhas, 343.308 inscrições, 872 unidades, 2021–2025). Dados anonimizados — números absolutos não representam a realidade em escala, mas os **padrões relativos** abaixo são medidos diretamente na base, não estimados.

**Mais opções marcadas não aumenta a chance de confirmação — só aumenta o cancelamento pelo sistema:**

| Nº de opções | % que confirmam ao menos 1 opção | Média de cancelamentos pelo sistema |
|---|---|---|
| 1 opção | 57,5% | 0,10 |
| 2 opções | 53,9% | 0,72 |
| 3 opções | 55,6% | 1,31 |
| 4 opções | 54,1% | 1,91 |
| 5 opções | 57,0% | 2,40 |

> A taxa de confirmação fica estável entre 54–58% independentemente do nº de opções — mas quem marca 5 opções gera em média **24× mais cancelamentos pelo sistema** do que quem marca 1. Essas são reservas que ocuparam lugar na fila de outras unidades sem nunca virar matrícula.

**KPIs:**
- **55,8%** das inscrições marcam 3 ou mais opções — cada uma trava fila em múltiplas unidades ao mesmo tempo.
- **57,8%** de toda a fila de espera do sistema (178.731 registros) está concentrada em apenas **10% das unidades** (88 de 872).

**Fila de espera × vagas confirmadas, por unidade:** entre as 872 unidades, um grupo pequeno concentra fila alta com poucos confirmados (ex.: CM Rio Novo–Rio das Flores, fila 5.320 / confirmados 314), enquanto um outro grupo — majoritariamente creches parceiras (CP) — tem fila baixa (≤5) e alta confirmação.

| Achado | Origem |
|---|---|
| Taxa de confirmação não melhora com mais opções, mas cancelamentos pelo sistema sim | **medido** · Query A, agregado por (ano, inscrição) |
| 57,8% da fila está em 10% das unidades | **medido** · Query A, agregado por unidade |
| 808 de 872 unidades (92,7%) têm algum registro em lista de espera | **medido** · Query A, agregado por unidade |
| Vagas ficam "presas" por dias/semanas antes do cancelamento pelo sistema, prolongando a espera de terceiros | **hipótese** · Query A não tem data de resolução, só data de criação — validar com log de mudança de status ou nova extração |
| Concentração de fila é correlacionada a bairro/território, não só a unidade isolada | **hipótese** · cruzar com Microáreas SME/IPP e Nascidos Vivos RJ |

### 05 · Quais são as possíveis causas?

O sistema foi desenhado para **classificar por vulnerabilidade** — uma escolha de política pública correta em si. O problema aparece na combinação com outras duas regras de desenho:

- **Causa raiz nº 1** · Uma criança pode ocupar até 5 posições na fila simultaneamente (uma por opção), e ela mantém prioridade de vulnerabilidade em todas elas ao mesmo tempo.
- **Causa raiz nº 2** · Não existe um sistema de classificação/liberação complementar que, ao confirmar uma opção, libere automaticamente e de forma priorizada as demais reservas da mesma criança para a próxima família da fila.

### O que queremos alcançar?

Uma **distribuição de vagas otimizada** — reduzindo o número de vagas ociosas simultâneas a filas de espera — e um **tempo mais curto** entre inscrição e convocação, sem abrir mão do critério de prioridade por vulnerabilidade que já está em vigor.

---

## 2. Proposta de solução

### O que podemos fazer?

As duas causas-raiz sugerem duas frentes que preservam a prioridade por vulnerabilidade: uma no momento em que a família decide suas opções (lado da demanda), outra no momento em que o sistema deveria realocar vagas liberadas (lado da oferta/gestão).

**1. Usuário externo · família — Ranking de concorrência + aviso de unidade concorrida**
Ao marcar cada uma das até 5 opções na inscrição, o sistema exibe um indicador de concorrência da unidade (baseado no histórico real de fila) e um aviso quando a opção escolhida está entre as ~10% de unidades que hoje concentram 57,8% da fila de espera.

**2. Usuário interno · servidor SME/CRE — Motor de cruzamento classificação × preferência**
Ferramenta que cruza a classificação de vulnerabilidade de cada criança na fila com suas preferências declaradas, sinalizando automaticamente — a cada confirmação — quais das demais reservas da mesma criança devem ser liberadas e para qual família da fila daquela unidade.

### Como impacta o usuário?

A família passa a decidir suas 5 opções sabendo que marcar mais unidades concorridas não aumenta sua chance de confirmação, o que reduz reservas feitas "por precaução" sem intenção real de matrícula. O servidor deixa de gerir manualmente o descompasso entre confirmação e liberação — ganha um sinal automático de quem promover, exatamente nas unidades que hoje mais acumulam fila.

### Por que essa alternativa?

Atacar só o lado da família (ex.: limitar para 1 opção) removeria uma rede de segurança que existe justamente para famílias vulneráveis. Atacar só o lado do sistema (liberação automática sem visibilidade humana) não cobre exceções que hoje exigem julgamento do servidor. As duas frentes juntas miram as duas causas-raiz identificadas sem redesenhar o critério de prioridade que já funciona.

---

## 3. Critério de sucesso

### O que significa sucesso?

Menos vagas ociosas convivendo com fila ativa e convocação mais rápida, sem abrir mão do critério de vulnerabilidade — medido nas mesmas unidades que hoje concentram o problema (as ~10% com 57,8% da fila).

### O que usuário e prefeitura precisam conseguir fazer?

- **Família** precisa conseguir ver, antes de confirmar a inscrição, o nível de concorrência de cada opção escolhida — e decidir com essa informação, não às cegas.
- **Servidor/prefeitura** precisa conseguir identificar, sem trabalho manual, quais reservas de uma criança já confirmada em outro lugar devem ser liberadas — e para qual família da fila.

### Quais métricas comprovam isso?

| Métrica | Como medir | Situação hoje |
|---|---|---|
| Tempo até resolução | Dias entre criação da inscrição e confirmação/cancelamento definitivo, por unidade | **a validar** · precisa de data de resolução, não só de criação |
| Vagas ociosas com fila ativa | Nº de unidades com meta não preenchida enquanto outra unidade do mesmo processo tem fila | **calculável hoje** · na Query A |
| Cancelamentos pelo sistema por opção | Média de cancelamentos/sistema por inscrição, por nº de opções marcadas | **medido** · hoje em 2,40 para quem marca 5 opções — meta é reduzir |
| Concentração de fila | % da fila de espera total concentrada nas 10% unidades mais procuradas | **medido** · hoje em 57,8% — meta é reduzir |

---

## 4. Hipóteses simples

**Hipótese 1 · lado da família**
Se mostrarmos o nível de concorrência de cada unidade no momento da inscrição, **então** esperamos que parte das famílias inclua ao menos uma opção de menor concorrência entre suas 5 escolhas, **porque** hoje a família não sabe que marcar mais opções concorridas não aumenta sua chance de confirmação — só ocupa fila alheia.

**Hipótese 2 · lado do sistema**
Se dermos ao servidor um sinal automático que cruza classificação de vulnerabilidade com preferência declarada, **então** esperamos reduzir o tempo entre a confirmação de uma opção e a liberação priorizada das demais reservas da mesma criança, **porque** hoje esse cruzamento é feito manualmente e sem sinal de quem deveria ser promovido.

**Hipótese 3 · combinada**
Se as duas frentes rodarem juntas, **então** esperamos que a concentração de fila nas unidades mais concorridas caia abaixo dos 57,8% atuais, **porque** reduzimos reservas sem intenção real de matrícula (lado da demanda) e aceleramos a realocação das vagas que elas liberam (lado da oferta) — as duas causas-raiz do problema, atacadas ao mesmo tempo.

---

*PRB de trabalho — Claude Impact Lab 2026, dataset Inscrição Creche do Rio. Evidências calculadas sobre dados anonimizados; indicadores absolutos não representam a realidade em escala, apenas os padrões relativos aqui descritos.*
