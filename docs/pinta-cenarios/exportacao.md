# Exportação para desenvolvedores

Todos os destinos partem de `exportPintaScene`, que resolve o mapa e seu fechamento visual.
O backup nativo acompanha os projetos para conservar os dados editáveis do Pinta.

| Saída | Como executar/usar |
|---|---|
| `.pinta.json` | **Trazer de volta** na galeria; inclui folhas, arte e conjuntos necessários |
| PNG com dados | `pinta.carregar_mapa('nome')` no Pygame (o módulo `pinta` do Studio); dados versão 1 para mapas antigos, 2 para cenas completas |
| Tiled JSON/TMX + TSX | abrir `mapa.json` ou `mapa.tmx`; imagens e folhas ficam no pacote |
| Phaser | servir a pasta por HTTP e abrir `index.html`; Phaser 3.90.0 e licença incluídos |
| Pygame | instalar `pygame-ce`; executar `python main.py` na pasta extraída |
| Godot | importar `project.godot` e iniciar a cena principal; versão ensaiada: 4.7.2 |

O pacote inclui `maps.json` e `start.json` para a cena inicial e as portas. O Phaser funciona
sem CDN: o JavaScript distribuído tem hash verificado por
`bun packages/pinta/scripts/generate-phaser.ts --check` (ou `bun run check:phaser` em
`packages/pinta`). Não abra pelo protocolo `file:`;
o exemplo carrega JSON e imagens por HTTP.

Os ensaios atuais de Phaser, Pygame e Godot estão no [QA](revisao-2026-11-18/qa.md).
Uma faixa de versões de motor não é considerada homologada por esse ensaio pontual.
Se um conjunto exige cisalhamento de imagens que o Tiled não representa, Pygame/Godot
mantêm o mapa e entregam `COMPATIBILIDADE-TILED.txt` no lugar do suplemento Tiled;
Phaser/Tiled recusam explicitamente. Confira esse relatório ao trocar de ferramenta.

No pacote Tiled, abra `mapas/mapa-N/mapa.json` ou `mapa.tmx`. A importação do Tiled escolhe
um mapa por vez; o `.pinta.json` do pacote restaura todos os mapas e desenhos juntos.
O orçamento de 128 MiB do pacote não aumenta o teto de 32 MiB do backup nativo.

O projeto Pygame contém o módulo de cena, imagens e exemplo de controle. A opção
`python main.py --frames 10 --screenshot captura.png` permite ensaio sem interação.
O script do projeto Godot (`pinta.gd`) cria `TileMapLayer`, `TileSetAtlasSource`, colisão,
animação, arte, áreas, caminhos e personagem a partir do `maps.json`; o parallax usa
`Parallax2D`. A revisão atual importou e executou o projeto no Godot 4.7.2 sem janela,
incluindo física, objetos, referências, animação e portas. A validação visual com GPU e
aparelhos físicos continua pendente: veja o [QA](revisao-2026-11-18/qa.md).

No Studio, use os blocos **Criar cenário do meu desenho**, **Desenhar cenário** (fundo/frente),
**Colidir com cenário**, objetos por tipo/nome, leitura de campo/propriedade, área, porta,
início e tamanho. São 12 blocos compartilhados por Jogo 2D e Jogo 2D Avançado. O exemplo
**A Vila e a Floresta** existe nos dois catálogos. Os blocos antigos continuam achatados.

Para regenerar a referência e os arquivos derivados:

```powershell
bun packages/pinta/scripts/homologacao/generate.ts
bun packages/pinta/scripts/homologacao/studio-assets.ts
bun packages/pinta/scripts/pygame-gallery/generate.ts
bun packages/studio/scripts/gen-pinta-scene-python.ts
bun packages/studio/scripts/gen-python-text-sources.ts
bun packages/studio/scripts/generate-pygame-games.ts
bun packages/studio/scripts/gen-server-examples.ts
```

Para só conferir, sem gravar: `bun run check:homologacao`, `bun run check:pygame-gallery` e
`bun run check:phaser` em `packages/pinta`; `bun scripts/gen-pinta-scene-python.ts --check`,
`bun run check:python-text-sources` e `bun run check:pygame-games` em `packages/studio`.

`generate.ts` grava os pacotes em `output/pinta-cenarios/`, ignorado pelo Git (ou na pasta
passada como argumento). O gerador usa datas e identificadores fixos. `generate-pygame-games.ts`
recodifica os sons `.ogg` com o ffmpeg da máquina; os bytes mudam de uma versão do ffmpeg para
outra, então confira o `git status` antes de guardar o resultado. Depois de alterar PyDew, regenere também a cobertura dos blocos com
`packages/studio/scripts/python/pygame-block-coverage.ts`, usando Python com pygame-ce.

Mapas ortogonais finitos são o domínio comum. Colisão no JavaScript usa a grade física existente;
transformações de instâncias são amostradas nessa grade. Um orçamento recusado gera mensagem,
sem exportar uma versão truncada. A [compatibilidade Tiled](compatibilidade-tiled.md) detalha
o que pode ser convertido e os metadados adicionais.
