# Exportadores de cenários regionais

Os pacotes usam Scene 4, com células ortogonais em regiões de 32 × 32 e coordenadas
assinadas. O código que prepara os pacotes é o mesmo dos exportadores do Pinta
(`packages/pinta/src/export/regionScenePackage.ts`). Todo pacote leva
`desenhos.pinta.json` com os desenhos originais, `maps.json` com as cenas,
`start.json` com o ID do mapa inicial e o suplemento do Tiled. A interface regional
depende da admissão desse inventário pelo editor; o menu de exportação ainda abre só
os mapas de tamanho fixo.

## Tiled

O JSON e o TMX com folhas TSX ficam em `mapas/mapa-N/`. Consulte os campos preservados,
os limites e o retorno privado. [Compatibilidade com Tiled](compatibilidade-tiled.md)

Com `PINTA_TILED_BIN` apontando para o `tiled`, `bun test ./src/export/tiled/regional.test.ts`
converte os mapas no programa e reimporta a cena inteira: células e giros, objetos e portas,
conjuntos, física, folhas e imagens. `./src/export/tiled/rasterizer.test.ts` desenha cada
camada com o `tmxrasterizer` da mesma instalação e compara os pixels com o compositor dos
jogos, nas grades quadrada, isométrica e hexagonal.

## Phaser

Extraia o ZIP e, na pasta do pacote, execute `python -m http.server 8000`. Abra
`http://localhost:8000`. O pacote traz o Phaser 3.90.0, o adaptador, as imagens e a
licença. As setas e os botões movem o personagem e atravessam portas. Com peças de
plataforma, a seta para cima pula, atravessa a plataforma por baixo e aterrissa por cima.
Propriedades, objetos e imagens são consultados por `pintaGame.maps`.

O jogo não pede ao Phaser para ler um mapa do Tiled. O ramo `infinite` de
`ParseTileLayers.js` preenche uma matriz `width × height`; o adaptador regional lê os
chunks de `maps.json` e desenha só as regiões visíveis com o compositor compartilhado.
A memória acompanha os chunks guardados, não a área do mapa.

Em `packages/pinta`, `bun scripts/homologacao/verify-region-phaser.ts` exige Node.js e o
Chromium do Playwright. O ensaio confere que o cache de tilemaps do Phaser fica vazio e
mede o heap JS com a Vila de 10.000 × 10.000 casas. `bun scripts/generate-region-phaser.ts --check`
confere o adaptador gerado.

## Pygame

Abra o ZIP, instale `python -m pip install -r requirements.txt` e execute
`python main.py`. O pacote fixa pygame-ce 2.5.8 e inclui `pinta_cenario.py`, gerado pela
mesma receita do módulo `pinta` fornecido às três extensões Python 2D
(`pythonScenesModuleSource.ts`). As setas andam, a seta para cima pula quando o
cenário usa plataformas e Esc fecha a janela. A peça de plataforma segura o personagem
por cima nas duas físicas, a precisa e a antiga, como no Phaser, no Godot e no Estúdio em
JavaScript (`f07b32e13`, lote B6).

`cenario.png` guarda os mapas, as imagens, as propriedades e as ligações em PNG 5. O
mesmo leitor do Estúdio abre esse arquivo, e `carregar_cenario` o abre em outro projeto.
Se o Tiled não conseguir representar um mapa, o suplemento omite esse mapa e o relatório
indica `cenario.png`.

`bun scripts/homologacao/verify-region-pygame.ts` usa o interpretador de
`PINTA_PYTHON_BIN` ou `python`, com pygame-ce instalado. Ele roda uma vez na física precisa
e outra na antiga. Em cada uma, desenha oito quadros,
lê propriedades, pula sobre a plataforma, atravessa a porta da Cabana e substitui o
cenário por um PNG atualizado, recusando antes um PNG incompleto.

## Godot

