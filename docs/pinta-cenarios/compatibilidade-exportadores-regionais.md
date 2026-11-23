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

## Phaser

Extraia o ZIP e, na pasta do pacote, execute `python -m http.server 8000`. Abra
`http://localhost:8000`. O pacote traz o Phaser 3.90.0, o adaptador, as imagens e a
licença. As setas e os botões movem o personagem e atravessam portas. Com peças de
plataforma, a seta para cima pula, atravessa a plataforma por baixo e aterrissa por cima.
Propriedades, objetos e imagens são consultados por `pintaGame.maps`.

Em `packages/pinta`, `bun scripts/homologacao/verify-region-phaser.ts` exige Node.js e o
Chromium do Playwright. `bun scripts/generate-region-phaser.ts --check` confere o
adaptador gerado.

## Pygame

Abra o ZIP, instale `python -m pip install -r requirements.txt` e execute
`python main.py`. O pacote fixa pygame-ce 2.5.8 e inclui `pinta_cenario.py`, gerado pela
mesma receita do módulo `pinta` fornecido às três extensões Python 2D
(`pythonScenesModuleSource.ts`). As setas andam, a seta para cima pula quando o
cenário usa plataformas e Esc fecha a janela.

`cenario.png` guarda os mapas, as imagens, as propriedades e as ligações em PNG 5. O
mesmo leitor do Estúdio abre esse arquivo, e `carregar_cenario` o abre em outro projeto.
Se o Tiled não conseguir representar um mapa, o suplemento omite esse mapa e o relatório
indica `cenario.png`.

`bun scripts/homologacao/verify-region-pygame.ts` usa o interpretador de
`PINTA_PYTHON_BIN` ou `python`, com pygame-ce instalado. O ensaio desenha oito quadros,
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
Tiled e Phaser vêm de `71746fdc7` e `6d00d0c8c`. O `pinta.gd` regional é byte a byte igual
ao script ensaiado no Godot 4.7.2. Pygame usa o módulo fornecido da raiz, não o módulo
daquela linha. Os quatro ensaios precisam ser repetidos no pacote integrado. Os testes de
unidade cobrem o conteúdo dos pacotes Godot e Pygame, a leitura do PNG 5 e o orçamento
dos conjuntos.
