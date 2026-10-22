# Aceite gráfico local na máquina do Julio — 22/10/2026

Executa as medições que a [revisão](../superpowers/plans/2026-10-22-review-continuacao-python.md) e os
[resultados das correções](../superpowers/plans/2026-10-22-python-review-fixes-results.md) deixaram
pendentes nesta máquina, com os instrumentos corrigidos em `12d0e611f` e sem alterar limiares,
asserções, runtime ou fontes dos jogos.

**Ambiente:** Windows 11, Chrome 155.0.8059.85 e Edge 155.0.4283.62 headless, Bun 1.4.3,
Node 24.22.0. A distribuição foi fixada em `65c9bffd3e97d71e22bbaaf2f2dd29fbf10ee80759ad56423c0e3e4b82af022c`.
Cada spec rodou sozinha, um navegador por vez, com um único servidor de qualificação. A pilha local
foi desligada antes (`down.ts --keep-db`). Não é a máquina de referência de 8 GB.

## Resultados

| Caso | Navegador | Resultado | Duração medida | Intervalos > 2 quadros | Entrada causal p95 / máx | Pintura p95 | Tarefas longas |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| Space Arena 10 min | Chrome | passou | 600.443 ms | 4 de 30.340 | 63,7 / 66,5 ms (30/30) | 0,2 ms | 0 |
| Space Arena 10 min | Edge | passou | 600.382 ms | 6 de 30.311 | 65,5 / 66,3 ms (30/30) | 0,2 ms | 0 |
| Space Arena 30 reinícios | Chrome | passou | clique→execução p95 70 ms | | | | |
| Space Arena 30 reinícios | Edge | passou | clique→execução p95 76 ms | | | | |
| F3 10 min | Chrome | passou | 600.014 ms | 4 de 30.950 | 62,6 / 65,3 ms (30/30) | 0,2 ms | 0 |
| F3 10 min, 1ª execução | Edge | **reprovou** | 782.275 ms (prazo do teste esgotado) | 33 de 30.660 | 61,7 / 65,2 ms (30/30) | 0,1 ms | **1** |
| F3 10 min, 2ª execução | Edge | passou | 600.006 ms | 3 de 30.883 | 61,6 / 65,3 ms (30/30) | 0,2 ms | 0 |

O Space Arena manteve 51 FPS de mediana no contador do próprio jogo nos dois navegadores.

### F1 com o gate estatístico (30 amostras por fase)

| Série | Resultado do relator | p95 frio / cache / editado |
| --- | --- | ---: |
| Chrome Clássico | dentro do orçamento | 0,65 / 0,46 / 0,48 s |
| Chrome Pro, 1ª série | **`p95-exceeded`** | 0,68 / **4,80** / 0,63 s |
| Edge Clássico | dentro do orçamento | 0,70 / 0,46 / 0,56 s |
| Edge Pro | dentro do orçamento | 0,70 / 0,60 / 0,95 s |
| Chrome Pro, 2ª série | dentro do orçamento | 0,69 / 0,63 / 0,93 s |

Metas: 12 / 3 / 1,5 s. O relator reprovou a primeira execução do Chrome
(`passesBudget: false`), embora os 60 testes individuais tenham passado. Isso é o comportamento
esperado do gate corrigido.

## Negativos preservados

- **F3 Edge, 1ª execução.** A resposta às entradas permaneceu dentro do limite, mas a partida
  levou 182 s a mais que a janela, houve uma tarefa acima de 50 ms e o teste esgotou o prazo.
  O número de intervalos (30.660) é menor do que o de uma janela contínua de 600 s com o mesmo
  ritmo, o que é compatível com o navegador ter sido suspenso ou desacelerado pelo sistema. A
  causa não foi comprovada. A segunda execução, sem mudança nenhuma, passou.
- **F1 Chrome Pro, 1ª série.** As repetições 2 e 3, consecutivas, mediram 4.799 ms e 15.036 ms
  na fase com cache. As outras 28 ficaram entre 0,53 e 0,63 s. As duas amostras lentas
  baixaram os mesmos 12 recursos que as normais. Não há tempo-limite de 15 s no runtime nem no
  harness que explique o valor. Na segunda série, nenhuma das 30 amostras com cache passou de
  631 ms. A causa permanece desconhecida e deve ser observada no computador de referência.

## Evidência

Relatórios no cache desta máquina (podem conter caminhos pessoais; não versionados):

| Arquivo | SHA-256 |
| --- | --- |
| `.cache/games-accept-1022/python-space-arena-performance.spec.ts-chrome.json` | `730652c33a0294619362c09cbdb5e864684f86a62b635ea51a04f89ba5245106` |
| `.cache/games-accept-1022/python-space-arena-performance.spec.ts-edge.json` | `77a1bc4813612d8f06a85a4d8be6f98695a0ee917c56c99ee9714bbad3fdd550` |
| `.cache/games-accept-1022/python-f3-performance.spec.ts-chrome.json` | `4178b9b6d93c989a4a9fa55cfa888cbbedfabc44dd570e6d2dd1a4c286f06015` |
| `.cache/games-accept-1022/python-f3-performance.spec.ts-edge.json` (reprovado) | `869f7e5716754ec73b3f56365d1c705841a55349f63049dbd3dfa86f730c4e8b` |
| `.cache/retry-1022/f3-edge.json` | `b5f7c30c451600f63999771c3333abc49a85ffc8bf34bd0583e214ffa530b7be` |
| `.cache/f1-65c9…-chrome/f1-local-budget-59504-1792670631215.json` (reprovado) | `c2a68cd81f0bf27605347dc43366244c71a1fffb0cdfecb7ff79d14954abbb0c` |
| `.cache/f1-65c9…-msedge/f1-local-budget-8008-1792671117008.json` | `e6d073cb2b8e8b491f9334be4579343ced0835ed2b33dc124b377f594c163a88` |
| `.cache/retry-1022/f1-chrome-pro/f1-local-budget-85400-1792672097571.json` | `fa071b0d016402c4f134313c10135054f43f1e59cc70d445517f0bfb9ab25e5c` |

## Fronteiras

Fecha nesta máquina a duração de Space Arena e de F3 nos dois navegadores, os 30 reinícios do
Space Arena e uma série F1 estatística aprovada por navegador e tipo. Não fecha a máquina de
referência, aula com vídeo, F4/F7/F8/F9, memória incremental, áudio ouvido por pessoa, nem a
homologação hospedada.
