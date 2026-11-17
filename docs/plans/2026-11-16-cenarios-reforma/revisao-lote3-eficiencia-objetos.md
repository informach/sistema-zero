# Lote 3.7 — checkpoint de eficiência dos objetos

17/11/2026 · Base `c65428c9d` · **Parte 3.7 ainda aberta**: falta o retrato durável das revisões dos cenários e sua interface de histórico.

## Mudanças verificadas

As malhas instanciadas comparam os valores Float32 efetivamente desenhados. Somente matrizes e cores alteradas marcam faixas para transferência; reconstruir o mesmo conteúdo não envia novamente os buffers. O callback de upload do Three limpa as faixas, inclusive na primeira alocação. Geometria e material continuam compartilhados.

Um índice balanceado de caixas mantém os limites de cada malha. Mover uma peça atualiza a folha e seus ancestrais, conservando caixa/esfera de culling. Não recalcula todas as instâncias no quadro seguinte. A esfera recebe somente a margem numérica relativa a quatro épsilons da representação Double, porque o arredondamento de `sqrt` podia excluir seu próprio canto em cenas extensas; não é deslocamento visual ou geométrico.

Picking e encaixe usam índice de caixas antes de consultar triângulos. A consulta de triângulos permanece `SceneSurfaceQuery` do Molda, compartilhada por geometria e sem modificar `boundsTree`. As matrizes e os volumes acompanham os selecionados e seus apoios durante a prévia. Referências pendentes podem ser escolhidas, mas não se tornam superfícies físicas de encaixe.

O clique deixou de chamar `InstancedMesh.raycast` sobre todas as instâncias. A seleção continua retornando raízes autorais dos conjuntos, com exclusões e ordem de empate das fontes. Os identificadores das peças são agrupados em uma passagem, sem varrer todos os objetos para cada montagem.

A câmera calcula alcance da órbita e recorte pela base e pelo volume agregado, sem varrer objetos por quadro. O enquadramento deixou de ser limitado a 2.500 m com `far=6.000`. Fotos e renderização usam o mesmo recorte; a névoa conserva a configuração da base e acompanha vistas distantes quando necessário.

## Provas e medidas

Os testes anteriores falhavam ao conferir a faixa de upload de uma instância e ao reconstruir conteúdo inalterado. O ensaio anterior da câmera mostrava zero pixels dos dois marcos a 8 km. Depois das mudanças:

| Ensaio WebGL no Chrome local | Buffer alocado | Atualização de uma cópia | Reconstrução sem mudança |
|---|---:|---:|---:|
| 20.000 formas, uma parte | 2.097.152 bytes | 64 bytes | 0 bytes |
| 512 cópias do GLB real, cinco partes | 163.840 bytes | 320 bytes | 0 bytes |

O ensaio intercepta as chamadas reais `bufferSubData`, força o desenho das malhas e confirma triângulos desenhados. Os tempos registrados são de submissão síncrona do renderer, **não tempo de GPU, FPS ou desempenho de aparelhos físicos**. Não inferir fluidez em celulares desses números.

O índice foi comparado à varredura em cem raios e refits sobre 20.000 caixas. Na consulta vertical de 20.000 instâncias, a implementação antiga testava todas as caixas; a nova visita menos de cem nós e mantém o resultado, inclusive após mover a peça para fora da posição antiga. Vazio, coincidências, raio interno, cor, reordenação, quantidade e descarte cobertos.

Navegador: ambos os marcos extremos aparecem em 800×600, 300×800 e na base de terreno de 8.192 m. Há teste de projeção dos oito cantos do volume em três proporções. Conjuntos e biblioteca/publicação passaram nos quatro layouts e temas; espelho/troca/cor/encaixe passaram em desktop claro/escuro e toque emulado de 390 px. Alças nativas, recusa, cancelamento e fotografia também passaram após a troca de picking.

Motor: **53 testes / 2.534 asserções**, tipagem aprovada. Não há alteração de schema ou implantação neste checkpoint. Falhas globais registradas no fechamento de 3.6 continuam pendências do fechamento do lote 3.

## Evidências e continuidade

[Chamadas WebGL](evidencias/lote3-eficiencia/buffers.json) · [Câmera](evidencias/lote3-eficiencia/camera.json) · [Conjuntos](evidencias/lote3-eficiencia/conjuntos.json) · [Biblioteca/publicação](evidencias/lote3-eficiencia/biblioteca.json).

[Plano, paisagem](evidencias/lote3-eficiencia/vista-plano-800.webp) · [Plano, retrato](evidencias/lote3-eficiencia/vista-plano-300.webp) · [Terreno](evidencias/lote3-eficiencia/vista-terreno-800.webp). São marcos geométricos de teste, sem aprovação artística da Faísca.

Continuar na parte 3.7: imagem por revisão, confirmação atômica, proteção/GC, capas atrasadas e interface do histórico. Depois executar 3.8. O lote 3 e a tarefa global permanecem abertos.
