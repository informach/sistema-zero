# Preparação da pintura de pesos: lote 124

Uma alavanca após o lote 123, sem mudança de formato ou ativação pública.
Bun 1.3.11, Ryzen 5 5600G, `scripts/bench-scene-skin-paint.ts`, três aquecimentos,
dez execuções e 32 movimentos. Sem suíte/build do agente concorrente. Processos
externos existentes não foram alterados.

## Baseline sem instrumentação

| Pontos | Preparar p50/p95 | Primeiro contato p50/p95 | Movimento p50/p95 | Confirmar p50/p95 | RSS amostrado |
| --- | --- | --- | --- | --- | --- |
| 1.024 | 0,615/0,890 ms | 2,418/9,216 ms | 0,034/0,062 ms | 0,712/1,059 ms | 261.615.616 B |
| 8.281 | 4,518/20,939 ms | 24,909/62,080 ms | 0,043/0,087 ms | 2,322/4,014 ms | 331.546.624 B |
| 131.072 | 49,079/95,405 ms | 29,397/38,041 ms | 0,034/0,101 ms | 31,969/54,271 ms | 610.709.504 B |

Os três hashes fixos passaram. O p95 varia entre processos; não omitir esta
medição por ser mais alta que as repetições do lote 123. P95 é o máximo de dez
amostras. O extremo tem 10.201 pontos na superfície, restante solto e vinculado,
20.000 triângulos. Não mede GPU, React, histórico, transporte, raycast ou autosave.
RSS amostrado no processo compartilhado, sem GC forçado, não prova memória retida.

Perfil do código atual, capturado no encerramento do lote 123, antes de qualquer
mudança deste lote: `skin-paint-l123-values`, 3,33 s/462 amostras. `Object.hasOwn`
por ponto representa 284,1 ms/8,5% de self. Inclui fixture, clonagem e conferências;
não comparar esses totais com latências sem instrumentação.

## Experimento: prova de correspondência ordenada

| Alavanca | Impacto | Confiança | Esforço | Escore |
| --- | --- | --- | --- | --- |
| Comparar os arrays de IDs já enumerados e dispensar consultas por ponto somente se forem idênticos | 4 | 5 | 2 | 10 |

- Prova: após a guarda de contagem positiva/igual, igualdade de cada ID no mesmo
  índice prova a presença de todos os pontos próprios enumeráveis da geometria.
  Não supor ordem igual; verificá-la. Se houver qualquer diferença, manter o laço
  original com `Object.hasOwn`, inclusive para uma ordem diferente porém válida.
- Erros: orçamento agregado antes de enumerar geometria; contagem antes de linhas;
  existência, quantidade de influências e pertença continuam na ordem original
  por ponto. A prova conjunta não lança erro nem muda mensagens.
- IDs: não ordenar, normalizar, filtrar ou interpretar nomes. Manter IDs numéricos,
  `__proto__`, `constructor`, ordem de influências e desempates.
- Ownership: reutilizar o array de chaves da geometria que já era alocado para
  obter sua contagem; sem Set/cache, escrita, cópia de pesos ou retenção histórica.
  Documentos são records de dados imutáveis, não proxies/getters com efeitos.
- Matemática, limites, readers e assinaturas: inalterados. O caminho alternativo
  aceita também os casos que dependem da verificação individual de propriedade.
- Risco: uma passagem linear extra pode não compensar as consultas evitadas;
  medir duas vezes, verificar hashes fixos e descartar se não houver ganho.
- Reversão: restaurar somente as linhas do experimento com `apply_patch`, sem
  reset/checkout nem alterações alheias. Testar ordens divergentes e precedência
  de erros antes da verificação integral.

## Resultado e revisão

Mantida a alavanca. A correspondência é comprovada antes de dispensar consultas;
qualquer divergência usa a via individual, sem rejeitar outra ordem válida.

| Pontos | Preparar depois 1 p50/p95 | Preparar depois 2 p50/p95 | RSS depois 1 / depois 2 |
| --- | --- | --- | --- |
| 1.024 | 0,504/1,202 ms | 0,488/1,130 ms | 244.195.328 / 245.846.016 B |
| 8.281 | 4,246/8,947 ms | 4,011/7,025 ms | 323.579.904 / 323.330.048 B |
| 131.072 | 41,274/53,447 ms | 33,808/83,023 ms | 586.334.208 / 581.226.496 B |

Extremo: p50 -15,9%/-31,1%; p95 -44,0%/-13,0%. A variação é alta e o orçamento
de 50 ms não está homologado. O caso pequeno teve aumento de p95 de 0,890 para
1,202/1,130 ms; não é ganho uniforme. Hashes e integridade da fonte passaram nas
duas medições e no perfil `skin-paint-l124-aligned` (3,12 s/452 amostras).
O hotspot de pertença por ponto saiu da lista principal; validação de quantidade
de influências aparece com 237,5 ms/7,6%. Confirmação extrema: 22,631/47,745 e
20,546/34,801 ms. Primeiro contato: 23,848/30,497 e 24,290/31,735 ms.
Movimento p95 0,062/0,039 ms. Perfil inclui preparação de fixtures/conferências.

Teste adicional cobre IDs numéricos/especiais em ordem diferente, referências,
reader e precedência de osso inválido antes de uma linha vazia posterior. Focal:
19 testes/4 arquivos passaram. A primeira execução integral passou, mas seu fim
coincidiu com o início dos builds; repetida sem novos builds/tipos concorrentes:
**1.546 testes, zero falhas, 229 arquivos, 97,31 s**. Tipos, Biome/691 arquivos e
Vite/1,08 s passaram. Kids: compilação/6,1 s, tipos/8,6 s, 59 páginas/1.429 ms,
exit 0. Diff check passou; aviso de chunk Three permanece. Sem mudanças Studio,
rollout público, teste visual/GPU ou demonstração de memória retida.
