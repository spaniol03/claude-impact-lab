# Comparativo · Distribuição de Vagas com e sem Rankeamento de Escolas

**Levantamento quantitativo sobre `01_QueryA_InscricoesPorAno` · dois cenários para as métricas do [PRB de Creches](prb_creche.md)**

Este documento mede, na base real anonimizada, as métricas de sucesso definidas no PRB em **dois cenários**:

| Cenário | Descrição |
|---|---|
| **A · Atual (sem rankeamento)** | O processo como está: a família marca até 5 opções sem ver o nível de concorrência de cada unidade. Todos os números vêm direto da Query A. |
| **B · Com rankeamento de escolas** | A proposta nº 1 do PRB: ao marcar cada opção, a família vê um indicador de concorrência e um aviso quando a unidade está entre as ~10% que concentram a maior fila. Cenário **simulado** sobre a Query A com regra de substituição explícita (ver §4). |

> ⚠️ **Natureza dos números.** O Cenário A é medição direta. O Cenário B é uma simulação contrafactual — não é previsão. Serve para dimensionar a *direção* e a *ordem de grandeza* do efeito, sob premissas declaradas e testadas em faixa (§4). Dados anonimizados: indicadores absolutos não representam a realidade em escala, apenas os padrões relativos.

- **Escopo** · Processos 2021–2025 (179/181/184/194/195) · 837.179 linhas · 343.308 inscrições · 872 unidades
- **Grão** · uma linha por opção de creche escolhida; inscrição = `(prm_id, plm_id, ipl_id)`
- **Unidades concorridas** · as 88 unidades (10% de 872) com maior volume em `Lista de espera` — concentram 57,8% da fila total

---

## 1. Resumo executivo

| Métrica do PRB | A · Atual | B · Com rankeamento (central) | Δ |
|---|---:|---:|---:|
| Concentração da fila nas 10% unidades mais procuradas | **57,8%** | **53,0%** | **−4,8 p.p.** |
| Fila de espera total (registros) | 178.731 | 159.040 | **−11%** |
| Inscrições que marcam 3+ opções | 41,4% | 40,6% | −0,8 p.p. |
| Taxa de confirmação global (≥1 opção confirmada) | 56,1% | 57,6% | +1,5 p.p. |
| Taxa de confirmação — quem marca 5 opções | 57,0% | 64,0% | **+7,0 p.p.** |
| Cancelamentos pelo sistema (total de linhas) | 326.316 | 321.499 | −1,5% |
| Média de cancel. pelo sistema — coorte de 5 opções | 2,40 | 2,34 | −0,06 |
| Tempo até resolução | não calculável na Query A — proxy: fila à frente cai ~11% (§3.6) | | |

**Leitura.** O rankeamento move o ponteiro forte em **duas** métricas: a concentração da fila (o alvo explícito do PRB) e a taxa de confirmação de quem hoje marca muitas opções concorridas. O efeito sobre o *volume total* de cancelamentos pelo sistema é modesto — porque a maior parte desse cancelamento acontece em unidades **não** concorridas (opções inviáveis por distância, não por disputa), que o rankeamento de concorrência não endereça.

---

## 2. Cenário A — Situação atual (medição direta)

### 2.1 Mais opções não aumentam a chance de confirmação

| Nº de opções | Inscrições | % que confirmam ≥1 opção | Média de cancelamentos pelo sistema |
|---:|---:|---:|---:|
| 1 | 132.891 | 57,5% | 0,10 |
| 2 | 68.152 | 53,9% | 0,72 |
| 3 | 56.704 | 55,6% | 1,31 |
| 4 | 29.938 | 54,1% | 1,91 |
| 5 | 55.618 | 57,0% | 2,40 |

Reproduz exatamente a tabela do PRB (§04). A taxa de confirmação fica entre 54–58% **independente** do nº de opções; quem marca 5 gera 24× mais cancelamentos pelo sistema do que quem marca 1.

### 2.2 KPIs de fila

| Indicador | Valor | Observação |
|---|---:|---|
| Fila de espera total | 178.731 | linhas em `Lista de espera` |
| Concentração nas 10% unidades mais procuradas (88 de 872) | **57,8%** | bate com o PRB |
| Unidades com ≥1 registro em lista de espera | 808 (92,7%) | bate com o PRB |
| `Cancelado pelo sistema` no total da base | 326.316 (39,0%) | maior desfecho, acima de `Confirmado` (23,0%) |
| Inscrições que marcam **3+ opções** | **41,4%** (142.265) | ver nota abaixo |

> **Nota sobre o "55,8%" do PRB.** O PRB (§04, KPIs) cita *"55,8% das inscrições marcam 3 ou mais opções"*. Recalculando sobre a base completa com inscrição = `(prm_id, plm_id, ipl_id)` — a mesma chave que reproduz todas as outras tabelas do PRD — o valor é **41,4% das inscrições** (ou 67,6% das *linhas de opção*, ou 50,0% por par aluno-ano). Não foi possível reproduzir 55,8% com nenhuma das definições testadas; adotamos 41,4% aqui e sinalizamos a divergência para conferência na fonte.

