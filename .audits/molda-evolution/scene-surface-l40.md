# Lote 40 — cálculo de superfícies em Worker

## Contrato e revisão

Uma tarefa pertence a uma prévia, com snapshot de malha, seleção, documento e revisão.
Sem imagens, pinturas ou documento inteiro no transporte. Um pedido em execução e
um último valor substituível: não há fila acumulada de movimentos. O cabeçalho é
verificado antes da geometria; resultados obsoletos não são analisados nem aplicados.
Cancelar/falhar/desmontar remove listeners e termina o Worker. IDs gerados permanecem
estáveis na sessão; o gesto nativo mantém COW, um undo e restauração persistida.

O leitor estrito de geometria é compartilhado com o documento, sem casts de payload.
Validação ocorre antes de enviar a resposta e antes de aceitar o resultado atual;
referências globais e orçamento agregado continuam no comando. Confirmar aguarda o
valor atual, mas editar/cancelar permanece disponível. Sem Worker, falha explícita
preserva o documento; não há fallback síncrono pesado oculto.

Testes com Worker real comparam extrusão/inset com as operações puras, inclusive IDs
e UV. Testes de transporte cobrem coalescência, revisão errada, erro obsoleto, descarte,
falhas nativas/de clone e limites. Integração React usa malha de 1.089 faces, confirmar,
undo, cancelar antes da resposta e revisão externa durante cálculo. A espera verifica
valores escalares: imprimir um elemento DOM circular dentro de `waitFor` bloqueava
o próprio teste. Verificações completas posteriores passaram.

Revisão também encontrou uma perda silenciosa ao mover um vértice importado chamado
`__proto__`. Teste reproduziu coordenada 0,125 onde se esperava 0,375; acumulador sem
protótipo corrigiu a escrita, sem proibir/remover IDs importados. Novos IDs gerados
pela alocação topológica não podem usar essa identidade reservada.

## Medição reproduzível

Comando: `bun scripts/bench-scene-surface-worker.ts --stress` em `packages/molda`.
Windows, Ryzen 5 5600G, Bun 1.3.11; 9.216 quads conectados, 4 aquecimentos e 20
amostras por modo. Inclui transporte, leitura do resultado e comando nativo; exclui
React/renderer/GPU. Timer de 1 ms; p95 nearest-rank dos maiores intervalos por amostra.
Geometria comparada integralmente com operação pura usando o mesmo prefixo de IDs.

| Modo | Primeiro pedido | Total p95 | Maior intervalo de timer p95 | Ticks nas 20 amostras |
| --- | ---: | ---: | ---: | ---: |
| Síncrono com cache | 327,601 ms | 149,864 ms | 156,522 ms | 20 |
| Worker | 628,365 ms | 424,495 ms | 141,314 ms | 333 |

A preparação do Worker começa antes da medição; “primeiro pedido” não é startup
isolado. Números são uma execução local, não metas estáveis de hardware.

**Não é uma vitória de tempo total.** O processamento pode ser interrompido e deixa
mais oportunidades para a thread principal, mas clone/leitura/validação ainda geram
bloqueio significativo. Limite de 50 ms, FPS e latência real não foram comprovados.
Próxima investigação de desempenho: perfil do transporte/validação, atualizações
menores ou compactas, evitando simplesmente retirar validação da borda.

## Evidência automatizada

874 testes, zero falhas, 114 arquivos, 56,87 s. Typecheck, Biome de `src playground`
mais dois benchmarks (362 arquivos) e Vite passaram. Worker empacotado separado em
15,51 kB. Browser integrado indisponível; sem homologação visual, GPU, toque ou crianças.