Extraia o ZIP, importe `project.godot` e execute a cena principal. O script
`pinta.gd` confere todos os cabeçalhos e limites de `maps.json` antes de decodificar o
primeiro chunk. Depois monta as camadas `TileMapLayer` e os atlas, inclusive as
coordenadas assinadas e as instâncias de conjuntos. As setas andam e a seta para cima
pula nos mapas com plataformas. O projeto oferece `objeto_por_id`, `recurso_imagem`,
`propriedade_camada` e `propriedade_peca`.
[Godot TileMapLayer](https://docs.godotengine.org/en/stable/classes/class_tilemaplayer.html)

Antes de escrever o pacote, o exportador soma as cópias de cada conjunto. Células, camadas
e objetos materializados não passam do limite de um mundo. O script dos mapas de tamanho
fixo continua o mesmo. Se o Tiled não representar um mapa, o suplemento omite esse mapa e
o relatório indica `maps.json`.

`bun scripts/homologacao/verify-region-godot.ts` usa o executável de `PINTA_GODOT_BIN`.
O ensaio importa e roda a Vila, confere células em `(-64, -64)`, animações e propriedades,
abre a Cabana por ID e volta pelo nome. Também verifica a passagem pela plataforma nos
modos preciso e `--legacy`. A opção `--dense` confere o pacote de grade densa.

## Provas registradas

A linha coordenada (`728f387ee`, `a747b83d8`, `b4e31a8c8`) registrou Tiled 1.12.2,
Phaser 3.90.0 no Chromium 159, CPython 3.14.2 com pygame-ce 2.5.7 e Godot 4.7.2. Na raiz,
Tiled e Phaser vêm de `71746fdc7` e `6d00d0c8c`. O `pinta.gd` regional e o projetado são byte a
byte os de `347b2527e`, a linha ensaiada no Godot 4.7.2, exceto o orçamento de índices da
cena 5, que `a730f1dc1` elevou ao da cena 4. `src/export/godot/regional.test.ts` prende os dois por sha256
e confere essa única diferença. Pygame usa o módulo fornecido da raiz, não o módulo daquela
linha. Os testes de unidade cobrem o conteúdo dos pacotes Godot e Pygame, a leitura do PNG 5
e o orçamento dos conjuntos.

### Pacote integrado, 23/11/2026

Base `a4a47298c`, igual à staging local. Os quatro destinos rodaram com a Vila e Floresta e a
Cabana de 10.000 × 10.000 casas, com células em `(-64, -64)`.
[Recibos](missao-completa-2026-11-18/qa/exportadores-reais-integrados-2026-11-23/README.md)

| Destino | Versão | Regional | Projetado |
| --- | --- | --- | --- |
| Tiled | 1.12.2 | JSON, TMX e TSX convertidos; cena inteira igual; pixels conferidos em 17 camadas | conversões com GIDs e projeção iguais; pixels conferidos em 17 camadas |
| Phaser | 3.90.0, Chromium 159 | início assinado, porta, pixels da Vila, da Cabana e da troca de imagem | isométrico → hexagonal pela porta |
| Pygame CE | 2.5.8, CPython 3.13.17 | física precisa: plataforma, porta, pixels e troca do PNG | recusado de propósito |
| Godot | 4.7.2 | física precisa e antiga, 19 camadas, porta por ID e por nome | 16 camadas isométricas, pouso, porta hexagonal com flags |

A camada Sombras tem opacidade 0,35. Nela, o Qt do Tiled e o Skia diferem em até 3 níveis
de cor, com a mesma cobertura. Na Cabana hexagonal, a única peça girada 60° muda só nos
pixels das bordas, e o próprio `tmxrasterizer` corta parte dela no limite da imagem. O
teste exclui esse quadro; os flags dela são conferidos pelos GIDs no Tiled e no Godot.

O Phaser carregou a Vila com o cache de tilemaps vazio, nenhuma `TilemapLayer` e
13,3 MB de heap JS (14,4 MB no projetado). `src/export/phaser/regionPlayer.test.ts` joga a
mesma cena em 128 × 128 e em 10.000 × 10.000 casas: os mesmos pixels, 8 KiB de índices e
menos de 1 MiB de diferença retida. Materializar uma única camada de 10.000 × 10.000
reteria 200 MB.

`bun scripts/homologacao/check.ts --exigir-tiled --exigir-pygame --exigir-godot` também
passou com os pacotes de tamanho fixo.
