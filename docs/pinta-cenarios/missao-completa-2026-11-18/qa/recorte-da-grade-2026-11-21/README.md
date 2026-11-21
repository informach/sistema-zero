# Grade recortada e perfil de renderização — 21/11/2026

Base `0e377ac1b25f7fa1073e02dca048f12de4a278a7`. Continuação do item 3,
sem promoção do formato 8, ampliação de cache ou mudança de estilos.

## Perfil e decisão

Antes da alteração, um mundo esparso 10.000 × 10.000, com dois chunks reais e
4.096 bytes de índices, submetia 20.002 linhas de grade por quadro. `moveTo` e
`lineTo` concentraram 63% das amostras do perfil sem emulação, além do laço e
do stroke. No controle denso de 32 camadas/4 MiB, `drawImage` concentrou mais
de 95%: o cache chegou a 32 MiB e não reteve todas as composições necessárias.

Matriz para a grade: impacto 1 × confiança 5 ÷ esforço 1 = **5**. Uma alavanca
isolada: limitar os índices das linhas ao viewport. As coordenadas, pontas,
ordem vertical/horizontal, path único, cor, alpha e espessura permanecem iguais.
A margem conservadora de antialiasing é expressa em pixels, inclusive em zoom
fracionário. Não há ordenação, semente ou novos arredondamentos na composição.
Rollback do lote: reverter o commit inteiro, incluindo seus ensaios atualizados.

## Verificação funcional

- 93 testes de renderização, zero falhas e 476 asserções; 11 testes focados de
  canvas, zero falhas e 85 asserções. O teste de admissão reproduziu 20.002 linhas
  antes da correção; o primeiro teto do ensaio não convertia a margem em pixels
  para o zoom 0,5. O teto foi derivado da mesma unidade física, conservando o
  orçamento proporcional à janela. Os recibos intermediários estão preservados.
- Três perfis Chromium com 600 comparações RGBA exatas contra o módulo anterior
  real: 32 imagens densas, 48 regionais e 120 casos de borda por perfil. Incluem
  zoom 0,5/1,25/31,5, origem negativa, extremos de rolagem, anel, alpha, flags,
  grupos, animação, colisão e canvas limitado. O mapa não é materializado.
- O controle histórico de geometria continua conferindo todos os dados e pixels.
  Somente a contagem de linhas, diagnóstico do trabalho descartado, foi retirada
  da igualdade semântica; hashes, dimensões, cache, destinos e seleções continuam
  obrigatórios. Os resultados de navegador complementares constam no índice.
  Os três controles de geometria somam outras 240 comparações RGBA; seis
  percursos da oficina pública verificam pintura, seleção/cancelamento, rolagem,
  reabertura e pixels reais. Total: 12 ensaios e 840 comparações, sem retries.
- Tipos completos do Pinta e arquivos alterados de QA, Biome e diff sem erros.
  A suíte completa de 2.570 testes pertence à base anterior, já arquivada no lote
  de prévias; não é apresentada como repetida neste lote restrito à grade.

## Medição e limites

O laboratório usa viewport de canvas 1024 × 768 e a mesma arte/documento por
versão. O contador roda em uma passada separada. Preparação, IO, leitura RGBA e
composição/apresentação da janela ficam fora do trecho medido. Perfis de CPU são
capturados separadamente dos tempos. As leituras de heap são diagnósticas, sem
qualificação de memória ou ausência de vazamento. O cache conserva o teto.

O primeiro ensaio instrumentava `moveTo` nos trechos medidos: está preservado como
exploração, excluído da comparação válida. A repetição removeu esse contador.
As rodadas separadas mostraram variação no caso denso; por isso foi acrescentado
um controle ABBA, com três aquecimentos e 15 quadros medidos por bloco, aguardando
`requestAnimationFrame` antes de cada quadro. São 30 amostras por versão/caso/CPU,
sem outros jobs de QA desta sessão durante a medição.

| Caso ABBA | p50 anterior → atual | p95 anterior → atual |
|---|---:|---:|
| Esparso, CPU normal | 0,8 → 0,2 ms | 1,0 → 0,4 ms |
| Esparso, CPU 4× | 3,3 → 0,6 ms | 4,1 → 1,0 ms |
| Denso, CPU normal | 270,3 → 265,6 ms | 304,4 → 274,2 ms |
| Denso, CPU 4× | 1.286,7 → 1.341,3 ms | 1.377,7 → 1.962,0 ms |

A grade do caso esparso passou de **20.002 para 114 linhas**, mantendo o hash
RGBA. Esse ganho não qualifica o editor inteiro. O controle denso continua lento
e sua cauda aumentou na amostra com CPU 4×; não há conclusão de ausência de
regressão de latência nesse caso nem atribuição causal apenas pela sequência dos
ensaios. As chamadas de desenho/pressão do cache exigem o próximo lote e novas
medições. Não comparar estes números diretamente com o laboratório histórico de
198,6 ms, que usou outro cenário/protocolo. Os alvos de fluidez seguem abertos.

Não houve testes com crianças, outros aparelhos físicos, motores externos ou
rollout neste lote. Fontes, hashes, perfis V8, scripts de reprodução e recibos
acompanham o índice. Escrita por regiões, IO 3 e os demais consumidores continuam
no plano; o resultado não fecha etapas macro ou a missão completa.
