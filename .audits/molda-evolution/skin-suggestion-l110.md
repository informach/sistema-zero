# Lote 110: retorno da sugestão de pesos

## Antes da alteração

Windows, Bun 1.3.11, Ryzen 5 5600G. Três aquecimentos e dez amostras por caso,
sem testes/builds simultâneos desta execução. CPU/transporte real, não navegador/GPU.
O benchmark calcula hashes fora do intervalo cronometrado e verifica documento
inalterado e buffers do chamador anexados. RSS é amostrado após cada execução,
não pico absoluto nem memória atribuível apenas à sugestão. p95/p99, com dez
amostras, coincidem com o máximo e não caracterizam uma distribuição de produção.

| Pontos/juntas | Preparação p50/p95 ms | Envio p50/p95 ms | Retorno/resolução p50/p95 ms | Total p50/p95 ms | RSS amostrado bytes |
| --- | --- | --- | --- | --- | --- |
| 1.024/16 | 0,732/1,081 | 0,823/3,509 | 1,022/1,674 | 31,612/38,135 | 592125952 |
| 8.192/64 | 3,517/4,984 | 3,101/4,271 | 6,055/9,977 | 78,774/83,767 | 1019113472 |
| 131.072/256 | 81,848/94,470 | 94,810/106,558 | 154,828/206,638 | 3144,717/3176,254 | 1550376960 |

Referências SHA-256 de JSON.stringify(result), capturadas antes da mudança:

```
1024/16    2494349f09bc26c1e0e89d45f1b82c88ad98a306ff77b968ab732324330223e1
8192/64    3d61fb6128fe09398380464f68b7cc0eae2e0ff72b0c34fd4689501fd784fc3d
131072/256 2efdb97bdc22d9cd94468c16e6f367ff1ecd938188b8ff1d8b186d8c40489c36
```

Perfil do caller: `skin-suggestion-l110-before.cpuprofile`, produzido pelo Bun
com o mesmo cálculo, antes da instrumentação adicional de retorno. Entre os cinco
maiores contadores de amostras exclusivas: postMessage 69, stringify 58 (oráculo,
fora da medição), callback de skinWeights.ts:15 51, fromEntries 44, Set 41.
O callback do leitor de resposta soma 39; readSceneSkinInfluences soma mais 18.
Contadores de amostras não são duração de parede; o worker não aparece neste perfil.

## Uma alavanca: não reler/copiar a linha recém-construída

O leitor já verifica o tipo e tamanho dos buffers, os índices, cada peso finito
entre zero e um, a representabilidade positiva e o slot vazio. IDs vêm do pedido
estritamente lido e próprio. A linha criada localmente tem somente jointId/weight,
um ou dois itens próprios. Revalidar sua estrutura, IDs e limites genéricos e copiá-la
novamente não acrescenta proteção. Restam verificar duplicação e soma localmente,
com as mesmas mensagens/caminhos e a mesma tolerância do leitor canônico.

Oportunidade: impacto 3 × confiança 5 / esforço 2 = **7,5**.

Prova prevista:

- Ordem dos pontos e influências preservada; nenhum sort ou algoritmo geométrico muda.
- Desempate preservado: o cálculo no worker permanece intacto.
- Double e ordem de soma preservados: zero + primeiro peso + segundo peso positivo.
- Não normalizar, arredondar, remover influência positiva ou inventar osso.
- Sem RNG; saída própria sem referências aos buffers recebidos.
- Comparar os três hashes e testar o leitor canônico como oráculo nos limites de soma.

Rollback: reverter somente este hunk do leitor com apply_patch, restaurando a chamada
readNormalizedSceneSkinInfluences/import. Não usar reset/checkout na árvore com
alterações anteriores. Sem commit automático.

## Depois

Mesma instrumentação, sem profiler na comparação de tempos:

| Pontos/juntas | Preparação p50/p95 ms | Envio p50/p95 ms | Retorno/resolução p50/p95 ms | Total p50/p95 ms | RSS amostrado bytes |
| --- | --- | --- | --- | --- | --- |
| 1.024/16 | 0,862/1,091 | 0,749/0,809 | 0,529/0,697 | 30,781/34,089 | 600760320 |
| 8.192/64 | 4,588/6,379 | 3,527/4,676 | 1,801/2,442 | 77,960/87,894 | 1000914944 |
| 131.072/256 | 80,043/93,264 | 82,653/92,140 | 48,588/57,820 | 3011,772/3034,530 | 1589092352 |

Os três hashes coincidiram. A mediana de retorno do caso extremo caiu 68,6%; o
total caiu 4,2% nesta amostra. Não há redução demonstrada de memória; RSS amostrado
foi maior em dois casos. Preparação/envio não foram alterados, e ainda podem bloquear
a interface por mais de 50 ms. O total do caso médio tem p95 maior nesta amostra.

Reperfilamento separado: `skin-suggestion-l110-after.cpuprofile`. Agora postMessage
97 amostras exclusivas e prepareSceneSkinSuggestion:85 42 lideram; o callback
redundante de skinWeights não aparece mais. Os três hashes passaram novamente,
com a comparação agora embutida no script. Não misturar tempos dessa execução com
os tempos sem profiler acima.

Teste de equivalência cobre soma Double, duplicação, slots fora do intervalo e
chave __proto__ própria. O primeiro teste novo comparou equivocadamente a mensagem
do leitor canônico com um peso >1, rejeitado antes pelo transporte desde o lote109;
corrigido o oráculo para respeitar a ordem existente, sem mudar produção para o teste.
Suíte: **1.415 passaram, zero falhas, 211 arquivos, 91,00 s**.
