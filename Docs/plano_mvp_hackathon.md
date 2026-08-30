# Plano de MVP — Hackathon (planejamento, sem código)

> **Tipo de documento:** plano de execução/roadmap — não é diagnóstico nem PRB.
> **Relacionado a:** [`diagnostico_solucao.md`](diagnostico_solucao.md) (dores priorizadas) e [`prb_creche.md`](prb_creche.md) (definição do problema e proposta de solução).
> **Escopo:** apenas planejamento de como construir o MVP dentro do tempo de hackathon — nenhuma linha de código foi escrita a partir deste documento.
> **Linha de solução adotada:** a proposta mais recente do PRB — duas ferramentas de apoio à decisão (família + servidor), sem algoritmo decidindo a alocação sozinho.

---

## Premissa de equipe

Dá para rodar com só 2 pessoas em paralelo (1 por frente) depois de uma etapa inicial conjunta. Se houver 3 ou mais pessoas, a pessoa extra entra na Frente 1 (tem mais superfície de UI).

---

## Fase 0 · Alinhamento e recorte (0–20 min) — todo mundo junto

- Escolher 1 processo/ano da Query A como recorte de demo (ex.: 2024 ou 2025, mais completo em unidades — 844/836 unidades vs. ~500 dos anos anteriores).
- Fixar as unidades das evidências (ex.: a unidade de maior fila do diagnóstico e um contraste de baixa fila) para usar como caso concreto no pitch — não descobrir isso na hora da demo.
- Dividir em 2 duplas/frentes a partir daqui.

---

## Frente 1 · Ranking de concorrência + aviso na inscrição (usuário externo — família)

| Tempo | Entregável | Depende de |
|---|---|---|
| 20–50 min | Definir o índice de concorrência por unidade: razão fila/confirmado discretizada em 3 faixas (baixa/média/alta), não o número cru — número cru sem contexto não orienta decisão de família. | Fase 0 |
| 50–90 min | Desenhar a tela de inscrição simulada: ao selecionar cada uma das 5 opções, mostrar a faixa de concorrência daquela unidade + um aviso textual quando cair nas ~10% mais concorridas. | índice pronto |
| 90–120 min | Popular com dados reais do recorte (não mockar) — cada unidade do dropdown carrega sua faixa real calculada da base. | dados + tela |
| 120–140 min | Tela de "resumo da inscrição": mostra as 5 escolhas da família lado a lado com sua concorrência, para reforçar o efeito pedagógico do aviso. | tela pronta |

**Ponto de decisão explícito a levar para o pitch:** o aviso é informativo, não bloqueia a escolha — a família pode ignorar e marcar mesmo assim. Isso precisa estar dito em voz alta na demo, porque é o que sustenta "não tira liberdade de escolha".

---

## Frente 2 · Motor de cruzamento classificação × preferência (usuário interno — servidor)

| Tempo | Entregável | Depende de |
|---|---|---|
| 20–60 min | Implementar a lógica de cruzamento: para cada criança com 1 opção confirmada, listar as demais opções ainda abertas dela e a próxima criança da fila de cada uma (por ordem de classificação oficial). | Fase 0 |
| 60–100 min | Tela de "fila de liberação": lista de vagas que deveriam ser liberadas agora, com a criança atual (já confirmada em outro lugar) e quem deveria ser promovido no lugar. | lógica pronta |
| 100–130 min | Indicador de "vagas travadas neste momento" — contagem em tempo real de quantas reservas sem desfecho existem no recorte, para mostrar o antes. | lógica pronta |
| 130–150 min | Simular "clique de liberar" — não precisa escrever de volta no banco, só mostrar visualmente o antes/depois da fila daquela unidade. | tela pronta |

**Ponto de decisão explícito a levar para o pitch:** o motor **sinaliza**, o servidor **decide** — mantém humano no loop, o que evita a objeção "o algoritmo tirou o julgamento de quem entende o caso".

---

## Fase 3 · Convergência e narrativa (150–180 min) — todo mundo junto

| Tempo | Entregável |
|---|---|
| 150–165 min | Integrar as 2 telas num único app/apresentação; conferir que os números batem entre Frente 1 e Frente 2 (mesmo recorte de dados). |
| 165–175 min | Slide de Antes × Depois com os números do diagnóstico: concentração de fila nas unidades mais concorridas, aumento de cancelamentos pelo sistema conforme o nº de opções marcadas, % de inscrições com 3+ opções, tempo médio de fila nas unidades críticas. |
| 175–180 min | Ensaiar a fala das 3 hipóteses do PRB como "o que vamos aprender se isso for pro ar" — não prometer resultado, prometer teste. |

---

## Decisões em aberto antes da build

Estas não são técnicas — são de produto, e travam entregáveis se ficarem em aberto durante a execução:

1. **O aviso de concorrência mostra o número exato da fila, ou só uma faixa (baixa/média/alta)?** Número exato é mais "dado", mas pode assustar/constranger a família publicamente. Faixa é mais defensável eticamente, mas menos "impressionante" na demo.
2. **O motor de cruzamento roda automaticamente ou só quando o servidor clica "verificar"?** Automático é mais robusto como narrativa de produto; sob demanda é mais fácil de demonstrar sem parecer que decide sozinho.
3. **Qual unidade real vira o "caso de uso" do pitch?** Recomenda-se travar isso na Fase 0 para a Frente 1 e a Frente 2 usarem o mesmo exemplo — evita retrabalho de narrativa no fim.

---

*Plano de trabalho — Claude Impact Lab 2026, dataset Inscrição Creche do Rio. Documento de planejamento; nenhuma implementação foi realizada a partir dele.*