### 2.3 Opções em unidades concorridas × não concorridas — desfechos muito diferentes

| Desfecho da opção | Em unidade concorrida | Em unidade não concorrida |
|---|---:|---:|
| `Lista de espera` | **43,6%** | 12,6% |
| `Cancelado pelo sistema` | 34,8% | **40,6%** |
| `Confirmado` | 12,1% | 27,3% |
| `Cancelado na confirmacao` | 7,7% | 16,8% |

Uma opção marcada numa unidade concorrida tem **3,6× mais** chance de ficar presa em lista de espera e **2,3× menos** chance de confirmar. É exatamente a reserva que trava a fila de terceiros descrita no PRB.

### 2.4 Quanta demanda é "empilhada" nas unidades concorridas

| Nº de opções da inscrição em unidades concorridas | Inscrições |
|---:|---:|
| 0 | 218.111 |
| 1 | 68.734 |
| 2 | 25.818 |
| 3 | 13.746 |
| 4 | 9.060 |
| 5 | 7.839 |

**56.463 inscrições (16,4%)** marcam 2 ou mais opções em unidades concorridas — 7.839 delas gastam **todas as 5** opções em unidades disputadas, sem nenhuma alternativa de menor concorrência.

### 2.5 Vagas ociosas convivendo com fila ativa (por processo)

| Ano | Unidades | Saturadas (fila ≥50 e > 2× confirmados) | Baixa procura (fila ≤5) | Confirmados nas de baixa procura |
|---:|---:|---:|---:|---:|
| 2021 | 514 | 191 | 78 | 3.595 |
| 2022 | 511 | 82 | 186 | 11.470 |
| 2023 | 496 | 77 | 188 | 8.719 |
| 2024 | 844 | 63 | 400 | 22.258 |
| 2025 | 836 | 35 | 535 | 29.218 |

Em **todos** os processos, dezenas a centenas de unidades saturadas coexistem com centenas de unidades de baixa procura no mesmo ano — a assimetria "fila × ociosidade" do PRB, medível hoje.

---

## 3. Cenário B — Com rankeamento de escolas

### 3.1 Métricas por nº de opções (cenário central: `s=0,35` / `d=0,35`)

| Nº de opções | Inscrições | % confirma ≥1 (A → B) | Média cancel. sistema (A → B, coorte fixa) |
|---:|---:|---:|---:|
| 1 | 132.891 | 57,5% → 57,1% | 0,10 → 0,10 |
| 2 | 68.152 | 53,9% → 54,3% | 0,72 → 0,72 |
| 3 | 56.704 | 55,6% → 57,5% | 1,31 → 1,29 |
| 4 | 29.938 | 54,1% → 57,3% | 1,91 → 1,87 |
| 5 | 55.618 | 57,0% → **64,0%** | 2,40 → 2,34 |

*(% confirma pela nova composição de buckets; média de cancelamento medida na coorte fixada pelo nº de opções do baseline, para não confundir efeito real com migração de bucket.)*

O ganho se concentra em quem marcava **4–5 opções concorridas**: ao trocar parte dessas opções por unidades com folga, a inscrição passa a ter uma opção que de fato converte.

### 3.2 KPIs de fila (A → B)

| Indicador | A · Atual | B · central | B · faixa (`s` 0,20–0,50) |
|---|---:|---:|---:|
| Concentração nas 10% unidades | 57,8% | **53,0%** | 55,1% → 50,9% |
| Fila de espera total | 178.731 | 159.040 | 167.404 → 150.742 |
| Redução da fila total | — | −11% | −6% → −16% |
| `Cancelado pelo sistema` (total) | 326.316 | 321.499 | 323.991 → 318.474 |
| Inscrições com 3+ opções | 41,4% | 40,6% | 41,1% → 40,1% |
| Taxa de confirmação global | 56,1% | 57,6% | 57,1% → 57,9% |

### 3.3 O que a métrica de cancelamento pelo sistema revela

O total de `Cancelado pelo sistema` cai pouco (−1,5% no central, até −2,4% no cenário agressivo). Motivo: **60% desse cancelamento já ocorre em unidades não concorridas** (opções inviáveis por distância/território — a dor nº 2 do diagnóstico), que um ranking *de concorrência* não toca. O rankeamento ataca a fração do cancelamento ligada a **disputa**, não a de **inviabilidade geográfica** — para essa, o PRB e o diagnóstico apontam um filtro territorial / o otimizador de alocação.

### 3.4 Concentração da fila — o alvo explícito do PRB

O PRB fixa como meta *"a concentração de fila nas unidades mais concorridas caia abaixo dos 57,8% atuais"* (Hipótese 3). Todos os parametros testados atingem a meta:

```
57,8%  ██████████████████████████████  A · Atual
55,1%  ███████████████████████████     B · s=0,20
53,0%  █████████████████████████       B · s=0,35 (central)
50,9%  ███████████████████████         B · s=0,50
```

### 3.5 Efeito sobre "vagas ociosas com fila ativa"

