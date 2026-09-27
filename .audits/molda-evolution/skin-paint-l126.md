# Amostras agrupadas do pincel: lote 126

`CapturedPaintInput` passa todas as subamostras registradas de `pointermove` ao
consumidor na ordem recebida. Com lista vazia/API ausente, conserva o evento comum.
Não processa também o resumo quando existe uma lista, nem consulta posições
previstas. `pointerup` conserva sua própria posição final. A captura compartilhada
atende pesos e pintura de imagens, sem mudar comandos, coordenadas UV ou mistura.

O dono é conferido antes de cada consulta e depois dela. Cancelar, desabilitar,
descartar ou abrir outro gesto no meio do grupo impede que as posições restantes
atinjam outro dono, mesmo com o mesmo pointerId. IDs de subeventos estranhos não
viram input de outro contato. Eventos originais não são mutados/redisparados.

Revisão vermelho/verde retirou temporariamente o processamento agrupado: os dois
testes diferenciais falharam (UV perdeu duas amostras; pesos perderam dois pontos).
Restaurada a implementação, **52 testes/3 arquivos passaram, 514 expectativas,
886 ms**. Three real compara trajetórias agrupadas/separadas, posições fora do
canvas, source intacta e um undo/redo integral de pesos. Somente a fronteira de
eventos do navegador e o renderizador GPU são substituídos nos testes.

Integral: **1.556 testes, zero falhas, 230 arquivos, 96,82 s**; tipos,
Biome/693 arquivos e Vite/997 ms passaram. Kids: compilação/5,5 s, tipos/9,3 s,
59 páginas/654 ms, exit 0. Diff check passou; aviso de chunk Three permanece.

Cada posição adicional exige consulta/amostra; este lote não comprova ganho de
latência nem limita silenciosamente quantas posições reais são processadas. Não
adiciona listener de alta frequência, fila assíncrona ou novo render por subevento.
Isso não é interpolação contínua entre posições não registradas, nem homologação
de browser/GPU/toque. Formato público, implantação e Studio permanecem inalterados.

Contrato conferido na especificação primária, sem copiar a implementação de exemplo:
[W3C Pointer Events, eventos agrupados](https://www.w3.org/TR/pointerevents3/#coalesced-events).
