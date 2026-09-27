# Lote 41 — transporte compacto das prévias

## Perfil e hipótese

O perfil do lote 40, repetido com `--cpu-prof`, mostrou 179/774 amostras inclusivas
na leitura da resposta (`onMessage`/`readSceneSurfaceReply`, 23,1%). O leitor estrito
recriava a árvore que acabara de ser clonada pelo transporte. Impacto 4, confiança 4,
esforço 3 (prioridade 5,3). Uma mudança: substituir a árvore aninhada da resposta por
IDs e buffers tipados derivados, com reconstrução validada única na recepção.

Perfis: `scene-surface-l41-before.cpuprofile` e `scene-surface-l41-after.cpuprofile`.
O segundo registrou 118/1253 amostras nessa borda (9,4%). Amostragem/runtime/carga
variaram; proporções não são duração absoluta nem devem ser usadas como speedup.

## Prova de comportamento e ownership

`sceneMeshPacket` é transporte privado, não versão nova do documento. XYZ/UV usam
Float64, conectividade usa Uint32 e tamanhos de face Uint16. Cinco buffers novos
pertencem ao pacote; só eles são transferidos. Snapshot, imagens, histórico e dados
autorais não são destacados. A origem continua sendo validada no Worker.

O receptor valida versão/campos, tipos de arrays/memória não compartilhada, limites,
dimensões, IDs únicos, referências, cantos repetidos, finitude/zero canônico e arestas.
Referências globais/orçamento agregado permanecem no comando. Nenhum cast de um
payload não validado nem Float32 no domínio. Pacotes obsoletos continuam descartados
pelo cabeçalho antes de qualquer reconstrução.

Testes com transferência real via structuredClone, Worker real, valores Double
extremos, UV fora de 0–1, IDs `__proto__`, materiais e arestas. Corrompimentos do
protocolo são rejeitados; limite exato de 20 mil triângulos aceito. A geometria
decodificada não compartilha arrays mutáveis com pacote nem fonte. Comparações
integrais com operações puras continuam verdes, incluindo prévias consecutivas.

## Resultado local

Comando: `bun scripts/bench-scene-surface-worker.ts --stress`. Ryzen 5 5600G, Windows,
Bun 1.3.11, 9216 quads, 4 aquecimentos, 20 amostras, nearest-rank. Mesmo benchmark e
mesma prova de geometria do lote 40; sem renderer/React/GPU. Timer de 1 ms mede o
maior intervalo por pedido, não evento real de entrada.

| Execução | Síncrono total p95 | Worker total p95 | Worker maior intervalo de timer p95 |
| --- | ---: | ---: | ---: |
| Antes, sem profiler (lote 40) | 149,864 ms | 424,495 ms | 141,314 ms |
| Antes, com profiler | 181,329 ms | 418,117 ms | 141,177 ms |
| Compacto, sem profiler | 190,086 ms | 334,327 ms | 62,182 ms |
| Compacto, com profiler | 281,147 ms | 545,503 ms | 65,686 ms |

Os intervalos ficaram menores nas duas execuções compactas. A carga variou bastante,
inclusive no controle síncrono; não alegar ganho fixo de tempo total. O limite de
50 ms ainda não foi atendido neste cenário. Inicialização, validação do documento,
atualização de UI/recursos e testes em dispositivos continuam pendentes.

## Verificação

898 testes, zero falhas, 115 arquivos (59,85 s); typecheck, Biome (364 arquivos) e
Vite passaram. Worker em chunk de 16,36 kB; Three segue com aviso >500 kB.
Build Kids passou após o lote 40. Sem homologação visual/GPU/toque.
