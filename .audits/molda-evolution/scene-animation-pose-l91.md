# Gravação de poses em lote: lote 91

08/09/2026, Windows, Bun 1.3.11. Benchmark CPU de comandos puros; não mede
React, histórico, persistência, GPU ou latência real de entrada.

## Comparação e prova

`bun scripts/bench-scene-animation-pose.ts` em `packages/molda`.
Controle: executar o comando público de uma chave sucessivamente. Alternativa:
gravar as mesmas entradas em um comando de lote. O controle usa o código atual;
não é uma medição histórica da implementação anterior nem uma nova função de animação.

Três aquecimentos, vinte amostras por cenário, ordem alternada para reduzir o viés
de alocação/GC do caminho anterior. JSON das animações é comparado fora das seções
cronometradas em toda execução. Nós, geometrias e imagens conservam suas referências.

| Cena / chaves novas | Sequencial p50 / p95 / máximo (ms) | Lote p50 / p95 / máximo (ms) |
| --- | --- | --- |
| 1 malha, 9.216 faces / 3 | 17,674 / 24,367 / 27,274 | 5,461 / 9,402 / 11,085 |
| 128 peças pequenas / 384 | 319,737 / 344,041 / 367,734 | 1,725 / 2,907 / 3,136 |

Repetição com profiler: sequencial/lote p95 de 26,203/8,510 ms e
332,621/3,084 ms. Resultados variam; vinte amostras não estimam caudas raras.

## Perfil e decisão

`scene-animation-pose-l91-profile.md` e `.cpuprofile`: 6,71 s, 956 amostras.
O perfil abrange os dois caminhos, preparação e oráculo; `stringify` inclui a
comparação não cronometrada. Não interpretar percentuais como perfil exclusivo do lote.
Indexação de documento/hierarquia/animação, flags, composição de matrizes e bounds
aparecem entre os custos principais, coerentes com a revalidação repetida do controle.

Uma gravação completa agora indexa/valida a cena uma vez na entrada e uma vez na
saída do comando, não uma vez por canal/peça. Validação de tuplas e orçamentos
permanece. Contexto de comandos foi extraído para manter travas/limites centralizados.

Prova de comportamento:

- Ordem: trilhas anteriores permanecem em ordem; novas seguem a primeira ocorrência
  de nó/canal. Chaves são ordenadas por tempo.
- Empates: gravar substitui a chave exata existente; entrada duplicada no mesmo lote
  é recusada. Mover/copiar conjuntos continua recusando sobreposição, como no lote 90.
- Floating-point: valores/tempos Double copiados exatamente, sem snap/normalização.
  Fixtures incluem subnormal, rotação e escala negativa/zero.
- Aleatoriedade: nenhuma; nenhuma identidade é criada ao colar uma pose.
- JSON das animações: igualdade exata entre controle e lote em todas as execuções.
- Histórico: testes de integração verificam desfazer os três canais juntos; o
  microbenchmark não inclui o custo de alocar/registrar esse histórico.

Pendências: medição em navegador/hardware, perfis maiores com histórico e renderer,
edição por gesto/autokey, prévias de presets e exportação hierárquica.
