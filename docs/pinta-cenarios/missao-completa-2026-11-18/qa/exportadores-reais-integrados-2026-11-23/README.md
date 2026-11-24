# Exportadores reais no pacote integrado

Etapa 7 da missão Pinta Cenários 2D, frente B, em 23/11/2026. Base `a4a47298c`, igual à
staging local. Os quatro destinos rodaram com a Vila e Floresta e a Cabana de
`regionVila()`, mundos de 10.000 × 10.000 casas com células em `(-64, -64)`. Os caminhos
abaixo são relativos à raiz do repositório.

## Programas

| Programa | Versão | Origem |
| --- | --- | --- |
| Tiled e `tmxrasterizer` | 1.12.2 | `.tmp/pinta-tools/tiled-files/` da árvore principal |
| Godot | 4.7.2.stable.official.ed1daf0bf | `.tmp/pinta-tools/godot/Godot_v4.7.2-stable_win64_console.exe` |
| Phaser | 3.90.0 no Chromium 159.0.8154.6 | Playwright do repositório |
| pygame-ce | 2.5.8, SDL 2.32.10, CPython 3.13.17 | ambiente virtual temporário fora do repositório |

A pasta `.tmp/pinta-python/Lib` só tinha o `pip`, sem pygame-ce. O pygame-ce 2.5.8, versão
fixada no `requirements.txt` do pacote, foi instalado num ambiente virtual temporário, sem
mexer no Python da máquina.

## Resultados

| Destino | Regional | Projetado | Recibo |
| --- | --- | --- | --- |
| Tiled | JSON e TMX convertidos pelo programa voltam com a cena inteira igual à exportada: células e flags, objetos e portas, conjuntos, física, folhas e imagens. 17 camadas com os mesmos pixels do compositor | GIDs, `firstgid`, `pinta:projection`, conjuntos e física preservados. 16 camadas isométricas e a Cabana hexagonal com os mesmos pixels | `tiled-real.log` |
| Phaser | Início em `(-8, -8)`, porta para a Cabana, pixels da Vila `[201,181,122]`, da Cabana `[161,135,82]` e da troca de imagem `[216,148,105]`; PNG corrompido recusado | Isométrico → hexagonal pela porta, canvas desenhado | `phaser-*.log` |
| Pygame CE | Física precisa: oito quadros, propriedades, pouso em `y = -70`, porta, pixels e troca do PNG | Recusado de propósito | `pygame-regional.log` |
| Godot | Física precisa e antiga: 19 camadas com instâncias, células em `(-64, -64)`, animação, plataforma, porta por ID e volta pelo nome. Grade densa abre | 16 camadas isométricas, pouso no diamante, porta para a Cabana hexagonal, paridade assinada e flags `1610612739` | `godot-*.log` |

`homologacao-check.log` repete os pacotes de tamanho fixo com Tiled, Pygame e Godot reais.

### Pixels no Tiled

`packages/pinta/src/export/tiled/rasterizer.test.ts` desenha cada camada de peças com
`tmxrasterizer --no-smoothing --show-layer` e compara com o compositor dos jogos. O quadro
da imagem do Tiled coincide com `worldBounds` da geometria do Core sobre os chunks 16 × 16
usados, nas três grades.

- 32 das 34 camadas têm os mesmos bytes, inclusive as 13 células espelhadas ou giradas da
  Vila. Na Cabana hexagonal, a igualdade vale fora do quadro descrito abaixo.
- A camada Sombras tem opacidade 0,35. O Qt e o Skia diferem em até 3 níveis de cor nela,
  com a mesma cobertura. O teste admite essa diferença só nas camadas com opacidade parcial.
- A Cabana hexagonal tem uma peça girada 60° com espelho vertical. Uma sonda sem o teste
  mostrou 67 pixels diferentes, todos dentro do quadro dela e só nas bordas giradas. O
  `tmxrasterizer` também corta parte dessa peça no limite da imagem. O teste exclui esse
  quadro; os flags dela são conferidos pelos GIDs no Tiled e pelo `_region_cell` no Godot.
  Todos os outros pixels da Cabana hexagonal são iguais.

