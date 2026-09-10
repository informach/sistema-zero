# Lote 64 — tarefas de imagem

Medição local em 07/09/2026, Windows, Bun 1.3.11. Executar em `packages/molda`:

```sh
bun scripts/bench-scene-image.ts
```

Uma camada indexada uniforme, 15 amostras após aquecimento por caso. A conversão
produz RGBA; o balde percorre toda a imagem. Cada resposta do worker é comparada
byte a byte com o núcleo puro. Os buffers de origem permanecem acessíveis.

| Lado | Operação | CPU p50/p95 (ms) | Worker total p50/p95 (ms) |
| --- | --- | --- | --- |
| 256 | RGBA | 5,270 / 6,690 | 34,047 / 43,188 |
| 256 | Balde | 4,765 / 9,900 | 36,271 / 47,285 |
| 512 | RGBA | 19,141 / 28,996 | 56,694 / 76,554 |
| 512 | Balde | 15,173 / 27,005 | 60,417 / 71,867 |
| 1024 | RGBA | 79,460 / 95,135 | 140,419 / 159,552 |
| 1024 | Balde | 78,889 / 102,967 | 125,888 / 143,726 |

O worker não reduz o tempo total neste ensaio: há inicialização, clone, validação
e transferência de resposta. Ele retira o laço de cálculo da thread da interface
e permite encerrar o trabalho. O envio clona somente a imagem escolhida; a resposta
transfere apenas camadas alteradas, e o leitor mantém as outras por referência.

O balde usa fila `Uint32Array` e visitação `Uint8Array`, ambas limitadas ao número
de pixels (5 MiB somadas para 1024²), mais uma cópia da camada quando há mudança.
Conversão verifica o orçamento agregado de 32 MiB antes de iniciar o worker.

Não é benchmark de navegador/GPU, composição de camadas, upload, FPS ou interação
em tablet. Não demonstra que o envio/recebimento de buffers grandes seja gratuito.
Composição e atualização de textura inteira continuam sendo frentes de otimização.