As ~25 mil opções redirecionadas para unidades com folga (cenário central) migram fila **das saturadas para as de baixa procura**. As unidades de baixa procura absorvem melhor porque têm taxa de confirmação de 46,5% (vs. 12,1% nas concorridas). O nº de unidades saturadas cai; o nº de unidades ociosas com fila zero também cai (parte delas passa a ter fila real). A assimetria da §2.5 diminui, mas não desaparece — o rankeamento é lado-demanda; fechar o buraco exige o motor de realocação (proposta nº 2 do PRB).

### 3.6 Tempo até resolução

**Não calculável em nenhum cenário com a Query A** — a base tem `data_criacao`, não data de resolução (limitação já registrada no PRB §4 e no diagnóstico). Proxy possível: o tempo de espera de uma família é ~proporcional ao tamanho da fila à sua frente na unidade. Com a fila total caindo 11% (central) e a fila das unidades concorridas caindo mais que isso, a expectativa direcional é de **encurtamento proporcional** do intervalo inscrição→convocação nas unidades que hoje concentram o problema. Confirmar exige extração com log de mudança de status.

---

## 4. Como o Cenário B foi simulado

**Regra de substituição.** Para cada inscrição, identificam-se as opções em unidades concorridas com `opcao ≥ 2` (mantém-se sempre a opção concorrida de melhor preferência — o rankeamento informa, não proíbe). Dessas opções "excedentes":

- uma fração **`s`** é efetivamente redirecionada pela família ao ver o aviso de concorrência;
- dentro dessas, uma fração **`d`** eram reservas "por precaução" e simplesmente **deixam de ser feitas** (a inscrição fica com menos opções);
- as demais **migram para uma unidade com folga** (não concorrida, fila ≤5), e recebem o desfecho segundo a distribuição real observada nessas unidades (46,5% `Confirmado`, 32,6% `Cancelado pelo sistema`, …).

**Parâmetros testados:**

| Cenário | `s` (redireciona) | `d` (some por precaução) | Opções que somem | Opções que migram |
|---|---:|---:|---:|---:|
| Conservador | 0,20 | 0,30 | 6.711 | 15.658 |
| **Central** | **0,35** | **0,35** | **13.701** | **25.445** |
| Agressivo | 0,50 | 0,40 | 22.369 | 33.554 |

**O que a simulação preserva:** a ordem de preferência declarada, o critério de classificação por vulnerabilidade (nenhuma opção muda de posição na fila por prioridade), e o direito da família de marcar até 5 opções.

**Limites da simulação:**

- Não modela equilíbrio: se muitas famílias migrarem para as *mesmas* unidades de folga, elas deixam de ter folga. O efeito real de longo prazo é provavelmente menor que o cenário agressivo.
- Assume que a família redireciona para uma unidade com folga qualquer; na prática ela escolheria dentro do seu território.
- `s` e `d` são premissas comportamentais sem série histórica que as calibre — daí a faixa. O PRB Hipótese 1 sustenta a *direção* ("parte das famílias inclui ao menos uma opção de menor concorrência"), não a magnitude.
- A distribuição de desfecho nas unidades de folga é herdada do passado (sem rankeamento); com rankeamento essas unidades recebem demanda mais intencional, o que tenderia a *melhorar* a taxa de confirmação — ou seja, o Cenário B aqui é conservador nesse ponto.

---

## 5. Conclusão

| Pergunta | Resposta pelos dados |
|---|---|
| O rankeamento reduz a concentração da fila abaixo de 57,8%? | **Sim**, em toda a faixa testada (50,9%–55,1%; central 53,0%). |
| Reduz a fila total? | **Sim**, −6% a −16% (central −11%). |
| Melhora a taxa de confirmação de quem marca muitas opções? | **Sim, forte** — coorte de 5 opções vai de 57,0% para 64,0%. |
| Reduz o volume total de cancelamentos pelo sistema? | **Pouco** (−1,5%): a maior parte desse cancelamento é por inviabilidade geográfica, não por disputa. |
| Resolve as vagas ociosas com fila ativa? | **Parcialmente** — atenua a assimetria; fechar exige o motor de realocação (proposta nº 2). |
| Encurta o tempo até convocação? | **Direcionalmente sim** (proxy pela fila), não mensurável sem data de resolução. |

O rankeamento de escolas é uma intervenção **de lado-demanda barata** que acerta o alvo principal do PRB (concentração de fila) e melhora muito a experiência de quem hoje "empilha" opções concorridas. Não substitui as intervenções de lado-oferta (motor de realocação) nem o tratamento da inviabilidade geográfica (filtro territorial / otimizador de alocação) — é complementar a elas, como o próprio PRB coloca na Hipótese 3.

---

*Reprodutível a partir de `Bases de dados/dadoscreche-main/Bases IC_ ClassificadoseFila/01_QueryA_InscricoesPorAno.csv.gz`. Métricas do Cenário A medidas diretamente; Cenário B simulado com a regra da §4. Claude Impact Lab 2026.*