### Phaser sem matriz `width × height`

O ramo `infinite` de `ParseTileLayers.js` no Phaser 3.90.0 preenche uma matriz
`width × height` antes de aplicar os chunks. O adaptador regional (`6d00d0c8c`) nunca pede
ao Phaser para ler um mapa do Tiled: ele lê `maps.json` e desenha as regiões visíveis com o
compositor compartilhado.

- `verify-region-phaser-browser.mjs` agora confere, no Phaser real, a extensão de
  10.000 × 10.000, o cache de tilemaps vazio, nenhuma `TilemapLayer` e o heap JS abaixo de
  64 MiB. Medido: 13.326.752 bytes no regional e 14.392.080 no projetado.
- `regionPlayer.test.ts` joga a mesma cena em 128 × 128 e em 10.000 × 10.000 casas, com
  30 quadros de movimento e desenho. Os índices ocupam 8 KiB nos dois casos, os pixels são
  iguais e a memória retida difere em menos de 1 MiB. Uma camada `Int16Array` com a
  extensão inteira reteria 200 MB. Inserida de propósito no jogador, ela fez o teste falhar
  com 399.796.272 bytes retidos.
- O mesmo teste garante que o `main.js` regional não contém `tilemapTiledJSON`,
  `make.tilemap` nem `mapa.json`.
- `phaser-*-antes.log` registra o ensaio antes da conferência nova, com os mesmos pixels e
  a mesma porta.

## Divergência aberta

`pygame-fisica-antiga-sonda.ts` roda a Vila com plataforma sem a física precisa. O jogo do
pacote fica sem gravidade, anda nas quatro direções e atravessa a linha de plataforma.
`cena.pouso` devolve `None`, e só o chão sólido bloqueia (`pygame-fisica-antiga-sonda.log`).

O módulo Python compartilhado com as três extensões do Estúdio resolve o pouso só quando
`fisica == 'precise'` (`pythonScenePhysics.ts`). O pacote Pygame de tamanho fixo segue a
mesma regra: `pouso` devolve `None` nas cenas 1 e 2 (`pygameProject.ts`). Já no Godot
`--legacy`, no Phaser regional e no Estúdio em JavaScript, as peças de plataforma continuam
de mão única na física antiga. Mudar o lado Python altera o módulo das extensões do
Estúdio, então ficou para decisão; nada foi alterado.

**Resolvida em `f07b32e13` (lote B6):** a dona decidiu igualar ao JS. O Python agora pousa na peça
de plataforma nas duas físicas, e `verify-region-pygame.ts` roda a física precisa e a antiga.

## Portões

- `pinta-typecheck.log`: `tsc --noEmit` do Pinta.
- `pinta-export-suite.log`: `bun test src/export` com o pygame-ce do ambiente temporário.
- `check-region-phaser.log`: o adaptador gerado confere com a fonte.
- Biome nos arquivos alterados, sem diagnósticos.

## Repetir

Em `packages/pinta`, com os executáveis acima:

```sh
PINTA_TILED_BIN=<tiled> bun test ./src/export/tiled/regional.test.ts ./src/export/tiled/rasterizer.test.ts
bun scripts/homologacao/verify-region-phaser.ts
bun scripts/homologacao/verify-region-phaser.ts --projected
PINTA_PYTHON_BIN=<python com pygame-ce> bun scripts/homologacao/verify-region-pygame.ts
PINTA_GODOT_BIN=<godot> bun scripts/homologacao/verify-region-godot.ts            # e --legacy, --projected, --dense
TILED=<tiled> GODOT=<godot> PYTHON=<python> bun scripts/homologacao/check.ts --exigir-tiled --exigir-pygame --exigir-godot
```

`scripts/automapping-browser/prove.py` exercita a interface da oficina e fica com a outra
frente.
