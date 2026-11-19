# Fixture Python de conjuntos do Pinta

O job Linux de contratos do merge `8ac2b6cf5` (run 44512954541, job 135521754386) reprovou em `test-pinta-module.py`, ao carregar a fixture de conjuntos. A reprodução local falhou tanto com pygame-ce 2.5.7 real quanto no modo de lógica pura, com a mesma recusa do preflight.

A investigação confirmou que a fixture não representava o formato publicado: faltavam `scene.id`, obrigatório em `PintaSceneSchema`, a posição `y` do tileset no atlas e uma imagem PNG embutida válida. O teste usava `unused.png` e, na parte de lógica, um cabeçalho PNG 1×1 para um atlas de peças 16/32×32. O leitor antigo não chegava a consumir esses recursos na consulta de objetos; o preflight novo os confere antes de alocar/renderizar.

A correção foi feita na fixture: ID estável, atlas com `y: 0`, recurso embutido e PNG RGBA transparente válido nas dimensões autorais. Os mesmos objetos, grupos, referências, posições, giros, instâncias e versões antigas continuam sendo exigidos. Nenhum teste foi retirado e nenhuma guarda, cota ou comportamento do leitor foi relaxado.

Validação local Windows, Python 3.13.17, pygame-ce 2.5.7 / SDL 2.32.10, drivers SDL dummy:

- Antes: modo real e modo de lógica falharam na mesma fixture incompleta.
- Depois: `test-pinta-module.py` passou com pygame-ce real (`pinta module ok`).
- O modo `--sem-pygame` passou em 46 conferências de lógica pura; não é apresentado como prova de pixels/áudio reais.

A nova revisão precisa de seu próprio resultado de CI. O run do merge também aprovou o grupo de Python no navegador, que agora inclui os dois ensaios físicos Pinta 1×/2×. Isso não converte o job de contratos que falhou em resultado aprovado, nem conclui a missão global.
